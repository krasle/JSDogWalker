using dog.walking as dw from '../db/schema';

service DogWalkingService @(path: '/api') {

  entity Walkers            as projection on dw.Walkers;
  entity WalkerAvailability as projection on dw.WalkerAvailability;
  entity Customers          as projection on dw.Customers;
  entity Addresses          as projection on dw.Addresses;
  entity Dogs               as projection on dw.Dogs;
  entity DogFriends         as projection on dw.DogFriends;
  entity Appointments       as projection on dw.Appointments;
  entity AppointmentDogs    as projection on dw.AppointmentDogs;
  entity Confirmations      as projection on dw.Confirmations;
  entity BillingRecords     as projection on dw.BillingRecords;

  // Returns the list of valid booking time slots
  function getValidSlots() returns array of String;

  // Returns a formatted daily schedule for a given date
  function getDailySchedule(date: Date) returns array of {
    appointmentId     : UUID;
    date              : Date;
    timeSlot          : String;
    walkerFirstName   : String;
    walkerLastName    : String;
    customerFirstName : String;
    customerLastName  : String;
    dogNames          : String;
    pickupStreet      : String;
    pickupCity        : String;
    dropoffStreet     : String;
    dropoffCity       : String;
    totalFee          : Decimal;
    status            : String;
  };
}
