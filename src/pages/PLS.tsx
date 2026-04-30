import { useMemo, useState } from 'react';
import { Activity, TrendingUp, TrendingDown, DollarSign, ShoppingCart, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, filterByStartDate, cn, today, startOfMonth, startOfYear } from '../lib/utils';
import ModuleHeader from '../components/ui/ModuleHeader';

export default function PLSPage() {
  const { purchases, sales, expenseCategories, expenseEntries, settings } = useStore();
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const stats = useMemo(() => {
    const filtered = (arr: any[]) => filterByStartDate(arr, settings.startDate).filter(e => {
      const mf = !fromDate || e.date >= fromDate;
      const mt = !toDate || e.date <= toDate;
      return mf && mt;
    });

    const filteredSales = filtered(sales);
    const filteredPurchases = filtered(purchases);
    const filteredExpenses = filtered(expenseEntries);

    const hsdSaleAmt = filteredSales.filter(s => s.type === 'HSD').reduce((s: number, e: any) => s + e.amount, 0);
    const pmgSaleAmt = filteredSales.filter(s => s.type === 'PMG').reduce((s: number, e: any) => s + e.amount, 0);
    const totalRevenue = hsdSaleAmt + pmgSaleAmt;

    const hsdPurchaseCost = filteredPurchases.filter(p => p.type === 'HSD').reduce((s: number, e: any) => s + e.totalAmount, 0);
    const pmgPurchaseCost = filteredPurchases.filter(p => p.type === 'PMG').reduce((s: number, e: any) => s + e.totalAmount, 0);
    const totalPurchaseValue = hsdPurchaseCost + pmgPurchaseCost;

    const grossProfit = totalRevenue - totalPurchaseValue;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const totalExpenses = filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const expByCategory = expenseCategories.map(cat => ({
      name: cat.name,
      amount: filteredExpenses.filter(e => e.categoryId === cat.id).reduce((s: number, e: any) => s + e.amount, 0),
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);

    return { hsdSaleAmt, pmgSaleAmt, totalRevenue, hsdPurchaseCost, pmgPurchaseCost, totalPurchaseValue, grossProfit, grossMargin, totalExpenses, netProfit, netMargin, expByCategory };
  }, [purchases, sales, expenseEntries, expenseCategories, settings.startDate, fromDate, toDate]);

  const Row = ({ label, value, sub, indent = false, bold = false, color = '' }: { label: string; value: number; sub?: string; indent?: boolean; bold?: boolean; color?: string }) => (
    <div className={cn('flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-dark-800/50', indent && 'pl-6')}>
      <span className={cn('text-[12px] text-slate-600 dark:text-dark-300', bold && 'font-black text-slate-900 dark:text-white text-[13px]', indent && 'text-slate-400')}>
        {label} {sub && <span className="text-[10px] text-slate-400 font-normal ml-1">{sub}</span>}
      </span>
      <span className={cn('text-[12px] font-black tabular-nums', bold && 'text-[14px]', color || (value >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-600'))}>
        ₨ {formatCurrency(Math.abs(value))} {value < 0 && <span className="text-[10px] text-red-400 ml-1">(Loss)</span>}
      </span>
    </div>
  );

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader title="Profit & Loss" icon={Activity} iconClassName="!bg-violet-100 !text-violet-600" />

      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50">
            <button onClick={() => { setFromDate(today()); setToDate(today()); }} className={cn('px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg', fromDate === today() && toDate === today() ? 'bg-white dark:bg-dark-900 text-violet-600 shadow-sm' : 'text-slate-500')}>Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 border-l border-slate-200 dark:border-dark-700/50 transition-all rounded-r-lg hover:bg-white dark:hover:bg-dark-900">Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 border-l border-slate-200 dark:border-dark-700/50 transition-all rounded-r-lg hover:bg-white dark:hover:bg-dark-900">Year</button>
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 border-l border-slate-200 dark:border-dark-700/50 hover:bg-white dark:hover:bg-dark-900 rounded-r-lg">All</button>
          </div>
          <input type="date" className="input !py-1.5 !px-2 !w-32 !text-xs" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          <span className="text-[10px] font-bold text-slate-400">to</span>
          <input type="date" className="input !py-1.5 !px-2 !w-32 !text-xs" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto smart-scroll p-4 pb-10 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass p-4 rounded-2xl border-l-4 border-violet-500 shadow-sm">
            <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest mb-1">Total Revenue</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(stats.totalRevenue)}</p>
          </div>
          <div className="glass p-4 rounded-2xl border-l-4 border-rose-500 shadow-sm">
            <p className="text-[9px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Purchase</p>
            <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(stats.totalPurchaseValue)}</p>
          </div>
          <div className={cn('glass p-4 rounded-2xl border-l-4 shadow-sm', stats.grossProfit >= 0 ? 'border-emerald-500' : 'border-red-500')}>
            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Gross Profit</p>
            <p className={cn('text-lg font-black tabular-nums', stats.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>₨ {formatCurrency(Math.abs(stats.grossProfit))}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{stats.grossMargin.toFixed(1)}% margin</p>
          </div>
          <div className={cn('glass p-4 rounded-2xl border-l-4 shadow-sm', stats.netProfit >= 0 ? 'border-blue-500' : 'border-red-500')}>
            <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Net Profit</p>
            <p className={cn('text-lg font-black tabular-nums', stats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600')}>₨ {formatCurrency(Math.abs(stats.netProfit))}</p>
            <p className="text-[9px] text-slate-400 mt-0.5">{stats.netMargin.toFixed(1)}% margin</p>
          </div>
        </div>

        {/* Detailed P&L Statement */}
        <div className="glass rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-xl overflow-hidden">
          {/* Revenue */}
          <div className="bg-violet-600/5 px-6 pt-5 pb-3 border-b-2 border-violet-200 dark:border-violet-900/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-violet-600" />
              <h3 className="text-[11px] font-black text-violet-600 uppercase tracking-widest">Revenue (Sales)</h3>
            </div>
            <Row label="HSD Sales" value={stats.hsdSaleAmt} indent color="text-violet-700 dark:text-violet-400" />
            <Row label="PMG Sales" value={stats.pmgSaleAmt} indent color="text-violet-700 dark:text-violet-400" />
            <Row label="Total Revenue" value={stats.totalRevenue} bold color="text-violet-700 dark:text-violet-400" />
          </div>

          {/* Purchase Value */}
          <div className="bg-rose-600/5 px-6 pt-4 pb-3 border-b-2 border-rose-200 dark:border-rose-900/30">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4 text-rose-600" />
              <h3 className="text-[11px] font-black text-rose-600 uppercase tracking-widest">Total Purchase Value</h3>
            </div>
            <Row label="HSD Purchase Cost" value={stats.hsdPurchaseCost} indent color="text-rose-700 dark:text-rose-400" />
            <Row label="PMG Purchase Cost" value={stats.pmgPurchaseCost} indent color="text-rose-700 dark:text-rose-400" />
            <Row label="Total Purchase" value={stats.totalPurchaseValue} bold color="text-rose-700 dark:text-rose-400" />
          </div>

          {/* Gross Profit */}
          <div className={cn('px-6 py-4 border-b-2', stats.grossProfit >= 0 ? 'bg-emerald-600/5 border-emerald-200 dark:border-emerald-900/30' : 'bg-red-600/5 border-red-200')}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Gross Profit / Loss</span>
              <span className={cn('text-[16px] font-black tabular-nums', stats.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                {stats.grossProfit < 0 ? '- ' : ''}₨ {formatCurrency(Math.abs(stats.grossProfit))}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Gross Margin: {stats.grossMargin.toFixed(2)}%</p>
          </div>

          {/* Operating Expenses */}
          <div className="bg-amber-600/5 px-6 pt-4 pb-3 border-b-2 border-amber-200 dark:border-amber-900/30">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-amber-600" />
              <h3 className="text-[11px] font-black text-amber-600 uppercase tracking-widest">Operating Expenses</h3>
            </div>
            {stats.expByCategory.map(cat => (
              <Row key={cat.name} label={cat.name} value={cat.amount} indent color="text-amber-700 dark:text-amber-400" />
            ))}
            {stats.expByCategory.length === 0 && (
              <p className="text-[11px] text-slate-400 italic pl-6 pb-2">No expenses recorded</p>
            )}
            <Row label="Total Expenses" value={stats.totalExpenses} bold color="text-amber-700 dark:text-amber-400" />
          </div>

          {/* Net Profit */}
          <div className={cn('px-6 py-5', stats.netProfit >= 0 ? 'bg-blue-600/5' : 'bg-red-600/5')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stats.netProfit >= 0 ? <TrendingUp className="w-5 h-5 text-blue-600" /> : <TrendingDown className="w-5 h-5 text-red-600" />}
                <span className="text-[14px] font-black text-slate-900 dark:text-white uppercase tracking-tight">Net Profit / Loss</span>
              </div>
              <span className={cn('text-[20px] font-black tabular-nums', stats.netProfit >= 0 ? 'text-blue-600' : 'text-red-600')}>
                {stats.netProfit < 0 ? '- ' : ''}₨ {formatCurrency(Math.abs(stats.netProfit))}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 text-right">Net Margin: {stats.netMargin.toFixed(2)}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
