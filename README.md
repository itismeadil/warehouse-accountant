# Accountant Service

A small companion service for [`warehouse-back-end`](https://github.com/itismeadil/warehouse-back-end).
It reads inventory numbers (`stock`, `sold`, `reserved`, `damaged`) from the
warehouse database, runs accounting calculations on them, and stores every
result in its **own, separate database** — so accounting history never
touches the warehouse DB, and the warehouse app is never modified.

Built so more accountant tasks can be dropped in later without touching
anything else.

## How it's wired

```
warehouse DB  ──(read only)──▶  accountant service  ──(read/write)──▶  accountant DB
   Items                          runs a "task"                          AccountingReport
```

Two independent Mongoose connections:
- `config/warehouseDB.js` → `WAREHOUSE_MONGO_URI` — read-only, points at the
  same DB the warehouse backend uses.
- `config/accountantDB.js` → `ACCOUNTANT_MONGO_URI` — a **different**
  database (different name, or even a different Mongo instance/cluster)
  where every calculation result gets saved.

## Setup

```bash
cp .env.example .env
# edit .env: WAREHOUSE_MONGO_URI, ACCOUNTANT_MONGO_URI, FRONTEND_URL
npm install
npm run dev
```

## The first task: `inventory-movement`

Pulls `stock`, `sold`, `reserved`, `damaged` off every part of every item
and computes:
- totals across the whole warehouse (or a filtered slice)
- movement rates (`sellThroughRate`, `damageRate`, `reservedRate`, `availableRate`)
- optional monetary valuation, if you pass a `unitPrices` map (the warehouse
  `Item` model has no price field, so pricing is supplied per calculation
  rather than assumed)

## API

| Method | Path | What it does |
|---|---|---|
| GET | `/api/accountant/tasks` | List available calculations |
| POST | `/api/accountant/run/:taskKey` | Run a calculation, store the result |
| GET | `/api/accountant/reports?taskKey=...&limit=20` | List past results |
| GET | `/api/accountant/reports/:id` | Fetch one stored result |

Run the inventory task for the whole warehouse:

```bash
curl -X POST http://localhost:5100/api/accountant/run/inventory-movement \
  -H "Content-Type: application/json" \
  -d '{}'
```

Run it for one item, with a price so it also returns monetary value:

```bash
curl -X POST http://localhost:5100/api/accountant/run/inventory-movement \
  -H "Content-Type: application/json" \
  -d '{
        "itemId": "665f1c2e...",
        "unitPrices": { "665f1c2e...": 49.99 }
      }'
```

Every run is saved as a new document in the `accounting_reports` collection
in the accountant database — nothing is overwritten, so you get a full
history of every calculation ever run.

## Adding a new accountant task later

1. Create `tasks/yourTask.js`:
   ```js
   async function run(options = {}) {
     // read from getItemModel() as needed
     return { summary: { ... }, items: [ ... ] }; // items[] is optional
   }
   module.exports = { key: "your-task-key", name: "...", description: "...", run };
   ```
2. Register it in `tasks/index.js` (one line: import + add to the array).

That's it — the routes, controller, and storage model are all generic and
already handle any task that follows this shape. No schema migration is
needed either: `AccountingReport.summary` is a flexible object, so each
task's own aggregate shape is preserved as-is.

## Auth

`ACCOUNTANT_API_KEY` in `.env` gives you a minimal shared-secret check via
an `x-api-key` header — enough for a small/internal service. If you'd
rather reuse the warehouse project's real JWT auth (`requireAuth` /
`requireRole`), the cleanest path is running this router inside the
warehouse-back-end process instead of standalone; the DB-connection split
(read warehouse / write accountant) stays exactly the same either way.
