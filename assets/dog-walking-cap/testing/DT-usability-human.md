# Human Usability Test Sheet - Paw & Go

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**Tester:** (fill in name)
**Date of test:** (fill in date)
**Build:** CAP v9.9.1 / Node.js v25.9.0 / SQLite in-memory
**App URL:** http://localhost:4004/react-ui/

**Note:** Browser automation MCP is unavailable in this environment. This sheet provides step-by-step instructions for a human tester to verify app behaviour. Record PASS / FAIL / NOTES in the Result column.

---

## Pre-flight setup

1. Start the CAP server:
   ```bash
   cd assets/dog-walking-cap
   HOME=/home/user NODE_PATH=/usr/local/lib/node_modules/@sap/cds-dk/node_modules cds watch
   ```
2. Open a browser and navigate to `http://localhost:4004/react-ui/`
3. Verify the page loads and shows the "Paw & Go" header with a navigation sidebar

---

## Task T-01: View daily schedule (Tier 1 — Read)

**Use case:** UC-02  
**Precondition:** Server running; seed data loaded (80 appointments)

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Schedule" in the sidebar | Schedule view appears with a date picker |
| 2 | Verify the date picker defaults to today's date | Today's date pre-filled |
| 3 | Click "Load Schedule" | Schedule cards appear (or "No appointments" if today has none) |
| 4 | Change the date to 2026-01-15 and click Load | Cards show appointments for that date |
| 5 | Verify each card shows: walker name, time slot, customer name, dog name(s) | All fields visible |
| 6 | *(after D-11 fix)* Verify each card shows pickup address | Street and city visible |

**Result:** _____ | **Notes:** _____

---

## Task T-02: Print daily schedule (Tier 2 — Read variant)

**Use case:** UC-02  
**Precondition:** T-01 PASS; schedule showing appointments

| Step | Action | Expected |
|---|---|---|
| 1 | With appointments visible in Schedule view, click "Print" | Browser print dialog opens |
| 2 | Cancel print; inspect print preview visually | Sidebar/nav hidden; schedule table visible |
| 3 | Verify no content is clipped or overflowing in print preview | All columns fully visible |

**Result:** _____ | **Notes:** _____

---

## Task T-03: Book a new appointment (Tier 4 — Create)

**Use case:** UC-01  
**Precondition:** Server running; seed data loaded

| Step | Action | Expected |
|---|---|---|
| 1 | Click "Appointments" in the sidebar | Appointments list shows 80 rows |
| 2 | Click "New Appointment" button | Booking form opens |
| 3 | Select a customer from the dropdown | Dog dropdown populates with customer's dogs |
| 4 | Select one or more dogs from the list | Dogs highlighted/selected |
| 5 | Select a walker | Walker dropdown shows 5 walkers |
| 6 | Enter date: 2026-12-01 and time slot: 09:00 | Fields filled |
| 7 | Click "Save" | HTTP 201 returned; new appointment appears in list |
| 8 | Open Billing view | New billing record appears for the appointment |
| 9 | *(after D-07 fix)* Open Confirmations view | New confirmation record appears |
| **Network:** | `POST /api/Appointments` | HTTP 201 |

**Result:** _____ | **Notes:** _____

---

## Task T-04: Attempt invalid time slot (Negative — Tier 4)

**Use case:** UC-01  
**Precondition:** Booking form accessible

| Step | Action | Expected |
|---|---|---|
| 1 | Open New Appointment form | Form visible |
| 2 | Type `12:00` into the time slot field (or select if shown) | — |
| 3 | Click Save | Error message shown: "Invalid time slot" |
| **Network:** | `POST /api/Appointments` | HTTP 400 |

**Result:** _____ | **Notes:** _____

---

## Task T-05: Attempt double-booking (Negative — Tier 4)

**Use case:** UC-01  
**Precondition:** T-03 PASS; appointment exists on 2026-12-01 at 09:00 for the same walker

| Step | Action | Expected |
|---|---|---|
| 1 | Open New Appointment form | Form visible |
| 2 | Select same walker, same date (2026-12-01), same slot (09:00) | — |
| 3 | Click Save | Error message shown: "Walker is already booked" |
| **Network:** | `POST /api/Appointments` | HTTP 409 |

**Result:** _____ | **Notes:** _____

---

## Task T-06: Verify fee calculation (Chain — Tier 4)

**Use case:** UC-01 + UC-05  
**Precondition:** Appointment booked with 3 dogs in T-03

| Step | Action | Expected |
|---|---|---|
| 1 | Open Billing view | Billing list visible |
| 2 | Find the billing record for the T-03 appointment | Record present |
| 3 | Verify `amount` = $50 (base $30 + 2×$10 for dogs 2 and 3) | Amount field shows 50 |

**Result:** _____ | **Notes:** _____

---

## Task T-07: Confirm an appointment (Tier 4 — Status transition)

**Use case:** UC-03  
**Precondition:** T-03 PASS; new appointment exists with status "pending"

| Step | Action | Expected |
|---|---|---|
| 1 | Find the T-03 appointment in the Appointments list | Row visible with status "pending" |
| 2 | Click "Confirm" action on the row | Status changes to "confirmed" |
| 3 | *(after D-07 fix)* Open Confirmations view | Confirmation record appears for this appointment |
| **Network:** | `PATCH /api/Appointments/{ID}` | HTTP 200 |

**Result:** _____ | **Notes:** _____

---

## Task T-08: Mark appointment completed (Tier 4 — Status transition)  
*(Blocked until D-12 fixed — no Complete button exists)*

**Use case:** UC-04  
**Precondition:** T-07 PASS; appointment is "confirmed"

| Step | Action | Expected |
|---|---|---|
| 1 | Find confirmed appointment | Row shows "confirmed" status |
| 2 | Click "Complete" button | Status changes to "completed" |
| **Network:** | `PATCH /api/Appointments/{ID}` | HTTP 200 |
| **Blocked by:** | D-12 — Complete button not implemented | |

**Result:** BLOCKED (D-12) | **Notes:** Fix D-12 before testing

---

## Task T-09: Mark billing record paid (Tier 4 — Status transition)

**Use case:** UC-05  
**Precondition:** T-03 PASS; billing record exists with status "pending"

| Step | Action | Expected |
|---|---|---|
| 1 | Open Billing view | Billing list visible |
| 2 | Find the T-03 billing record | Status shows "pending" |
| 3 | Change status to "paid" | — |
| 4 | Select payment method (cash/card/transfer) | — |
| 5 | Click Save/Update | Billing record shows "paid" status |
| **Network:** | `PATCH /api/BillingRecords/{ID}` | HTTP 200 |

**Result:** _____ | **Notes:** _____

---

## Task T-10: Add a new walker (Tier 4 — Create)

**Use case:** UC-06  
**Precondition:** Server running

| Step | Action | Expected |
|---|---|---|
| 1 | Open Walkers view | 5 walkers listed |
| 2 | Click "New Walker" | Form opens |
| 3 | Fill in firstName, lastName, phone, email | Fields filled |
| 4 | Click Save | New walker appears in list (6 total) |
| 5 | *(after D-08 fix)* Set availability days | Availability checkboxes save correctly |
| **Network:** | `POST /api/Walkers` | HTTP 201 |

**Result:** _____ | **Notes:** _____

---

## Task T-11: Edit a walker (Tier 4 — Update on seed data)  
*(Blocked until D-06 fixed — seed row IDs are not valid UUIDs)*

**Precondition:** Walkers list visible; seed data present

| Step | Action | Expected |
|---|---|---|
| 1 | Click Edit on walker "w001" | Edit form opens with current values |
| 2 | Change phone number | — |
| 3 | Click Save | Walker updated; list refreshes |
| **Network:** | `PATCH /api/Walkers/w001` | HTTP 200 |
| **Blocked by:** | D-06 — `w001` is not a UUID | |

**Result:** BLOCKED (D-06) | **Notes:** Fix D-06 before testing

---

## Task T-12: Add a new customer with a dog (Chain)

**Use case:** UC-01 prerequisite  
**Precondition:** Server running

| Step | Action | Expected |
|---|---|---|
| 1 | Open Customers view | 50 customers listed |
| 2 | Click "New Customer" | Form opens |
| 3 | Fill in firstName, lastName, phone, email | Fields filled |
| 4 | Click Save | New customer appears |
| 5 | Open Dogs view; click "New Dog" | Dog form opens |
| 6 | Select the new customer as owner; fill in dog name, breed, weight | Fields filled |
| 7 | Click Save | New dog appears linked to customer |
| 8 | Open New Appointment form; select the new customer | Dog dropdown shows the new dog |
| **Network:** | `POST /api/Customers` | HTTP 201 |
| **Network:** | `POST /api/Dogs` | HTTP 201 |

**Result:** _____ | **Notes:** _____

---

## Observation notes

*(Free-form space for the human tester to record UI issues, usability friction, unexpected behaviour, or suggestions not covered by the task steps above)*

_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
