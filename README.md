# HR Filling Station — Integrated Management Suite

> A desktop application for managing the day-to-day operations of a petroleum filling station. Built with **Tauri 2**, **React 19**, **TypeScript**, and **SQLite** — runs fully offline with an optional Google Drive backup.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Database Schema](#database-schema)
- [Security & Licensing](#security--licensing)
- [Getting Started](#getting-started)
- [Pages & Modules](#pages--modules)
- [State Management](#state-management)
- [Google Drive Backup](#google-drive-backup)
- [User Roles](#user-roles)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Build & Distribution](#build--distribution)

---

## Overview

**HR Filling Station** is a portable, offline-first desktop app built for petroleum retail businesses. All data is stored in a local SQLite database (`ebs_business.db`) placed next to the application's `.exe` file — no internet connection required for daily operations.

The app covers the full business cycle:
- Fuel **purchases** from suppliers
- Fuel **sales** to customers
- **Expense** tracking by category
- **Asset** and **liability** ledgers
- **Customer** account management with debit/credit entries
- **Stock** monitoring for HSD and PMG fuel types
- A **dashboard** with live financial summaries

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | [Tauri 2](https://tauri.app/) (Rust backend) |
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS v3 |
| Build Tool | Vite 7 |
| Database | SQLite via `@tauri-apps/plugin-sql` |
| State | Zustand 5 |
| UI Components | Radix UI primitives |
| Icons | Lucide React |
| PDF Export | jsPDF + html2canvas |
| Excel Export | ExcelJS |
| Print | react-to-print |
| Date Utils | date-fns |
| Cloud Backup | Google Drive API (OAuth2 via Rust/reqwest) |

---

## Project Structure

```
hamamd_petroleum/
├── src/                        # Frontend source
│   ├── App.tsx                 # Root — routing, splash, lock screen
│   ├── main.tsx                # React entry point
│   ├── pages/                  # One file per module
│   │   ├── Dashboard.tsx       # Summary, KPIs, quick actions
│   │   ├── Purchase.tsx        # Fuel purchase records
│   │   ├── Sale.tsx            # Fuel sales records
│   │   ├── Expense.tsx         # Expense entries by category
│   │   ├── Asset.tsx           # Asset ledger
│   │   ├── Liability.tsx       # Liability ledger
│   │   ├── Stock.tsx           # Stock / inventory view
│   │   ├── Customer.tsx        # Customer ledger
│   │   ├── Settings.tsx        # App config, backup, users
│   │   └── Login.tsx           # User login screen
│   ├── components/
│   │   ├── layout/             # Sidebar, BottomNav, Layout wrapper
│   │   ├── modals/             # FuelType, ManageUsers, PrintReport, Receipt modals
│   │   ├── printing/           # PrintHeader component
│   │   ├── settings/           # DeveloperSettings, KeyboardShortcuts panels
│   │   └── ui/                 # Modal, Pagination, SearchBar, Toast, PullToRefresh
│   ├── contexts/
│   │   └── ThemeContext.tsx    # Light / dark mode
│   ├── hooks/
│   │   └── useShortcuts.ts    # Global keyboard shortcut registration
│   ├── store/
│   │   └── useStore.ts         # Zustand global store + all data mutations
│   └── lib/
│       ├── db.ts               # SQLite schema, queries, transaction helpers
│       ├── driveAPI.ts         # Google Drive OAuth2 + backup/restore
│       └── utils.ts            # Currency formatting, date helpers, pagination
├── src-tauri/                  # Rust/Tauri backend
│   ├── src/                    # Rust commands (get_app_data_path, OAuth, etc.)
│   ├── tauri.conf.json         # App config — name, window size, plugins
│   └── Cargo.toml              # Rust dependencies
├── public/                     # Static assets (logos, icons)
├── backup_utils.js             # Node.js backup utility script
├── package.json
└── vite.config.ts
```

---

## Features

### Core Modules

| Module | What it does |
|---|---|
| **Dashboard** | Live KPIs — total purchases, sales, expenses, profit. Quick-action buttons. Digital clock. |
| **Purchase** | Record fuel deliveries (HSD / PMG). Fields: bill no, date, invoice no, vehicle no, rate, quantity, carriage, amount. |
| **Sale** | Record fuel sales. Fields: bill no, date, fuel type, quantity, rate, amount. |
| **Expense** | Categorised expense entries. Each category is user-defined. |
| **Asset** | Double-entry ledger (debit / credit / running balance) per asset category. |
| **Liability** | Double-entry ledger per liability category. |
| **Stock** | Calculates current stock per fuel type (purchases − sales). |
| **Customer** | Customer directory + per-customer debit/credit ledger with running balance. |
| **Settings** | Software config, user management, Google Drive backup, license info. |

### UI & UX

- **Dark / light mode** — toggle on the dashboard header
- **Ctrl + scroll / Ctrl + +/−** — zoom the entire app window (via Tauri `setZoom`)
- **Pull-to-refresh** on mobile builds
- **Keyboard shortcuts** — configurable hotkeys for navigation and actions
- **Printable receipts** — transaction receipt modal with a `react-to-print` flow
- **Print reports** — date-ranged PDF/print reports per module
- **Excel export** — via ExcelJS
- **Pagination + search** on all data tables
- **Toast notifications** for success/error feedback

---

## Database Schema

All tables are created on first launch inside `initSchema()` in `src/lib/db.ts`. SQLite is opened in **WAL mode** with foreign keys enabled.

### Tables

| Table | Purpose |
|---|---|
| `app_settings` | Key-value store for all app configuration |
| `users` | Staff accounts (id, name, email, password, role, cnic, dob) |
| `counters` | Auto-incrementing bill number per module (purchase, sale, expense, asset, liability, customer) |
| `purchases` | Fuel purchase records |
| `sales` | Fuel sale records |
| `expense_categories` | User-defined expense categories |
| `expense_entries` | Expense transactions linked to a category |
| `asset_categories` | User-defined asset categories |
| `asset_entries` | Asset ledger entries (debit/credit/balance) |
| `liability_categories` | User-defined liability categories |
| `liability_entries` | Liability ledger entries (debit/credit/balance) |
| `customers` | Customer directory |
| `customer_entries` | Per-customer ledger entries (debit/credit/balance) |

### Indexes

Date and category columns are indexed on all entry tables for fast filtering:

```sql
CREATE INDEX idx_purchase_date ON purchases(date);
CREATE INDEX idx_sale_date     ON sales(date);
CREATE INDEX idx_expense_date  ON expense_entries(date);
-- ... and so on for asset, liability, customer
```

### Transactions

All multi-step writes use `runInTransaction()` in `db.ts`, which serialises concurrent writes using a promise queue and retries up to 5 times on `database is locked` errors.

---

## Security & Licensing

The app has a three-layer security system managed in `App.tsx`:

### 1. Hardware Lock
On first activation, the app stores a machine ID (`authorizedMachineId`) in the database. On subsequent launches, the current hardware ID is compared against the stored one. A mismatch locks the app and shows the **"Unauthorized Hardware"** screen.

A local activation key file (`ebs_activation.key`) takes priority over the database value — this allows database restores from another device without locking the current machine.

### 2. License Expiry
If `licenseStartDate` and `licenseEndDate` are set in settings and today's date is outside that range, the app shows the **"License Expired"** screen.

### 3. Developer Override
A user with `role = 'Developer'` can bypass both locks. The developer login screen accepts their email and password, and can re-pin the app to the current hardware.

### App States (boot sequence)

```
App starts
  └── DB initialising → show DBSplash (loading animation)
        └── DB ready
              ├── Hardware mismatch OR license expired → SystemLocked screen
              ├── No logged-in user → Login screen
              └── User logged in → Main app (Router + all routes)
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain)
- [Tauri CLI](https://tauri.app/start/prerequisites/)

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run tauri dev
```

This starts the Vite dev server on `http://localhost:1420` and opens the Tauri desktop window.

### Build for production

```bash
npm run tauri build
```

Output installer is placed in `src-tauri/target/release/bundle/`.

> **Portable mode:** The `.exe` stores the database (`ebs_business.db`) in the same folder as itself. Moving the folder keeps all data intact.

---

## Pages & Modules

### Dashboard (`/`)

- Live digital clock (12-hour, Pakistan locale)
- User profile card with logout
- KPI cards: total purchases, sales, expenses, net profit
- Quick-action buttons to jump to any module
- HSD / PMG stock levels

### Purchase (`/purchase`)

Records fuel deliveries from suppliers.

**Key fields:** Bill No (auto), Date, Fuel Type (HSD/PMG), Invoice No, Vehicle No, Description, Rate, Quantity, Carriage, Amount, Total Amount.

### Sale (`/sale`)

Records fuel sold to customers.

**Key fields:** Bill No (auto), Date, Fuel Type (HSD/PMG), Description, Quantity, Rate, Amount.

Both Purchase and Sale support:
- Dashboard tab (summary + charts) and Database tab (full table)
- Inline edit and delete
- Transaction receipt modal
- Print / PDF report with date range

### Expense (`/expense`)

Categorised expense tracking. Categories are created by the user (e.g. Salaries, Utilities, Maintenance).

### Asset (`/asset`) & Liability (`/liability`)

Double-entry ledgers per category. Each entry has Debit, Credit, and a running Balance computed cumulatively.

### Stock (`/stock` and `/stock/:type`)

Calculates real-time stock:

```
Stock = Total Purchased Quantity − Total Sold Quantity
```

Displayed separately for HSD and PMG.

### Customer (`/customer`)

- Customer directory (name, phone)
- Per-customer ledger with debit/credit entries and running balance
- Summary: total receivable across all customers

### Settings (`/settings`)

Tabs include:
- **General** — software name, start date, hidden menus
- **Users** — add/edit/delete staff accounts
- **Backup** — Google Drive integration (see below)
- **License** — license dates, machine ID
- **Developer** — advanced settings (Developer role only)
- **Keyboard Shortcuts** — view and configure hotkeys

---

## State Management

All application state lives in a single **Zustand store** (`src/store/useStore.ts`), backed by SQLite.

### Startup flow

```
App mounts → initializeFromDB() → loadAllData() (SQLite) → store populated → UI renders
```

### Mutations

Every action (e.g. `addSale`, `deletePurchase`, `updateSettings`) writes to SQLite first, then updates the in-memory Zustand state. There is no `localStorage` or `sessionStorage` usage.

### Key store slices

| Slice | Contents |
|---|---|
| `purchases` | Array of all Purchase records |
| `sales` | Array of all Sale records |
| `expenseCategories` / `expenseEntries` | Expense module data |
| `assetCategories` / `assetEntries` | Asset ledger data |
| `liabilityCategories` / `liabilityEntries` | Liability ledger data |
| `customers` / `customerEntries` | Customer module data |
| `settings` | All app_settings key-values |
| `currentUser` | Currently logged-in user (null = not logged in) |
| `dbReady` / `dbError` | DB initialisation status |
| `currentMachineId` / `localActivationId` | Hardware security |

---

## Google Drive Backup

Configured in Settings → Backup. Uses OAuth2 with a user-supplied Google Cloud app (Client ID + Secret).

### How it works

1. User enters their Google OAuth Client ID and Secret in Settings
2. App opens a browser window for Google sign-in
3. OAuth tokens are stored in `app_settings` (SQLite)
4. **Backup** — the SQLite `.db` file is uploaded to Google Drive as a timestamped file
5. **Restore** — user picks a backup from the list; the file is downloaded and replaces the local database

All HTTP calls to Google's API go through Rust (`reqwest`) to avoid browser CORS restrictions.

---

## User Roles

| Role | Access |
|---|---|
| **Developer** | Full access. Can bypass hardware lock, manage licenses, access developer settings. |
| **Admin** | Full access to all business modules and settings. |
| **User** | Standard access — can record transactions but cannot manage users or settings. |

Default seeded accounts (change these after first install):

| Name | Email | Password | Role |
|---|---|---|---|
| Mubashir Abbas | mubashirabbasedu12@gmail.com | mubashir@2026 | Developer |
| Master Admin | master@gmail.com | master | Admin |

> ⚠️ Change default passwords immediately after installation.

---

## Keyboard Shortcuts

Configurable shortcuts are registered globally via `useShortcuts.ts`. The full list is visible and editable in **Settings → Keyboard Shortcuts**.

Common defaults:

| Shortcut | Action |
|---|---|
| `Ctrl + Scroll` | Zoom in / out |
| `Ctrl + 0` | Reset zoom |

---

## Build & Distribution

The app is bundled by Tauri into a native Windows installer (`HR Filling Station Setup.exe`). A pre-built installer is included in the repo root.

```bash
# Build installer
npm run tauri build

# Output: src-tauri/target/release/bundle/nsis/HR Filling Station_1.0.0_x64-setup.exe
```

The app identifier is `com.ebs.business` and the product name is **HR Filling Station**, version `1.0.0`.

---

## Notes for Developers

- **SQL safety** — always use `?` placeholders in queries. Never interpolate variables directly into SQL strings.
- **Multi-step writes** — wrap in `runInTransaction()` to guarantee atomicity and handle SQLite lock retries automatically.
- **Mobile build** — there is a parallel `ebs-mobile/` directory with a Tauri mobile configuration. On mobile, the database path is handled automatically by the plugin.
- **Temp files** — `tmp_expense.tsx` and `tmp_sale.tsx` in the root are work-in-progress scratch files, not part of the active build.

---

*Built by [EBS](mailto:mubashirabbasedu12@gmail.com) — Powered by Tauri + React*
