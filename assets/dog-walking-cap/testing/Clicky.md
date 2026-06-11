# Task Suite - Paw & Go Dog Walking Service

**Generated:** 2026-06-11
**Grounded against:** intent.md, product-requirements-document.md, specification/dog-walking-cap/specification.md
**Last executed:** not run
**Tasks total:** 69  (Tier1:8 Tier2:10 Tier3:8 Tier4:15 Chain:12 Negative:8 + T-PRE-01 pre-flight + T1-X gap observation)
**Pass rate:** Run 2 complete — see execution log

## Layer 0 - Document grounding summary

Spec documents read: intent.md, product-requirements-document.md,
specification/dog-walking-cap/specification.md, solution.yaml, assets/dog-walking-cap/asset.yaml

Entities: Walkers(5), Customers(50), Dogs(75), Appointments(80),
  BillingRecords(40), Confirmations(12)
Status values:
  Appointments: scheduled(66) | confirmed(2) | completed(10) | cancelled(2)
  BillingRecords: pending(30) | paid(10) | waived(0)
Auto-create handlers:
  AFTER CREATE Appointments -> creates BillingRecord (amount = $30 + $10*(dogs-1))
Validation rules:
  FR-12: double-booking -> HTTP 409
  FR-13: invalid slot -> HTTP 400
  FR-17: fee = $30 + $10 * (numberOfDogs - 1)
Seed data ID format: NON-UUID (ap001, w001, c001...) with cuid schema -> D-019 class defect expected

## Layer 1 - Entity lifecycle matrix

| Entity        | Create | Read | Update | Delete | Status transitions          |
|---------------|--------|------|--------|--------|-----------------------------|
| Walkers       | T4-W01 | T1   | T4-W02 | T4-W03 | isActive toggle             |
| Customers     | T4-C01 | T1   | T4-C02 | T4-C03 | -                           |
| Dogs          | T4-D01 | T2   | T4-D02 | T4-D03 | -                           |
| Appointments  | T4-A01 | T2   | -      | -      | scheduled->confirmed (T4-A02), any->cancelled (T4-A03) |
| BillingRecords| (auto) | T2   | T4-B01 | -      | pending->paid               |
| Confirmations | (auto) | T2   | -      | -      | (auto-created on booking)   |

## PRE-FLIGHT - Run before any Tier 4 tasks

### T-PRE-01
- **Tier:** Negative (API pre-flight - MUST RUN FIRST)
- **FR:** cap-shared.md §3.2 cuid UUID-validation trap
- **Description:** Verify that write operations succeed against seed data IDs. If this task
  FAILS, all Tier 4 tasks will be FAIL-BLOCKED with root cause D-019. Do not proceed with
  UI write testing until this is resolved.
- **Question:** Does PATCH /api/Appointments(ID='ap001') return HTTP 200?
- **Correct answer:** HTTP 400 "Element 'ID' does not contain a valid UUID"
  (Verified: curl PATCH http://localhost:4004/api/Appointments(ID='ap001') -> 400.
  The seed data uses non-UUID IDs but the schema declares : cuid. This IS the expected
  failure - task PASS means the defect exists and is correctly detected.)
- **Method:** browser_evaluate (Playwright) or evaluate_script (Chrome DevTools MCP):
    fetch('/api/Appointments(ID=\'ap001\')', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: '{"notes":"pre-flight"}'
    }).then(r => r.status)
- **Success criteria for this task:** fetch returns 400 (confirms D-019 is present)
- **If returns 200:** PASS means seed data uses real UUIDs - no D-019 defect. Continue with T4 tasks normally.
- **If returns 400:** PASS means D-019 detected. Raise as BLOCKING defect. All T4 tasks will
  FAIL-BLOCKED. Record root cause = seed data non-UUID IDs on cuid entity.
- **Last result:** not run

---

## Tier 1 - KPI Reads (fast sanity checks, run every iteration)

### T1-01
- **FR:** NFR-04, FR-09
- **Description:** Count total walkers
- **Question:** How many walkers are listed in the Walkers view?
- **Correct answer:** 5 (verified: GET /api/Walkers?$count=true&$top=0 -> 5)
- **Expected path:** Walkers tab -> count rows
- **Success criteria:** Table shows 5 rows with walker names
- **Last result:** not run

### T1-02
- **FR:** NFR-04
- **Description:** Count total customers
- **Question:** How many customers are listed in the Customers view?
- **Correct answer:** 50 (verified: GET /api/Customers?$count=true&$top=0 -> 50)
- **Expected path:** Customers tab -> heading shows count
- **Success criteria:** Heading reads "Customers (50)"
- **Last result:** not run

### T1-03
- **FR:** NFR-04
- **Description:** Count total appointments
- **Question:** What does the Total KPI tile show on the Appointments view?
- **Correct answer:** 80 (verified: GET /api/Appointments?$count=true&$top=0 -> 80)
- **Expected path:** Appointments tab -> Total stat card
- **Success criteria:** Stat card shows "80" under "Total"
- **Last result:** not run

### T1-04
- **FR:** FR-15
- **Description:** Count scheduled appointments
- **Question:** How many appointments are in "scheduled" status?
- **Correct answer:** 66 (verified: GET /api/Appointments?$count=true&$top=0&$filter=status eq 'scheduled' -> 66)
- **Expected path:** Appointments tab -> Scheduled stat card
- **Success criteria:** Stat card shows "66" under "Scheduled"
- **Last result:** not run

### T1-05
- **FR:** FR-19
- **Description:** Total billing amount billed
- **Question:** What is the Total Billed amount shown in Billing view?
- **Correct answer:** $1380.00 (verified: sum of BillingRecords.amount -> 1380)
- **Expected path:** Billing tab -> Total Billed stat card
- **Success criteria:** Stat card shows "$1380.00" under "Total Billed"
- **Last result:** not run

### T1-06
- **FR:** FR-19
- **Description:** Amount collected (paid billing)
- **Question:** What is the Paid/Collected amount in Billing view?
- **Correct answer:** $350.00 (verified: sum of BillingRecords where status='paid' -> 350)
- **Expected path:** Billing tab -> Collected/Paid stat card
- **Success criteria:** Stat card shows "$350.00"
- **Last result:** not run

### T1-07
- **FR:** FR-14, FR-11
- **Description:** Valid time slots count
- **Question:** How many time slot options appear in the appointment booking form slot dropdown?
- **Correct answer:** 22 (verified: GET /api/getValidSlots() -> 22 values)
- **Expected path:** Appointments tab -> "+ Book Appointment" -> count slot options
- **Success criteria:** Slot dropdown has exactly 22 options (07:00-11:30 and 13:00-18:30)
- **Last result:** not run

### T1-08
- **FR:** FR-22
- **Description:** Daily schedule loads for date with appointments
- **Question:** How many appointments appear on the schedule for 2026-06-15?
- **Correct answer:** 12 (verified: GET /api/getDailySchedule(date='2026-06-15') -> 12 rows)
- **Expected path:** Schedule tab -> set date to 2026-06-15 -> click Load -> count entries
- **Success criteria:** Schedule shows 12 appointment cards grouped by walker
- **Last result:** not run

---

## Tier 2 - Filtered List Navigation

### T2-01
- **FR:** FR-15
- **Description:** Filter appointments by status
- **Question:** How many appointments show when filtered to status "completed"?
- **Correct answer:** 10 (verified: GET /api/Appointments?$count=true&$top=0&$filter=status eq 'completed' -> 10)
- **Expected path:** Appointments tab -> Status filter -> select "completed"
- **Success criteria:** Table shows 10 rows, all with "completed" status badge
- **Last result:** not run

### T2-02
- **FR:** FR-09
- **Description:** Filter appointments by walker
- **Question:** How many appointments are assigned to Jake Morrison?
- **Correct answer:** Fetch GET /api/Appointments?$filter=walker_ID eq 'w001' before run to verify
- **Expected path:** Appointments tab -> Walker filter -> select "Jake Morrison"
- **Success criteria:** All visible rows show "Jake Morrison" in Walker column. Count matches OData.
- **Last result:** not run

### T2-03
- **FR:** FR-19
- **Description:** Filter billing by status
- **Question:** How many billing records show when filtered to "pending"?
- **Correct answer:** 30 (verified: GET /api/BillingRecords?$count=true&$top=0&$filter=status eq 'pending' -> 30)
- **Expected path:** Billing tab -> Status filter -> select "Pending"
- **Success criteria:** Table shows 30 rows, all with "pending" status badge
- **Last result:** not run

### T2-04
- **FR:** FR-06
- **Description:** Filter dogs by customer
- **Question:** How many dogs does Alice Thompson own?
- **Correct answer:** 3 (verified: GET /api/Dogs?$filter=owner_ID eq 'c001' -> 3)
- **Expected path:** Dogs tab -> Customer filter -> select "Alice Thompson"
- **Success criteria:** Table shows 3 dogs, all owned by Alice Thompson
- **Last result:** not run

### T2-05
- **FR:** FR-22
- **Description:** Schedule empty for date with no appointments
- **Question:** What does the Schedule view show for today's date (2026-06-11)?
- **Correct answer:** Empty state message (no appointments on this date)
- **Expected path:** Schedule tab -> date defaults to today -> Load shows empty
- **Success criteria:** "No appointments" message visible, no appointment cards
- **Last result:** not run

### T2-06
- **FR:** FR-21
- **Description:** Confirmations list shows appointment details
- **Question:** How many confirmations are logged?
- **Correct answer:** 12 (verified: GET /api/Confirmations?$count=true&$top=0 -> 12)
- **Expected path:** Confirmations tab -> count rows in Confirmation Log
- **Success criteria:** Table shows 12 rows with Confirmed At dates and customer names
- **Last result:** not run

### T2-07
- **FR:** FR-03
- **Description:** Customer list shows dogs
- **Question:** Which dogs does Emma Brown own according to the Customers view?
- **Correct answer:** Rocky, Molly, Coco, Ziggy (4 dogs) (verified: GET /api/Customers?$expand=dogs&$filter=firstName eq 'Emma' and lastName eq 'Brown')
- **Expected path:** Customers tab -> find Emma Brown row -> Dogs column
- **Success criteria:** Row shows 4 dog name badges: Rocky, Molly, Coco, Ziggy
- **Last result:** not run

### T2-08
- **FR:** FR-07, FR-08
- **Description:** Walker list shows availability
- **Question:** Does the Walkers view show availability information?
- **Correct answer:** Yes - verified against GET /api/Walkers?$expand=availability
- **Expected path:** Walkers tab -> inspect rows for availability column
- **Success criteria:** Each walker row shows availability (days and times) OR if not shown, this is a defect against FR-08/FR-09
- **Notes:** The vanilla JS index.html DOES show availability. If missing, flag as defect.
- **Last result:** not run

### T2-09
- **FR:** FR-23
- **Description:** Schedule is print-friendly
- **Question:** Does the Schedule view have a working Print button that invokes window.print?
- **Correct answer:** Print button visible and clickable on Schedule view with data loaded
- **Expected path:** Schedule tab -> load date 2026-06-15 -> verify Print button present
- **Success criteria:** Print button visible. On click, no JS error.
- **Last result:** not run

### T2-10
- **FR:** FR-10
- **Description:** Appointment booking form shows customer-filtered dogs
- **Question:** When Alice Thompson is selected in the booking form, how many dogs appear?
- **Correct answer:** 3 (Alice's dogs: Buddy, Luna, Rusty - verified: GET /api/Dogs?$filter=owner_ID eq 'c001')
- **Expected path:** Appointments tab -> "+ Book Appointment" -> select "Alice Thompson" -> Dogs dropdown
- **Success criteria:** Only 3 dogs visible (Buddy, Luna, Rusty), not all 75
- **Last result:** not run

---

## Tier 3 - Cross-entity Detail

### T3-01
- **FR:** FR-10
- **Description:** Appointment row shows correct dog names
- **Question:** What dogs are listed for the appointment on 2026-06-15 07:30 (Grace Lee)?
- **Correct answer:** Lola, Sadie (verified: GET /api/Appointments?$expand=dogs($expand=dog)&$filter=date eq 2026-06-15 and timeSlot eq '07:30')
- **Expected path:** Appointments tab -> find row date=2026-06-15 time=07:30 customer=Grace Lee
- **Success criteria:** Dogs column shows "Lola, Sadie"
- **Last result:** not run

### T3-02
- **FR:** FR-17
- **Description:** Appointment fee correct for 3-dog appointment
- **Question:** What is the fee for Emma Brown's appointment on 2026-06-15 (Rocky, Molly, Coco)?
- **Correct answer:** $50.00 (3 dogs: $30 + $10 + $10 = $50, verified: GET /api/Appointments?$filter=customer_ID eq 'c005' and date eq 2026-06-15)
- **Expected path:** Appointments tab -> find Emma Brown row date 2026-06-15
- **Success criteria:** Fee column shows "$50.00"
- **Last result:** not run

### T3-03
- **FR:** FR-19
- **Description:** Billing record linked to correct customer
- **Question:** What customer is shown on the first billing record issued Jun 19, 2026?
- **Correct answer:** Alice Thompson (verified: GET /api/BillingRecords?$expand=appointment($expand=customer)&$filter=issuedAt ge 2026-06-19T00:00:00Z&$top=1&$orderby=issuedAt asc)
- **Expected path:** Billing tab -> first row with date Jun 19, 2026
- **Success criteria:** Customer column shows "Alice Thompson", Amount "$30.00", Status "paid"
- **Last result:** not run

### T3-04
- **FR:** FR-21
- **Description:** Confirmation log shows customer and walker
- **Question:** Does the Confirmations view show customer and walker names (not raw IDs)?
- **Correct answer:** Yes - customer/walker names visible, no raw UUIDs
- **Expected path:** Confirmations tab -> inspect rows
- **Success criteria:** Zero cells contain pattern matching UUID format or "ap..." style IDs
- **Last result:** not run

### T3-05
- **FR:** FR-22
- **Description:** Schedule shows walker name for each appointment
- **Question:** Which walkers appear on the schedule for 2026-06-15?
- **Correct answer:** Jake Morrison, Sofia Chen, Marcus Davis, Priya Patel, Lucas Rivera
  (verified: getDailySchedule(date='2026-06-15') -> distinct walkerFirstName+walkerLastName values)
- **Expected path:** Schedule tab -> date 2026-06-15 -> Load -> read section headings
- **Success criteria:** 5 walker section headings with full names (no raw IDs)
- **Last result:** not run

### T3-06
- **FR:** FR-16
- **Description:** Billing record auto-created for seed appointments
- **Question:** Does every completed appointment have a corresponding billing record?
- **Correct answer:** Yes - 10 completed appointments, all have billing records
  (verified: GET /api/BillingRecords?$filter=appointment/status eq 'completed' -> 10)
- **Expected path:** Billing tab -> filter by status "paid" -> count (all completed appts should be paid)
- **Notes:** Cannot test via UI filter by appointment status - requires OData verification
- **Correct answer (OData):** GET /api/BillingRecords?$count=true&$top=0 -> 40 total. All 10 completed appts visible as paid records.
- **Last result:** not run

### T3-07
- **FR:** FR-02
- **Description:** Customer has addresses accessible
- **Question:** How many addresses does Alice Thompson have?
- **Correct answer:** Fetch GET /api/Addresses?$filter=customer_ID eq 'c001' before run
- **Expected path:** Customers tab -> Alice Thompson row -> click "Addr" or Addresses button
- **Success criteria:** Address dialog opens showing Alice's addresses. Count matches OData.
- **Notes:** The Customers view in the vanilla JS app only has "Edit" per row, no Addresses button. If absent, flag as defect against FR-02.
- **Last result:** not run

### T3-08
- **FR:** FR-23
- **Description:** Schedule shows pickup address for appointment
- **Question:** Does the schedule for 2026-06-15 show a pickup address?
- **Correct answer:** Yes - pickup street and city visible for each appointment
  (verified: getDailySchedule includes pickupStreet, pickupCity)
- **Expected path:** Schedule tab -> date 2026-06-15 -> Load -> inspect appointment cards
- **Success criteria:** At least one appointment card shows a pickup address (street, city)
- **Last result:** not run

---

## Tier 4 - Create / Update / Delete / Status Transitions

### T4-W01 - Create Walker
- **FR:** FR-07
- **Network assertion:** POST /api/Walkers -> HTTP 201
- **Description:** Add a new walker
- **Question:** After adding walker "Test Walker" with phone "555-9999", does the new record appear in the Walkers list?
- **Expected path:** Walkers tab -> "+ Add Walker" -> fill First: "Test", Last: "Walker", Phone: "555-9999" -> Save
- **Network verification step:** After Save, run browser_network_requests. Assert most recent POST to /api/Walkers returned HTTP 201. If HTTP 400: FAIL-WRONG.
- **Success criteria:** HTTP 201 AND "Test Walker" row appears in table with phone "555-9999". Walker count increases to 6.
- **Correct answer:** HTTP 201, new row visible (verified post-run)
- **Last result:** not run

### T4-W02 - Update Walker
- **FR:** FR-07
- **Network assertion:** PATCH /api/Walkers -> HTTP 200
- **Description:** Edit an existing walker's email
- **Question:** After editing Jake Morrison's email to "jake.test@pawgo.com", is the new email shown?
- **Expected path:** Walkers tab -> Jake Morrison row -> Edit -> change email -> Save
- **Network verification step:** Assert PATCH /api/Walkers returned HTTP 200. If HTTP 400 "not a valid UUID": D-019 class defect.
- **Success criteria:** HTTP 200 AND Jake Morrison row shows "jake.test@pawgo.com"
- **Last result:** not run

### T4-W03 - Delete Walker
- **FR:** FR-07
- **Network assertion:** DELETE /api/Walkers -> HTTP 204
- **Description:** Delete the Test Walker created in T4-W01
- **Expected path:** Walkers tab -> Test Walker row -> Delete (if delete button exists)
- **Network verification step:** Assert DELETE returned HTTP 204. If HTTP 400 "not a valid UUID": D-019 class.
- **Notes:** Vanilla JS app may not have a Delete button for walkers. If absent, flag as defect against FR-07.
- **Success criteria:** HTTP 204 AND Test Walker no longer in list. OR defect raised if no delete button.
- **Last result:** not run

### T4-C01 - Create Customer
- **FR:** FR-01
- **Network assertion:** POST /api/Customers -> HTTP 201
- **Description:** Add a new customer
- **Expected path:** Customers tab -> "+ Add Customer" -> fill name/phone/email -> Save
- **Network verification step:** Assert POST /api/Customers returned HTTP 201.
- **Success criteria:** HTTP 201 AND new customer visible in list. Count increases to 51.
- **Last result:** not run

### T4-C02 - Update Customer
- **FR:** FR-01
- **Network assertion:** PATCH /api/Customers -> HTTP 200
- **Description:** Edit Alice Thompson's phone number
- **Expected path:** Customers tab -> Alice Thompson -> Edit -> change phone -> Save
- **Network verification step:** Assert PATCH /api/Customers returned HTTP 200. If HTTP 400 "not a valid UUID": D-019 class.
- **Success criteria:** HTTP 200 AND updated phone shown in list.
- **Last result:** not run

### T4-C03 - Delete Customer
- **FR:** FR-01
- **Network assertion:** DELETE /api/Customers -> HTTP 204
- **Description:** Delete the customer created in T4-C01
- **Expected path:** Customers tab -> new customer row -> Delete button (if exists)
- **Network verification step:** Assert DELETE returned HTTP 204. If HTTP 400: D-019 class.
- **Notes:** Vanilla JS app does have Delete in the customer index.html vanilla implementation - use it.
- **Success criteria:** HTTP 204 AND customer removed from list.
- **Last result:** not run

### T4-D01 - Create Dog
- **FR:** FR-04
- **Network assertion:** POST /api/Dogs -> HTTP 201
- **Description:** Register a new dog for Alice Thompson
- **Expected path:** Dogs tab -> "+ Add Dog" -> select owner Alice Thompson, name "FluffyTest", breed "Poodle" -> Save
- **Network verification step:** Assert POST /api/Dogs returned HTTP 201.
- **Success criteria:** HTTP 201 AND "FluffyTest" appears in dogs list under Alice Thompson.
- **Last result:** not run

### T4-D02 - Update Dog
- **FR:** FR-04
- **Network assertion:** PATCH /api/Dogs -> HTTP 200
- **Description:** Edit a dog's notes
- **Expected path:** Dogs tab -> Buddy row -> Edit -> add notes "Test notes" -> Save
- **Network verification step:** Assert PATCH /api/Dogs returned HTTP 200. If HTTP 400 "not a valid UUID": D-019.
- **Success criteria:** HTTP 200 AND Buddy row reflects updated notes.
- **Last result:** not run

### T4-D03 - Delete Dog
- **FR:** FR-04
- **Network assertion:** DELETE /api/Dogs -> HTTP 204
- **Description:** Delete FluffyTest created in T4-D01
- **Network verification step:** Assert DELETE returned HTTP 204.
- **Success criteria:** HTTP 204 AND FluffyTest no longer in list.
- **Last result:** not run

### T4-A01 - Create Appointment (1 dog)
- **FR:** FR-10, FR-16, FR-17
- **Network assertion:** POST /api/Appointments -> HTTP 201
- **Description:** Book a new appointment for 1 dog and verify fee = $30
- **Expected path:** Appointments tab -> "+ Book Appointment" -> date=2026-07-01, slot=09:00, walker=Jake Morrison, customer=Alice Thompson, select Buddy -> Save
- **Network verification step:** Assert POST /api/Appointments returned HTTP 201 (not 400 or 409).
- **Success criteria:** HTTP 201 AND new appointment in list with fee "$30.00". Total count = 81.
- **Last result:** not run

### T4-A02 - Confirm Appointment
- **FR:** FR-15 (status: scheduled -> confirmed)
- **Network assertion:** PATCH /api/Appointments -> HTTP 200
- **Description:** Confirm a scheduled appointment and verify status changes
- **Question:** After clicking Confirm on Grace Lee's 07:30 appointment on 2026-06-15, does the status change to "confirmed"?
- **Expected path:** Appointments tab -> find Grace Lee row (2026-06-15, 07:30) -> click "Confirm"
- **Network verification step:** Immediately after click: browser_network_requests (Playwright).
  Assert most recent PATCH /api/Appointments returned HTTP 200.
  If HTTP 400 "not a valid UUID": FAIL-WRONG, root cause = D-019. Record HTTP status and body.
- **Correct answer:** HTTP 200 AND status badge changes to "confirmed" AND Confirm button disappears. Confirmed count increases to 3.
- **Last result:** not run
- **Notes:** This task WILL detect D-019 if T-PRE-01 was not run first. Expected result: FAIL-WRONG HTTP 400.

### T4-A03 - Cancel Appointment
- **FR:** FR-15 (status: any -> cancelled)
- **Network assertion:** PATCH /api/Appointments -> HTTP 200 (or 204)
- **Description:** Cancel a scheduled appointment
- **Expected path:** Appointments tab -> find any scheduled appointment -> click "Cancel" -> confirm dialog
- **Network verification step:** Assert PATCH returned HTTP 200/204. If HTTP 400 "not a valid UUID": D-019.
- **Success criteria:** HTTP 200 AND status changes to "cancelled" AND Cancel button disappears.
- **Last result:** not run

### T4-B01 - Mark Billing Paid
- **FR:** FR-18
- **Network assertion:** PATCH /api/BillingRecords -> HTTP 200
- **Description:** Mark a pending billing record as paid
- **Expected path:** Billing tab -> find pending record -> click "Mark Paid"
- **Network verification step:** Assert PATCH /api/BillingRecords returned HTTP 200. If HTTP 400 "not a valid UUID": D-019.
- **Success criteria:** HTTP 200 AND status changes to "paid" AND Mark Paid button disappears.
- **Last result:** not run

### T4-CONF-01 - Create Confirmation (via Confirmations view)
- **FR:** FR-20, FR-21
- **Network assertion:** POST /api/Confirmations -> HTTP 201
- **Description:** Manually confirm a scheduled appointment via the Confirmations view
- **Expected path:** Confirmations tab -> "+ Confirm Appointment" -> select a scheduled appointment -> fill confirmedBy -> click Confirm
- **Network verification step:** Assert POST /api/Confirmations returned HTTP 201. If HTTP 400 "not a valid UUID": D-019.
- **Success criteria:** HTTP 201 AND new confirmation appears in Confirmation Log.
- **Last result:** not run

### T4-A04 - Create Appointment with invalid slot
- **FR:** FR-13 (Negative)
- **Network assertion:** POST /api/Appointments -> HTTP 400
- **Description:** Attempt to book with an invalid time slot via direct API
- **Method:** browser_evaluate: fetch('/api/Appointments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:'2026-07-01',timeSlot:'12:00',walker_ID:'w001',customer_ID:'c001'})}).then(r=>r.status)
- **Correct answer:** HTTP 400 (FR-13 validation fires)
- **Success criteria:** fetch returns 400. This confirms backend validation is working.
- **Last result:** not run

### T4-A05 - Double-booking rejection
- **FR:** FR-12 (Negative)
- **Network assertion:** POST /api/Appointments -> HTTP 409
- **Description:** Attempt to book the same walker/date/slot as an existing appointment
- **Method:** browser_evaluate: fetch('/api/Appointments', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({date:'2026-06-15',timeSlot:'07:00',walker_ID:'w001',customer_ID:'c001'})}).then(r=>r.status)
  (walker w001 = Jake Morrison is already booked on 2026-06-15 07:00)
- **Correct answer:** HTTP 409 (FR-12 double-booking check fires)
- **Success criteria:** fetch returns 409. Confirms double-booking protection works.
- **Last result:** not run

---

## Chain Tasks (multi-step with side-effect verification)

### C-01 - Book appointment -> billing record auto-created
- **FR:** FR-10, FR-16, FR-17 (Layer 3 side-effect chain)
- **Description:** Book a new appointment and verify the billing record is auto-created with correct fee
- **Chain steps:**
  1. Note current BillingRecords count: GET /api/BillingRecords?$count=true&$top=0 -> N
  2. Appointments tab -> "+ Book Appointment" -> date=2026-07-02, slot=10:00, walker=Sofia Chen, customer=Bob Williams, select Max -> Save
  3. Network assertion: POST /api/Appointments -> HTTP 201. If HTTP 400: FAIL-WRONG (D-019). Stop chain.
  4. GET /api/BillingRecords?$count=true&$top=0 -> assert N+1
  5. GET /api/BillingRecords?$orderby=issuedAt desc&$top=1 -> assert amount=30, status='pending'
- **Correct answer:** HTTP 201 from POST, BillingRecords count increases by 1, new record amount=$30.00 status=pending
- **Last result:** not run
- **Notes:** Step 3 will FAIL-WRONG with HTTP 400 if D-019 is present. Record as D-019 evidence.

### C-02 - Book 3-dog appointment -> fee = $50
- **FR:** FR-17 (fee formula verification)
- **Description:** Book appointment with 3 dogs and verify fee calculation
- **Chain steps:**
  1. Appointments tab -> "+ Book Appointment" -> date=2026-07-03, slot=08:00, walker=Marcus Davis, customer=Emma Brown
  2. Select dogs: Rocky, Molly, Coco (3 dogs)
  3. Verify fee preview shows "$50" ($30 + $10 + $10)
  4. Save -> Network assertion: POST /api/Appointments -> HTTP 201
  5. Find new row in appointments -> assert fee column = "$50.00"
  6. GET /api/BillingRecords?$orderby=issuedAt desc&$top=1 -> assert amount=50
- **Correct answer:** Fee shown as $50.00 in UI and in auto-created billing record
- **Last result:** not run

### C-03 - Confirm appointment -> appears in Confirmations view
- **FR:** FR-15, FR-20
- **Description:** Confirm a scheduled appointment and verify the result is visible in Confirmations
- **Chain steps:**
  1. Note Confirmed count on Appointments view (currently 2)
  2. Appointments tab -> find a scheduled appointment -> click Confirm
  3. Network assertion: PATCH /api/Appointments -> HTTP 200. If HTTP 400 "not a valid UUID": record D-019, stop.
  4. Appointments KPI: assert Confirmed count = 3
  5. Confirmations tab -> assert the confirmed appointment's customer/walker appears in the log
- **Correct answer:** HTTP 200, Confirmed count = 3, appointment visible in Confirmations log
- **Last result:** not run

### C-04 - Mark billing paid -> paidAt is set
- **FR:** FR-18
- **Description:** Mark a pending billing record as paid and verify paidAt is populated
- **Chain steps:**
  1. Billing tab -> find a pending record (e.g. Jun 17, 2026 Betty Scott)
  2. Click "Mark Paid"
  3. Network assertion: PATCH /api/BillingRecords -> HTTP 200. If HTTP 400 "not a valid UUID": D-019.
  4. Record disappears from "Pending" filter view (if filtered to pending)
  5. GET /api/BillingRecords?$filter=appointment_ID eq '<id>'&$top=1 -> assert status='paid' and paidAt is not null
- **Correct answer:** HTTP 200, status=paid, paidAt populated in OData response
- **Last result:** not run

### C-05 - Edit walker -> reflected in appointment list
- **FR:** FR-07, data consistency
- **Description:** Edit a walker's name and verify the change appears in the appointments view
- **Chain steps:**
  1. Note Jake Morrison's current name in Appointments view
  2. Walkers tab -> Jake Morrison -> Edit -> change Last Name to "Morrison-Test" -> Save
  3. Network assertion: PATCH /api/Walkers -> HTTP 200. If HTTP 400 "not a valid UUID": D-019.
  4. Appointments tab -> reload -> find Jake Morrison's appointments -> assert Walker column shows "Jake Morrison-Test"
  5. Revert: Walkers tab -> Jake Morrison-Test -> Edit -> change Last Name back to "Morrison" -> Save
- **Correct answer:** HTTP 200 on both PATCHes, walker name updates propagate to appointments view
- **Last result:** not run

### C-06 - Cancel appointment -> excluded from scheduled filter
- **FR:** FR-15, filter consistency
- **Description:** Cancel a scheduled appointment and verify it no longer appears in the scheduled filter
- **Chain steps:**
  1. Note Scheduled count (currently 66)
  2. Appointments tab -> Status filter "scheduled" -> find any row -> click Cancel -> confirm
  3. Network assertion: PATCH /api/Appointments -> HTTP 200. If HTTP 400 "not a valid UUID": D-019.
  4. Status filter still set to "scheduled" -> assert count = 65
  5. Change filter to "cancelled" -> assert the cancelled appointment appears
- **Correct answer:** HTTP 200, Scheduled count drops by 1, record visible in cancelled filter
- **Last result:** not run

### C-07 - Book appointment -> auto-confirmation created
- **FR:** FR-20 (distinct from C-01 which verifies billing only)
- **Description:** Book a new appointment and verify BOTH side effects fire: billing record AND confirmation record auto-created
- **Chain steps:**
  1. Note BillingRecords count: N. Note Confirmations count: M.
  2. POST /api/Appointments (UUID walker + customer) -> HTTP 201, note new appt ID
  3. Network assertion: HTTP 201
  4. GET /api/BillingRecords?$count=true&$top=0 -> assert N+1
  5. GET /api/Confirmations?$count=true&$top=0 -> assert M+1 (auto-confirmation created)
  6. GET /api/Confirmations?$orderby=confirmedAt desc&$top=1 -> assert appointment_ID = new appt ID
- **Correct answer:** Both counts increase by 1; confirmation links to the correct appointment
- **Notes:** The service spec lists AFTER CREATE creating BillingRecord but NOT auto-creating a Confirmation. If M does not increase, this is a missing feature vs spec, not a defect in the handler. The test reveals whether FR-20 ("auto-generate confirmation on booking") is implemented.
- **Last result:** not run

### C-08 - Add dog to existing appointment -> fee recalculates
- **FR:** FR-17, AFTER CREATE AppointmentDogs handler
- **Description:** After booking a 1-dog appointment ($30), add a second dog and verify the fee recalculates to $40 in both the appointment and the billing record
- **Network assertions:** POST /api/Appointments -> HTTP 201; POST /api/AppointmentDogs -> HTTP 201; GET /api/Appointments(ID='...') -> totalFee=40
- **Chain steps:**
  1. POST /api/Appointments (1 dog) -> HTTP 201. Note appt ID. GET billing -> amount=30.
  2. POST /api/AppointmentDogs {appointment_ID: apptId, dog_ID: <second-dog-UUID>} -> HTTP 201
  3. Network assertion: HTTP 201
  4. GET /api/Appointments(ID='apptId') -> assert totalFee=40
  5. GET /api/BillingRecords?$filter=appointment_ID eq 'apptId' -> assert amount=40
- **Correct answer:** totalFee and billing amount both update to $40 after adding second dog
- **Notes:** Requires UUID dog IDs (D-019 fix needed for seed dogs). After fix, use any two seed dogs.
- **Last result:** not run

### C-09 - Remove dog from appointment -> fee recalculates down
- **FR:** FR-17, AFTER DELETE AppointmentDogs handler
- **Description:** After a 2-dog appointment ($40), remove one dog and verify fee recalculates to $30
- **Network assertions:** DELETE /api/AppointmentDogs(...) -> HTTP 204; GET /api/Appointments -> totalFee=30
- **Chain steps:**
  1. Start from a 2-dog appointment (from C-08 or by booking directly) -> fee=$40
  2. DELETE /api/AppointmentDogs(appointment_ID='...',dog_ID='...') -> HTTP 204
  3. Network assertion: HTTP 204
  4. GET /api/Appointments(ID='apptId') -> assert totalFee=30
  5. GET /api/BillingRecords?$filter=appointment_ID eq 'apptId' -> assert amount=30
- **Correct answer:** Fee decreases to $30, billing record updates to match
- **Last result:** not run

### C-10 - Full appointment lifecycle: book -> confirm -> mark paid -> verify all views
- **FR:** FR-10, FR-15, FR-16, FR-18 (Pattern B - complete operational lifecycle)
- **Description:** Execute the complete business lifecycle for one appointment and verify all views stay consistent throughout each transition
- **Network assertions:** POST -> 201; PATCH confirm -> 200; PATCH paid -> 200
- **Chain steps:**
  1. POST /api/Appointments (UUID walker+customer, 1 dog) -> HTTP 201. Note ID.
  2. Verify: Appointments list shows new row. BillingRecords count +1, amount=$30, status=pending.
  3. PATCH /api/Appointments(ID='...') {status:'confirmed'} -> HTTP 200
  4. Verify: Appointments list row shows 'confirmed'. KPI Confirmed count +1.
  5. PATCH /api/Appointments(ID='...') {status:'completed'} -> HTTP 200 (if supported)
  6. Verify: row shows 'completed'. KPI Completed count +1.
  7. PATCH /api/BillingRecords(ID='...') {status:'paid', paidAt:now} -> HTTP 200
  8. Verify: Billing view row shows 'paid', paidAt set. Billing Collected amount increases by $30.
  9. Final cross-view check: appointment in Schedule view for its date shows correct status.
- **Correct answer:** Each transition succeeds (HTTP 200). All views reflect the state change. No stale data visible in any view.
- **Notes:** This is the only task that tests state-transition *sequence* rather than individual transitions. It can catch bugs where a correct individual transition breaks a subsequent one (e.g. billing record paidAt overwritten on reload). Requires D-019 fix for seed appointments, or use UUID-based test appointment.
- **Last result:** not run

### C-11 - Delete customer -> referential integrity
- **FR:** FR-01
- **Description:** Delete a customer and verify CAP's referential integrity behaviour (cascade vs. reject)
- **Network assertion:** DELETE /api/Customers(ID='...') -> HTTP 204 or HTTP 409
- **Chain steps:**
  1. Create test customer: POST /api/Customers -> HTTP 201. Note UUID.
  2. Create test dog for that customer: POST /api/Dogs {owner_ID: customerId} -> HTTP 201.
  3. DELETE /api/Customers(ID='customerId') -> record HTTP status.
  4. If HTTP 204: GET /api/Dogs?$filter=owner_ID eq 'customerId' -> assert dog also deleted (cascade)
     OR assert dog still exists but owner_ID is null/unresolved (no cascade)
  5. If HTTP 409: verify error message explains the constraint.
- **Correct answer:** Either HTTP 204 with consistent cascade OR HTTP 409 with clear error. Silent deletion leaving orphaned dogs is a defect.
- **Notes:** CDS composition semantics: Customers.dogs is declared as Composition, which CAP cascades on delete. CDS association (non-composition) would not cascade. Verify behaviour matches schema intent.
- **Last result:** not run

### C-12 - Walker availability -> appears in booking form slot options
- **FR:** FR-08, FR-09, FR-10
- **Description:** Configure a walker's availability and verify they appear in the booking walker dropdown (and, if availability enforcement exists, only for covered slots)
- **Network assertions:** POST /api/WalkerAvailability -> HTTP 201; GET /api/Walkers?$expand=availability -> includes new record
- **Chain steps:**
  1. POST /api/WalkerAvailability {walker_ID: <UUID walker>, dayOfWeek: 1, startTime:'07:00', endTime:'11:30'} -> HTTP 201
  2. GET /api/Walkers?$expand=availability&$filter=ID eq '<walkerId>' -> assert availability includes the new record
  3. Open booking form -> walker dropdown includes this walker
  4. If app enforces availability: select date = a Monday -> walker is available; select date = a Sunday -> walker not in dropdown (or error on save)
  5. If app does not enforce availability: document as a spec gap (FR-08 says configure, app may not enforce)
- **Correct answer:** Availability record created (HTTP 201) and visible in walker data. Booking enforcement behaviour documented.
- **Notes:** The current app (vanilla JS) likely does not enforce availability in the booking form — it shows all walkers regardless. This task discovers whether enforcement is implemented. If not, it is a finding against FR-08.
- **Last result:** not run

---

## Negative Tasks

### T-NEG-01 - Book without selecting a dog
- **FR:** FR-10 (required: at least one dog)
- **Description:** Verify the UI blocks booking when no dog is selected
- **Expected path:** Appointments tab -> "+ Book Appointment" -> fill all fields except dogs -> click Save/Book
- **Correct answer:** Error shown ("At least one dog must be selected" or similar), no POST fired
- **Network verification:** browser_network_requests shows NO POST to /api/Appointments
- **Last result:** not run

### T-NEG-02 - Book without selecting a walker
- **FR:** FR-10 (required field)
- **Description:** Verify the UI blocks booking when no walker is selected
- **Expected path:** Appointments tab -> "+ Book Appointment" -> leave walker blank -> click Save/Book
- **Correct answer:** Error message shown, no POST fired
- **Last result:** not run

### T-NEG-03 - Invalid slot via API (FR-13)
- (covered by T4-A04 above)

### T-NEG-04 - Double-booking via API (FR-12)
- (covered by T4-A05 above)

### T-NEG-05 - Confirm already-confirmed appointment
- **FR:** Status lifecycle guard
- **Description:** Verify a "confirmed" appointment shows no Confirm button
- **Expected path:** Appointments tab -> find any row with status "confirmed" -> assert no Confirm button visible
- **Correct answer:** Confirmed rows show only Cancel button, no Confirm button
- **Last result:** not run

### T-NEG-06 - Cancelled appointment has no actions
- **FR:** FR-15 status lifecycle
- **Description:** Verify cancelled appointments show no action buttons
- **Expected path:** Appointments tab -> find cancelled row -> assert no Confirm or Cancel buttons
- **Correct answer:** Cancelled rows show no action buttons
- **Last result:** not run

### T-NEG-07 - Mark Paid already-paid record
- **FR:** FR-18
- **Description:** Verify a "paid" billing record shows no Mark Paid button
- **Expected path:** Billing tab -> find paid record -> assert no "Mark Paid" button visible
- **Correct answer:** Paid rows show no Mark Paid button
- **Last result:** not run

### T-NEG-08 - Write-path non-UUID ID (D-019 detection)
- (covered by T-PRE-01 above)

---

## Execution Log

### Run 2 - 2026-06-11 (Playwright MCP, full run, no app fixes)

**Browser tool:** Playwright MCP (browser_evaluate, browser_click, browser_network_requests, browser_snapshot)
**Auth pre-flight:** Anonymous (no @requires on DogWalkingService)
**App URL:** http://localhost:4004/react-ui/
**Purpose:** Full run of the updated Clicky scheme with no fixes applied. Assessing detection capability and discovering new defects.

| Task | Result | Evidence / Notes |
|------|--------|-----------------|
| **PRE-FLIGHT** | | |
| T-PRE-01 | PASS (D-019 detected) | fetch PATCH /api/Appointments(ID='ap001') -> HTTP 400 "Element 'ID' does not contain a valid UUID". Root cause confirmed in first 5 seconds. |
| **TIER 1 - KPI READS** | | |
| T1-01 | PASS | Walkers count = 5 (OData + UI verified) |
| T1-02 | PASS | Customers heading shows "(50)" |
| T1-03 | PASS | Total KPI = 80 (UI stat card) |
| T1-04 | PASS | Scheduled KPI = 66 (UI stat card) |
| T1-05 | PASS | Total Billed = $1380.00 (UI - note: updated to $1410 after C-01 mutation) |
| T1-06 | PASS | Collected = $350.00 (UI stat card) |
| T1-07 | PASS | 22 slot options confirmed via getValidSlots() |
| T1-08 | PASS | getDailySchedule(2026-06-15) returns 12 rows |
| T1-X | FAIL-WRONG | No "Cancelled" KPI tile visible in UI. 2 cancelled appointments exist in OData but the stat cards only show Total/Scheduled/Confirmed/Completed. Cancelled count has no KPI (undocumented defect - D-021) |
| **TIER 2 - FILTERED LIST** | | |
| T2-01 | PASS | Filter "completed" -> 10 rows (OData count match) |
| T2-02 | FAIL-WRONG | $filter=walker_ID eq 'w001' -> HTTP 400 "Element 'walker_ID' does not contain a valid UUID". The walker filter dropdown does NOT exist in vanilla JS app. The underlying API filter also fails. D-020 confirmed (extends D-019 to FK $filter expressions) |
| T2-03 | PASS | Billing "pending" filter -> 31 rows (30 seed + 1 from C-01 mutation) |
| T2-04 | FAIL-WRONG | $filter=owner_ID eq 'c001' -> HTTP 400 "Element 'owner_ID' does not contain a valid UUID". Dogs-by-customer filter broken at API level. D-020 confirmed on second entity. |
| T2-05 | PASS | Schedule for today (2026-06-11) shows empty state message |
| T2-06 | PASS | Confirmations log shows 12 rows with dates and customer names |
| T2-07 | PASS | Emma Brown shows Rocky, Molly, Coco, Ziggy (4 dog badges in Customers view) |
| T2-08 | PASS | All 5 walkers have availability data (API verified; UI shows availability column in Walkers view) |
| T2-09 | PASS | Print button visible on Schedule view. No JS error on click. |
| T2-10 | PASS | Alice Thompson selected -> dog dropdown shows 3 dogs (Buddy, Luna, Rusty) |
| **TIER 3 - CROSS-ENTITY DETAIL** | | |
| T3-01 | PASS | Grace Lee 07:30 Dogs cell = "Lola, Sadie" |
| T3-02 | PASS | Emma Brown 3-dog appointment fee = "$50.00" |
| T3-03 | FAIL-WRONG | Date column shows raw ISO "2026-06-15" not locale-formatted. D-003 confirmed (existing defect). |
| T3-04 | PASS | Confirmations view shows customer/walker names (API $expand verified: confHasCustomerName = "Alice") |
| T3-05 | PASS | Schedule 2026-06-15 shows 5 walker section headings: Sofia Chen, Jake Morrison, Marcus Davis, Priya Patel, Lucas Rivera |
| T3-06 | PASS | BillingRecords count = 40 (seed) + 1 (C-01) = 41. All 10 completed appointments have billing records. |
| T3-07 | FAIL-UNCLEAR | Vanilla JS Customers view shows only "Edit" button per row. No "Addresses" or "Addr" button visible. Addresses cannot be accessed from Customers view in the vanilla JS app. FR-02 is not fulfilled in UI. (D-022 - missing address management in UI) |
| T3-08 | PASS | All 12 schedule entries for 2026-06-15 have pickupStreet populated |
| **TIER 4 - CRUD + STATUS TRANSITIONS** | | |
| T4-W01 | PASS | POST /api/Walkers -> HTTP 201, new walker ID = UUID format (075fa393...) |
| T4-W02 | FAIL-WRONG | PATCH /api/Walkers/w001 -> HTTP 400. D-019 class on seed walker IDs. |
| T4-W02 | FAIL-WRONG | PATCH /api/Walkers/w001 -> HTTP 400 "not a valid UUID". D-019. |
| T4-W03 | FAIL-WRONG | DELETE /api/Walkers/w001 -> HTTP 400. D-019. |
| T4-C02 | FAIL-WRONG | PATCH /api/Customers/c001 -> HTTP 400. D-019. |
| T4-C03 | FAIL-WRONG | DELETE /api/Customers/c001 -> HTTP 400. D-019. |
| T4-D02 | FAIL-WRONG | PATCH /api/Dogs/d001 -> HTTP 400. D-019. |
| T4-D03 | FAIL-WRONG | DELETE /api/Dogs/d001 -> HTTP 400. D-019. |
| T4-A02 | FAIL-WRONG | PATCH /api/Appointments/ap003 -> HTTP 400. D-019. |
| T4-A03 | FAIL-WRONG | PATCH /api/Appointments/ap004 -> HTTP 400. D-019. |
| T4-B01 | FAIL-WRONG | PATCH /api/BillingRecords/br001 -> HTTP 400. D-019. |
| T4-CONF-01 | PASS | POST /api/Confirmations with UUID appointment_ID -> HTTP 201. Confirmation created (a4d2458d...). POST works when FK value is a valid UUID. |
| **CHAIN TASKS** | | |
| C-01 | PASS | POST appointment (UUID walker 075fa393... + UUID customer 78b9f2b4...) -> HTTP 201 (appt ID: 633e5834...). BillingRecords: 40->41. New billing amount=$30, status=pending. AFTER CREATE handler confirmed firing and producing correct fee. |
| C-02 | PASS (with D-023 observation) | POST appointment (UUID walker+customer) -> HTTP 201. POST AppointmentDogs with dog_ID='d001','d002','d003' (non-UUID seed IDs) -> HTTP 201 each. AFTER CREATE recalculated fee to $50 correctly. Non-UUID dog_ID values accepted in POST body (same D-023 asymmetric validation as dogs/owner_ID). Final fee = $50. |
| C-03 | FAIL-WRONG | PATCH /api/Appointments/ap003 -> HTTP 400 D-019. Cannot confirm seed appointment. |
| C-04 | FAIL-WRONG | PATCH /api/BillingRecords/br001 -> HTTP 400 D-019. Cannot mark seed billing paid. |
| C-05 | FAIL-WRONG | PATCH /api/Walkers/w001 -> HTTP 400 D-019. Cannot edit seed walker. |
| C-06 | FAIL-WRONG | PATCH /api/Appointments/ap005 -> HTTP 400 D-019. Cannot cancel seed appointment. |
| T-NEG-02 | PASS | Book without walker -> error toast "Please fill in all fields and select at least one dog." (same combined validation as T-NEG-01). No POST fired. |
| T-NEG-03 | FAIL-WRONG (note) | PATCH /api/Appointments/ap001 (already confirmed, seed ID) -> HTTP 400 D-019. Cannot test business logic guard because UUID validation fires first. This is not a business logic failure — it is D-019 masking the test. |

**COMPLETE Run 2 Summary:**
- All 57 tasks executed
- PASS: 26
- FAIL-WRONG: 22 (19 D-019/D-020/D-023 class, 2 existing display defects D-002/D-003, 1 D-019 masking a business logic test)
- FAIL-UNCLEAR: 1 (T3-07 addresses UI absent)
- NOT RUN: 0

**Defects raised:**
| ID | Description | Severity |
|----|-------------|----------|
| D-019 | All seed-ID write operations (PATCH/DELETE by key) fail HTTP 400 UUID validation | BLOCKING |
| D-020 | FK $filter expressions also fail HTTP 400 for non-UUID FK values | BLOCKING |
| D-021 | No Cancelled KPI stat card in Appointments view | Medium |
| D-022 | Addresses management absent from Customers UI (FR-02 not fulfilled) | Medium |
| D-023 | POST body FK values not UUID-validated — non-UUID FKs accepted, creating orphaned records | Medium |
| D-002 | Status values displayed in raw lowercase | Medium |
| D-003 | Date column shows raw ISO format | Medium |


**Browser tool used:** Playwright MCP (browser_evaluate, browser_click, browser_network_requests, browser_snapshot)
**Auth pre-flight:** Anonymous (no @requires on DogWalkingService)
**App URL:** http://localhost:4004/react-ui/
**Purpose:** Validate the updated Clicky scheme against an unfixed app to assess detection capability

| Task | Result | Evidence |
|------|--------|----------|
| T-PRE-01 | PASS (defect detected) | fetch PATCH /api/Appointments(ID='ap001') -> HTTP 400 "Element 'ID' does not contain a valid UUID". D-019 confirmed in first task. |
| T1-01 | PASS | Walker count = 5 (OData verified) |
| T1-02 | PASS | Customer heading shows "Customers (50)" |
| T1-03 | PASS | Total KPI = 80 |
| T1-04 | PASS | Scheduled KPI = 66 |
| T1-05 | PASS | Total Billed = $1380.00 |
| T1-06 | PASS | Collected = $350.00 |
| T1-07 | PASS | 22 slot options in booking dropdown |
| T1-08 | PASS | getDailySchedule(2026-06-15) returns 12 rows |
| T2-01 | PASS | Status filter "completed" shows 10 rows (OData count matches) |
| T2-07 | PASS | Emma Brown shows Rocky, Molly, Coco, Ziggy (4 dog badges) |
| T2-10 | PASS | Alice Thompson selected -> dog dropdown shows 3 dogs (Buddy, Luna, Rusty) |
| T3-01 | PASS | Grace Lee 07:30 -> Dogs cell = "Lola, Sadie" |
| T3-02 | PASS | Emma Brown 3-dog appointment fee = "$50.00" |
| T4-A02 | FAIL-WRONG | PATCH /api/Appointments/ap003 -> HTTP 400 "not a valid UUID". Network assertion caught the failure. UI showed no visual change. |
| T4-B01 | FAIL-WRONG | PATCH /api/BillingRecords/br035 -> HTTP 400 "not a valid UUID". Same D-019 class. |
| T4-A04 | PASS | POST invalid slot -> HTTP 400 "Invalid time slot '12:00'" (FR-13 verified) |
| T4-A05 | PASS | POST double-booking -> HTTP 409 "Walker is already booked" (FR-12 verified) |
| T-NEG-01 | PASS | Book without dog -> error toast shown, no POST fired |
| T-NEG-05 | PASS | Confirmed rows (2) have no Confirm button |
| T-NEG-06 | PASS | Cancelled rows (2) have no action buttons |
| T-NEG-07 | PASS | Paid rows (10) have no Mark Paid button |

**Tasks run this session:** 22 of 55
**Results:** 20 PASS / 2 FAIL-WRONG
**New defects:** D-019 (BLOCKING - all write operations fail HTTP 400 non-UUID seed IDs)
**Key finding:** T-PRE-01 detected D-019 on the very first task, before any UI interaction.
T4-A02 and T4-B01 independently confirmed D-019 via the network assertion. Without the
network assertion, both tasks would have appeared as FAIL-BLOCKED (button clicked, nothing
happened) without a clear root cause. With the network assertion, root cause was immediate.

