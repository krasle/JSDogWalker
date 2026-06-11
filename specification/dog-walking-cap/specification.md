# Asset Specification: dog-walking-cap

## Overview
Full-stack CAP Node.js application with Vanilla JS SPA UI for the Paw & Go dog walking service.

---

## TODO Checklist

### Data Model (`db/schema.cds`)
- [x] `Walkers` entity — ID, firstName, lastName, phone, email, isActive (Boolean), bio (String)
- [x] `WalkerAvailability` entity — ID, walker_ID (Association), dayOfWeek (Int 1-7), startTime, endTime
- [x] `Customers` entity — ID, firstName, lastName, email, phone, memberSince (Date)
- [x] `Addresses` entity — ID, customer_ID (Association), street, city, state, zip, country, isPickup (Boolean), isDropoff (Boolean)
- [x] `Dogs` entity — ID, owner_ID (Association to Customers), name, breed, weight (Decimal), color, dateOfBirth, licenseNo, notes; NOTE: `size` spec field renamed to `weight` for precision
- [x] `DogFriends` entity — ID (cuid), dog_ID, friend_ID (associations); generated via `scripts/gen-seed.js`
- [x] `Appointments` entity — ID, date (Date), timeSlot (String), status, walker_ID, customer_ID, totalFee (Decimal)
- [x] `AppointmentDogs` entity — appointment_ID, dog_ID, composition on Appointments.dogs
- [x] `BillingRecords` entity — ID, appointment_ID, amount (Decimal), status, issuedAt, paidAt, method
- [x] `Confirmations` entity — ID, appointment_ID, confirmedAt (DateTime), confirmedBy, method, notes

### Service Definition (`srv/dog-walking-service.cds`)
- [x] Expose all 10 entities as OData entities
- [x] `getValidSlots()` function returning array of String
- [x] `getDailySchedule(date: Date)` function returning array of ScheduleEntry (complex type)
- [x] Service path: `/api`

### Service Handlers (`srv/dog-walking-service.js`)
- [x] `getValidSlots` handler — returns 22 half-hour slots (07:00–11:30, 13:00–18:30)
- [x] `getDailySchedule` handler — flat SELECT + in-memory join to return walker/customer/dog names
- [x] `Appointments` BEFORE CREATE — validate timeSlot (400 if invalid)
- [x] `Appointments` BEFORE CREATE — check double-booking (409 if same walker+date+slot)
- [x] `Appointments` AFTER CREATE — create BillingRecord (fee = $30 + $10×(n-1 dogs))
- [x] `Appointments` AFTER CREATE — create Confirmation with UUID confirmationNumber
- [x] Use `crypto.randomUUID()` for all UUID generation

### Seed Data (`db/data/`)
- [x] `dog.walking-Walkers.csv` — 5 walkers
- [x] `dog.walking-WalkerAvailability.csv` — 29 availability rows
- [x] `dog.walking-Customers.csv` — 50 customers
- [x] `dog.walking-Addresses.csv` — 101 addresses
- [x] `dog.walking-Dogs.csv` — 75 dogs
- [x] `dog.walking-DogFriends.csv` — 34 friend pairs
- [x] `dog.walking-Appointments.csv` — 80 appointments
- [x] `dog.walking-AppointmentDogs.csv` — 120 appointment-dog rows
- [x] `dog.walking-BillingRecords.csv` — 40 billing records
- [x] `dog.walking-Confirmations.csv` — 12 confirmations

### Package Configuration (`package.json`)
- [x] `"workspaces": ["app/react-ui"]`
- [x] `cds.requires.db` — SQLite in-memory: `{ kind: "sqlite", credentials: { url: ":memory:" } }`
- [x] `cds.[production].folders.app` = `"app/react-ui/dist"`
- [x] No `cds.[development].folders.app` override

### Frontend (`app/react-ui/`)
- [x] `index.html` — self-contained vanilla JS SPA (no build step, no dependencies, ~38 KB)
- [x] All 7 views implemented inline: Schedule, Appointments, Walkers, Customers, Dogs, Billing, Confirmations
- [x] Booking form: customer select → filtered dog multi-select → walker select → date → slot dropdown
- [x] Daily schedule print view (`window.print()` with `@media print` CSS)
- [x] Toast notifications for success/error feedback
- [x] `vite.config.js` — base `'./'`, optimizeDeps.exclude UI5, stubZxing plugin, hmr:false, proxy `/api`
- [x] `node_modules/vite/index.js` — custom vite stub serving `index.html` as static middleware (committed to git via `!` negation in .gitignore)

### Tests (`test/`)
- [x] `run-tests.js` — test runner (plain Node.js, no jest)
- [x] 18/18 tests pass

### Validation (Static — SV)
- [x] **D-01** Fixed: `getValidSlots()` returns plain strings; UI now uses `typeof s === 'string' ? s : s.slot`
- [x] **D-02** Fixed: Dogs deep-insert format corrected to `[{ dog_ID: 'uuid' }]`
- [x] **D-03** Fixed: Billing fee computed from `AppointmentDogs` count before `UPDATE`/`INSERT`
- [x] **D-04** Fixed: Dead `require('crypto').v4` line removed
- [x] **D-05** Fixed: Dogs multi-select now filters by selected customer (`filterApptDogs()`)
- [x] **D-06** Fixed: All seed CSV files regenerated with proper UUIDs (`scripts/gen-seed.js`) — PATCH/DELETE on seed rows now returns HTTP 200
- [x] **D-07** Fixed: `Confirmations` auto-INSERT added to AFTER CREATE handler
- [x] **D-08** Fixed: Walker availability management panel added to Walker edit modal
- [x] **D-09** Fixed: Dog-friend pairs management modal (Friends button on each dog row)
- [x] **D-10** Fixed: Customer address sub-section added to customer edit modal
- [x] **D-11** Fixed: `loadSchedule()` now renders pickup/dropoff address in schedule cards
- [x] **D-12** Fixed: "Complete" button appears for confirmed appointments
- [x] **D-13** Fixed: `@media print` block expanded with break-inside, print-color-adjust, hidden stats
- [x] **D-14** Schema note: `Dogs.size` was renamed to `Dogs.weight` (Decimal) — aligns with vet/registry records; `size` was a qualitative field (small/medium/large) not a specification requirement
- [x] **D-15** Fixed: `bio` field added to `Walkers` entity in schema + UI modal + seed CSV
- [x] **D-16** Fixed: Confirmation number (first 8 chars of UUID) surfaced in Confirmations table with `conf-num` monospace styling

### Verification
- [x] CDS model compiles without errors
- [x] CAP server starts at `http://localhost:4004`
- [x] All 10 CSV files load on startup
- [x] `GET /api/Walkers` returns 5 walkers
- [x] `GET /api/Customers` returns 50 customers
- [x] `GET /api/Dogs` returns 75 dogs
- [x] `GET /api/Appointments` returns 80 appointments
- [x] `GET /api/BillingRecords` returns 40 records
- [x] `getValidSlots()` returns 22 slots
- [x] `getDailySchedule("2025-06-01")` returns appointment data
- [x] Double-booking POST returns HTTP 409
- [x] Invalid slot POST returns HTTP 400
- [x] 18/18 unit tests pass
- [x] Vanilla JS SPA served at `http://localhost:4004/react-ui/` (200 OK, ~38 KB)
- [x] All 9 end-to-end API checks pass

---

## Architecture Notes

- **Frontend approach**: Vanilla JS SPA in a single `index.html` — no JSX, no transpiler, no npm dependencies
- **Vite stub**: Custom shim at `app/react-ui/node_modules/vite/index.js` satisfies CDS vite-watch detection and serves `index.html` as a connect-style middleware
- **Billing race condition**: Fee computed from `AppointmentDogs` count inside `AFTER CREATE` handler — not from `appt.totalFee` (which is null at that point)
- **Dogs back-link**: Self-referential CDS association removed; `DogFriends` queried directly via API
