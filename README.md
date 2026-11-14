# Fazal Hardware

Offline-first inventory management and billing desktop app for hardware and
building material businesses, built with Electron, React, and SQLite — plus
a small companion license server for activation and updates.

## Overview

Fazal Hardware replaces legacy counter systems with a fast, modern desktop
app tailored to hardware, plywood, sanitary, and construction supply shops.
Day-to-day use is fully offline against a local SQLite database; only
activation and auto-update checks reach the network. It supports:

- **Dashboard** — KPIs, recent sales, low stock, and balance summary at a
  glance
- **Dimensional selling** (length × width) for sheets, plywood, tiles, and
  glass — products sold by area, not just quantity, with stored product
  dimensions auto-filled into sales and quotations
- **Catalog & parties management** — products (with barcode lookup),
  categories, customers, and company/suppliers, each with full CRUD
- **Stock management** — adjustments, wastage, opening balances, low-stock
  alerts, and full movement history
- **Sales & billing** — fast counter billing, searchable/sortable/filterable
  sales listing, full edit of existing invoices (quantities, prices, line
  items), and returns
- **Purchases** with automatic cost-price and stock updates
- **Payments, credit accounts (udhaar), and shared customer/supplier
  ledgers** with aging indicators and printable statements
- **Quotations** with auto-filled product details and one-click conversion
  to invoices
- **Daily expenses** tracking with monthly summaries
- **Reports** — sales, top products, low stock, receivables, and payables,
  each exportable to CSV or print/PDF
- **AI Invoice Scanner** — photograph a supplier bill and have Gemini
  extract line items for review before saving to Purchases
- **Licensing & auto-update** — activation keys issued and tracked by a
  separate license server (`license-server/`), OS-backed secure storage for
  API keys, and GitHub Releases-based auto-updates

See [docs/Fazal_Hardware_PRD.md](docs/Fazal_Hardware_PRD.md) for the full
product specification, [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
for phase-by-phase build progress, and [docs/meeting-notes/](docs/meeting-notes/)
for client-requested changes as they come in.

## Tech Stack

| Layer            | Technology                                   |
|-------------------|-----------------------------------------------|
| Shell             | Electron                                      |
| Renderer          | React 18, TypeScript, Vite, Tailwind CSS      |
| State             | Zustand, TanStack Query                       |
| Forms             | React Hook Form + Zod                         |
| Database          | SQLite via better-sqlite3                     |
| Testing           | Vitest                                        |
| Packaging/Update  | electron-builder, electron-updater            |
| License server    | Fastify + better-sqlite3 (separate Node app)  |

## Licensing & Activation

The packaged app activates against a license server (`license-server/`,
deployed separately — see [license-server/README.md](license-server/README.md))
and caches a short-lived, signed lease so it keeps working offline for a
grace period between checks. The Gemini API key for the AI Scanner is
entered once in the first-run setup wizard or Settings and stored via the
OS keychain (DPAPI / Keychain / libsecret) — it's never bundled in the app
or committed to this repo. See [docs/LICENSING.md](docs/LICENSING.md) for
the full design and [docs/RELEASING.md](docs/RELEASING.md) for how signed
releases are cut and published.

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

This builds the Electron main/preload bundles, starts the Vite dev server,
and launches the Electron app with hot reload.

### Run tests

```bash
npm test
```

### Build for production

```bash
npm run build
```

### Package a distributable installer

```bash
npm run package
```

In development, set `FAZAL_DEV_LICENSE_BYPASS` in `.env` (copy from
`.env.example`) to skip activation, or run the license server locally
(see below) and activate against it for an end-to-end test.

### Run the license server locally

```bash
cd license-server
npm install
cp .env.example .env   # fill in a signing key (npm run keygen) and KEY_HASH_PEPPER
npm run dev
```

`npm run demo` seeds a throwaway owner account and a sample activation key
for local testing — never use it in production.

## Project Structure

```
electron/          Main process: IPC handlers, SQLite migrations, preload bridge, licensing
  db/               SQLite schema migrations
  handlers/         IPC handlers for each domain (products, sales, purchases, ...)
  license/          Activation, leases, and device identification
  secrets/          OS-backed secure storage for API keys
src/                Renderer: React application
  features/         Feature-sliced UI modules (dashboard, products, sales, ...)
  components/       Shared UI primitives and layout (sidebar, design system)
  stores/           Zustand state stores
shared/             Code shared between main and renderer processes
  types/            Shared TypeScript types
  schemas/          Zod validation schemas
  constants/        Shared constants
license-server/     Separate Node/Fastify service: issues and tracks license
                     keys, signs leases, owner dashboard — deployed independently
docs/               Product requirements, implementation plan, licensing/
                     release docs, and client meeting notes
scripts/            Build, release, and dev tooling
```

## Status

This project is under active rebuild. See
[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the current
phase and task-by-task progress.

## License

Proprietary — all rights reserved.
