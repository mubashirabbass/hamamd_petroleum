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

<<<<<<< Updated upstream
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
           <div className="segmented-control !bg-blue-50/50 dark:!bg-blue-900/10 !p-0.5 shrink-0 !w-auto">
              {(['HSD', 'PMG'] as FuelType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => handleFuelSelect(t)}
                  className={cn(
                    "segmented-item !py-1.5 !px-4",
                    fuelType === t ? "!bg-blue-600 !text-white !shadow-md" : "!text-blue-600/60"
                  )}
                >
                  {t}
                </button>
              ))}
           </div>
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
=======
        {/* Date filter area — stacks on mobile, row on desktop */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          {/* Preset buttons — scroll horizontally so they never wrap */}
          <div className="flex items-center overflow-x-auto no-scrollbar">
            <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
              <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all whitespace-nowrap">Today</button>
              <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50 whitespace-nowrap">This Month</button>
              <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50 whitespace-nowrap">This Year</button>
            </div>
          </div>
          {/* From / To date inputs — each takes half width on mobile */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="flex-1 md:flex-none flex items-center gap-1 bg-slate-100 dark:bg-dark-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700/50">
              <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">From</span>
              <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-300 outline-none flex-1 min-w-0 md:w-32" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
            </div>
            <div className="flex-1 md:flex-none flex items-center gap-1 bg-slate-100 dark:bg-dark-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700/50">
              <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">To</span>
              <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-300 outline-none flex-1 min-w-0 md:w-32" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
            </div>
          </div>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-48">
          <div className="mb-4">
            <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search historical purchases..." fullWidth />
          </div>

          <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
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
            <div className="mt-4">
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} />
=======
        <div className="flex-1 flex flex-col md:flex-row gap-4 h-full w-full min-h-0 overflow-hidden p-4">
          {/* Sidebar selection */}
          <div 
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            className={cn(
              "flex-shrink-0 flex-col gap-3 h-full transition-all duration-300 ease-in-out border border-slate-200 dark:border-dark-700/50 bg-white/50 dark:bg-dark-900/50 rounded-2xl backdrop-blur-md hidden md:flex",
              isExpanded ? "w-64" : "w-16"
            )}
          >
            <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-dark-800/50">
              {isExpanded && (
                <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left-2">Fuel Types</h2>
              )}
              <button 
                onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors ml-auto",
                  isSidebarPinned ? "text-blue-600 bg-blue-50 dark:bg-blue-900/20" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                )}
                title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
              >
                {isSidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {(['HSD', 'PMG'] as FuelType[]).map((t) => {
                const Icon = t === 'HSD' ? Fuel : Zap;
                const active = fuelType === t;
                return (
                  <div
                    key={t}
                    onClick={() => handleFuelSelect(t)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200",
                      active 
                        ? "bg-blue-600 text-white shadow-lg scale-105" 
                        : "hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500",
                      !isExpanded && "justify-center"
                    )}
                    title={!isExpanded ? `${t} Purchases` : ''}
                  >
                    <Icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-white" : t === 'HSD' ? "text-amber-500" : "text-emerald-500")} />
                    {isExpanded && (
                      <span className="font-black text-xs uppercase tracking-widest truncate animate-in fade-in slide-in-from-left-2">
                        {t} Purchases
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile-only fuel toggle — visible only on small screens */}
          <div className="flex md:hidden gap-2 w-full flex-shrink-0">
            {(['HSD', 'PMG'] as FuelType[]).map((t) => {
              const Icon = t === 'HSD' ? Fuel : Zap;
              return (
                <button
                  key={t}
                  onClick={() => handleFuelSelect(t)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95",
                    fuelType === t
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-dark-400"
                  )}
                >
                  <Icon className="w-4 h-4" /> {t}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-w-0 flex flex-col h-full pr-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                {fuelType} Records
              </h2>
              <div className="flex items-center flex-wrap gap-3">
                  <div className="glass px-4 py-2 rounded-xl border border-blue-200 dark:border-dark-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <History className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{fuelType} Records Avg</p>
                      <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none font-mono tracking-tighter">
                        ₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.total / grandTotals.qty : 0)}
                      </p>
                    </div>
                  </div>
                <button onClick={() => setShowReport(true)} className="btn-secondary !py-2.5 flex items-center gap-2"><Printer className="w-4 h-4" /> Reports</button>
                <button onClick={() => { closeForm(); setShowForm(true); }} className="btn-primary !bg-blue-600 flex items-center gap-2"><Plus className="w-4 h-4" /> New Entry</button>
              </div>
            </div>

            <div className="glass rounded-xl overflow-hidden flex-1 flex flex-col mb-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." />
                  <div className="relative group shrink-0">
                    <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors pointer-events-none" />
                    <select
                      value={entrySort}
                      onChange={(e) => setEntrySort(e.target.value)}
                      className="appearance-none pl-7 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all cursor-pointer outline-none shadow-sm"
                    >
                      <option value="date_desc">Newest</option>
                      <option value="date_asc">Oldest</option>
                      <option value="qty_desc">High Qty</option>
                      <option value="amt_desc">High Amt</option>
                    </select>
                  </div>
                </div>
                { (fromDate || toDate) && (
                    <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30 flex items-center gap-1.5"><XCircle className="w-3 h-3" /> Clear</button>
                )}
              </div>

              {/* Table */}
              {/* ── Single responsive table — no horizontal scroll ── */}
              <div className="flex-1 overflow-y-auto smart-scroll">
                <table className="w-full table-fixed">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-dark-400">
                      <th className="px-3 py-3 text-left w-[90px]">Date</th>
                      <th className="px-3 py-3 text-left w-[90px]">Invoice</th>
                      <th className="hidden md:table-cell px-3 py-3 text-left">Description</th>
                      <th className="hidden md:table-cell px-3 py-3 text-left w-[120px]">Vehicle No</th>
                      <th className="hidden md:table-cell px-3 py-3 text-right w-[100px]">Rate</th>
                      <th className="px-3 py-3 text-right w-[70px]">Qty (L)</th>
                      <th className="hidden md:table-cell px-3 py-3 text-right w-[140px]">Carriage</th>
                      <th className="hidden md:table-cell px-3 py-3 text-right w-[160px]">Amount</th>
                      <th className="px-3 py-3 text-right w-[100px]">Total</th>
                      <th className="px-3 py-3 text-center w-[96px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-3 py-12 text-center text-[11px] text-slate-400 italic">
                          No {fuelType} purchases found
                        </td>
                      </tr>
                    ) : paged.map((p) => (
                      <tr key={p.id} className="group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[10px]">
                        <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-dark-300 font-bold">{formatDate(p.date)}</td>
                        <td className="px-3 py-2.5 font-medium text-blue-600 whitespace-nowrap truncate">{p.invoiceNo || '—'}</td>
                        <td className="hidden md:table-cell px-3 py-2.5 whitespace-normal break-words leading-4 truncate">{p.description || '—'}</td>
                        <td className="hidden md:table-cell px-3 py-2.5 text-slate-500 uppercase tracking-wider whitespace-nowrap truncate">{p.vehicleNo || '—'}</td>
                        <td className="hidden md:table-cell px-3 py-2.5 text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.rate)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-bold text-slate-700 dark:text-dark-200">{p.quantity.toLocaleString()}</td>
                        <td className="hidden md:table-cell px-3 py-2.5 text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.carriage)}</td>
                        <td className="hidden md:table-cell px-3 py-2.5 text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.amount)}</td>
                        <td className="px-3 py-2.5 text-right font-black text-slate-900 dark:text-white whitespace-nowrap tabular-nums">₨{formatCurrency(p.totalAmount)}</td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingEntity(p)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                            {currentUser?.role === 'Admin' && (
                              <>
                                <button onClick={() => handleEdit(p)} className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => { deletePurchase(p.id); toast('Purchase deleted', 'warning'); }} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {paged.length > 0 && (
                    <tfoot className="border-t-2 border-slate-300 dark:border-dark-700">
                      <tr className="bg-slate-100/80 dark:bg-dark-800/50">
                        <td colSpan={2} className="px-3 py-2 text-right hidden md:table-cell"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Page Total</span></td>
                        <td className="px-3 py-2 text-right md:hidden"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Page</span></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-slate-600 dark:text-dark-400">{pageTotals.qty.toLocaleString()}</td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-3 py-2 text-right tabular-nums text-xs font-bold text-slate-700 dark:text-white">₨ {formatCurrency(pageTotals.total)}</td>
                        <td></td>
                      </tr>
                      <tr className="bg-slate-200 dark:bg-dark-800">
                        <td colSpan={2} className="px-3 py-2.5 text-right hidden md:table-cell"><span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Grand Total Analysis</span></td>
                        <td className="px-3 py-2.5 text-right md:hidden"><span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Total</span></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-sm font-black text-slate-900 dark:text-white">{grandTotals.qty.toLocaleString()} L</td>
                        <td className="hidden md:table-cell"></td>
                        <td className="hidden md:table-cell"></td>
                        <td className="px-3 py-2.5 text-right tabular-nums">
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">₨{formatCurrency(grandTotals.total)}</span>
                            <span className="text-[9px] font-black text-blue-600/70 dark:text-blue-400/70">₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.total / grandTotals.qty : 0)}/L</span>
                          </div>
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              <Pagination page={page} total={filtered.length} perPage={perPage} onChange={setPage} onPerPageChange={(v) => { setPerPage(v); setPage(1); }} />
>>>>>>> Stashed changes
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
