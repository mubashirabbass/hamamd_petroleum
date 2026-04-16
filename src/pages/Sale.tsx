import React, { useState, useMemo } from 'react';
import { Plus, Trash2, Droplet, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, LayoutGrid, Database } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

export default function SalePage() {
  const { sales, addSale, deleteSale, settings, currentUser } = useStore();
  const { toast } = useToast();
  const [perPage, setPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [form, setForm] = useState({ date: today(), description: '', quantity: '', rate: '', amount: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type); setSearch(''); setPage(1);
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    const rate = parseFloat(k === 'rate' ? v : updated.rate) || 0;
    const qty = parseFloat(k === 'quantity' ? v : updated.quantity) || 0;
    setForm({ ...updated, amount: (rate * qty).toFixed(2) });
  };

  const filtered = useMemo(() => {
    return filterByStartDate(sales, settings.startDate)
      .filter((s) => s.type === fuelType)
      .filter((s) => {
        const matchesSearch = !search || s.date.includes(search);
        const matchesFrom = !fromDate || s.date >= fromDate;
        const matchesTo = !toDate || s.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [sales, settings.startDate, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, perPage);
  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, x) => s + x.quantity, 0),
    amount: paged.reduce((s, x) => s + x.amount, 0),
  }), [paged]);

  const grandTotals = useMemo(() => ({
    qty: filtered.reduce((s, x) => s + x.quantity, 0),
    amount: filtered.reduce((s, x) => s + x.amount, 0),
  }), [filtered]);

  // Dashboard Specific Calculations
  const dashStats = useMemo(() => {
    const periodSales = filterByStartDate(sales, settings.startDate).filter(s => {
      const matchesFrom = !fromDate || s.date >= fromDate;
      const matchesTo = !toDate || s.date <= toDate;
      return matchesFrom && matchesTo;
    });

    const getStats = (type: FuelType) => {
      const f = periodSales.filter(s => s.type === type);
      const qty = f.reduce((s, x) => s + x.quantity, 0);
      const amt = f.reduce((s, x) => s + x.amount, 0);
      return {
        qty,
        amt,
        avgRate: qty > 0 ? amt / qty : 0,
        count: f.length
      };
    };

    return {
      HSD: getStats('HSD'),
      PMG: getStats('PMG'),
      recent: [...periodSales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    };
  }, [sales, settings.startDate, fromDate, toDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.quantity || !form.rate) { toast('Fill required fields', 'error'); return; }

    const payload = {
      type: fuelType,
      date: form.date,
      description: form.description,
      quantity: parseFloat(form.quantity),
      rate: parseFloat(form.rate),
      amount: parseFloat(form.amount)
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await useStore.getState().updateSale(editingEntity.id, payload);
        toast('Sale updated successfully', 'success');
        closeForm(); // Close after edit
      } else {
        await addSale(payload);
        toast(`${fuelType} sale added`, 'success');
        resetFormForNext(); // Stay open after add
      }
    } catch (err: unknown) {
      const errorMessage = getErrorMessage(err);
      console.error('Save error:', err);
      toast(`Failed to save: ${errorMessage}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetFormForNext = () => {
    setEditingEntity(null);
    setForm(prev => ({ ...prev, description: '', quantity: '', rate: '', amount: '' }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', quantity: '', rate: '', amount: '' });
  };

  const handleEdit = (s: any) => {
    setEditingEntity(s);
    setForm({
      date: s.date,
      description: s.description || '',
      quantity: s.quantity.toString(),
      rate: s.rate.toString(),
      amount: s.amount.toString(),
    });
    setShowForm(true);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Tab Switcher & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-800 p-1.5 rounded-2xl border border-slate-200 dark:border-dark-700 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'dashboard' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm border border-slate-200 dark:border-dark-700" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-dark-200"
            )}
          >
            <LayoutGrid className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'database' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm border border-slate-200 dark:border-dark-700" 
                : "text-slate-500 hover:text-slate-700 dark:hover:text-dark-200"
            )}
          >
            <Database className="w-4 h-4" /> Show Entries
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50">
            <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
          </div>
          <div className="flex items-center gap-2">
            <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
            <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto smart-scroll pr-2">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Sales Analytics</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Performance Tracking Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-2xl border border-emerald-200 dark:border-emerald-800/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                    <Fuel className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">HSD Avg / L</p>
                    <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">
                      ₨ {formatCurrency(dashStats.HSD.qty > 0 ? dashStats.HSD.amt / dashStats.HSD.qty : 0)}
                    </p>
                  </div>
                </div>
                <div className="glass px-4 py-2 rounded-2xl border border-blue-200 dark:border-blue-800/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PMG Avg / L</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none">
                      ₨ {formatCurrency(dashStats.PMG.qty > 0 ? dashStats.PMG.amt / dashStats.PMG.qty : 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowReport(true)} className="btn-secondary flex items-center gap-2"><Printer className="w-4 h-4" /> Reports</button>
                <button onClick={() => setShowForm(true)} className="btn-primary !bg-emerald-600 hover:!bg-emerald-500 flex items-center gap-2"><Plus className="w-4 h-4" /> New Sale</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[
              { id: 'HSD', label: 'High Speed Diesel', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
              { id: 'PMG', label: 'Premium Motor Gasoline', stats: dashStats.PMG, icon: Zap, color: 'blue' }
            ].map(fuel => (
              <div key={fuel.id} className="glass rounded-[2rem] p-6 border border-slate-200 dark:border-dark-700/50 relative overflow-hidden group hover:scale-[1.01] transition-transform shadow-xl">
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-16 -mt-16 opacity-10", fuel.id === 'HSD' ? 'bg-emerald-500' : 'bg-blue-500')} />
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", fuel.id === 'HSD' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{fuel.id} Sales</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fuel.label}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800/50 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Sales Volume</p>
                      <p className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums">{fuel.stats.qty.toLocaleString()} <span className="text-xs text-slate-400 font-normal ml-1">Liters Sold</span></p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Price / L</p>
                      <p className="text-xl lg:text-2xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(fuel.stats.avgRate)}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-emerald-600 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/20">
                    <p className="text-[10px] font-black text-white dark:text-emerald-400 uppercase tracking-widest mb-1.5">Gross Revenue Generation</p>
                    <p className={cn(
                      "font-black tabular-nums break-words leading-tight text-white dark:text-emerald-400",
                      formatCurrency(fuel.stats.amt).length > 15 ? "text-xl lg:text-2xl" : "text-2xl lg:text-4xl"
                    )}>
                      <span className="text-xl mr-1.5 opacity-70">₨</span>
                      {formatCurrency(fuel.stats.amt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl">
            <div className="p-6 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Recent Transactions</h3>
              </div>
              <button 
                onClick={() => setActiveTab('database')}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500 transition-colors flex items-center gap-1.5"
              >
                Show All Entries <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[400px] smart-scroll">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-dark-900/50">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-dark-800">
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Fuel</th>
                    <th className="px-6 py-4 text-left">Description</th>
                    <th className="px-6 py-4 text-right">Qty (L)</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                  {dashStats.recent.map(s => (
                    <tr key={s.id} className="text-[11px] group hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-600 dark:text-dark-300">{formatDate(s.date)}</td>
                      <td className="px-6 py-4 font-black uppercase tracking-tighter text-emerald-600">{s.type}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{s.description || 'Daily Sale'}</td>
                      <td className="px-6 py-4 text-right font-black tabular-nums">{s.quantity.toLocaleString()}</td>
                      <td className="px-6 py-4 text-right font-black text-emerald-600 tabular-nums">₨ {formatCurrency(s.amount)}</td>
                    </tr>
                  ))}
                  {dashStats.recent.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 italic">No recent transactions found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
          {/* Sidebar selection */}
          <div className="w-full md:w-60 flex-shrink-0 flex flex-col gap-3 h-full">
            <div className="category-panel flex-1 overflow-y-auto custom-scrollbar text-left">
              <div className="px-3 py-2">
                <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em]">Fuel Types</h2>
              </div>

              {(['HSD', 'PMG'] as FuelType[]).map((t) => (
                <div
                  key={t}
                  onClick={() => handleFuelSelect(t)}
                  className={fuelType === t ? 'category-item-active' : 'category-item-inactive'}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${fuelType === t ? 'bg-primary-600 animate-pulse' : 'bg-slate-300 dark:bg-dark-600'}`}></span>
                    <span className="truncate">{t} Sales</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 min-w-0 flex flex-col h-full">
            {/* Header / Toolbar Moved to top for consistency, simplified here */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                {fuelType} Transaction Entries
              </h2>
              <div className="flex items-center flex-wrap gap-3">
                {fuelType === 'All' ? (
                  <>
                    <div className="glass px-4 py-2 rounded-xl border border-emerald-200 dark:border-dark-700 flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">HSD Avg / L</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none font-mono tracking-tighter">
                          ₨ {formatCurrency(dashStats.HSD.qty > 0 ? dashStats.HSD.amt / dashStats.HSD.qty : 0)}
                        </p>
                      </div>
                    </div>
                    <div className="glass px-4 py-2 rounded-xl border border-blue-200 dark:border-dark-700 flex items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PMG Avg / L</p>
                        <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none font-mono tracking-tighter">
                          ₨ {formatCurrency(dashStats.PMG.qty > 0 ? dashStats.PMG.amt / dashStats.PMG.qty : 0)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="glass px-4 py-2 rounded-xl border border-emerald-200 dark:border-dark-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <History className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{fuelType} Avg Price</p>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none font-mono tracking-tighter">
                        ₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.amount / grandTotals.qty : 0)}
                      </p>
                    </div>
                  </div>
                )}
                <button onClick={() => { closeForm(); setShowForm(true); }} className="btn-primary !bg-emerald-600 flex items-center gap-2"><Plus className="w-4 h-4" /> New Entry</button>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col mb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50">
                <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
                { (fromDate || toDate) && (
                    <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30">Clear Period</button>
                )}
              </div>

              <div className="flex-1 overflow-auto smart-scroll">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[9px]">
                      <th className="table-cell text-left w-24">Date</th>
                      <th className="table-cell text-left w-64">Description</th>
                      <th className="table-cell text-right w-28">Rate</th>
                      <th className="table-cell text-right w-32">Qty (L)</th>
                      <th className="table-cell text-right font-black w-40">Amount</th>
                      <th className="table-cell w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No {fuelType} sales found</td></tr>
                    ) : paged.map((s) => (
                      <tr key={s.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[11px]">
                        <td className="table-cell whitespace-nowrap">{formatDate(s.date)}</td>
                        <td className="table-cell truncate max-w-[15rem]">{s.description || '—'}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">₨ {formatCurrency(s.rate)}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">{s.quantity.toLocaleString()} L</td>
                        <td className="table-cell text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">₨ {formatCurrency(s.amount)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingEntity(s)} className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-all"><Printer className="w-3 h-3" /><span>PRINT</span></button>
                            <button onClick={() => setViewingEntity(s)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                            {currentUser?.role === 'Admin' && (
                              <>
                                <button onClick={() => handleEdit(s)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Entry"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => { deleteSale(s.id); toast('Sale deleted', 'warning'); }} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" title="Delete Entry"><Trash2 className="w-4 h-4" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {paged.length > 0 && (
                    <tfoot className="border-t-[3px] border-slate-300 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50">
                      <tr className="bg-slate-200 dark:bg-dark-800">
                        <td colSpan={3} className="px-4 py-3 text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">Grand Total Analysis</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{grandTotals.qty.toLocaleString()} L</span>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-500 leading-none">₨ {formatCurrency(grandTotals.amount)}</span>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 mt-1 italic tracking-widest font-black">₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.amount / grandTotals.qty : 0)} / L</span>
                          </div>
                        </td>
                        <td className="table-cell"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editingEntity ? `Edit ${fuelType} Sale` : `Add ${fuelType} Sale`} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
              <div className="col-span-2"><label className="label">Description</label><input className="input" value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Sale details" /></div>
              <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
              <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
              <div className="col-span-2"><label className="label">Calculation (Auto)</label><input className="input cursor-not-allowed text-primary-600 dark:text-primary-400 font-bold" value={`₨ ${form.amount}`} readOnly /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn-primary-emerald flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {editingEntity ? 'Update Sale' : 'Add Sale'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="sale" onClose={() => setViewingEntity(null)} />}
      {showReport && <PrintReportModal data={filtered} type="sale" onClose={() => setShowReport(false)} />}
    </div>
  );
}
