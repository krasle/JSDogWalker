'use strict';
const cds = require('@sap/cds');

// Valid time slots: 07:00-11:30 AM (10 slots) + 13:00-18:30 PM (12 slots) = 22 total
const VALID_SLOTS = (() => {
  const slots = [];
  // AM block: 07:00 - 11:30
  for (let h = 7; h <= 11; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  // PM block: 13:00 - 18:30 (last appointment starts 18:30, ends at 19:00)
  for (let h = 13; h <= 18; h++) {
    slots.push(`${String(h).padStart(2,'0')}:00`);
    slots.push(`${String(h).padStart(2,'0')}:30`);
  }
  return slots;
})();

module.exports = cds.service.impl(async function(srv) {

  // ── BEFORE CREATE Appointments ──────────────────────────────────────────
  srv.before('CREATE', 'Appointments', async (req) => {
    const { date, timeSlot, walker_ID } = req.data;

    // 1. Validate time slot
    if (!VALID_SLOTS.includes(timeSlot)) {
      return req.reject(400,
        `Invalid time slot "${timeSlot}". Valid slots are: ${VALID_SLOTS.join(', ')}`);
    }

    // 2. Check for double-booking (same walker, same date, same slot)
    if (date && walker_ID) {
      const db = await cds.connect.to('db');
      const existing = await db.run(
        SELECT.one.from('dog.walking.Appointments')
          .where({ date, timeSlot, walker_ID })
      );
      if (existing) {
        return req.reject(409,
          `Walker is already booked for slot ${timeSlot} on ${date}`);
      }
    }
  });

  // ── AFTER CREATE Appointments ────────────────────────────────────────────
  srv.after('CREATE', 'Appointments', async (appt) => {
    const db = await cds.connect.to('db');

    // Compute fee from actual dogs linked via deep-insert
    const apptDogs = await db.run(
      SELECT.from('dog.walking.AppointmentDogs').where({ appointment_ID: appt.ID })
    );
    const dogCount = apptDogs.length || 1;
    const fee = appt.totalFee || (30 + (dogCount - 1) * 10);

    // Persist fee back to Appointment if it was not set (or was set to 0)
    if (!appt.totalFee) {
      await db.run(
        UPDATE('dog.walking.Appointments').set({ totalFee: fee }).where({ ID: appt.ID })
      );
    }

    // Auto-create a pending billing record using the computed fee
    const newId = require('crypto').randomUUID();
    await db.run(
      INSERT.into('dog.walking.BillingRecords').entries({
        ID:             newId,
        appointment_ID: appt.ID,
        amount:         fee,
        status:         'pending',
        issuedAt:       new Date().toISOString(),
      })
    );
  });

  // ── BEFORE UPDATE Appointments ───────────────────────────────────────────
  srv.before('UPDATE', 'Appointments', async (req) => {
    const { timeSlot } = req.data;
    if (timeSlot && !VALID_SLOTS.includes(timeSlot)) {
      return req.reject(400,
        `Invalid time slot "${timeSlot}". Valid slots are: ${VALID_SLOTS.join(', ')}`);
    }
  });

  // ── getValidSlots ────────────────────────────────────────────────────────
  srv.on('getValidSlots', () => VALID_SLOTS);

  // ── getDailySchedule ─────────────────────────────────────────────────────
  srv.on('getDailySchedule', async (req) => {
    const { date } = req.data;
    if (!date) return req.reject(400, 'date parameter is required');

    const db = await cds.connect.to('db');

    const [appointments, walkers, customers, addresses, apptDogs, dogsAll] =
      await Promise.all([
        db.run(SELECT.from('dog.walking.Appointments').where({ date })),
        db.run(SELECT.from('dog.walking.Walkers')),
        db.run(SELECT.from('dog.walking.Customers')),
        db.run(SELECT.from('dog.walking.Addresses')),
        db.run(SELECT.from('dog.walking.AppointmentDogs')),
        db.run(SELECT.from('dog.walking.Dogs')),
      ]);

    const walkerMap   = Object.fromEntries(walkers.map(w => [w.ID, w]));
    const customerMap = Object.fromEntries(customers.map(c => [c.ID, c]));
    const addressMap  = Object.fromEntries(addresses.map(a => [a.ID, a]));
    const dogMap      = Object.fromEntries(dogsAll.map(d => [d.ID, d]));

    const result = appointments.map(appt => {
      const walker   = walkerMap[appt.walker_ID]          || {};
      const customer = customerMap[appt.customer_ID]      || {};
      const pickup   = addressMap[appt.pickupAddress_ID]  || {};
      const dropoff  = addressMap[appt.dropoffAddress_ID] || {};

      const dogs = apptDogs
        .filter(ad => ad.appointment_ID === appt.ID)
        .map(ad => dogMap[ad.dog_ID]?.name || '')
        .filter(Boolean);

      return {
        appointmentId:     appt.ID,
        date:              appt.date,
        timeSlot:          appt.timeSlot,
        walkerFirstName:   walker.firstName   || '',
        walkerLastName:    walker.lastName    || '',
        customerFirstName: customer.firstName || '',
        customerLastName:  customer.lastName  || '',
        dogNames:          dogs.join(', '),
        pickupStreet:      pickup.street  || '',
        pickupCity:        pickup.city    || '',
        dropoffStreet:     dropoff.street || pickup.street || '',
        dropoffCity:       dropoff.city   || pickup.city   || '',
        totalFee:          appt.totalFee,
        status:            appt.status,
      };
    });

    result.sort((a, b) => {
      if (a.timeSlot < b.timeSlot) return -1;
      if (a.timeSlot > b.timeSlot) return 1;
      return (a.walkerLastName || '').localeCompare(b.walkerLastName || '');
    });

    return result;
  });

  // ── Helper: compute fee from appointment dog count ───────────────────────
  srv.before(['CREATE','UPDATE'], 'AppointmentDogs', async (req) => {
    // After dogs are added/removed, recalculate fee on the parent appointment
    // This runs asynchronously via the after handler below
  });

  srv.after(['CREATE','DELETE'], 'AppointmentDogs', async (_, req) => {
    const apptId = req.data?.appointment_ID;
    if (!apptId) return;
    const db = await cds.connect.to('db');
    const dogs = await db.run(
      SELECT.from('dog.walking.AppointmentDogs').where({ appointment_ID: apptId })
    );
    const dogCount = dogs.length || 1;
    const fee = 30 + (dogCount - 1) * 10;
    await db.run(
      UPDATE('dog.walking.Appointments').set({ totalFee: fee }).where({ ID: apptId })
    );
    // Also update billing record amount
    await db.run(
      UPDATE('dog.walking.BillingRecords').set({ amount: fee }).where({ appointment_ID: apptId })
    );
  });
});
