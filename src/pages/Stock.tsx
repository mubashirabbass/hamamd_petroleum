import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, filterByStartDate } from '../lib/utils';

export default function StockPage() {
  const { purchases: rawPurchases, sales: rawSales, settings } = useStore();

  const stock = useMemo(() => {
    const purchases = filterByStartDate(rawPurchases, settings.startDate);
    const sales = filterByStartDate(rawSales, settings.startDate);

    const calc = (type: 'HSD' | 'PMG') => {
      const totalPurchased = purchases.filter((p) => p.type === type).reduce((s, p) => s + p.quantity, 0);
      const totalSold      = sales.filter((s) => s.type === type).reduce((s, x) => s + x.quantity, 0);
      const current        = totalPurchased - totalSold;
      const purchaseValue  = purchases.filter((p) => p.type === type).reduce((s, p) => s + p.totalAmount, 0);
      const saleValue      = sales.filter((s) => s.type === type).reduce((s, x) => s + x.amount, 0);
      return { totalPurchased, totalSold, current, purchaseValue, saleValue };
    };
    return { HSD: calc('HSD'), PMG: calc('PMG') };
  }, [rawPurchases, rawSales, settings.startDate]);

  const cards = [
    {
      type: 'HSD' as const,
      label: 'High Speed Diesel',
      color: 'amber',
      icon: '⛽',
      data: stock.HSD,
    },
    {
      type: 'PMG' as const,
      label: 'Petrol / Motor Gasoline',
      color: 'emerald',
      icon: '⚡',
      data: stock.PMG,
    },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-cyan-600/10 dark:bg-cyan-600/20 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Stock Overview</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cards.map(({ type, label, color, icon, data }) => (
          <div key={type} className="glass rounded-2xl overflow-hidden">
            {/* Card Header */}
            <div className={`px-6 py-4 border-b border-slate-200 dark:border-dark-700/50 bg-${color}-500/5`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{icon}</span>
                <div>
                  <h2 className={`text-lg font-bold ${color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{type}</h2>
                  <p className="text-xs text-slate-500 dark:text-dark-500">{label}</p>
                </div>
              </div>
            </div>

            {/* Current Stock Highlight */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-dark-700/50">
              <p className="text-xs text-slate-500 dark:text-dark-500 uppercase tracking-wide mb-1">Current Stock</p>
              <div className="flex items-end gap-2">
                <p className={`text-4xl font-black ${color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{data.current.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                <p className="text-slate-500 dark:text-dark-400 text-sm mb-1">Litres</p>
              </div>
              {data.current < 0 && (
                <p className="text-red-500 dark:text-red-400 text-xs mt-1 flex items-center gap-1">⚠ Stock deficit — more sold than purchased</p>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 divide-x divide-slate-100 dark:divide-dark-700/50">
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs text-slate-500 dark:text-dark-500 uppercase tracking-wide">Purchased</p>
                </div>
                <p className="text-slate-900 dark:text-white font-semibold">{data.totalPurchased.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</p>
                <p className="text-xs text-slate-500 dark:text-dark-500 mt-0.5">₨ {formatCurrency(data.purchaseValue)}</p>
              </div>
              <div className="px-6 py-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-xs text-slate-500 dark:text-dark-500 uppercase tracking-wide">Sold</p>
                </div>
                <p className="text-slate-900 dark:text-white font-semibold">{data.totalSold.toLocaleString(undefined, { maximumFractionDigits: 2 })} L</p>
                <p className="text-xs text-slate-500 dark:text-dark-500 mt-0.5">₨ {formatCurrency(data.saleValue)}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="px-6 py-4">
              <div className="flex justify-between text-xs text-slate-500 dark:text-dark-500 mb-2">
                <span>Stock Utilization</span>
                <span>{data.totalPurchased > 0 ? ((data.totalSold / data.totalPurchased) * 100).toFixed(1) : 0}% sold</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-dark-700 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-${color === 'amber' ? 'amber-500' : 'emerald-500'} rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, data.totalPurchased > 0 ? (data.totalSold / data.totalPurchased) * 100 : 0)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Stock Status Summary Table */}
      <div className="mt-8 glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Stock Status Summary</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Fuel Type</th>
                <th className="table-cell text-right whitespace-nowrap">Total Purchased (L)</th>
                <th className="table-cell text-right whitespace-nowrap">Total Sold (L)</th>
                <th className="table-cell text-right whitespace-nowrap bg-primary-500/5 dark:bg-primary-600/10">Current Stock (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-700/50">
              {cards.map(({ type, data }) => (
                <tr key={type} className="table-row group">
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                       <span className={`w-2 h-2 rounded-full ${type === 'HSD' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                       <span className="font-bold text-slate-900 dark:text-white">{type}</span>
                    </div>
                  </td>
                  <td className="table-cell text-right text-slate-600 dark:text-dark-300 font-mono italic">
                    {data.totalPurchased.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="table-cell text-right text-slate-600 dark:text-dark-300 font-mono italic">
                    {data.totalSold.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="table-cell text-right font-black text-xl text-primary-600 dark:text-primary-400 bg-primary-500/5 dark:bg-primary-600/10">
                    {data.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Combined Summary Overview */}
      <div className="mt-6 glass rounded-xl p-5 border border-slate-200 dark:border-dark-700/50">
        <h3 className="text-sm font-semibold text-slate-500 dark:text-dark-300 mb-4">Combined Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Purchased (L)', value: `${(stock.HSD.totalPurchased + stock.PMG.totalPurchased).toFixed(2)} L`, color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'Total Sold (L)', value: `${(stock.HSD.totalSold + stock.PMG.totalSold).toFixed(2)} L`, color: 'text-red-600 dark:text-red-400' },
            { label: 'Total Purchase Value', value: `₨ ${formatCurrency(stock.HSD.purchaseValue + stock.PMG.purchaseValue)}`, color: 'text-primary-600 dark:text-primary-400' },
            { label: 'Total Sale Value', value: `₨ ${formatCurrency(stock.HSD.saleValue + stock.PMG.saleValue)}`, color: 'text-slate-900 dark:text-white' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-xs text-slate-500 dark:text-dark-500 uppercase tracking-wide mb-1">{s.label}</p>
              <p className={`font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
