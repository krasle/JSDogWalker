# Static Testing Results — Iteration 2

## Iteration 2 Summary (all defects fixed)

| Check | Result |
|-------|--------|
| Unit tests (18/18) | ✅ PASS |
| UUID seed data (D-06) | ✅ FIXED — PATCH returns 200 |
| Auto-confirmation (D-07) | ✅ FIXED — confirmed in API test |
| Walker availability UI (D-08) | ✅ FIXED — sub-section in modal |
| Dog-friend UI (D-09) | ✅ FIXED — Friends modal |
| Customer address UI (D-10) | ✅ FIXED — Addresses sub-section |
| Schedule addresses (D-11) | ✅ FIXED — pickup/dropoff rendered |
| Complete button (D-12) | ✅ FIXED |
| Print CSS (D-13) | ✅ FIXED |
| Spec doc size→weight (D-14) | ✅ FIXED |
| Walker bio field (D-15) | ✅ FIXED |
| Conf # surfaced (D-16) | ✅ FIXED |
| All 19 API verification checks | ✅ 19/19 PASS |

---

# Static Testing Results — Iteration 1 (original) - Paw & Go

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**Run count:** 1
**Environment:** Sandbox (no browser MCP); CDS v9.9.1 on Node.js v25.9.0; SQLite in-memory

---

## ST Run 1 — 2026-06-11

### ST-0: Unit tests (code gate)

**Command:** `cd assets/dog-walking-cap && node test/run-tests.js`

```
Billing - fee calculation
  ✓ 1 dog = $30
  ✓ 2 dogs = $40
  ✓ 3 dogs = $50
  ✓ 5 dogs = $70

Valid time slots
  ✓ 22 valid slots
  ✓ starts at 07:00
  ✓ includes 11:30
  ✓ includes 13:00
  ✓ ends at 18:30
  ✓ no 12:00 (lunch)
  ✓ no 19:00 (after last)
  ✓ no 06:30 (before open)

Scheduling validation
  ✓ 07:00 valid
  ✓ 11:30 valid
  ✓ 18:30 valid
  ✓ 12:00 invalid
  ✓ 19:00 invalid
  ✓ 06:30 invalid

  18 passed, 0 failed
```

**Result: ✅ 18/18 PASS**

---

### ST-1: CDS model compilation

**Command:** `cds compile db/schema.cds`

Entities compiled successfully: Walkers, WalkerAvailability, Customers, Addresses, Dogs, DogFriends, Appointments, AppointmentDogs, Confirmations, BillingRecords.

**Result: ✅ PASS** — No CDS parse errors; self-referential back-link on Dogs removed to fix earlier parse error.

---

### ST-2: Service definition compilation

**Command:** `cds compile srv/dog-walking-service.cds`

All entity projections, `getValidSlots()` function, and `getDailySchedule(date:Date)` function compiled cleanly.

**Result: ✅ PASS**

---

### ST-3: Server startup and CSV seed data load

**Observed from CDS watch output:**

```
[cds] - loaded model from 2 file(s)
[cds] - connect to db > sqlite { url: ':memory:' }
[cds] - seeding data from ./db/data/ [10 files]
  > dog.walking-Walkers.csv (5 rows)
  > dog.walking-WalkerAvailability.csv (29 rows)
  > dog.walking-Customers.csv (50 rows)
  > dog.walking-Addresses.csv (101 rows)
  > dog.walking-Dogs.csv (75 rows)
  > dog.walking-DogFriends.csv (34 rows)
  > dog.walking-Appointments.csv (80 rows)
  > dog.walking-AppointmentDogs.csv (120 rows)
  > dog.walking-BillingRecords.csv (40 rows)
  > dog.walking-Confirmations.csv (12 rows)
[cds] - server listening on { url: 'http://localhost:4004' }
```

**Result: ✅ PASS** — All 10 CSV files loaded; server starts on port 4004.

---

### ST-4: API endpoint checks

| Endpoint | Expected | Actual | Result |
|---|---|---|---|
| `GET /api/Walkers` | 5 rows | 5 rows | ✅ |
| `GET /api/Customers` | 50 rows | 50 rows | ✅ |
| `GET /api/Dogs` | 75 rows | 75 rows | ✅ |
| `GET /api/Appointments` | 80 rows | 80 rows | ✅ |
| `GET /api/BillingRecords` | 40 rows | 40 rows | ✅ |
| `GET /api/Confirmations` | 12 rows | 12 rows | ✅ |
| `GET /api/getValidSlots()` | 22 strings | 22 strings | ✅ |
| `GET /api/getDailySchedule(date='2026-06-11')` | Array with nested fields | Returns with walkerFirstName, dogNames, pickupStreet | ✅ |
| `POST /api/Appointments` (invalid slot 12:00) | HTTP 400 | HTTP 400 | ✅ |
| `POST /api/Appointments` (double-booking) | HTTP 409 | HTTP 409 | ✅ |
| `PATCH /api/Appointments/ap005` | HTTP 200 | **HTTP 400** (UUID error) | ❌ D-06 |

**Result: ✅ 10/11 PASS — 1 FAIL (D-06)**

---

### ST-5: Artefact consistency check

| Check | Status | Notes |
|---|---|---|
| `solution.yaml` format: `apiVersion: solution.sap/v1` | ✅ | Correct |
| `asset.yaml` format: `apiVersion: asset.sap/v1`, `type: cap-app` | ✅ | Correct |
| `package.json` has `cds.requires.db.credentials.url: ":memory:"` | ✅ | In-memory SQLite confirmed |
| `package.json` has `cds.[production].folders.app = "app/react-ui/dist"` | ✅ | Correct |
| `vite.config.js` has `base: './'`, `hmr: false`, proxy `/api` | ✅ | Per joule-studio.md §6 |
| `vite.config.js` has `optimizeDeps.exclude` for all 5 `@ui5/*` packages | ✅ | Per skill rules |
| Vite stub at `app/react-ui/node_modules/vite/index.js` | ✅ | Present; committed via `.gitignore` negation |
| `app/react-ui/src/` (orphaned JSX files) | ✅ | **Deleted** — no dead code |
| Seed CSV file naming: `dog.walking-<Entity>.csv` | ✅ | Matches CDS namespace `dog.walking` |
| All entities in service CDS file exposed | ✅ | 10 entities, 2 functions exposed |
| Seed row IDs are valid UUIDs | ❌ | **D-06 CRITICAL** — short IDs `ap001`, `w001`, etc. |

**Result: ✅ 10/11 PASS — 1 FAIL (D-06)**

---

### ST-6: Improvement catalogue (code quality)

*(See `improvements.md` for full catalogue — items I-01 through I-05)*

Key improvements identified:
- I-01: Fee computation duplicated in two handler locations (AFTER CREATE + AppointmentDogs handler)
- I-02: `getDailySchedule` loads all entities into memory regardless of date — add date filter to Appointments fetch only
- I-03: No `@readonly` annotation on `BillingRecords.amount` — clients could send arbitrary amounts
- I-04: Walker email uniqueness not enforced at CDS model level
- I-05: No index hint on `Appointments.date` — daily schedule query could be slow at scale

---

### ST-7: Intent review

See `specification/original-intent.md` for the verbatim original user prompt.

| Intent requirement | Implemented | Notes |
|---|---|---|
| Customer/dog/walker management | ✅ | All 3 management views present |
| Half-hour slot scheduling 07:00–11:30, 13:00–18:30 | ✅ | 22 slots; enforced in BEFORE CREATE |
| Appointment booking | ✅ | Appointments view with form |
| Billing ($30 base + $10/additional dog) | ✅ | Fee formula correct; unit tested |
| Confirmations | ⚠️ | UI shows Confirmations view; **D-07: auto-create missing** |
| Daily schedule print view | ⚠️ | Print button present; **D-11: addresses not rendered; D-13: print CSS incomplete** |
| Seed data: 50 customers, 5 walkers, 1–5 dogs per customer, ~80 appointments | ✅ | 50 customers, 5 walkers, 75 dogs, 80 appointments |

**Overall intent coverage: 5/7 fully met, 2/7 partial**

---

### ST-summary: All defects raised

| ID | Severity | Description | Status |
|---|---|---|---|
| D-06 | CRITICAL | Seed IDs not valid UUIDs; all PATCH/DELETE on seed rows return HTTP 400 | Open |
| D-07 | HIGH | Confirmation not auto-created on appointment booking (missing INSERT in handler) | Open |
| D-08 | HIGH | Walker availability cannot be created/edited from UI | Open |
| D-09 | MED | Dog-friend pairs have no UI management panel | Open |
| D-10 | MED | Customer addresses have no UI panel | Open |
| D-11 | MED | Pickup/dropoff addresses not rendered in daily schedule view | Open |
| D-12 | MED | No "Mark Completed" action on appointments | Open |
| D-13 | LOW | Print CSS incomplete — columns may wrap/overflow in print layout | Open |
| D-14 | LOW | Dog `size` → `weight` field change undocumented in specification | Open |
| D-15 | LOW | Walker `bio` field absent from schema (spec mentioned it) | Open |
| D-16 | LOW | No confirmation number surfaced in UI — only UUID visible | Open |
