import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, BookOpen, DollarSign,
  Package, AlertTriangle, BarChart3, Users, ArrowRight,
  Fuel, Zap, Calendar, XCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, today, cn } from '../lib/utils';

export default function Dashboard() {
  const { purchases: rawPurchases, sales: rawSales, customers, expenseEntries: rawExpenses, ledgerCategories, expenseCategories, assetCategories, liabilityCategories, settings } = useStore();
  const [filter, setFilter] = useState<'today' | 'month' | 'overall'>('overall');

  const filteredData = useMemo(() => {
    const t = today();
    const currentMonth = t.substring(0, 7);

    const filterFn = (item: { date: string }) => {
      if (filter === 'today') return item.date === t;
      if (filter === 'month') return item.date.startsWith(currentMonth);
      return true; // Overall (respecting global start date below)
    };

    const basePurchases = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate) : rawPurchases;
    const baseSales = settings.startDate ? rawSales.filter(s => s.date >= settings.startDate) : rawSales;
    const baseExpenses = settings.startDate ? rawExpenses.filter(e => e.date >= settings.startDate) : rawExpenses;

    return {
      purchases: basePurchases.filter(filterFn),
      sales: baseSales.filter(filterFn),
      expenseEntries: baseExpenses.filter(filterFn)
    };
  }, [rawPurchases, rawSales, rawExpenses, settings.startDate, filter]);

  const { purchases, sales, expenseEntries } = filteredData;

  const stats = useMemo(() => {
    // Amounts (₨)
    const hsdPurchasedAmount = purchases.filter((p) => p.type === 'HSD').reduce((s, p) => s + p.totalAmount, 0);
    const pmgPurchasedAmount = purchases.filter((p) => p.type === 'PMG').reduce((s, p) => s + p.totalAmount, 0);
    const hsdSoldAmount      = sales.filter((s) => s.type === 'HSD').reduce((s, x) => s + x.amount, 0);
    const pmgSoldAmount      = sales.filter((s) => s.type === 'PMG').reduce((s, x) => s + x.amount, 0);

    // Quantities (L) - Filtered context
    const hsdPurchasedQty = purchases.filter((p) => p.type === 'HSD').reduce((s, p) => s + p.quantity, 0);
    const pmgPurchasedQty = purchases.filter((p) => p.type === 'PMG').reduce((s, p) => s + p.quantity, 0);
    const hsdSoldQty      = sales.filter((s) => s.type === 'HSD').reduce((s, x) => s + x.quantity, 0);
    const pmgSoldQty      = sales.filter((s) => s.type === 'PMG').reduce((s, x) => s + x.quantity, 0);

    const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    const profit       = (hsdSoldAmount + pmgSoldAmount) - (hsdPurchasedAmount + pmgPurchasedAmount);

    // Current Physical Stock (Always overall/relative to start date)
    const hsdOverallPurchases = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate && p.type === 'HSD') : rawPurchases.filter(p => p.type === 'HSD');
    const pmgOverallPurchases = settings.startDate ? rawPurchases.filter(p => p.date >= settings.startDate && p.type === 'PMG') : rawPurchases.filter(p => p.type === 'PMG');

    const hsdStock = hsdOverallPurchases.reduce((s, p) => s + p.quantity, 0)
                   - (settings.startDate ? rawSales.filter(s => s.date >= settings.startDate && s.type === 'HSD') : rawSales.filter(s => s.type === 'HSD')).reduce((s, x) => s + x.quantity, 0);
    const pmgStock = pmgOverallPurchases.reduce((s, p) => s + p.quantity, 0)
                   - (settings.startDate ? rawSales.filter(s => s.date >= settings.startDate && s.type === 'PMG') : rawSales.filter(s => s.type === 'PMG')).reduce((s, x) => s + x.quantity, 0);

    // Stock Valuation (Based on average purchase price)
    const hsdOverallPurchQty = hsdOverallPurchases.reduce((s, p) => s + p.quantity, 0);
    const hsdOverallPurchAmt = hsdOverallPurchases.reduce((s, p) => s + p.totalAmount, 0);
    const hsdAvgPrice = hsdOverallPurchQty > 0 ? hsdOverallPurchAmt / hsdOverallPurchQty : 0;
    const hsdStockAmt = hsdStock * hsdAvgPrice;

    const pmgOverallPurchQty = pmgOverallPurchases.reduce((s, p) => s + p.quantity, 0);
    const pmgOverallPurchAmt = pmgOverallPurchases.reduce((s, p) => s + p.totalAmount, 0);
    const pmgAvgPrice = pmgOverallPurchQty > 0 ? pmgOverallPurchAmt / pmgOverallPurchQty : 0;
    const pmgStockAmt = pmgStock * pmgAvgPrice;

    return { 
      hsdPurchasedAmount, pmgPurchasedAmount, hsdSoldAmount, pmgSoldAmount, 
      hsdPurchasedQty, pmgPurchasedQty, hsdSoldQty, pmgSoldQty,
      totalExpense, profit, hsdStock, pmgStock, hsdStockAmt, pmgStockAmt
    };
  }, [purchases, sales, expenseEntries, rawPurchases, rawSales, settings.startDate]);

  const modules = [
    { label: 'Purchase',  path: '/purchase',  icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-600/10 border-primary-600/20', desc: `${purchases.length} records` },
    { label: 'Sale',      path: '/sale',       icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600/10 border-emerald-600/20', desc: `${sales.length} records` },
    { label: 'Ledger',    path: '/ledger',     icon: BookOpen,     color: 'text-violet-600 dark:text-violet-400',  bg: 'bg-violet-600/10 border-violet-600/20',  desc: `${ledgerCategories.length} categories` },
    { label: 'Expense',   path: '/expense',    icon: DollarSign,   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-600/10 border-red-600/20',         desc: `${expenseCategories.length} categories` },
    { label: 'Asset',     path: '/asset',      icon: Package,      color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-600/10 border-blue-600/20',       desc: `${assetCategories.length} categories` },
    { label: 'Liability', path: '/liability',  icon: AlertTriangle,color: 'text-orange-600 dark:text-orange-400',  bg: 'bg-orange-600/10 border-orange-600/20',   desc: `${liabilityCategories.length} categories` },
    { label: 'Stock',     path: '/stock',      icon: BarChart3,    color: 'text-cyan-600 dark:text-cyan-400',    bg: 'bg-cyan-600/10 border-cyan-600/20',       desc: 'Real-time tracking' },
    { label: 'Customer',  path: '/customer',   icon: Users,        color: 'text-pink-600 dark:text-pink-400',    bg: 'bg-pink-600/10 border-pink-600/20',       desc: `${customers.length} registered` },
  ];

  const clearFilter = () => setFilter('overall');

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-xl shadow-primary-900/40 border-2 border-white/20">
            <Fuel className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Business Dashboard</h1>
            <p className="text-slate-500 dark:text-dark-400 text-sm font-bold uppercase tracking-widest">EBS Management Suite</p>
          </div>
        </div>

        {/* Global Date Filter Bar */}
        <div className="flex items-center bg-white dark:bg-dark-900 p-1.5 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm self-start md:self-auto">
          <div className="flex gap-1">
             {[
               { id: 'today',   label: 'Today',     icon: Calendar },
               { id: 'month',   label: 'This Month',icon: Calendar },
               { id: 'overall', label: 'Overall',   icon: BarChart3 }
             ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                    filter === opt.id 
                      ? "bg-primary-600 text-white shadow-lg shadow-primary-600/30" 
                      : "text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-dark-800"
                  )}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
             ))}
          </div>
          <div className="w-px h-6 bg-slate-200 dark:bg-dark-700 mx-2" />
          <button 
            onClick={clearFilter}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-all uppercase tracking-widest"
          >
            <XCircle className="w-4 h-4" /> Clear
          </button>
        </div>
      </div>

      {/* Primary Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Sales',     value: `₨ ${formatCurrency(stats.hsdSoldAmount + stats.pmgSoldAmount)}`, icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-600/20' },
          { label: 'Total Purchases', value: `₨ ${formatCurrency(stats.hsdPurchasedAmount + stats.pmgPurchasedAmount)}`, icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-500/10', border: 'border-primary-600/20' },
          { label: 'Total Expenses',  value: `₨ ${formatCurrency(stats.totalExpense)}`, icon: DollarSign,   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10', border: 'border-red-600/20' },
          { label: 'Gross Profit',    value: `₨ ${formatCurrency(stats.profit)}`,       icon: BarChart3,    color: stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: stats.profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10', border: stats.profit >= 0 ? 'border-emerald-600/20' : 'border-red-600/20' },
        ].map((s) => (
          <div key={s.label} className={cn("glass p-6 rounded-3xl border-l-4 shadow-xl animate-in slide-in-from-bottom duration-350 min-w-0 flex flex-col", s.border)}>
            <div className={`w-12 h-12 rounded-2xl ${s.bg} flex items-center justify-center mb-4 flex-shrink-0`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-[0.2em] mb-1 truncate w-full">{s.label}</p>
            <p className={cn("text-2xl font-black tracking-tighter tabular-nums truncate w-full", s.color)} title={s.value}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Fuel Inventory Real-time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { type: 'HSD', label: 'High Speed Diesel', stock: stats.hsdStock, stockAmt: stats.hsdStockAmt, soldAmt: stats.hsdSoldAmount, pAmt: stats.hsdPurchasedAmount, soldQty: stats.hsdSoldQty, pQty: stats.hsdPurchasedQty, icon: Fuel, color: 'amber' },
          { type: 'PMG', label: 'Petrol / Motor Gasoline', stock: stats.pmgStock, stockAmt: stats.pmgStockAmt, soldAmt: stats.pmgSoldAmount, pAmt: stats.pmgPurchasedAmount, soldQty: stats.pmgSoldQty, pQty: stats.pmgPurchasedQty, icon: Zap, color: 'emerald' },
        ].map((f) => (
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

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative border-t border-slate-100 dark:border-dark-800/60 pt-8 mt-auto">
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Purchased</p>
                <div className="flex items-baseline gap-1 w-full min-w-0">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate block" title={f.pQty.toLocaleString()}>{f.pQty.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">Ltrs</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 tabular-nums truncate w-full" title={`₨ ${formatCurrency(f.pAmt)}`}>₨ {formatCurrency(f.pAmt)}</p>
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Sold</p>
                <div className="flex items-baseline gap-1 w-full min-w-0">
                  <span className="text-2xl font-black text-slate-900 dark:text-white tabular-nums truncate block" title={f.soldQty.toLocaleString()}>{f.soldQty.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">Ltrs</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 tabular-nums truncate w-full" title={`₨ ${formatCurrency(f.soldAmt)}`}>₨ {formatCurrency(f.soldAmt)}</p>
              </div>
              <div className="space-y-1 min-w-0">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">Remaining</p>
                <div className="flex items-baseline gap-1 w-full min-w-0">
                  <span className={`text-3xl font-black text-${f.color}-600 dark:text-${f.color}-400 tabular-nums truncate block`} title={f.stock.toLocaleString()}>{f.stock.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase flex-shrink-0">Ltrs</span>
                </div>
                <p className="text-[11px] font-bold text-slate-500 tabular-nums truncate w-full" title={`₨ ${formatCurrency(f.stockAmt)}`}>₨ {formatCurrency(f.stockAmt)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Global Module Access */}
      <div>
        <div className="flex items-center justify-between mb-5 px-1">
          <h2 className="text-[10px] font-black text-slate-500 dark:text-dark-400 uppercase tracking-[0.3em]">Module Quick Access</h2>
          <div className="h-px flex-1 bg-slate-200 dark:bg-dark-700/50 mx-6" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modules.map(({ label, path, icon: Icon, color, bg, desc }) => (
            <Link
              key={path}
              to={path}
              className={cn(
                "glass rounded-2xl p-5 border hover:scale-[1.03] active:scale-95 transition-all duration-300 group shadow-md",
                bg
              )}
            >
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
