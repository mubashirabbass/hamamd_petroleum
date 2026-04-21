import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Package, Landmark } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import FAB from '../components/ui/FAB';
import MobileActivityCard from '../components/ui/MobileActivityCard';
import ModuleHeader from '../components/ui/ModuleHeader';

// const PER_PAGE = 40; // Replaced by state

export default function AssetPage() {
  const { 
    assetCategories, assetEntries, 
    addAssetCategory, updateAssetCategory, deleteAssetCategory, 
    addAssetEntry, deleteAssetEntry, settings, currentUser, updateAssetEntry 
  } = useStore();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else if (tab === 'dashboard') setActiveTab('dashboard');
    else if (tab === 'database') setActiveTab('database');
    else if (tab === 'manage') setActiveTab('manage');
  }, [searchParams]);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const isExpanded = isSidebarPinned;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  
  // Registration Form State
  const [newName, setNewName] = useState('');

  // Management State
  const [manageSearch, setManageSearch] = useState('');
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });

  // Transaction Table State
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [dashPage, setDashPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [perPage, setPerPage] = useState(40);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [dashSort, setDashSort] = useState('name_asc');
  const [entrySort, setEntrySort] = useState('date_desc');
  const [sidebarSort, setSidebarSort] = useState('name_asc');
  
  useEffect(() => {
    if (!selectedCat && assetCategories.length > 0) {
      setSelectedCat(assetCategories[0].id);
    }
  }, [assetCategories, selectedCat]);

  const cat = assetCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() => {
    const list = assetCategories.filter((c) => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
    
    const withBalances = list.map(c => {
      const entries = filterByStartDate(assetEntries, settings.startDate).filter(e => e.categoryId === c.id);
      const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
      const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
      return { ...c, balance: Math.abs(debit - credit) };
    });

    return [...withBalances].sort((a, b) => {
      switch (sidebarSort) {
        case 'name_asc':     return a.name.localeCompare(b.name);
        case 'name_desc':    return b.name.localeCompare(a.name);
        case 'balance_desc': return b.balance - a.balance;
        case 'balance_asc':  return a.balance - b.balance;
        default:             return a.name.localeCompare(b.name);
      }
    });
  }, [assetCategories, sidebarSearch, sidebarSort, assetEntries, settings.startDate]);

  const filteredManage = useMemo(() =>
    assetCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [assetCategories, manageSearch]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(assetEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [assetEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const withBalance = useMemo(() => {
    const chronological = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const computed = chronological.map((e) => {
      bal += (e.debit || 0) - (e.credit || 0);
      return { ...e, balance: bal };
    });

    return [...computed].sort((a, b) => {
      switch (entrySort) {
        case 'date_desc':        return b.date.localeCompare(a.date);
        case 'date_asc':         return a.date.localeCompare(b.date);
        case 'description_asc':  return (a.description || '').localeCompare(b.description || '');
        case 'description_desc': return (b.description || '').localeCompare(a.description || '');
        case 'debit_desc':       return (b.debit || 0) - (a.debit || 0);
        case 'debit_asc':        return (a.debit || 0) - (b.debit || 0);
        case 'credit_desc':      return (b.credit || 0) - (a.credit || 0);
        case 'credit_asc':       return (a.credit || 0) - (b.credit || 0);
        case 'balance_desc':     return b.balance - a.balance;
        case 'balance_asc':      return a.balance - b.balance;
        default:                 return b.date.localeCompare(a.date);
      }
    });
  }, [filteredEntries, entrySort]);

  const paged = paginate(withBalance, page, perPage);

  const pageTotals = useMemo(() => ({
    debit: paged.reduce((s, e) => s + (e.debit || 0), 0),
    credit: paged.reduce((s, e) => s + (e.credit || 0), 0),
  }), [paged]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date) { toast('Fill required fields', 'error'); return; }
    
    const debit = parseFloat(form.debit) || 0;
    const credit = parseFloat(form.credit) || 0;
    const payload = { categoryId: selectedCat, date: form.date, description: form.description, debit, credit, balance: 0 };
    
    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateAssetEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeForm(); // Close after edit
      } else {
        await addAssetEntry(payload);
        toast('Entry added', 'success');
        resetFormForNext(); // Stay open after add
      }
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err?.message || err || 'Unknown database error';
      toast(`Failed to save: ${msg}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetFormForNext = () => {
    setEditingEntity(null);
    setForm(prev => ({ ...prev, description: '', debit: '', credit: '' }));
  };

  const closeForm = () => {
    setShowEntryForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', debit: '', credit: '' });
  };

  const handleEdit = (e: any) => {
    setEditingEntity(e);
    setForm({
      date: e.date,
      description: e.description || '',
      debit: e.debit ? e.debit.toString() : '',
      credit: e.credit ? e.credit.toString() : '',
    });
    setShowEntryForm(true);
  };

  const totals = useMemo(() => ({
    debit: filteredEntries.reduce((s, e) => s + (e.debit || 0), 0),
    credit: filteredEntries.reduce((s, e) => s + (e.credit || 0), 0),
  }), [filteredEntries]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const normalized = newName.trim().toLowerCase();
    if (assetCategories.some(c => c.name.toLowerCase() === normalized)) {
      toast('An asset account with this name already exists!', 'error');
      return;
    }

    addAssetCategory(newName.trim());
    setNewName('');
    toast('Account registered successfully', 'success');
    setActiveTab('dashboard');
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;

    const normalized = editForm.name.trim().toLowerCase();
    if (assetCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another asset account already has this name!', 'error');
      return;
    }

    updateAssetCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Account details updated', 'success');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader 
        title="Asset" 
        icon={Landmark} 
        iconClassName="!bg-emerald-100 !text-emerald-600"
      />

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
          <button
            onClick={() => setActiveTab('register')}
            className={cn("segmented-item", activeTab === 'register' ? "segmented-item-active" : "segmented-item-inactive")}
          >
            New Asset
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn("segmented-item", activeTab === 'manage' ? "segmented-item-active" : "segmented-item-inactive")}
          >
            Settings
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-0 md:gap-4 h-full w-full overflow-hidden">

        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-10">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(() => {
                const allFilteredEntries = filterByStartDate(assetEntries, settings.startDate)
                  .filter(e => {
                    const matchesFrom = !fromDate || e.date >= fromDate;
                    const matchesTo = !toDate || e.date <= toDate;
                    return matchesFrom && matchesTo;
                  });
                const globalDebit = allFilteredEntries.reduce((sum, e) => sum + e.debit, 0);
                const globalCredit = allFilteredEntries.reduce((sum, e) => sum + e.credit, 0);
                const globalNet = globalDebit - globalCredit;
                
                return (
                  <>
                    <div className="glass p-4 rounded-3xl border-l-4 border-emerald-600 shadow-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-dark-900 col-span-2">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Asset Valuation</p>
                      <p className={cn("text-2xl font-black tabular-nums leading-tight", globalNet >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                        ₨ {formatCurrency(Math.abs(globalNet))}
                        <span className="text-[10px] ml-1 font-bold text-slate-400 uppercase">{globalNet >= 0 ? 'DR' : 'CR'}</span>
                      </p>
                    </div>
                    <div className="glass p-4 rounded-3xl border-l-4 border-slate-400 shadow-xl bg-white/50 dark:bg-dark-800/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accounts</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{assetCategories.length}</p>
                    </div>
                    <div className="glass p-4 rounded-3xl border-l-4 border-primary-500 shadow-xl bg-primary-50/30 dark:bg-primary-900/10">
                      <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1">Entries</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{allFilteredEntries.length}</p>
                    </div>
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mb-6">
              <div className="flex-1 min-w-[120px]">
                <SearchBar 
                  value={dashboardSearch} 
                  onChange={setDashboardSearch} 
                  placeholder="Search..." 
                  fullWidth={true}
                  className="!py-1.5 !text-[11px]"
                />
              </div>
              
              <div className="relative group shrink-0">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors pointer-events-none" />
                <select
                  value={dashSort}
                  onChange={(e) => setDashSort(e.target.value)}
                  className="appearance-none pl-7 pr-8 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="name_asc">A-Z</option>
                  <option value="name_desc">Z-A</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                </div>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                <button 
                  onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg", (fromDate === today() && toDate === today()) ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm" : "text-slate-500")}
                >
                  Today
                </button>
                <button 
                  onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border-l border-slate-200 dark:border-dark-700/50", (fromDate === startOfMonth() && toDate === today()) ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm" : "text-slate-500")}
                >
                  Month
                </button>
              </div>

              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="p-2 text-red-600 shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>


            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              <div className="space-y-3 mb-20">
                {(() => {
                  const itemsWithTotals = assetCategories.map(cat => {
                    const entries = filterByStartDate(assetEntries, settings.startDate)
                      .filter(e => e.categoryId === cat.id)
                      .filter(e => {
                        const matchesFrom = !fromDate || e.date >= fromDate;
                        const matchesTo = !toDate || e.date <= toDate;
                        return matchesFrom && matchesTo;
                      });
                    const debit = entries.reduce((sum, e) => sum + (e.debit || 0), 0);
                    const credit = entries.reduce((sum, e) => sum + (e.credit || 0), 0);
                    const balance = debit - credit;
                    return { ...cat, balance, count: entries.length };
                  });

                  const filtered = itemsWithTotals.filter(c => 
                    !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase())
                  );

                  const sorted = [...filtered].sort((a, b) => {
                    switch (dashSort) {
                      case 'name_asc':  return a.name.localeCompare(b.name);
                      case 'name_desc': return b.name.localeCompare(a.name);
                      case 'val_desc':  return b.balance - a.balance;
                      case 'val_asc':   return a.balance - b.balance;
                      default:          return 0;
                    }
                  });

                  return sorted.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }}
                      className="glass p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all border-l-4 border-l-emerald-500 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                          <Briefcase className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.count} Entries</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-lg font-black tabular-nums leading-none", cat.balance >= 0 ? "text-slate-900 dark:text-white" : "text-red-500")}>₨ {formatCurrency(Math.abs(cat.balance))} <span className="text-[9px]">{cat.balance >= 0 ? 'DR' : 'CR'}</span></p>
                        <ArrowRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {assetCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-dark-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-dark-700/50">
                <Briefcase className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No Assets Registered</p>
                <button onClick={() => setActiveTab('register')} className="mt-4 text-xs font-black text-emerald-600 uppercase tracking-widest hover:underline">Register your first asset →</button>
              </div>
            )}
          </div>
        ) : activeTab === 'database' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-20">
            {/* Account Pill Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 pb-2">
               {assetCategories.map(c => (
                 <button
                   key={c.id}
                   onClick={() => { setSelectedCat(c.id); setPage(1); }}
                   className={cn(
                     "flex-shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                     selectedCat === c.id 
                       ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" 
                       : "bg-white dark:bg-dark-900 text-slate-500 border border-slate-200 dark:border-dark-800"
                   )}
                 >
                   {c.name}
                 </button>
               ))}
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mb-4">
              <div className="flex-1 min-w-[120px]">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." fullWidth className="!py-1.5 !text-[11px]" />
              </div>
              <button 
                onClick={() => setShowReport(true)}
                className="btn-secondary !py-2 !px-3 !bg-emerald-50 dark:!bg-emerald-900/10 !text-emerald-600 !border-emerald-200 dark:!border-emerald-800 shrink-0 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print Report
              </button>
              <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                <input 
                  type="date" 
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-20 px-1" 
                  value={fromDate} 
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }} 
                />
                <span className="text-[10px] text-slate-300">→</span>
                <input 
                  type="date" 
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-20 px-1" 
                  value={toDate} 
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }} 
                />
              </div>
              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="p-2 text-red-600 shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
            <div className="flex-1 glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex flex-col min-h-0">
              <div className="flex-1 overflow-x-auto overflow-y-auto smart-scroll">
                <table className="table-excel min-w-[900px] w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800 shadow-sm">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left px-4">Date</th>
                      <th className="table-cell text-left px-4">Description</th>
                      <th className="table-cell text-right px-4">Debit (+)</th>
                      <th className="table-cell text-right px-4">Credit (-)</th>
                      <th className="table-cell text-right px-4">Balance</th>
                      <th className="table-cell text-center px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      paged.map((e) => (
                        <tr key={e.id} className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group">
                          <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(e.date)}</td>
                          <td className="table-cell font-medium text-slate-900 dark:text-white" dir="auto">{e.description || 'Asset Transaction'}</td>
                          <td className="table-cell text-right tabular-nums text-emerald-600 font-bold">{e.debit > 0 ? `₨ ${formatCurrency(e.debit)}` : '---'}</td>
                          <td className="table-cell text-right tabular-nums text-orange-500 font-bold">{e.credit > 0 ? `₨ ${formatCurrency(e.credit)}` : '---'}</td>
                          <td className="table-cell text-right tabular-nums font-black text-slate-900 dark:text-white">
                            ₨ {formatCurrency(Math.abs(e.balance))}
                            <span className="text-[9px] ml-1 opacity-50">{e.balance >= 0 ? 'DR' : 'CR'}</span>
                          </td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Print Receipt"><Printer className="w-4 h-4" /></button>
                              <button onClick={() => handleEdit(e)} className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" title="Edit"><Edit2 className="w-4 h-4" /></button>
                              {currentUser?.role === 'Admin' && (
                                <button onClick={() => { if(confirm('Delete entry?')) deleteAssetEntry(e.id); }} className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-dark-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-[11px] font-black uppercase tracking-wider">
                    <tr className="border-t-2 border-slate-300 dark:border-dark-700">
                      <td colSpan={2} className="px-4 py-3 text-right text-slate-500">Page Total:</td>
                      <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">₨ {formatCurrency(pageTotals.debit)}</td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums border-r border-slate-200 dark:border-dark-800">₨ {formatCurrency(pageTotals.credit)}</td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr className="bg-emerald-600 text-white border-t border-white/10">
                      <td colSpan={2} className="px-4 py-3 text-right opacity-80">Filters Grand Total:</td>
                      <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(totals.debit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums border-r border-white/20">₨ {formatCurrency(totals.credit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-black" colSpan={2}>
                        NET: ₨ {formatCurrency(Math.abs(totals.debit - totals.credit))} 
                        <span className="text-[9px] ml-1 opacity-80">{totals.debit - totals.credit >= 0 ? 'DR' : 'CR'}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
              <div className="mt-4">
                <Pagination page={page} total={withBalance.length} perPage={perPage} onChange={setPage} />
              </div>
            </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="flex-1 animate-in zoom-in-95 duration-300">
            <div className="max-w-2xl mx-auto glass p-8 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-2xl mt-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Asset Registration</h2>
                  <p className="text-sm text-slate-500 font-medium">Create a new entry in your Asset database</p>
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2 block">Asset Name *</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="input !pl-12 !py-4 !text-sm !font-bold" 
                        placeholder="e.g. Building, Generator, Land, etc." 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        required 
                        autoFocus
                        dir="auto"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-dark-800 flex items-center justify-between">
                   <p className="text-xs text-slate-400 font-medium italic">All required fields marked with *</p>
                   <button type="submit" className="btn-primary !px-12 !py-4 font-black shadow-xl shadow-emerald-600/20 text-base flex items-center gap-2 !bg-emerald-600 hover:opacity-90">
                     <Check className="w-5 h-5" /> Complete Registration
                   </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Manage View */
          <div className="flex-1 animate-in slide-in-from-right duration-300 flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-dark-900/50 p-6 rounded-2xl border border-slate-200 dark:border-dark-700/50 shadow-sm mt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    className="input !pl-10 !py-3 !text-sm !font-bold" 
                    placeholder="Quick search..." 
                    value={manageSearch} 
                    onChange={e => setManageSearch(e.target.value)} 
                  />
                </div>
                <div className="px-6 py-3 bg-slate-100 dark:bg-dark-800 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-dark-700/50">
                  {assetCategories.length} Accounts Found
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex-1 flex flex-col">
               <div className="overflow-y-auto smart-scroll">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10">
                      <tr className="table-header text-[10px]">
                        <th className="table-cell text-left">Asset Name</th>
                        <th className="table-cell text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                      {filteredManage.length === 0 ? (
                        <tr><td colSpan={2} className="px-6 py-20 text-center text-slate-400 italic font-medium">No results found</td></tr>
                      ) : filteredManage.map((c) => (
                        <tr 
                          key={c.id} 
                          className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group cursor-pointer"
                          onClick={() => handleStartEdit(c)}
                        >
                           {editingId === c.id ? (
                             <>
                               <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                                  <input className="input !py-1.5 !text-sm w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus dir="auto" />
                               </td>
                               <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  <div className="flex items-center gap-2 justify-end">
                                     <button onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 rounded-xl"><Check className="w-5 h-5" /></button>
                                     <button onClick={() => setEditingId(null)} className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-700 rounded-xl"><X className="w-5 h-5" /></button>
                                  </div>
                               </td>
                             </>
                           ) : (
                             <>
                               <td className="table-cell">
                                  <div className="flex items-center gap-3">
                                     <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                                  </div>
                               </td>
                               <td className="table-cell text-right">
                                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => handleStartEdit(c)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                     {currentUser?.role === 'Admin' && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); if(confirm('Delete account and all history?')) deleteAssetCategory(c.id); }} 
                                         className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                     )}
                                  </div>
                               </td>
                             </>
                           )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}
      </div>

      {showEntryForm && (
        <Modal 
          title={editingEntity ? `Edit ${cat?.name}` : `Add ${cat?.name}`} 
          onClose={closeForm} 
          variant="bottom-sheet"
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full bg-slate-50 dark:bg-dark-950/20 -m-6 p-6">
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll no-scrollbar">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Transaction Date</label>
                <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Description / Details</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Purchased New Equipment" dir="auto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Debit (+) Addition</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl !text-emerald-600 shadow-sm" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-orange-600 px-1">Credit (-) Disposal</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl !text-orange-600 shadow-sm" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              <div className="bg-emerald-600/5 dark:bg-emerald-600/10 p-5 rounded-3xl border border-emerald-600/10 text-center shadow-xl shadow-emerald-500/5">
                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Impact On Valuation</p>
                 <p className={cn("text-2xl font-black tabular-nums tracking-tight", (Number(form.debit)||0) - (Number(form.credit)||0) >= 0 ? "text-slate-900 dark:text-white" : "text-red-500")}>
                   ₨ {formatCurrency(Math.abs((Number(form.debit)||0) - (Number(form.credit)||0)))}
                   <span className="text-[10px] ml-1 uppercase">{(Number(form.debit)||0) - (Number(form.credit)||0) >= 0 ? 'DR' : 'CR'}</span>
                 </p>
              </div>
            </div>

            <div className="sticky-bottom-actions !bg-white/80 dark:!bg-dark-900/80 backdrop-blur-xl border-t border-slate-100 dark:border-dark-800 -mx-6 px-6 pt-4 pb-8">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-emerald-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingEntity ? 'Update Asset' : 'Confirm Entry'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Primary Mobile Action */}
      {activeTab === 'dashboard' || activeTab === 'database' ? (
        <FAB 
          icon={Plus} 
          onClick={() => {
            if (!selectedCat && assetCategories.length > 0) setSelectedCat(assetCategories[0].id);
            if (assetCategories.length === 0) {
               setActiveTab('register');
               toast('Please register an account first', 'info');
            } else {
               setShowEntryForm(true);
            }
          }} 
          label="NEW"
        />
      ) : null}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="asset"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && (
        <PrintReportModal
          data={withBalance}
          type="asset"
          title={`${cat?.name} Asset Report`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
