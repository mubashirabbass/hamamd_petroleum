import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Tag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear, handleFormKeyDown } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';
import { useConfirm } from '../contexts/ConfirmContext';

// const PER_PAGE = 40; // Replaced by state

export default function ExpensePage() {
  const { 
    expenseCategories, expenseEntries, 
    addExpenseCategory, updateExpenseCategory, deleteExpenseCategory, 
    addExpenseEntry, deleteExpenseEntry, settings, currentUser, updateExpenseEntry 
  } = useStore();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);
  const isExpanded = isSidebarPinned || isSidebarHovered;
  const [showEntryForm, setShowEntryForm] = useState(false);
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
      const total = entries.reduce((s: number, e: any) => s + (e.amount || 0), 0);
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

  const pageTotals = paged.reduce((s: number, e: any) => s + (e.amount || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date || !form.amount) { toast('Fill required fields', 'error'); return; }
    
    const amount = parseFloat(form.amount) || 0;
    const payload = { categoryId: selectedCat, date: form.date, details: form.details, amount };
    
    setIsSaving(true);
    try {
      if (editingEntity) {
        const confirmed = await confirm('Save changes to this expense entry?', {
          title: 'Confirm Update',
          kind: 'warning'
        });
        if (!confirmed) { setIsSaving(false); return; }

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

  const totals = catEntries.reduce((s: number, e: any) => s + e.amount, 0);

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
  };

  const handleStartEdit = (cat: any) => {
    setEditingId(cat.id);
    setEditForm({ name: cat.name });
  };

  const handleSaveEdit = async (id: string) => {
    if (!editForm.name.trim()) return;

    const normalized = editForm.name.trim().toLowerCase();
    if (expenseCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another expense category already has this name!', 'error');
      return;
    }

    const confirmed = await confirm(`Update account name to: "${editForm.name.trim()}"?`, {
      title: 'Confirm Update',
      kind: 'warning'
    });
    if (!confirmed) return;

    updateExpenseCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Account details updated', 'success');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      {/* Parallel Horizontal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 pb-0 w-full">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'dashboard' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
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
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Wallet className="w-4 h-4" /> Expense Register
          </button>
          <button 
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'register' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <UserPlus className="w-4 h-4" /> Register Category
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'manage' 
                ? "bg-white dark:bg-dark-900 text-red-600 shadow-sm shadow-red-600/10" 
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Settings className="w-4 h-4" /> Manage Expenses
          </button>
        </div>
        {activeTab === 'dashboard' && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSummaryReport(true)} 
              className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-dark-700"
            >
              <Printer className="w-4 h-4" /> Summary Report
            </button>
          </div>
        )}
        {activeTab === 'database' && cat && (
          <div className="flex gap-2">
            <button 
              onClick={() => setShowReport(true)} 
              className="px-4 py-2 bg-slate-100 dark:bg-dark-700 text-slate-700 dark:text-dark-200 rounded-lg hover:bg-slate-200 dark:hover:bg-dark-600 transition-colors font-bold text-sm flex items-center gap-2 border border-slate-200 dark:border-dark-700"
            >
              <Printer className="w-4 h-4" /> Print Report
            </button>
            <button onClick={() => { closeForm(); setShowEntryForm(true); }} className="btn-primary !bg-red-600 hover:opacity-90 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex gap-4 h-full w-full overflow-hidden p-4">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-10">
            {/* Global Summary Cards */}
            {(() => {
              const allFilteredEntries = filterByStartDate(expenseEntries, settings.startDate)
                .filter(e => {
                  const matchesFrom = !fromDate || e.date >= fromDate;
                  const matchesTo = !toDate || e.date <= toDate;
                  return matchesFrom && matchesTo;
                });
              const globalTotal = allFilteredEntries.reduce((sum, e) => sum + e.amount, 0);
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass p-6 rounded-3xl border-l-8 border-red-600 shadow-xl bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-dark-900">
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Grand Total Expense</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(globalTotal)}</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-slate-400 shadow-xl bg-white/50 dark:bg-dark-800/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Categories</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{expenseCategories.length}</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-emerald-500 shadow-xl bg-emerald-50/30 dark:bg-emerald-900/10">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Transactions</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{allFilteredEntries.length}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 max-w-md">
                  <SearchBar 
                    value={dashboardSearch} 
                    onChange={setDashboardSearch} 
                    placeholder="Search categories..." 
                    fullWidth={true}
                  />
                </div>
                <div className="relative group shrink-0">
                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors pointer-events-none" />
                <select
                  value={dashSort}
                  onChange={(e) => setDashSort(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="name_asc">A to Z</option>
                  <option value="name_desc">Z to A</option>
                  <option value="total_desc">Highest Total</option>
                  <option value="total_asc">Lowest Total</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <div className="w-1.5 h-1.5 border-r-2 border-b-2 border-current rotate-45" />
                </div>
              </div>
              </div>
              <div className="flex items-center gap-3 ml-auto">
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

            <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-sm flex flex-col">
              <div className="overflow-y-auto smart-scroll flex-1">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left">Expense Category</th>
                      <th className="table-cell text-right">Total Spending</th>
                      <th className="table-cell text-center">Entries</th>
                      <th className="table-cell w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50 bg-white/50 dark:bg-dark-900/50">
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

                          // 2. Filter by search
                          const filtered = itemsWithTotals.filter(c => 
                            !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase())
                          );

                          // 3. Apply Live Sorting
                          const sorted = [...filtered].sort((a, b) => {
                            switch (dashSort) {
                              case 'name_asc':  return a.name.localeCompare(b.name);
                              case 'name_desc': return b.name.localeCompare(a.name);
                              case 'total_desc':return b.total - a.total;
                              case 'total_asc': return a.total - b.total;
                              default:          return 0;
                            }
                          });
                          
                          let grandSum = 0;
                          let grandCount = 0;

                          return (
                            <>
                              {paginate(sorted, dashPage, perPage).map(cat => {
                                grandSum += cat.total;
                                grandCount += cat.count;

                                return (
                                  <tr 
                                    key={cat.id}
                                    onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }}
                                    className="table-row hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all cursor-pointer group text-[11px]"
                                  >
                                    <td className="table-cell">
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-md bg-red-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                          <Wallet className="w-3 h-3 text-red-600" />
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">{cat.name}</span>
                                      </div>
                                    </td>
                                    <td className="table-cell text-right">
                                      <span className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                                        ₨ {formatCurrency(cat.total)}
                                      </span>
                                    </td>
                                    <td className="table-cell text-center">
                                      <span className="font-bold text-slate-500 uppercase tracking-widest">{cat.count} Entries</span>
                                    </td>
                                    <td className="table-cell text-right">
                                      <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-dark-800 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-all float-right">
                                        <ArrowRight className="w-3 h-3" />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                              
                              {sorted.length > 0 && (
                                <tr className="font-black text-black dark:text-white bg-slate-100/50 dark:bg-dark-800/50 border-t-2 border-slate-300 dark:border-dark-700">
                                  <td className="table-cell text-left text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black">Totals for visible accounts</td>
                                  <td className="table-cell text-right text-sm text-red-600 tabular-nums font-black">₨ {formatCurrency(grandSum)}</td>
                                  <td className="table-cell text-center text-xs text-slate-500 font-black">{grandCount} Total</td>
                                  <td className="table-cell"></td>
                                </tr>
                              )}
                            </>
                          );
                        })()}
                  </tbody>
                </table>
              </div>
              {(() => {
                const f = expenseCategories.filter(c => !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()));
                return f.length > 0 ? <Pagination page={dashPage} total={f.length} perPage={perPage} onChange={setDashPage} onPerPageChange={(v) => { setPerPage(v); setDashPage(1); setPage(1); }} /> : null;
              })()}
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
          <div className="flex-1 flex gap-4 h-full w-full min-h-0 overflow-hidden p-4">
            <div 
              onMouseEnter={() => setIsSidebarHovered(true)}
              onMouseLeave={() => setIsSidebarHovered(false)}
              className={cn(
                "flex-shrink-0 flex flex-col gap-3 h-full transition-all duration-300 ease-in-out border border-slate-200 dark:border-dark-700/50 bg-white/50 dark:bg-dark-900/50 rounded-2xl backdrop-blur-md shadow-sm relative z-20 overflow-hidden",
                isExpanded ? "w-64" : "w-16"
              )}
            >
              <div className="flex items-center justify-between px-3 py-3 border-b border-slate-100 dark:border-dark-800/50">
                {isExpanded && (
                  <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left-2">Categories</h2>
                )}
                <button 
                  onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors ml-auto",
                    isSidebarPinned ? "text-red-600 bg-red-50 dark:bg-red-900/20" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                  )}
                  title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                >
                  {isSidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 space-y-2 border-b border-slate-100 dark:border-dark-700/30 bg-slate-50/30">
                {isExpanded ? (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <SearchBar value={sidebarSearch} onChange={setSidebarSearch} placeholder="Search Expense..." fullWidth={true} className="!py-1.5 !text-[11px]" />
                    <div className="relative group">
                      <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-red-600 transition-colors pointer-events-none" />
                      <select
                        value={sidebarSort}
                        onChange={(e) => setSidebarSort(e.target.value)}
                        className="w-full appearance-none pl-7 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all cursor-pointer outline-none"
                      >
                        <option value="name_asc">A to Z</option>
                        <option value="name_desc">Z to A</option>
                        <option value="total_desc">High Total</option>
                        <option value="total_asc">Low Total</option>
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
                {filteredSidebar.length === 0 ? (
                  isExpanded && <div className="p-8 text-center text-xs text-slate-400 italic">No Categories found</div>
                ) : (
                  filteredSidebar.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCat(c.id); setSearch(''); setPage(1); }}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent',
                        selectedCat === c.id 
                          ? 'bg-red-600 text-white shadow-lg scale-105' 
                          : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                      )}
                      title={!isExpanded ? c.name : ''}
                    >
                      <Tag className={cn("w-4 h-4 flex-shrink-0", selectedCat === c.id ? "text-white" : "text-red-600")} />
                      {isExpanded && (
                        <p className="truncate text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-left-2">{c.name}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col h-full pr-4">
              {cat ? (
                <>
                  <div className="flex items-center justify-between mb-5 animate-in slide-in-from-bottom duration-350">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-red-600/10 dark:bg-red-600/20 flex items-center justify-center">
                        <Wallet className="w-8 h-8 text-red-600 dark:text-red-600" />
                      </div>
                      <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                          {cat.name} Expenses
                        </h1>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 animate-in slide-in-from-bottom duration-350 delay-75">
                    <div className="glass p-6 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Records</p>
                      <p className="text-3xl font-black text-slate-800 dark:text-white">{catEntries.length}</p>
                    </div>
                    <div className="glass p-6 rounded-2xl border-l-4 border-red-600 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Spending (₨)</p>
                      <p className="text-3xl font-black text-red-600 tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(totals)}</p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 animate-in slide-in-from-bottom duration-350 delay-150 flex-1 flex flex-col mb-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                      <div className="flex-1 min-w-0 flex items-center gap-3">
                        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." />
                        
                        <div className="relative group shrink-0">
                          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 transition-colors pointer-events-none" />
                          <select
                            value={entrySort}
                            onChange={(e) => setEntrySort(e.target.value)}
                            className="appearance-none pl-9 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-red-600/20 focus:border-red-600 transition-all cursor-pointer outline-none shadow-sm"
                          >
                            <option value="date_desc">Newest First</option>
                            <option value="date_asc">Oldest First</option>
                            <option value="details_asc">A to Z</option>
                            <option value="details_desc">Z to A</option>
                            <option value="amount_desc">Highest Amount</option>
                            <option value="amount_asc">Lowest Amount</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                          </div>
                        </div>
                      </div>
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
                    <div className="flex-1 overflow-auto smart-scroll">
                      <table className="table-excel">
                        <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                          <tr className="table-header">
                            <th className="px-4 py-3 text-left w-24">Date</th>
                            <th className="px-4 py-3 text-left w-auto">Description</th>
                            <th className="px-4 py-3 text-right w-44">Amount</th>
                            <th className="px-4 py-3 w-20 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.length === 0 ? (
                            <tr><td colSpan={4} className="text-center text-slate-400 py-12 italic">No transactions found</td></tr>
                          ) : paged.map((e) => (
                            <tr key={e.id} className="group">
                              <td className="whitespace-nowrap text-[11px] font-medium uppercase tracking-tighter text-slate-500 dark:text-dark-400 tabular-nums">{formatDate(e.date)}</td>
                              <td className="text-black dark:text-white font-medium text-[13px]">{e.details || '—'}</td>
                              <td className="amount !text-red-600 dark:!text-red-400 whitespace-nowrap tabular-nums">₨ {formatCurrency(e.amount)}</td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => setViewingEntity(e)} 
                                    className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-800/30 rounded hover:bg-red-100 dark:hover:bg-red-800/40 transition-all font-serif" 
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
                                      <button 
                                        onClick={async () => { 
                                          if (await confirm('Delete this expense entry permanently?', { title: 'Confirm Deletion', kind: 'warning' })) { 
                                            deleteExpenseEntry(e.id); 
                                            toast('Entry deleted', 'warning'); 
                                          } 
                                        }} 
                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      >
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
                          <tr className="bg-slate-200 dark:bg-dark-800 border-t-2 border-slate-400">
                            <td colSpan={2} className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-tighter leading-none">Page Total</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-1">Grand Total</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap border-l border-slate-300 dark:border-dark-700 pl-4 tabular-nums">
                              <div className="flex flex-col items-end">
                                <span className="text-lg font-black text-red-600/70 leading-none">₨ {formatCurrency(pageTotals)}</span>
                                <span className="text-lg font-black text-red-600 mt-1">₨ {formatCurrency(totals)}</span>
                              </div>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                    <Pagination 
                      page={page} 
                      total={catEntries.length} 
                      perPage={perPage} 
                      onChange={setPage} 
                      onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 opacity-40">
                  <Wallet className="w-16 h-16 mb-4" />
                  <p className="font-medium font-bold">Select an account to view statement</p>
                </div>
              )}
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

              <form onSubmit={handleAddCategory} onKeyDown={handleFormKeyDown} className="space-y-6">
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
                                     {currentUser?.role === 'Admin' && (
                                       <button 
                                         onClick={async (ev) => { 
                                           ev.stopPropagation(); 
                                           if (await confirm('Delete this category and ALL its history? This action cannot be undone.', { title: 'DANGER: Confirm Deletion', kind: 'error' })) { 
                                             deleteExpenseCategory(c.id); 
                                           } 
                                         }} 
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
          title={editingEntity ? 'Edit Expense Entry' : 'Add Expense Entry'} 
          onClose={closeForm}
        >
          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="flex flex-col gap-1">
            <div className="bg-slate-50 dark:bg-dark-800/50 rounded-2xl p-4 mb-4 border border-slate-200 dark:border-dark-700/50">
              <div className="desktop-form-row">
                <label className="desktop-form-label">Entry Date</label>
                <div className="desktop-form-field">
                  <input type="date" className="input !py-1.5" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Details</label>
                <div className="desktop-form-field">
                  <input className="input !py-1.5" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} placeholder="Expense details" dir="auto" />
                </div>
              </div>
            </div>

            <div className="px-2">
              <div className="desktop-form-row !border-b-0">
                <label className="desktop-form-label text-red-600 dark:text-red-400">Amount (₨)</label>
                <div className="desktop-form-field">
                  <input type="number" step="any" className="input !py-1.5 !bg-red-50/30 dark:!bg-red-900/10 focus:ring-red-500/20" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
                </div>
              </div>
            </div>

            <div className="desktop-form-footer">
              <div className="desktop-summary-strip flex-1 mr-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-red-600 uppercase tracking-tighter">Total Expense</span>
                  <span className="text-xl font-black text-red-600 dark:text-red-500 font-mono tracking-tighter">₨ {formatCurrency(Number(form.amount) || 0)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeForm} className="btn-secondary !py-2 !px-4" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary !bg-red-600 !hover:bg-red-500 !py-2 !px-6" disabled={isSaving}>
                  {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingEntity ? 'Update' : 'Confirm [F10]'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={viewingEntity}
          type="expense"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && cat && (
        <PrintReportModal
          isOpen={showReport}
          onClose={() => setShowReport(false)}
          type="expense"
          title={`${cat.name} Expense Report`}
          columns={[
            { header: 'Date', accessor: 'date' },
            { header: 'Description', accessor: 'details' },
            { header: 'Amount', accessor: 'amount', align: 'right', isCurrency: true },
          ]}
          data={catEntries}
          totals={{
            amount: catEntries.reduce((s: number, e: any) => s + (e.amount || 0), 0)
          }}
          dateRange={fromDate || toDate ? { from: fromDate, to: toDate } : undefined}
        />
      )}

      {showSummaryReport && (
        <PrintReportModal
          isOpen={showSummaryReport}
          onClose={() => setShowSummaryReport(false)}
          title="Expense Summary Report"
          columns={[
            { header: 'Expense Category', accessor: 'name' },
            { header: 'Entries', accessor: 'count', align: 'center' },
            { header: 'Total Amount', accessor: 'total', align: 'right', isCurrency: true },
          ]}
          data={(() => {
            const items = expenseCategories.map(cat => {
              const entries = filterByStartDate(expenseEntries, settings.startDate)
                .filter(e => e.categoryId === cat.id)
                .filter(e => {
                  const matchesFrom = !fromDate || e.date >= fromDate;
                  const matchesTo = !toDate || e.date <= toDate;
                  return matchesFrom && matchesTo;
                });
              const total = entries.reduce((sum, e) => sum + (e.amount || 0), 0);
              return { ...cat, total, count: entries.length };
            });
            return items.filter(i => !dashboardSearch || i.name.toLowerCase().includes(dashboardSearch.toLowerCase()))
                        .sort((a, b) => {
                          switch (dashSort) {
                            case 'name_asc':  return a.name.localeCompare(b.name);
                            case 'name_desc': return b.name.localeCompare(a.name);
                            case 'amount_desc': return b.total - a.total;
                            case 'amount_asc':  return a.total - b.total;
                            default:          return 0;
                          }
                        });
          })()}
          totals={{
            amount: (() => {
              const allFilteredEntries = filterByStartDate(expenseEntries, settings.startDate)
                .filter(e => {
                  const matchesFrom = !fromDate || e.date >= fromDate;
                  const matchesTo = !toDate || e.date <= toDate;
                  return matchesFrom && matchesTo;
                });
              const filteredCats = expenseCategories.filter(c => !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()));
              const filteredIds = new Set(filteredCats.map(c => c.id));
              const periodEntries = allFilteredEntries.filter(e => filteredIds.has(e.categoryId));
              return periodEntries.reduce((sum, e) => sum + e.amount, 0);
            })()
          }}
          dateRange={fromDate || toDate ? { from: fromDate, to: toDate } : undefined}
        />
      )}
    </div>
  );
}
