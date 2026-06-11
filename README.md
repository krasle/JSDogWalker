# 🐾 Paw & Go — Dog Walking Service

Full-stack application built with **SAP Cloud Application Programming Model (CAP)** + **Vanilla JS SPA**.

## Features

| Module | Description |
|---|---|
| **Schedule** | Daily walking schedule grouped by walker with time slots |
| **Appointments** | Book, view & manage dog-walking appointments |
| **Walkers** | Manage walker profiles and availability |
| **Customers** | Customer directory with linked dogs |
| **Dogs** | Dog profiles with breed, weight, license info |
| **Billing** | Auto-generated invoices ($30 base + $10/extra dog) |
| **Confirmations** | Appointment confirmation tracking |

## Quick Start (local dev)

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [@sap/cds-dk](https://www.npmjs.com/package/@sap/cds-dk) v9+ installed globally

```bash
npm install -g @sap/cds-dk
```

### Run

```bash
cd assets/dog-walking-cap
npm install
cds watch
```

Open → **http://localhost:4004/react-ui/**

### Run Tests

```bash
cd assets/dog-walking-cap
node test/run-tests.js
```

Expected: **18/18 tests pass**

## Project Structure

```
assets/dog-walking-cap/
├── db/
│   ├── schema.cds              # Data model (Walkers, Dogs, Appointments…)
│   └── data/                   # Seed CSV files (50 customers, 5 walkers, 75 dogs, 80 appointments)
├── srv/
│   ├── dog-walking-service.cds # OData service definition
│   └── dog-walking-service.js  # Custom handlers (slot validation, billing, schedule)
├── app/
│   └── react-ui/
│       ├── index.html          # Self-contained vanilla JS SPA (no build step)
│       ├── vite.config.js      # Vite config (stub for CDS dev server integration)
│       └── node_modules/vite/  # Custom vite shim — serves index.html in dev
├── test/
│   └── run-tests.js            # 18 unit tests (plain Node.js, no jest)
└── package.json
```

## Architecture

- **Backend**: CAP Node.js with SQLite (dev) / SAP HANA (prod)  
- **Frontend**: Vanilla JS SPA — single `index.html`, no transpiler, no framework dependencies  
- **API path**: `/api` (OData v4)
- **Auth**: `cds.mocked` (development) — no login required locally

## Booking Rules

- Valid slots: **07:00–11:30** (AM, every 30 min) and **13:00–18:30** (PM, every 30 min)  
- No double-booking per walker — returns **HTTP 409** if conflict  
- Invalid slot time — returns **HTTP 400**

## Billing

- Base fee: **$30** for 1 dog  
- Additional dogs: **+$10** each  
- Example: 3 dogs = $30 + $10 + $10 = **$50**

## Deployment

See `solution.yaml` and `assets/dog-walking-cap/asset.yaml` for SAP BTP deployment config.

```bash
# via Joule Studio CLI
joulework deploy
```
