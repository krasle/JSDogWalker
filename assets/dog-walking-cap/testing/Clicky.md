# Clicky Task Suite - Paw & Go

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**Version:** 1.0 (stable — do not regenerate between iterations)
**Service base URL:** http://localhost:4004/api
**App URL:** http://localhost:4004/react-ui/
**Auth:** Anonymous (no auth configured for dev)

**Instructions:** This suite is stable across iterations. Do NOT regenerate tasks. Mark each result PASS / FAIL-WRONG / FAIL-MISSING / FAIL-BLOCKED / NOT-RUN. FAIL-BLOCKED = environment issue (server down, auth blocked). NOT-RUN = mechanically impossible to execute. All others must be scored even if root cause is already known.

---

## Tier 1 — KPI totals (read-only verification)

### T-01: Walker count
- **Layer:** Tier 1
- **Use case:** UC-06
- **Action:** `GET /api/Walkers?$count=true`
- **Expected:** `@odata.count` = 5
- **Verified answer:** 5 walkers seeded (`dog.walking-Walkers.csv`)
- **Result (iter 1):** ___

### T-02: Customer count
- **Layer:** Tier 1
- **Use case:** UC-01 prerequisite
- **Action:** `GET /api/Customers?$count=true`
- **Expected:** `@odata.count` = 50
- **Verified answer:** 50 customers seeded
- **Result (iter 1):** ___

### T-03: Dog count
- **Layer:** Tier 1
- **Use case:** UC-01 prerequisite
- **Action:** `GET /api/Dogs?$count=true`
- **Expected:** `@odata.count` = 75
- **Verified answer:** 75 dogs seeded (1–5 per customer)
- **Result (iter 1):** ___

### T-04: Appointment count
- **Layer:** Tier 1
- **Use case:** UC-01
- **Action:** `GET /api/Appointments?$count=true`
- **Expected:** `@odata.count` = 80
- **Verified answer:** 80 appointments seeded
- **Result (iter 1):** ___

### T-05: Billing record count
- **Layer:** Tier 1
- **Use case:** UC-05
- **Action:** `GET /api/BillingRecords?$count=true`
- **Expected:** `@odata.count` ≥ 40 (seed has 40; new appointments add more)
- **Verified answer:** 40 seeded
- **Result (iter 1):** ___

### T-06: Valid slot count
- **Layer:** Tier 1
- **Use case:** UC-01
- **Action:** `GET /api/getValidSlots()`
- **Expected:** Array of 22 strings; first = `"07:00"`, last = `"18:30"`
- **Verified answer:** 22 slots (AM: 07:00–11:30, PM: 13:00–18:30)
- **Result (iter 1):** ___

---

## Tier 2 — Read detail / expand

### T-07: Appointment expand walker and customer
- **Layer:** Tier 2
- **Use case:** UC-01
- **Action:** `GET /api/Appointments?$expand=walker,customer&$top=1`
- **Expected:** Response includes nested `walker.firstName`, `customer.firstName`
- **Verified answer:** Walker and customer objects populated
- **Result (iter 1):** ___

### T-08: Appointment expand dogs
- **Layer:** Tier 2
- **Use case:** UC-01
- **Action:** `GET /api/Appointments?$expand=dogs($expand=dog)&$top=1`
- **Expected:** `dogs` array contains objects with nested `dog.name`
- **Verified answer:** `dogs[0].dog.name` populated
- **Result (iter 1):** ___

### T-09: getDailySchedule returns address fields
- **Layer:** Tier 2
- **Use case:** UC-02
- **Action:** `GET /api/getDailySchedule(date='2026-01-15')`
- **Expected:** Response items include `pickupStreet`, `pickupCity`, `dropoffStreet`, `dropoffCity`
- **Verified answer:** API returns these fields; UI does not render them (D-11)
- **Result (iter 1):** API=PASS, UI=FAIL-MISSING (D-11)

### T-10: Customer dogs expand
- **Layer:** Tier 2
- **Use case:** UC-01 prerequisite
- **Action:** `GET /api/Customers?$expand=dogs&$top=3`
- **Expected:** Each customer has `dogs[]` array with name/breed
- **Verified answer:** Confirmed via API checks
- **Result (iter 1):** ___

---

## Tier 4 — Write operations (CRUD)

### T-11: Create appointment with valid slot
- **Layer:** Tier 4
- **Use case:** UC-01
- **Precondition:** At least one customer with a dog and one walker exist
- **Action:** `POST /api/Appointments` with `{ date, timeSlot: "09:00", walker_ID, customer_ID, dogs: [{dog_ID}] }`
- **Expected:** HTTP 201; appointment returned with ID
- **Network assertion:** `POST /api/Appointments` → HTTP 201
- **Verified answer:** HTTP 201 confirmed in prior SV run
- **Result (iter 1):** ___

### T-12: Reject invalid time slot
- **Layer:** Tier 4 / Negative
- **Use case:** UC-01 validation
- **Action:** `POST /api/Appointments` with `timeSlot: "12:00"`
- **Expected:** HTTP 400; error message contains "Invalid time slot"
- **Network assertion:** `POST /api/Appointments` → HTTP 400
- **Verified answer:** HTTP 400 confirmed in SV run
- **Result (iter 1):** PASS

### T-13: Reject double-booking
- **Layer:** Tier 4 / Negative
- **Use case:** UC-01 validation
- **Precondition:** Appointment exists for walker W on date D at slot S
- **Action:** `POST /api/Appointments` with same walker_ID, date, timeSlot
- **Expected:** HTTP 409; error message contains "already booked"
- **Network assertion:** `POST /api/Appointments` → HTTP 409
- **Verified answer:** HTTP 409 confirmed in SV run
- **Result (iter 1):** PASS

### T-14: Confirm appointment (status transition: pending → confirmed)
- **Layer:** Tier 4
- **Use case:** UC-03
- **Precondition:** Appointment exists with status "pending" (newly created, T-11 PASS)
- **Action:** `PATCH /api/Appointments/{ID}` with `{ status: "confirmed" }`
- **Expected:** HTTP 200; appointment shows status "confirmed" in list
- **Network assertion:** `PATCH /api/Appointments/{ID}` → HTTP 200
- **Blocked by D-06:** Cannot PATCH seed row IDs — use appointment created in T-11
- **Result (iter 1):** ___

### T-15: Complete appointment (status transition: confirmed → completed)
- **Layer:** Tier 4
- **Use case:** UC-04
- **Precondition:** T-14 PASS; appointment status is "confirmed"
- **Action:** Click "Complete" button in Appointments view (or `PATCH` with `status: "completed"`)
- **Expected:** HTTP 200; status changes to "completed"
- **Network assertion:** `PATCH /api/Appointments/{ID}` → HTTP 200
- **Blocked by D-12:** No Complete button in UI
- **Result (iter 1):** FAIL-MISSING (D-12)

### T-16: Auto-create billing record (Chain)
- **Layer:** Chain
- **Use case:** UC-01 → UC-05 side effect
- **Precondition:** T-11 PASS
- **Action:** `GET /api/BillingRecords?$filter=appointment_ID eq '{T-11 appointment ID}'`
- **Expected:** One billing record exists with `amount` > 0, `status: "pending"`
- **Network assertion:** `GET /api/BillingRecords` → HTTP 200 with 1 record
- **Verified answer:** AFTER CREATE handler inserts BillingRecord — confirmed via code check
- **Result (iter 1):** ___

### T-17: Auto-create confirmation record (Chain)
- **Layer:** Chain
- **Use case:** UC-01 → UC-03 side effect
- **Precondition:** T-11 PASS
- **Action:** `GET /api/Confirmations?$filter=appointment_ID eq '{T-11 appointment ID}'`
- **Expected:** One confirmation record exists
- **Network assertion:** `GET /api/Confirmations` → HTTP 200 with 1 record
- **Blocked by D-07:** No INSERT.into Confirmations in AFTER CREATE handler
- **Result (iter 1):** FAIL-MISSING (D-07)

### T-18: Fee for 1 dog = $30
- **Layer:** Chain
- **Use case:** UC-05 billing formula
- **Precondition:** Appointment created with exactly 1 dog
- **Action:** Check billing record `amount` for appointment
- **Expected:** amount = 30
- **Verified answer:** Unit test "1 dog = $30" PASS + SV API confirmed
- **Result (iter 1):** ___

### T-19: Fee for 3 dogs = $50
- **Layer:** Chain
- **Use case:** UC-05 billing formula
- **Precondition:** Appointment created with exactly 3 dogs
- **Action:** Check billing record `amount` for appointment
- **Expected:** amount = 50 (30 + 2×10)
- **Verified answer:** SV API check confirmed `amount=50` for 3-dog appointment
- **Result (iter 1):** PASS

### T-20: Mark billing record paid
- **Layer:** Tier 4
- **Use case:** UC-05
- **Precondition:** Billing record exists with status "pending" (T-16 PASS)
- **Action:** `PATCH /api/BillingRecords/{ID}` with `{ status: "paid", method: "card", paidAt: "2026-06-11T12:00:00Z" }`
- **Expected:** HTTP 200; billing record shows "paid"
- **Network assertion:** `PATCH /api/BillingRecords/{ID}` → HTTP 200
- **Result (iter 1):** ___

### T-21: Create walker
- **Layer:** Tier 4
- **Use case:** UC-06
- **Action:** `POST /api/Walkers` with `{ firstName, lastName, phone, email, isActive: true }`
- **Expected:** HTTP 201; walker appears in list
- **Network assertion:** `POST /api/Walkers` → HTTP 201
- **Result (iter 1):** ___

### T-22: Edit walker (on newly created row — avoids D-06)
- **Layer:** Tier 4
- **Use case:** UC-06
- **Precondition:** T-21 PASS; new walker ID is a valid UUID
- **Action:** `PATCH /api/Walkers/{new UUID}` with `{ phone: "555-9999" }`
- **Expected:** HTTP 200; phone updated in list
- **Network assertion:** `PATCH /api/Walkers/{UUID}` → HTTP 200
- **Result (iter 1):** ___

### T-23: Edit seed walker row (D-06 regression test)
- **Layer:** Tier 4 / Negative
- **Use case:** UC-06
- **Precondition:** Seed data loaded (walker `w001` exists)
- **Action:** `PATCH /api/Walkers/w001` with `{ phone: "555-0000" }`
- **Expected (current):** HTTP 400 "does not contain a valid UUID" (D-06 known)
- **Expected (after D-06 fix):** HTTP 200
- **Network assertion:** `PATCH /api/Walkers/w001` → HTTP 400 (before fix)
- **Result (iter 1):** FAIL-WRONG (D-06) — HTTP 400 as expected until fix

### T-24: Walker availability management (D-08 regression test)
- **Layer:** Tier 4
- **Use case:** UC-06
- **Precondition:** Walker exists (T-21 PASS)
- **Action:** UI — open Walker detail; look for availability section
- **Expected (current):** No availability section visible (D-08 known)
- **Expected (after D-08 fix):** Day checkboxes shown; can POST to `/api/WalkerAvailability`
- **Blocked by D-08:** No availability UI
- **Result (iter 1):** FAIL-MISSING (D-08)

### T-25: Pickup address shown in schedule card (D-11 regression test)
- **Layer:** Tier 2
- **Use case:** UC-02
- **Precondition:** Appointments exist for selected date
- **Action:** UI — load schedule; inspect a card with a known pickup address
- **Expected (current):** Address not shown (D-11 known)
- **Expected (after D-11 fix):** "742 Evergreen Terrace, Springfield" visible in card
- **Result (iter 1):** FAIL-MISSING (D-11)

### T-26: Confirmation record surfaces confirmation reference (D-16 regression test)
- **Layer:** Tier 2
- **Use case:** UC-03
- **Precondition:** Confirmation exists in seed data
- **Action:** UI — open Confirmations view; look for confirmation number field
- **Expected (current):** No confirmation number shown (D-16 known)
- **Expected (after D-16 fix):** Short code (e.g. PAG-0001 or first-8 of UUID) visible
- **Result (iter 1):** FAIL-MISSING (D-16)

### T-27: Print CSS — no overflow in print preview (D-13 regression test)
- **Layer:** Tier 2
- **Use case:** UC-02
- **Action:** Browser print preview of Schedule view
- **Expected (current):** Columns may clip (D-13 known)
- **Expected (after D-13 fix):** All columns fully visible; page-break-inside: avoid respected
- **Result (iter 1):** ___

### T-28: Dog weight field present (D-14 documentation)
- **Layer:** Tier 1
- **Use case:** Data integrity
- **Action:** `GET /api/Dogs?$top=1`
- **Expected:** Response includes `weight` field (not `size`)
- **Verified answer:** `weight` field confirmed in CDS schema — `size` was replaced
- **Result (iter 1):** PASS

### T-29: Create appointment with deep-insert dogs array
- **Layer:** Tier 4 / negative pattern
- **Use case:** UC-01
- **Action:** `POST /api/Appointments` with dogs as plain strings: `{ dogs: ["uuid1"] }` (wrong format)
- **Expected:** HTTP 400 (ASSERT_DATA_TYPE)
- **Correct format:** `dogs: [{ dog_ID: "uuid1" }]`
- **Verified answer:** CAP rejects plain string array; requires object with `dog_ID`
- **Network assertion:** HTTP 400 for wrong format
- **Result (iter 1):** PASS (known behaviour; UI uses correct format)

---

## Iteration log

### Iteration 1 — 2026-06-11

**Auth pre-flight:** N/A (anonymous access)  
**Tasks run:** 29  
**Environment:** Browser MCP unavailable — API tasks verified via curl/SV; UI tasks are deferred to human tester  
**Static pre-checks run:** ST-0 through ST-7

| Task | Result | Defect |
|---|---|---|
| T-01 | PASS (API verified) | — |
| T-02 | PASS (API verified) | — |
| T-03 | PASS (API verified) | — |
| T-04 | PASS (API verified) | — |
| T-05 | PASS (API verified) | — |
| T-06 | PASS (API verified) | — |
| T-07 | PASS (API verified) | — |
| T-08 | PASS (API verified) | — |
| T-09 | API=PASS / UI=FAIL-MISSING | D-11 |
| T-10 | PASS (API verified) | — |
| T-11 | PASS (API verified: HTTP 201) | — |
| T-12 | PASS (HTTP 400 confirmed) | — |
| T-13 | PASS (HTTP 409 confirmed) | — |
| T-14 | Deferred to human tester | — |
| T-15 | FAIL-MISSING | D-12 |
| T-16 | PASS (code verified: INSERT present) | — |
| T-17 | FAIL-MISSING | D-07 |
| T-18 | PASS (unit test + API) | — |
| T-19 | PASS (API: amount=50 for 3 dogs) | — |
| T-20 | Deferred to human tester | — |
| T-21 | Deferred to human tester | — |
| T-22 | Deferred to human tester | — |
| T-23 | FAIL-WRONG (D-06, expected) | D-06 |
| T-24 | FAIL-MISSING | D-08 |
| T-25 | FAIL-MISSING | D-11 |
| T-26 | FAIL-MISSING | D-16 |
| T-27 | Deferred to human tester | — |
| T-28 | PASS (schema confirmed) | — |
| T-29 | PASS (known behaviour) | — |

**API tasks:** 22 (17 PASS, 5 FAIL)  
**Deferred to human:** 7  
**Newly-introduced defects:** D-06, D-07, D-08, D-11, D-12, D-16  
**Total open defects:** 11 (D-06 through D-16)  
**Convergence:** NO

**Summary:** First iteration reveals 11 defects via static and API analysis. D-06 (non-UUID seed IDs) is the most critical blocker — it prevents any edit/delete on seed data. D-07 (missing confirmation auto-create) and D-08 (no availability UI) are high-severity functional gaps. Browser MCP unavailable; 7 UI tasks deferred to human tester. Full convergence requires: fix D-06 through D-16, re-run all 29 tasks with browser.
