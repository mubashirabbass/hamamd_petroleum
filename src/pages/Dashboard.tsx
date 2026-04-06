import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, TrendingUp, BookOpen, DollarSign,
  Package, AlertTriangle, BarChart3, Users, ArrowRight,
  Fuel, Zap
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../lib/utils';

export default function Dashboard() {
  const { purchases, sales, customers, expenseEntries, ledgerCategories, expenseCategories, assetCategories, liabilityCategories } = useStore();

  const stats = useMemo(() => {
    const hsdPurchased = purchases.filter((p) => p.type === 'HSD').reduce((s, p) => s + p.totalAmount, 0);
    const pmgPurchased = purchases.filter((p) => p.type === 'PMG').reduce((s, p) => s + p.totalAmount, 0);
    const hsdSold      = sales.filter((s) => s.type === 'HSD').reduce((s, x) => s + x.amount, 0);
    const pmgSold      = sales.filter((s) => s.type === 'PMG').reduce((s, x) => s + x.amount, 0);
    const totalExpense = expenseEntries.reduce((s, e) => s + e.amount, 0);
    const profit       = (hsdSold + pmgSold) - (hsdPurchased + pmgPurchased);

    const hsdStock = purchases.filter((p) => p.type === 'HSD').reduce((s, p) => s + p.quantity, 0)
                   - sales.filter((s) => s.type === 'HSD').reduce((s, x) => s + x.quantity, 0);
    const pmgStock = purchases.filter((p) => p.type === 'PMG').reduce((s, p) => s + p.quantity, 0)
                   - sales.filter((s) => s.type === 'PMG').reduce((s, x) => s + x.quantity, 0);

    return { hsdPurchased, pmgPurchased, hsdSold, pmgSold, totalExpense, profit, hsdStock, pmgStock };
  }, [purchases, sales, expenseEntries]);

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

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-lg shadow-primary-900/50">
          <Fuel className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">EBS Business Manager</h1>
          <p className="text-slate-500 dark:text-dark-400 text-sm">HSD & PMG Petroleum Management Suite</p>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Sales',     value: `₨ ${formatCurrency(stats.hsdSold + stats.pmgSold)}`, icon: TrendingUp,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Total Purchases', value: `₨ ${formatCurrency(stats.hsdPurchased + stats.pmgPurchased)}`, icon: ShoppingCart, color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-500/10' },
          { label: 'Total Expenses',  value: `₨ ${formatCurrency(stats.totalExpense)}`, icon: DollarSign,   color: 'text-red-600 dark:text-red-400',     bg: 'bg-red-500/10' },
          { label: 'Gross Profit',    value: `₨ ${formatCurrency(stats.profit)}`,       icon: BarChart3,    color: stats.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bg: stats.profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-xs text-slate-500 dark:text-dark-400 uppercase tracking-wide">{s.label}</p>
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Fuel Stock Overview */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { type: 'HSD', label: 'High Speed Diesel', stock: stats.hsdStock, sold: stats.hsdSold, purchased: stats.hsdPurchased, icon: Fuel, color: 'amber' },
          { type: 'PMG', label: 'Petrol / Motor Gasoline', stock: stats.pmgStock, sold: stats.pmgSold, purchased: stats.pmgPurchased, icon: Zap, color: 'emerald' },
        ].map((f) => (
          <div key={f.type} className="glass rounded-xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-xl bg-${f.color}-500/10 flex items-center justify-center`}>
                <f.icon className={`w-5 h-5 text-${f.color}-400`} />
              </div>
              <div>
                <p className={`font-bold text-${f.color}-600 dark:text-${f.color}-400`}>{f.type}</p>
                <p className="text-xs text-slate-500 dark:text-dark-400">{f.label}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-xs text-slate-500 dark:text-dark-400">In Stock</p><p className={`font-semibold text-${f.color}-600 dark:text-${f.color}-400`}>{f.stock.toFixed(0)} L</p></div>
              <div><p className="text-xs text-slate-500 dark:text-dark-400">Purchased</p><p className="font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(f.purchased)}</p></div>
              <div><p className="text-xs text-slate-500 dark:text-dark-400">Sold</p><p className="font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(f.sold)}</p></div>
            </div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wide mb-3">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {modules.map(({ label, path, icon: Icon, color, bg, desc }) => (
            <Link
              key={path}
              to={path}
              className={`glass rounded-xl p-4 border hover:scale-[1.02] transition-all duration-200 group ${bg}`}
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <ArrowRight className="w-4 h-4 text-slate-400 dark:text-dark-600 group-hover:text-slate-600 dark:group-hover:text-dark-300 transition-colors" />
              </div>
              <p className="font-semibold text-slate-900 dark:text-white text-sm">{label}</p>
              <p className="text-xs text-slate-500 dark:text-dark-400 mt-0.5">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
