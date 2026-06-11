namespace dog.walking;
using { cuid, managed } from '@sap/cds/common';

// ─── Walkers ────────────────────────────────────────────────────────────────

entity Walkers : cuid {
  firstName   : String(50)  not null;
  lastName    : String(50)  not null;
  phone       : String(20);
  email       : String(100);
  isActive    : Boolean default true;
  bio         : String(500);
  availability: Composition of many WalkerAvailability on availability.walker = $self;
}

entity WalkerAvailability : cuid {
  walker    : Association to Walkers not null;
  dayOfWeek : Integer not null; // 1=Mon,...,7=Sun
  startTime : String(5) not null;
  endTime   : String(5) not null;
}

// ─── Customers ──────────────────────────────────────────────────────────────

entity Customers : cuid {
  firstName   : String(50) not null;
  lastName    : String(50) not null;
  phone       : String(20);
  email       : String(100);
  memberSince : Date;
  addresses   : Composition of many Addresses on addresses.customer = $self;
  dogs        : Composition of many Dogs on dogs.owner = $self;
}

entity Addresses : cuid {
  customer    : Association to Customers not null;
  street      : String(100);
  city        : String(100);
  state       : String(50);
  zip         : String(20);
  country     : String(50);
  isPickup    : Boolean default false;
  isDropoff   : Boolean default false;
}

// ─── Dogs ───────────────────────────────────────────────────────────────────

entity Dogs : cuid {
  owner       : Association to Customers not null;
  name        : String(50) not null;
  breed       : String(100);
  weight      : Decimal(5,1);
  color       : String(50);
  dateOfBirth : Date;
  licenseNo   : String(30);
  notes       : String(500);
}

entity DogFriends : cuid {
  dog    : Association to Dogs not null;
  friend : Association to Dogs not null;
}

// ─── Appointments ───────────────────────────────────────────────────────────

entity Appointments : cuid, managed {
  date           : Date not null;
  timeSlot       : String(5) not null;   // e.g. "07:00"
  walker         : Association to Walkers not null;
  customer       : Association to Customers not null;
  pickupAddress  : Association to Addresses;
  dropoffAddress : Association to Addresses;
  status         : String(20) default 'scheduled';
  // scheduled | confirmed | completed | cancelled
  totalFee       : Decimal(8,2);
  notes          : String(500);
  dogs           : Composition of many AppointmentDogs on dogs.appointment = $self;
}

entity AppointmentDogs : cuid {
  appointment : Association to Appointments not null;
  dog         : Association to Dogs not null;
}

// ─── Confirmations ──────────────────────────────────────────────────────────

entity Confirmations : cuid {
  appointment     : Association to Appointments not null;
  confirmedAt     : DateTime;
  confirmedBy     : String(100);
  method          : String(20) default 'email'; // email | sms | phone
  notes           : String(500);
}

// ─── Billing ────────────────────────────────────────────────────────────────

entity BillingRecords : cuid {
  appointment : Association to Appointments not null;
  amount      : Decimal(8,2) not null;
  status      : String(20) default 'pending'; // pending | paid | waived
  issuedAt    : DateTime;
  paidAt      : DateTime;
  method      : String(20); // cash | card | transfer
  notes       : String(500);
}
