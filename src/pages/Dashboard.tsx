import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, DollarSign,
  Package, BarChart3, Users, ArrowRight,
  Fuel, Zap, Calendar, XCircle, Keyboard, Sun, Moon,
  Mail, Shield, Clock, X, LogOut, Landmark, Printer, Activity, Wallet,
  FileText
} from 'lucide-react';
import PrintReportModal from '../components/modals/PrintReportModal';
import { useStore } from '../store/useStore';
import { useTheme } from '../contexts/ThemeContext';
import { formatCurrency, today, cn, computeFuelStats, startOfMonth } from '../lib/utils';
import loginBg from '../assets/login-bg-whatsapp.jpeg';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, ComposedChart, Line, Legend
} from 'recharts';

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
  const ss = String(now.getSeconds()).padStart(2, '0');
  const displayHH = String(hh % 12 || 12).padStart(2, '0');
  const ampm = hh >= 12 ? 'PM' : 'AM';

  const dateStr = now.toLocaleDateString('en-PK', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  return (
    <div className="flex items-center gap-2 md:gap-4">
      <div className="flex flex-col items-start select-none">
        <div className="flex items-baseline leading-none">
          <span className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{displayHH}</span>
          <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-white mx-0.5">:</span>
          <span className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{mm}</span>
          <span className="text-lg md:text-2xl font-black text-slate-900 dark:text-white mx-0.5">:</span>
          <span className="text-xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">{ss}</span>
          <span className="text-[8px] md:text-[9px] font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest ml-1 mb-0.5">{ampm}</span>
        </div>
        <div className="mt-0.5">
          <p className="text-[8px] md:text-[9px] font-bold text-slate-500 dark:text-dark-400 uppercase tracking-[0.05em]">{dateStr}</p>
        </div>
      </div>
      <button
        onClick={toggleTheme}
        className="w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all duration-300 border border-slate-200 dark:border-dark-700 bg-white/50 dark:bg-dark-800/50 shadow-sm group active:scale-95 flex-shrink-0"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4 md:w-5 md:h-5 text-amber-400" /> : <Moon className="w-4 h-4 md:w-5 md:h-5 text-primary-600" />}
      </button>
    </div>
  );
}

// ─── User Profile Card ────────────────────────────────────────────────────────
function UserCard() {
  const { currentUser, logout } = useStore();
  const [open, setOpen] = useState(false);
  if (!currentUser) return null;

  const initials = currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const joinedDate = currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-xl border border-slate-200 dark:border-dark-700 bg-white dark:bg-dark-800 shadow-sm hover:scale-[1.03] active:scale-95 transition-all duration-200">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-black text-[10px] md:text-xs shadow-md">{initials}</div>
        <div className="text-left hidden xs:block">
          <p className="text-[10px] md:text-[12px] font-black text-slate-900 dark:text-white truncate max-w-[70px] md:max-w-[90px]">{currentUser.name}</p>
          <p className="text-[8px] md:text-[9px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-wider">{currentUser.role}</p>
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 z-50 w-72 glass rounded-2xl border border-slate-200 dark:border-dark-700 shadow-2xl animate-in slide-in-from-top duration-200 overflow-hidden">
            <div className="bg-gradient-to-r from-primary-600 to-primary-800 p-5 relative">
              <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/30">{initials}</div>
                <div>
                  <p className="text-white font-black text-lg leading-tight">{currentUser.name}</p>
                  <span className={cn('inline-block mt-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full', currentUser.role === 'Admin' ? 'bg-amber-400/20 text-amber-200 border border-amber-400/30' : 'bg-white/20 text-white/80 border border-white/20')}>{currentUser.role}</span>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl"><Mail className="w-4 h-4 text-primary-500 flex-shrink-0" /><div className="min-w-0"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p><p className="text-[12px] font-bold text-slate-900 dark:text-white truncate">{currentUser.email}</p></div></div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl"><Shield className="w-4 h-4 text-emerald-500 flex-shrink-0" /><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Access Level</p><p className="text-[12px] font-bold text-slate-900 dark:text-white">{currentUser.role}</p></div></div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-dark-800 rounded-xl"><Clock className="w-4 h-4 text-violet-500 flex-shrink-0" /><div><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Member Since</p><p className="text-[12px] font-bold text-slate-900 dark:text-white">{joinedDate}</p></div></div>
              <button onClick={logout} className="w-full flex items-center justify-center gap-2 mt-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 font-black text-xs uppercase tracking-widest hover:bg-red-100 dark:hover:bg-red-900/20 transition-all active:scale-95 border border-red-200 dark:border-red-900/30"><LogOut className="w-4 h-4" />Sign Out</button>
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

function TypingTitle({ text }: { text: string }) {
  const [displayText, setDisplayText] = useState('');
  useEffect(() => {
    let index = 0;
    const timer = setInterval(() => {
      setDisplayText(text.slice(0, index));
      index++;
      if (index > text.length) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [text]);

  return (
    <h1 className="text-[13px] xs:text-[15px] sm:text-[17px] md:text-xl lg:text-2xl font-black text-white font-urdu leading-[1.8] text-center drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)] whitespace-nowrap">
      {displayText}
    </h1>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const rawExpenses = useStore(s => s.expenseEntries);
  const expenseCategories = useStore(s => s.expenseCategories);
  const settings = useStore(s => s.settings);
  const assetCategories = useStore(s => s.assetCategories);
  const liabilityCategories = useStore(s => s.liabilityCategories);
  const rawPurchases = useStore(s => s.purchases);
  const rawSales = useStore(s => s.sales);
  const customers = useStore(s => s.customers);

  if (!settings) return null;

  const plsOverrides = settings.plsOverrides || {};

  const [filter, setFilter]     = useState<'today' | 'month' | 'custom' | 'overall'>('overall');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [showKeys, setShowKeys] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);

  // ─── Data Memo ──────────────────────────────────────────────────────────────
  const dashboardStats = useMemo(() => {
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

    // ─── Derive filter date window ───────────────────────────────────────────
    let filterFrom = '';
    let filterTo   = '';
    if (filter === 'today') {
      filterFrom = t;
      filterTo   = t;
    } else if (filter === 'month') {
      filterFrom = `${currentMonth}-01`;
      filterTo   = t;
    } else if (filter === 'custom') {
      filterFrom = fromDate;
      filterTo   = toDate;
    }
    // 'overall' → filterFrom/filterTo stay '' (no date restriction)

    // Effective start: the later of settings.startDate and filterFrom
    const effectiveFrom = settings.startDate && filterFrom
      ? (settings.startDate > filterFrom ? settings.startDate : filterFrom)
      : (settings.startDate || filterFrom);
    const effectiveTo = filterTo;

    // Apply PLS overrides + date filter via shared computeFuelStats
    const hsdStats = computeFuelStats('HSD', rawPurchases, rawSales, plsOverrides, effectiveFrom, effectiveTo, {
      pur: settings.purchaseAdjustmentHSD,
      sal: settings.saleAdjustmentHSD,
      stock: settings.stockAdjustmentHSD,
      baseRate: settings.baseRateHSD
    });
    const pmgStats = computeFuelStats('PMG', rawPurchases, rawSales, plsOverrides, effectiveFrom, effectiveTo, {
      pur: settings.purchaseAdjustmentPMG,
      sal: settings.saleAdjustmentPMG,
      stock: settings.stockAdjustmentPMG,
      baseRate: settings.baseRatePMG
    });

    const hsdTPQty = hsdStats.purchase.qty;
    const hsdTPAmt = hsdStats.purchase.amt;
    const pmgTPQty = pmgStats.purchase.qty;
    const pmgTPAmt = pmgStats.purchase.amt;
    const hsdAvg   = hsdStats.purchase.avg || settings.baseRateHSD || 0;
    const pmgAvg   = pmgStats.purchase.avg || settings.baseRatePMG || 0;

    const hsdSoldQty = hsdStats.sale.qty;
    const hsdSoldAmt = hsdStats.sale.amt;
    const pmgSoldQty = pmgStats.sale.qty;
    const pmgSoldAmt = pmgStats.sale.amt;

    const hsdSaleAvg = hsdSoldQty > 0 ? hsdSoldAmt / hsdSoldQty : hsdAvg;
    const pmgSaleAvg = pmgSoldQty > 0 ? pmgSoldAmt / pmgSoldQty : pmgAvg;

    const hsdStock = hsdStats.stock.qty;
    const pmgStock = pmgStats.stock.qty;

    const periodSales     = rawSales.filter(filterFn);
    const periodPurchases = rawPurchases.filter(filterFn);
    const periodExpenses  = rawExpenses.filter(filterFn);
    const totalExp = periodExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    const grossProfit = (hsdSoldAmt + pmgSoldAmt) - (hsdSoldQty * hsdAvg + pmgSoldQty * pmgAvg);
    const margin = (hsdSoldAmt + pmgSoldAmt) > 0 ? (grossProfit / (hsdSoldAmt + pmgSoldAmt)) * 100 : 0;

    const hsdPL = hsdSoldQty > 0 ? hsdSaleAvg - hsdAvg : 0;
    const pmgPL = pmgSoldQty > 0 ? pmgSaleAvg - pmgAvg : 0;

    return {
      totalSales: hsdSoldAmt + pmgSoldAmt,
      totalSoldQty: hsdSoldQty + pmgSoldQty,
      purchaseCount: periodPurchases.length,
      saleCount: periodSales.length,
      totalExpense: totalExp,
      grossProfit,
      netProfit: grossProfit - totalExp,
      grossMargin: margin,
      hsdStock, pmgStock,
      hsdSoldQty, pmgSoldQty,
      hsdSoldAmt, pmgSoldAmt,
      hsdAvg, pmgAvg,
      hsdSaleAvg, pmgSaleAvg,
      hsdPL, pmgPL,
      hsdPurchasedQty: hsdTPQty,
      pmgPurchasedQty: pmgTPQty,
      hsdPurchasedAmt: hsdTPAmt,
      pmgPurchasedAmt: pmgTPAmt,
      hsdStockVal: hsdStock * hsdAvg,
      pmgStockVal: pmgStock * pmgAvg,
    };
  }, [rawPurchases, rawSales, rawExpenses, settings.startDate, settings.baseRateHSD, settings.baseRatePMG, settings.plsOverrides, plsOverrides, filter, fromDate, toDate]);

  // ─── Chart Data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const days = 15;
    const data = [];
    
    // We need average rates for accurate profit
    const hsdAvg = dashboardStats.hsdAvg;
    const pmgAvg = dashboardStats.pmgAvg;

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      
      const hsdDayEntries = rawSales.filter(s => s.date === dateStr && s.type === 'HSD');
      const pmgDayEntries = rawSales.filter(s => s.date === dateStr && s.type === 'PMG');
      
      const hsdSalesQty = hsdDayEntries.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
      const hsdSalesAmt = hsdDayEntries.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
      
      const pmgSalesQty = pmgDayEntries.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0);
      const pmgSalesAmt = pmgDayEntries.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      const hsdPurAmt = rawPurchases.filter(p => p.date === dateStr && p.type === 'HSD').reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);
      const pmgPurAmt = rawPurchases.filter(p => p.date === dateStr && p.type === 'PMG').reduce((sum: number, p: any) => sum + (p.totalAmount || 0), 0);

      // Actual daily profit: Sales - (Qty Sold * Avg Purchase Rate)
      const hsdProfit = hsdSalesAmt - (hsdSalesQty * hsdAvg);
      const pmgProfit = pmgSalesAmt - (pmgSalesQty * pmgAvg);
      
      data.push({
        name: d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }),
        hsdSales: hsdSalesAmt,
        pmgSales: pmgSalesAmt,
        hsdPur: hsdPurAmt,
        pmgPur: pmgPurAmt,
        hsdProfit: hsdProfit,
        pmgProfit: pmgProfit,
        Expenses: rawExpenses.filter(e => e.date === dateStr).reduce((sum: number, e: { amount?: number }) => sum + (e.amount || 0), 0)
      });
    }
    return data;
  }, [rawSales, rawPurchases, rawExpenses, dashboardStats.hsdAvg, dashboardStats.pmgAvg]);

  const distributionData = [
    { name: 'Assets', value: assetCategories.length, color: '#f59e0b' },
    { name: 'Liabilities', value: liabilityCategories.length, color: '#f97316' },
    { name: 'Customers', value: customers.length, color: '#ec4899' },
    { name: 'Expenses', value: expenseCategories.length, color: '#ef4444' },
  ];


  const fuelModules = [
    { type: 'HSD', label: 'High Speed Diesel', stock: dashboardStats.hsdStock, sold: dashboardStats.hsdSoldQty, pQty: dashboardStats.hsdPurchasedQty, stockVal: dashboardStats.hsdStockVal, soldVal: dashboardStats.hsdSoldAmt, pVal: dashboardStats.hsdPurchasedAmt, icon: Fuel, color: 'amber' },
    { type: 'PMG', label: 'Petrol / PMG', stock: dashboardStats.pmgStock, sold: dashboardStats.pmgSoldQty, pQty: dashboardStats.pmgPurchasedQty, stockVal: dashboardStats.pmgStockVal, soldVal: dashboardStats.pmgSoldAmt, pVal: dashboardStats.pmgPurchasedAmt, icon: Zap, color: 'emerald' },
  ];

  const modules = [
    { label: 'Purchase',  path: '/purchase',  icon: ShoppingCart, color: 'text-primary-600', bg: 'bg-primary-600/10 border-primary-600/20', desc: `${dashboardStats.purchaseCount} records` },
    { label: 'Sale',      path: '/sale',       icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-600/10 border-emerald-600/20', desc: `${dashboardStats.saleCount} records` },
    { label: 'Expense',   path: '/expense',    icon: DollarSign,   color: 'text-red-600', bg: 'bg-red-600/10 border-red-600/20', desc: `${expenseCategories.length} categories` },
    { label: 'Asset',     path: '/asset',      icon: Landmark,     color: 'text-amber-600', bg: 'bg-amber-600/10 border-amber-600/20', desc: `${assetCategories.length} accounts` },
    { label: 'Liability', path: '/liability',  icon: Landmark,     color: 'text-orange-600', bg: 'bg-orange-600/10 border-orange-600/20', desc: `${liabilityCategories.length} accounts` },
    { label: 'Stock',     path: '/stock',      icon: BarChart3,    color: 'text-cyan-600', bg: 'bg-cyan-600/10 border-cyan-600/20', desc: 'Real-time tracking' },
    { label: 'Customer',  path: '/customer',   icon: Users,        color: 'text-pink-600', bg: 'bg-pink-600/10 border-pink-600/20', desc: `${customers.length} registered` },
    { label: 'Capital',   path: '/capital',    icon: Wallet,       color: 'text-violet-600', bg: 'bg-violet-600/10 border-violet-600/20', desc: 'Equity' },
    { label: 'PLS',       path: '/pls',        icon: Activity,     color: 'text-emerald-600', bg: 'bg-emerald-600/10 border-emerald-600/20', desc: 'Trading Acc' },
    { label: 'BalanceSheet', path: '/balancesheet', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-600/10 border-slate-600/20', desc: 'Financials' },
    { label: 'Settings',  path: '/settings',   icon: Package,      color: 'text-blue-600', bg: 'bg-blue-600/10 border-blue-600/20', desc: 'System Configuration' },
  ].map(m => ({
    ...m,
    fkey: settings.shortcuts.find(s => s.targetPath === m.path && !s.searchParams)?.key || '—'
  }));

  const clearFilter = () => { setFilter('overall'); setFromDate(''); setToDate(''); };

  return (
    <div className="space-y-6 pb-24 h-full w-full overflow-y-auto smart-scroll">
      <div className="relative rounded-3xl md:rounded-[2rem] shadow-lg border border-slate-200/60 dark:border-dark-700/60 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in group min-h-[80px] md:min-h-[100px] px-4 md:px-6 py-4">
        {/* Background Layer with Overflow Clipping */}
        <div className="absolute inset-0 z-0 rounded-3xl md:rounded-[2rem] overflow-hidden">
          <div 
             className="absolute inset-0 opacity-80 bg-cover bg-center transition-all duration-1000 contrast-125 saturate-[1.8] blur-[2px] md:blur-smScale" 
             style={{ backgroundImage: `url(${loginBg})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/40 via-transparent to-slate-900/40" />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* 1. Fuel Icon Block (Left side) */}
        <div className="relative z-10 flex-shrink-0 hidden lg:block">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center shadow-xl border border-white/20 bg-white/10 backdrop-blur-xl">
            <Fuel className="w-8 h-8 text-white" />
          </div>
        </div>

        {/* 2. Dashboard Title Block (Center) */}
        <div className="flex-1 flex flex-col items-center justify-center relative z-10 overflow-hidden" dir="rtl">
          <div className="min-w-[300px] xs:min-w-[350px] md:min-w-[550px] lg:min-w-[650px] max-w-[95%] mx-auto px-14 py-4 bg-white/10 dark:bg-white/5 backdrop-blur-2xl rounded-[1.5rem] border border-white/20 shadow-2xl flex items-center justify-center transition-all duration-300 md:-translate-x-8">
            <TypingTitle text="حماد رحیم فلنگ اسٹیشن مینجمنٹ سسٹم" />
          </div>
        </div>

        {/* 3. Clock & Profile Block (Right side) */}
        <div className="flex items-center justify-end gap-2 md:gap-3 relative z-10">
          <div className="backdrop-blur-md rounded-2xl px-3 md:px-4 py-1.5 md:py-2 border border-white/30 dark:border-dark-700/50 shadow-lg bg-white/70 dark:bg-dark-900/70">
            <DigitalClock />
          </div>
          <div className="backdrop-blur-md rounded-2xl border border-white/30 dark:border-dark-700/50 shadow-lg bg-white/70 dark:bg-dark-900/70 ml-auto md:ml-0">
            <UserCard />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-3 md:p-4 border border-slate-200 dark:border-dark-700/50 shadow-sm">
        {/* Filter bar — horizontal scroll so nothing clips on the right */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch', paddingRight: '4px' }}>
          {/* Period buttons */}
          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl gap-1 shrink-0">
            {[{ id: 'today', label: 'Today' }, { id: 'month', label: 'Month' }, { id: 'overall', label: 'Overall' }].map(opt => (
              <button key={opt.id} onClick={() => { setFilter(opt.id as any); setFromDate(''); setToDate(''); }} className={cn('px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all whitespace-nowrap', filter === opt.id ? 'bg-primary-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white')}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Date range */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">From</span>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); if (e.target.value || toDate) setFilter('custom'); }} className="input !py-1 !px-2 !w-[110px] !text-[10px]" />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">To</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); if (fromDate || e.target.value) setFilter('custom'); }} className="input !py-1 !px-2 !w-[110px] !text-[10px]" />
          </div>
          {(filter !== 'overall' || fromDate || toDate) && (
            <button onClick={clearFilter} className="flex items-center gap-1 px-2 py-1.5 rounded-xl text-[9px] font-black text-red-500 hover:bg-red-50 transition-all uppercase tracking-wider shrink-0">
              <XCircle className="w-3 h-3" /> Clear
            </button>
          )}
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <button 
              onClick={() => setShowSummaryReport(true)} 
              className="flex items-center gap-2 px-4 py-1.5 bg-primary-600 text-white rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-primary-700 transition-all shadow-md shadow-primary-600/20"
            >
              <Printer className="w-3 h-3" /> Summary Report
            </button>
          </div>
        </div>
        {showKeys && (
          <div className="mt-4 pt-4 border-t border-slate-200 dark:border-dark-700/50 flex flex-wrap gap-3 animate-in slide-in-from-top duration-200">
            <FKey k="F1" label="Dashboard" /> <FKey k="F2" label="Purchase" /> <FKey k="F3" label="Sale" /> <FKey k="F5" label="Expense" /> <FKey k="F6" label="Asset" /> <FKey k="F7" label="Liability" /> <FKey k="F8" label="Stock" /> <FKey k="F9" label="Customer" /> <FKey k="F10" label="Settings" />
          </div>
        )}
      </div>
      <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto no-scrollbar smart-scroll pb-2">
        {[
          { label: 'Total Sales',   value: `₨ ${formatCurrency(dashboardStats.totalSales)}`,   icon: TrendingUp,   color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-600/20' },
          { label: 'Expenses',      value: `₨ ${formatCurrency(dashboardStats.totalExpense)}`, icon: XCircle,      color: 'text-red-600',     bg: 'bg-red-500/10',     border: 'border-red-600/20' },
          { label: 'Gross Profit',  value: `₨ ${formatCurrency(dashboardStats.grossProfit)}`,  icon: DollarSign,   color: 'text-primary-600', bg: 'bg-primary-500/10', border: 'border-primary-600/20' },
          { label: 'Net Profit',    value: `₨ ${formatCurrency(dashboardStats.netProfit)}`,    icon: DollarSign,   color: dashboardStats.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600', bg: 'bg-slate-500/5', border: 'border-slate-600/20' },
        ].map(s => (
          <div key={s.label} className={cn('flex-shrink-0 w-[240px] md:w-auto glass p-5 md:p-6 rounded-3xl border-l-4 shadow-xl flex flex-col', s.border)}>
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4 flex-shrink-0`}><s.icon className={`w-5 h-5 md:w-6 md:h-6 ${s.color}`} /></div>
            <p className="text-[9px] md:text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em] mb-1 truncate">{s.label}</p>
            <p className={cn('font-black tracking-tighter tabular-nums break-words break-all leading-tight w-full', s.value.length > 20 ? 'text-base md:text-lg' : s.value.length > 15 ? 'text-lg md:text-xl' : 'text-xl md:text-2xl', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fuelModules.map(f => (
          <div key={f.type} className="glass rounded-3xl p-6 md:p-8 border border-slate-200 dark:border-dark-700/50 shadow-2xl relative overflow-hidden min-w-0 group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${f.color}-500/5 rounded-bl-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500`} />
            <div className="flex items-center gap-4 md:gap-5 mb-6 md:mb-8 relative">
              <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-${f.color}-500/10 flex items-center justify-center border border-${f.color}-500/20 flex-shrink-0`}><f.icon className={`w-6 h-6 md:w-7 md:h-7 text-${f.color}-500`} /></div>
              <div className="min-w-0"><p className={`text-lg md:text-xl font-black text-${f.color}-600 dark:text-${f.color}-400 tracking-tighter truncate leading-none`}>{f.type}</p><p className="text-[9px] md:text-[10px] text-slate-500 dark:text-dark-400 font-black uppercase tracking-[0.2em] truncate mt-1">{f.label}</p></div>
            </div>
            <div className="flex items-stretch gap-4 md:gap-6 relative border-t border-slate-100 dark:border-dark-800/60 pt-6 md:pt-8">
              {[
                { label: 'Purchase',  qty: f.pQty, amt: f.pVal },
                { label: 'Sale',      qty: f.sold, amt: f.soldVal },
                { label: 'Remaining', qty: f.stock, amt: f.stockVal, highlight: true },
              ].map((col, idx, arr) => (
                <div key={col.label} className="flex-1 flex flex-col space-y-1 md:space-y-1.5 min-w-0 relative">
                  {idx < arr.length - 1 && (
                    <div className="absolute top-1 right-[-8px] md:right-[-12px] bottom-1 w-[1.5px] bg-slate-900 dark:bg-slate-100 opacity-20" />
                  )}
                  <p className="text-[10px] md:text-[11px] font-black text-slate-600 dark:text-dark-300 uppercase tracking-[0.15em] mb-1 truncate">{col.label}</p>
                  <div className="flex items-baseline gap-1 relative">
                    <span className={cn("font-black tabular-nums tracking-tighter leading-none", (col.label === 'Remaining' && col.qty < 0) ? 'text-xl md:text-2xl text-red-600' : (col.highlight ? `text-xl md:text-2xl text-${f.color}-600` : 'text-lg md:text-xl text-slate-900 dark:text-white'))}>{col.qty.toLocaleString()}</span>
                    <span className="text-[8px] md:text-[9px] font-black text-slate-900 dark:text-white uppercase">L</span>
                    {col.label === 'Remaining' && ((f.type === 'HSD' && settings.stockAdjustmentHSD !== 0) || (f.type === 'PMG' && settings.stockAdjustmentPMG !== 0)) && (
                      <span className="absolute -top-3 left-0 text-[6px] font-black uppercase bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded border border-amber-500/20">Edited</span>
                    )}
                    {col.label === 'Purchase' && ((f.type === 'HSD' && settings.purchaseAdjustmentHSD !== 0) || (f.type === 'PMG' && settings.purchaseAdjustmentPMG !== 0)) && (
                      <span className="absolute -top-3 left-0 text-[6px] font-black uppercase bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded border border-amber-500/20">Edited</span>
                    )}
                    {col.label === 'Sale' && ((f.type === 'HSD' && settings.saleAdjustmentHSD !== 0) || (f.type === 'PMG' && settings.saleAdjustmentPMG !== 0)) && (
                      <span className="absolute -top-3 left-0 text-[6px] font-black uppercase bg-amber-500/10 text-amber-600 px-1 py-0.5 rounded border border-amber-500/20">Edited</span>
                    )}
                  </div>
                  <p className="text-[10px] md:text-[11px] font-black text-slate-900 dark:text-white tracking-tight tabular-nums truncate">
                    ₨ {formatCurrency(col.amt)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modern Graphs Section (Detailed Trends) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* HSD Analysis */}
        <div className="glass rounded-[2rem] p-6 border border-slate-200 dark:border-dark-700/50 shadow-xl overflow-hidden min-h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-600">HSD Trend Analysis</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Purchase, Sale & Profit</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[8px] font-black uppercase text-slate-500">Pur</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black uppercase text-slate-500">Sale</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-black uppercase text-slate-500">Profit</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(value: any) => `₨ ${formatCurrency(value)}`}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: '900' }} 
                />
                <Bar dataKey="hsdPur" name="Purchase" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                <Bar dataKey="hsdSales" name="Sale" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                <Line type="monotone" dataKey="hsdProfit" name="Daily Profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* PMG Analysis */}
        <div className="glass rounded-[2rem] p-6 border border-slate-200 dark:border-dark-700/50 shadow-xl overflow-hidden min-h-[350px] flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-600">PMG Trend Analysis</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Purchase, Sale & Profit</p>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-[8px] font-black uppercase text-slate-500">Pur</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-[8px] font-black uppercase text-slate-500">Sale</span></div>
               <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[8px] font-black uppercase text-slate-500">Profit</span></div>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                <Tooltip 
                  formatter={(value: any) => `₨ ${formatCurrency(value)}`}
                  contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: '900' }} 
                />
                <Bar dataKey="pmgPur" name="Purchase" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                <Bar dataKey="pmgSales" name="Sale" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} isAnimationActive={false} />
                <Line type="monotone" dataKey="pmgProfit" name="Daily Profit" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expenses & Global Stats */}
        <div className="lg:col-span-2 glass rounded-[2rem] p-6 border border-slate-200 dark:border-dark-700/50 shadow-xl overflow-hidden min-h-[250px] flex flex-col">
           <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-red-600">Expense Trends</h3>
              <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /><span className="text-[8px] font-black uppercase text-slate-500">Daily Expenses</span></div>
           </div>
           <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} />
                   <Tooltip contentStyle={{ backgroundColor: 'white', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '10px', fontWeight: '900' }} />
                   <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4 px-2 mt-8">
        {modules.map(({ label, path, icon: Icon, color, bg, desc, fkey }) => (
          <Link key={path} to={path} className={cn('glass rounded-2xl p-3 md:p-4 border hover:scale-[1.03] transition-all duration-300 group shadow-md relative min-w-0', bg)}>
            <span className="absolute top-2 right-2 text-[6px] md:text-[7px] font-black text-slate-300 dark:text-dark-600 bg-white/60 dark:bg-black/20 px-1 py-0.5 rounded font-mono hidden md:block">{fkey}</span>
            <div className="flex items-start justify-between mb-2 md:mb-3">
              <div className="w-7 h-7 md:w-8 md:h-8 rounded-xl bg-white/50 dark:bg-black/20 flex items-center justify-center"><Icon className={cn("w-3.5 h-3.5 md:w-4 md:h-4", color)} /></div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-900 transition-colors" />
            </div>
            <p className="font-black text-slate-900 dark:text-white text-[10px] md:text-xs uppercase tracking-tight truncate">{label}</p>
            <p className="text-[8px] md:text-[9px] text-slate-500 dark:text-dark-500 mt-0.5 font-bold truncate">{desc}</p>
          </Link>
        ))}
      </div>

      {showSummaryReport && (
        <PrintReportModal
          isOpen={showSummaryReport}
          onClose={() => setShowSummaryReport(false)}
          title="Executive Performance Bill"
          type="dashboard_summary"
          data={[dashboardStats]}
          dateRange={filter !== 'overall' ? { 
            from: filter === 'today' ? today() : filter === 'month' ? today().substring(0, 7) + '-01' : fromDate, 
            to: filter === 'custom' ? toDate : today() 
          } : undefined}
        />
      )}
    </div>
  );
}
