import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, 
  LayoutGrid, Database, TrendingUp, Save, Pin, PinOff 
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

export default function SalePage() {
  const { sales, addSale, deleteSale, settings, currentUser } = useStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Layout State
  const [perPage, setPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(true);
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
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      {/* Mobile-Native View and Fuel Switcher */}
      <div className="flex flex-col gap-3 p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 flex-shrink-0 transition-all duration-300">
        <div className="flex items-center gap-3">
          <div className="segmented-control flex-1">
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
          
          <button 
            onClick={() => setIsSidebarPinned(!isSidebarPinned)}
            className={cn(
              "w-9 h-9 flex items-center justify-center rounded-xl flex-shrink-0 transition-all active:scale-95",
              isSidebarPinned 
                ? "bg-slate-100 dark:bg-dark-800 text-slate-600 dark:text-dark-300 shadow-inner" 
                : "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30 shadow-sm"
            )}
            title={isSidebarPinned ? "Hide Filters" : "Show Filters"}
          >
            {isSidebarPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
          </button>
        </div>

        {isSidebarPinned && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-300" style={{ WebkitOverflowScrolling: 'touch' }}>
            {/* HSD / PMG toggle - never wraps */}
            <div className="segmented-control !bg-emerald-50/50 dark:!bg-emerald-900/10 !p-0.5 shrink-0 !w-auto">
              {(['HSD', 'PMG'] as FuelType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleFuelSelect(t)}
                  className={cn(
                    "segmented-item !py-1.5 !px-4",
                    fuelType === t ? "!bg-emerald-600 !text-white !shadow-md" : "!text-emerald-600/60"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            {/* Date range */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-dark-800 p-1.5 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
              <input
                type="date"
                className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-[110px] text-center"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              />
              <span className="text-[10px] text-slate-300 font-black">—</span>
              <input
                type="date"
                className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-[110px] text-center"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="flex-1 flex flex-col h-full w-full overflow-y-auto smart-scroll p-4 md:p-6 pb-20">
          {/* Compact Stats Grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[
              { id: 'HSD', label: 'HSD Volume', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
              { id: 'PMG', label: 'PMG Volume', stats: dashStats.PMG, icon: Zap, color: 'blue' }
            ].map(fuel => (
              <div key={fuel.id} className="glass p-4 rounded-3xl border-l-4 border-emerald-500 shadow-lg relative overflow-hidden">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", fuel.id === 'HSD' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{fuel.id}</span>
                </div>
                <p className="text-sm md:text-xl font-black text-slate-900 dark:text-white tabular-nums leading-none mb-1 truncate">
                  {fuel.stats.qty.toLocaleString()}<span className="text-[9px] md:text-[10px] ml-1 opacity-50 italic">L</span>
                </p>
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 truncate">Total: ₨ {formatCurrency(fuel.stats.amt)}</p>
                  <p className="text-[9px] font-bold text-slate-500 truncate">Avg: ₨ {formatCurrency(fuel.stats.avgRate)}/L</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
             <button onClick={() => setShowReport(true)} className="flex-1 btn-secondary !py-2.5 !text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"><Printer className="w-3.5 h-3.5" /> Print Reports</button>
          </div>

          {/* Recent Activity Mini List */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Recent Activity</h3>
              <button 
                onClick={() => setActiveTab('database')}
                className="text-[10px] font-black uppercase tracking-widest text-emerald-600"
              >
                View History
              </button>
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              {dashStats.recent.map(s => (
                <MobileActivityCard
                  key={s.id}
                  title={s.description || 'Daily Sale'}
                  subtitle={`${s.quantity.toLocaleString()} L @ ₨ ${formatCurrency(s.rate)}`}
                  amount={`₨ ${formatCurrency(s.amount)}`}
                  date={formatDate(s.date)}
                  icon={s.type === 'HSD' ? Fuel : Zap}
                  iconColor={s.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'}
                  onClick={() => setViewingEntity(s)}
                />
              ))}
              {dashStats.recent.length === 0 && (
                <div className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Recent Sales</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-48">
          <div className="mb-4">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search historical sales..." fullWidth />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
            {paged.map((s) => (
              <MobileActivityCard
                key={s.id}
                title={s.description || 'Daily Sale'}
                subtitle={`${s.quantity.toLocaleString()} L @ ₨ ${formatCurrency(s.rate)}`}
                amount={`₨ ${formatCurrency(s.amount)}`}
                date={formatDate(s.date)}
                icon={s.type === 'HSD' ? Fuel : Zap}
                iconColor={s.type === 'HSD' ? 'text-amber-500' : 'text-blue-500'}
                onClick={() => setViewingEntity(s)}
              />
            ))}
            {paged.length === 0 && (
              <div className="py-20 text-center">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No entries found for this period</p>
              </div>
            )}
            <div className="mt-4">
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
            </div>
          </div>
        </div>
      )}

      {/* Primary Action FAB */}
      <FAB 
        icon={Plus} 
        label={editingEntity ? "Update" : "Add Sale"}
        onClick={() => setShowForm(true)}
        className="!bg-emerald-600"
      />

      {showForm && (
        <Modal 
          title={editingEntity ? `Edit ${fuelType} Sale` : `Add ${fuelType} Sale`} 
          onClose={closeForm} 
          variant="bottom-sheet"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-dark-950/20 -m-6 p-6">
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Effective Date</label>
                <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.date} onChange={(e) => set('date', e.target.value)} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Transaction Note</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="e.g., Daily Account Sale" dir="auto" />
              </div>

              <div className="flex gap-4">
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Liters (Qty)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} placeholder="0.00" required />
                </div>
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-blue-600 px-1">Rate (PKR)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl" value={form.rate} onChange={(e) => set('rate', e.target.value)} placeholder="0.00" required />
                </div>
              </div>

              <div className="bg-emerald-600/5 dark:bg-emerald-600/10 p-4 rounded-2xl border border-emerald-600/20">
                 <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Receivable</p>
                 <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums leading-none truncate max-w-full">₨ {formatCurrency(Number(form.amount))}</p>
              </div>
            </div>

            <div className="sticky-bottom-actions">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editingEntity ? 'Update' : 'Confirm Sale'}
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
