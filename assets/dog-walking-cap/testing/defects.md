# Defect Register - Paw & Go

**Created:** 2026-06-11
**Last updated:** 2026-06-11 (Iteration 2)
**Total open:** 0 | **Fixed:** 11 | **Closed:** 11

## ✅ Iteration 2 Fix Summary

| ID | Severity | Fix |
|----|----------|-----|
| D-06 | CRITICAL | Regenerated all 10 CSVs with proper UUIDs (`scripts/gen-seed.js`) — PATCH/DELETE on seed rows now 200 |
| D-07 | HIGH | `INSERT.into('dog.walking.Confirmations')` added to AFTER CREATE Appointments handler |
| D-08 | HIGH | Walker modal: `Availability Slots` sub-section with day/time CRUD |
| D-09 | MED | Dogs view: `Friends` button → DogFriends management modal with add/remove chips |
| D-10 | MED | Customer modal: `Addresses` sub-section with street/city/state/zip, isPickup/isDropoff checkboxes |
| D-11 | MED | `loadSchedule()` renders pickup/dropoff address lines in each schedule card |
| D-12 | MED | `✔ Complete` button added for confirmed appointments |
| D-13 | LOW | `@media print` block: break-inside:avoid, print-color-adjust, hidden stats+buttons |
| D-14 | LOW | Spec updated: `Dogs.size` renamed `Dogs.weight` (Decimal) — documented as intentional |
| D-15 | LOW | `bio` field added to `Walkers` entity schema, modal, and seed CSV |
| D-16 | LOW | Confirmations view: `Conf #` column shows first 8 chars of UUID in monospace |

---

## D-06 — Seed IDs not valid UUIDs [CRITICAL]

| Field | Value |
|---|---|
| **ID** | D-06 |
| **Severity** | CRITICAL |
| **Source** | ST Run 1 (ST-4 API check + ST-5 artefact consistency) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | All 10 seed CSV files |

**Description:**  
All seed CSV rows use short, human-readable IDs (`ap001`–`ap080`, `w001`–`w005`, `c001`–`c050`, `d001`–`d075`, etc.). CAP's OData layer rejects PATCH and DELETE requests for these rows with `HTTP 400 "Element 'ID' does not contain a valid UUID"`, because the CDS entities declare `: cuid` key fields which must be RFC 4122 UUIDs.

**Observed:**  
```
PATCH /api/Appointments/ap005 → HTTP 400
Error: Element "ID" does not contain a valid UUID
```

**Root cause:**  
CSV seed files were generated with short IDs for readability. CAP's `afterburner.js` URL parser enforces UUID format for `: cuid` keys.

**Impact:**  
- All edit, cancel, and complete actions on any seed record are broken.
- Foreign key references between seed CSV files also use short IDs (e.g., `appointment_ID = ap001`), so regenerating IDs requires a coordinated update of all 10 CSV files with consistent UUIDs.

**Fix required:**  
Regenerate all 10 CSV files replacing every ID with a proper UUID (`xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx` format). All cross-file FK references must be updated simultaneously.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-07 — Confirmation not auto-created on appointment booking [HIGH]

| Field | Value |
|---|---|
| **ID** | D-07 |
| **Severity** | HIGH |
| **Source** | ST Run 1 (ST-7 intent review + code grep) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `srv/dog-walking-service.js` — AFTER CREATE handler |

**Description:**  
The product requirements and original intent specify that a Confirmation record is automatically created when an appointment is booked. The AFTER CREATE handler creates a BillingRecord correctly but contains no `INSERT.into('dog.walking.Confirmations')` call. Confirmations must be manually created from the Confirmations view.

**Observed:**  
Grepping `srv/dog-walking-service.js` for `Confirmations` returns zero matches in the AFTER CREATE handler. Only the `BillingRecords` INSERT is present.

**Root cause:**  
Omission during initial handler implementation. The auto-billing logic was implemented; auto-confirmation was not.

**Fix required:**  
Add `INSERT.into('dog.walking.Confirmations')` in the AFTER CREATE handler with `status: 'pending'`, `method: 'email'`, and `appointment_ID` populated.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-08 — Walker availability cannot be created/edited from UI [HIGH]

| Field | Value |
|---|---|
| **ID** | D-08 |
| **Severity** | HIGH |
| **Source** | ST Run 1 (ST-6 improvement catalogue + UI grep) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Walkers view |

**Description:**  
The Walkers view displays each walker's name, phone, email, and active status, but provides no way to view, add, or edit their availability (days of week). The `WalkerAvailability` entity is seeded with 29 rows but is not exposed in the UI. The booking form does not filter walkers by availability.

**Root cause:**  
WalkerAvailability management panel was not included in the Walker form when building the vanilla JS UI.

**Fix required:**  
Add an availability section to the Walker detail/edit panel showing a grid of days (Mon–Sun) with checkboxes. POST to `/api/WalkerAvailability` on save.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-09 — Dog-friend pairs have no UI management panel [MEDIUM]

| Field | Value |
|---|---|
| **ID** | D-09 |
| **Severity** | MEDIUM |
| **Source** | ST Run 1 (UI grep) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Dogs view |

**Description:**  
The `DogFriends` entity (dog-to-dog "friendly with" relationship) is seeded with 34 rows but is entirely absent from the UI. Users cannot see which dogs are friends or create/remove friend pairs.

**Root cause:**  
DogFriends UI panel not implemented in the vanilla JS SPA. The self-referential `Dogs.friends` association was also removed from the CDS schema during an earlier fix (D-05 in prior session).

**Fix required:**  
Add a "Dog Friends" section to the Dog detail panel listing current friend pairs. Provide an add/remove interface posting to `/api/DogFriends`.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-10 — Customer addresses have no UI panel [MEDIUM]

| Field | Value |
|---|---|
| **ID** | D-10 |
| **Severity** | MEDIUM |
| **Source** | ST Run 1 (UI grep) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Customers view |

**Description:**  
The `Addresses` entity is seeded with 101 rows and is referenced in `Appointments` as pickup/dropoff addresses, but the Customers view has no address panel. Users cannot create, view, or edit customer addresses from the UI. When booking an appointment, the pickup/dropoff address dropdowns are absent.

**Root cause:**  
Address management panel omitted from the Customer form and Appointment booking form.

**Fix required:**  
Add an "Addresses" subsection to the Customer detail panel (street, city, state, zip fields). Pre-populate pickup address dropdown in the appointment booking form from the customer's addresses.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-11 — Pickup/dropoff address not shown in daily schedule [MEDIUM]

| Field | Value |
|---|---|
| **ID** | D-11 |
| **Severity** | MEDIUM |
| **Source** | ST Run 1 (ST-4 getDailySchedule API check vs UI render) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Schedule view render logic |

**Description:**  
The `getDailySchedule` API correctly returns `pickupStreet`, `pickupCity`, `dropoffStreet`, and `dropoffCity` fields for each appointment. However, the Schedule view JavaScript does not render these fields into the schedule cards. Walkers cannot see pickup addresses on the printed schedule.

**Observed:**  
`getDailySchedule` response includes `"pickupStreet": "742 Evergreen Terrace"`, `"pickupCity": "Springfield"`. Schedule card HTML contains no pickup/dropoff text.

**Root cause:**  
The `renderSchedule()` / schedule card template in `index.html` was written before the `getDailySchedule` API was extended to return address fields. The template was not updated.

**Fix required:**  
Update the schedule card template to include pickup address: `${item.pickupStreet}, ${item.pickupCity}` and dropoff address (if different from pickup).

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-12 — No "Mark Completed" action on appointments [MEDIUM]

| Field | Value |
|---|---|
| **ID** | D-12 |
| **Severity** | MEDIUM |
| **Source** | ST Run 1 (UI grep for status transitions) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Appointments view |

**Description:**  
The Appointments view has a "Confirm" action (PATCH status → `confirmed`) but no "Complete" action (PATCH status → `completed`). End-of-day workflow requires marking walks as completed after the walker returns.

**Root cause:**  
Only the confirm state transition was added to the appointment row actions. The complete transition was omitted.

**Fix required:**  
Add a "Complete" button that appears on confirmed appointments. On click: `PATCH /api/Appointments/{ID}` with `{ status: 'completed' }`. Only show button when current status is `confirmed`.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-13 — Print CSS incomplete [LOW]

| Field | Value |
|---|---|
| **ID** | D-13 |
| **Severity** | LOW |
| **Source** | ST Run 1 (CSS grep) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — `<style>` `@media print` block |

**Description:**  
The `@media print` CSS block hides the sidebar and top navigation, but does not address: overflow-hidden containers that clip content, table column widths for the schedule grid, font sizes for the address/dog columns, or page-break rules to avoid cards splitting across pages.

**Fix required:**  
Expand the `@media print` block to:
- Set `overflow: visible` on all scrollable containers
- Define explicit column widths for the schedule table
- Set `page-break-inside: avoid` on schedule cards
- Reduce font size to 10pt for dense tables

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-14 — Dog `size` → `weight` field change undocumented in specification [LOW]

| Field | Value |
|---|---|
| **ID** | D-14 |
| **Severity** | LOW |
| **Source** | ST Run 1 (ST-7 intent review) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `specification/dog-walking-cap/specification.md` |

**Description:**  
The original intent mentioned a `size` field for dogs. During implementation the field was changed to `weight` (Decimal, kg). This decision is not documented in the specification, creating a discrepancy for future maintainers.

**Fix required:**  
Add a note to the Dogs entity section in `specification/dog-walking-cap/specification.md`:  
> *Note: `weight` (Decimal, kg) is used instead of the categorical `size` field mentioned in the original intent. Weight provides more precise data for walker planning.*

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-15 — Walker `bio` field absent from schema [LOW]

| Field | Value |
|---|---|
| **ID** | D-15 |
| **Severity** | LOW |
| **Source** | ST Run 1 (schema vs intent review) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `db/schema.cds` — Walkers entity |

**Description:**  
The original intent mentioned a bio/description field for walkers. The `Walkers` entity in `schema.cds` has `firstName`, `lastName`, `phone`, `email`, `isActive`, `hiredOn` but no `bio` or `notes` field.

**Decision required (not a code bug):**  
Either (a) add `bio: String(500)` to the Walkers entity and render it in the Walker detail panel, or (b) document the omission as intentional in the specification.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*

---

## D-16 — No confirmation number surfaced in UI [LOW]

| Field | Value |
|---|---|
| **ID** | D-16 |
| **Severity** | LOW |
| **Source** | ST Run 1 (Confirmations view review) |
| **Date raised** | 2026-06-11 |
| **Status** | Open |
| **Affects** | `app/react-ui/index.html` — Confirmations view |

**Description:**  
The Confirmations view displays `confirmedBy`, `method`, `notes`, and `confirmedAt` but does not show a human-readable confirmation number. The record's UUID is not surfaced. When customers ask "what is my confirmation number?", staff have no friendly reference to provide.

**Fix required:**  
Either (a) add a `confirmationNumber` field (auto-generated short code like `PAG-0001`) to the Confirmations entity, or (b) display the first 8 characters of the UUID as a short reference in the Confirmations view list.

**Fix applied:** *(pending)*  
**Fixed date:** *(pending)*  
**Verified by:** *(pending)*
