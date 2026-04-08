import React, { useState, useMemo, useEffect } from 'react';
import { Briefcase, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';

// const PER_PAGE = 40; // Replaced by state

export default function AssetPage() {
  const { 
    assetCategories, assetEntries, nextAssetNo, 
    addAssetCategory, updateAssetCategory, deleteAssetCategory, 
    addAssetEntry, deleteAssetEntry, settings, currentUser, updateAssetEntry 
  } = useStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');
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
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [perPage, setPerPage] = useState(40);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (!selectedCat && assetCategories.length > 0) {
      setSelectedCat(assetCategories[0].id);
    }
  }, [assetCategories, selectedCat]);

  const cat = assetCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() =>
    assetCategories.filter((c) => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase())),
    [assetCategories, sidebarSearch]
  );

  const filteredManage = useMemo(() =>
    assetCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [assetCategories, manageSearch]
  );

  const catEntries = useMemo(() => {
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
    const sorted = [...catEntries].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [catEntries]);

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
    debit: catEntries.reduce((s, e) => s + e.debit, 0),
    credit: catEntries.reduce((s, e) => s + e.credit, 0),
  }), [catEntries]);

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
    <div className="animate-fade-in space-y-6 flex flex-col h-full min-h-[calc(100vh-4rem)]">
      {/* Parallel Horizontal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'dashboard' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm shadow-emerald-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <BarChart3 className="w-4 h-4" /> Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('database')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'database' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm shadow-emerald-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Briefcase className="w-4 h-4" /> Asset Register
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'register' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm shadow-emerald-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <UserPlus className="w-4 h-4" /> Register Account
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'manage' 
                ? "bg-white dark:bg-dark-900 text-emerald-600 shadow-sm shadow-emerald-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Settings className="w-4 h-4" /> Manage Assets
          </button>
        </div>
        {activeTab === 'database' && cat && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowReport(true)} 
              className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-dark-700"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
            <button onClick={() => { closeForm(); setShowEntryForm(true); }} className="btn-primary !bg-emerald-600 hover:opacity-90 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)] overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Global Summary Cards */}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-top duration-500">
                  <div className="glass p-6 rounded-3xl border-l-8 border-emerald-600 shadow-xl bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-900/10 dark:to-dark-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-600/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-emerald-600/10 transition-colors" />
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Net Asset Valuation</p>
                    <p className={cn("text-3xl font-black tabular-nums", globalNet >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                      ₨ {formatCurrency(Math.abs(globalNet))}
                      <span className="text-xs ml-2 font-bold text-slate-400 uppercase">{globalNet >= 0 ? 'DR' : 'CR'}</span>
                    </p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-slate-400 shadow-xl bg-white/50 dark:bg-dark-800/50 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-600/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-slate-600/10 transition-colors" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Assets</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{assetCategories.length}</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-primary-500 shadow-xl bg-primary-50/30 dark:bg-primary-900/10 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary-600/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-primary-600/10 transition-colors" />
                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Total Transaction Records</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{allFilteredEntries.length}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 animate-in slide-in-from-top duration-500 delay-100">
              <div className="flex-1 max-w-md">
                <SearchBar 
                  value={dashboardSearch} 
                  onChange={setDashboardSearch} 
                  placeholder="Search assets..." 
                  fullWidth={true}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50">
                  <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
                  <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
                  <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
                </div>
                {(fromDate || toDate) && (
                  <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30">Reset</button>
                )}
              </div>
            </div>

            <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-sm flex flex-col animate-in slide-in-from-bottom duration-500 delay-200">
              <div className="overflow-y-auto smart-scroll flex-1">
                <table className="w-full">
                  <thead>
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left">Asset Account</th>
                      <th className="table-cell text-right">Current Valuation</th>
                      <th className="table-cell text-center">Entries</th>
                      <th className="table-cell w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50 bg-white/50 dark:bg-dark-900/50">
                    {(() => {
                      const filtered = assetCategories.filter(c => 
                        !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase())
                      );
                      
                      let grandSum = 0;
                      let grandCount = 0;

                      return (
                        <>
                          {filtered.map(cat => {
                            const entries = filterByStartDate(assetEntries, settings.startDate)
                              .filter(e => e.categoryId === cat.id)
                              .filter(e => {
                                const matchesFrom = !fromDate || e.date >= fromDate;
                                const matchesTo = !toDate || e.date <= toDate;
                                return matchesFrom && matchesTo;
                              });
                            const debit = entries.reduce((sum, e) => sum + e.debit, 0);
                            const credit = entries.reduce((sum, e) => sum + e.credit, 0);
                            const balance = debit - credit;
                            grandSum += balance;
                            grandCount += entries.length;

                            return (
                              <tr 
                                key={cat.id}
                                onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }}
                                className="table-row hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all cursor-pointer group text-[11px]"
                              >
                                <td className="table-cell">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-md bg-emerald-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <Briefcase className="w-3 h-3 text-emerald-600" />
                                    </div>
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                  </div>
                                </td>
                                <td className="table-cell text-right">
                                  <span className={cn("text-sm font-black tabular-nums", balance >= 0 ? "text-slate-900 dark:text-white" : "text-red-500")}>
                                    ₨ {formatCurrency(Math.abs(balance))}
                                    <span className="text-[9px] ml-1 font-bold text-slate-400 uppercase tracking-tighter">{balance >= 0 ? 'DR' : 'CR'}</span>
                                  </span>
                                </td>
                                <td className="table-cell text-center">
                                  <span className="font-bold text-slate-500 uppercase tracking-widest">{entries.length} Entries</span>
                                </td>
                                <td className="table-cell text-right">
                                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-dark-800 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all float-right">
                                    <ArrowRight className="w-3 h-3" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {filtered.length > 0 && (
                            <tr className="bg-emerald-50/30 dark:bg-emerald-900/10 font-black sticky bottom-0 border-t-2 border-emerald-200 dark:border-emerald-800/30 backdrop-blur-md">
                              <td className="px-6 py-5 text-left text-xs uppercase tracking-widest text-emerald-600 font-black">Totals for visible assets</td>
                              <td className={cn("px-6 py-5 text-right text-xl tabular-nums font-black", grandSum >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                                ₨ {formatCurrency(Math.abs(grandSum))}
                                <span className="text-xs ml-2 uppercase font-black">{grandSum >= 0 ? 'DR' : 'CR'}</span>
                              </td>
                              <td className="px-6 py-5 text-center text-xs text-slate-500 uppercase tracking-widest font-black">{grandCount} Total Entries</td>
                              <td></td>
                            </tr>
                          )}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
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
          <>
            {/* Sidebar List */}
            <div className="w-64 flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
               <div className="p-3 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Assets</p>
                <span className="text-[10px] font-bold text-slate-300">{filteredSidebar.length}</span>
              </div>
              <div className="p-2 border-b border-slate-100 dark:border-dark-700/30">
                <SearchBar value={sidebarSearch} onChange={setSidebarSearch} placeholder="Search Asset..." fullWidth={true} className="!py-1.5 !text-[11px]" />
              </div>
              <div className="smart-scroll flex-1 p-2 space-y-1">
                {filteredSidebar.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No Assets found</div>
                ) : (
                  filteredSidebar.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                      className={cn(
                        'group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer text-xs font-black transition-all duration-200 border border-transparent',
                        selectedCat === c.id 
                          ? 'bg-emerald-600/10 text-emerald-600 border-emerald-600/10 shadow-sm relative overflow-hidden' 
                          : 'text-slate-600 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                      )}
                    >
                      {selectedCat === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-600 rounded-r-full"></span>}
                      <div className="flex flex-col min-w-0">
                        <p className="truncate text-slate-900 dark:text-white">{c.name}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Main Content (Database View) */}
            <div className="flex-1 min-w-0 smart-scroll h-full pr-1">
              {cat ? (
                <>
                  <div className="flex items-center justify-between mb-5 animate-in slide-in-from-bottom duration-350">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-600/20 flex items-center justify-center">
                        <Briefcase className="w-8 h-8 text-emerald-600 dark:text-emerald-600" />
                      </div>
                      <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                          {cat.name} Asset
                        </h1>
                      </div>
                    </div>
                  </div>

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-bottom duration-350 delay-75">
                    <div className="glass p-5 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Debit (Addition)</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">₨ {formatCurrency(totals.debit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-orange-500 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Credit (Disposal)</p>
                      <p className="text-2xl font-black text-orange-600 dark:text-orange-400 tabular-nums">₨ {formatCurrency(totals.credit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-emerald-600 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Current Valuation</p>
                      <p className={cn("text-2xl font-black tabular-nums text-emerald-600")}>
                        ₨ {formatCurrency(Math.abs(totals.debit - totals.credit))}
                      </p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 animate-in slide-in-from-bottom duration-350 delay-150">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                      <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
                      <div className="flex items-center flex-wrap gap-2">
                        <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 mr-2">
                          <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
                          <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
                          <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                          <span className="text-slate-400">→</span>
                          <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                        </div>
                        {(fromDate || toDate) && (
                          <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30">Clear</button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-x-auto smart-scroll">
                      <table className="table-excel">
                        <thead>
                          <tr className="table-header">
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-right">Debit (In)</th>
                            <th className="px-4 py-3 text-right">Credit (Out)</th>
                            <th className="px-4 py-3 text-right">Valuation</th>
                            <th className="px-4 py-3 w-20"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.length === 0 ? (
                            <tr><td colSpan={8} className="text-center text-slate-400 py-12 italic">No transactions found</td></tr>
                          ) : paged.map((e, i) => (
                            <tr key={e.id} className="group">
                              <td className="whitespace-nowrap text-[11px] font-medium uppercase tracking-tighter text-slate-500 dark:text-dark-400">{formatDate(e.date)}</td>
                              <td className="text-black dark:text-white font-medium text-[13px]">{e.description || '—'}</td>
                              <td className="amount !text-emerald-600 dark:!text-emerald-400">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                              <td className="amount !text-orange-600 dark:!text-orange-400">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                              <td className="amount !text-black dark:!text-white !text-sm font-medium">₨ {formatCurrency(e.balance)}</td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setViewingEntity(e)} 
                                    className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-200/50 dark:border-emerald-800/30 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-all font-serif" 
                                    title="Quick Print Invoice"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>PRINT</span>
                                  </button>
                                  <button onClick={() => setViewingEntity(e)} className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors" title="View Details">
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  {currentUser?.role === 'Admin' && (
                                    <>
                                      <button onClick={() => handleEdit(e)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => { if(confirm('Delete entry?')) { deleteAssetEntry(e.id); toast('Entry deleted', 'warning'); } }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50 font-black text-black">
                          <tr className="font-black text-black dark:text-white">
                            <td colSpan={4} className="px-4 py-3 text-right uppercase tracking-widest text-[11px] italic font-black text-black">Page Total</td>
                            <td className="px-4 py-3 text-right text-black font-black text-sm">₨ {formatCurrency(pageTotals.debit)}</td>
                            <td className="px-4 py-3 text-right text-black font-black text-sm">₨ {formatCurrency(pageTotals.credit)}</td>
                            <td colSpan={2}></td>
                          </tr>
                          <tr className="font-black text-black dark:text-white bg-slate-200/50 border-t border-slate-300">
                            <td colSpan={4} className="px-4 py-4 text-right uppercase tracking-widest text-xs text-black font-black">Grand Total</td>
                            <td className="px-4 py-4 text-right text-black font-black text-lg">₨ {formatCurrency(totals.debit)}</td>
                            <td className="px-4 py-4 text-right text-black font-black text-lg">₨ {formatCurrency(totals.credit)}</td>
                            <td colSpan={2}></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <Pagination 
                      page={page} 
                      total={withBalance.length} 
                      perPage={perPage} 
                      onChange={setPage} 
                      onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 opacity-40">
                  <Briefcase className="w-16 h-16 mb-4" />
                  <p className="font-medium font-bold">Select an account to view statement</p>
                </div>
              )}
            </div>
          </>
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
                        className="input !pl-12 !py-4 !text-lg !font-bold" 
                        placeholder="e.g. Building, Generator, Land, etc." 
                        value={newName} 
                        onChange={e => setNewName(e.target.value)} 
                        required 
                        autoFocus
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
                    className="input !pl-10 !py-3 !text-lg !font-bold" 
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
                        <th className="table-cell text-right">Actions</th>
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
                                  <input className="input !py-1.5 !text-sm w-full" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus />
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
        <Modal title={editingEntity ? `Edit Entry — ${cat?.name}` : `Add Entry — ${cat?.name}`} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Debit (Addition) (₨)</label><input type="number" step="0.01" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></div>
              <div><label className="label">Credit (Disposal) (₨)</label><input type="number" step="0.01" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeForm} className="btn-secondary" disabled={isSaving}>Cancel</button>
              <button type="submit" className="btn-primary !bg-emerald-600 flex items-center gap-2" disabled={isSaving}>
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                {editingEntity ? 'Update' : 'Add'} Entry
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="asset"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && (
        <PrintReportModal
          data={catEntries}
          type="asset"
          title={`${cat?.name} Asset Report`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
