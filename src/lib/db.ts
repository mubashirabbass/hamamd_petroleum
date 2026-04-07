/**
 * db.ts — SQLite Database Layer for EBS Petroleum
 * ================================================
 * Uses @tauri-apps/plugin-sql (tauri-plugin-sql in Rust)
 * The database file is stored in %APPDATA%\com.ebs.business\ebs_business.db
 * and persists across reinstalls.
 */
import Database from '@tauri-apps/plugin-sql';

let _db: Database | null = null;

// ─── Database Initialization ──────────────────────────────────────────────────

export async function getDB(): Promise<Database> {
  // Check if we are running inside Tauri
  if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
    throw new Error(
      'DATABASE_INIT_FAILED: This application requires the Tauri environment to access the SQLite database. ' +
      'Please run the app using "npm run tauri dev" or install the compiled .exe file. ' +
      'Standard web browsers (Chrome/Edge/etc.) are not supported for data storage.'
    );
  }

  if (!_db) {
    _db = await Database.load('sqlite:ebs_business.db');
    await initSchema(_db);
  }
  return _db;
}

async function initSchema(db: Database): Promise<void> {
  // Use a transaction for atomic schema creation
  await db.execute(`PRAGMA journal_mode=WAL`);
  await db.execute(`PRAGMA foreign_keys=ON`);

  // ── Settings ──────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    )
  `);

  // ── Users ─────────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'Staff',
      created_at TEXT NOT NULL
    )
  `);

  // ── Counters (auto-incrementing bill numbers) ─────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS counters (
      name  TEXT PRIMARY KEY,
      value INTEGER NOT NULL DEFAULT 1
    )
  `);

  // ── Purchases ─────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS purchases (
      id          TEXT PRIMARY KEY,
      bill_no     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'HSD',
      date        TEXT NOT NULL,
      details     TEXT DEFAULT '',
      rate        REAL NOT NULL DEFAULT 0,
      quantity    REAL NOT NULL DEFAULT 0,
      carriage    REAL NOT NULL DEFAULT 0,
      amount      REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Sales ─────────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id       TEXT PRIMARY KEY,
      bill_no  TEXT NOT NULL,
      type     TEXT NOT NULL DEFAULT 'HSD',
      date     TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      rate     REAL NOT NULL DEFAULT 0,
      amount   REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Ledger ────────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_categories (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ledger_entries (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      bill_no     TEXT NOT NULL,
      date        TEXT NOT NULL,
      description TEXT DEFAULT '',
      debit       REAL NOT NULL DEFAULT 0,
      credit      REAL NOT NULL DEFAULT 0,
      balance     REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Expense ───────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expense_categories (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS expense_entries (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      bill_no     TEXT NOT NULL,
      date        TEXT NOT NULL,
      details     TEXT DEFAULT '',
      amount      REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Assets ────────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS asset_categories (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS asset_entries (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      bill_no     TEXT NOT NULL,
      date        TEXT NOT NULL,
      description TEXT DEFAULT '',
      debit       REAL NOT NULL DEFAULT 0,
      credit      REAL NOT NULL DEFAULT 0,
      balance     REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Liabilities ───────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS liability_categories (
      id   TEXT PRIMARY KEY,
      name TEXT NOT NULL
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS liability_entries (
      id          TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      bill_no     TEXT NOT NULL,
      date        TEXT NOT NULL,
      description TEXT DEFAULT '',
      debit       REAL NOT NULL DEFAULT 0,
      credit      REAL NOT NULL DEFAULT 0,
      balance     REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Customers ─────────────────────────────────────────────────────────────
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id    TEXT PRIMARY KEY,
      name  TEXT NOT NULL,
      phone TEXT DEFAULT ''
    )
  `);
  await db.execute(`
    CREATE TABLE IF NOT EXISTS customer_entries (
      id          TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      bill_no     TEXT NOT NULL,
      date        TEXT NOT NULL,
      description TEXT DEFAULT '',
      debit       REAL NOT NULL DEFAULT 0,
      credit      REAL NOT NULL DEFAULT 0,
      balance     REAL NOT NULL DEFAULT 0
    )
  `);

  // ── Seed counters (only on first run) ─────────────────────────────────────
  await db.execute(`
    INSERT OR IGNORE INTO counters (name, value) VALUES
      ('purchase', 1), ('sale', 1), ('ledger', 1),
      ('expense', 1), ('asset', 1), ('liability', 1), ('customer', 1)
  `);

  // ── Seed default settings ─────────────────────────────────────────────────
  await db.execute(`
    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('startDate', ''),
      ('softwareName', 'EBS Petroleum'),
      ('hiddenMenus', '[]'),
      ('googleClientId', ''),
      ('googleClientSecret', ''),
      ('googleAccessToken', ''),
      ('googleRefreshToken', ''),
      ('googleTokenExpiry', '0'),
      ('googleUserEmail', ''),
      ('googleUserName', '')
  `);

  // ── Seed default users (only if table is empty) ───────────────────────────
  const existing = await db.select<{ count: number }[]>(
    'SELECT COUNT(*) as count FROM users'
  );
  if ((existing[0]?.count ?? 0) === 0) {
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO users (id, name, email, password, role, created_at) VALUES
        ('dev-001', 'Mubashir Abbas', 'mubashirabbasedu12@gmail.com', 'mubashir@2026', 'Developer', ?),
        ('master-001', 'Master Admin', 'master@gmail.com', 'master', 'Admin', ?)`,
      [now, now]
    );
  }
}

// ─── Counter Helpers ──────────────────────────────────────────────────────────

export async function getAndBumpCounter(name: string): Promise<number> {
  const db = await getDB();
  const rows = await db.select<{ value: number }[]>(
    'SELECT value FROM counters WHERE name = ?',
    [name]
  );
  const current = rows[0]?.value ?? 1;
  await db.execute('UPDATE counters SET value = ? WHERE name = ?', [
    current + 1,
    name,
  ]);
  return current;
}

// ─── Settings Helpers ─────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string> {
  const db = await getDB();
  const rows = await db.select<{ value: string }[]>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key]
  );
  return rows[0]?.value ?? '';
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDB();
  await db.execute(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDB();
  const rows = await db.select<{ key: string; value: string }[]>(
    'SELECT key, value FROM app_settings'
  );
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

// ─── Full Data Load (called on app startup) ───────────────────────────────────

export interface RawDBData {
  purchases:           any[];
  sales:               any[];
  ledgerCategories:    any[];
  ledgerEntries:       any[];
  expenseCategories:   any[];
  expenseEntries:      any[];
  assetCategories:     any[];
  assetEntries:        any[];
  liabilityCategories: any[];
  liabilityEntries:    any[];
  customers:           any[];
  customerEntries:     any[];
  users:               any[];
  counters:            Record<string, number>;
  settings:            Record<string, string>;
}

export async function loadAllData(): Promise<RawDBData> {
  const db = await getDB();

  const [
    purchases, sales,
    ledgerCategories, ledgerEntries,
    expenseCategories, expenseEntries,
    assetCategories, assetEntries,
    liabilityCategories, liabilityEntries,
    customers, customerEntries,
    users,
    counterRows,
  ] = await Promise.all([
    db.select<any[]>('SELECT id, bill_no as billNo, type, date, details, rate, quantity, carriage, amount, total_amount as totalAmount FROM purchases ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, bill_no as billNo, type, date, quantity, rate, amount FROM sales ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name FROM ledger_categories'),
    db.select<any[]>('SELECT id, category_id as categoryId, bill_no as billNo, date, description, debit, credit, balance FROM ledger_entries ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name FROM expense_categories'),
    db.select<any[]>('SELECT id, category_id as categoryId, bill_no as billNo, date, details, amount FROM expense_entries ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name FROM asset_categories'),
    db.select<any[]>('SELECT id, category_id as categoryId, bill_no as billNo, date, description, debit, credit, balance FROM asset_entries ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name FROM liability_categories'),
    db.select<any[]>('SELECT id, category_id as categoryId, bill_no as billNo, date, description, debit, credit, balance FROM liability_entries ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name, phone FROM customers'),
    db.select<any[]>('SELECT id, customer_id as customerId, bill_no as billNo, date, description, debit, credit, balance FROM customer_entries ORDER BY rowid DESC'),
    db.select<any[]>('SELECT id, name, email, password, role, created_at as createdAt FROM users'),
    db.select<{ name: string; value: number }[]>('SELECT name, value FROM counters'),
  ]);

  const counters: Record<string, number> = {};
  for (const row of counterRows) counters[row.name] = row.value;

  const settings = await getAllSettings();

  return {
    purchases, sales,
    ledgerCategories, ledgerEntries,
    expenseCategories, expenseEntries,
    assetCategories, assetEntries,
    liabilityCategories, liabilityEntries,
    customers, customerEntries,
    users, counters, settings,
  };
}
