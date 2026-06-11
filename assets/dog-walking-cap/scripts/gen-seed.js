#!/usr/bin/env node
// Generates all 10 seed CSV files with valid UUIDs
// Run: node scripts/gen-seed.js
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'db', 'data');

// ── helpers ──────────────────────────────────────────────────────────────────
function csv(headers, rows) {
  return [headers.join(','), ...rows.map(r => headers.map(h => r[h] ?? '').join(','))].join('\n') + '\n';
}
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function rng(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pad2(n) { return String(n).padStart(2, '0'); }
function dateStr(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}`; }

// ── walkers ──────────────────────────────────────────────────────────────────
const walkerNames = [
  ['Alice','Barker'], ['Ben','Shepherd'], ['Clara','Wolff'],
  ['Diego','Hunt'], ['Elena','Parks']
];
const walkers = walkerNames.map(([fn, ln]) => ({
  ID: randomUUID(), firstName: fn, lastName: ln,
  phone: `555-${rng(1000,9999)}`, email: `${fn.toLowerCase()}@pawandgo.com`,
  isActive: 'true', bio: `Experienced dog walker and pet lover.`
}));

// ── walker availability ───────────────────────────────────────────────────────
const days = [1,2,3,4,5]; // Mon–Fri
const amStart = '07:00', amEnd = '12:00', pmStart = '13:00', pmEnd = '19:00';
const walkerAvailability = [];
walkers.forEach(w => {
  days.forEach(d => {
    walkerAvailability.push({ ID: randomUUID(), walker_ID: w.ID, dayOfWeek: d, startTime: amStart, endTime: amEnd });
    walkerAvailability.push({ ID: randomUUID(), walker_ID: w.ID, dayOfWeek: d, startTime: pmStart, endTime: pmEnd });
  });
});

// ── customers ────────────────────────────────────────────────────────────────
const firstNames = ['James','Maria','Robert','Patricia','John','Linda','Michael','Barbara','William','Elizabeth',
  'David','Jennifer','Richard','Maria','Charles','Susan','Joseph','Jessica','Thomas','Sarah',
  'Christopher','Karen','Daniel','Lisa','Paul','Nancy','Mark','Betty','Donald','Margaret',
  'George','Sandra','Kenneth','Ashley','Steven','Dorothy','Edward','Kimberly','Brian','Emily',
  'Ronald','Donna','Anthony','Michelle','Kevin','Carol','Jason','Amanda','Matthew','Melissa'];
const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Martinez',
  'Anderson','Taylor','Thomas','Hernandez','Moore','Martin','Jackson','Thompson','White','Lopez',
  'Lee','Gonzalez','Harris','Clark','Lewis','Robinson','Walker','Perez','Hall','Young',
  'Allen','Sanchez','Wright','King','Scott','Green','Baker','Adams','Nelson','Carter',
  'Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins'];
const customers = firstNames.map((fn, i) => ({
  ID: randomUUID(), firstName: fn, lastName: lastNames[i],
  phone: `555-${rng(1000,9999)}`, email: `${fn.toLowerCase()}${i+1}@example.com`,
  memberSince: dateStr(rng(2019, new Date().getFullYear()-1), rng(1,12), rng(1,28))
}));

// ── addresses ────────────────────────────────────────────────────────────────
const streets = ['Oak St','Maple Ave','Pine Rd','Elm Dr','Cedar Ln','Birch Blvd','Spruce Way','Willow Ct'];
const cities = ['Portland','Seattle','Denver','Austin','Chicago','Boston','Atlanta','Phoenix'];
const states = ['OR','WA','CO','TX','IL','MA','GA','AZ'];
const addresses = customers.map(c => {
  const ci = rng(0, cities.length-1);
  return {
    ID: randomUUID(), customer_ID: c.ID,
    street: `${rng(100,9999)} ${pick(streets)}`, city: cities[ci],
    state: states[ci], zip: `${rng(10000,99999)}`, country: 'US',
    isPickup: 'true', isDropoff: 'true'
  };
});

// ── dogs (1–5 per customer, total ~75) ──────────────────────────────────────
const dogNames = ['Buddy','Max','Charlie','Cooper','Rocky','Milo','Bear','Duke','Tucker','Oliver',
  'Leo','Zeus','Harley','Jack','Koda','Toby','Cody','Beau','Murphy','Bentley',
  'Bella','Luna','Daisy','Lucy','Molly','Lola','Sadie','Maggie','Sophie','Chloe',
  'Stella','Lily','Zoe','Penny','Nala','Rosie','Ruby','Gracie','Ellie','Coco'];
const breeds = ['Labrador','Golden Retriever','French Bulldog','Beagle','Poodle','Bulldog','Rottweiler',
  'German Shepherd','Yorkshire Terrier','Dachshund','Boxer','Siberian Husky','Great Dane','Chihuahua'];
const colors = ['black','white','brown','golden','grey','cream','brindle','spotted','tan','red'];
const dogs = [];
customers.forEach((c, i) => {
  const count = i < 20 ? 1 : i < 40 ? 2 : i < 50 ? rng(1,5) : rng(1,3);
  for (let d = 0; d < count; d++) {
    dogs.push({
      ID: randomUUID(), owner_ID: c.ID,
      name: pick(dogNames), breed: pick(breeds), weight: rng(5,50),
      color: pick(colors), dateOfBirth: dateStr(rng(2015,2022), rng(1,12), rng(1,28)),
      licenseNo: `LIC-${rng(10000,99999)}`, notes: ''
    });
  }
});
// ensure ≤80 dogs for manageability (keep first 80)
while (dogs.length > 80) dogs.pop();

// ── dog friends (some friendly pairs) ───────────────────────────────────────
const dogFriends = [];
const friendPairs = new Set();
for (let i = 0; i < 30; i++) {
  const a = dogs[rng(0, dogs.length-1)];
  const b = dogs[rng(0, dogs.length-1)];
  if (a.ID === b.ID) continue;
  const key = [a.ID, b.ID].sort().join('|');
  if (friendPairs.has(key)) continue;
  friendPairs.add(key);
  dogFriends.push({ ID: randomUUID(), dog_ID: a.ID, friend_ID: b.ID });
}

// ── appointments ────────────────────────────────────────────────────────────
const amSlots = ['07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30'];
const pmSlots = ['13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00','18:30'];
const allSlots = [...amSlots, ...pmSlots];
const statuses = ['scheduled','confirmed','completed','cancelled'];
const appointments = [];
const bookedSlots = {}; // key: walker_ID|date|slot
let apptCount = 0;
for (let attempt = 0; attempt < 2000 && apptCount < 80; attempt++) {
  const walker = pick(walkers);
  const customer = pick(customers);
  const custDogs = dogs.filter(d => d.owner_ID === customer.ID);
  if (custDogs.length === 0) continue;
  const year = new Date().getFullYear(); const month = rng(1,12); const day = rng(1,28);
  const date = dateStr(year, month, day);
  const slot = pick(allSlots);
  const key = `${walker.ID}|${date}|${slot}`;
  if (bookedSlots[key]) continue;
  bookedSlots[key] = true;
  const addr = addresses.find(a => a.customer_ID === customer.ID);
  const numDogs = rng(1, Math.min(custDogs.length, 3));
  const fee = 30 + (numDogs - 1) * 10;
  const status = pick(statuses);
  appointments.push({
    ID: randomUUID(), walker_ID: walker.ID, customer_ID: customer.ID,
    date, timeSlot: slot, status,
    pickupAddress_ID: addr ? addr.ID : '',
    dropoffAddress_ID: addr ? addr.ID : '',
    totalFee: fee, notes: ''
  });
  apptCount++;
}

// ── appointment dogs ─────────────────────────────────────────────────────────
const appointmentDogs = [];
appointments.forEach(appt => {
  const custDogs = dogs.filter(d => d.owner_ID === appt.customer_ID);
  const numDogs = appt.totalFee === 30 ? 1 : appt.totalFee === 40 ? 2 : 3;
  const chosen = custDogs.slice(0, Math.min(numDogs, custDogs.length));
  chosen.forEach(dog => {
    appointmentDogs.push({ ID: randomUUID(), appointment_ID: appt.ID, dog_ID: dog.ID });
  });
});

// ── billing records ──────────────────────────────────────────────────────────
const billingStatuses = ['pending','paid','waived'];
const billingMethods = ['cash','card','transfer',''];
const billingRecords = appointments.filter((_, i) => i < 50).map(appt => ({
  ID: randomUUID(), appointment_ID: appt.ID,
  amount: appt.totalFee, status: pick(billingStatuses),
  issuedAt: `${appt.date}T08:00:00Z`,
  paidAt: Math.random() > 0.4 ? `${appt.date}T09:00:00Z` : '',
  method: pick(billingMethods), notes: ''
}));

// ── confirmations ────────────────────────────────────────────────────────────
const confirmMethods = ['email','sms','phone'];
const confirmations = appointments.filter((_, i) => i < 20).map(appt => ({
  ID: randomUUID(), appointment_ID: appt.ID,
  confirmedAt: `${appt.date}T07:30:00Z`,
  confirmedBy: 'system', method: pick(confirmMethods),
  notes: 'Auto-confirmed'
}));

// ── write files ──────────────────────────────────────────────────────────────
function write(name, headers, rows) {
  const file = path.join(DATA_DIR, `dog.walking-${name}.csv`);
  fs.writeFileSync(file, csv(headers, rows));
  console.log(`✓ ${name}: ${rows.length} rows`);
}

write('Walkers', ['ID','firstName','lastName','phone','email','isActive','bio'], walkers);
write('WalkerAvailability', ['ID','walker_ID','dayOfWeek','startTime','endTime'], walkerAvailability);
write('Customers', ['ID','firstName','lastName','phone','email','memberSince'], customers);
write('Addresses', ['ID','customer_ID','street','city','state','zip','country','isPickup','isDropoff'], addresses);
write('Dogs', ['ID','owner_ID','name','breed','weight','color','dateOfBirth','licenseNo','notes'], dogs);
write('DogFriends', ['ID','dog_ID','friend_ID'], dogFriends);
write('Appointments', ['ID','walker_ID','customer_ID','date','timeSlot','status','pickupAddress_ID','dropoffAddress_ID','totalFee','notes'], appointments);
write('AppointmentDogs', ['ID','appointment_ID','dog_ID'], appointmentDogs);
write('BillingRecords', ['ID','appointment_ID','amount','status','issuedAt','paidAt','method','notes'], billingRecords);
write('Confirmations', ['ID','appointment_ID','confirmedAt','confirmedBy','method','notes'], confirmations);

console.log('\n✅ All seed data generated with proper UUIDs');
