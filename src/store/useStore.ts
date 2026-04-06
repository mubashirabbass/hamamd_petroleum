import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ─── Types ───────────────────────────────────────────────────────────────────

export type FuelType = 'HSD' | 'PMG';

export interface Purchase {
  id: string;
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
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface ExpenseEntry {
  id: string;
  categoryId: string;
  date: string;
  details: string;
  amount: number;
}

export interface AssetEntry {
  id: string;
  categoryId: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface LiabilityEntry {
  id: string;
  categoryId: string;
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
  role: 'Admin' | 'Staff';
  createdAt: string;
}

export interface Settings {
  startDate: string;
  users: User[];
}

// ─── Store ───────────────────────────────────────────────────────────────────

interface AppState {
  // Purchase
  purchases: Purchase[];
  addPurchase: (p: Omit<Purchase, 'id'>) => void;
  deletePurchase: (id: string) => void;

  // Sale
  sales: Sale[];
  addSale: (s: Omit<Sale, 'id'>) => void;
  deleteSale: (id: string) => void;

  // Ledger
  ledgerCategories: Category[];
  ledgerEntries: LedgerEntry[];
  addLedgerCategory: (name: string) => void;
  deleteLedgerCategory: (id: string) => void;
  addLedgerEntry: (e: Omit<LedgerEntry, 'id'>) => void;
  deleteLedgerEntry: (id: string) => void;

  // Expense
  expenseCategories: Category[];
  expenseEntries: ExpenseEntry[];
  addExpenseCategory: (name: string) => void;
  deleteExpenseCategory: (id: string) => void;
  addExpenseEntry: (e: Omit<ExpenseEntry, 'id'>) => void;
  deleteExpenseEntry: (id: string) => void;

  // Asset
  assetCategories: Category[];
  assetEntries: AssetEntry[];
  addAssetCategory: (name: string) => void;
  deleteAssetCategory: (id: string) => void;
  addAssetEntry: (e: Omit<AssetEntry, 'id'>) => void;
  deleteAssetEntry: (id: string) => void;

  // Liability
  liabilityCategories: Category[];
  liabilityEntries: LiabilityEntry[];
  addLiabilityCategory: (name: string) => void;
  deleteLiabilityCategory: (id: string) => void;
  addLiabilityEntry: (e: Omit<LiabilityEntry, 'id'>) => void;
  deleteLiabilityEntry: (id: string) => void;

  // Customer
  customers: Customer[];
  customerEntries: CustomerEntry[];
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  deleteCustomer: (id: string) => void;
  addCustomerEntry: (e: Omit<CustomerEntry, 'id'>) => void;
  deleteCustomerEntry: (id: string) => void;

  // Settings & Users
  settings: Settings;
  updateSettings: (s: Partial<Settings>) => void;
  addUser: (u: Omit<User, 'id' | 'createdAt'>) => void;
  deleteUser: (id: string) => void;

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
      addPurchase: (p) => set((s) => ({ purchases: [{ ...p, id: uid() }, ...s.purchases] })),
      deletePurchase: (id) => set((s) => ({ purchases: s.purchases.filter((x) => x.id !== id) })),

      // ── Sale ─────────────────────────────────────────────────────────
      sales: [],
      addSale: (sale) => set((s) => ({ sales: [{ ...sale, id: uid() }, ...s.sales] })),
      deleteSale: (id) => set((s) => ({ sales: s.sales.filter((x) => x.id !== id) })),

      // ── Ledger ────────────────────────────────────────────────────────
      ledgerCategories: [],
      ledgerEntries: [],
      addLedgerCategory: (name) => set((s) => ({ ledgerCategories: [...s.ledgerCategories, { id: uid(), name }] })),
      deleteLedgerCategory: (id) => set((s) => ({
        ledgerCategories: s.ledgerCategories.filter((c) => c.id !== id),
        ledgerEntries: s.ledgerEntries.filter((e) => e.categoryId !== id),
      })),
      addLedgerEntry: (e) => set((s) => ({ ledgerEntries: [{ ...e, id: uid() }, ...s.ledgerEntries] })),
      deleteLedgerEntry: (id) => set((s) => ({ ledgerEntries: s.ledgerEntries.filter((x) => x.id !== id) })),

      // ── Expense ───────────────────────────────────────────────────────
      expenseCategories: [],
      expenseEntries: [],
      addExpenseCategory: (name) => set((s) => ({ expenseCategories: [...s.expenseCategories, { id: uid(), name }] })),
      deleteExpenseCategory: (id) => set((s) => ({
        expenseCategories: s.expenseCategories.filter((c) => c.id !== id),
        expenseEntries: s.expenseEntries.filter((e) => e.categoryId !== id),
      })),
      addExpenseEntry: (e) => set((s) => ({ expenseEntries: [{ ...e, id: uid() }, ...s.expenseEntries] })),
      deleteExpenseEntry: (id) => set((s) => ({ expenseEntries: s.expenseEntries.filter((x) => x.id !== id) })),

      // ── Asset ─────────────────────────────────────────────────────────
      assetCategories: [],
      assetEntries: [],
      addAssetCategory: (name) => set((s) => ({ assetCategories: [...s.assetCategories, { id: uid(), name }] })),
      deleteAssetCategory: (id) => set((s) => ({
        assetCategories: s.assetCategories.filter((c) => c.id !== id),
        assetEntries: s.assetEntries.filter((e) => e.categoryId !== id),
      })),
      addAssetEntry: (e) => set((s) => ({ assetEntries: [{ ...e, id: uid() }, ...s.assetEntries] })),
      deleteAssetEntry: (id) => set((s) => ({ assetEntries: s.assetEntries.filter((x) => x.id !== id) })),

      // ── Liability ─────────────────────────────────────────────────────
      liabilityCategories: [],
      liabilityEntries: [],
      addLiabilityCategory: (name) => set((s) => ({ liabilityCategories: [...s.liabilityCategories, { id: uid(), name }] })),
      deleteLiabilityCategory: (id) => set((s) => ({
        liabilityCategories: s.liabilityCategories.filter((c) => c.id !== id),
        liabilityEntries: s.liabilityEntries.filter((e) => e.categoryId !== id),
      })),
      addLiabilityEntry: (e) => set((s) => ({ liabilityEntries: [{ ...e, id: uid() }, ...s.liabilityEntries] })),
      deleteLiabilityEntry: (id) => set((s) => ({ liabilityEntries: s.liabilityEntries.filter((x) => x.id !== id) })),

      // ── Customer ──────────────────────────────────────────────────────
      customers: [],
      customerEntries: [],
      addCustomer: (c) => set((s) => ({ customers: [...s.customers, { ...c, id: uid() }] })),
      deleteCustomer: (id) => set((s) => ({
        customers: s.customers.filter((c) => c.id !== id),
        customerEntries: s.customerEntries.filter((e) => e.customerId !== id),
      })),
      addCustomerEntry: (e) => set((s) => ({ customerEntries: [{ ...e, id: uid() }, ...s.customerEntries] })),
      deleteCustomerEntry: (id) => set((s) => ({ customerEntries: s.customerEntries.filter((x) => x.id !== id) })),

      // ── Settings & Users ───────────────────────────────────────────────
      settings: { 
        startDate: '', 
        users: [
          { id: 'master-001', name: 'Master Admin', email: 'master@gmail.com', password: 'master', role: 'Admin', createdAt: new Date().toISOString() }
        ] 
      },
      updateSettings: (sets) => set((s) => ({ settings: { ...s.settings, ...sets } })),
      addUser: (u) => set((s) => ({ settings: { ...s.settings, users: [{ ...u, id: uid(), createdAt: new Date().toISOString() }, ...s.settings.users ] } })),
      deleteUser: (id) => set((s) => ({ settings: { ...s.settings, users: s.settings.users.filter(x => x.id !== id) } })),

      // ── Auth ───────────────────────────────────────────────────────────
      currentUser: null,
      login: (u) => set({ currentUser: u }),
      logout: () => set({ currentUser: null }),
    }),
    { name: 'ebs-business-store' }
  )
);
