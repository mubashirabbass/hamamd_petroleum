import { useMemo } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { Package, TrendingUp, TrendingDown, LayoutList } from 'lucide-react';
import { useStore, FuelType } from '../store/useStore';

export default function StockDetailPage() {
  const { type } = useParams<{ type: string }>();
  const fuelType = type?.toUpperCase() as FuelType;
  const { purchases, sales } = useStore();

  if (fuelType !== 'HSD' && fuelType !== 'PMG') {
    return <Navigate to="/stock" replace />;
  }

  const stats = useMemo(() => {
    const p = purchases
      .filter((x) => x.type === fuelType)
      .reduce((s, x) => s + x.quantity, 0);

    const s = sales
      .filter((x) => x.type === fuelType)
      .reduce((s, x) => s + x.quantity, 0);

    const current = p - s;
    return { totalIn: p, totalOut: s, current };
  }, [purchases, sales, fuelType]);

  const color = fuelType === 'HSD' ? 'amber' : 'emerald';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-${color}-600/10 dark:bg-${color}-600/20 flex items-center justify-center`}>
            <Package className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{fuelType} Stock Details</h1>
            <p className="text-sm text-slate-500 dark:text-dark-400">Detailed transaction history and running balance</p>
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400">
              <LayoutList className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider">Current Stock</p>
          </div>
          <p className={`text-2xl font-bold ${color === 'amber' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {stats.current.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-emerald-600/10 dark:bg-emerald-600/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider">Total Purchased</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalIn.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-red-600/10 dark:bg-red-600/20 text-red-600 dark:text-red-400">
              <TrendingDown className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-slate-500 dark:text-dark-400 uppercase tracking-wider">Total Sold</p>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            {stats.totalOut.toLocaleString(undefined, { maximumFractionDigits: 2 })} L
          </p>
        </div>
      </div>

      {/* Single Row Summary Table */}
      <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50">
        <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">{fuelType} Stock Status</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Fuel Type</th>
                <th className="table-cell text-right whitespace-nowrap">Total Purchased (L)</th>
                <th className="table-cell text-right whitespace-nowrap">Total Sold (L)</th>
                <th className="table-cell text-right whitespace-nowrap bg-primary-500/5 dark:bg-primary-600/10 font-bold">Current Stock (L)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="table-row">
                <td className="table-cell">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                    <span className={`w-2.5 h-2.5 rounded-full ${color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                    {fuelType}
                  </div>
                </td>
                <td className="table-cell text-right font-mono text-slate-600 dark:text-dark-300">
                  {stats.totalIn.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="table-cell text-right font-mono text-slate-600 dark:text-dark-300">
                  {stats.totalOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="table-cell text-right font-black text-2xl text-primary-600 dark:text-primary-400 bg-primary-500/5 dark:bg-primary-600/10">
                  {stats.current.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
