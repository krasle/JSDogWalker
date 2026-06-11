# Solution Specification: Paw & Go – Dog Walking Service

## Assets

This solution contains one asset:

| Asset | Type | Path |
|-------|------|------|
| dog-walking-cap | CAP Node.js + React UI | `assets/dog-walking-cap/` |

## Asset Specifications

- [Dog Walking CAP Application](dog-walking-cap/specification.md)

## Solution Structure

```
solution.yaml
intent.md
product-requirements-document.md
specification/
  specification.md          ← this file
  dog-walking-cap/
    specification.md        ← detailed asset spec
assets/
  dog-walking-cap/
    db/
      schema.cds            ← CDS data model
      data/                 ← CSV seed files
    srv/
      dog-walking-service.cds   ← service definition
      dog-walking-service.js    ← service handlers
    app/
      react-ui/             ← React frontend (Vite)
        src/
          App.jsx
          main.jsx
          index.css
          api.js
          Modal.jsx
          Toast.jsx
          views/
            ScheduleView.jsx
            WalkersView.jsx
            CustomersView.jsx
            DogsView.jsx
            AppointmentsView.jsx
            ConfirmationsView.jsx
            BillingView.jsx
        vite.config.js
        index.html
    test/
      run-tests.js
      scheduling.test.js
      billing.test.js
      slots.test.js
    package.json
    asset.yaml
```
