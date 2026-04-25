import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Plus, Trash2, Eye, Edit2, Printer, BarChart3, ArrowRight, History, Zap, Fuel, 
  LayoutGrid, Database, Save, Pin, PinOff, ArrowUpDown, XCircle, ShoppingCart
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, startOfMonth, startOfYear, getErrorMessage, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import { useConfirm } from '../contexts/ConfirmContext';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import type { FuelType } from '../store/useStore';

export default function PurchasePage() {
  const { purchases, addPurchase, updatePurchase, deletePurchase, settings, currentUser } = useStore();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  // Layout State
  const [perPage, setPerPage] = useState(20);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database'>('dashboard');
  const [fuelType, setFuelType] = useState<FuelType>('HSD');
  const [showForm, setShowForm] = useState(false);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarPinned || isSidebarHovered;

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
  const [entrySort, setEntrySort] = useState('date_desc');
  const [form, setForm] = useState({
    date: today(),
    description: '',
    invoiceNo: '',
    vehicleNo: '',
    details: '',
    rate: '',
    quantity: '',
    carriage: '',
    amount: '',
    totalAmount: '',
  });

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, fromDate, toDate, fuelType]);

  const handleFuelSelect = (type: FuelType) => {
    setFuelType(type);
    setSearch('');
    setPage(1);
  };

  const filtered = useMemo(() => {
    let list = filterByStartDate(purchases, settings.startDate)
      .filter((p) => p.type?.toUpperCase() === fuelType.toUpperCase())
      .filter((p) => {
        const matchesSearch = !search || p.date.includes(search) || (p.invoiceNo && p.invoiceNo.toLowerCase().includes(search.toLowerCase())) || (p.vehicleNo && p.vehicleNo.toLowerCase().includes(search.toLowerCase()));
        const matchesFrom = !fromDate || p.date >= fromDate;
        const matchesTo = !toDate || p.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });

    if (entrySort === 'date_desc') list.sort((a,b) => b.date.localeCompare(a.date));
    if (entrySort === 'date_asc')  list.sort((a,b) => a.date.localeCompare(b.date));
    if (entrySort === 'qty_desc')   list.sort((a,b) => b.quantity - a.quantity);
    if (entrySort === 'amt_desc')   list.sort((a,b) => b.totalAmount - a.totalAmount);
    
    return list;
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
      details: form.details,
      rate: parseFloat(form.rate),
      quantity: parseFloat(form.quantity),
      carriage: parseFloat(form.carriage) || 0,
      amount: parseFloat(form.amount),
      totalAmount: parseFloat(form.totalAmount),
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        const confirmed = await confirm('Save changes to this purchase entry?', {
          title: 'Confirm Update',
          kind: 'warning'
        });
        if (!confirmed) { setIsSaving(false); return; }

        await updatePurchase(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeForm();
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
      details: '',
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
    setForm({ date: today(), description: '', invoiceNo: '', vehicleNo: '', details: '', rate: '', quantity: '', carriage: '', amount: '', totalAmount: '' });
  };

  const handleEdit = (p: any) => {
    setEditingEntity(p);
    setForm({
      date: p.date,
      description: p.description || '',
      invoiceNo: p.invoiceNo || '',
      vehicleNo: p.vehicleNo || '',
      details: p.details || '',
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
      recent: [...periodPurchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
    };
  }, [purchases, settings.startDate, fromDate, toDate]);

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      {/* View Switcher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 pb-0 w-full">
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-dark-800 p-1.5 rounded-2xl border border-slate-200 dark:border-dark-700 w-fit">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'dashboard' 
                ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm border border-slate-200 dark:border-dark-700" 
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
                ? "bg-white dark:bg-dark-900 text-blue-600 shadow-sm border border-slate-200 dark:border-dark-700" 
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
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden p-4 md:p-6 pb-10">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/10 dark:bg-blue-600/20 flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Purchase Analysis</h1>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Global Purchase Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="glass px-4 py-2 rounded-2xl border border-amber-200 dark:border-amber-800/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">HSD Avg Rate</p>
                    <p className="text-lg font-black text-amber-600 dark:text-amber-400 tabular-nums leading-none font-mono tracking-tighter">
                      ₨ {formatCurrency(dashStats.HSD.qty > 0 ? dashStats.HSD.total / dashStats.HSD.qty : 0)}
                    </p>
                  </div>
                </div>
                <div className="glass px-4 py-2 rounded-2xl border border-blue-200 dark:border-blue-800/30 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">PMG Avg Rate</p>
                    <p className="text-lg font-black text-blue-600 dark:text-blue-400 tabular-nums leading-none font-mono tracking-tighter">
                      ₨ {formatCurrency(dashStats.PMG.qty > 0 ? dashStats.PMG.total / dashStats.PMG.qty : 0)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowReport(true)} className="btn-secondary flex items-center gap-2"><Printer className="w-4 h-4" /> Reports</button>
                <button onClick={() => setShowForm(true)} className="btn-primary !bg-blue-600 flex items-center gap-2"><Plus className="w-4 h-4" /> New Entry</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {[
              { id: 'HSD', label: 'High Speed Diesel', stats: dashStats.HSD, icon: Fuel, color: 'emerald' },
              { id: 'PMG', label: 'Premium Motor Gasoline', stats: dashStats.PMG, icon: Zap, color: 'blue' }
            ].map(fuel => (
              <div key={fuel.id} className="glass rounded-[2rem] p-6 border border-slate-200 dark:border-dark-700/50 relative overflow-hidden group hover:scale-[1.01] transition-transform shadow-xl">
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-bl-full -mr-16 -mt-16 opacity-10", fuel.id === 'HSD' ? 'bg-amber-500' : 'bg-blue-500')} />
                
                <div className="flex items-center gap-4 mb-6">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", fuel.id === 'HSD' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600')}>
                    <fuel.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{fuel.id} Purchase</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fuel.label}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800/50 pb-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Liters</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {fuel.stats.qty?.toLocaleString() || '0'} <span className="text-xs text-slate-400 font-normal">L</span>
                        <span className="text-[10px] ml-2 text-slate-400">({fuel.stats.count} records)</span>
                      </p>
                    </div>
                    <div className="space-y-1 sm:text-right flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg Rate</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(fuel.stats.avgPrice)}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800/50 pb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Product Cost</p>
                        <p className="text-sm font-black text-slate-500 tabular-nums">₨ {formatCurrency(fuel.stats.amt)}</p>
                      </div>
                      <div className="space-y-1 sm:text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carriage</p>
                        <p className="text-sm font-black text-slate-500 tabular-nums">₨ {formatCurrency(fuel.stats.carriage)}</p>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-600 dark:bg-blue-600/10 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
                      <p className="text-[10px] font-black text-white dark:text-blue-400 uppercase tracking-widest mb-1">Total Purchase Cost</p>
                      <p className={cn(
                        "font-black tabular-nums break-words leading-tight text-white dark:text-blue-400",
                        formatCurrency(fuel.stats.total).length > 15 ? "text-xl lg:text-2xl" : "text-2xl lg:text-4xl"
                      )}>
                        <span className="text-lg mr-1 opacity-70">₨</span>
                        {formatCurrency(fuel.stats.total)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl">
            <div className="p-6 border-b border-slate-100 dark:border-dark-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-slate-400" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Recent Purchases</h3>
              </div>
              <button 
                onClick={() => setActiveTab('database')}
                className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500 transition-colors flex items-center gap-1.5"
              >
                Show All Entries <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-auto max-h-[500px] smart-scroll">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-dark-900/50">
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-dark-800">
                    <th className="px-6 py-4 text-left">Date</th>
                    <th className="px-6 py-4 text-left">Invoice No</th>
                    <th className="px-6 py-4 text-left">Description</th>
                    <th className="px-6 py-4 text-right">Qty (L)</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                  {dashStats.recent.map(p => (
                    <tr key={p.id} className="text-[11px] group hover:bg-slate-50/50 dark:hover:bg-dark-800/30 transition-all">
                      <td className="px-6 py-4 font-bold text-slate-600 dark:text-dark-300">{formatDate(p.date)}</td>
                      <td className="px-6 py-4 font-black text-blue-600">{p.invoiceNo || '—'}</td>
                      <td className="px-6 py-4 font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{p.description || 'Direct Purchase'}</td>
                      <td className="px-6 py-4 text-right font-black tabular-nums">{p.quantity?.toLocaleString() || '0'}</td>
                      <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums">₨ {formatCurrency(p.totalAmount)}</td>
                    </tr>
                  ))}
                  {dashStats.recent.length === 0 && (
                    <tr><td colSpan={5} className="py-12 text-center text-xs text-slate-400 italic">No recent purchases found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex gap-4 h-full w-full min-h-0 overflow-hidden p-4">
          {/* Sidebar selection */}
          <div 
            onMouseEnter={() => setIsSidebarHovered(true)}
            onMouseLeave={() => setIsSidebarHovered(false)}
            className={cn(
              "flex-shrink-0 flex flex-col gap-3 h-full transition-all duration-300 ease-in-out border border-slate-200 dark:border-dark-700/50 bg-white/50 dark:bg-dark-900/50 rounded-2xl backdrop-blur-md",
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
              <div className="flex-1 overflow-auto smart-scroll">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[9px]">
                      <th className="table-cell text-left min-w-[100px]">Date</th>
                      <th className="table-cell text-left min-w-[120px]">Invoice No</th>
                      <th className="table-cell text-left min-w-[400px]">Description</th>
                      <th className="table-cell text-left min-w-[120px]">Vehicle No</th>
                      <th className="table-cell text-right min-w-[100px]">Rate</th>
                      <th className="table-cell text-right min-w-[120px]">Qty (L)</th>
                      <th className="table-cell text-right min-w-[140px]">Carriage</th>
                      <th className="table-cell text-right min-w-[160px]">Amount</th>
                      <th className="table-cell text-right font-black min-w-[180px]">Total</th>
                      <th className="table-cell w-20 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={10} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No {fuelType} purchases found {settings.startDate ? `since ${settings.startDate}` : ''}</td></tr>
                    ) : paged.map((p) => (
                      <tr key={p.id} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[11px]">
                        <td className="table-cell whitespace-nowrap">{formatDate(p.date)}</td>
                        <td className="table-cell font-medium text-emerald-600 whitespace-nowrap truncate max-w-[7rem]">{p.invoiceNo || '—'}</td>
                        <td className="table-cell whitespace-normal break-words leading-4 truncate">{p.description || '—'}</td>
                        <td className="table-cell text-slate-500 uppercase tracking-wider whitespace-nowrap truncate max-w-[7rem]">{p.vehicleNo || '—'}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.rate)}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">{p.quantity?.toLocaleString() || '0'}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.carriage)}</td>
                        <td className="table-cell text-right whitespace-nowrap tabular-nums">₨{formatCurrency(p.amount)}</td>
                        <td className="table-cell text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap tabular-nums">₨{formatCurrency(p.totalAmount)}</td>
                        <td className="table-cell text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setViewingEntity(p)} className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-emerald-800/30 rounded hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all"><Printer className="w-3 h-3" /><span>PRINT</span></button>
                            <button onClick={() => setViewingEntity(p)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors" title="View Details"><Eye className="w-4 h-4" /></button>
                            {currentUser?.role === 'Admin' && (
                              <>
                                <button onClick={() => handleEdit(p)} className="p-1.5 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors" title="Edit Entry"><Edit2 className="w-4 h-4" /></button>
                                <button 
                                  onClick={async () => { 
                                    if (await confirm('Are you sure you want to delete this purchase entry?', { title: 'Confirm Deletion', kind: 'warning' })) { 
                                      deletePurchase(p.id); 
                                      toast('Purchase deleted', 'warning'); 
                                    } 
                                  }} 
                                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors" 
                                  title="Delete Entry"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {paged.length > 0 && (
                    <tfoot className="bg-slate-50/50 dark:bg-dark-800/50 border-t-[3px] border-double border-slate-300 dark:border-dark-600">
                      {/* Page Total Row */}
                      <tr className="bg-slate-100/50 dark:bg-dark-800/30">
                        <td colSpan={5} className="px-4 py-2 text-right">
                          <span className="text-[10px] font-black text-slate-500 dark:text-dark-400 uppercase tracking-widest italic">Page Total</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-600 dark:text-dark-400 tabular-nums">{pageTotals.qty?.toLocaleString() || '0'} L</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-600 dark:text-dark-400 tabular-nums">₨ {formatCurrency(pageTotals.carriage)}</span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <span className="text-xs font-bold text-slate-600 dark:text-dark-400 tabular-nums">₨ {formatCurrency(pageTotals.amount)}</span>
                        </td>
                        <td className="px-4 py-2 text-right whitespace-nowrap">
                           <span className="text-[14px] font-black text-slate-700 dark:text-dark-300">₨ {formatCurrency(pageTotals.total)}</span>
                        </td>
                        <td className="table-cell"></td>
                      </tr>
                      {/* Grand Total Row */}
                      <tr className="bg-slate-200 dark:bg-dark-800 border-t-2 border-slate-400">
                        <td colSpan={5} className="px-4 py-3 text-right">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">Grand Total Analysis</span>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap">
                          <span className="text-sm font-black text-slate-900 dark:text-white">{grandTotals.qty?.toLocaleString() || '0'} L</span>
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap text-xs font-bold text-slate-500">
                          ₨{formatCurrency(grandTotals.carriage)}
                        </td>
                        <td className="px-2 py-3 text-right whitespace-nowrap text-xs font-bold text-slate-500">
                          ₨{formatCurrency(grandTotals.amount)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                            <span className="text-lg font-black text-primary-600 dark:text-primary-400 leading-none">₨{formatCurrency(grandTotals.total)}</span>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 mt-0.5 italic tracking-wider font-black">₨ {formatCurrency(grandTotals.qty > 0 ? grandTotals.total / grandTotals.qty : 0)} / L</span>
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
        <Modal 
          title={editingEntity ? `Edit ${fuelType} Purchase` : `Add ${fuelType} Purchase`} 
          onClose={closeForm}
          wide
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            {/* Header / Info Section */}
            <div className="bg-slate-50 dark:bg-dark-800/50 rounded-2xl p-4 mb-4 border border-slate-200 dark:border-dark-700/50">
              <div className="desktop-form-row">
                <label className="desktop-form-label">Date *</label>
                <div className="desktop-form-field">
                  <input type="date" className="input !py-1.5" value={form.date} onChange={(e) => set('date', e.target.value)} required />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Invoice No</label>
                <div className="desktop-form-field">
                  <input className="input !py-1.5" value={form.invoiceNo} onChange={(e) => set('invoiceNo', e.target.value)} placeholder="e.g. INV-202611" dir="auto" />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Vehicle No</label>
                <div className="desktop-form-field">
                  <input className="input !py-1.5" value={form.vehicleNo} onChange={(e) => set('vehicleNo', e.target.value)} placeholder="e.g. LHR-4567" dir="auto" />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Description</label>
                <div className="desktop-form-field">
                  <input className="input !py-1.5" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Purchase order note" dir="auto" />
                </div>
              </div>
            </div>

            {/* Financials Section */}
            <div className="px-2 space-y-1">
              <div className="desktop-form-row">
                <label className="desktop-form-label text-blue-600 dark:text-blue-400">Rate (₨) *</label>
                <div className="desktop-form-field">
                  <input type="number" step="any" className="input !py-1.5 !bg-blue-50/30 dark:!bg-blue-900/10 focus:ring-blue-500/20" value={form.rate} onChange={(e) => set('rate', e.target.value)} required />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label text-emerald-600 dark:text-emerald-400">Quantity (L) *</label>
                <div className="desktop-form-field">
                  <input type="number" step="any" className="input !py-1.5 !bg-emerald-50/30 dark:!bg-emerald-900/10 focus:ring-emerald-500/20" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required />
                </div>
              </div>
               <div className="desktop-form-row">
                <label className="desktop-form-label text-amber-600 dark:text-amber-400">Carriage</label>
                <div className="desktop-form-field">
                  <input type="number" step="any" className="input !py-1.5 !bg-amber-50/30 dark:!bg-amber-900/10 focus:ring-amber-500/20" value={form.carriage} onChange={(e) => set('carriage', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Footer Summary Strip */}
            <div className="desktop-form-footer">
              <div className="desktop-summary-strip flex-1 mr-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Gross Amount</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white font-mono">Rs {formatCurrency(Number(form.amount))}</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-dark-700" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-primary-600 uppercase tracking-tighter">Total Payable</span>
                  <span className="text-lg font-black text-primary-600 dark:text-primary-400 font-mono tracking-tighter">Rs {formatCurrency(Number(form.totalAmount))}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeForm} className="btn-secondary !py-2 !px-4" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary !py-2 !px-6" disabled={isSaving}>
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingEntity ? 'Update' : 'Confirm [F10]'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      ) /* End showForm */}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="purchase" onClose={() => setViewingEntity(null)} />}
      {showReport && <PrintReportModal data={filtered} type="purchase" title={`${fuelType} Purchase Report`} fromDate={fromDate} toDate={toDate} onClose={() => setShowReport(false)} />}
    </div>
  );
}
