# Product Requirements Document: Paw & Go – Dog Walking Service

## 1. Overview
**Product Name**: Paw & Go  
**Type**: Full-stack web application (CAP Node.js + React UI)  
**Purpose**: Manage a dog walking service — customers, dogs, walkers, scheduling, billing, and confirmations.

---

## 2. Functional Requirements

### 2.1 Customer Management
- **FR-01**: Create, read, update, delete customers (name, email, phone)
- **FR-02**: Each customer has one or more addresses
- **FR-03**: List all customers with their dogs

### 2.2 Dog Management
- **FR-04**: Register dogs per customer (name, breed, size: S/M/L, special notes)
- **FR-05**: Define dog-friend pairs (dogs that walk well together)
- **FR-06**: View all dogs for a customer

### 2.3 Walker Management
- **FR-07**: Manage walker profiles (name, phone, bio, active status)
- **FR-08**: Configure walker availability by day-of-week and time window
- **FR-09**: List walkers and their availability

### 2.4 Appointment Scheduling
- **FR-10**: Book appointments with: date, time slot, walker, customer, one or more dogs
- **FR-11**: Valid time slots: 07:00, 07:30, 08:00, 08:30, 09:00, 09:30, 10:00, 10:30, 11:00, 11:30 (AM) and 13:00, 13:30, 14:00, 14:30, 15:00, 15:30, 16:00, 16:30, 17:00, 17:30, 18:00, 18:30 (PM) — 22 slots total
- **FR-12**: Reject duplicate bookings (same walker + same date + same time) with HTTP 409
- **FR-13**: Reject invalid time slots with HTTP 400
- **FR-14**: `getValidSlots()` action returns array of 22 valid slot strings
- **FR-15**: Cancel appointments (status: scheduled / completed / cancelled)

### 2.5 Billing
- **FR-16**: Auto-create billing record on appointment booking
- **FR-17**: Fee = $30 base + $10 × (numberOfDogs − 1)
- **FR-18**: Track payment status (unpaid / paid / waived)
- **FR-19**: Display billing records with appointment and customer info

### 2.6 Confirmations
- **FR-20**: Auto-generate confirmation on booking with unique confirmation number
- **FR-21**: Display confirmation: number, sent-at timestamp, appointment details

### 2.7 Daily Schedule
- **FR-22**: `getDailySchedule(date)` returns all appointments for a date with walker, customer, and dog names
- **FR-23**: Print-friendly daily schedule view in the UI

---

## 3. Non-Functional Requirements
- **NFR-01**: CAP service responds within 500ms for all CRUD operations
- **NFR-02**: Seed data loads on startup (CSV files)
- **NFR-03**: Unit tests cover slot validation, billing calculation, double-booking
- **NFR-04**: UI displays all 7 views: Schedule, Walkers, Customers, Dogs, Appointments, Confirmations, Billing

---

## 4. Data Model

### Entities
| Entity | Key Fields | Notes |
|--------|-----------|-------|
| Walkers | ID, name, phone, bio, active | 5 seed walkers |
| WalkerAvailability | ID, walker_ID, dayOfWeek, startTime, endTime | Per-walker time windows |
| Customers | ID, name, email, phone | 50 seed customers |
| Addresses | ID, customer_ID, street, city, state, zip, isPrimary | 101 seed addresses |
| Dogs | ID, customer_ID, name, breed, size, notes | 75 seed dogs |
| DogFriends | dog1_ID, dog2_ID | 34 friend pairs |
| Appointments | ID, date, timeSlot, status, walker_ID, customer_ID | 80 seed appointments |
| AppointmentDogs | appointment_ID, dog_ID | 120 rows |
| BillingRecords | ID, appointment_ID, amount, status, paidAt | 40 seed records |
| Confirmations | ID, appointment_ID, confirmationNumber, sentAt | 12 seed confirmations |

---

## 5. Technical Architecture

### Backend
- **Framework**: SAP CAP Node.js (`@sap/cds` v9.9.2)
- **Database**: SQLite in-memory (dev), HANA (prod)
- **Service path**: `/api`
- **Custom actions**: `getValidSlots()`, `getDailySchedule(date)`
- **Validation**: Slot validation (400), double-booking check (409)

### Frontend
- **Framework**: React 18 (JSX via Babel standalone or pre-bundled)
- **Styling**: Plain CSS (custom design system, no UI5)
- **Views**: Schedule, Walkers, Customers, Dogs, Appointments, Confirmations, Billing
- **Build**: Vite (if available) or served via CDS static middleware

### Seed Data
- Loaded via CSV files in `db/data/` matching namespace `dog.walking`
- 50 customers, 5 walkers, 75 dogs, 80 appointments, 40 billing records, 12 confirmations

---

## 6. Acceptance Criteria
- [ ] CAP server starts and loads all CSV seed data
- [ ] All 10 entities accessible via OData API at `/api`
- [ ] `getValidSlots()` returns exactly 22 slots
- [ ] `getDailySchedule("2025-06-01")` returns appointment data with names
- [ ] Double-booking returns HTTP 409
- [ ] Invalid slot returns HTTP 400
- [ ] Billing record created automatically on appointment POST
- [ ] 18/18 unit tests pass
- [ ] React UI renders all 7 views
- [ ] Daily schedule view is print-friendly
