import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, 
  LayoutGrid, Database, ShoppingCart, Save, Pin, PinOff, XCircle, ArrowUpDown 
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import FAB from '../components/ui/FAB';
import MobileActivityCard from '../components/ui/MobileActivityCard';
import ModuleHeader from '../components/ui/ModuleHeader';
import type { FuelType } from '../store/useStore';

export default function PurchasePage() {
  const { purchases, addPurchase, deletePurchase, settings, currentUser } = useStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Layout State
  const [perPage, setPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const type = searchParams.get('type') as FuelType;
    const action = searchParams.get('action');

    if (tab === 'dashboard') setActiveTab('dashboard');
    else if (tab === 'database') setActiveTab('database');

    if (type === 'HSD' || type === 'PMG') setFuelType(type);

    if (action === 'add') setShowForm(true);
  }, [searchParams]);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [entrySort, setEntrySort] = useState('date_desc');
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    date: today(),
    description: '',
    invoiceNo: '',
    vehicleNo: '',
    rate: '',
    quantity: '',
    carriage: '',
    amount: '',
    totalAmount: '',
  });

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    const f = filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type === fuelType)
      .filter((p) => {
        const matchesSearch = !search || p.date.includes(search) || (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase()));
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo = !toDate || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });

    return [...f].sort((a, b) => {
      switch (entrySort) {
        case 'date_desc':        return b.date.localeCompare(a.date);
        case 'date_asc':         return a.date.localeCompare(b.date);
        case 'totalAmount_desc': return b.totalAmount - a.totalAmount;
        case 'totalAmount_asc':  return a.totalAmount - b.totalAmount;
        case 'quantity_desc':    return b.quantity - a.quantity;
        default:                 return b.date.localeCompare(a.date);
      }
    });
  }, [purchases, settings.startDate, fuelType, search, fromDate, toDate, entrySort]);

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

  // Dashboard Calculations
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
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader 
        title="Purchase" 
        icon={ShoppingCart} 
        iconClassName="!bg-blue-100 !text-blue-600"
      >
        <div className="segmented-control !bg-blue-50/50 dark:!bg-blue-900/10 !p-0.5 shrink-0 !w-auto">
          {(['HSD', 'PMG'] as FuelType[]).map((t) => (
            <button
              key={t}
              onClick={() => handleFuelSelect(t)}
              className={cn(
                "segmented-item !py-1.5 !px-3 !text-[10px]",
                fuelType === t ? "!bg-blue-600 !text-white !shadow-md" : "!text-blue-600/60"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </ModuleHeader>

      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 flex-shrink-0">
        <div className="segmented-control overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn("segmented-item", activeTab === 'dashboard' ? "segmented-item-active" : "segmented-item-inactive")}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn("segmented-item", activeTab === 'database' ? "segmented-item-active" : "segmented-item-inactive")}
          >
            Ledger
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 flex flex-col h-full w-full overflow-y-auto smart-scroll p-4 md:p-6 pb-20">
          {/* Compact Stats Grid — Support horizontal scroll if cards are too wide */}
          <div className="flex gap-4 overflow-x-auto no-scrollbar smart-scroll mb-6 pb-2">
            {[
              { id: 'HSD', label: 'HSD Purchase', stats: dashStats.HSD, icon: Fuel },
              { id: 'PMG', label: 'PMG Purchase', stats: dashStats.PMG, icon: Zap }
            ].map(fuel => (
              <div key={fuel.id} className="flex-shrink-0 w-[85%] xs:w-[70%] md:w-[calc(50%-0.5rem)] glass p-4 rounded-3xl border-l-4 border-blue-500 shadow-xl relative overflow-hidden transition-transform active:scale-95">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", fuel.id === 'HSD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{fuel.label}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tabular-nums leading-none truncate">
                    {fuel.stats.qty.toLocaleString()}<span className="text-[10px] ml-1 opacity-50 italic">L</span>
                  </p>
                  <div className="flex flex-col gap-0.5 border-t border-slate-100 dark:border-dark-700/50 pt-2 mt-2">
                    <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate break-all">Total: ₨ {formatCurrency(fuel.stats.amt)}</p>
                    <p className="text-[9px] font-bold text-slate-500 truncate break-all">Avg: ₨ {formatCurrency(fuel.stats.avgPrice)} /L</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
             <button onClick={() => setShowReport(true)} className="flex-1 btn-secondary !py-2.5 !text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Printer className="w-3.5 h-3.5" /> Print Reports</button>
          </div>

          {/* Recent Purchases Mini List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Deliveries</h3>
              <button 
                onClick={() => setActiveTab('database')}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600"
              >
                View History
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              {dashStats.recent.map(p => (
                <MobileActivityCard
                  key={p.id}
                  title={p.description || `Purchase ${p.invoiceNo || ''}`}
                  subtitle={`${p.quantity.toLocaleString()} L @ ₨ ${formatCurrency(p.rate)}`}
                  amount={`₨ ${formatCurrency(p.totalAmount)}`}
                  date={formatDate(p.date)}
                  icon={p.type === 'HSD' ? Fuel : Zap}
                  iconColor={p.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'}
                  onClick={() => setViewingEntity(p)}
                />
              ))}
              {dashStats.recent.length === 0 && (
                <div className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Recent Purchases</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-48">
            <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mb-6">
              <div className="flex-1 min-w-[120px]">
                <SearchBar 
                  value={search} 
                  onChange={setSearch} 
                  placeholder="Search..." 
                  fullWidth={true}
                  className="!py-1.5 !text-[11px]"
                />
              </div>

              <button 
                onClick={() => setShowReport(true)}
                className="btn-secondary !py-2 !px-3 !bg-blue-50 dark:!bg-blue-900/10 !text-blue-600 !border-blue-200 dark:!border-blue-800 shrink-0 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print All
              </button>
              
              <div className="relative group shrink-0">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-blue-600 transition-colors pointer-events-none" />
                <select
                  value={entrySort}
                  onChange={(e) => setEntrySort(e.target.value)}
                  className="appearance-none pl-7 pr-8 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="date_desc">Newest</option>
                  <option value="date_asc">Oldest</option>
                  <option value="totalAmount_desc">High Amt</option>
                  <option value="totalAmount_asc">Low Amt</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                </div>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                <button 
                  onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg", (fromDate === today() && toDate === today()) ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm" : "text-slate-500")}
                >
                  Today
                </button>
                <button 
                  onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border-l border-slate-200 dark:border-dark-700/50", (fromDate === startOfMonth() && toDate === today()) ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm" : "text-slate-500")}
                >
                  Month
                </button>
              </div>

              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="p-2 text-red-600 shrink-0"><XCircle className="w-4 h-4" /></button>
              )}
            </div>

          <div className="flex-1 glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex flex-col min-h-0">
            <div className="flex-1 overflow-x-auto overflow-y-auto smart-scroll">
              <table className="table-excel min-w-[1000px] w-full border-collapse">
                <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800 shadow-sm">
                  <tr className="table-header text-[10px]">
                    <th className="table-cell text-left px-4">Date</th>
                    <th className="table-cell text-left px-4">Invoice No</th>
                    <th className="table-cell text-left px-4">Vehicle No</th>
                    <th className="table-cell text-right px-4">Liters (Qty)</th>
                    <th className="table-cell text-right px-4">Rate</th>
                    <th className="table-cell text-right px-4">Total Amount</th>
                    <th className="table-cell text-center px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-20 text-center">
                         <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No entries found for this period</p>
                      </td>
                    </tr>
                  ) : (
                    paged.map((p) => (
                      <tr key={p.id} className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group">
                        <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(p.date)}</td>
                        <td className="table-cell font-medium text-slate-900 dark:text-white">{p.invoiceNo || '---'}</td>
                        <td className="table-cell font-medium text-slate-900 dark:text-white uppercase">{p.vehicleNo || '---'}</td>
                        <td className="table-cell text-right tabular-nums font-black text-blue-600">{p.quantity.toLocaleString()}</td>
                        <td className="table-cell text-right tabular-nums text-slate-600 dark:text-dark-400">₨ {formatCurrency(p.rate)}</td>
                        <td className="table-cell text-right tabular-nums font-black text-slate-900 dark:text-white">₨ {formatCurrency(p.totalAmount)}</td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setViewingEntity(p)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                            <button onClick={() => setViewingEntity(p)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Print Receipt"><Printer className="w-4 h-4" /></button>
                            <button onClick={() => handleEdit(p)} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                            {currentUser?.role === 'Admin' && (
                              <button onClick={() => { if(confirm('Delete purchase?')) deletePurchase(p.id); }} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-dark-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-[11px] font-black uppercase tracking-wider">
                  <tr className="border-t-2 border-slate-300 dark:border-dark-700">
                    <td colSpan={3} className="px-4 py-3 text-right text-slate-500">Page Total:</td>
                    <td className="px-4 py-3 text-right text-blue-600 tabular-nums">{pageTotals.qty.toLocaleString()} L</td>
                    <td></td>
                    <td className="px-4 py-3 text-right text-slate-900 dark:text-white tabular-nums border-r border-slate-200 dark:border-dark-800">₨ {formatCurrency(pageTotals.total)}</td>
                    <td></td>
                  </tr>
                  <tr className="bg-blue-600 text-white border-t border-white/10">
                    <td colSpan={3} className="px-4 py-3 text-right opacity-80">Filters Grand Total:</td>
                    <td className="px-4 py-3 text-right tabular-nums">{grandTotals.qty.toLocaleString()} L</td>
                    <td></td>
                    <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(grandTotals.total)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
            <div className="mt-4">
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
            </div>
          </div>
        )}

      {/* Primary Action FAB */}
      <FAB 
        icon={Plus} 
        label={editingEntity ? "Update" : "Add Purchase"}
        onClick={() => setShowForm(true)}
        className="!bg-blue-600"
      />

      {showForm && (
        <Modal 
          title={editingEntity ? `Edit ${fuelType} Purchase` : `Add ${fuelType} Purchase`} 
          onClose={closeForm} 
          variant="bottom-sheet"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-dark-950/20 -m-6 p-6">
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll no-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Entry Date</label>
                  <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Invoice No</label>
                  <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="Inv-000" dir="auto" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Vehicle / Bowzer No</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} placeholder="e.g. K-9988" dir="auto" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Transaction Description</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Details of this purchase" dir="auto" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-1">Rate (Per Liter)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl shadow-sm" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Liters (Qty)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl shadow-sm" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 px-1">Carriage / Freight (PKR)</label>
                <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl shadow-sm" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} placeholder="0" />
              </div>

              <div className="bg-blue-600/5 dark:bg-blue-600/10 p-5 rounded-3xl border border-blue-600/20 shadow-xl shadow-blue-500/5">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Fuel Net Amount</p>
                    <p className="text-sm font-black text-slate-500 tabular-nums">₨ {formatCurrency(Number(form.amount))}</p>
                 </div>
                 <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Payable Amount</p>
                 <p className="text-3xl md:text-4xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none truncate max-w-full tracking-tighter">
                    ₨ {formatCurrency(Number(form.totalAmount))}
                 </p>
              </div>
            </div>

            <div className="sticky-bottom-actions !bg-white/80 dark:!bg-dark-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-dark-800 -mx-6 px-6 pt-4 pb-8">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingEntity ? 'Update Entry' : 'Confirm Purchase'}</span>
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
