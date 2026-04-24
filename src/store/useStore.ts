/**
 * useStore.ts — EBS Petroleum Global State
 * =========================================
 * In-memory Zustand store backed by SQLite.
 * On startup: loadAllData() populates the store from the database.
 * On every mutation: the action writes to SQLite AND updates in-memory state.
 *
 * NO localStorage / sessionStorage is used — data lives in:
 *   Installation Folder: ebs_business.db (Portable Mode)
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDB, getAndBumpCounter, loadAllData, setSetting, runInTransaction } from '../lib/db';
import { invoke } from '@tauri-apps/api/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export type FuelType = 'HSD' | 'PMG';

export interface Purchase {
  id:          string;
  billNo:      string;
  type:        FuelType;
  date:        string;
  description?: string;
  invoiceNo?:  string;
  vehicleNo?:  string;
  details?:    string;
  rate:        number;
  quantity:    number;
  carriage:    number;
  amount:      number;
  totalAmount: number;
}

export interface Sale {
  id:          string;
  billNo:      string;
  type:        FuelType;
  date:        string;
  description?: string;
  quantity:    number;
  rate:        number;
  amount:      number;
}

export interface Category {
  id:   string;
  name: string;
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

export interface CapitalEntry {
  id:          string;
  categoryId:  string;
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
  cnic?:     string;
  dob?:      string;
}

export interface Shortcut {
  id:           string;
  key:          string;
  label:        string;
  targetPath:   string;
  searchParams?: string;
}

export interface Settings {
  startDate:    string;
  softwareName: string;
  hiddenMenus:  string[];
  users:               User[];
  zoomLevel:           number;
  licenseStartDate:    string;
  licenseEndDate:      string;
  authorizedMachineId: string;
  shortcuts:           Shortcut[];
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppState {
  // ─ DB init ────────────────────────────────────────────────────────────────
  dbReady:          boolean;
  dbError:          string | null;
  currentMachineId: string | null;
  localActivationId: string | null;
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

  // ─ Capital ────────────────────────────────────────────────────────────────
  capitalCategories:    Category[];
  capitalEntries:       CapitalEntry[];
  nextCapitalNo:        number;
  addCapitalCategory:   (name: string)                               => Promise<void>;
  updateCapitalCategory:(id: string, name: string)                   => Promise<void>;
  deleteCapitalCategory:(id: string)                                 => Promise<void>;
  addCapitalEntry:      (e: Omit<CapitalEntry, 'id' | 'billNo'>)    => Promise<void>;
  updateCapitalEntry:   (id: string, e: Partial<CapitalEntry>)      => Promise<void>;
  deleteCapitalEntry:   (id: string)                                 => Promise<void>;

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

  // ─ UI State ────────────────────────────────────────────────────────────────
  isLoading: boolean;
  triggerSplash: () => void;

  // ─ Reset ──────────────────────────────────────────────────────────────────
  resetAllData: () => Promise<void>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// ─── Store ────────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
  // ── DB Init ─────────────────────────────────────────────────────────────────
  dbReady: false,
  dbError: null,
  currentMachineId: null,
  localActivationId: null,

  initializeFromDB: async () => {
    try {
      const [data, machineId, localActivation] = await Promise.all([
        loadAllData(),
        invoke<string>('get_machine_id').catch(() => 'UNKNOWN'),
        invoke<string>('get_hwid_activation').catch(() => '')
      ]);

      set({
        purchases:           data.purchases,
        sales:               data.sales,

        expenseCategories:   data.expenseCategories,
        expenseEntries:      data.expenseEntries,
        assetCategories:     data.assetCategories,
        assetEntries:        data.assetEntries,
        liabilityCategories: data.liabilityCategories,
        liabilityEntries:    data.liabilityEntries,
        customers:           data.customers,
        customerEntries:     data.customerEntries,
        capitalCategories:   data.capitalCategories,
        capitalEntries:      data.capitalEntries,
        nextPurchaseNo:      data.counters['purchase']  ?? 1,
        nextSaleNo:          data.counters['sale']       ?? 1,

        nextExpenseNo:       data.counters['expense']    ?? 1,
        nextAssetNo:         data.counters['asset']      ?? 1,
        nextLiabilityNo:     data.counters['liability']  ?? 1,
        nextCustomerNo:      data.counters['customer']   ?? 1,
        nextCapitalNo:       data.counters['capital']    ?? 1,
        currentMachineId: machineId,
        settings: {
          startDate:    data.settings['startDate']    ?? '',
          softwareName: (data.settings['softwareName'] === 'EBS Petroleum' || data.settings['softwareName'] === 'HRM Filling Station') ? 'HR Filling Station' : (data.settings['softwareName'] || 'HR Filling Station'),
          hiddenMenus:  JSON.parse(data.settings['hiddenMenus'] ?? '[]'),
          users:        data.users,
          zoomLevel:    parseFloat(data.settings['zoomLevel'] || '1.0'),
          licenseStartDate:    data.settings['licenseStartDate'] || '',
          licenseEndDate:      data.settings['licenseEndDate']   || '',
          authorizedMachineId: data.settings['authorizedMachineId'] || '',
          shortcuts: (() => {
            try {
              const saved = data.settings['shortcuts'];
              if (saved) return JSON.parse(saved);
            } catch(e) {}
            return [
              { id: '1', key: 'F1',  label: 'Dashboard',   targetPath: '/' },
              { id: '2', key: 'F2',  label: 'Purchase',    targetPath: '/purchase' },
              { id: '3', key: 'F3',  label: 'Sale',        targetPath: '/sale' },
              { id: '4', key: 'F5',  label: 'Expense',     targetPath: '/expense' },
              { id: '5', key: 'F6',  label: 'Asset',       targetPath: '/asset' },
              { id: '6', key: 'F7',  label: 'Liability',   targetPath: '/liability' },
              { id: '7', key: 'F8',  label: 'Stock',       targetPath: '/stock' },
              { id: '8', key: 'F9',  label: 'Customer',    targetPath: '/customer' },
              { id: '9', key: 'F10', label: 'Settings',    targetPath: '/settings' },
            ];
          })(),
        },
        localActivationId: localActivation || null,
        dbReady: true,
        dbError: null,
      });

      // Smart-Latch Logic: Only save the DB ID locally if it actually matches the current hardware.
      // This prevents "Auto-Latch Poisoning" when restoring a database from another device.
      if (!localActivation && data.settings['authorizedMachineId']) {
        const dbId = data.settings['authorizedMachineId'];
        if (dbId === machineId) {
          await invoke('set_hwid_activation', { id: dbId }).catch(console.error);
          set({ localActivationId: dbId });
        }
      }
    } catch (err: any) {
      console.error('[DB] Failed to initialize:', err);
      set({ dbReady: false, dbError: String(err?.message ?? err) });
    }
  },

  // ── Purchases ───────────────────────────────────────────────────────────────
  purchases:      [],
  nextPurchaseNo: 1,

  addPurchase: async (p) => {
    let entry: Purchase | null = null;
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('purchase', db);
        const billNo = `PUR-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO purchases (id,bill_no,type,date,description,invoice_no,vehicle_no,details,rate,quantity,carriage,amount,total_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, billNo, p.type, p.date, p.description || '', p.invoiceNo || '', p.vehicleNo || '', p.details, p.rate, p.quantity, p.carriage, p.amount, p.totalAmount]
        );
        entry = { ...p, id, billNo };
      });
      if (entry) {
        set(s => ({ purchases: [entry!, ...s.purchases], nextPurchaseNo: no + 1 }));
      }
    } catch (err) {
      console.error('[Store] addPurchase failed:', err);
      throw err;
    }
  },

  updatePurchase: async (id, data) => {
    try {
      const db = await getDB();
      const current = get().purchases.find(x => x.id === id)!;
      const updated = { ...current, ...data };
      await db.execute(
        `UPDATE purchases SET type=?,date=?,description=?,invoice_no=?,vehicle_no=?,details=?,rate=?,quantity=?,carriage=?,amount=?,total_amount=? WHERE id=?`,
        [updated.type, updated.date, updated.description || '', updated.invoiceNo || '', updated.vehicleNo || '', updated.details, updated.rate, updated.quantity, updated.carriage, updated.amount, updated.totalAmount, id]
      );
      set(s => ({ purchases: s.purchases.map(x => x.id === id ? updated : x) }));
    } catch (err) {
      console.error('[Store] updatePurchase failed:', err);
      throw err;
    }
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
    let entry: Sale | null = null;
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('sale', db);
        const billNo = `SAL-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO sales (id,bill_no,type,date,description,quantity,rate,amount) VALUES (?,?,?,?,?,?,?,?)`,
          [id, billNo, s.type, s.date, s.description || '', s.quantity, s.rate, s.amount]
        );
        entry = { ...s, id, billNo };
      });
      if (entry) {
        set(st => ({ sales: [entry!, ...st.sales], nextSaleNo: no + 1 }));
      }
    } catch (err) {
      console.error('[Store] addSale failed:', err);
      throw err;
    }
  },

  updateSale: async (id, data) => {
    try {
      const db = await getDB();
      const current = get().sales.find(x => x.id === id)!;
      const updated = { ...current, ...data };
      await db.execute(
        `UPDATE sales SET type=?,date=?,description=?,quantity=?,rate=?,amount=? WHERE id=?`,
        [updated.type, updated.date, updated.description || '', updated.quantity, updated.rate, updated.amount, id]
      );
      set(s => ({ sales: s.sales.map(x => x.id === id ? updated : x) }));
    } catch (err) {
      console.error('[Store] updateSale failed:', err);
      throw err;
    }
  },

  deleteSale: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM sales WHERE id=?', [id]);
    set(s => ({ sales: s.sales.filter(x => x.id !== id) }));
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
    await runInTransaction(async (db) => {
      await db.execute('DELETE FROM expense_categories WHERE id=?', [id]);
      await db.execute('DELETE FROM expense_entries WHERE category_id=?', [id]);
    });
    set(s => ({
      expenseCategories: s.expenseCategories.filter(c => c.id !== id),
      expenseEntries: s.expenseEntries.filter(e => e.categoryId !== id),
    }));
  },
  addExpenseEntry: async (e) => {
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('expense', db);
        const billNo = `EXP-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO expense_entries (id,category_id,bill_no,date,details,amount) VALUES (?,?,?,?,?,?)`,
          [id, e.categoryId, billNo, e.date, e.details, e.amount]
        );
        const entry: ExpenseEntry = { ...e, id, billNo };
        set(s => ({ expenseEntries: [entry, ...s.expenseEntries], nextExpenseNo: no + 1 }));
      });
    } catch (err) {
      console.error('[Store] addExpenseEntry failed:', err);
      throw err;
    }
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
    return id;
  },
  updateAssetCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE asset_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ assetCategories: s.assetCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteAssetCategory: async (id) => {
    await runInTransaction(async (db) => {
      await db.execute('DELETE FROM asset_categories WHERE id=?', [id]);
      await db.execute('DELETE FROM asset_entries WHERE category_id=?', [id]);
    });
    set(s => ({
      assetCategories: s.assetCategories.filter(c => c.id !== id),
      assetEntries: s.assetEntries.filter(e => e.categoryId !== id),
    }));
  },
  addAssetEntry: async (e) => {
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('asset', db);
        const billNo = `AST-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO asset_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
          [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
        );
        const entry: AssetEntry = { ...e, id, billNo };
        set(s => ({ assetEntries: [entry, ...s.assetEntries], nextAssetNo: no + 1 }));
      });
    } catch (err) {
      console.error('[Store] addAssetEntry failed:', err);
      throw err;
    }
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
    await runInTransaction(async (db) => {
      await db.execute('DELETE FROM liability_categories WHERE id=?', [id]);
      await db.execute('DELETE FROM liability_entries WHERE category_id=?', [id]);
    });
    set(s => ({
      liabilityCategories: s.liabilityCategories.filter(c => c.id !== id),
      liabilityEntries: s.liabilityEntries.filter(e => e.categoryId !== id),
    }));
  },
  addLiabilityEntry: async (e) => {
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('liability', db);
        const billNo = `LIA-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO liability_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
          [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
        );
        const entry: LiabilityEntry = { ...e, id, billNo };
        set(s => ({ liabilityEntries: [entry, ...s.liabilityEntries], nextLiabilityNo: no + 1 }));
      });
    } catch (err) {
      console.error('[Store] addLiabilityEntry failed:', err);
      throw err;
    }
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
    await runInTransaction(async (db) => {
      await db.execute('DELETE FROM customers WHERE id=?', [id]);
      await db.execute('DELETE FROM customer_entries WHERE customer_id=?', [id]);
    });
    set(s => ({
      customers: s.customers.filter(c => c.id !== id),
      customerEntries: s.customerEntries.filter(e => e.customerId !== id),
    }));
  },
  addCustomerEntry: async (e) => {
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('customer', db);
        const billNo = `CST-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO customer_entries (id,customer_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
          [id, e.customerId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
        );
        const entry: CustomerEntry = { ...e, id, billNo };
        set(s => ({ customerEntries: [entry, ...s.customerEntries], nextCustomerNo: no + 1 }));
      });
    } catch (err) {
      console.error('[Store] addCustomerEntry failed:', err);
      throw err;
    }
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

  // ── Capital ────────────────────────────────────────────────────────────────
  capitalCategories: [],
  capitalEntries:    [],
  nextCapitalNo:     1,

  addCapitalCategory: async (name) => {
    const db = await getDB();
    const id = uid();
    await db.execute('INSERT INTO capital_categories (id,name) VALUES (?,?)', [id, name]);
    set(s => ({ capitalCategories: [...s.capitalCategories, { id, name }] }));
    return id;
  },
  updateCapitalCategory: async (id, name) => {
    const db = await getDB();
    await db.execute('UPDATE capital_categories SET name=? WHERE id=?', [name, id]);
    set(s => ({ capitalCategories: s.capitalCategories.map(c => c.id === id ? { ...c, name } : c) }));
  },
  deleteCapitalCategory: async (id) => {
    await runInTransaction(async (db) => {
      await db.execute('DELETE FROM capital_categories WHERE id=?', [id]);
      await db.execute('DELETE FROM capital_entries WHERE category_id=?', [id]);
    });
    set(s => ({
      capitalCategories: s.capitalCategories.filter(c => c.id !== id),
      capitalEntries: s.capitalEntries.filter(e => e.categoryId !== id),
    }));
  },
  addCapitalEntry: async (e) => {
    let no = 0;
    try {
      await runInTransaction(async (db) => {
        no = await getAndBumpCounter('capital', db);
        const billNo = `CAP-${String(no).padStart(2, '0')}`;
        const id = uid();
        await db.execute(
          `INSERT INTO capital_entries (id,category_id,bill_no,date,description,debit,credit,balance) VALUES (?,?,?,?,?,?,?,?)`,
          [id, e.categoryId, billNo, e.date, e.description, e.debit, e.credit, e.balance]
        );
        const entry: CapitalEntry = { ...e, id, billNo };
        set(s => ({ capitalEntries: [entry, ...s.capitalEntries], nextCapitalNo: no + 1 }));
      });
    } catch (err) {
      console.error('[Store] addCapitalEntry failed:', err);
      throw err;
    }
  },
  updateCapitalEntry: async (id, data) => {
    const db = await getDB();
    const current = get().capitalEntries.find(x => x.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      `UPDATE capital_entries SET date=?,description=?,debit=?,credit=?,balance=? WHERE id=?`,
      [updated.date, updated.description, updated.debit, updated.credit, updated.balance, id]
    );
    set(s => ({ capitalEntries: s.capitalEntries.map(x => x.id === id ? updated : x) }));
  },
  deleteCapitalEntry: async (id) => {
    const db = await getDB();
    await db.execute('DELETE FROM capital_entries WHERE id=?', [id]);
    set(s => ({ capitalEntries: s.capitalEntries.filter(x => x.id !== id) }));
  },

  // ── Settings & Users ─────────────────────────────────────────────────────────
  settings: {
    startDate:    '',
    softwareName: 'HR Filling Station',
    hiddenMenus:  [],
    users:        [],
    zoomLevel:    1.0,
    licenseStartDate:    '',
    licenseEndDate:      '',
    authorizedMachineId: '',
    shortcuts:           [],
  },

  updateSettings: async (updates) => {
    const current = get().settings;
    const merged  = { ...current, ...updates };
    if (updates.startDate    !== undefined) await setSetting('startDate',    updates.startDate);
    if (updates.softwareName !== undefined) await setSetting('softwareName', updates.softwareName);
    if (updates.hiddenMenus  !== undefined) await setSetting('hiddenMenus',  JSON.stringify(updates.hiddenMenus));
    if (updates.licenseStartDate    !== undefined) await setSetting('licenseStartDate',    updates.licenseStartDate);
    if (updates.licenseEndDate      !== undefined) await setSetting('licenseEndDate',      updates.licenseEndDate);
    if (updates.authorizedMachineId !== undefined) {
      await setSetting('authorizedMachineId', updates.authorizedMachineId);
      // Also save to local persistent file
      await invoke('set_hwid_activation', { id: updates.authorizedMachineId }).catch(console.error);
      set({ localActivationId: updates.authorizedMachineId });
    }
    if (updates.zoomLevel    !== undefined) await setSetting('zoomLevel',    String(updates.zoomLevel));
    if (updates.shortcuts    !== undefined) await setSetting('shortcuts',    JSON.stringify(updates.shortcuts));

    set({ settings: merged });
  },

  addUser: async (u) => {
    const db = await getDB();
    const id  = uid();
    const now = new Date().toISOString();
    await db.execute(
      'INSERT INTO users (id,name,email,password,role,created_at,cnic,dob) VALUES (?,?,?,?,?,?,?,?)',
      [id, u.name, u.email, u.password, u.role, now, u.cnic || '', u.dob || '']
    );
    const newUser: User = { ...u, id, createdAt: now };
    set(s => ({ settings: { ...s.settings, users: [newUser, ...s.settings.users] } }));
  },
  updateUser: async (id, data) => {
    const db = await getDB();
    const current = get().settings.users.find(u => u.id === id)!;
    const updated = { ...current, ...data };
    await db.execute(
      'UPDATE users SET name=?,email=?,password=?,role=?,cnic=?,dob=? WHERE id=?',
      [updated.name, updated.email, updated.password, updated.role, updated.cnic || '', updated.dob || '', id]
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

  // ── UI State ─────────────────────────────────────────────────────────────────
  isLoading: false,
  triggerSplash: () => {
    set({ isLoading: true });
    setTimeout(() => set({ isLoading: false }), 700);
  },

  // ── Reset All Data ────────────────────────────────────────────────────────────
  resetAllData: async () => {
    await runInTransaction(async (db) => {
      const tables = [
        'purchases', 'sales',
        'expense_entries', 'expense_categories',
        'asset_entries', 'asset_categories',
        'liability_entries', 'liability_categories',
        'customer_entries', 'customers',
        'capital_entries', 'capital_categories',
      ];
      for (const t of tables) await db.execute(`DELETE FROM ${t}`);
      // Reset counters
      await db.execute(
        `UPDATE counters SET value=1 WHERE name IN ('purchase','sale','expense','asset','liability','customer','capital')`
      );
    });

    set({
      purchases: [], sales: [],
      expenseCategories: [], expenseEntries: [],
      assetCategories: [], assetEntries: [],
      liabilityCategories: [], liabilityEntries: [],
      customers: [], customerEntries: [],
      capitalCategories: [], capitalEntries: [],
      nextPurchaseNo: 1, nextSaleNo: 1,
      nextExpenseNo: 1,
      nextAssetNo: 1, nextLiabilityNo: 1, nextCustomerNo: 1, nextCapitalNo: 1,
      settings: get().settings,
    });
  },
}), {
  name: 'ebs-auth-storage',
  storage: createJSONStorage(() => localStorage),
  partialize: (state) => ({}),
}));
