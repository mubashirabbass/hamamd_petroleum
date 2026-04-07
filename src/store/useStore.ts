import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FuelType = 'HSD' | 'PMG';

export interface Purchase {
  id: string;
  billNo: string;
  type: FuelType;
  date: string;
  details: string;
  rate: number;
  quantity: number;
  carriage: number;
  amount: number;
  totalAmount: number;
}

export interface Sale {
  id: string;
  billNo: string;
  type: FuelType;
  date: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Category {
  id: string;
  name: string;
}

export interface LedgerEntry {
  id: string;
  categoryId: string;
  billNo: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ExpenseEntry {
  id: string;
  categoryId: string;
  billNo: string;
  date: string;
  details: string;
  amount: number;
}

export interface AssetEntry {
  id: string;
  categoryId: string;
  billNo: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LiabilityEntry {
  id: string;
  categoryId: string;
  billNo: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
}

export interface CustomerEntry {
  id: string;
  customerId: string;
  billNo: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'Admin' | 'Staff' | 'Developer';
  createdAt: string;
}

export interface Settings {
  startDate: string;
  softwareName: string;
  hiddenMenus: string[];
  users: User[];
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface AppState {
  // Purchase
  purchases: Purchase[];
  nextPurchaseNo: number;
  addPurchase: (p: Omit<Purchase, 'id' | 'billNo'>) => void;
  updatePurchase: (id: string, p: Partial<Purchase>) => void;
  deletePurchase: (id: string) => void;

  // Sale
  sales: Sale[];
  nextSaleNo: number;
  addSale: (s: Omit<Sale, 'id' | 'billNo'>) => void;
  updateSale: (id: string, s: Partial<Sale>) => void;
  deleteSale: (id: string) => void;

  // Ledger
  ledgerCategories: Category[];
  ledgerEntries: LedgerEntry[];
  nextLedgerNo: number;
  addLedgerCategory: (name: string) => void;
  updateLedgerCategory: (id: string, name: string) => void;
  deleteLedgerCategory: (id: string) => void;
  addLedgerEntry: (e: Omit<LedgerEntry, 'id' | 'billNo'>) => void;
  updateLedgerEntry: (id: string, e: Partial<LedgerEntry>) => void;
  deleteLedgerEntry: (id: string) => void;

  // Expense
  expenseCategories: Category[];
  expenseEntries: ExpenseEntry[];
  nextExpenseNo: number;
  addExpenseCategory: (name: string) => void;
  updateExpenseCategory: (id: string, name: string) => void;
  deleteExpenseCategory: (id: string) => void;
  addExpenseEntry: (e: Omit<ExpenseEntry, 'id' | 'billNo'>) => void;
  updateExpenseEntry: (id: string, e: Partial<ExpenseEntry>) => void;
  deleteExpenseEntry: (id: string) => void;

  // Asset
  assetCategories: Category[];
  assetEntries: AssetEntry[];
  nextAssetNo: number;
  addAssetCategory: (name: string) => void;
  updateAssetCategory: (id: string, name: string) => void;
  deleteAssetCategory: (id: string) => void;
  addAssetEntry: (e: Omit<AssetEntry, 'id' | 'billNo'>) => void;
  updateAssetEntry: (id: string, e: Partial<AssetEntry>) => void;
  deleteAssetEntry: (id: string) => void;

  // Liability
  liabilityCategories: Category[];
  liabilityEntries: LiabilityEntry[];
  nextLiabilityNo: number;
  addLiabilityCategory: (name: string) => void;
  updateLiabilityCategory: (id: string, name: string) => void;
  deleteLiabilityCategory: (id: string) => void;
  addLiabilityEntry: (e: Omit<LiabilityEntry, 'id' | 'billNo'>) => void;
  updateLiabilityEntry: (id: string, e: Partial<LiabilityEntry>) => void;
  deleteLiabilityEntry: (id: string) => void;

  // Customer
  customers: Customer[];
  customerEntries: CustomerEntry[];
  nextCustomerNo: number;
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  updateCustomer: (id: string, c: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  addCustomerEntry: (e: Omit<CustomerEntry, 'id' | 'billNo'>) => void;
  updateCustomerEntry: (id: string, e: Partial<CustomerEntry>) => void;
  deleteCustomerEntry: (id: string) => void;

  // Settings & Users
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, u: Partial<User>) => void;
  deleteUser: (id: string) => void;

  // Reset
  resetAllData: () => void;

  // Auth
  currentUser: User | null;
  login: (u: User) => void;
  logout: () => void;
}

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      // ── Purchase ──────────────────────────────────────────────────────
      purchases: [],
      nextPurchaseNo: 1,
      addPurchase: (p) => set((s) => {
        const billNo = `PUR-${String(s.nextPurchaseNo).padStart(2, '0')}`;
        return { 
          purchases: [{ ...p, id: uid(), billNo }, ...s.purchases],
          nextPurchaseNo: s.nextPurchaseNo + 1
        };
      }),
      updatePurchase: (id, data) => set((s) => ({ purchases: s.purchases.map(x => x.id === id ? { ...x, ...data } : x) })),
      deletePurchase: (id) => set((s) => ({ purchases: s.purchases.filter((x) => x.id !== id) })),

      // ── Sale ─────────────────────────────────────────────────────────
      sales: [],
      nextSaleNo: 1,
      addSale: (sale) => set((s) => {
        const billNo = `SAL-${String(s.nextSaleNo).padStart(2, '0')}`;
        return { 
          sales: [{ ...sale, id: uid(), billNo }, ...s.sales],
          nextSaleNo: s.nextSaleNo + 1
        };
      }),
      updateSale: (id, data) => set((s) => ({ sales: s.sales.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteSale: (id) => set((s) => ({ sales: s.sales.filter((x) => x.id !== id) })),

      // ── Ledger ────────────────────────────────────────────────────────
      ledgerCategories: [],
      ledgerEntries: [],
      nextLedgerNo: 1,
      addLedgerCategory: (name) => set((s) => ({ ledgerCategories: [...s.ledgerCategories, { id: uid(), name }] })),
      updateLedgerCategory: (id, name) => set((s) => ({
        ledgerCategories: s.ledgerCategories.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
      deleteLedgerCategory: (id) => set((s) => ({
        ledgerCategories: s.ledgerCategories.filter((c) => c.id !== id),
        ledgerEntries: s.ledgerEntries.filter((e) => e.categoryId !== id),
      })),
      addLedgerEntry: (e) => set((s) => {
        const billNo = `LDG-${String(s.nextLedgerNo).padStart(2, '0')}`;
        return { 
          ledgerEntries: [{ ...e, id: uid(), billNo }, ...s.ledgerEntries],
          nextLedgerNo: s.nextLedgerNo + 1
        };
      }),
      updateLedgerEntry: (id, data) => set((s) => ({ ledgerEntries: s.ledgerEntries.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteLedgerEntry: (id) => set((s) => ({ ledgerEntries: s.ledgerEntries.filter((x) => x.id !== id) })),

      // ── Expense ───────────────────────────────────────────────────────
      expenseCategories: [],
      expenseEntries: [],
      nextExpenseNo: 1,
      addExpenseCategory: (name) => set((s) => ({ expenseCategories: [...s.expenseCategories, { id: uid(), name }] })),
      updateExpenseCategory: (id, name) => set((s) => ({
        expenseCategories: s.expenseCategories.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
      deleteExpenseCategory: (id) => set((s) => ({
        expenseCategories: s.expenseCategories.filter((c) => c.id !== id),
        expenseEntries: s.expenseEntries.filter((e) => e.categoryId !== id),
      })),
      addExpenseEntry: (e) => set((s) => {
        const billNo = `EXP-${String(s.nextExpenseNo).padStart(2, '0')}`;
        return { 
          expenseEntries: [{ ...e, id: uid(), billNo }, ...s.expenseEntries],
          nextExpenseNo: s.nextExpenseNo + 1
        };
      }),
      updateExpenseEntry: (id, data) => set((s) => ({ expenseEntries: s.expenseEntries.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteExpenseEntry: (id) => set((s) => ({ expenseEntries: s.expenseEntries.filter((x) => x.id !== id) })),

      // ── Asset ─────────────────────────────────────────────────────────
      assetCategories: [],
      assetEntries: [],
      nextAssetNo: 1,
      addAssetCategory: (name) => set((s) => ({ assetCategories: [...s.assetCategories, { id: uid(), name }] })),
      updateAssetCategory: (id, name) => set((s) => ({
        assetCategories: s.assetCategories.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
      deleteAssetCategory: (id) => set((s) => ({
        assetCategories: s.assetCategories.filter((c) => c.id !== id),
        assetEntries: s.assetEntries.filter((e) => e.categoryId !== id),
      })),
      addAssetEntry: (e) => set((s) => {
        const billNo = `AST-${String(s.nextAssetNo).padStart(2, '0')}`;
        return { 
          assetEntries: [{ ...e, id: uid(), billNo }, ...s.assetEntries],
          nextAssetNo: s.nextAssetNo + 1
        };
      }),
      updateAssetEntry: (id, data) => set((s) => ({ assetEntries: s.assetEntries.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteAssetEntry: (id) => set((s) => ({ assetEntries: s.assetEntries.filter((x) => x.id !== id) })),

      // ── Liability ─────────────────────────────────────────────────────
      liabilityCategories: [],
      liabilityEntries: [],
      nextLiabilityNo: 1,
      addLiabilityCategory: (name) => set((s) => ({ liabilityCategories: [...s.liabilityCategories, { id: uid(), name }] })),
      updateLiabilityCategory: (id, name) => set((s) => ({
        liabilityCategories: s.liabilityCategories.map((c) => (c.id === id ? { ...c, name } : c)),
      })),
      deleteLiabilityCategory: (id) => set((s) => ({
        liabilityCategories: s.liabilityCategories.filter((c) => c.id !== id),
        liabilityEntries: s.liabilityEntries.filter((e) => e.categoryId !== id),
      })),
      addLiabilityEntry: (e) => set((s) => {
        const billNo = `LIA-${String(s.nextLiabilityNo).padStart(2, '0')}`;
        return { 
          liabilityEntries: [{ ...e, id: uid(), billNo }, ...s.liabilityEntries],
          nextLiabilityNo: s.nextLiabilityNo + 1
        };
      }),
      updateLiabilityEntry: (id, data) => set((s) => ({ liabilityEntries: s.liabilityEntries.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteLiabilityEntry: (id) => set((s) => ({ liabilityEntries: s.liabilityEntries.filter((x) => x.id !== id) })),

      // ── Customer ──────────────────────────────────────────────────────
      customers: [],
      customerEntries: [],
      nextCustomerNo: 1,
      addCustomer: (c) => set((s) => ({ customers: [...s.customers, { ...c, id: uid() }] })),
      updateCustomer: (id, data) => set((s) => ({
        customers: s.customers.map((c) => (c.id === id ? { ...c, ...data } : c)),
      })),
      deleteCustomer: (id) => set((s) => ({
        customers: s.customers.filter((c) => c.id !== id),
        customerEntries: s.customerEntries.filter((e) => e.customerId !== id),
      })),
      addCustomerEntry: (e) => set((s) => {
        const billNo = `CST-${String(s.nextCustomerNo).padStart(2, '0')}`;
        return { 
          customerEntries: [{ ...e, id: uid(), billNo }, ...s.customerEntries],
          nextCustomerNo: s.nextCustomerNo + 1
        };
      }),
      updateCustomerEntry: (id, data) => set((s) => ({ customerEntries: s.customerEntries.map(x => x.id === id ? { ...x, ...data } : x) })),
      deleteCustomerEntry: (id) => set((s) => ({ customerEntries: s.customerEntries.filter((x) => x.id !== id) })),

      // ── Settings & Users ───────────────────────────────────────────────
      settings: { 
        startDate: '', 
        softwareName: 'EBS Petroleum',
        hiddenMenus: [],
        users: [
          { id: 'dev-001', name: 'Mubashir Abbas', email: 'mubashirabbasedu12@gmail.com', password: 'mubashir@2026', role: 'Developer', createdAt: new Date().toISOString() },
          { id: 'master-001', name: 'Master Admin', email: 'master@gmail.com', password: 'master', role: 'Admin', createdAt: new Date().toISOString() }
        ] 
      },
      updateSettings: (sets) => set((s) => ({ settings: { ...s.settings, ...sets } })),
      addUser: (u) => set((s) => ({ settings: { ...s.settings, users: [{ ...u, id: uid(), createdAt: new Date().toISOString() }, ...s.settings.users ] } })),
      updateUser: (id, data) => set((s) => ({
        settings: {
          ...s.settings,
          users: s.settings.users.map((u) => (u.id === id ? { ...u, ...data } : u)),
        },
      })),
      deleteUser: (id) => set((s) => ({ settings: { ...s.settings, users: s.settings.users.filter(x => x.id !== id) } })),

      // ── Reset ──────────────────────────────────────────────────────────
      resetAllData: () => set(() => ({
        purchases: [],
        sales: [],
        nextPurchaseNo: 1,
        nextSaleNo: 1,
        nextLedgerNo: 1,
        nextExpenseNo: 1,
        nextAssetNo: 1,
        nextLiabilityNo: 1,
        nextCustomerNo: 1,
        ledgerCategories: [],
        ledgerEntries: [],
        expenseCategories: [],
        expenseEntries: [],
        assetEntries: [],
        liabilityCategories: [],
        liabilityEntries: [],
        customers: [],
        customerEntries: []
      })),

      // ── Auth ───────────────────────────────────────────────────────────
      currentUser: null,
      login: (u) => set({ currentUser: u }),
      logout: () => set({ currentUser: null }),
    }),
    { name: 'ebs-business-store' }
  )
);
