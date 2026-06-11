# App Intent - Paw & Go Dog Walking Service

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**App:** Paw & Go | Technology: Vanilla JS SPA + CAP Node.js | CAP service: DogWalkingService (path `/api`)

---

## Business context

Paw & Go is a small dog walking agency that needs to manage a roster of professional walkers, a customer base with their dogs, and a daily appointment schedule. The app replaces a paper-and-phone process with a web UI: staff book half-hour walking slots, confirm them with the customer, and generate a daily print schedule for walkers. Automatic fee calculation ($30 base + $10 per additional dog) and billing record creation reduce manual bookkeeping.

---

## Target users

### Role: Front-desk Coordinator
- Background: Non-technical office staff; comfortable with simple web forms; no SQL/API knowledge.
- Primary goals:
  - Book appointments for customers and their dogs
  - Assign walkers to bookings
  - Check walker availability before booking
  - Review and print the daily schedule for walkers
  - Mark appointments as confirmed / completed
  - View outstanding and paid billing records
- Expected frequency of use: Daily (multiple sessions per day)
- Technical proficiency: Low

### Role: Manager / Owner
- Background: Business owner; reviews financials and customer data; occasionally edits walker availability or customer records.
- Primary goals:
  - Add/edit walkers and their weekly availability
  - Add/edit customers, dogs, and addresses
  - Review billing totals and payment status
  - Print the daily walker schedule
- Expected frequency of use: Weekly
- Technical proficiency: Medium

---

## Primary use cases

### UC-01: Book an appointment
- Actor: Front-desk Coordinator
- Trigger: Customer calls to book a walk
- Goal: Create an appointment for a date, time slot, walker, and one or more dogs
- Success: Appointment appears in the Appointments view and on the Daily Schedule
- Frequency: Multiple times per day

### UC-02: View and print the daily schedule
- Actor: Front-desk Coordinator / Walker
- Trigger: Start of each working day
- Goal: See all appointments for today, sorted by time slot and walker, with pickup address and dog names
- Success: Print view renders cleanly with all columns visible
- Frequency: Daily

### UC-03: Confirm an appointment
- Actor: Front-desk Coordinator
- Trigger: Customer confirms via phone/email
- Goal: Mark appointment status as "confirmed"; system creates a Confirmation record
- Success: Status shows "confirmed" in Appointments list; Confirmations view shows the new record
- Frequency: Daily

### UC-04: Mark appointment completed
- Actor: Front-desk Coordinator (end of day)
- Trigger: Walker returns after the walk
- Goal: Change appointment status from "confirmed" to "completed"
- Success: Appointment shows "completed" status; billing record status becomes "pending" for invoicing
- Frequency: Daily

### UC-05: Review and mark billing records paid
- Actor: Manager
- Trigger: Invoice payment received
- Goal: Find the billing record for a paid appointment and change status to "paid"
- Success: Billing record shows "paid" status with payment method and date
- Frequency: Weekly

### UC-06: Manage walkers and availability
- Actor: Manager
- Trigger: Hiring a new walker or changing a walker's schedule
- Goal: Create/edit walker profile and set available days-of-week
- Success: New walker appears in dropdown when booking on their available days
- Frequency: Occasional

---

## Intent artifacts
- `intent.md` at project root — full intent analysis including original user prompt
- `specification/original-intent.md` — verbatim original user prompt
- `specification/specification.md` — high-level specification
- `specification/dog-walking-cap/specification.md` — detailed CAP asset specification

---

## Known scope exclusions
- No customer-facing portal (internal staff tool only)
- No real-time push notifications
- No GPS tracking of walkers
- No payment gateway integration (billing status only)
- No multi-tenant or multi-company support
- No mobile app (responsive web UI is sufficient)
- Dog-friend relationship has no UI panel in current version (D-09)
