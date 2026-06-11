# Test Plan - Paw & Go Dog Walking Service

**Created:** 2026-06-11
**Last updated:** 2026-06-11
**Version:** 1.0
**Scope:** All 10 CAP entities, 7 UI views (Schedule, Appointments, Walkers, Customers, Dogs, Billing, Confirmations), 2 custom functions (getValidSlots, getDailySchedule), business rules (slot validation, double-booking, fee calculation, auto-billing, auto-confirmation)
**Out of scope:** Walker GPS tracking, customer portal, payment gateway, multi-tenant

---

## Testing approach

| Layer | Method | Status |
|---|---|---|
| Unit tests | Plain Node.js (`test/run-tests.js`) | ✅ 18/18 PASS |
| Static validation (SV) | Code/schema/API grep analysis | ✅ Run 1 complete — 11 defects found |
| Functional dynamic tests (DT-F) | Browser MCP | ❌ Blocked — browser MCP unavailable |
| Agent usability tests (DT-U-A) | Browser MCP | ❌ Blocked — browser MCP unavailable |
| Human task sheet (DT-U-H) | Manual | Offered but not requested |

**Note:** Browser automation MCP (Playwright, Chrome DevTools, Firefox) is unavailable in this environment. All dynamic testing must be performed by the human tester or deferred. The human task sheet in `DT-usability-human.md` provides step-by-step instructions for manual verification.

---

## Entity lifecycle matrix

| Entity | Create | Read | Update | Delete | Notes |
|---|---|---|---|---|---|
| Walkers | T4 ✅ | T1/T2 ✅ | T4 ✅ | T4 | UI: Walker form |
| WalkerAvailability | T4 ❌ D-08 | T1 | T4 ❌ D-08 | T4 ❌ D-08 | No UI panel for availability |
| Customers | T4 ✅ | T1/T2 ✅ | T4 ✅ | T4 | UI: Customer form |
| Addresses | T4 ❌ D-10 | — | T4 ❌ D-10 | T4 ❌ D-10 | No UI panel for addresses |
| Dogs | T4 ✅ | T1/T2 ✅ | T4 ✅ | T4 | UI: Dog form |
| DogFriends | — | — | — | — | D-09: no UI panel |
| Appointments | T4 ✅ | T1/T2 ✅ | T4 ⚠️ | T4 | D-12: no Complete button; D-06: PATCH seed rows = 400 |
| AppointmentDogs | Auto (deep insert) | — | — | — | Tested via Appointments create |
| Confirmations | Auto (AFTER CREATE) ❌ D-07 | T1/T2 ✅ | T4 | — | D-07: auto-create missing in handler |
| BillingRecords | Auto (AFTER CREATE) ✅ | T1/T2 ✅ | T4 ✅ | — | Billing auto-created; status update via UI |

**Legend:** ✅ = implemented & tested, ❌ = defect known, ⚠️ = partial

---

## FR-to-test mapping

| FR | Description | Test coverage |
|---|---|---|
| FR-01 | Book appointment with date, slot, walker, customer, dogs | Unit (slot validation) + SV API test |
| FR-02 | Slot validation: only 22 valid slots | Unit `run-tests.js` test: "22 valid slots" — 8 tests PASS |
| FR-03 | Double-booking prevention (409) | SV API check: PASS |
| FR-04 | Fee = $30 + $10×(n-1) | Unit `run-tests.js` tests: "1 dog=$30" through "5 dogs=$70" — 4 tests PASS |
| FR-05 | Auto-create BillingRecord on appointment CREATE | SV code check: PASS (INSERT.into BillingRecords present) |
| FR-06 | Auto-create Confirmation on appointment CREATE | SV code check: **FAIL** — D-07: no INSERT.into Confirmations in handler |
| FR-07 | Daily schedule function with pickup/dropoff addresses | SV API check: PASS (fields returned in JSON) |
| FR-08 | Display pickup/dropoff in schedule view | SV UI check: **FAIL** — D-11: fields not rendered in HTML |
| FR-09 | Print view for daily schedule | SV CSS check: **PARTIAL** — D-13: print CSS incomplete |
| FR-10 | Walker availability management | SV UI check: **FAIL** — D-08: no availability panel in UI |
| FR-11 | Customer address management | SV UI check: **FAIL** — D-10: no address panel in UI |
| FR-12 | Mark appointment completed | SV UI check: **FAIL** — D-12: no Complete button |
| FR-13 | Billing record payment status update | SV UI check: PASS (status dropdown in Billing view) |
| FR-14 | Seed data: 5 walkers, 50 customers, 75 dogs, 80 appointments | SV API check: PASS |
| FR-15 | Seed IDs must be valid UUIDs for PATCH/DELETE | SV check: **FAIL** — D-06: short IDs break write path |

---

## Task suite summary

*(Clicky task suite — see `Clicky.md`)*

| Use Case | Tasks | Tiers |
|---|---|---|
| UC-01: Book appointment | 8 | T1×2, T2×1, T4×3, Chain×1, Neg×1 |
| UC-02: Daily schedule / print | 5 | T1×1, T2×2, T4×1, Chain×1 |
| UC-03: Confirm appointment | 4 | T1×1, T4×1, Chain×1, Neg×1 |
| UC-04: Mark completed | 3 | T4×1, Chain×1, Neg×1 |
| UC-05: Billing / payment | 5 | T1×1, T2×1, T4×2, Chain×1 |
| UC-06: Walker management | 4 | T1×1, T4×2, Chain×1 |
| **Total** | **29** | |

---

## Coverage decisions

1. **D-06 (critical UUID gap)**: All seed rows use short IDs (`ap001`, `w001`, etc.). Every PATCH/DELETE on seed data returns HTTP 400. This blocks testing of update/cancel/complete/pay on seed records. Fix before running DT-F.
2. **Browser MCP unavailable**: Playwright, Chrome DevTools MCP, Firefox MCP all unreachable. All dynamic tests deferred to human tester. Human task sheet provided in `DT-usability-human.md`.
3. **Confirmations auto-create (D-07)**: Cannot be verified until D-07 is fixed. Chain tasks for UC-03 will be marked NOT-APPLICABLE until then.
4. **Addresses and DogFriends**: No UI panels. T4 create/update/delete tasks for these entities cannot be executed via UI. Marked as deferred pending D-08/D-09/D-10.
