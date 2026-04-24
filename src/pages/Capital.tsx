import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Wallet, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff, Package, PlusCircle } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';

export default function CapitalPage() {
  const { 
    capitalCategories, capitalEntries, 
    addCapitalCategory, updateCapitalCategory, deleteCapitalCategory, 
    addCapitalEntry, deleteCapitalEntry, settings, currentUser, updateCapitalEntry 
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
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [perPage, setPerPage] = useState(40);
  const [isSaving, setIsSaving] = useState(false);
  const [dashSort, setDashSort] = useState('name_asc');
  const [entrySort, setEntrySort] = useState('date_desc');
  const [sidebarSort, setSidebarSort] = useState('name_asc');

  // Inline Entry State
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [inlineForm, setInlineForm] = useState({ date: today(), description: '', debit: '', credit: '' });

  useEffect(() => {
    if (!selectedCat && capitalCategories.length > 0) {
      setSelectedCat(capitalCategories[0].id);
    }
  }, [capitalCategories, selectedCat]);

  const cat = capitalCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() => {
    const list = capitalCategories.filter((c) => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
    
    const withBalances = list.map(c => {
      const entries = filterByStartDate(capitalEntries, settings.startDate).filter(e => e.categoryId === c.id);
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
  }, [capitalCategories, sidebarSearch, sidebarSort, capitalEntries, settings.startDate]);

  const filteredManage = useMemo(() =>
    capitalCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [capitalCategories, manageSearch]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(capitalEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [capitalEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

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

  const handleSaveInline = async () => {
    if (!selectedCat || !inlineForm.date) { toast('Fill required fields', 'error'); return; }
    
    const debit = parseFloat(inlineForm.debit) || 0;
    const credit = parseFloat(inlineForm.credit) || 0;
    const payload = { categoryId: selectedCat, date: inlineForm.date, description: inlineForm.description, debit, credit, balance: 0 };
    
    setIsSaving(true);
    try {
      if (editingEntityId) {
        await updateCapitalEntry(editingEntityId, payload);
        toast('Entry updated', 'success');
        setEditingEntityId(null);
      } else {
        await addCapitalEntry(payload);
        toast('Entry added', 'success');
      }
      setIsInlineAdding(false);
      setInlineForm({ date: today(), description: '', debit: '', credit: '' });
    } catch (err: any) {
      toast(`Failed to save: ${err.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditInline = (e: any) => {
    setEditingEntityId(e.id);
    setInlineForm({
      date: e.date,
      description: e.description || '',
      debit: e.debit ? e.debit.toString() : '',
      credit: e.credit ? e.credit.toString() : '',
    });
    setIsInlineAdding(true);
  };

  const totals = useMemo(() => ({
    debit: filteredEntries.reduce((s, e) => s + (e.debit || 0), 0),
    credit: filteredEntries.reduce((s, e) => s + (e.credit || 0), 0),
  }), [filteredEntries]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const normalized = newName.trim().toLowerCase();
    if (capitalCategories.some(c => c.name.toLowerCase() === normalized)) {
      toast('A capital account with this name already exists!', 'error');
      return;
    }
    addCapitalCategory(newName.trim());
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
    if (capitalCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another capital account already has this name!', 'error');
      return;
    }
    updateCapitalCategory(id, editForm.name.trim());
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
            { id: 'database', label: 'Capital Ledger', icon: Wallet },
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
              const allFilteredEntries = filterByStartDate(capitalEntries, settings.startDate);
              const globalDebit = allFilteredEntries.reduce((sum, e) => sum + e.debit, 0);
              const globalCredit = allFilteredEntries.reduce((sum, e) => sum + e.credit, 0);
              const globalNet = globalDebit - globalCredit;
              return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="glass p-6 rounded-3xl border-l-8 border-primary-600 shadow-xl relative group">
                    <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Total Equity Valuation</p>
                    <p className={cn("text-3xl font-black tabular-nums break-all", globalNet >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                      ₨ {formatCurrency(Math.abs(globalNet))}
                      <span className="text-xs ml-2 font-bold text-slate-400 uppercase">{globalNet >= 0 ? 'DR' : 'CR'}</span>
                    </p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-slate-400 shadow-xl">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Capital Accounts</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">{capitalCategories.length}</p>
                  </div>
                  <div className="glass p-6 rounded-3xl border-l-8 border-emerald-500 shadow-xl">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Total Contributions</p>
                    <p className="text-3xl font-black text-slate-900 dark:text-white">₨ {formatCurrency(globalDebit)}</p>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex-1 flex items-center gap-3 max-w-2xl">
                <SearchBar value={dashboardSearch} onChange={setDashboardSearch} placeholder="Search accounts..." fullWidth={true} />
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
                      <th className="table-cell text-left">Capital Account</th>
                      <th className="table-cell text-right">Current Value</th>
                      <th className="table-cell text-center">Entries</th>
                      <th className="table-cell w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {(() => {
                      const items = capitalCategories.map(cat => {
                        const entries = filterByStartDate(capitalEntries, settings.startDate).filter(e => e.categoryId === cat.id);
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
                              <Wallet className="w-3 h-3 text-primary-600" />
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
              <Pagination page={dashPage} total={capitalCategories.length} perPage={perPage} onChange={setDashPage} onPerPageChange={setPerPage} />
            </div>
          </div>
        ) : activeTab === 'database' ? (
          <div className="flex-1 flex gap-4 h-full w-full p-4 overflow-hidden">
             {/* Sidebar List */}
             <div className={cn("flex-shrink-0 flex flex-col gap-3 h-full transition-all border border-slate-200 dark:border-dark-700/50 bg-white/50 dark:bg-dark-900/50 rounded-2xl", isExpanded ? "w-64" : "w-16")}>
               <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                 {isExpanded && <h2 className="text-[10px] font-black uppercase tracking-widest">Accounts</h2>}
                 <button onClick={() => setIsSidebarPinned(!isSidebarPinned)} className="p-1">{isSidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}</button>
               </div>
               <div className="overflow-y-auto p-2 space-y-1">
                 {filteredSidebar.map(c => (
                   <div key={c.id} onClick={() => { setSelectedCat(c.id); setPage(1); }} className={cn("flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all", selectedCat === c.id ? "bg-primary-600 text-white shadow-lg" : "hover:bg-slate-100")}>
                     <Wallet className="w-4 h-4 flex-shrink-0" />
                     {isExpanded && <p className="truncate text-xs font-black uppercase">{c.name}</p>}
                   </div>
                 ))}
               </div>
             </div>

             {/* Main Table */}
             <div className="flex-1 min-w-0 flex flex-col h-full">
               {cat ? (
                 <>
                   <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center"><Wallet className="w-8 h-8 text-primary-600" /></div>
                        <div>
                          <h1 className="text-3xl font-black tracking-tighter uppercase">{cat.name} Ledger</h1>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction History</p>
                        </div>
                      </div>
                      <button onClick={() => { setEditingEntityId(null); setInlineForm({ date: today(), description: '', debit: '', credit: '' }); setIsInlineAdding(true); }} className="btn-primary flex items-center gap-2 !rounded-2xl">
                        <Plus className="w-5 h-5" /> New Entry
                      </button>
                   </div>

                   <div className="flex-1 glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-dark-700/50 flex flex-col shadow-2xl bg-white dark:bg-dark-900">
                     <div className="p-4 border-b flex items-center justify-between bg-slate-50/50">
                        <SearchBar value={search} onChange={setSearch} placeholder="Search ledger..." />
                        <div className="flex items-center gap-2">
                           <input type="date" className="input !py-1 !text-xs !rounded-lg" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                           <span className="text-slate-300 font-black">TO</span>
                           <input type="date" className="input !py-1 !text-xs !rounded-lg" value={toDate} onChange={e => setToDate(e.target.value)} />
                        </div>
                     </div>
                     <div className="flex-1 overflow-auto smart-scroll">
                        <table className="w-full border-collapse">
                           <thead className="sticky top-0 z-10 bg-slate-900 text-white font-mono">
                             <tr className="text-[10px] uppercase tracking-widest">
                               <th className="px-6 py-4 text-left border-r border-slate-700">Date</th>
                               <th className="px-6 py-4 text-left border-r border-slate-700">Description</th>
                               <th className="px-6 py-4 text-right border-r border-slate-700">Debit (In)</th>
                               <th className="px-6 py-4 text-right border-r border-slate-700">Credit (Out)</th>
                               <th className="px-6 py-4 text-right border-r border-slate-700">Balance</th>
                               <th className="px-6 py-4 text-center">Actions</th>
                             </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
                             {/* Inline Add Row */}
                             {isInlineAdding && (
                               <tr className="bg-primary-50/50 dark:bg-primary-900/10 animate-slide-down border-b-2 border-primary-500">
                                 <td className="px-4 py-3"><input type="date" className="w-full bg-white dark:bg-dark-800 border border-primary-300 rounded px-2 py-1 outline-none text-xs" value={inlineForm.date} onChange={e => setInlineForm({...inlineForm, date: e.target.value})} /></td>
                                 <td className="px-4 py-3"><input type="text" className="w-full bg-white dark:bg-dark-800 border border-primary-300 rounded px-2 py-1 outline-none text-xs" placeholder="Description..." value={inlineForm.description} onChange={e => setInlineForm({...inlineForm, description: e.target.value})} /></td>
                                 <td className="px-4 py-3"><input type="number" className="w-full bg-white dark:bg-dark-800 border border-primary-300 rounded px-2 py-1 outline-none text-xs text-right" placeholder="0.00" value={inlineForm.debit} onChange={e => setInlineForm({...inlineForm, debit: e.target.value})} /></td>
                                 <td className="px-4 py-3"><input type="number" className="w-full bg-white dark:bg-dark-800 border border-primary-300 rounded px-2 py-1 outline-none text-xs text-right" placeholder="0.00" value={inlineForm.credit} onChange={e => setInlineForm({...inlineForm, credit: e.target.value})} /></td>
                                 <td className="px-4 py-3 text-right text-slate-400 font-bold italic">Draft</td>
                                 <td className="px-4 py-3 text-center">
                                   <div className="flex justify-center gap-2">
                                     <button onClick={handleSaveInline} className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-sm" disabled={isSaving}><Save className="w-4 h-4" /></button>
                                     <button onClick={() => { setIsInlineAdding(false); setEditingEntityId(null); }} className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"><X className="w-4 h-4" /></button>
                                   </div>
                                 </td>
                               </tr>
                             )}

                             {paged.map(e => (
                               <tr key={e.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50 font-mono text-[11px]">
                                 <td className="px-6 py-4 font-bold text-slate-500 border-r border-slate-100">{formatDate(e.date)}</td>
                                 <td className="px-6 py-4 text-slate-800 font-medium border-r border-slate-100">{e.description || '—'}</td>
                                 <td className="px-6 py-4 text-right text-emerald-600 font-black border-r border-slate-100">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                                 <td className="px-6 py-4 text-right text-orange-600 font-black border-r border-slate-100">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                                 <td className="px-6 py-4 text-right font-black text-slate-900 border-r border-slate-100 bg-slate-50/30 whitespace-nowrap">₨ {formatCurrency(e.balance)}</td>
                                 <td className="px-6 py-4 text-center">
                                   <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={() => handleEditInline(e)} className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                                     <button onClick={() => { if(confirm('Delete?')) deleteCapitalEntry(e.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                                   </div>
                                 </td>
                               </tr>
                             ))}
                           </tbody>
                        </table>
                     </div>
                     <Pagination page={page} total={withBalance.length} perPage={perPage} onChange={setPage} onPerPageChange={setPerPage} />
                  </div>
                 </>
               ) : (
                 <div className="flex flex-col items-center justify-center h-full opacity-40"><Wallet className="w-16 h-16 mb-4 text-primary-600" /><p className="font-black uppercase tracking-widest text-xs">Select a capital account to view ledger</p></div>
               )}
             </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="flex-1 p-8">
            <div className="max-w-2xl mx-auto glass p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-dark-700/50">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center"><UserPlus className="w-7 h-7 text-primary-600" /></div>
                <h2 className="text-2xl font-black uppercase tracking-tighter">New Capital Registration</h2>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-6">
                <div>
                  <label className="label text-[10px] font-black uppercase tracking-widest mb-2 block">Account Name *</label>
                  <input className="input !py-4 !font-bold !rounded-2xl" placeholder="e.g. Owner Capital, Partner Share, etc." value={newName} onChange={e => setNewName(e.target.value)} required />
                </div>
                <button type="submit" className="btn-primary !w-full !py-4 font-black text-lg !rounded-2xl shadow-xl shadow-primary-600/20">Complete Registration</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 p-8">
            <div className="max-w-4xl mx-auto glass rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-2xl">
              <div className="p-6 border-b bg-slate-50/50 flex items-center justify-between">
                <h2 className="text-sm font-black uppercase tracking-widest">Manage Accounts</h2>
                <SearchBar value={manageSearch} onChange={setManageSearch} placeholder="Filter accounts..." />
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
                          <button onClick={() => { if(confirm('Delete account and all its entries?')) deleteCapitalCategory(cat.id); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
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
          type="capital"
          data={{
            entries: withBalance,
            totals: { ...totals, balance: totals.debit - totals.credit },
            accountName: cat.name
          }}
        />
      )}
      {showSummaryReport && (
        <PrintReportModal
          isOpen={showSummaryReport}
          onClose={() => setShowSummaryReport(false)}
          type="capital_summary"
          data={{
            accounts: capitalCategories.map(c => {
              const entries = filterByStartDate(capitalEntries, settings.startDate).filter(e => e.categoryId === c.id);
              const debit = entries.reduce((s, e) => s + (e.debit || 0), 0);
              const credit = entries.reduce((s, e) => s + (e.credit || 0), 0);
              return { ...c, balance: debit - credit, debit, credit };
            })
          }}
        />
      )}
    </div>
  );
}
