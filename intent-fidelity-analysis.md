# Intent Fidelity Analysis: Paw & Go

**Date:** 2026-06-11
**Original intent prompt:** provided by user (not stored in project)
**Artefacts examined:**
- `intent.md` (derived intent document)
- `product-requirements-document.md` (derived PRD)
- `specification/dog-walking-cap/specification.md`
- `db/schema.cds`
- `srv/dog-walking-service.cds` and `dog-walking-service.js`
- `app/react-ui/index.html` (running UI)
- `db/data/*.csv` (seed data)

---

## 1. Original Intent - Structured Extraction

Parsing the original prompt into atomic requirements for comparison:

| Ref | Requirement | Category |
|-----|-------------|----------|
| OI-01 | CAP + UI project for a dog walking service | Architecture |
| OI-02 | Schedule: 7:00-11:30 and **13:00-19:00** in half-hour sessions | Scheduling |
| OI-03 | Customers: people with addresses (1 or more: billing, pickup) and contact info | Customer |
| OI-04 | Customers may have 1 or more dogs | Customer |
| OI-05 | Each dog: name | Dog |
| OI-06 | Each dog: friends (other dogs with which they may be walked) | Dog |
| OI-07 | Each dog: weight | Dog |
| OI-08 | Each dog: race | Dog |
| OI-09 | Each dog: date of birth | Dog |
| OI-10 | Each dog: color | Dog |
| OI-11 | Each dog: license number | Dog |
| OI-12 | Each dog: **preferred and typical time slots** | Dog |
| OI-13 | Appointment includes dogs, **pickup time** and location, **drop-off time** and location | Appointment |
| OI-14 | Manage schedule | App feature |
| OI-15 | Manage customers and their dogs | App feature |
| OI-16 | Create and manage appointments | App feature |
| OI-17 | Create and manage confirmations that **can be sent to customers** | Confirmation |
| OI-18 | Print view of schedule for a day | App feature |
| OI-19 | Multiple walkers: people with contact info | Walker |
| OI-20 | Walkers have **schedules and working times** to manage | Walker |
| OI-21 | Sample data: 50 customers, 5 walkers | Seed data |
| OI-22 | Sample customer may have 1 to 5 dogs | Seed data |
| OI-23 | Billing: $30 for one dog, $10 for each additional dog | Billing |
| OI-24 | Keep track of customer billing | Billing |

---

## 2. Layer 1 - Intent Document Fidelity (intent.md vs OI)

The derived `intent.md` captures the broad purpose correctly but drops or transforms several specific requirements.

| OI | Original intent | intent.md status | Gap |
|----|-----------------|-----------------|-----|
| OI-02 | PM slots end at **19:00** ("13:00 to 19:00") | States "13:00-18:30 PM (12 slots)" | **CHANGED** - end time reduced from 19:00 to 18:30. See Section 3. |
| OI-06 | Dog friends (other dogs to walk with) | Listed as "Mark dog-friend pairs (dogs that walk well together)" | Preserved correctly |
| OI-12 | Dog has **preferred and typical time slots** | **NOT MENTIONED** | **DROPPED** - no reference to per-dog preferred slots |
| OI-13 | Appointment includes **pickup TIME** and drop-off **TIME** | Not mentioned - only pickup/dropoff addresses implied | **DROPPED** - times assumed = timeSlot; no separate pickup/dropoff time fields |
| OI-17 | Confirmations **can be sent** to customers | Mentions "generate confirmation records" but not sending | **WEAKENED** - sending/delivery mechanism dropped |
| OI-20 | Walkers have **schedules and working times** to manage | States "Configure per-walker availability slots (day of week + time windows)" | Preserved (reasonable interpretation) |
| OI-22 | Customers may have 1 to **5** dogs | States "1 or more dogs" - drops the upper bound of 5 | **WEAKENED** - upper bound removed (though this may be intentional relaxation) |

---

## 3. Layer 2 - PRD Fidelity (product-requirements-document.md vs OI)

The PRD translates most intent into FR codes but introduces new gaps and confirms dropped items.

### 3.1 PM Slot Boundary: 19:00 vs 18:30

**Original intent:** "13:00 to 19:00" — the PM window ends at 19:00, implying the last slot starts at 18:30 (a 30-minute session ending at 19:00).

**PRD states:** FR-11 lists slots ending at 18:30. The comment is "last appointment starts 18:30, ends at 19:00."

**Verdict:** The slot list in the PRD (FR-11) and implementation is correct — "13:00 to 19:00" means the last session *ends* at 19:00, which means the last slot *starts* at 18:30. The intent.md description "13:00-18:30 PM" is slightly misleading (implies the window ends at 18:30) but the implementation has 18:30 as the last start time, which is correct. This is a **documentation precision issue** in intent.md, not an implementation error.

However, the WalkerAvailability seed data stores walker working times as `startTime:07:00, endTime:19:00` — which is consistent with a 19:00 session end. The code only validates that appointments fall within VALID_SLOTS, not within a specific walker's availability window. So walker availability data is stored correctly but never enforced.

### 3.2 Dog Preferred and Typical Time Slots (OI-12)

**Original intent:** Each dog has "preferred and typical time slots."

**PRD:** Not present. No FR covers per-dog time slot preferences.

**Schema:** Not present. The `Dogs` entity has name, breed, weight, color, dateOfBirth, licenseNo, notes. No slot fields.

**UI:** The dog edit form has no slot preference fields. The booking form does not pre-populate slot suggestions based on dog preferences.

**Verdict: DROPPED** - an explicit attribute from the original intent is absent from all derived artefacts and all implementation layers. This is the most complete omission in the project.

### 3.3 Appointment Pickup and Drop-off Times (OI-13)

**Original intent:** "An appointment...will include...the pickup time and location and the drop-off time and location."

The phrase "pickup time" is distinct from "time slot" — it suggests the scheduler records when the walker will actually arrive at the pickup address, which may differ from the scheduled slot start.

**PRD:** FR-10 states "Book appointments with: date, time slot, walker, customer, one or more dogs." No separate pickup or drop-off times.

**Schema:** `Appointments` has `timeSlot: String(5)` (a single slot). No `pickupTime` or `dropoffTime` fields. The `getDailySchedule` function returns `pickupStreet`/`pickupCity`/`dropoffStreet`/`dropoffCity` but no times beyond the single `timeSlot`.

**UI:** The booking form has Date, Time Slot, Walker, Customer, Pickup Address, Dropoff Address — no separate pickup or drop-off time fields.

**Verdict: AMBIGUOUS - likely intentional simplification.** The "pickup time" in the original intent most naturally means the scheduled time slot. The implementation models it as a single `timeSlot` per appointment (the start of the 30-minute session), which is reasonable. However, if the user intended separate pickup/dropoff times (e.g. walker picks up at 07:00 and drops off at 07:45 after a 30-minute walk plus travel), this is a gap. The PRD should have explicitly stated which interpretation was chosen.

### 3.4 Confirmation Delivery (OI-17)

**Original intent:** Confirmations "can be sent to customers."

**PRD:** FR-20 "Auto-generate confirmation on booking" and FR-21 "Display confirmation: number, sent-at timestamp, appointment details."

**Implementation:** `Confirmations` entity stores `confirmedAt`, `confirmedBy`, `method` (email/sms/phone), `notes`. There is no sending mechanism — no email API, no SMS integration. The `method` field records how a confirmation was communicated but does not trigger actual delivery.

**Seed data:** Confirmations have methods like 'email', 'sms', 'phone' and confirmedBy names, suggesting manual recording of confirmations rather than automated sending.

**Verdict: WEAKENED CORRECTLY** - actual delivery infrastructure (email/SMS API) is out of scope for a CAP prototype. The implementation correctly models the confirmation as a record to be managed, with method tracking. The key difference from the original intent is that the app records that a confirmation was sent but does not send it. This is a reasonable scope boundary but was not explicitly documented as such. The PRD should include a note: "Confirmation delivery (email/SMS) is out of scope; the app records confirmation details and method only."

### 3.5 Confirmation Number (OI-17 / FR-21)

**FR-21 states:** "Display confirmation: **number**, sent-at timestamp, appointment details."

**Schema:** `Confirmations` entity has ID (UUID), `appointment`, `confirmedAt`, `confirmedBy`, `method`, `notes`. No `confirmationNumber` or `number` field distinct from the system UUID.

**UI:** The Confirmations view shows Confirmed At, Customer, Walker, Method, Status. No confirmation number column.

**Verdict: GAP** - FR-21 explicitly requires a "confirmation number" (implying a human-readable reference number like "#CONF-2026-001") but the schema uses only the system UUID as identifier, which is never shown to users. The original intent implies the confirmation number would be communicated to the customer ("can be sent") as a reference. A UUID is not a suitable customer-facing reference number.

---

## 4. Layer 3 - Schema Fidelity (schema.cds vs OI)

### 4.1 Fields present correctly

| OI | Field | Schema | Status |
|----|-------|--------|--------|
| OI-05 | Dog name | `Dogs.name` | PASS |
| OI-06 | Dog friends | `DogFriends` entity | PASS |
| OI-07 | Dog weight | `Dogs.weight: Decimal(5,1)` | PASS |
| OI-08 | Dog race | `Dogs.breed: String(100)` | NOTE: "race" -> "breed" (see 4.3) |
| OI-09 | Dog date of birth | `Dogs.dateOfBirth: Date` | PASS |
| OI-10 | Dog color | `Dogs.color: String(50)` | PASS |
| OI-11 | Dog license number | `Dogs.licenseNo: String(30)` | PASS |
| OI-03 | Customer addresses (billing, pickup) | `Addresses.type: String(20)` with billing/pickup/dropoff | PASS |
| OI-19 | Walker contact info | `Walkers.phone`, `.email` | PASS |
| OI-20 | Walker working times | `WalkerAvailability` entity | PASS |
| OI-23 | Billing tracking | `BillingRecords` entity | PASS |

### 4.2 Fields absent from schema

| OI | Requirement | Schema status | Impact |
|----|-------------|---------------|--------|
| OI-12 | Dog preferred/typical time slots | **ABSENT** | Cannot surface preferred slots in booking form |
| OI-13 (if separate times) | Appointment pickupTime, dropoffTime | **ABSENT** | Only single timeSlot per appointment |
| OI-17 | Confirmation number (human-readable) | **ABSENT** - only UUID ID | Cannot give customer a readable reference |

### 4.3 Terminology changes

| Original term | Derived term | Notes |
|--------------|-------------|-------|
| "race" | "breed" | Correct domain normalisation — "breed" is the standard English term for dog variety |
| "address (billing, pickup)" | Address.type = 'billing' / 'pickup' / 'dropoff' | Added 'dropoff' type - reasonable extension |
| "confirmations that can be sent" | Confirmations entity with method field | Delivery dropped, record-keeping retained |

### 4.4 Address types - seed data discrepancy

**Original intent:** Customer addresses include "billing, pickup addresses" (plural "addresses").

**Seed data distribution:**
- billing: 50 rows (1 per customer)
- pickup: 50 rows (1 per customer)
- dropoff: **1 row only**

The intent implies customers would have multiple address types. The seed data gives every customer exactly one billing and one pickup address, which is consistent with the intent. However, `dropoff` addresses appear only once — suggesting the seed data generator simplified the dropoff scenario. In practice, the booking form treats dropoff as optional (defaults to same as pickup), which is a reasonable simplification not stated in the original intent.

---

## 5. Layer 4 - Business Logic Fidelity (service.js vs OI)

### 5.1 Slot boundary: correctly implemented

The PM slot loop runs `for (let h = 13; h <= 18; h++)` generating slots 13:00 through 18:30. This correctly produces a last slot starting at 18:30 (ending at 19:00), matching the "13:00 to 19:00" window from the original intent.

**PASS** - the implementation is correct despite the intent.md description being slightly imprecise.

### 5.2 Billing formula: correctly implemented

OI-23: "$30 for one dog, $10 for each additional dog" -> `fee = 30 + (dogCount - 1) * 10`.

Implementation uses this formula in both the AFTER CREATE Appointments handler and the AFTER CREATE/DELETE AppointmentDogs handler. **PASS.**

### 5.3 Walker availability: stored but not enforced

OI-20: Walkers have schedules and working times "to manage."

The `WalkerAvailability` entity correctly stores per-walker day/time windows. However the booking form shows **all walkers in the dropdown regardless of availability or the selected date/time**. No code checks whether the selected walker is available on the requested day and time before accepting a booking.

**Status: PARTIAL** - data is modelled correctly but the business rule ("walkers have working times") is not enforced at booking time. This is a functional gap: a user can book a walker for a day they are not scheduled to work.

### 5.4 Auto-confirmation on booking: not implemented

**Original intent:** Confirmations "can be sent to customers."
**PRD FR-20:** "Auto-generate confirmation on booking with unique confirmation number."

**Implementation:** The AFTER CREATE Appointments handler creates a BillingRecord automatically. It does **not** create a Confirmation record. Confirmations are created only through manual UI interaction (Confirmations view -> "+ Confirm Appointment").

**Status: GAP** - FR-20 ("auto-generate confirmation on booking") is not implemented. The AFTER CREATE handler creates billing but not confirmation. The chain task C-07 (added in Clicky) would catch this.

### 5.5 Double-booking: correctly implemented

FR-12: BEFORE CREATE checks for same walker + date + slot. **PASS.**

---

## 6. Layer 5 - UI Fidelity (index.html vs OI)

### 6.1 Views present

| OI | Required feature | UI view | Status |
|----|-----------------|---------|--------|
| OI-14 | Manage schedule | Schedule tab | PASS |
| OI-15 | Manage customers | Customers tab | PASS |
| OI-15 | Manage dogs | Dogs tab | PASS |
| OI-16 | Create/manage appointments | Appointments tab | PASS |
| OI-17 | Manage confirmations | Confirmations tab | PASS |
| OI-18 | Print schedule | Print button on Schedule | PASS |
| OI-19/OI-20 | Manage walkers | Walkers tab | PASS |
| OI-24 | Track billing | Billing tab | PASS |

### 6.2 Dog management gaps

The dog edit form provides: Name, Breed, Color, Weight, Date of Birth, License No, Notes, Owner.

Missing from the form:
- **No preferred/typical time slots** (OI-12) - field does not exist
- No dog friends management in the dog edit form (DogFriends data exists in seed but no UI to manage it)

**DogFriends UI status:** The Customers view shows dog badges for each customer's dogs, but there is no UI to create, view, or delete DogFriend relationships. This is a functional gap against OI-06 ("dogs can be walked with friends") - the data model supports it but the UI does not expose it.

### 6.3 Appointment form gaps

The booking form provides: Date, Time Slot, Walker, Customer, Pickup Address, Dropoff Address, Status, Notes, Dogs selector.

Missing from the form:
- No separate pickup time or drop-off time fields (per OI-13 interpretation)
- The dogs selector shows customer dogs but does not indicate dog friendships (OI-06) to guide walker in grouping compatible dogs

### 6.4 Confirmation number not shown

The Confirmations view shows: Confirmed At, Customer, Walker, Method, Status.

No "Confirmation Number" is shown. Since no such field exists in the schema (only the UUID ID), this cannot be shown. But FR-21 explicitly requires it.

### 6.5 Walkers view: availability shown but not manageable

The Walkers view shows availability for each walker (days and time windows). However, there is no UI to add, edit, or delete availability records. The Edit Walker modal only allows editing name, phone, email, and active status — no availability management. The availability data in seed CSV is static.

**Status: READ-ONLY** - walker availability is displayed but cannot be managed through the UI, violating OI-20 ("schedules and working times I need to manage").

### 6.6 Schedule view: walker grouping is correct but limited

The print view groups appointments by walker for the day. OI-18 says "print view of the schedule for a day." The implementation groups by walker and shows time slot, customer name, dog names, fee, status.

**What is missing:** The original intent mentions "pickup time and location and the drop-off time and location" in the context of an appointment. The schedule print view shows `pickupStreet` / `pickupCity` but not `dropoffStreet` / `dropoffCity` in the visual cards (though both are in the `getDailySchedule` API response). The UI only renders: `customerName - dogNames`, `Fee: $X [status badge]`. Pickup and dropoff addresses are not displayed in the schedule card.

---

## 7. Layer 6 - Seed Data Fidelity

| OI | Requirement | Seed data | Status |
|----|-------------|-----------|--------|
| OI-21 | 50 customers | 50 customers | PASS |
| OI-21 | 5 walkers | 5 walkers | PASS |
| OI-22 | 1 to 5 dogs per customer | Max 4 dogs (c005/Emma Brown). 31 customers have 1 dog, 14 have 2, 5 have 3+. No customer has 5. | PARTIAL - upper bound of 5 not reached |
| OI-06 | Dog friends | 34 DogFriend pairs | PASS |
| OI-12 | Dog preferred slots | Not in Dogs CSV | GAP |

---

## 8. Summary: Gaps by Severity

### Blocking functional gaps (not present at any layer)

| ID | Original intent | Dropped at | Impact |
|----|----------------|-----------|--------|
| G-01 | Dog preferred and typical time slots (OI-12) | intent.md | No per-dog scheduling preference. Cannot suggest optimal slots for a dog. A key differentiator for a real service. |
| G-02 | Confirmation number (human-readable reference, OI-17 / FR-21) | Schema | FR-21 explicitly requires it but it was never implemented. Customer has no readable reference for their confirmation. |
| G-03 | Auto-generate confirmation on booking (FR-20) | service.js | AFTER CREATE creates billing but not confirmation. Manual confirmation only. |
| G-04 | Dog friends management UI (OI-06) | UI | DogFriends data model exists and seed data has 34 pairs, but no UI to manage or view them. |
| G-05 | Walker availability management UI (OI-20) | UI | Availability is readable but not editable through the UI. |

### Functional gaps - business logic not enforced

| ID | Original intent | Implemented | Not enforced |
|----|----------------|------------|-------------|
| G-06 | Walker working times restrict bookings (OI-20) | WalkerAvailability stored | Not checked at booking time - any walker can be booked for any slot on any day |

### Interpretation changes - reasonable but undocumented

| ID | Original | Derived | Notes |
|----|----------|---------|-------|
| G-07 | "pickup time and drop-off time" (OI-13) | Single `timeSlot` | Reasonable simplification - 30 min session, one slot. Should be noted in PRD as a deliberate scope decision. |
| G-08 | Confirmations "can be sent" (OI-17) | Stored only, not sent | Out-of-scope for prototype. Should be documented as a known omission. |
| G-09 | "race" (OI-08) | "breed" | Correct domain term change. Not a gap. |

### Documentation precision issues

| ID | Issue |
|----|-------|
| G-10 | intent.md describes PM slots as "13:00-18:30" which implies the window closes at 18:30. Original intent says "to 19:00". The implementation is correct (18:30 is the last start time, ending at 19:00) but intent.md is misleading. |
| G-11 | Seed data has only 1 dropoff address type vs 50 pickup and 50 billing addresses. The intent says customers have pickup addresses (plural). The booking form defaults dropoff = pickup, which is practical but undocumented. |

---

## 9. Schedule Print View: Address Missing

A specific finding worth highlighting separately: the intent says the appointment shows "the pickup time and location and the drop-off time and location." The `getDailySchedule` API correctly returns `pickupStreet`, `pickupCity`, `dropoffStreet`, `dropoffCity`. However, the UI schedule cards only show:

```
[timeSlot]  CustomerName - dogNames
            Fee: $X  [status]
```

Neither the pickup nor the dropoff address is rendered in the schedule card. A walker looking at the print schedule cannot see where to go for each appointment. This is a direct functional miss of OI-13 ("pickup location") and OI-18 (the print schedule should enable a walker to do their day's work).

**Status: BLOCKING for practical use.** A dog walker using this print schedule cannot determine the pickup address from the printed output.

---

## 10. Where This Check Belongs: Facet, SV Check, or Interactive Task?

### 10.1 The core distinction

This analysis revealed gaps that fall into two structurally different categories:

**Category I — Prompt-independent gaps** (traceable from project documents alone, no original prompt needed):

| Gap | Traceable from | Why prompt not needed |
|-----|---------------|----------------------|
| G-02: confirmation number absent | FR-21 in PRD says "number"; schema has no such field | PRD contradicts schema |
| G-03: auto-confirmation not implemented | FR-20 in PRD says auto-generate; service.js has no handler | PRD contradicts service code |
| G-04: DogFriends no UI | Schema has entity; UI has no view or form for it | Schema contradicts UI |
| G-05: walker availability read-only | intent.md says "manage"; UI only displays | intent.md contradicts UI |
| G-06: availability not enforced at booking | WalkerAvailability stored; BEFORE CREATE doesn't check it | Schema data contradicts handler behaviour |
| Print schedule: addresses not shown | getDailySchedule returns pickupStreet/City; UI template doesn't render them | API return value contradicts UI rendering |

These are **artefact-to-artefact inconsistencies**. They are mechanically detectable by reading the project documents and code — no user input required.

**Category II — Prompt-dependent gaps** (only detectable with the original prompt):

| Gap | Why prompt needed |
|-----|-----------------|
| G-01: dog preferred/typical slots | Absent from intent.md; can only know it was dropped by comparing to the original prompt |
| G-07: "pickup time" interpretation | Only the user knows whether they meant a separate time or a reuse of timeSlot |
| G-08: confirmation sending | Only the user knows whether prototype-only is acceptable |

These require the original prompt or a user statement of intent. No static check can detect them independently.

### 10.2 Recommendation: two separate mechanisms

**Mechanism A — SV-10: Artefact Consistency Check (new static check in validation.md)**

Add as SV-10, run alongside the existing SV-0 through SV-9 checks. Prompt-independent, fully automated, no browser required. Applicable to all projects regardless of whether the original prompt is available.

The check traces every named requirement in the PRD (FR-NN items) and every entity/feature in intent.md down through schema, service handlers, and UI, looking for the "dropped downstream" pattern. Specifically:

```
For each FR in product-requirements-document.md:
  1. Find the corresponding entity/field/handler in schema.cds or service.js
  2. Find the corresponding UI element in the app source
  3. If any layer is absent: FAIL - requirement present in PRD but not implemented

For each entity in the schema:
  1. Find the corresponding view or form in the UI source
  2. If absent: note as possible UI gap (may be intentional, flag for review)

For each Composition handler in service.js (AFTER CREATE/UPDATE):
  1. Identify what side effect it creates
  2. Verify the side effect entity is populated in seed data or testable via API
  3. Verify the side effect is visible in the relevant UI view

For each "manage" or "configure" verb in intent.md:
  1. Verify there is a UI form/modal that supports create AND update for that entity
  2. If read-only: FAIL-PARTIAL
```

This check would have caught G-02, G-03, G-04, G-05, G-06, and the print schedule address gap — all without needing the original prompt. These represent the majority of the meaningful findings from this analysis.

**Why SV and not a Facet:**
SV checks run before browser testing. They are static, fast, and mechanical. Facets are post-generation browser-based audits after the app is functionally verified. Artefact consistency is more naturally a pre-runtime check — if FR-20 is not implemented in service.js, there is no point testing it in the browser.

---

**Mechanism B — Interactive intent review task (skill task, user-initiated)**

This is for Category II gaps — comparing the implementation against the original user intent that Joule may have simplified or misinterpreted. It is explicitly not a facet or an SV check because:

1. It requires external input (the original prompt) that the skill cannot obtain autonomously
2. The "correct" answer to questions like "was the pickup time simplification acceptable?" requires human judgment
3. In the JS context, this conversation happens naturally in the chat — the user notices something missing and raises it

The appropriate form is a skill task definition that the agent executes when the user initiates it:

```
Task: Review implementation against original intent prompt

Trigger: User provides original prompt OR says "I want to check what was missed
         from my original requirements"

Steps:
1. Parse the provided prompt into atomic requirements (OI-NN items)
   - Every noun + its properties
   - Every verb (user action or system behaviour)
   - Every constraint (rule, limit, formula)

2. For each OI item, trace through the artefact chain:
   intent.md -> PRD -> spec -> schema -> service -> UI
   Record the first layer at which the item is absent or changed.

3. Classify each finding:
   DROPPED:       present in prompt, absent from intent.md
   WEAKENED:      scope reduced without documentation
   CHANGED:       interpretation altered (may be correct - flag for user confirmation)
   NOT-ENFORCED:  data model exists but business rule not applied at runtime
   UNDOCUMENTED:  correct implementation, incorrect description in a derived doc

4. Present findings to user grouped by classification.
   For each DROPPED/WEAKENED: ask "Was this intentional? Should it be implemented?"
   For each CHANGED: ask "Is this interpretation correct?"
   For each NOT-ENFORCED: ask "Should this rule be enforced at booking/save time?"

5. For items the user confirms as gaps: raise defects and add to backlog.
   For items the user confirms as intentional: add a note to specification.md.
```

**Why not a facet:** Facets are autonomous agent-run audits. This task requires a conversation with the user to resolve ambiguities. It is more like a requirements review session than a technical audit. In the JS context the user would drive this interactively in the chat, which is the most natural form for it.

### 10.3 Where the original prompt should be stored (JS projects)

For [JS] and [JS-LOCAL] projects, the original prompt is entered by the user into Joule Studio's chat interface. It is currently not persisted in any project file — it exists only in the chat session.

**Proposed:** For any project generated in JS, the first task after project creation should be:

```
Write the original intent prompt verbatim to:
  specification/original-intent.md

This file:
- Is committed to the repository alongside intent.md and the PRD
- Is never auto-generated or modified by the build pipeline
- Serves as the ground truth for intent fidelity checks
- Is read during SV-10 and the interactive intent review task
```

This preserves the original prompt across sessions, makes it available for the prompt-independent SV-10 check to use as additional context, and enables the interactive review without requiring the user to re-paste the prompt in a new session.

---

## 11. Summary and Skill Change Proposals

### Changes to validation.md

**Add SV-10: Artefact Consistency Check**

```
### SV-10: Artefact-to-artefact consistency

For each FR in product-requirements-document.md:
  - [ ] The FR has a corresponding entity/field in schema.cds OR a handler in service.js
        AND a corresponding UI element (view, form field, or button)
  - [ ] If entity exists in schema but has no UI form: flagged as potential UI gap

For each "manage" verb in intent.md referring to an entity:
  - [ ] A Create form AND an Update form exist in the UI for that entity
  - [ ] Read-only display without edit capability is FAIL-PARTIAL

For each AFTER CREATE/DELETE handler in service.js:
  - [ ] The side effect entity is accessible in a UI view
  - [ ] The side effect value matches the spec formula

For each function (e.g. getDailySchedule) that returns fields:
  - [ ] Every returned field is rendered in the corresponding UI view
  - [ ] Fields present in the API response but absent from the UI are flagged

For each entity with a Composition relationship in schema.cds:
  - [ ] The child entity has a UI to create and manage child records
  - [ ] OR the absence is explicitly noted as intentional in specification.md
```

**Why this is SV and not a Facet:** Static, prompt-independent, runs before browser testing. If a FR is not implemented, there is no point testing it dynamically.

### Changes to SKILL.md

**Add task: Review implementation against original intent prompt**

Task trigger: user provides original prompt or asks "what did Joule miss from my requirements?"

Steps: parse OI items -> trace each through artefact chain -> classify (DROPPED/WEAKENED/CHANGED/NOT-ENFORCED/UNDOCUMENTED) -> present to user for confirmation -> raise defects or document intentional decisions.

**Add to [JS] project setup:** write original intent prompt to `specification/original-intent.md` immediately after project creation.

### Applicable to all projects, not just JS

SV-10 is prompt-independent and applicable to any CAP project with a PRD. The artefact-to-artefact consistency check makes no assumptions about Joule Studio — it reads existing project documents. The interactive intent review task is more valuable for JS projects where Joule generates all artefacts autonomously, but can be used on any project where the user has a verbal statement of requirements to compare against.

