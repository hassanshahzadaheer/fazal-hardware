# Fazal Hardware

Offline-first inventory management and billing desktop app for hardware and
building material businesses, built with Electron, React, and SQLite.

## Overview

Fazal Hardware replaces legacy counter systems with a fast, modern desktop
app tailored to hardware, plywood, sanitary, and construction supply shops.
It runs fully offline, storing data locally in SQLite, and supports:

- **Dimensional selling** (length × width) for sheets, plywood, tiles, and
  glass — products sold by area, not just quantity
- **Catalog & parties management** — products, categories, brands,
  customers, and suppliers, each with full CRUD
- **Credit account tracking** (udhaar) with aging indicators and printable
  statements
- **Quotations** that convert to invoices with one click
- **Multi-price tiers** — retail vs. wholesale pricing
- **Barcode scanner** integration for fast product lookup
- **Printable/PDF reports** for sales, stock, receivables, and payables

See [docs/Fazal_Hardware_PRD.md](docs/Fazal_Hardware_PRD.md) for the full
product specification and [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md)
for build progress.

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Shell      | Electron                                         |
| Renderer   | React 18, TypeScript, Vite, Tailwind CSS         |
| State      | Zustand, TanStack Query                          |
| Forms      | React Hook Form + Zod                            |
| Database   | SQLite via better-sqlite3                        |
| Testing    | Vitest                                           |
| Packaging  | electron-builder                                 |

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

## Project Structure

```
electron/          Main process: IPC handlers, SQLite migrations, preload bridge
  db/               SQLite schema migrations
  handlers/         IPC handlers for each domain (products, customers, suppliers, ...)
src/                Renderer: React application
  features/         Feature-sliced UI modules (auth, products, customers, ...)
  stores/           Zustand state stores
shared/             Code shared between main and renderer processes
  types/            Shared TypeScript types
  schemas/          Zod validation schemas
  constants/        Shared constants
docs/               Product requirements and implementation planning docs
scripts/            Build and dev tooling
```

## Status

This project is under active rebuild. See
[docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) for the current
phase and task-by-task progress.

## License

Proprietary — all rights reserved.
