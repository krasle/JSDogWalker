# Intent: Paw & Go – Dog Walking Service Application

## Summary
Build a full-stack CAP Node.js + React UI application for **Paw & Go**, a dog walking service. The app manages customers, dogs, walkers, scheduling, appointments, billing, and confirmations.

## Core Features

### 1. Customer & Dog Management
- Register customers with name, email, phone, and address
- Register dogs per customer (name, breed, size, notes)
- Mark dog-friend pairs (dogs that walk well together)

### 2. Walker Management
- Manage walker profiles (name, phone, bio)
- Configure per-walker availability slots (day of week + time windows)

### 3. Appointment Scheduling
- Book half-hour walking slots: **07:00–11:30 AM** (10 slots) and **13:00–18:30 PM** (12 slots) — 22 valid slots total
- Assign one or more dogs to a walk
- Assign a walker to the appointment
- Prevent double-booking (same walker + same slot)
- `getValidSlots()` function returns all 22 valid time strings

### 4. Billing
- Base fee: **$30** per walk
- Additional dogs: **+$10** per extra dog (so 1 dog = $30, 2 dogs = $40, 3 dogs = $50, etc.)
- Billing record auto-created on appointment booking
- Track payment status (unpaid / paid)

### 5. Confirmations
- Generate confirmation records for booked appointments
- Display confirmation number, date, customer, walker, dogs

### 6. Daily Schedule View
- Print-friendly view of all appointments for a given date
- Shows walker name, time slot, customer name, dog names
- `getDailySchedule(date)` function on the service

## Technical Stack
- **Backend**: SAP CAP Node.js (CDS v9.9.2), SQLite in-memory (dev)
- **Frontend**: React + plain HTML/CSS (no UI5 web components)
- **Database**: SQLite (dev), HANA (prod)
- **Seed Data**: 50 customers, 5 walkers, 75 dogs, 80 appointments, 40 billing records, 12 confirmations
- **No npm install**: Use globally installed `@sap/cds-dk` packages only

## Constraints
- Fast Track mode (minimal clarifying questions)
- No `@ui5/webcomponents-react` (not available globally)
- npm registry inaccessible — must symlink global packages
- CDS service path: `/api`
- Valid slots: 22 half-hour slots (AM: 07:00–11:30, PM: 13:00–18:30)
- Use `crypto.randomUUID()` instead of `cds.cuid()`
