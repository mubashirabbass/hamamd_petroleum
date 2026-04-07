import { useState, useMemo } from 'react';
import { useParams, Navigate, Link } from 'react-router-dom';
import { Package, LayoutList, ArrowLeft } from 'lucide-react';
import { useStore, FuelType } from '../store/useStore';
import { formatDate, paginate, filterByStartDate } from '../lib/utils';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';

const PER_PAGE = 20;

export default function StockDetailPage() {
  const { type } = useParams<{ type: string }>();
  const fuelType = type?.toUpperCase() as FuelType;
  const { purchases, sales, settings } = useStore();

  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const history = useMemo(() => {
    const rawPurchases = filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type === fuelType)
      .map((p) => ({ id: p.id, date: p.date, type: 'Purchase' as const, qtyIn: p.quantity, qtyOut: 0, details: p.details }));
    
    const rawSales = filterByStartDate(sales, settings.startDate)
      .filter((s) => s.type === fuelType)
      .map((s) => ({ id: s.id, date: s.date, type: 'Sale' as const, qtyIn: 0, qtyOut: s.quantity, details: 'Daily Sale' }));

    const combined = [...rawPurchases, ...rawSales].sort((a, b) => b.date.localeCompare(a.date));
    
    // Sort chronological for balance calc, then reverse back
    const chrono = [...combined].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const withBal = chrono.map(item => {
      bal += item.qtyIn - item.qtyOut;
      return { ...item, balance: bal };
    });

    return withBal.reverse();
  }, [purchases, sales, fuelType, settings.startDate]);

  if (fuelType !== 'HSD' && fuelType !== 'PMG') {
    return <Navigate to="/stock" replace />;
  }

  const filtered = history.filter((h) => {
    const matchesSearch = !search || h.details.toLowerCase().includes(search.toLowerCase()) || h.date.includes(search);
    const matchesFrom = !fromDate || h.date >= fromDate;
    const matchesTo = !toDate || h.date <= toDate;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const paged = paginate(filtered, page, PER_PAGE);

  const periodTotals = {
    in: purchases
      .filter(p => p.type === fuelType)
      .filter(p => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate))
      .reduce((s, p) => s + p.quantity, 0),
    out: sales
      .filter(s => s.type === fuelType)
      .filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate))
      .reduce((s, x) => s + x.quantity, 0)
  };

  const absoluteStock = history.length > 0 ? history[0].balance : 0;

  const color = fuelType === 'HSD' ? 'amber' : 'emerald';

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/stock" className="btn-icon" title="Back to Stock Summary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-${color}-600/10 dark:bg-${color}-600/20 flex items-center justify-center`}>
              <Package className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{fuelType} Stock Status</h1>
              <p className="text-sm text-slate-500 dark:text-dark-400">Total stock management and real-time status</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">From</span>
            <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase">To</span>
            <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-[10px] font-bold text-primary-600 hover:underline px-1">Clear</button>
          )}
        </div>
      </div>

      {/* Single Row Summary - Primary Management Line */}
      <div className="glass rounded-xl overflow-hidden border-2 border-primary-500/20">
        <div className="p-3 bg-primary-500/5 border-b border-slate-200 dark:border-dark-700/50">
          <h2 className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 flex items-center gap-2">
            <LayoutList className="w-3.5 h-3.5" />
            Stock Status Summary
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="table-header">
                <th className="table-cell">Fuel Type</th>
                <th className="table-cell text-right whitespace-nowrap">Purchase</th>
                <th className="table-cell text-right whitespace-nowrap">Sale</th>
                <th className="table-cell text-right whitespace-nowrap bg-primary-500/10 font-bold">Remaining</th>
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
                <td className="table-cell text-right font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  {periodTotals.in.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="table-cell text-right font-mono text-red-600 dark:text-red-400 font-bold">
                  {periodTotals.out.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
                <td className="table-cell text-right font-black text-3xl text-primary-600 dark:text-primary-400 bg-primary-500/10">
                  {absoluteStock.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed History Toggle */}
      <div className="flex justify-center">
        <button 
          onClick={() => setShowHistory(!showHistory)}
          className="btn-secondary !text-xs !py-1.5 flex items-center gap-2"
        >
          {showHistory ? 'Hide Detailed History' : 'Show Detailed History'}
        </button>
      </div>

      {showHistory && (
        <div className="glass rounded-xl overflow-hidden animate-slide-up">
          <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
            <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="table-header">
                <th className="table-cell text-left">Date</th>
                <th className="table-cell text-left">Description</th>
                <th className="table-cell text-left">Type</th>
                <th className="table-cell text-right">In (L)</th>
                <th className="table-cell text-right">Out (L)</th>
                <th className="table-cell text-right">Balance</th>
              </tr></thead>
              <tbody>
                {paged.length === 0 ? (
                  <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No historical data available</td></tr>
                ) : paged.map((h, i) => (
                  <tr key={`${h.id}-${i}`} className="table-row">
                    <td className="table-cell whitespace-nowrap text-xs">{formatDate(h.date)}</td>
                    <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[150px]">{h.details || '—'}</td>
                    <td className="table-cell"><span className={`badge-${h.type === 'Purchase' ? 'hsd' : 'pmg'} !px-1.5 !py-0 !text-[9px]`}>{h.type}</span></td>
                    <td className="table-cell text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs italic">{h.qtyIn ? `+${h.qtyIn.toLocaleString()}` : '—'}</td>
                    <td className="table-cell text-right text-red-600 dark:text-red-400 font-mono text-xs italic">{h.qtyOut ? `-${h.qtyOut.toLocaleString()}` : '—'}</td>
                    <td className="table-cell text-right font-bold text-slate-900 dark:text-white text-sm">{h.balance.toLocaleString()} L</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
        </div>
      )}
    </div>
  );
}
