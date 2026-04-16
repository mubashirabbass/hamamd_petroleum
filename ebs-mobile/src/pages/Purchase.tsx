import React, { useState, useMemo } from 'react';
import { Plus, Trash2, ShoppingCart, Eye, Edit2, Printer, BarChart3, LayoutGrid, Database, Zap, Fuel, History, ArrowRight, Truck } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

export default function PurchasePage() {
  const { purchases, addPurchase, deletePurchase, settings, currentUser } = useStore();
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
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: today(), description: '', invoiceNo: '', vehicleNo: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '',
  });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    return filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type === fuelType)
      .filter((p) => {
        const matchesSearch = !search || p.date.includes(search) || (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase()));
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo = !toDate || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [purchases, settings.startDate, fuelType, search, fromDate, toDate]);

  const paged = paginate(filtered, page, perPage);

  // Auto-calc amount and total
  const handleRateQty = (f: typeof form) => {
    const rate = parseFloat(f.rate) || 0;
    const qty = parseFloat(f.quantity) || 0;
    const carr = parseFloat(f.carriage) || 0;
    const amount = rate * qty;
    const totalAmount = amount + carr;
    return { ...f, amount: amount.toFixed(2), totalAmount: totalAmount.toFixed(2) };
  };

  const set = (k: string, v: string) => {
    const updated = { ...form, [k]: v };
    setForm(handleRateQty(updated));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.rate || !form.quantity) {
      toast('Please fill required fields', 'error');
      return;
    }
    const payload = {
      type: fuelType,
      date: form.date,
      description: form.description,
      invoiceNo: form.invoiceNo,
      vehicleNo: form.vehicleNo,
      rate: parseFloat(form.rate),
      quantity: parseFloat(form.quantity),
      carriage: parseFloat(form.carriage) || 0,
      amount: parseFloat(form.amount),
      totalAmount: parseFloat(form.totalAmount),
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await useStore.getState().updatePurchase(editingEntity.id, payload);
        toast('Purchase updated successfully', 'success');
        closeForm(); // Close edit form
      } else {
        await addPurchase(payload);
        toast(`${fuelType} purchase added successfully`, 'success');
        resetFormForNext(); // Stay open
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
    setForm(prev => ({
      ...prev,
      description: '',
      invoiceNo: '',
      vehicleNo: '',
      rate: '',
      quantity: '',
      carriage: '',
      amount: '',
      totalAmount: '',
    }));
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', invoiceNo: '', vehicleNo: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '' });
  };

  const handleEdit = (p: any) => {
    setEditingEntity(p);
    setForm({
      date: p.date,
      description: p.description || '',
      invoiceNo: p.invoiceNo || '',
      vehicleNo: p.vehicleNo || '',
      rate: p.rate.toString(),
      quantity: p.quantity.toString(),
      carriage: p.carriage.toString(),
      amount: p.amount.toString(),
      totalAmount: p.totalAmount.toString(),
    });
    setShowForm(true);
  };

  const pageTotals = useMemo(() => ({
    qty: paged.reduce((s, p) => s + p.quantity, 0),
    carriage: paged.reduce((s, p) => s + p.carriage, 0),
    amount: paged.reduce((s, p) => s + p.amount, 0),
    total: paged.reduce((s, p) => s + p.totalAmount, 0),
  }), [paged]);

  const grandTotals = useMemo(() => ({
    qty: filtered.reduce((s, p) => s + p.quantity, 0),
    carriage: filtered.reduce((s, p) => s + p.carriage, 0),
    amount: filtered.reduce((s, p) => s + p.amount, 0),
    total: filtered.reduce((s, p) => s + p.totalAmount, 0),
  }), [filtered]);

  // Dashboard Specific Calculations
  const dashStats = useMemo(() => {
    const periodPurchases = filterByStartDate(purchases, settings.startDate).filter(p => {
      const matchesFrom = !fromDate || p.date >= fromDate;
      const matchesTo = !toDate || p.date <= toDate;
      return matchesFrom && matchesTo;
    });

    const getStats = (type: FuelType) => {
      const p = periodPurchases.filter(x => x.type === type);
      const qty = p.reduce((s, x) => s + x.quantity, 0);
      const amt = p.reduce((s, x) => s + x.amount, 0);
      const carriage = p.reduce((s, x) => s + x.carriage, 0);
      const total = amt + carriage;
      return {
        qty,
        amt,
        carriage,
        total,
        avgPrice: qty > 0 ? total / qty : 0,
        count: p.length
      };
    };

    return {
      HSD: getStats('HSD'),
      PMG: getStats('PMG'),
      recent: [...periodPurchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5)
    };
  }, [purchases, settings.startDate, fromDate, toDate]);

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Tab Switcher & Filters */}
      <div className="flex flex-col gap-4 mb-4">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 w-full">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'dashboard' 
                ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm border border-slate-200 dark:border-dark-700" 
                : "text-slate-500"
            )}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
              activeTab === 'database' 
                ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm border border-slate-200 dark:border-dark-700" 
                : "text-slate-500"
            )}
          >
            <Database className="w-3.5 h-3.5" /> Show Entries
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 overflow-x-auto smart-scroll pb-1">
          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
            <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400">Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 border-l border-slate-200 dark:border-dark-700/50">Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 border-l border-slate-200 dark:border-dark-700/50">Year</button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
             <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 overflow-y-auto smart-scroll">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Purchase Summary</h1>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">HSD:</span>
                    <span className="text-[10px] font-black text-amber-600 tabular-nums leading-none font-mono">₨ {formatCurrency(dashStats.HSD.avgPrice)}</span>
                  </div>
                  <div className="w-px h-2 bg-slate-200" />
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">PMG:</span>
                    <span className="text-[10px] font-black text-blue-600 tabular-nums leading-none font-mono">₨ {formatCurrency(dashStats.PMG.avgPrice)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowReport(true)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-300 flex items-center justify-center border border-slate-200 dark:border-dark-700 shadow-sm shrink-0"><Printer className="w-5 h-5" /></button>
              <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shrink-0"><Plus className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {[
              { id: 'HSD', label: 'High Speed Diesel', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
              { id: 'PMG', label: 'Premium Motor Gasoline', stats: dashStats.PMG, icon: Zap, color: 'blue' }
            ].map(fuel => (
              <div key={fuel.id} className="glass rounded-3xl p-5 border border-slate-200 dark:border-dark-700/50 relative overflow-hidden">
                <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 opacity-10", fuel.id === 'HSD' ? 'bg-amber-500' : 'bg-blue-500')} />
                
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", fuel.id === 'HSD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{fuel.id} Purchase</h3>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Volume</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{fuel.stats.qty.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">Liters</span></p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avg Price / L</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(fuel.stats.avgPrice)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-2">
                       <div className="space-y-0.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Net Expenditure</p>
                        <p className="text-sm font-black text-slate-500 tabular-nums">₨ {formatCurrency(fuel.stats.amt)}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Carriage</p>
                        <p className="text-sm font-black text-slate-500 tabular-nums">₨ {formatCurrency(fuel.stats.carriage)}</p>
                      </div>
                    </div>
                    
                    <div className="p-3 bg-blue-600 dark:bg-blue-600/10 rounded-2xl border border-blue-100/50">
                      <p className="text-[9px] font-black text-white dark:text-blue-400 uppercase tracking-widest mb-1">Total Procurement Cost</p>
                      <p className={cn(
                        "font-black tabular-nums break-words leading-tight text-white dark:text-blue-400",
                        formatCurrency(fuel.stats.total).length > 15 ? "text-lg" : "text-2xl"
                      )}>
                        <span className="text-lg mr-1 opacity-70 font-black">₨</span>
                        {formatCurrency(fuel.stats.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 mb-6">
            <div className="p-5 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Recent Transactions</h3>
              <button onClick={() => setActiveTab('database')} className="text-[10px] font-black uppercase text-blue-600 flex items-center gap-1">Show All <ArrowRight className="w-3.5 h-3.5" /></button>
            </div>
            <div className="p-2 space-y-2 max-h-[350px] overflow-y-auto smart-scroll">
              {dashStats.recent.map(p => (
                <div key={p.id} className="p-3 bg-slate-50/50 dark:bg-dark-800/30 rounded-2xl flex items-center justify-between gap-3 shadow-sm border border-slate-100 dark:border-dark-700/50">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[8px] font-black bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-1.5 py-0.5 rounded uppercase tracking-widest">{p.type}</span>
                      <span className="text-[10px] font-bold text-slate-400">{formatDate(p.date)}</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.description || 'Direct Purchase'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-blue-600 tabular-nums">₨ {formatCurrency(p.totalAmount)}</p>
                    <p className="text-[10px] font-bold text-slate-400 tabular-nums">{p.quantity.toLocaleString()} L</p>
                  </div>
                </div>
              ))}
              {dashStats.recent.length === 0 && (
                <div className="py-8 text-center text-[10px] text-slate-400 italic">No recent purchases</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
          {/* Mobile Fuel Selector */}
          <div className="flex items-center justify-between mb-4">
             <div className="mobile-tab-list">
              {(['HSD', 'PMG'] as FuelType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleFuelSelect(t)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all border",
                    fuelType === t 
                      ? "bg-blue-600 text-white border-blue-600 shadow-md" 
                      : "bg-white dark:bg-dark-800 text-slate-500 border-slate-200 dark:border-dark-700"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="flex flex-col items-end mr-3">
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{fuelType} Records Avg</p>
              <p className="text-sm font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none font-mono tracking-tighter">
                ₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.total / grandTotals.qty : 0)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowReport(true)}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-300 flex items-center justify-center border border-slate-200 dark:border-dark-700 shadow-sm"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button onClick={() => setShowForm(true)} className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col mb-4">
            <div className="p-3 border-b border-slate-200 dark:border-dark-700/50">
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." />
            </div>

            <div className="flex-1 overflow-auto smart-scroll">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                  <tr className="table-header text-[9px]">
                    <th className="table-cell table-sticky-col">Date</th>
                    <th className="table-cell text-right">Qty (L)</th>
                    <th className="table-cell text-right font-black">Total</th>
                    <th className="table-cell w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={4} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No {fuelType} found</td></tr>
                  ) : paged.map((p) => (
                    <tr key={p.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[10px]">
                      <td className="table-cell table-sticky-col whitespace-nowrap" onClick={() => setViewingEntity(p)}>{formatDate(p.date)}</td>
                      <td className="table-cell text-right whitespace-nowrap tabular-nums" onClick={() => setViewingEntity(p)}>{p.quantity.toLocaleString()}</td>
                      <td className="table-cell text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums" onClick={() => setViewingEntity(p)}>₨ {formatCurrency(p.totalAmount)}</td>
                      <td className="table-cell text-right">
                         <div className="flex items-center justify-end">
                            <button onClick={() => setViewingEntity(p)} className="p-1.5 text-blue-500"><Eye className="w-4 h-4" /></button>
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {paged.length > 0 && (
                  <tfoot className="border-t-[3px] border-slate-300 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50">
                    {/* Page Total Row */}
                    <tr className="bg-slate-100/50 dark:bg-dark-800/30">
                      <td className="table-cell table-sticky-col text-right">
                        <span className="text-[9px] font-black text-slate-500 dark:text-dark-400 uppercase tracking-widest italic">Page Total</span>
                      </td>
                      <td className="table-cell text-right whitespace-nowrap">
                        <span className="text-[10px] font-bold text-slate-600 dark:text-dark-400 tabular-nums">{pageTotals.qty.toLocaleString()} L</span>
                      </td>
                      <td className="table-cell text-right whitespace-nowrap font-bold">
                         <span className="text-[10px] font-bold text-slate-600 dark:text-dark-400 tabular-nums">₨ {formatCurrency(pageTotals.total)}</span>
                      </td>
                      <td className="table-cell"></td>
                    </tr>
                    {/* Grand Total Row */}
                    <tr className="bg-slate-200 dark:bg-dark-800">
                      <td className="table-cell table-sticky-col text-right">
                        <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Grand Total Analysis</span>
                      </td>
                      <td className="table-cell text-right whitespace-nowrap">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white">{grandTotals.qty.toLocaleString()} L</span>
                      </td>
                      <td className="table-cell text-right whitespace-nowrap font-black">
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] font-black text-blue-600 dark:text-blue-400 leading-none">₨ {formatCurrency(grandTotals.total)}</span>
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 mt-1 italic tracking-widest font-black">₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.total / grandTotals.qty : 0)}/L</span>
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
      )}

      {showForm && (
        <Modal title={editingEntity ? `Edit ${fuelType} Purchase` : `Add ${fuelType} Purchase`} onClose={closeForm} wide>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="col-span-2"><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => set('date', e.target.value)} required /></div>
              <div className="col-span-2"><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Purchase order note" /></div>
              <div><label className="label">Invoice No</label><input className="input" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="e.g. INV-202611" /></div>
              <div><label className="label">Vehicle No</label><input className="input" value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} placeholder="e.g. LHR-4567" /></div>
              <div><label className="label">Rate (₨) *</label><input type="number" step="0.01" inputMode="decimal" className="input" value={form.rate} onChange={(e) => set('rate', e.target.value)} required /></div>
              <div><label className="label">Quantity (L) *</label><input type="number" step="0.01" inputMode="decimal" className="input" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
              <div><label className="label">Carriage (₨)</label><input type="number" step="0.01" inputMode="decimal" className="input" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} /></div>
              <div><label className="label">Amount</label><input className="input bg-slate-50 dark:bg-dark-750 cursor-not-allowed" value={form.amount} readOnly /></div>
              <div className="col-span-2"><label className="label">Total Amount</label><input className="input bg-slate-50 dark:bg-dark-750 text-primary-600 dark:text-primary-400 font-semibold cursor-not-allowed" value={form.totalAmount} readOnly /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2" disabled={isSaving}>
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                {editingEntity ? 'Update Purchase' : 'Add Purchase'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="purchase" onClose={() => setViewingEntity(null)} />}
      {showReport && <PrintReportModal data={filtered} type="purchase" onClose={() => setShowReport(false)} />}
    </div>
  );
}
