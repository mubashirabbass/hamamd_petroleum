import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, ArrowLeft,
  Package, LayoutList, Fuel, Zap, Clock,
  ChevronRight, Calendar
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, FuelType } from '../store/useStore';
import {
  formatCurrency, filterByStartDate, formatDate,
  paginate, cn, startOfMonth, startOfYear, today
} from '../lib/utils';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';

// const PER_PAGE = 40; // Replaced by state

export default function StockPage() {
  const { purchases: rawPurchases, sales: rawSales, settings } = useStore();
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  // ── View State ──
  const [view, setView] = useState<'overview' | 'manage'>('overview');
  const [selectedType, setSelectedType] = useState<FuelType>('HSD');

  // Sync state with URL params
  useEffect(() => {
    if (type) {
      setView('manage');
      setSelectedType(type.toUpperCase() as FuelType);
    } else {
      setView('overview');
    }
  }, [type]);

  // ── Detail View State ──
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(40);

  // ── Calculation Logic ──
  const stockData = useMemo(() => {
    const calc = (type: 'HSD' | 'PMG') => {
      // 1. Period Totals (for Purchase/Sale Volume)
      const periodPurchases = rawPurchases.filter(p =>
        p.type === type &&
        p.date >= settings.startDate &&
        (!fromDate || p.date >= fromDate) &&
        (!toDate || p.date <= toDate)
      );
      const periodSales = rawSales.filter(s =>
        s.type === type &&
        s.date >= settings.startDate &&
        (!fromDate || s.date >= fromDate) &&
        (!toDate || s.date <= toDate)
      );

      const totalPurchased = periodPurchases.reduce((s, p) => s + p.quantity, 0);
      const totalSold = periodSales.reduce((s, x) => s + x.quantity, 0);
      const purchaseValue = periodPurchases.reduce((s, p) => s + p.totalAmount, 0);
      const saleValue = periodSales.reduce((s, x) => s + x.amount, 0);

      // 2. Closing Balance (Total ever up to 'toDate')
      const upToDatePurchases = rawPurchases.filter(p =>
        p.type === type &&
        p.date >= settings.startDate &&
        (!toDate || p.date <= toDate)
      );
      const upToDateSales = rawSales.filter(s =>
        s.type === type &&
        s.date >= settings.startDate &&
        (!toDate || s.date <= toDate)
      );

      const current = upToDatePurchases.reduce((s, p) => s + p.quantity, 0) -
        upToDateSales.reduce((s, x) => s + x.quantity, 0);

      return { totalPurchased, totalSold, current, purchaseValue, saleValue };
    };
    return { HSD: calc('HSD'), PMG: calc('PMG') };
  }, [rawPurchases, rawSales, settings.startDate, fromDate, toDate]);

  const historyData = useMemo(() => {
    if (view !== 'manage') return [];

    const pFiltered = filterByStartDate(rawPurchases, settings.startDate)
      .filter((p) => p.type === selectedType)
      .map((p) => ({ id: p.id, date: p.date, type: 'Purchase' as const, qtyIn: p.quantity, qtyOut: 0, details: p.details, billNo: p.billNo }));

    const sFiltered = filterByStartDate(rawSales, settings.startDate)
      .filter((s) => s.type === selectedType)
      .map((s) => ({ id: s.id, date: s.date, type: 'Sale' as const, qtyIn: 0, qtyOut: s.quantity, details: 'Daily Sale', billNo: s.billNo }));

    const combined = [...pFiltered, ...sFiltered].sort((a, b) => b.date.localeCompare(a.date));

    // Sort chronological for balance calc, then reverse back
    const chrono = [...combined].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const withBal = chrono.map(item => {
      bal += item.qtyIn - item.qtyOut;
      return { ...item, balance: bal };
    });

    return withBal.reverse();
  }, [rawPurchases, rawSales, selectedType, view, settings.startDate]);

  const filteredHistory = historyData.filter((h) => {
    const matchesSearch = !search || h.details.toLowerCase().includes(search.toLowerCase()) || h.date.includes(search);
    const matchesFrom = !fromDate || h.date >= fromDate;
    const matchesTo = !toDate || h.date <= toDate;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const pagedHistory = paginate(filteredHistory, page, perPage);

  const pageTotals = useMemo(() => ({
    qtyIn: pagedHistory.reduce((s, h) => s + (h.qtyIn || 0), 0),
    qtyOut: pagedHistory.reduce((s, h) => s + (h.qtyOut || 0), 0),
  }), [pagedHistory]);

  const detailTotals = useMemo(() => {
    if (view !== 'manage') return { in: 0, out: 0 };
    return {
      in: rawPurchases
        .filter(p => p.type === selectedType)
        .filter(p => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate))
        .reduce((s, p) => s + p.quantity, 0),
      out: rawSales
        .filter(s => s.type === selectedType)
        .filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate))
        .reduce((s, x) => s + x.quantity, 0)
    };
  }, [rawPurchases, rawSales, selectedType, fromDate, toDate, view]);

  // ── Render Helpers ──

  if (view === 'manage') {
    return (
      <div className="animate-fade-in flex flex-col h-[calc(100vh-80px)]">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/stock')}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-600 dark:text-dark-400"
              title="Back to Overview"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", selectedType === 'HSD' ? 'bg-amber-600/10' : 'bg-emerald-600/10')}>
                {selectedType === 'HSD' ? <Fuel className="w-8 h-8 text-amber-600" /> : <Zap className="w-8 h-8 text-emerald-600" />}
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{selectedType} Stock Status</h1>
                <p className="text-xs font-bold text-slate-500 dark:text-dark-500 uppercase tracking-widest">Global Inventory Management</p>
              </div>
            </div>
          </div>

          {/* Quick Date Range */}
          <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto">
            <div className="flex items-center bg-slate-50 dark:bg-dark-800 p-1 rounded-xl border border-slate-100 dark:border-dark-750 mr-2">
              <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
              <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
              <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
            </div>
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-32 !text-xs" />
            </div>
            <div className="flex items-center gap-2 px-2 border-l border-slate-100 dark:border-dark-700">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-32 !text-xs" />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
                className="ml-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30"
                title="Clear Filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Layout */}
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Categories</p>
            </div>
            <div className="p-4 space-y-2">
              {[
                { id: 'HSD', label: 'HSD Stock', icon: Fuel, color: 'text-amber-600', bg: 'bg-amber-600/10' },
                { id: 'PMG', label: 'PMG Stock', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
              ].map(fuel => (
                <button
                  key={fuel.id}
                  onClick={() => navigate(`/stock/${fuel.id.toLowerCase()}`)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden border',
                    selectedType === fuel.id
                      ? 'bg-primary-600 text-white border-transparent shadow-lg shadow-primary-600/30 scale-[1.02]'
                      : 'bg-transparent text-slate-600 dark:text-dark-400 border-slate-100 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-800 hover:border-slate-200 dark:hover:border-dark-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <fuel.icon className={cn("w-5 h-5", selectedType === fuel.id ? 'text-white' : fuel.color)} />
                    <span className="font-black text-sm uppercase tracking-tight">{fuel.label}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", selectedType === fuel.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0')} />
                </button>
              ))}
            </div>
            <div className="mt-auto p-6 bg-slate-50/50 dark:bg-dark-800/30 border-t border-slate-100 dark:border-dark-700/30">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Sync</p>
              <p className="text-[11px] font-bold text-slate-600 dark:text-dark-300">Working Offline</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto smart-scroll pr-2 space-y-6">
            {/* Status Summary Card */}
            <div className={cn("glass rounded-3xl overflow-hidden border-2 shadow-xl", selectedType === 'HSD' ? 'border-amber-500/20' : 'border-emerald-500/20')}>
              <div className="p-4 bg-white/50 dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
                <LayoutList className={cn("w-4 h-4", selectedType === 'HSD' ? 'text-amber-500' : 'text-emerald-500')} />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-dark-400">Inventory Status Summary</h2>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-dark-800">
                <div className="p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Period Purchase</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums">{detailTotals.in.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span></p>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Period Sale</p>
                  <p className="text-2xl font-black text-red-600 tabular-nums">{detailTotals.out.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span></p>
                </div>
                <div className={cn("p-6 text-center bg-slate-50/30 dark:bg-dark-800/20")}>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2">Total Remaining</p>
                  <p className={cn("text-3xl font-black tabular-nums tracking-tighter", selectedType === 'HSD' ? 'text-amber-600' : 'text-emerald-600')}>
                    {stockData[selectedType].current.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed History Toggle */}
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary !text-[10px] !py-1 !px-3 flex items-center gap-2 uppercase font-black tracking-widest"
              >
                {showHistory ? 'Hide Detailed History' : 'Show Detailed History'}
              </button>
            </div>

            {/* History Table */}
            {showHistory && (
              <div className="glass rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-dark-800 animate-slide-up">
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-dark-800">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Transaction History</h3>
                  </div>
                  <div className="w-64">
                    <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search History..." />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-dark-800/50 border-b border-slate-100 dark:border-dark-800">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Details</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">In (L)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Out (L)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/30 dark:bg-dark-800/30">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                      {pagedHistory.length === 0 ? (
                        <tr><td colSpan={6} className="py-20 text-center text-xs text-slate-400 italic">No records found for this period</td></tr>
                      ) : pagedHistory.map((h, i) => (
                        <tr key={h.id + (h.date) + i} className="hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition-colors group">
                          <td className="px-6 py-4 whitespace-nowrap text-[12px] font-bold text-slate-600 dark:text-dark-300">{formatDate(h.date)}</td>
                          <td className="px-6 py-4 text-[12px] font-black text-slate-900 dark:text-white truncate max-w-[180px]">{h.details || 'Daily Sale'}</td>
                          <td className="px-6 py-4 text-right text-emerald-600 font-mono text-xs font-bold">{h.qtyIn ? `+${h.qtyIn.toLocaleString()}` : '—'}</td>
                          <td className="px-6 py-4 text-right text-red-600 font-mono text-xs font-bold">{h.qtyOut ? `-${h.qtyOut.toLocaleString()}` : '—'}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums bg-slate-50/30 dark:bg-dark-800/30">{h.balance.toLocaleString()} L</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-slate-100 dark:border-dark-800 font-black text-black">
                      <tr className="font-black text-black">
                        <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-widest text-[11px] italic font-black text-black">Page Total</td>
                        <td className="px-6 py-4 text-right text-black font-black font-mono">+{pageTotals.qtyIn.toLocaleString()} L</td>
                        <td className="px-6 py-4 text-right text-black font-black font-mono">-{pageTotals.qtyOut.toLocaleString()} L</td>
                        <td></td>
                      </tr>
                      <tr className="font-black text-black bg-slate-200/50 border-t border-slate-300">
                        <td colSpan={3} className="px-6 py-5 text-right uppercase tracking-widest text-xs text-black font-black">Grand Total</td>
                        <td className="px-6 py-5 text-right text-black font-black font-mono">+{detailTotals.in.toLocaleString()} L</td>
                        <td className="px-6 py-5 text-right text-black font-black font-mono">-{detailTotals.out.toLocaleString()} L</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <Pagination
                  page={page}
                  total={filteredHistory.length}
                  perPage={perPage}
                  onChange={setPage}
                  onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Overview Render ──
  const cards = [
    { type: 'HSD' as const, label: 'High Speed Diesel', color: 'amber', icon: <Fuel className="w-8 h-8" />, data: stockData.HSD },
    { type: 'PMG' as const, label: 'Petrol / Motor Gasoline', color: 'emerald', icon: <Zap className="w-8 h-8" />, data: stockData.PMG },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center shadow-xl shadow-cyan-900/20 border-2 border-white/20">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Stock Overview</h1>
            <p className="text-slate-500 dark:text-dark-400 text-sm font-bold uppercase tracking-widest">Real-time Inventory Status</p>
          </div>
        </div>

        {/* Global Date Filter for Overview */}
        <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto">
          <div className="flex items-center bg-slate-50 dark:bg-dark-800 p-1 rounded-xl border border-slate-100 dark:border-dark-750 mr-2">
            <button onClick={() => { setFromDate(today()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
          </div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); }} className="input !py-1 !px-2 !w-32 !text-xs" />
          </div>
          <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-dark-700">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); }} className="input !py-1 !px-2 !w-32 !text-xs" />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="ml-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30"
              title="Clear Filters"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {cards.map(({ type, label, color, icon, data }) => (
          <div key={type} className="glass rounded-[2.5rem] p-8 border border-slate-200 dark:border-dark-700/50 shadow-2xl relative overflow-hidden group">
            <div className={cn("absolute top-0 right-0 w-40 h-40 rounded-bl-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700 opacity-20", color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500')} />

            <div className="flex items-center gap-6 mb-10 relative">
              <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border shadow-inner", color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600')}>
                {icon}
              </div>
              <div className="min-w-0">
                <h2 className={cn("text-2xl font-black tracking-tight", color === 'amber' ? 'text-amber-600' : 'text-emerald-600')}>{type}</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-dark-500 uppercase tracking-widest truncate">{label}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 relative border-t border-slate-100 dark:border-dark-800/60 pt-10">
              {[
                { label: 'Purchase', qty: data.totalPurchased, value: data.purchaseValue, icon: TrendingUp, color: 'text-emerald-600' },
                { label: 'Sale', qty: data.totalSold, value: data.saleValue, icon: TrendingDown, color: 'text-red-600' },
                { label: 'Remaining', qty: data.current, value: null, icon: Package, color: color === 'amber' ? 'text-amber-600' : 'text-emerald-600', highlight: true },
              ].map(block => (
                <div key={block.label} className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <block.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{block.label}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("font-black tabular-nums tracking-tighter", block.highlight ? 'text-4xl' : 'text-2xl text-slate-900 dark:text-white', block.color)}>
                      {block.qty.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">L</span>
                  </div>
                  {block.value !== null && (
                    <p className="text-[11px] font-bold text-slate-500 tabular-nums">₨ {formatCurrency(block.value)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Visualization */}
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-dark-800/60">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                <span>Utilization</span>
                <span className={color === 'amber' ? 'text-amber-600' : 'text-emerald-600'}>{data.totalPurchased > 0 ? ((data.totalSold / data.totalPurchased) * 100).toFixed(1) : 0}% sold</span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden p-1 shadow-inner">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 shadow-lg", color === 'amber' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600')}
                  style={{ width: `${Math.min(100, data.totalPurchased > 0 ? (data.totalSold / data.totalPurchased) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* NEW BUTTONS */}
            <button
              onClick={() => navigate(`/stock/${type.toLowerCase()}`)}
              className={cn(
                "w-full mt-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-sm active:scale-95 group",
                color === 'amber'
                  ? "bg-amber-600 text-white border-transparent hover:bg-amber-700 shadow-amber-600/20"
                  : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-emerald-600/20"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Manage {type} Stock Details
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ))}
      </div>

      {/* Combined Insights Table */}
      <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl">
        <div className="p-6 bg-white/30 dark:bg-dark-800/30 border-b border-slate-200 dark:border-dark-700/50 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Analysis Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-dark-900/50">
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Fuel Category</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Purchase Volume (L)</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Sales Volume (L)</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-primary-600 uppercase tracking-widest bg-primary-600/5">Remaining Stock (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              {[
                { label: 'HSD', purchased: stockData.HSD.totalPurchased, sold: stockData.HSD.totalSold, current: stockData.HSD.current, color: 'text-amber-600' },
                { label: 'PMG', purchased: stockData.PMG.totalPurchased, sold: stockData.PMG.totalSold, current: stockData.PMG.current, color: 'text-emerald-600' },
                { label: 'Total Volume', purchased: stockData.HSD.totalPurchased + stockData.PMG.totalPurchased, sold: stockData.HSD.totalSold + stockData.PMG.totalSold, current: stockData.HSD.current + stockData.PMG.current, bold: true },
              ].map(row => (
                <tr key={row.label} className="group hover:bg-slate-50/50 dark:hover:bg-dark-900/40">
                  <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-dark-300 uppercase tracking-tighter">{row.label}</td>
                  <td className="px-8 py-5 text-right font-black tabular-nums text-emerald-600">{row.purchased.toLocaleString()} L</td>
                  <td className="px-8 py-5 text-right font-black tabular-nums text-red-600">{row.sold.toLocaleString()} L</td>
                  <td className={cn("px-8 py-5 text-right font-black tabular-nums bg-primary-600/5", row.bold ? 'text-2xl text-black dark:text-white' : 'text-slate-900 dark:text-white')}>
                    {row.current.toLocaleString()} L
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
