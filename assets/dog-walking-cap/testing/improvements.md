# Improvement Catalogue - Paw & Go

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**Source:** ST Run 1 — Activity 6 (improvement catalogue)

This catalogue records code quality improvements, performance hints, and UX enhancements that are not blocking defects. Items are tagged: `[perf]` performance, `[quality]` code quality, `[ux]` user experience, `[security]` security hardening.

---

## I-01 — Fee computation duplicated in two handler locations [quality]

**File:** `srv/dog-walking-service.js`  
**Lines:** AFTER CREATE handler (~line 48) and AppointmentDogs AFTER CREATE/DELETE handler (~line 120)

**Issue:**  
The fee formula `30 + (dogCount - 1) * 10` is written out in two separate places. If the business rules change (e.g. base price increases to $35), two code locations must be updated in sync.

**Recommendation:**  
Extract to a named constant or helper function at the top of the file:
```js
const computeFee = dogCount => 30 + (Math.max(dogCount, 1) - 1) * 10;
```
Both handlers call `computeFee(dogCount)`. Unit tests already cover 1/2/3/5 dogs — they will immediately catch any regression.

**Effort:** ~5 minutes

---

## I-02 — getDailySchedule loads all entities regardless of date [perf]

**File:** `srv/dog-walking-service.js` — `getDailySchedule` handler

**Issue:**  
The handler fetches ALL Walkers, Customers, Addresses, AppointmentDogs, and Dogs from the database into memory regardless of the query date. For large datasets this is wasteful. Only Appointments are filtered by date; the other entities are fetched in full for the in-memory join.

**Recommendation:**  
After fetching appointments for the date, collect the relevant IDs and add `WHERE IN (...)` clauses to the other selects:
```js
const apptIds     = appointments.map(a => a.ID);
const walkerIds   = [...new Set(appointments.map(a => a.walker_ID))];
const customerIds = [...new Set(appointments.map(a => a.customer_ID))];
// Filter dogs, addresses, apptDogs by apptIds/walkerIds/customerIds
```
This reduces DB read volume proportionally to the fraction of entities active on a given date.

**Effort:** ~20 minutes (plus updating unit tests if they mock the DB)

---

## I-03 — No `@readonly` annotation on `BillingRecords.amount` [security]

**File:** `srv/dog-walking-service.cds`

**Issue:**  
`BillingRecords` is exposed in the service without any field-level access restriction. A client could send `PATCH /api/BillingRecords/{ID}` with `{ amount: 0 }` and reduce a billing amount to zero without going through the appointment/dog-count calculation.

**Recommendation:**  
Either annotate `amount` as readonly:
```cds
entity BillingRecords as projection on db.BillingRecords {
  *,
  @readonly amount
}
```
Or restrict PATCH to only `status`, `method`, and `paidAt` fields using CAP's `@insertonly`/`@updateonly` annotations, or a BEFORE UPDATE handler that rejects changes to `amount`.

**Effort:** ~10 minutes

---

## I-04 — Walker email uniqueness not enforced at CDS model level [quality]

**File:** `db/schema.cds` — Walkers entity

**Issue:**  
Two walker records with the same email address can be created without error. The CDS model has no `@assert.unique` or `unique` constraint on `email`. This can cause confusion when looking up walkers by email.

**Recommendation:**  
Add a unique constraint annotation:
```cds
entity Walkers : cuid, managed {
  @assert.unique: [{email}]
  firstName : String(50);
  ...
  email     : String(100);
}
```

**Effort:** ~5 minutes

---

## I-05 — No explicit index on `Appointments.date` [perf]

**File:** `db/schema.cds` — Appointments entity

**Issue:**  
`getDailySchedule` filters appointments by `date`. SQLite will perform a full table scan if there is no index. For 80 seed rows this is negligible, but for production use (thousands of appointments per year) a date index is important.

**Recommendation:**  
```cds
entity Appointments : cuid, managed {
  @(assert.range: true)
  date       : Date;   // Consider adding CDS index annotation when supported
  ...
}
```
For SQLite/HANA, add a native SQL index via a `db/src/` migration script:
```sql
CREATE INDEX IF NOT EXISTS IDX_APPT_DATE ON DOG_WALKING_APPOINTMENTS(DATE);
```

**Effort:** ~10 minutes + db migration setup

---

## I-06 — Appointment booking form: no walker availability filter [ux]

**File:** `app/react-ui/index.html` — appointment form walker dropdown

**Issue:**  
The walker dropdown in the appointment booking form shows all 5 walkers regardless of the selected day of week. If Walker A is only available Mon–Wed, they still appear as a booking option for Saturday, leading to bookings that the walker cannot fulfil.

**Recommendation:**  
When the user selects a date in the booking form, filter the walker dropdown to only show walkers whose `WalkerAvailability` includes that day of week. Requires fetching `/api/WalkerAvailability` and doing a client-side filter on `dayOfWeek` matching the selected date's `getDay()`.

This improvement is linked to D-08 (walker availability UI). Resolving D-08 naturally provides the data needed for this filter.

**Effort:** ~30 minutes (after D-08 fix provides availability data)

---

## I-07 — No loading state on API calls [ux]

**File:** `app/react-ui/index.html` — all view render functions

**Issue:**  
API fetch calls have no loading indicator. On slow connections the view appears blank until the fetch resolves. Users may click "refresh" or "load" multiple times, causing redundant requests.

**Recommendation:**  
Add a simple spinner pattern:
```js
function showLoading(containerId) {
  document.getElementById(containerId).innerHTML = '<div class="loading">Loading…</div>';
}
```
Call before fetch; replace with actual content after promise resolves.

**Effort:** ~15 minutes

---

## I-08 — Schedule date picker defaults to today but doesn't highlight today [ux]

**File:** `app/react-ui/index.html` — Schedule view

**Issue:**  
The date picker in the Schedule view defaults to `new Date().toISOString().split('T')[0]` (today), which is correct. However, the date input does not visually highlight weekends differently, and there is no "Today" quick-link button to reset to the current date after navigating to a different day.

**Recommendation:**  
Add a "Today" button next to the date picker that sets the input value to today and re-fetches the schedule. Low cost, high usability benefit for the daily use case.

**Effort:** ~10 minutes
