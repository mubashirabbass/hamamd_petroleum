/**
 * useStore.ts — EBS Petroleum Global State
 * =========================================
 * In-memory Zustand store backed by SQLite.
 * On startup: loadAllData() populates the store from the database.
 * On every mutation: the action writes to SQLite AND updates in-memory state.
 *
 * NO localStorage / sessionStorage is used — data lives in:
 *   Windows: %APPDATA%\com.ebs.business\ebs_business.db
 */
import { create } from 'zustand';
import { getDB, getAndBumpCounter, loadAllData, setSetting } from '../lib/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelType = 'HSD' | 'PMG';

export interface Purchase {
  id:          string;
  billNo:      string;
  type:        FuelType;
  date:        string;
  details:     string;
  rate:        number;
  quantity:    number;
  carriage:    number;
  amount:      number;
  totalAmount: number;
}

export interface Sale {
  id:       string;
  billNo:   string;
  type:     FuelType;
  date:     string;
  quantity: number;
  rate:     number;
  amount:   number;
}

export interface Category {
  id:   string;
  name: string;
}

export interface LedgerEntry {
  id:          string;
  categoryId:  string;
  billNo:      string;
  date:        string;
  description: string;
  debit:       number;
  credit:      number;
  balance:     number;
}

export interface ExpenseEntry {
  id:         string;
  categoryId: string;
  billNo:     string;
  date:       string;
  details:    string;
  amount:     number;
}

export interface AssetEntry {
  id:          string;
  categoryId:  string;
  billNo:      string;
  date:        string;
  description: string;
  debit:       number;
  credit:      number;
  balance:     number;
}

export interface LiabilityEntry {
  id:          string;
  categoryId:  string;
  billNo:      string;
  date:        string;
  description: string;
  debit:       number;
  credit:      number;
  balance:     number;
}

export interface Customer {
  id:    string;
  name:  string;
  phone: string;
}

export interface CustomerEntry {
  id:          string;
  customerId:  string;
  billNo:      string;
  date:        string;
  description: string;
  debit:       number;
  credit:      number;
  balance:     number;
}

export interface User {
  id:        string;
  name:      string;
  email:     string;
  password:  string;
  role:      'Admin' | 'Staff' | 'Developer';
  createdAt: string;
}

export interface Settings {
  startDate:    string;
  softwareName: string;
  hiddenMenus:  string[];
  users:        User[];
  zoomLevel:    number;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // ─ DB init ────────────────────────────────────────────────────────────────
  dbReady:          boolean;
  dbError:          string | null;
  initializeFromDB: () => Promise<void>;

  // ─ Purchase ───────────────────────────────────────────────────────────────
  purchases:       Purchase[];
  nextPurchaseNo:  number;
  addPurchase:     (p: Omit<Purchase, 'id' | 'billNo'>) => Promise<void>;
  updatePurchase:  (id: string, p: Partial<Purchase>)   => Promise<void>;
  deletePurchase:  (id: string)                          => Promise<void>;

  // ─ Sale ───────────────────────────────────────────────────────────────────
  sales:      Sale[];
  nextSaleNo: number;
  addSale:    (s: Omit<Sale, 'id' | 'billNo'>) => Promise<void>;
  updateSale: (id: string, s: Partial<Sale>)   => Promise<void>;
  deleteSale: (id: string)                      => Promise<void>;

  // ─ Ledger ─────────────────────────────────────────────────────────────────
  ledgerCategories:      Category[];
  ledgerEntries:         LedgerEntry[];
  nextLedgerNo:          number;
  addLedgerCategory:     (name: string)                              => Promise<void>;
  updateLedgerCategory:  (id: string, name: string)                  => Promise<void>;
  deleteLedgerCategory:  (id: string)                                => Promise<void>;
  addLedgerEntry:        (e: Omit<LedgerEntry, 'id' | 'billNo'>)    => Promise<void>;
  updateLedgerEntry:     (id: string, e: Partial<LedgerEntry>)       => Promise<void>;
  deleteLedgerEntry:     (id: string)                                => Promise<void>;

  // ─ Expense ────────────────────────────────────────────────────────────────
  expenseCategories:     Category[];
  expenseEntries:        ExpenseEntry[];
  nextExpenseNo:         number;
  addExpenseCategory:    (name: string)                              => Promise<void>;
  updateExpenseCategory: (id: string, name: string)                  => Promise<void>;
  deleteExpenseCategory: (id: string)                                => Promise<void>;
  addExpenseEntry:       (e: Omit<ExpenseEntry, 'id' | 'billNo'>)   => Promise<void>;
  updateExpenseEntry:    (id: string, e: Partial<ExpenseEntry>)      => Promise<void>;
  deleteExpenseEntry:    (id: string)                                => Promise<void>;

  // ─ Asset ──────────────────────────────────────────────────────────────────
  assetCategories:    Category[];
  assetEntries:       AssetEntry[];
  nextAssetNo:        number;
  addAssetCategory:   (name: string)                              => Promise<void>;
  updateAssetCategory:(id: string, name: string)                  => Promise<void>;
  deleteAssetCategory:(id: string)                                => Promise<void>;
  addAssetEntry:      (e: Omit<AssetEntry, 'id' | 'billNo'>)     => Promise<void>;
  updateAssetEntry:   (id: string, e: Partial<AssetEntry>)        => Promise<void>;
  deleteAssetEntry:   (id: string)                                => Promise<void>;

  // ─ Liability ──────────────────────────────────────────────────────────────
  liabilityCategories:    Category[];
  liabilityEntries:       LiabilityEntry[];
  nextLiabilityNo:        number;
  addLiabilityCategory:   (name: string)                               => Promise<void>;
  updateLiabilityCategory:(id: string, name: string)                   => Promise<void>;
  deleteLiabilityCategory:(id: string)                                 => Promise<void>;
  addLiabilityEntry:      (e: Omit<LiabilityEntry, 'id' | 'billNo'>) => Promise<void>;
  updateLiabilityEntry:   (id: string, e: Partial<LiabilityEntry>)    => Promise<void>;
  deleteLiabilityEntry:   (id: string)                                => Promise<void>;

  // ─ Customer ───────────────────────────────────────────────────────────────
  customers:           Customer[];
  customerEntries:     CustomerEntry[];
  nextCustomerNo:      number;
  addCustomer:         (c: Omit<Customer, 'id'>)                      => Promise<void>;
  updateCustomer:      (id: string, c: Partial<Customer>)             => Promise<void>;
  deleteCustomer:      (id: string)                                   => Promise<void>;
  addCustomerEntry:    (e: Omit<CustomerEntry, 'id' | 'billNo'>)      => Promise<void>;
  updateCustomerEntry: (id: string, e: Partial<CustomerEntry>)        => Promise<void>;
  deleteCustomerEntry: (id: string)                                   => Promise<void>;

  // ─ Settings & Users ───────────────────────────────────────────────────────
  settings:       Settings;
  updateSettings: (s: Partial<Settings>) => Promise<void>;
  addUser:        (u: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser:     (id: string, u: Partial<User>)       => Promise<void>;
  deleteUser:     (id: string)                          => Promise<void>;

  // ─ Auth ───────────────────────────────────────────────────────────────────
  currentUser: User | null;
  login:       (u: User)  => void;
  logout:      ()          => void;

  // ─ Reset ──────────────────────────────────────────────────────────────────
  resetAllData: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()((set, get) => ({
  // ── DB Init ─────────────────────────────────────────────────────────────────
  dbReady: false,
  dbError: null,

  initializeFromDB: async () => {
    try {
      const data = await loadAllData();
      set({
        purchases:           data.purchases,
        sales:               data.sales,
        ledgerCategories:    data.ledgerCategories,
        ledgerEntries:       data.ledgerEntries,
        expenseCategories:   data.expenseCategories,
        expenseEntries:      data.expenseEntries,
        assetCategories:     data.assetCategories,
        assetEntries:        data.assetEntries,
        liabilityCategories: data.liabilityCategories,
        liabilityEntries:    data.liabilityEntries,
        customers:           data.customers,
        customerEntries:     data.customerEntries,
        nextPurchaseNo:      data.counters['purchase']  ?? 1,
        nextSaleNo:          data.counters['sale']       ?? 1,
        nextLedgerNo:        data.counters['ledger']     ?? 1,
        nextExpenseNo:       data.counters['expense']    ?? 1,
        nextAssetNo:         data.counters['asset']      ?? 1,
        nextLiabilityNo:     data.counters['liability']  ?? 1,
        nextCustomerNo:      data.counters['customer']   ?? 1,
        settings: {
          startDate:    data.settings['startDate']    ?? '',
          softwareName: data.settings['softwareName'] === 'EBS Petroleum' ? 'HRM Filling Station' : (data.settings['softwareName'] || 'HRM Filling Station'),
          hiddenMenus:  JSON.parse(data.settings['hiddenMenus'] ?? '[]'),
          users:        data.users,
          zoomLevel:    parseFloat(data.settings['zoomLevel'] || '1.0'),
        },
        dbReady: true,
        dbError: null,
      });
    } catch (err: any) {
      console.error('[DB] Failed to initialize:', err);
      set({ dbReady: false, dbError: String(err?.message ?? err) });
    }
  },

  // ── Purchases ───────────────────────────────────────────────────────────────
  purchases:      [],
  nextPurchaseNo: 1,

  addPurchase: async (p) => {
    const db = await getDB();
    const no = await getAndBumpCounter('purchase');
    const billNo = `PUR-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO purchases (id,bill_no,type,date,details,rate,quantity,carriage,amount,total_amount)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, billNo, p.type, p.date, p.details, p.rate, p.quantity, p.carriage, p.amount, p.totalAmount]
    );
    const entry: Purchase = { ...p, id, billNo };
    set(s => ({ purchases: [entry, ...s.purchases], nextPurchaseNo: no + 1 }));
  },

  updatePurchase: async (id, data) => {
    const db = await getDB();
    const current = get().purchases.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE purchases SET type=?,date=?,details=?,rate=?,quantity=?,carriage=?,amount=?,total_amount=? WHERE id=?`,
      [updated.type, updated.date, updated.details, updated.rate, updated.quantity, updated.carriage, updated.amount, updated.totalAmount, id]
    );
    set(s => ({ purchases: s.purchases.map(x => x.id === id ? updated : x) }));
  },

  deletePurchase: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM purchases WHERE id=?', [id]);
    set(s => ({ purchases: s.purchases.filter(x => x.id !== id) }));
  },

  // ── Sales ────────────────────────────────────────────────────────────────────
  sales:      [],
  nextSaleNo: 1,

  addSale: async (s) => {
    const db = await getDB();
    const no = await getAndBumpCounter('sale');
    const billNo = `SAL-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO sales (id,bill_no,type,date,quantity,rate,amount) VALUES (?,?,?,?,?,?,?)`,
      [id, billNo, s.type, s.date, s.quantity, s.rate, s.amount]
    );
    const entry: Sale = { ...s, id, billNo };
    set(st => ({ sales: [entry, ...st.sales], nextSaleNo: no + 1 }));
  },

  updateSale: async (id, data) => {
    const db = await getDB();
    const current = get().sales.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE sales SET type=?,date=?,quantity=?,rate=?,amount=? WHERE id=?`,
      [updated.type, updated.date, updated.quantity, updated.rate, updated.amount, id]
    );
    set(s => ({ sales: s.sales.map(x => x.id === id ? updated : x) }));
  },

  deleteSale: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM sales WHERE id=?', [id]);
    set(s => ({ sales: s.sales.filter(x => x.id !== id) }));
  },

  // ── Ledger ──────────────────────────────────────────────────────────────────
  ledgerCategories: [],
  ledgerEntries:    [],
  nextLedgerNo:     1,

  addLedgerCategory: async (name) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO ledger_categories (id,name) VALUES (?,?)', [id, name]);
    set(s => ({ ledgerCategories: [...s.ledgerCategories, { id, name }] }));
  },
  updateLedgerCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE ledger_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ ledgerCategories: s.ledgerCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteLedgerCategory: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM ledger_categories WHERE id=?', [id]);
    await db.execute('DELETE FROM ledger_entries WHERE category_id=?', [id]);
    set(s => ({
      ledgerCategories: s.ledgerCategories.filter(c => c.id !== id),
      ledgerEntries: s.ledgerEntries.filter(e => e.categoryId !== id),
    }));
  },
  addLedgerEntry: async (e) => {
    const db = await getDB();
    const no = await getAndBumpCounter('ledger');
    const billNo = `LDG-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO ledger_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
      [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
    );
    const entry: LedgerEntry = { ...e, id, billNo };
    set(s => ({ ledgerEntries: [entry, ...s.ledgerEntries], nextLedgerNo: no + 1 }));
  },
  updateLedgerEntry: async (id, data) => {
    const db = await getDB();
    const current = get().ledgerEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE ledger_entries SET date=?,description=?,debit=?,credit=?,balance=? WHERE id=?`,
      [updated.date, updated.description, updated.debit, updated.credit, updated.balance, id]
    );
    set(s => ({ ledgerEntries: s.ledgerEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteLedgerEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM ledger_entries WHERE id=?', [id]);
    set(s => ({ ledgerEntries: s.ledgerEntries.filter(x => x.id !== id) }));
  },

  // ── Expense ──────────────────────────────────────────────────────────────────
  expenseCategories: [],
  expenseEntries:    [],
  nextExpenseNo:     1,

  addExpenseCategory: async (name) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO expense_categories (id,name) VALUES (?,?)', [id, name]);
    set(s => ({ expenseCategories: [...s.expenseCategories, { id, name }] }));
  },
  updateExpenseCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE expense_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ expenseCategories: s.expenseCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteExpenseCategory: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM expense_categories WHERE id=?', [id]);
    await db.execute('DELETE FROM expense_entries WHERE category_id=?', [id]);
    set(s => ({
      expenseCategories: s.expenseCategories.filter(c => c.id !== id),
      expenseEntries: s.expenseEntries.filter(e => e.categoryId !== id),
    }));
  },
  addExpenseEntry: async (e) => {
    const db = await getDB();
    const no = await getAndBumpCounter('expense');
    const billNo = `EXP-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO expense_entries (id,category_id,bill_no,date,details,amount) VALUES (?,?,?,?,?,?)`,
      [id, e.categoryId, billNo, e.date, e.details, e.amount]
    );
    const entry: ExpenseEntry = { ...e, id, billNo };
    set(s => ({ expenseEntries: [entry, ...s.expenseEntries], nextExpenseNo: no + 1 }));
  },
  updateExpenseEntry: async (id, data) => {
    const db = await getDB();
    const current = get().expenseEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE expense_entries SET date=?,details=?,amount=? WHERE id=?`,
      [updated.date, updated.details, updated.amount, id]
    );
    set(s => ({ expenseEntries: s.expenseEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteExpenseEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM expense_entries WHERE id=?', [id]);
    set(s => ({ expenseEntries: s.expenseEntries.filter(x => x.id !== id) }));
  },

  // ── Asset ────────────────────────────────────────────────────────────────────
  assetCategories: [],
  assetEntries:    [],
  nextAssetNo:     1,

  addAssetCategory: async (name) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO asset_categories (id,name) VALUES (?,?)', [id, name]);
    set(s => ({ assetCategories: [...s.assetCategories, { id, name }] }));
  },
  updateAssetCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE asset_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ assetCategories: s.assetCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteAssetCategory: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM asset_categories WHERE id=?', [id]);
    await db.execute('DELETE FROM asset_entries WHERE category_id=?', [id]);
    set(s => ({
      assetCategories: s.assetCategories.filter(c => c.id !== id),
      assetEntries: s.assetEntries.filter(e => e.categoryId !== id),
    }));
  },
  addAssetEntry: async (e) => {
    const db = await getDB();
    const no = await getAndBumpCounter('asset');
    const billNo = `AST-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO asset_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
      [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
    );
    const entry: AssetEntry = { ...e, id, billNo };
    set(s => ({ assetEntries: [entry, ...s.assetEntries], nextAssetNo: no + 1 }));
  },
  updateAssetEntry: async (id, data) => {
    const db = await getDB();
    const current = get().assetEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE asset_entries SET date=?,description=?,debit=?,credit=?,balance=? WHERE id=?`,
      [updated.date, updated.description, updated.debit, updated.credit, updated.balance, id]
    );
    set(s => ({ assetEntries: s.assetEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteAssetEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM asset_entries WHERE id=?', [id]);
    set(s => ({ assetEntries: s.assetEntries.filter(x => x.id !== id) }));
  },

  // ── Liability ────────────────────────────────────────────────────────────────
  liabilityCategories: [],
  liabilityEntries:    [],
  nextLiabilityNo:     1,

  addLiabilityCategory: async (name) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO liability_categories (id,name) VALUES (?,?)', [id, name]);
    set(s => ({ liabilityCategories: [...s.liabilityCategories, { id, name }] }));
  },
  updateLiabilityCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE liability_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ liabilityCategories: s.liabilityCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteLiabilityCategory: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM liability_categories WHERE id=?', [id]);
    await db.execute('DELETE FROM liability_entries WHERE category_id=?', [id]);
    set(s => ({
      liabilityCategories: s.liabilityCategories.filter(c => c.id !== id),
      liabilityEntries: s.liabilityEntries.filter(e => e.categoryId !== id),
    }));
  },
  addLiabilityEntry: async (e) => {
    const db = await getDB();
    const no = await getAndBumpCounter('liability');
    const billNo = `LIA-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO liability_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
      [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
    );
    const entry: LiabilityEntry = { ...e, id, billNo };
    set(s => ({ liabilityEntries: [entry, ...s.liabilityEntries], nextLiabilityNo: no + 1 }));
  },
  updateLiabilityEntry: async (id, data) => {
    const db = await getDB();
    const current = get().liabilityEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE liability_entries SET date=?,description=?,debit=?,credit=?,balance=? WHERE id=?`,
      [updated.date, updated.description, updated.debit, updated.credit, updated.balance, id]
    );
    set(s => ({ liabilityEntries: s.liabilityEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteLiabilityEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM liability_entries WHERE id=?', [id]);
    set(s => ({ liabilityEntries: s.liabilityEntries.filter(x => x.id !== id) }));
  },

  // ── Customers ────────────────────────────────────────────────────────────────
  customers:       [],
  customerEntries: [],
  nextCustomerNo:  1,

  addCustomer: async (c) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO customers (id,name,phone) VALUES (?,?,?)', [id, c.name, c.phone]);
    set(s => ({ customers: [...s.customers, { ...c, id }] }));
  },
  updateCustomer: async (id, data) => {
    const db = await getDB();
    const current = get().customers.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute('UPDATE customers SET name=?,phone=? WHERE id=?', [updated.name, updated.phone, id]);
    set(s => ({ customers: s.customers.map(c => c.id === id ? updated : c) }));
  },
  deleteCustomer: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM customers WHERE id=?', [id]);
    await db.execute('DELETE FROM customer_entries WHERE customer_id=?', [id]);
    set(s => ({
      customers: s.customers.filter(c => c.id !== id),
      customerEntries: s.customerEntries.filter(e => e.customerId !== id),
    }));
  },
  addCustomerEntry: async (e) => {
    const db = await getDB();
    const no = await getAndBumpCounter('customer');
    const billNo = `CST-${String(no).padStart(2, '0')}`;
    const id = uid();
    await db.execute(
      `INSERT INTO customer_entries (id,customer_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
      [id, e.customerId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
    );
    const entry: CustomerEntry = { ...e, id, billNo };
    set(s => ({ customerEntries: [entry, ...s.customerEntries], nextCustomerNo: no + 1 }));
  },
  updateCustomerEntry: async (id, data) => {
    const db = await getDB();
    const current = get().customerEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE customer_entries SET date=?,description=?,debit=?,credit=?,balance=? WHERE id=?`,
      [updated.date, updated.description, updated.debit, updated.credit, updated.balance, id]
    );
    set(s => ({ customerEntries: s.customerEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteCustomerEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM customer_entries WHERE id=?', [id]);
    set(s => ({ customerEntries: s.customerEntries.filter(x => x.id !== id) }));
  },

  // ── Settings & Users ─────────────────────────────────────────────────────────
  settings: {
    startDate:    '',
    softwareName: 'HRM Filling Station',
    hiddenMenus:  [],
    users:        [],
    zoomLevel:    1.0,
  },

  updateSettings: async (updates) => {
    const current = get().settings;
    const merged  = { ...current, ...updates };
    if (updates.startDate    !== undefined) await setSetting('startDate',    updates.startDate);
    if (updates.softwareName !== undefined) await setSetting('softwareName', updates.softwareName);
    if (updates.hiddenMenus  !== undefined) await setSetting('hiddenMenus',  JSON.stringify(updates.hiddenMenus));
    if (updates.zoomLevel    !== undefined) await setSetting('zoomLevel',    String(updates.zoomLevel));
    set({ settings: merged });
  },

  addUser: async (u) => {
    const db = await getDB();
    const id  = uid();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO users (id,name,email,password,role,created_at) VALUES (?,?,?,?,?,?)',
      [id, u.name, u.email, u.password, u.role, now]
    );
    const newUser: User = { ...u, id, createdAt: now };
    set(s => ({ settings: { ...s.settings, users: [newUser, ...s.settings.users] } }));
  },
  updateUser: async (id, data) => {
    const db = await getDB();
    const current = get().settings.users.find(u => u.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      'UPDATE users SET name=?,email=?,password=?,role=? WHERE id=?',
      [updated.name, updated.email, updated.password, updated.role, id]
    );
    set(s => ({
      settings: {
        ...s.settings,
        users: s.settings.users.map(u => u.id === id ? updated : u),
      },
    }));
  },
  deleteUser: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM users WHERE id=?', [id]);
    set(s => ({
      settings: {
        ...s.settings,
        users: s.settings.users.filter(u => u.id !== id),
      },
    }));
  },

  // ── Auth ─────────────────────────────────────────────────────────────────────
  currentUser: null,
  login:  (u) => set({ currentUser: u }),
  logout: ()  => set({ currentUser: null }),

  // ── Reset All Data ────────────────────────────────────────────────────────────
  resetAllData: async () => {
    const db = await getDB();
    const tables = [
      'purchases', 'sales',
      'ledger_entries', 'ledger_categories',
      'expense_entries', 'expense_categories',
      'asset_entries', 'asset_categories',
      'liability_entries', 'liability_categories',
      'customer_entries', 'customers',
    ];
    for (const t of tables) await db.execute(`DELETE FROM ${t}`);
    // Reset counters
    await db.execute(
      `UPDATE counters SET value=1 WHERE name IN ('purchase','sale','ledger','expense','asset','liability','customer')`
    );
    set({
      purchases: [], sales: [],
      ledgerCategories: [], ledgerEntries: [],
      expenseCategories: [], expenseEntries: [],
      assetCategories: [], assetEntries: [],
      liabilityCategories: [], liabilityEntries: [],
      customers: [], customerEntries: [],
      nextPurchaseNo: 1, nextSaleNo: 1,
      nextLedgerNo: 1, nextExpenseNo: 1,
      nextAssetNo: 1, nextLiabilityNo: 1, nextCustomerNo: 1,
    });
  },
}));
