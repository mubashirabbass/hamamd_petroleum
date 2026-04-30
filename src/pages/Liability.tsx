import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Landmark, Plus, Trash2, Eye, Edit2, Search, Check, X, FileText, Settings, UserPlus, Printer, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff } from 'lucide-react';
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

export default function LiabilityPage() {
  const {
    liabilityCategories, liabilityEntries,
    addLiabilityCategory, updateLiabilityCategory, deleteLiabilityCategory,
    addLiabilityEntry, deleteLiabilityEntry, settings, currentUser, updateLiabilityEntry
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
    if (!selectedCat && liabilityCategories.length > 0) {
      setSelectedCat(liabilityCategories[0].id);
    }
  }, [liabilityCategories, selectedCat]);

  const cat = liabilityCategories.find((c) => c.id === selectedCat);

  const filteredSidebar = useMemo(() => {
    const list = liabilityCategories.filter((c) => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase()));
    
    const withBalances = list.map(c => {
      const entries = filterByStartDate(liabilityEntries, settings.startDate).filter(e => e.categoryId === c.id);
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
  }, [liabilityCategories, sidebarSearch, sidebarSort, liabilityEntries, settings.startDate]);

  const filteredManage = useMemo(() =>
    liabilityCategories.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())),
    [liabilityCategories, manageSearch]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(liabilityEntries, settings.startDate)
      .filter((e) => e.categoryId === selectedCat)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo = !toDate || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [liabilityEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const preFilterBalance = useMemo(() => {
    if (!selectedCat) return 0;
    const allEntries = liabilityEntries.filter(e => e.categoryId === selectedCat);
    if (!settings.startDate) return 0;
    return allEntries
      .filter(e => e.date < settings.startDate)
      .reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
  }, [liabilityEntries, selectedCat, settings.startDate]);

  const withBalance = useMemo(() => {
    const chronological = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    let bal = preFilterBalance;
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
  }, [filteredEntries, entrySort, preFilterBalance]);

  const paged = paginate(withBalance, page, perPage);

  const pageOpeningBalance = useMemo(() => {
    const chronological = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    const prevItems = chronological.slice(0, (page - 1) * perPage);
    let bal = preFilterBalance;
    prevItems.forEach(e => bal += (e.debit || 0) - (e.credit || 0));
    return bal;
  }, [filteredEntries, preFilterBalance, page, perPage]);

  const pageClosingBalance = useMemo(() => {
    const chronological = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    const thisPageItems = chronological.slice((page - 1) * perPage, page * perPage);
    let bal = pageOpeningBalance;
    thisPageItems.forEach(e => bal += (e.debit || 0) - (e.credit || 0));
    return bal;
  }, [filteredEntries, pageOpeningBalance, page, perPage]);

  const pageTotals = useMemo(() => {
    let dr = paged.reduce((s, e) => s + (e.debit || 0), 0);
    let cr = paged.reduce((s, e) => s + (e.credit || 0), 0);
    
    if (pageOpeningBalance > 0) dr += pageOpeningBalance;
    else if (pageOpeningBalance < 0) cr += Math.abs(pageOpeningBalance);
    
    if (pageClosingBalance > 0) cr += pageClosingBalance;
    else if (pageClosingBalance < 0) dr += Math.abs(pageClosingBalance);
    
    return { debit: dr, credit: cr };
  }, [paged, pageOpeningBalance, pageClosingBalance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat || !form.date) { toast('Fill required fields', 'error'); return; }

    const confirmed = window.confirm(editingEntity ? 'Confirm Update: Save changes to this liability?' : 'Confirm Save: Register this new liability entry?');
    if (!confirmed) return;

    const debit = parseFloat(form.debit) || 0;
    const credit = parseFloat(form.credit) || 0;
    const payload = { categoryId: selectedCat, date: form.date, description: form.description, debit, credit, balance: 0 };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateLiabilityEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeForm(); // Close after edit
      } else {
        await addLiabilityEntry(payload);
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

  const grandTotals = useMemo(() => {
    let dr = filteredEntries.reduce((s, e) => s + (e.debit || 0), 0);
    let cr = filteredEntries.reduce((s, e) => s + (e.credit || 0), 0);
    
    if (preFilterBalance > 0) dr += preFilterBalance;
    else if (preFilterBalance < 0) cr += Math.abs(preFilterBalance);
    
    const finalBalance = preFilterBalance + filteredEntries.reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0);
    if (finalBalance > 0) cr += finalBalance;
    else if (finalBalance < 0) dr += Math.abs(finalBalance);
    
    return { debit: dr, credit: cr, balance: finalBalance };
  }, [filteredEntries, preFilterBalance]);

  const globalDashboardTotals = useMemo(() => {
    let totalDr = 0;
    let totalCr = 0;
    let totalNet = 0;
    let totalEntriesCount = 0;

    liabilityCategories.forEach(cat => {
      const entries = filterByStartDate(liabilityEntries, settings.startDate)
        .filter(e => e.categoryId === cat.id)
        .filter(e => {
          const mf = !fromDate || e.date >= fromDate;
          const mt = !toDate || e.date <= toDate;
          return mf && mt;
        });

      const allC = liabilityEntries.filter(e => e.categoryId === cat.id);
      let pre = 0;
      if (settings.startDate) {
        pre = allC.filter(e => e.date < settings.startDate).reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0);
      }

      let dr = entries.reduce((s, e) => s + (e.debit || 0), 0);
      let cr = entries.reduce((s, e) => s + (e.credit || 0), 0);
      
      if (pre > 0) dr += pre;
      else if (pre < 0) cr += Math.abs(pre);
      
      const final = pre + entries.reduce((s, e) => s + (e.debit || 0) - (e.credit || 0), 0);
      if (final > 0) cr += final;
      else if (final < 0) dr += Math.abs(final);

      totalDr += dr;
      totalCr += cr;
      totalNet += final;
      totalEntriesCount += entries.length;
    });
    
    return { debit: totalDr, credit: totalCr, net: totalNet, count: totalEntriesCount };
  }, [liabilityCategories, liabilityEntries, settings.startDate, fromDate, toDate]);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const normalized = newName.trim().toLowerCase();
    if (liabilityCategories.some(c => c.name.toLowerCase() === normalized)) {
      toast('A liability account with this name already exists!', 'error');
      return;
    }

    addLiabilityCategory(newName.trim());
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
    if (liabilityCategories.some(c => c.id !== id && c.name.toLowerCase() === normalized)) {
      toast('Another liability account already has this name!', 'error');
      return;
    }

    updateLiabilityCategory(id, editForm.name.trim());
    setEditingId(null);
    toast('Account details updated', 'success');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader 
        title="Liability Entries" 
        icon={Landmark} 
        iconClassName="!bg-orange-100 !text-orange-600"
      />

      <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 flex-shrink-0">
        <div className="pill-nav-container">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn("pill-nav-item", activeTab === 'dashboard' ? "pill-nav-item-active bg-orange-600 border-orange-600 shadow-orange-500/30" : "hover:border-orange-100")}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={cn("pill-nav-item", activeTab === 'database' ? "pill-nav-item-active bg-orange-600 border-orange-600 shadow-orange-500/30" : "hover:border-orange-100")}
          >
            Entries
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn("pill-nav-item", activeTab === 'register' ? "pill-nav-item-active bg-orange-600 border-orange-600 shadow-orange-500/30" : "hover:border-orange-100")}
          >
            New Acc
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn("pill-nav-item", activeTab === 'manage' ? "pill-nav-item-active bg-orange-600 border-orange-600 shadow-orange-500/30" : "hover:border-orange-100")}
          >
            Settings
          </button>
        </div>
      </div>


        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-6">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <div className="glass p-4 rounded-3xl border-l-4 border-orange-500 shadow-xl bg-gradient-to-br from-orange-50 to-white dark:from-orange-900/10 dark:to-dark-900 col-span-2 md:col-span-1">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Net Liability</p>
                <p className={cn("text-2xl font-black tabular-nums leading-tight", globalDashboardTotals.net >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                  ₨ {formatCurrency(Math.abs(globalDashboardTotals.net))}
                  <span className="text-[10px] ml-1 font-bold text-slate-400 uppercase">{globalDashboardTotals.net >= 0 ? 'DR' : 'CR'}</span>
                </p>
              </div>

              <div className="glass p-4 rounded-3xl border-l-4 border-orange-500 shadow-lg bg-white dark:bg-dark-900 col-span-1">
                <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest mb-1">Total Debit (+)</p>
                <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                  ₨ {formatCurrency(globalDashboardTotals.debit)}
                </p>
              </div>
              <div className="glass p-4 rounded-3xl border-l-4 border-red-500 shadow-lg bg-white dark:bg-dark-900 col-span-1">
                <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">Total Credit (-)</p>
                <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                  ₨ {formatCurrency(globalDashboardTotals.credit)}
                </p>
              </div>

              <div className="glass p-3 rounded-2xl border-l-4 border-slate-400 shadow-sm bg-white dark:bg-dark-800/50 col-span-1">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Accounts</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{liabilityCategories.length}</p>
              </div>
              <div className="glass p-3 rounded-2xl border-l-4 border-primary-500 shadow-sm bg-primary-50/30 dark:bg-primary-900/10 col-span-1">
                <p className="text-[8px] font-black text-primary-600 uppercase tracking-widest mb-1">Total Entries</p>
                <p className="text-sm font-black text-slate-900 dark:text-white">{globalDashboardTotals.count}</p>
              </div>
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
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-orange-600 transition-colors pointer-events-none" />
                <select
                  value={dashSort}
                  onChange={(e) => setDashSort(e.target.value)}
                  className="appearance-none pl-7 pr-8 py-2 bg-slate-50 dark:bg-dark-800 border border-slate-200 dark:border-dark-700 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all cursor-pointer outline-none shadow-sm"
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
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg", (fromDate === today() && toDate === today()) ? "bg-white dark:bg-dark-900 text-orange-600 shadow-sm" : "text-slate-500")}
                >
                  Today
                </button>
                <button 
                  onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} 
                  className={cn("px-3 py-1 text-[10px] font-black uppercase tracking-wider transition-all rounded-lg border-l border-slate-200 dark:border-dark-700/50", (fromDate === startOfMonth() && toDate === today()) ? "bg-white dark:bg-dark-900 text-orange-600 shadow-sm" : "text-slate-500")}
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
                  const itemsWithTotals = liabilityCategories.map(cat => {
                    const entries = filterByStartDate(liabilityEntries, settings.startDate)
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
                      case 'debt_desc': return a.balance - b.balance;
                      case 'debt_asc':  return b.balance - a.balance;
                      default:          return 0;
                    }
                  });

                  return sorted.map(cat => (
                    <div 
                      key={cat.id}
                      onClick={() => { setSelectedCat(cat.id); setActiveTab('database'); }}
                      className="glass p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all border-l-4 border-l-orange-500 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                          <Landmark className="w-5 h-5 text-orange-600" />
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

            {liabilityCategories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-dark-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-dark-700/50">
                <Landmark className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No Liabilities Registered</p>
                <button onClick={() => setActiveTab('register')} className="mt-4 text-xs font-black text-primary-600 uppercase tracking-widest hover:underline">Register your first liability →</button>
              </div>
            )}
          </div>
        ) : activeTab === 'database' ? (
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20">
            {/* Account Selector Slide Bar */}
            <div className="bg-white dark:bg-dark-900 border-b border-slate-200 dark:border-dark-800 p-3 flex items-center gap-3 shrink-0 w-full overflow-hidden">
               <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-dark-800 rounded-2xl border border-slate-200 dark:border-dark-700 focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all shrink-0">
                 <Search className="w-4 h-4 text-slate-400" />
                 <input 
                   placeholder="Find Account..." 
                   className="bg-transparent border-none outline-none text-[11px] font-black uppercase tracking-wider w-24 text-slate-700 dark:text-dark-200 placeholder:text-slate-400 placeholder:font-normal"
                   value={sidebarSearch}
                   onChange={e => setSidebarSearch(e.target.value)}
                 />
               </div>
               
               <div className="flex-1 min-w-0 flex items-center gap-2 overflow-x-auto no-scrollbar smart-scroll py-1 pr-4">
                 {liabilityCategories
                   .filter(c => !sidebarSearch || c.name.toLowerCase().includes(sidebarSearch.toLowerCase()))
                   .map(c => (
                   <button 
                     key={c.id}
                     onClick={() => { setSelectedCat(c.id); setPage(1); }}
                     className={cn(
                       "whitespace-nowrap px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-tight transition-all border-2",
                       selectedCat === c.id 
                         ? "bg-orange-600 border-orange-600 text-white shadow-xl shadow-orange-500/30 scale-105" 
                         : "bg-white dark:bg-dark-900 border-slate-100 dark:border-dark-800 text-slate-600 dark:text-dark-400 hover:border-orange-200 hover:shadow-md"
                     )}
                   >
                     {c.name}
                   </button>
                 ))}
               </div>
            </div>

            <div className="p-4 flex-1 flex flex-col min-h-0">

            <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mb-4">
              <div className="flex-1 min-w-[120px]">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search..." fullWidth className="!py-1.5 !text-[11px]" />
              </div>
              <button 
                onClick={() => setShowReport(true)}
                className="btn-secondary !py-2 !px-3 !bg-orange-50 dark:!bg-orange-900/10 !text-orange-600 !border-orange-200 dark:!border-orange-800 shrink-0 flex items-center gap-2 text-[10px] uppercase font-black tracking-widest shadow-sm"
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

            <div className="flex-1 glass rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-xl flex flex-col min-h-0 container-scroll">
              <div className="flex-1 overflow-x-auto overflow-y-auto smart-scroll">
                <table className="table-excel min-w-[1000px] w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800 shadow-sm">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left px-4">Date</th>
                      <th className="table-cell text-left px-4">Description</th>
                      <th className="table-cell text-right px-4">Debit (Paid)</th>
                      <th className="table-cell text-right px-4">Credit (Owed)</th>
                      <th className="table-cell text-right px-4">Balance</th>
                      <th className="table-cell text-center px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {/* Brought Forward Row */}
                    {(page > 1 || preFilterBalance !== 0) && (
                      <tr className="bg-slate-50 dark:bg-dark-800/30 text-[11px] font-bold italic">
                        <td className="table-cell">---</td>
                        <td className="table-cell uppercase">Balance Brought Forward (B/F)</td>
                        <td className="table-cell text-right text-emerald-600">
                          {pageOpeningBalance > 0 ? `₨ ${formatCurrency(pageOpeningBalance)}` : '---'}
                        </td>
                        <td className="table-cell text-right text-red-600">
                          {pageOpeningBalance < 0 ? `₨ ${formatCurrency(Math.abs(pageOpeningBalance))}` : '---'}
                        </td>
                        <td className="table-cell text-right font-black">
                          ₨ {formatCurrency(Math.abs(pageOpeningBalance))}
                          <span className="text-[9px] ml-1 opacity-50">{pageOpeningBalance >= 0 ? 'DR' : 'CR'}</span>
                        </td>
                        <td className="table-cell text-center">---</td>
                      </tr>
                    )}

                    {paged.length === 0 && preFilterBalance === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
                        </td>
                      </tr>
                    ) : (
                      paged.map((e) => (
                        <tr key={e.id} className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group">
                          <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(e.date)}</td>
                          <td className="table-cell font-medium text-slate-900 dark:text-white uppercase" dir="auto">{e.description || 'Liability Transaction'}</td>
                          <td className="table-cell text-right tabular-nums text-emerald-600 font-bold">{e.debit > 0 ? `₨ ${formatCurrency(e.debit)}` : '---'}</td>
                          <td className="table-cell text-right tabular-nums text-red-500 font-bold">{e.credit > 0 ? `₨ ${formatCurrency(e.credit)}` : '---'}</td>
                          <td className="table-cell text-right tabular-nums font-black text-slate-900 dark:text-white">
                            ₨ {formatCurrency(Math.abs(e.balance))}
                            <span className="text-[9px] ml-1 opacity-50">{e.balance >= 0 ? 'DR' : 'CR'}</span>
                          </td>
                          <td className="table-cell text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors" title="Print Receipt"><Printer className="w-4 h-4" /></button>
                              <button 
                                 onClick={(ev) => { ev.stopPropagation(); if(window.confirm('Modify this liability entry?')) handleEdit(e); }} 
                                 className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors" 
                                 title="Edit"
                               >
                                 <Edit2 className="w-4 h-4" />
                               </button>
                               {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                                 <button 
                                   onClick={(ev) => { ev.stopPropagation(); if(window.confirm('Permanently delete this liability record?')) deleteLiabilityEntry(e.id); }} 
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

                    {/* Close Up Row */}
                    {(paged.length > 0 || preFilterBalance !== 0) && (
                      <tr className="bg-slate-50 dark:bg-dark-800/30 text-[11px] font-bold italic border-t-2 border-slate-200">
                        <td className="table-cell">---</td>
                        <td className="table-cell uppercase font-black">Close Up Balance (C/F)</td>
                        <td className="table-cell text-right text-emerald-600">
                          {pageClosingBalance < 0 ? `₨ ${formatCurrency(Math.abs(pageClosingBalance))}` : '---'}
                        </td>
                        <td className="table-cell text-right text-red-600">
                          {pageClosingBalance > 0 ? `₨ ${formatCurrency(pageClosingBalance)}` : '---'}
                        </td>
                        <td className="table-cell text-right font-black">
                           ₨ {formatCurrency(Math.abs(pageClosingBalance))}
                           <span className="text-[9px] ml-1 opacity-50">{pageClosingBalance >= 0 ? 'DR' : 'CR'}</span>
                        </td>
                        <td className="table-cell text-center">---</td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-slate-100 dark:bg-dark-900 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] text-[11px] font-black uppercase tracking-wider">
                    <tr className="border-t-2 border-slate-300 dark:border-dark-700">
                      <td colSpan={2} className="px-4 py-3 text-right text-slate-500">Page Total:</td>
                      <td className="px-4 py-3 text-right text-emerald-600 tabular-nums">₨ {formatCurrency(pageTotals.debit)}</td>
                      <td className="px-4 py-3 text-right text-red-600 tabular-nums border-r border-slate-200 dark:border-dark-800">₨ {formatCurrency(pageTotals.credit)}</td>
                      <td colSpan={2}></td>
                    </tr>
                    <tr className="bg-orange-600 text-white border-t border-white/10">
                      <td colSpan={2} className="px-4 py-3 text-right opacity-80">Filters Grand Total:</td>
                      <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(grandTotals.debit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums border-r border-white/20">₨ {formatCurrency(grandTotals.credit)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-black" colSpan={2}>
                        NET: ₨ {formatCurrency(Math.abs(grandTotals.balance))} 
                        <span className="text-[9px] ml-1 opacity-80">{grandTotals.balance >= 0 ? 'DR' : 'CR'}</span>
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
                <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center">
                  <Plus className="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Liability Registration</h2>
                  <p className="text-sm text-slate-500 font-medium">Create a new entry in your Liability database</p>
                </div>
              </div>

              <form onSubmit={handleAddCategory} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">Account Name *</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        className="input !pl-12 !py-4 !text-sm !font-bold"
                        placeholder="e.g. Bank Loan, Private Lender, etc."
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
                  <button type="submit" className="btn-primary !px-12 !py-4 font-black shadow-xl shadow-primary-600/20 text-base flex items-center gap-2">
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
                {liabilityCategories.length} Accounts Found
              </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex-1 flex flex-col">
              <div className="overflow-y-auto smart-scroll">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left">Account Name</th>
                      <th className="table-cell text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {filteredManage.length === 0 ? (
                      <tr><td colSpan={2} className="px-6 py-20 text-center text-slate-400 italic font-medium">No results found</td></tr>
                    ) : filteredManage.map((c) => (
                      <tr
                        key={c.id}
                        className="hover:bg-slate-50 dark:hover:bg-dark-800/20 transition-all group cursor-pointer"
                        onClick={() => handleStartEdit(c)}
                      >
                        {editingId === c.id ? (
                          <>
                            <td className="px-6 py-3" onClick={(e) => e.stopPropagation()}>
                              <input className="input !py-1.5 !text-sm w-full" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus dir="auto" />
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
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-slate-800 dark:text-white text-sm">{c.name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleStartEdit(c)} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (window.confirm('Delete account and all history?')) deleteLiabilityCategory(c.id); }}
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
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Transaction Date</label>
                <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Description / Details</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800 shadow-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Monthly Interest Payment" dir="auto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Debit (Paid)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl !text-emerald-600 shadow-sm" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-red-600 px-1">Credit (Owed)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-xl !text-red-600 shadow-sm" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              <div className="bg-orange-600/5 dark:bg-orange-600/10 p-5 rounded-3xl border border-orange-600/10 text-center shadow-xl shadow-orange-500/5">
                 <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Impact On Liability</p>
                 <p className={cn("text-2xl font-black tabular-nums tracking-tight", (Number(form.credit)||0) - (Number(form.debit)||0) >= 0 ? "text-slate-900 dark:text-white" : "text-emerald-600")}>
                   ₨ {formatCurrency(Math.abs((Number(form.credit)||0) - (Number(form.debit)||0)))}
                   <span className="text-[10px] ml-1 uppercase">{(Number(form.credit)||0) - (Number(form.debit)||0) >= 0 ? 'Increase' : 'Decrease'}</span>
                 </p>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-[0.2em] text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-orange-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-white/20" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingEntity ? 'Update Liability' : 'Confirm Entry'}</span>
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
              if (!selectedCat && liabilityCategories.length > 0) setSelectedCat(liabilityCategories[0].id);
              if (liabilityCategories.length === 0) {
                 setActiveTab('register');
                 toast('Please register an account first', 'info');
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
          type="liability"
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && (
        <PrintReportModal
          data={withBalance}
          type="liability"
          title={`${cat?.name} Liability Report`}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
