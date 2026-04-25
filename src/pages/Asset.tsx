import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Briefcase, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Package, PlusCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import { ask } from '@tauri-apps/plugin-dialog';
import PrintReportModal from '../components/modals/PrintReportModal';

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
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarPinned || isSidebarHovered;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showSummaryReport, setShowSummaryReport] = useState(false);
  
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
  const [showEntryForm, setShowEntryForm] = useState(false);
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
        const confirmed = await ask('Save changes to this asset entry?', {
          title: 'Confirm Update',
          kind: 'warning'
        });
        if (!confirmed) { setIsSaving(false); return; }

        await updateAssetEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeForm();
      } else {
        await addAssetEntry(payload);
        toast('Entry added', 'success');
        resetFormForNext();
      }
    } catch (err: any) {
      toast(`Failed to save: ${err.message}`, 'error');
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

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;

    const normalized = editForm.name.trim().toLowerCase();
    if (assetCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another asset category already has this name!', 'error');
      return;
    }

    const confirmed = await ask(`Update account name to: "${editForm.name.trim()}"?`, {
      title: 'Confirm Update',
      kind: 'warning'
    });
    if (!confirmed) return;

    updateAssetCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Account details updated', 'success');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden font-sans">
      {/* Parallel Horizontal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 pb-0 w-full">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
            { id: 'database', label: 'Asset Ledger', icon: Briefcase },
            { id: 'register', label: 'Register Account', icon: UserPlus },
            { id: 'manage', label: 'Manage Accounts', icon: Settings },
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
                activeTab === tab.id 
                  ? "bg-white dark:bg-dark-900 text-primary-600 shadow-sm shadow-primary-600/10" 
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>
        {activeTab === 'dashboard' && (
          <button onClick={() => setShowSummaryReport(true)} className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-dark-700">
            <Printer className="w-4 h-4" /> Summary Report
          </button>
        )}
        {activeTab === 'database' && cat && (
          <div className="flex gap-2">
            <button onClick={() => setShowReport(true)} className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 transition-colors font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-dark-700">
              <Printer className="w-4 h-4" /> Print Report
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 h-full w-full overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-10">
            {/* Summary Cards */}
            {(() => {
              const allFilteredEntries = filterByStartDate(assetEntries, settings.startDate);
              const globalDebit = allFilteredEntries.reduce((sum, e) => sum + e.debit, 0);
              const globalCredit = allFilteredEntries.reduce((sum, e) => sum + e.credit, 0);
              const globalNet = globalDebit - globalCredit;
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass p-6 rounded-3xl border-l-8 border-primary-600 shadow-xl relative group">
                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Total Assets Valuation</p>
                    <p className={cn("text-3xl font-black tabular-nums break-all", globalNet >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                      ₨ {formatCurrency(Math.abs(globalNet))}
                      <span className="text-xs ml-2 font-bold text-slate-400 uppercase">{globalNet >= 0 ? 'DR' : 'CR'}</span>
                    </p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-slate-400 shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Asset Accounts</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{assetCategories.length}</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-emerald-500 shadow-xl">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Recent Deposits</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₨ {formatCurrency(globalDebit)}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex-1 flex items-center gap-3 max-w-2xl">
                <SearchBar value={dashboardSearch} onChange={setDashboardSearch} placeholder="Search assets..." fullWidth={true} />
                <select value={dashSort} onChange={(e) => setDashSort(e.target.value)} className="input !py-2.5 !w-48 text-xs font-black uppercase tracking-wider">
                   <option value="name_asc">A to Z</option>
                   <option value="name_desc">Z to A</option>
                   <option value="val_desc">Highest Valuation</option>
                   <option value="val_asc">Lowest Valuation</option>
                </select>
              </div>
            </div>

            <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 flex flex-col">
              <div className="overflow-y-auto smart-scroll flex-1">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left">Asset Account</th>
                      <th className="table-cell text-right">Current Value</th>
                      <th className="table-cell text-center">Entries</th>
                      <th className="table-cell w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {(() => {
                      const items = assetCategories.map(cat => {
                        const entries = filterByStartDate(assetEntries, settings.startDate).filter(e => e.categoryId === cat.id);
                        const balance = entries.reduce((s, e) => s + (e.debit - e.credit), 0);
                        return { ...cat, balance, count: entries.length };
                      }).filter(c => !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()));
                      
                      const sorted = [...items].sort((a, b) => {
                        if (dashSort === 'name_asc') return a.name.localeCompare(b.name);
                        if (dashSort === 'name_desc') return b.name.localeCompare(a.name);
                        if (dashSort === 'val_desc') return b.balance - a.balance;
                        if (dashSort === 'val_asc') return a.balance - b.balance;
                        return 0;
                      });

                      return paginate(sorted, dashPage, perPage).map(cat => (
                        <tr key={cat.id} onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }} className="table-row cursor-pointer group text-[11px]">
                          <td className="table-cell">
                            <div className="flex items-center gap-3">
                              <Briefcase className="w-3 h-3 text-primary-600" />
                              <span className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                            </div>
                          </td>
                          <td className="table-cell text-right font-black">
                            ₨ {formatCurrency(Math.abs(cat.balance))}
                            <span className="text-[9px] ml-1 text-slate-400 uppercase">{cat.balance >= 0 ? 'DR' : 'CR'}</span>
                          </td>
                          <td className="table-cell text-center font-bold text-slate-500 uppercase">{cat.count} Entries</td>
                          <td className="table-cell text-right"><ArrowRight className="w-3 h-3 float-right" /></td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
              <Pagination page={dashPage} total={assetCategories.length} perPage={perPage} onChange={setDashPage} onPerPageChange={setPerPage} />
            </div>
          </div>
        ) : activeTab === 'database' ? (
          <div className="flex-1 flex gap-4 h-full w-full p-4 overflow-hidden min-h-0">
             {/* Sidebar List */}
            <div 
              onMouseEnter={() => setIsSidebarHovered(true)}
              onMouseLeave={() => setIsSidebarHovered(false)}
              className={cn(
                "flex-shrink-0 flex flex-col gap-3 h-full transition-all duration-300 ease-in-out border border-slate-200 dark:border-dark-700/50 bg-white/50 dark:bg-dark-900/50 rounded-2xl backdrop-blur-md shadow-sm relative z-20 overflow-hidden",
                isExpanded ? "w-64" : "w-16"
              )}
            >
               <div className="p-3 border-b border-slate-100 dark:border-dark-800/50 flex items-center justify-between">
                 {isExpanded && <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em]">Accounts</h2>}
                 <button onClick={() => setIsSidebarPinned(!isSidebarPinned)} className="p-1.5 rounded-lg transition-colors ml-auto">{isSidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}</button>
               </div>
               <div className="p-2 space-y-2 border-b border-slate-100 dark:border-dark-700/30 bg-slate-50/30">
                 {isExpanded ? (
                   <div className="space-y-2">
                     <SearchBar value={sidebarSearch} onChange={setSidebarSearch} placeholder="Search Assets..." fullWidth={true} className="!py-1.5 !text-[11px]" />
                     <div className="relative group">
                       <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-primary-600 transition-colors pointer-events-none" />
                       <select
                         value={sidebarSort}
                         onChange={(e) => setSidebarSort(e.target.value)}
                         className="w-full appearance-none pl-7 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-200 focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 transition-all cursor-pointer outline-none"
                       >
                         <option value="name_asc">A to Z</option>
                         <option value="name_desc">Z to A</option>
                         <option value="balance_desc">High Valuation</option>
                         <option value="balance_asc">Low Valuation</option>
                       </select>
                       <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                         <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                       </div>
                     </div>
                   </div>
                 ) : (
                   <div className="flex justify-center py-1">
                     <Search className="w-4 h-4 text-slate-400" />
                   </div>
                 )}
               </div>
               <div className="smart-scroll flex-1 p-2 space-y-1 overflow-y-auto">
                 {filteredSidebar.map(c => (
                   <div key={c.id} onClick={() => { setSelectedCat(c.id); setPage(1); }} className={cn("flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all", selectedCat === c.id ? "bg-primary-600 text-white shadow-lg" : "hover:bg-slate-100")}>
                     <Briefcase className="w-4 h-4 flex-shrink-0" />
                     {isExpanded && <p className="truncate text-xs font-black uppercase tracking-widest">{c.name}</p>}
                   </div>
                 ))}
               </div>
             </div>

             {/* Main Content */}
             <div className="flex-1 min-w-0 flex flex-col h-full pr-1">
               {cat ? (
                 <>
                   <div className="flex items-center justify-between mb-5 animate-in slide-in-from-bottom duration-350">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary-600/10 dark:bg-primary-600/20 flex items-center justify-center"><Briefcase className="w-8 h-8 text-primary-600" /></div>
                        <div>
                          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">{cat.name} Ledger</h1>
                        </div>
                      </div>
                      <button onClick={() => { setEditingEntity(null); setForm({ date: today(), description: '', debit: '', credit: '' }); setShowEntryForm(true); }} className="btn-primary flex items-center gap-2 !rounded-2xl shadow-xl shadow-primary-600/20">
                        <Plus className="w-5 h-5" /> New Entry
                      </button>
                   </div>

                   {/* Summary Cards */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-bottom duration-350 delay-75">
                     <div className="glass p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                       <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Additions (Debit)</p>
                       <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(totals.debit)}</p>
                     </div>
                     <div className="glass p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                       <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Withdrawals (Credit)</p>
                       <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(totals.credit)}</p>
                     </div>
                     <div className="glass p-5 rounded-2xl border-l-4 border-primary-600 shadow-sm">
                       <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Current Valuation</p>
                       <p className="text-2xl font-black text-primary-600 tabular-nums break-words break-all whitespace-normal leading-tight w-full">
                         ₨ {formatCurrency(Math.abs(totals.debit - totals.credit))}
                         <span className="text-xs ml-1 text-slate-400">{(totals.debit - totals.credit) >= 0 ? 'DR' : 'CR'}</span>
                       </p>
                     </div>
                   </div>

                   <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 flex flex-col shadow-2xl bg-white dark:bg-dark-900 animate-in slide-in-from-bottom duration-350 delay-150">
                     <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search ledger..." />
                        <div className="flex items-center gap-2">
                           <input type="date" className="input !py-1 !text-xs !rounded-lg" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                           <span className="text-slate-300 font-black">TO</span>
                           <input type="date" className="input !py-1 !text-xs !rounded-lg" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                     </div>
                     <div className="flex-1 overflow-auto smart-scroll">
                        <table className="table-excel">
                           <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                             <tr className="table-header text-[9px]">
                               <th className="px-4 py-3 text-left w-24">Date</th>
                               <th className="px-4 py-3 text-left w-auto">Description</th>
                               <th className="px-4 py-3 text-right w-36">Debit (Add)</th>
                               <th className="px-4 py-3 text-right w-36">Credit (Out)</th>
                               <th className="px-4 py-3 text-right w-44">Balance</th>
                               <th className="px-4 py-3 w-20 text-center">Actions</th>
                             </tr>
                           </thead>
                           <tbody>
                             {paged.length === 0 ? (
                               <tr><td colSpan={6} className="text-center text-slate-400 py-12 italic">No transactions found</td></tr>
                             ) : paged.map(e => (
                               <tr key={e.id} className="group">
                                 <td className="whitespace-nowrap text-[11px] font-medium uppercase tracking-tighter text-slate-500 dark:text-dark-400 tabular-nums">{formatDate(e.date)}</td>
                                 <td className="text-black dark:text-white font-medium text-[13px]">{e.description || '—'}</td>
                                 <td className="amount !text-emerald-600 dark:!text-emerald-400 whitespace-nowrap tabular-nums">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                                 <td className="amount !text-orange-600 dark:!text-orange-400 whitespace-nowrap tabular-nums">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                                 <td className="amount !text-black dark:!text-white !text-sm font-medium whitespace-nowrap tabular-nums">₨ {formatCurrency(e.balance)}</td>
                                 <td className="text-right">
                                   <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => setViewingEntity(e)} className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-800/30 rounded hover:bg-primary-100 transition-all font-serif" title="Quick Print"><Printer className="w-3 h-3" /><span>PRINT</span></button>
                                     <button onClick={() => setViewingEntity(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="View"><Eye className="w-3.5 h-3.5" /></button>
                                     <button onClick={() => handleEdit(e)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                     <button 
                                       onClick={async () => { 
                                         if (await ask('Delete this asset entry?', { title: 'Confirm Deletion', kind: 'warning' })) { 
                                           deleteAssetEntry(e.id); 
                                         } 
                                       }} 
                                       className="p-1 text-red-600 hover:bg-red-50 rounded" 
                                       title="Delete"
                                     >
                                       <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                           <tfoot className="border-t-2 border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50 font-black text-black">
                             <tr className="bg-slate-200 dark:bg-dark-800 border-t-2 border-slate-400">
                               <td colSpan={2} className="px-4 py-3 text-right">
                                 <div className="flex flex-col items-end">
                                   <span className="text-xs font-black text-slate-500 uppercase tracking-tighter leading-none">Page Total</span>
                                   <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-1">Grand Total</span>
                                 </div>
                               </td>
                               <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                 <div className="flex flex-col items-end">
                                   <span className="text-sm font-black text-slate-500 leading-none">₨ {formatCurrency(pageTotals.debit)}</span>
                                   <span className="text-sm font-black text-emerald-600 mt-1">₨ {formatCurrency(totals.debit)}</span>
                                 </div>
                               </td>
                               <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                 <div className="flex flex-col items-end">
                                   <span className="text-sm font-black text-slate-500 leading-none">₨ {formatCurrency(pageTotals.credit)}</span>
                                   <span className="text-sm font-black text-orange-600 mt-1">₨ {formatCurrency(totals.credit)}</span>
                                 </div>
                               </td>
                               <td className="px-4 py-3 text-right whitespace-nowrap">
                                 <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                                   <span className="text-lg font-black text-primary-600/70 leading-none">₨ {formatCurrency(pageTotals.debit - pageTotals.credit)}</span>
                                   <span className="text-lg font-black text-primary-600 mt-1">₨ {formatCurrency(totals.debit - totals.credit)}</span>
                                 </div>
                               </td>
                               <td></td>
                             </tr>
                           </tfoot>
                        </table>
                     </div>
                     <Pagination page={page} total={withBalance.length} perPage={perPage} onChange={setPage} onPerPageChange={setPerPage} />
                  </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full opacity-40"><Briefcase className="w-16 h-16 mb-4 text-primary-600" /><p className="font-black uppercase tracking-widest text-xs">Select an asset account to view ledger</p></div>
               )}
             </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="flex-1 p-8">
            <div className="max-w-2xl mx-auto glass p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-dark-700/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center"><UserPlus className="w-7 h-7 text-primary-600" /></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">New Asset Registration</h2>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-6">
                <div>
                  <label className="label text-[10px] font-black uppercase tracking-widest mb-2 block">Asset Name *</label>
                  <input className="input !py-4 !font-bold !rounded-2xl" placeholder="e.g. Cash, Office Equipment, Land, etc." value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary !w-full !py-4 font-black text-lg !rounded-2xl shadow-xl shadow-primary-600/20">Complete Registration</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto glass rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl">
              <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest">Manage Assets</h2>
                <SearchBar value={manageSearch} onChange={setManageSearch} placeholder="Filter assets..." />
              </div>
              <div className="divide-y overflow-y-auto smart-scroll max-h-[60vh]">
                {filteredManage.map(cat => (
                  <div key={cat.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    {editingId === cat.id ? (
                      <div className="flex-1 flex gap-2">
                        <input className="input !py-1 !rounded-lg" value={editForm.name} onChange={e => setEditForm({ name: e.target.value })} autoFocus />
                        <button onClick={() => handleSaveEdit(cat.id)} className="p-2 bg-emerald-600 text-white rounded-lg"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-slate-200 rounded-lg"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <>
                        <span className="font-bold text-slate-700 dark:text-slate-200 uppercase tracking-tight">{cat.name}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleStartEdit(cat)} className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button 
                            onClick={async () => { 
                              if (await ask('Delete this account and ALL its entries?', { title: 'DANGER: Confirm Deletion', kind: 'error' })) { 
                                deleteAssetCategory(cat.id); 
                              } 
                            }} 
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Report Modals */}
      {showReport && cat && (
        <PrintReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          type="asset"
          data={withBalance}
          totals={{ ...totals, balance: totals.debit - totals.credit }}
          title={`${cat.name} Asset Ledger`}
        />
      )}
      {showSummaryReport && (
        <PrintReportModal
          isOpen={showSummaryReport}
          onClose={() => setShowSummaryReport(false)}
          type="asset_summary"
          title="Asset Summary Report"
          columns={[
            { header: 'Asset Account', accessor: 'name' },
            { header: 'Entries', accessor: 'count', align: 'center' },
            { header: 'Current Value', accessor: 'balance', align: 'right', isCurrency: true },
          ]}
          data={(() => {
            const items = assetCategories.map(c => {
              const entries = filterByStartDate(assetEntries, settings.startDate).filter(e => e.categoryId === c.id);
              const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
              const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
              return { ...c, balance: debit - credit, debit, credit, count: entries.length };
            });
            return items;
          })()}
          totals={(() => {
            const items = assetCategories.map(c => {
              const entries = filterByStartDate(assetEntries, settings.startDate).filter(e => e.categoryId === c.id);
              const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
              const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
              return { debit, credit };
            });
            const d = items.reduce((s, x) => s + x.debit, 0);
            const c = items.reduce((s, x) => s + x.credit, 0);
            return { debit: d, credit: c, balance: d - c };
          })()}
        />
      )}

      {/* Transaction View Modal */}
      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="asset"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {/* Entry Form Modal */}
      {showEntryForm && (
        <Modal
          isOpen={showEntryForm}
          onClose={closeForm}
          title={editingEntity ? 'Edit Asset Entry' : 'New Asset Entry'}
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-1">
            <div className="bg-slate-50 dark:bg-dark-800/50 rounded-2xl p-4 mb-4 border border-slate-200 dark:border-dark-700/50">
              <div className="desktop-form-row">
                <label className="desktop-form-label">Date *</label>
                <div className="desktop-form-field">
                  <input 
                    type="date" 
                    className="input !py-1.5" 
                    value={form.date} 
                    onChange={e => setForm({...form, date: e.target.value})} 
                    required 
                  />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Description</label>
                <div className="desktop-form-field">
                  <input 
                    className="input !py-1.5" 
                    placeholder="Transaction details..."
                    value={form.description} 
                    onChange={e => setForm({...form, description: e.target.value})}
                    dir="auto"
                  />
                </div>
              </div>
            </div>

            <div className="px-2 space-y-1">
              <div className="desktop-form-row">
                <label className="desktop-form-label text-emerald-600 dark:text-emerald-400">Debit (Addition)</label>
                <div className="desktop-form-field">
                  <input 
                    type="number" 
                    step="any" 
                    className="input !py-1.5 !bg-emerald-50/30 dark:!bg-emerald-900/10 focus:ring-emerald-500/20" 
                    placeholder="0.00"
                    value={form.debit} 
                    onChange={e => setForm({...form, debit: e.target.value})} 
                  />
                </div>
              </div>
              <div className="desktop-form-row !border-b-0">
                <label className="desktop-form-label text-orange-600 dark:text-orange-400">Credit (Withdrawal)</label>
                <div className="desktop-form-field">
                  <input 
                    type="number" 
                    step="any" 
                    className="input !py-1.5 !bg-orange-50/30 dark:!bg-orange-900/10 focus:ring-orange-500/20" 
                    placeholder="0.00"
                    value={form.credit} 
                    onChange={e => setForm({...form, credit: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            <div className="desktop-form-footer">
              <div className="desktop-summary-strip flex-1 mr-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Value Change</span>
                  <span className={`text-xl font-black font-mono tracking-tighter ${ (Number(form.debit)||0) >= (Number(form.credit)||0) ? 'text-emerald-600 dark:text-emerald-500' : 'text-orange-600 dark:text-orange-500'}`}>
                    ₨ {formatCurrency((Number(form.debit)||0) - (Number(form.credit)||0))}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeForm} className="btn-secondary !py-2 !px-4" disabled={isSaving}>Cancel</button>
                <button type="submit" disabled={isSaving} className="btn-primary !bg-primary-600 hover:opacity-90 !py-2 !px-6">
                  {isSaving ? <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span> : <Save className="w-4 h-4" />}
                  {editingEntity ? 'Update' : 'Confirm [F10]'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
