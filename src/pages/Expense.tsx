import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Tag, TrendingDown } from 'lucide-react';
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

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, currentUser, updateExpenseEntry 
  } = useStore();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const isExpanded = isSidebarPinned;
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
  const [form, setForm] = useState({ date: today(), details: '', amount: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [dashSort, setDashSort] = useState('name_asc');
  const [entrySort, setEntrySort] = useState('date_desc');
  const [sidebarSort, setSidebarSort] = useState('name_asc');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    const action = searchParams.get('action');

    if (tab === 'register') setActiveTab('register');
    else if (tab === 'dashboard') setActiveTab('dashboard');
    else if (tab === 'database') setActiveTab('database');
    else if (tab === 'manage') setActiveTab('manage');

    if (action === 'add') {
      setActiveTab('database');
      setShowEntryForm(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!selectedCat && expenseCategories.length > 0) {
      setSelectedCat(expenseCategories[0].id);
    }
  }, [expenseCategories, selectedCat]);

  const cat = expenseCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() => {
    const list = expenseCategories.filter((c) => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
    
    const withTotals = list.map(c => {
      const entries = filterByStartDate(expenseEntries, settings.startDate).filter(e => e.categoryId === c.id);
      const total = entries.reduce((s, e) => s + (e.amount || 0), 0);
      return { ...c, total };
    });

    return [...withTotals].sort((a, b) => {
      switch (sidebarSort) {
        case 'name_asc':     return a.name.localeCompare(b.name);
        case 'name_desc':    return b.name.localeCompare(a.name);
        case 'total_desc':   return b.total - a.total;
        case 'total_asc':    return a.total - b.total;
        default:             return a.name.localeCompare(b.name);
      }
    });
  }, [expenseCategories, sidebarSearch, sidebarSort, expenseEntries, settings.startDate]);

  const filteredManage = useMemo(() =>
    expenseCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [expenseCategories, manageSearch]
  );

  const catEntries = useMemo(() => {
    if (!selectedCat) return [];
    
    const filtered = filterByStartDate(expenseEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.details?.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });

    return [...filtered].sort((a, b) => {
      switch (entrySort) {
        case 'date_desc':    return b.date.localeCompare(a.date);
        case 'date_asc':     return a.date.localeCompare(b.date);
        case 'details_asc':  return (a.details || '').localeCompare(b.details || '');
        case 'details_desc': return (b.details || '').localeCompare(a.details || '');
        case 'amount_desc':  return (b.amount || 0) - (a.amount || 0);
        case 'amount_asc':   return (a.amount || 0) - (b.amount || 0);
        default:             return b.date.localeCompare(a.date);
      }
    });
  }, [expenseEntries, settings.startDate, selectedCat, search, fromDate, toDate, entrySort]);

  const paged = paginate(catEntries, page, perPage);

  const pageTotals = paged.reduce((s, e) => s + (e.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }

    const confirmed = window.confirm(editingEntity ? 'Confirm Update: Save changes to this expense?' : 'Confirm Save: Register this new expense entry?');
    if (!confirmed) return;
    
    const amount = parseFloat(form.amount) || 0;
    const payload = { categoryId: selectedCat, date: form.date, details: form.details, amount };
    
    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateExpenseEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeForm(); // Close after edit
      } else {
        await addExpenseEntry(payload);
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
    setForm(prev => ({ ...prev, details: '', amount: '' }));
  };

  const closeForm = () => {
    setShowEntryForm(false);
    setEditingEntity(null);
    setForm({ date: today(), details: '', amount: '' });
  };

  const handleEdit = (e: any) => {
    setEditingEntity(e);
    setForm({
      date: e.date,
      details: e.details || '',
      amount: e.amount.toString(),
    });
    setShowEntryForm(true);
  };

  const totals = catEntries.reduce((s, e) => s + e.amount, 0);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const normalized = newName.trim().toLowerCase();
    if (expenseCategories.some(c => c.name.toLowerCase() === normalized)) {
      toast('An expense category with this name already exists!', 'error');
      return;
    }

    addExpenseCategory(newName.trim());
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
    if (expenseCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another expense category already has this name!', 'error');
      return;
    }

    updateExpenseCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Account details updated', 'success');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader 
        title="Expense Entries" 
        icon={TrendingDown} 
        iconClassName="!bg-red-100 !text-red-600"
      />

      <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 flex-shrink-0">
        <div className="pill-nav-container">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn("pill-nav-item", activeTab === 'dashboard' ? "pill-nav-item-active bg-red-600 border-red-600 shadow-red-500/30" : "hover:border-red-100")}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn("pill-nav-item", activeTab === 'database' ? "pill-nav-item-active bg-red-600 border-red-600 shadow-red-500/30" : "hover:border-red-100")}
          >
            Entries
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn("pill-nav-item", activeTab === 'register' ? "pill-nav-item-active bg-red-600 border-red-600 shadow-red-500/30" : "hover:border-red-100")}
          >
            New Category
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn("pill-nav-item", activeTab === 'manage' ? "pill-nav-item-active bg-red-600 border-red-600 shadow-red-500/30" : "hover:border-red-100")}
          >
            Settings
          </button>
        </div>
      </div>


        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-6">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(() => {
                const allFilteredEntries = filterByStartDate(expenseEntries, settings.startDate)
                  .filter(e => {
                    const matchesFrom = !fromDate || e.date >= fromDate;
                    const matchesTo = !toDate || e.date <= toDate;
                    return matchesFrom && matchesTo;
                  });
                const globalTotal = allFilteredEntries.reduce((sum, e) => sum + e.amount, 0);
                
                return (
                  <>
                    <div className="glass p-4 rounded-3xl border-l-4 border-red-600 shadow-xl bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-dark-900 col-span-2">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Total Expenses</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(globalTotal)}</p>
                    </div>
                    <div className="glass p-4 rounded-3xl border-l-4 border-slate-400 shadow-xl bg-white/50 dark:bg-dark-800/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Categories</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{expenseCategories.length}</p>
                    </div>
                    <div className="glass p-4 rounded-3xl border-l-4 border-emerald-500 shadow-xl bg-emerald-50/30 dark:bg-emerald-900/10">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Entries</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{allFilteredEntries.length}</p>
                    </div>
                  </>
                );
              })()}
            </div>

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
              
              <div className="relative group shrink-0">
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-red-600 transition-colors pointer-events-none" />
                <select
                  value={entrySort}
                  onChange={(e) => setEntrySort(e.target.value)}
                  className="appearance-none pl-7 pr-8 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="date_desc">Newest</option>
                  <option value="date_asc">Oldest</option>
                  <option value="amount_desc">High Amt</option>
                  <option value="amount_asc">Low Amt</option>
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                </div>
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                <button 
                  onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg", (fromDate === today() && toDate === today()) ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm" : "text-slate-500")}
                >
                  Today
                </button>
                <button 
                  onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border-l border-slate-200 dark:border-dark-700/50", (fromDate === startOfMonth() && toDate === today()) ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm" : "text-slate-500")}
                >
                  Month
                </button>
              </div>

              {(fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="p-2 text-red-600 shrink-0"><X className="w-4 h-4" /></button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              <div className="space-y-3 mb-6">
                {(() => {
                  const itemsWithTotals = expenseCategories.map(cat => {
                    const entries = filterByStartDate(expenseEntries, settings.startDate)
                      .filter(e => e.categoryId === cat.id)
                      .filter(e => {
                        const matchesFrom = !fromDate || e.date >= fromDate;
                        const matchesTo = !toDate || e.date <= toDate;
                        return matchesFrom && matchesTo;
                      });
                    const catTotal = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
                    return { ...cat, total: catTotal, count: entries.length };
                  });

                  const filtered = itemsWithTotals.filter(c => 
                    !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase())
                  );

                  const sorted = [...filtered].sort((a, b) => {
                    switch (dashSort) {
                      case 'name_asc':  return a.name.localeCompare(b.name);
                      case 'name_desc': return b.name.localeCompare(a.name);
                      case 'total_desc':return b.total - a.total;
                      case 'total_asc': return a.total - b.total;
                      default:          return 0;
                    }
                  });

                  return sorted.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }}
                      className="glass p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all border-l-4 border-l-red-500 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <Wallet className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cat.count} Entries</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums leading-none">₨ {formatCurrency(cat.total)}</p>
                        <ArrowRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {expenseCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-dark-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-dark-700/50">
                <Wallet className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No Categories Registered</p>
                <button onClick={() => setActiveTab('register')} className="mt-4 text-xs font-black text-red-600 uppercase tracking-widest hover:underline">Register your first category →</button>
              </div>
            )}
          </div>
        ) : activeTab === 'database' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-6">
            {/* Category Pill Switcher */}
            <div className="pill-nav-container mb-6">
               {expenseCategories.map(c => (
                 <button
                   key={c.id}
                   onClick={() => { setSelectedCat(c.id); setPage(1); }}
                   className={cn(
                     "pill-nav-item border-2",
                     selectedCat === c.id 
                       ? "pill-nav-item-active bg-red-600 border-red-600 shadow-red-500/30" 
                       : "bg-white dark:bg-dark-900 border-slate-100 dark:border-dark-800 hover:border-red-200"
                   )}
                 >
                   {c.name}
                 </button>
               ))}
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mb-4">
              <div className="flex-1 min-w-[120px]">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search entries..." fullWidth className="!py-1.5 !text-[11px]" />
              </div>
              <button 
                onClick={() => setShowReport(true)}
                className="btn-secondary !py-2 !px-3 !bg-red-50 dark:!bg-red-900/10 !text-red-600 !border-red-200 dark:!border-red-800 shrink-0 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" /> Print All
              </button>
            </div>

            <div className="flex-1 glass rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-xl flex flex-col min-h-0 container-scroll">
              <div className="flex-1 overflow-x-auto overflow-y-auto smart-scroll">
                <table className="table-excel min-w-[1000px] w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800 shadow-sm">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left px-4">Date</th>
                      <th className="table-cell text-left px-4">Description</th>
                      <th className="table-cell text-right px-4">Amount</th>
                      <th className="table-cell text-center px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No entries found</p>
                        </td>
                      </tr>
                    ) : (
                      paged.map((e) => (
                        <tr key={e.id} className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group">
                          <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(e.date)}</td>
                          <td className="table-cell font-medium text-slate-900 dark:text-white" dir="auto">{e.details || 'General Expense'}</td>
                          <td className="table-cell text-right tabular-nums font-black text-red-600">₨ {formatCurrency(e.amount)}</td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors" title="Print Receipt"><Printer className="w-4 h-4" /></button>
                               <button 
                                 onClick={() => { if(window.confirm('Modify this expense entry?')) handleEdit(e); }} 
                                 className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" 
                                 title="Edit"
                               >
                                 <Edit2 className="w-4 h-4" />
                               </button>
                               {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                                 <button 
                                   onClick={() => { if(window.confirm('Permanently delete this expense?')) deleteExpenseEntry(e.id); }} 
                                   className="p-1.5 text-slate-400 hover:text-red-500 transition-colors" 
                                   title="Delete"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
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
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums border-r border-slate-200 dark:border-dark-800">₨ {formatCurrency(pageTotals)}</td>
                      <td></td>
                    </tr>
                    <tr className="bg-red-600 text-white border-t border-white/10">
                      <td colSpan={2} className="px-4 py-3 text-right opacity-80">Filters Grand Total:</td>
                      <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(totals)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="mt-4">
              <Pagination page={page} total={catEntries.length} perPage={perPage} onChange={setPage} />
            </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="flex-1 animate-in zoom-in-95 duration-300">
            <div className="max-w-2xl mx-auto glass p-8 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-2xl mt-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-red-600/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-red-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Expense Category</h2>
                  <p className="text-sm text-slate-500 font-medium">Create a new category in your Expense database</p>
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-red-600 mb-2 block">Category Name *</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="input !pl-12 !py-4 !text-sm !font-bold" 
                        placeholder="e.g. Electricity, Staff Salary, Rent, etc." 
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
                   <button type="submit" className="btn-primary !px-12 !py-4 font-black shadow-xl shadow-red-600/20 text-base flex items-center gap-2 !bg-red-600 hover:opacity-90">
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
                  {expenseCategories.length} Categories Found
                </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex-1 flex flex-col">
               <div className="overflow-y-auto smart-scroll">
                  <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                        <th className="table-cell text-left">Category Name</th>
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
                                     {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); if(confirm('Delete category and all history?')) deleteExpenseCategory(c.id); }} 
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


      {showEntryForm && (
        <Modal 
          title={editingEntity ? `Edit ${cat?.name}` : `Add ${cat?.name}`} 
          onClose={closeForm} 
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-4 overflow-y-auto smart-scroll no-scrollbar max-h-[60vh] px-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Entry Date</label>
                <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Description / Notes</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="e.g. Electricity Bill Jan" dir="auto" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-red-600 px-1">Amount (PKR)</label>
                <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl !text-red-600 shadow-sm" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" required />
              </div>

              <div className="bg-red-600/5 dark:bg-red-600/10 p-5 rounded-3xl border border-red-600/10 text-center shadow-xl shadow-red-500/5">
                 <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Payment Category</p>
                 <p className="text-xl font-black text-slate-900 dark:text-white truncate tracking-tight">{cat?.name}</p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-red-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-red-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingEntity ? 'Update Expense' : 'Confirm Payment'}</span>
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
            if (activeTab === 'dashboard') {
              setActiveTab('register');
            } else {
              if (!selectedCat && expenseCategories.length > 0) setSelectedCat(expenseCategories[0].id);
              if (expenseCategories.length === 0) {
                 setActiveTab('register');
                 toast('Please register a category first', 'info');
              } else {
                 setShowEntryForm(true);
              }
            }
          }} 
          label="NEW"
        />
      ) : null}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="expense"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && (
        <PrintReportModal
          data={catEntries}
          type="expense"
          title={`${cat?.name} Expense Report`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
