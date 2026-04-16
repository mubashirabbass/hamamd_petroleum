import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, BookOpen, DollarSign,
  Package, AlertTriangle, BarChart3, Users, ArrowRight,
  Fuel, Zap, Calendar, XCircle, Keyboard, Sun, Moon,
  User, Mail, Shield, Clock, X, LogOut
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency, today, cn } from '../lib/utils';

// ─── Digital Clock ────────────────────────────────────────────────────────────
function DigitalClock() {
  const [now, setNow] = useState(new Date());
  const { theme, toggle: toggleTheme } = useTheme();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours();
  const mm = String(now.getMinutes()).padStart(2, '0');
  const displayHH = String(hh % 12 || 12).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';

  const dateStr = now.toLocaleDateString('en-PK', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="flex items-center gap-4">
      {/* Clock Content Group */}
      <div className="flex flex-col items-start select-none">
        {/* Time Row */}
        <div className="flex items-baseline leading-none">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {displayHH}
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white mx-0.5">:</span>
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {mm}
          </span>
          <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest ml-1 mb-0.5">
            {ampm}
          </span>
        </div>
        
        {/* Date Row - Exactly Under Time */}
        <div className="mt-0.5">
          <p className="text-[9px] font-bold text-slate-500 dark:text-dark-400 uppercase tracking-[0.05em]">
            {dateStr}
          </p>
        </div>
      </div>

      {/* Theme Toggle Button - Smaller */}
      <button
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Day Mode' : 'Switch to Night Mode'}
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 border border-slate-200 dark:border-dark-700 bg-white/50 dark:bg-dark-800/50 hover:bg-white dark:hover:bg-dark-800 shadow-sm group active:scale-95 flex-shrink-0"
      >
        {theme === 'dark' 
          ? <Sun className="w-5 h-5 text-amber-400 group-hover:rotate-45 transition-transform" /> 
          : <Moon className="w-5 h-5 text-primary-600 group-hover:-rotate-12 transition-transform" />
        }
      </button>
    </div>
  );
}

// ─── User Profile Card ────────────────────────────────────────────────────────
function UserCard() {
  const { currentUser, logout } = useStore();
  const [open, setOpen] = useState(false);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const joinedDate = currentUser.createdAt
    ? new Date(currentUser.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <div className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        title="View profile"
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm hover:scale-[1.03] active:scale-95 transition-all duration-200"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-xs shadow-md">
          {initials}
        </div>
        <div className="text-left hidden sm:block">
          <p className="text-[12px] font-black text-slate-900 dark:text-white truncate max-w-[90px]">{currentUser.name}</p>
          <p className="text-[9px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-wider">{currentUser.role}</p>
        </div>
      </button>

      {/* Details dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Card */}
          <div className="absolute right-0 top-full mt-2 z-50 w-72 glass rounded-2xl border border-slate-200 dark:border-dark-700 shadow-2xl animate-in slide-in-from-top duration-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-5 relative">
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/30">
                  {initials}
                </div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">{currentUser.name}</p>
                  <span className={cn(
                    'inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full',
                    currentUser.role === 'Admin'
                      ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                      : 'bg-white/20 text-white/80 border border-white/20'
                  )}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl">
                <Mail className="w-4 h-4 text-primary-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                  <p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{currentUser.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl">
                <Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Access Level</p>
                  <p className="text-[12px] font-bold text-slate-900 dark:text-white">{currentUser.role}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl">
                <Clock className="w-4 h-4 text-violet-500 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Since</p>
                  <p className="text-[12px] font-bold text-slate-900 dark:text-white">{joinedDate}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl">
                <User className="w-4 h-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">User ID</p>
                  <p className="text-[11px] font-mono font-bold text-slate-500 dark:text-dark-400 truncate">{currentUser.id}</p>
                </div>
              </div>

              {/* Sign Out Button at the bottom */}
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-95 border border-red-200 dark:border-red-900/30"
              >
                <LogOut className="w-4 h-4" />
                Sign Out from System
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── FKey Badge ───────────────────────────────────────────────────────────────
function FKey({ k, label }: { k: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-400 dark:text-dark-500 uppercase">
      <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-[9px] font-mono">{k}</kbd>
      {label}
    </span>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    purchases: rawPurchases, sales: rawSales, customers,
    expenseEntries: rawExpenses, expenseCategories,
    assetCategories, liabilityCategories, settings,
  } = useStore();

  const [filter, setFilter]     = useState<'today' | 'month' | 'custom' | 'overall'>('overall');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [showKeys, setShowKeys] = useState(false);

  // ── Data Filtering ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    const t = today();
    const currentMonth = t.substring(0, 7);

    const filterFn = (item: { date: string }) => {
      if (filter === 'today')  return item.date === t;
      if (filter === 'month')  return item.date.startsWith(currentMonth);
      if (filter === 'custom') {
        const afterFrom = !fromDate || item.date >= fromDate;
        const beforeTo  = !toDate   || item.date <= toDate;
        return afterFrom && beforeTo;
      }
      return true;
    };

    const basePurchases = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate) : rawPurchases;
    const baseSales     = settings.startDate ? rawSales.filter(s => s.date >= settings.startDate)     : rawSales;
    const baseExpenses  = settings.startDate ? rawExpenses.filter(e => e.date >= settings.startDate)  : rawExpenses;

    return {
      purchases:      basePurchases.filter(filterFn),
      sales:          baseSales.filter(filterFn),
      expenseEntries: baseExpenses.filter(filterFn),
    };
  }, [rawPurchases, rawSales, rawExpenses, settings.startDate, filter, fromDate, toDate]);

  const { purchases, sales, expenseEntries } = filteredData;

  const stats = useMemo(() => {
    const hsdPurchasedAmount = purchases.filter(p => p.type === 'HSD').reduce((s, p) => s + p.totalAmount, 0);
    const pmgPurchasedAmount = purchases.filter(p => p.type === 'PMG').reduce((s, p) => s + p.totalAmount, 0);
    const hsdSoldAmount      = sales.filter(s => s.type === 'HSD').reduce((s, x) => s + x.amount, 0);
    const pmgSoldAmount      = sales.filter(s => s.type === 'PMG').reduce((s, x) => s + x.amount, 0);
    const hsdPurchasedQty    = purchases.filter(p => p.type === 'HSD').reduce((s, p) => s + p.quantity, 0);
    const pmgPurchasedQty    = purchases.filter(p => p.type === 'PMG').reduce((s, p) => s + p.quantity, 0);
    const hsdSoldQty         = sales.filter(s => s.type === 'HSD').reduce((s, x) => s + x.quantity, 0);
    const pmgSoldQty         = sales.filter(s => s.type === 'PMG').reduce((s, x) => s + x.quantity, 0);
    const totalExpense        = expenseEntries.reduce((s, e) => s + e.amount, 0);
    const profit              = (hsdSoldAmount + pmgSoldAmount) - (hsdPurchasedAmount + pmgPurchasedAmount);

    const hsdOP = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate && p.type === 'HSD') : rawPurchases.filter(p => p.type === 'HSD');
    const pmgOP = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate && p.type === 'PMG') : rawPurchases.filter(p => p.type === 'PMG');
    const hsdStock = hsdOP.reduce((s, p) => s + p.quantity, 0)
                   - (settings.startDate ? rawSales.filter(s => s.date >= settings.startDate && s.type === 'HSD') : rawSales.filter(s => s.type === 'HSD')).reduce((s, x) => s + x.quantity, 0);
    const pmgStock = pmgOP.reduce((s, p) => s + p.quantity, 0)
                   - (settings.startDate ? rawSales.filter(s => s.date >= settings.startDate && s.type === 'PMG') : rawSales.filter(s => s.type === 'PMG')).reduce((s, x) => s + x.quantity, 0);

    const hsdOPQ  = hsdOP.reduce((s, p) => s + p.quantity, 0);
    const hsdOPA  = hsdOP.reduce((s, p) => s + p.totalAmount, 0);
    const hsdStockAmt = hsdStock * (hsdOPQ > 0 ? hsdOPA / hsdOPQ : 0);
    const pmgOPQ  = pmgOP.reduce((s, p) => s + p.quantity, 0);
    const pmgOPA  = pmgOP.reduce((s, p) => s + p.totalAmount, 0);
    const pmgStockAmt = pmgStock * (pmgOPQ > 0 ? pmgOPA / pmgOPQ : 0);

    return { hsdPurchasedAmount, pmgPurchasedAmount, hsdSoldAmount, pmgSoldAmount, hsdPurchasedQty, pmgPurchasedQty, hsdSoldQty, pmgSoldQty, totalExpense, profit, hsdStock, pmgStock, hsdStockAmt, pmgStockAmt };
  }, [purchases, sales, expenseEntries, rawPurchases, rawSales, settings.startDate]);

  const modules = [
    { label: 'Purchase',  path: '/purchase',  icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-600/10 border-primary-600/20', desc: `${purchases.length} records`,              fkey: 'F2' },
    { label: 'Sale',      path: '/sale',       icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-600/20', desc: `${sales.length} records`,                fkey: 'F3' },

    { label: 'Expense',   path: '/expense',    icon: DollarSign,   color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-600/10 border-red-600/20',         desc: `${expenseCategories.length} categories`, fkey: 'F5' },
    { label: 'Asset',     path: '/asset',      icon: Package,      color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-600/10 border-blue-600/20',       desc: `${assetCategories.length} categories`,   fkey: 'F6' },
    { label: 'Liability', path: '/liability',  icon: AlertTriangle,color: 'text-orange-600 dark:text-orange-400',   bg: 'bg-orange-600/10 border-orange-600/20',   desc: `${liabilityCategories.length} categories`,fkey: 'F7' },
    { label: 'Stock',     path: '/stock',      icon: BarChart3,    color: 'text-cyan-600 dark:text-cyan-400',       bg: 'bg-cyan-600/10 border-cyan-600/20',       desc: 'Real-time tracking',                     fkey: 'F8' },
    { label: 'Customer',  path: '/customer',   icon: Users,        color: 'text-pink-600 dark:text-pink-400',       bg: 'bg-pink-600/10 border-pink-600/20',       desc: `${customers.length} registered`,         fkey: 'F9' },
  ];

  const clearFilter = () => { setFilter('overall'); setFromDate(''); setToDate(''); };

  return (
    <div className="animate-fade-in space-y-6 pb-10 h-full overflow-y-auto smart-scroll pr-2">

      {/* ── Top Header: Title | Clock + Theme | User Card ── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">

        {/* Left: Petrol Icon + Title */}
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl border border-emerald-500/20 bg-emerald-600/10 flex-shrink-0">
            <Fuel className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Hammad Rahim Filling Station</h1>
            <p className="text-slate-500 dark:text-dark-400 text-sm font-bold uppercase tracking-widest">Business Dashboard</p>
          </div>
        </div>

        {/* Right: Clock (with theme toggle) + User card */}
        <div className="flex items-center gap-3">
          {/* Premium clock panel */}
          <div className="glass rounded-2xl px-4 py-2 border border-primary-500/20 shadow-lg bg-primary-500/5 dark:bg-primary-900/10">
            <DigitalClock />
          </div>

          {/* Signed-in user card */}
          <UserCard />
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="glass rounded-2xl p-4 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Quick filter pills */}
          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl gap-1 flex-shrink-0">
            {[
              { id: 'today',   label: 'Today' },
              { id: 'month',   label: 'This Month' },
              { id: 'overall', label: 'Overall' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => { setFilter(opt.id as any); setFromDate(''); setToDate(''); }}
                className={cn(
                  'px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all',
                  filter === opt.id
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-700'
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-dark-700 hidden md:block" />

          {/* Calendar date range */}
          <div className="flex items-center gap-2 flex-1 flex-wrap">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={e => { setFromDate(e.target.value); if (e.target.value || toDate) setFilter('custom'); }}
                className="input !py-1.5 !px-2 !w-36 !text-xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <input
                type="date"
                value={toDate}
                onChange={e => { setToDate(e.target.value); if (fromDate || e.target.value) setFilter('custom'); }}
                className="input !py-1.5 !px-2 !w-36 !text-xs"
              />
            </div>
            {filter === 'custom' && (
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-1 bg-primary-600/10 text-primary-600 dark:text-primary-400 rounded-lg border border-primary-600/20">
                Custom Range
              </span>
            )}
          </div>

          {/* Clear */}
          {(filter !== 'overall' || fromDate || toDate) && (
            <button
              onClick={clearFilter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all uppercase tracking-wider flex-shrink-0"
            >
              <XCircle className="w-3.5 h-3.5" /> Clear
            </button>
          )}

          {/* Keyboard shortcuts toggle */}
          <button
            onClick={() => setShowKeys(v => !v)}
            title="Show keyboard shortcuts"
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-wider flex-shrink-0 border',
              showKeys
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent'
                : 'text-slate-400 border-slate-200 dark:border-dark-700 hover:bg-slate-100 dark:hover:bg-dark-800'
            )}
          >
            <Keyboard className="w-3.5 h-3.5" /> Keys
          </button>
        </div>

        {/* Keyboard Shortcuts Panel */}
        {showKeys && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-dark-700/50 flex flex-wrap gap-3 animate-in slide-in-from-top duration-200">
            <FKey k="F1" label="Dashboard" />
            <FKey k="F2" label="Purchase" />
            <FKey k="F3" label="Sale" />

            <FKey k="F5" label="Expense" />
            <FKey k="F6" label="Asset" />
            <FKey k="F7" label="Liability" />
            <FKey k="F8" label="Stock" />
            <FKey k="F9" label="Customer" />
            <FKey k="F10" label="Settings" />
          </div>
        )}
      </div>

      {/* ── Financial Overview Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sales',     value: `₨ ${formatCurrency(stats.hsdSoldAmount + stats.pmgSoldAmount)}`,           icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-600/20' },
          { label: 'Total Purchases', value: `₨ ${formatCurrency(stats.hsdPurchasedAmount + stats.pmgPurchasedAmount)}`, icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-500/10',  border: 'border-primary-600/20' },
          { label: 'Total Expenses',  value: `₨ ${formatCurrency(stats.totalExpense)}`,                                   icon: DollarSign,   color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-500/10',      border: 'border-red-600/20' },
          { label: 'Gross Profit',    value: `₨ ${formatCurrency(stats.profit)}`,                                         icon: BarChart3,    color: stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: stats.profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: stats.profit >= 0 ? 'border-emerald-600/20' : 'border-red-600/20' },
        ].map(s => (
          <div key={s.label} className={cn('glass p-6 rounded-3xl border-l-4 shadow-xl animate-in slide-in-from-bottom duration-350 min-w-0 flex flex-col', s.border)}>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4 flex-shrink-0`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em] mb-1 truncate w-full">{s.label}</p>
            <p className={cn(
              'font-black tracking-tighter tabular-nums break-words break-all whitespace-normal leading-tight w-full',
              s.value.length > 20 ? 'text-lg' : s.value.length > 15 ? 'text-xl' : 'text-2xl',
              s.color
            )} title={s.value}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Fuel Inventory ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { type: 'HSD', label: 'High Speed Diesel',       stock: stats.hsdStock, stockAmt: stats.hsdStockAmt, soldAmt: stats.hsdSoldAmount, pAmt: stats.hsdPurchasedAmount, soldQty: stats.hsdSoldQty, pQty: stats.hsdPurchasedQty, icon: Fuel, color: 'amber' },
          { type: 'PMG', label: 'Petrol / Motor Gasoline', stock: stats.pmgStock, stockAmt: stats.pmgStockAmt, soldAmt: stats.pmgSoldAmount, pAmt: stats.pmgPurchasedAmount, soldQty: stats.pmgSoldQty, pQty: stats.pmgPurchasedQty, icon: Zap,  color: 'emerald' },
        ].map(f => (
          <div key={f.type} className="glass rounded-3xl p-8 border border-slate-200 dark:border-dark-700/50 shadow-2xl relative overflow-hidden group min-w-0">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${f.color}-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500`} />
            <div className="flex items-center gap-5 mb-8 relative min-w-0">
              <div className={`w-14 h-14 rounded-2xl bg-${f.color}-500/10 flex items-center justify-center border border-${f.color}-500/20 flex-shrink-0`}>
                <f.icon className={`w-7 h-7 text-${f.color}-500`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xl font-black text-${f.color}-600 dark:text-${f.color}-400 tracking-tighter truncate w-full`}>{f.type}</p>
                <p className="text-sm text-slate-500 dark:text-dark-400 font-bold uppercase tracking-widest truncate w-full">{f.label}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 lg:gap-6 relative border-t border-slate-100 dark:border-dark-800/60 pt-8">
              {[
                { label: 'Purchase',  qty: f.pQty,    amt: f.pAmt,    highlight: false },
                { label: 'Sale',      qty: f.soldQty, amt: f.soldAmt, highlight: false },
                { label: 'Remaining', qty: f.stock,   amt: f.stockAmt,highlight: true  },
              ].map(col => (
                <div key={col.label} className="space-y-1.5 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{col.label}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("font-black tabular-nums tracking-tighter break-all whitespace-normal leading-tight w-full", col.highlight ? `text-xl lg:text-2xl text-${f.color}-600` : 'text-lg lg:text-xl text-slate-900 dark:text-white')} title={col.qty.toLocaleString()}>
                      {col.qty.toLocaleString()}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase break-keep ml-0.5 relative -top-1 block">L</span>
                  </div>
                  <p className="text-[11px] font-bold text-slate-400 tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(col.amt)}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Module Quick Access ── */}
      <div>
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="text-[10px] font-black text-slate-500 dark:text-dark-400 uppercase tracking-[0.3em]">Module Quick Access</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-dark-700/50 mx-6" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">F1–F10 to navigate</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modules.map(({ label, path, icon: Icon, color, bg, desc, fkey }) => (
            <Link
              key={path}
              to={path}
              className={cn('glass rounded-2xl p-5 border hover:scale-[1.03] active:scale-95 transition-all duration-300 group shadow-md relative', bg)}
            >
              <span className="absolute top-2 right-2 text-[8px] font-black text-slate-300 dark:text-dark-600 bg-white/60 dark:bg-black/20 px-1.5 py-0.5 rounded font-mono">{fkey}</span>
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 dark:text-dark-700 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </div>
              <p className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">{label}</p>
              <p className="text-[10px] text-slate-500 dark:text-dark-500 mt-1 font-bold">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
