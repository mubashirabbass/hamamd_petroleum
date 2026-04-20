import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, 
  LayoutGrid, Database, ShoppingCart, Save, Pin, PinOff 
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
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const isExpanded = isSidebarPinned;

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
      {/* Mobile-Native View and Fuel Switcher */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 flex-shrink-0">
        <div className="segmented-control">
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
            History
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
             <div className="segmented-control shrink-0 !w-auto">
                {(['HSD', 'PMG'] as FuelType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleFuelSelect(t)}
                    className={cn(
                      "segmented-item !py-1.5 !px-4",
                      fuelType === t ? "segmented-item-active" : "segmented-item-inactive"
                    )}
                  >
                    {t}
                  </button>
                ))}
             </div>
             <div className="flex flex-1 items-center gap-1.5 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                <input
                  type="date"
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                />
                <span className="text-[10px] text-slate-300 font-black">→</span>
                <input
                  type="date"
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                />
             </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1.5 bg-slate-100 dark:bg-dark-800 text-[9px] font-black uppercase rounded-lg border border-slate-200 dark:border-dark-700/50">Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1.5 bg-slate-100 dark:bg-dark-800 text-[9px] font-black uppercase rounded-lg border border-slate-200 dark:border-dark-700/50">Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1.5 bg-slate-100 dark:bg-dark-800 text-[9px] font-black uppercase rounded-lg border border-slate-200 dark:border-dark-700/50">Year</button>
            {(fromDate || toDate) && (
              <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 bg-red-50 text-red-600 text-[9px] font-black uppercase rounded-lg border border-red-200">Reset</button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 flex flex-col h-full w-full overflow-y-auto smart-scroll p-4 md:p-6 pb-20">
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { id: 'HSD', label: 'HSD Volume', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
              { id: 'PMG', label: 'PMG Volume', stats: dashStats.PMG, icon: Zap, color: 'blue' }
            ].map(fuel => (
              <div key={fuel.id} className="glass p-4 rounded-3xl border-l-4 border-blue-500 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", fuel.id === 'HSD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{fuel.id}</span>
                </div>
                <p className="text-sm md:text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none mb-1 truncate">
                  {fuel.stats.qty.toLocaleString()}<span className="text-[9px] md:text-[10px] ml-1 opacity-50 italic">L</span>
                </p>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 truncate">Total: ₨ {formatCurrency(fuel.stats.amt)}</p>
                  <p className="text-[9px] font-bold text-slate-500 truncate">Avg: ₨ {formatCurrency(fuel.stats.avgPrice)}/L</p>
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
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-20 overflow-hidden">
          <div className="mb-4">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search historical purchases..." fullWidth />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
            <div className="space-y-3">
              {paged.map((p) => (
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
              {paged.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No entries found for this period</p>
                </div>
              )}
            </div>
            <div className="mt-4">
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
            </div>
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
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Date</label>
                  <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Inv No</label>
                  <input className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="000" dir="auto" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Vehicle Details</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} placeholder="e.g. LHR-7788" dir="auto" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Notes</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Purchase order info" dir="auto" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-1">Rate (PKR)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Liters (Qty)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0" required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-amber-600 px-1">Carriage Charges</label>
                <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} placeholder="0" />
              </div>

              <div className="bg-blue-600/5 dark:bg-blue-600/10 p-4 rounded-2xl border border-blue-600/20">
                 <div className="flex justify-between items-center mb-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Base Amount</p>
                    <p className="text-xs font-bold text-slate-500 tabular-nums">₨ {formatCurrency(Number(form.amount))}</p>
                 </div>
                 <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Payable (Inc Carriage)</p>
                 <p className="text-3xl font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none truncate max-w-full">₨ {formatCurrency(Number(form.totalAmount))}</p>
              </div>
            </div>

            <div className="sticky-bottom-actions">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editingEntity ? 'Update' : 'Confirm Purchase'}
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
