import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Users, UserPlus, Printer, Search, Phone, Edit2, Check, X, UserCog, User, BarChart3, ArrowRight, ArrowUpDown, Save, Pin, PinOff } from 'lucide-react';
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

// const PER_PAGE = 40; // Replaced by state

export default function CustomerPage() {
  const {
    customers, customerEntries,
    addCustomerEntry, updateCustomerEntry, deleteCustomerEntry, addCustomer, updateCustomer, deleteCustomer, settings, currentUser
  } = useStore();

  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  // Layout State
  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');
  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [dashboardSearch, setDashboardSearch] = useState('');
  const [dashSort, setDashSort] = useState('name_asc');

  // Registration Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');

  // Management State
  const [manageSearch, setManageSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });


  // Transaction Table State
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [dashPage, setDashPage] = useState(1);
  const [perPage, setPerPage] = useState(40);
  const [entrySort, setEntrySort] = useState('date_desc');
  const [sidebarSort, setSidebarSort] = useState('name_asc');
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const isExpanded = isSidebarPinned;
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else if (tab === 'dashboard') setActiveTab('dashboard');
    else if (tab === 'database') setActiveTab('database');
    else if (tab === 'manage') setActiveTab('manage');
  }, [searchParams]);

  useEffect(() => {
    if (!selectedCust && customers.length > 0) {
      setSelectedCust(customers[0].id);
    }
  }, [customers, selectedCust]);

  const cust = customers.find((c) => c.id === selectedCust);

  const filteredSidebar = useMemo(() => {
    const list = customers.filter((c) => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch));
    
    // Calculate aggregate balance per customer for sorting
    const withBalances = list.map(c => {
      const entries = filterByStartDate(customerEntries, settings.startDate).filter(e => e.customerId === c.id);
      const bal = entries.reduce((s, e) => s + e.debit - e.credit, 0);
      return { ...c, balance: bal };
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
  }, [customers, custSearch, sidebarSort, customerEntries, settings.startDate]);

  const filteredManage = useMemo(() =>
    customers.filter((c) => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase()) || (c.phone && c.phone.includes(manageSearch))),
    [customers, manageSearch]
  );

  const filteredEntries = useMemo(() => {
    if (!selectedCust) return [];
    return filterByStartDate(customerEntries, settings.startDate)
      .filter((e) => e.customerId === selectedCust)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo = !toDate || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [customerEntries, settings.startDate, selectedCust, search, fromDate, toDate]);

  const withBalance = useMemo(() => {
    // 1. Calculate running balance chronologically (Date Ascending)
    const chronological = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const computed = chronological.map((e) => {
      bal += (e.debit || 0) - (e.credit || 0);
      return { ...e, balance: bal };
    });

    // 2. Apply user-selected sort
    return [...computed].sort((a, b) => {
      switch (entrySort) {
        case 'date_desc':    return b.date.localeCompare(a.date);
        case 'date_asc':     return a.date.localeCompare(b.date);
        case 'name_asc':     return (a.description || '—').localeCompare(b.description || '—');
        case 'name_desc':    return (b.description || '—').localeCompare(a.description || '—');
        case 'debit_desc':   return (b.debit || 0) - (a.debit || 0);
        case 'debit_asc':    return (a.debit || 0) - (b.debit || 0);
        case 'credit_desc':  return (b.credit || 0) - (a.credit || 0);
        case 'credit_asc':   return (a.credit || 0) - (b.credit || 0);
        case 'balance_desc': return b.balance - a.balance;
        case 'balance_asc':  return a.balance - b.balance;
        default:             return b.date.localeCompare(a.date);
      }
    });
  }, [filteredEntries, entrySort]);

  const paged = paginate(withBalance, page, perPage);

  const pageTotals = useMemo(() => ({
    debit: paged.reduce((s, e) => s + (e.debit || 0), 0),
    credit: paged.reduce((s, e) => s + (e.credit || 0), 0),
  }), [paged]);
  const totals = { debit: filteredEntries.reduce((s, e) => s + e.debit, 0), credit: filteredEntries.reduce((s, e) => s + e.credit, 0) };
  const balance = totals.debit - totals.credit;

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    // Strict Validation
    const cleanPhone = newPhone.replace(/\D/g, '');

    if (newPhone && cleanPhone.length !== 11) {
      toast('Mobile number must be exactly 11 digits', 'error');
      return;
    }

    const normalizedName = newName.trim().toLowerCase();
    const normalizedPhone = newPhone.trim();

    const exists = customers.find(c =>
      c.name.toLowerCase() === normalizedName &&
      (c.phone || '') === normalizedPhone
    );

    if (exists) {
      toast('A customer with this name and phone number already exists!', 'error');
      return;
    }

    addCustomer({ name: newName.trim(), phone: newPhone.trim() });
    setNewName(''); setNewPhone('');
    toast('Customer registered successfully', 'success');
    setActiveTab('dashboard');
  };

  const handleStartEdit = (cust: any) => {
    setEditingId(cust.id);
    setEditForm({ name: cust.name, phone: cust.phone || '' });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;

    // Strict Validation
    const cleanPhone = editForm.phone.replace(/\D/g, '');

    if (editForm.phone && cleanPhone.length !== 11) {
      toast('Mobile number must be exactly 11 digits', 'error');
      return;
    }

    const normalizedName = editForm.name.trim().toLowerCase();
    const normalizedPhone = editForm.phone.trim();

    const exists = customers.find(c =>
      c.id !== id &&
      c.name.toLowerCase() === normalizedName &&
      (c.phone || '') === normalizedPhone
    );

    if (exists) {
      toast('Another customer already has this name and phone number!', 'error');
      return;
    }

    updateCustomer(id, { name: editForm.name.trim(), phone: editForm.phone.trim() });
    setEditingId(null);
    toast('Customer details updated', 'success');
  };

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !form.date) { toast('Fill required fields', 'error'); return; }

    const payload = {
      customerId: selectedCust,
      date: form.date,
      description: form.description,
      debit: parseFloat(form.debit) || 0,
      credit: parseFloat(form.credit) || 0,
      balance: 0
    };

    setIsSaving(true);
    try {
      if (editingEntity) {
        await updateCustomerEntry(editingEntity.id, payload);
        toast('Entry updated', 'success');
        closeEntryForm();
      } else {
        await addCustomerEntry(payload);
        toast('Entry added', 'success');
        resetEntryFormForNext();
      }
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err?.message || err || 'Unknown database error';
      toast(`Failed to save: ${msg}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const resetEntryFormForNext = () => {
    setEditingEntity(null);
    setForm(prev => ({ ...prev, description: '', debit: '', credit: '' }));
  };

  const closeEntryForm = () => {
    setShowEntryForm(false);
    setEditingEntity(null);
    setForm({ date: today(), description: '', debit: '', credit: '' });
  };

  const handleEditEntry = (e: any) => {
    setEditingEntity(e);
    setForm({
      date: e.date,
      description: e.description || '',
      debit: e.debit ? e.debit.toString() : '',
      credit: e.credit ? e.credit.toString() : '',
    });
    setShowEntryForm(true);
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      {/* Native Mobile View Switcher */}
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
            New Acc
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={cn("segmented-item", activeTab === 'manage' ? "segmented-item-active" : "segmented-item-inactive")}
          >
            Settings
          </button>
        </div>

<<<<<<< Updated upstream
        {activeTab === 'database' && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
             <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 flex-shrink-0">
                <input 
                  type="date" 
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24" 
                  value={fromDate} 
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }} 
                />
                <span className="text-[10px] text-slate-300">→</span>
                <input 
                  type="date" 
                  className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24" 
                  value={toDate} 
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }} 
                />
             </div>
             { (fromDate || toDate) && (
                <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="flex-shrink-0 p-2 text-red-600"><X className="w-4 h-4" /></button>
             )}
=======
        {/* Customer selector for mobile — only visible on small screens in database tab */}
        {activeTab === 'database' && (
          <div className="md:hidden px-4 mt-4">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
              {customers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCust(c.id); setSearch(''); setPage(1); }}
                  className={cn(
                    "flex-shrink-0 px-4 py-2 rounded-xl text-[10px] items-start flex flex-col font-black uppercase tracking-widest transition-all",
                    selectedCust === c.id
                      ? "bg-pink-600 text-white shadow-lg shadow-pink-600/20"
                      : "bg-slate-100 dark:bg-dark-800 text-slate-500"
                  )}
                >
                  <span className="leading-none">{c.name}</span>
                  {c.phone && <span className={cn("text-[8px] mt-1 opacity-70 tracking-normal", selectedCust === c.id ? "text-pink-100" : "text-slate-400")}>{c.phone}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'database' && cust && (
          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setShowReport(true)}
              className="btn-secondary flex items-center gap-2 hover:bg-slate-200 transition-colors flex-1 md:flex-none justify-center"
            >
              <Printer className="w-4 h-4" /> Statement
            </button>
            <button onClick={() => setShowReport(true)} className="btn-secondary flex items-center gap-2 flex-1 md:flex-none justify-center">
              <Printer className="w-4 h-4" /> Reports
            </button>
            <button onClick={() => setShowEntryForm(true)} className="btn-primary !bg-pink-600 hover:!bg-pink-500 flex items-center gap-2 flex-1 md:flex-none justify-center">
              <Plus className="w-4 h-4" /> New Entry
            </button>
>>>>>>> Stashed changes
          </div>
        )}
      </div>

<<<<<<< Updated upstream
      <div className="flex-1 flex gap-0 md:gap-4 h-full w-full overflow-hidden">

=======
      <div className="flex-1 flex flex-col md:flex-row gap-4 h-full w-full overflow-hidden">
>>>>>>> Stashed changes
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-4 md:p-6 pb-10">
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(() => {
                const allFilteredEntries = filterByStartDate(customerEntries, settings.startDate)
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
                    <div className="glass p-4 rounded-3xl border-l-4 border-pink-500 shadow-lg bg-white dark:bg-dark-900 overflow-hidden col-span-2">
                      <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Total Net Balance (DR)</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                        ₨ {formatCurrency(Math.abs(globalNet))}
                        <span className="text-[10px] ml-1 font-bold text-slate-400 uppercase">{globalNet >= 0 ? 'DR' : 'CR'}</span>
                      </p>
                    </div>

                    <div className="glass p-4 rounded-3xl border-l-4 border-slate-400 shadow-lg bg-white dark:bg-dark-900 col-span-1">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clients</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                        {customers.length}
                      </p>
                    </div>
                    <div className="glass p-4 rounded-3xl border-l-4 border-emerald-500 shadow-lg bg-white dark:bg-dark-900 col-span-1">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Entries</p>
                      <p className="text-xl font-black text-slate-800 dark:text-white tabular-nums">
                        {allFilteredEntries.length}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 animate-in slide-in-from-top duration-500 delay-100">
              <div className="flex-1 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 max-w-md">
                  <SearchBar 
                    value={dashboardSearch} 
                    onChange={setDashboardSearch} 
                    placeholder="Search customers..." 
                    fullWidth={true}
                  />
                </div>
                <div className="relative group shrink-0">
                  <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-pink-600 transition-colors pointer-events-none" />
                <select
                  value={dashSort}
                  onChange={(e) => setDashSort(e.target.value)}
                  className="appearance-none pl-10 pr-10 py-2.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all cursor-pointer outline-none shadow-sm"
                >
                  <option value="name_asc">A to Z</option>
                  <option value="name_desc">Z to A</option>
                  <option value="balance_desc">Highest Balance</option>
                  <option value="balance_asc">Lowest Balance</option>
                  <option value="debit_desc">Highest Debit</option>
                  <option value="debit_asc">Lowest Debit</option>
                  <option value="credit_desc">Highest Credit</option>
                  <option value="credit_asc">Lowest Credit</option>
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

            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              <div className="space-y-3 mb-20">
                {(() => {
                  const dashboardItems = customers.map(c => {
                    const entries = filterByStartDate(customerEntries, settings.startDate)
                      .filter(e => e.customerId === c.id)
                      .filter(e => {
                        const matchesFrom = !fromDate || e.date >= fromDate;
                        const matchesTo = !toDate || e.date <= toDate;
                        return matchesFrom && matchesTo;
                      });
                    const dr = entries.reduce((sum, e) => sum + e.debit, 0);
                    const cr = entries.reduce((sum, e) => sum + e.credit, 0);
                    const bal = dr - cr;
                    return { ...c, balance: bal, entriesCount: entries.length };
                  });

                  const filtered = dashboardItems.filter(c => 
                    !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || (c.phone && c.phone.includes(dashboardSearch))
                  );

                  const sorted = [...filtered].sort((a, b) => {
                    switch (dashSort) {
                      case 'name_asc':    return a.name.localeCompare(b.name);
                      case 'name_desc':   return b.name.localeCompare(a.name);
                      case 'balance_desc':return b.balance - a.balance;
                      case 'balance_asc': return a.balance - b.balance;
                      default:            return 0;
                    }
                  });

                  return sorted.map(c => (
                    <div 
                      key={c.id}
                      onClick={() => { setSelectedCust(c.id); setActiveTab('database'); }}
                      className="glass p-4 rounded-2xl flex items-center justify-between group active:scale-[0.98] transition-all border-l-4 border-l-pink-500 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center">
                          <User className="w-5 h-5 text-pink-600" />
                        </div>
                        <div>
                          <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.name}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{c.phone || 'No Phone'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn("text-lg font-black tabular-nums leading-none", c.balance >= 0 ? "text-pink-600" : "text-emerald-600")}>₨ {formatCurrency(Math.abs(c.balance))} <span className="text-[9px]">{c.balance >= 0 ? 'DR' : 'CR'}</span></p>
                        <ArrowRight className="w-4 h-4 text-slate-300 ml-auto mt-1" />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            {customers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-dark-800/30 rounded-3xl border-2 border-dashed border-slate-200 dark:border-dark-700/50">
                <Users className="w-16 h-16 text-slate-300 mb-4" />
                <p className="text-slate-500 font-black uppercase tracking-widest text-sm">No Customers Registered</p>
                <button onClick={() => setActiveTab('register')} className="mt-4 text-xs font-black text-pink-600 uppercase tracking-widest hover:underline">Register your first customer →</button>
              </div>
            )}
          </div>
        ) : activeTab === 'database' ? (
<<<<<<< Updated upstream
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-dark-950/20 p-4 pb-20">
            {/* Account Pill Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 pb-2">
               {customers.map(c => (
                 <button
                   key={c.id}
                   onClick={() => { setSelectedCust(c.id); setPage(1); }}
                   className={cn(
                     "flex-shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                     selectedCust === c.id 
                       ? "bg-pink-600 text-white shadow-lg shadow-pink-500/20" 
                       : "bg-white dark:bg-dark-900 text-slate-500 border border-slate-200 dark:border-dark-800"
                   )}
                 >
                   {c.name}
                 </button>
               ))}
=======
          <div className="flex-1 flex gap-4 h-full w-full min-h-0 overflow-hidden p-4">
            {/* Sidebar List */}
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
                  <h2 className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-[0.2em] animate-in fade-in slide-in-from-left-2">Customers</h2>
                )}
                <button 
                  onClick={() => setIsSidebarPinned(!isSidebarPinned)}
                  className={cn(
                    "p-1.5 rounded-lg transition-colors ml-auto",
                    isSidebarPinned ? "text-pink-600 bg-pink-50 dark:bg-pink-900/20" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-dark-800"
                  )}
                  title={isSidebarPinned ? "Unpin Sidebar" : "Pin Sidebar"}
                >
                  {isSidebarPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="p-2 space-y-2 border-b border-slate-100 dark:border-dark-700/30 bg-slate-50/30">
                {isExpanded ? (
                  <div className="space-y-2 animate-in fade-in duration-300">
                    <SearchBar value={custSearch} onChange={setCustSearch} placeholder="Search names..." fullWidth={true} className="!py-1.5 !text-[11px]" />
                    <div className="relative group">
                      <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-pink-600 transition-colors pointer-events-none" />
                      <select
                        value={sidebarSort}
                        onChange={(e) => setSidebarSort(e.target.value)}
                        className="w-full appearance-none pl-7 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-200 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all cursor-pointer outline-none"
                      >
                        <option value="name_asc">A to Z</option>
                        <option value="name_desc">Z to A</option>
                        <option value="balance_desc">High Balance</option>
                        <option value="balance_asc">Low Balance</option>
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
                  isExpanded && <div className="p-8 text-center text-xs text-slate-400 italic">No customers found</div>
                ) : (
                  filteredSidebar.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCust(c.id); setSearch(''); setPage(1); }}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 border border-transparent',
                        selectedCust === c.id
                          ? 'bg-pink-600 text-white shadow-lg scale-105' 
                          : 'text-slate-600 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-800'
                      )}
                      title={!isExpanded ? c.name : ''}
                    >
                      <User className={cn("w-4 h-4 flex-shrink-0", selectedCust === c.id ? "text-white" : "text-pink-600")} />
                      {isExpanded && (
                        <div className="flex flex-col min-w-0 animate-in fade-in slide-in-from-left-2">
                          <p className="truncate text-xs font-black uppercase tracking-widest">{c.name}</p>
                          {c.phone && <p className={cn("text-[9px] font-bold truncate mt-0.5", selectedCust === c.id ? "text-pink-100" : "text-slate-500")}>{c.phone}</p>}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
>>>>>>> Stashed changes
            </div>

            <div className="mb-4">
              <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." fullWidth />
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar smart-scroll">
              <div className="space-y-3">
                {paged.map((e) => (
                  <MobileActivityCard
                    key={e.id}
                    title={e.description || 'Customer Transaction'}
                    subtitle={formatDate(e.date)}
                    amount={e.debit > 0 ? `₨ ${formatCurrency(e.debit)}` : `₨ ${formatCurrency(e.credit)}`}
                    date={cust?.name || ''}
                    icon={e.debit > 0 ? Plus : X}
                    iconColor={e.debit > 0 ? "text-pink-600" : "text-emerald-500"}
                    onClick={() => setViewingEntity(e)}
                  />
                ))}
                {paged.length === 0 && (
                  <div className="py-20 text-center">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No transactions found</p>
                  </div>
<<<<<<< Updated upstream
                )}
              </div>
              <div className="mt-4">
                <Pagination page={page} total={withBalance.length} perPage={perPage} onChange={setPage} />
              </div>
=======

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 flex-1 flex flex-col mb-0">
                    <div className="flex flex-col gap-3 w-full">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 min-w-0 flex items-center gap-3">
                          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." />
                          
                          <div className="relative group shrink-0">
                            <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 transition-colors pointer-events-none" />
                            <select
                              value={entrySort}
                              onChange={(e) => setEntrySort(e.target.value)}
                              className="appearance-none pl-9 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-pink-600/20 focus:border-pink-600 transition-all cursor-pointer outline-none shadow-sm"
                            >
                              <option value="date_desc">Newest First</option>
                              <option value="date_asc">Oldest First</option>
                              <option value="name_asc">A to Z (Desc)</option>
                              <option value="name_desc">Z to A (Desc)</option>
                              <option value="debit_desc">Highest Debit</option>
                              <option value="debit_asc">Lowest Debit</option>
                              <option value="credit_desc">Highest Credit</option>
                              <option value="credit_asc">Lowest Credit</option>
                              <option value="balance_desc">Highest Balance</option>
                              <option value="balance_asc">Lowest Balance</option>
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                            </div>
                          </div>
                        </div>
                        { (fromDate || toDate) && (
                          <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="md:hidden px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 self-end">Clear Filters</button>
                        )}
                      </div>

                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className="flex items-center overflow-x-auto no-scrollbar">
                          <div className="flex items-center bg-slate-100 dark:bg-dark-800 p-1 rounded-xl border border-slate-200 dark:border-dark-700/50 shrink-0">
                            <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all whitespace-nowrap">Today</button>
                            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50 whitespace-nowrap">This Month</button>
                            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-dark-400 hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50 whitespace-nowrap">This Year</button>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <div className="flex-1 md:flex-none flex items-center gap-1 bg-slate-50 dark:bg-dark-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">From</span>
                            <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-300 outline-none flex-1 min-w-0 md:w-32" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                          </div>
                          <div className="flex-1 md:flex-none flex items-center gap-1 bg-slate-50 dark:bg-dark-800 px-2 py-1.5 rounded-xl border border-slate-200 dark:border-dark-700/50">
                            <span className="text-[9px] font-black text-slate-400 uppercase shrink-0">To</span>
                            <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-300 outline-none flex-1 min-w-0 md:w-32" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                          </div>
                          {(fromDate || toDate) && (
                            <div className="flex gap-2">
                              <button onClick={() => setShowReport(true)} className="hidden md:flex px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-slate-600 bg-slate-50 dark:bg-dark-900/20 rounded-lg border border-slate-200 dark:border-dark-700/50 flex items-center gap-2 whitespace-nowrap">
                                <Printer className="w-3 h-3" /> Reports
                              </button>
                              <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="hidden md:flex px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30 whitespace-nowrap">Clear</button>
                              <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="md:hidden px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">Clear</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto smart-scroll">
                      <table className="w-full table-fixed">
                        <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                          <tr className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-dark-400">
                            <th className="px-3 py-3 text-left w-[90px]">Date</th>
                            <th className="px-3 py-3 text-left">Description</th>
                            <th className="px-3 py-3 text-right w-[80px] md:w-[120px]">Debit</th>
                            <th className="px-3 py-3 text-right w-[80px] md:w-[120px]">Credit</th>
                            <th className="px-3 py-3 text-right w-[100px] md:w-[140px] hidden sm:table-cell">Balance</th>
                            <th className="px-3 py-3 text-center w-[124px]">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                          {paged.length === 0 ? (
                            <tr><td colSpan={6} className="px-3 py-12 text-center text-[11px] text-slate-400 italic">No transactions found</td></tr>
                          ) : paged.map((e) => (
                            <tr key={e.id} className="group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[10px]">
                              <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 dark:text-dark-400 tabular-nums font-bold leading-none">{formatDate(e.date)}</td>
                              <td className="px-3 py-2.5 text-black dark:text-white font-medium truncate whitespace-nowrap leading-none">{e.description || '—'}</td>
                              <td className="px-3 py-2.5 text-right font-black text-red-600 tabular-nums">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                              <td className="px-3 py-2.5 text-right font-black text-emerald-600 tabular-nums">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                              <td className="px-3 py-2.5 text-right font-black tabular-nums hidden sm:table-cell">₨ {formatCurrency(e.balance)}</td>
                              <td className="px-3 py-2.5 text-center">
                                <div className="flex items-center justify-center gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setViewingEntity(e)}
                                    className="p-1 text-pink-500 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded transition-colors"
                                    title="Quick Print"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => setViewingEntity(e)} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded transition-colors" title="View"><Eye className="w-3.5 h-3.5" /></button>
                                  {currentUser?.role === 'Admin' && (
                                    <>
                                      <button onClick={() => handleEditEntry(e)} className="p-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded transition-colors" title="Edit Entry">
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={() => { if (confirm('Delete entry?')) { deleteCustomerEntry(e.id); toast('Entry deleted', 'warning'); } }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete Entry">
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-300 dark:border-dark-700">
                          <tr className="bg-slate-100/80 dark:bg-dark-800/50">
                            <td colSpan={2} className="px-3 py-2 text-right"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Page Total</span></td>
                            <td className="px-3 py-2 text-right tabular-nums text-[10px] font-bold text-red-600">₨ {formatCurrency(pageTotals.debit)}</td>
                            <td className="px-3 py-2 text-right tabular-nums text-[10px] font-bold text-emerald-600">₨ {formatCurrency(pageTotals.credit)}</td>
                            <td className="hidden sm:table-cell"></td>
                            <td></td>
                          </tr>
                          <tr className="bg-slate-200 dark:bg-dark-800 font-black text-black">
                            <td colSpan={2} className="px-3 py-2.5 text-right"><span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">Grand Total</span></td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-xs font-black text-red-600">₨ {formatCurrency(totals.debit)}</td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-xs font-black text-emerald-600">₨ {formatCurrency(totals.credit)}</td>
                            <td className="hidden sm:table-cell pl-4 border-l border-slate-300 dark:border-dark-700">
                              <span className={cn("text-sm font-black", (totals.debit - totals.credit) >= 0 ? "text-pink-600" : "text-emerald-600")}>
                                ₨ {formatCurrency(Math.abs(totals.debit - totals.credit))}
                                <span className="text-[9px] ml-1 uppercase">{ (totals.debit - totals.credit) >= 0 ? 'DR' : 'CR'}</span>
                              </span>
                            </td>
                            <td></td>
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
                  <Users className="w-16 h-16 mb-4" />
                  <p className="font-medium font-bold">Select a customer to view statement</p>
                </div>
              )}
>>>>>>> Stashed changes
            </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="flex-1 animate-in zoom-in-95 duration-300">
            <div className="max-w-2xl mx-auto glass p-8 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-primary-600/10 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-primary-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Customer Registration</h2>
                  <p className="text-sm text-slate-500 font-medium">Add a new account to your business database</p>
                </div>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">Full Name *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        className="input !pl-12 !py-4 !text-sm !font-bold font-urdu"
                        placeholder="e.g. Malik Muhammad Abbass"
                        dir="auto"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label text-[10px] font-black uppercase tracking-widest text-primary-600 mb-2 block">Mobile Number (11 Digits)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        className="input !pl-12 !py-4 !text-sm !font-bold"
                        placeholder="03XXXXXXXXX"
                        value={newPhone}
                        maxLength={11}
                        onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/50 dark:bg-dark-900/50 p-6 rounded-2xl border border-slate-200 dark:border-dark-700/50 shadow-sm">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  className="input !pl-10 !py-3 !text-sm !font-bold"
                  placeholder="Quick search by name or phone..."
                  value={manageSearch}
                  onChange={e => setManageSearch(e.target.value)}
                />
              </div>
              <div className="px-6 py-3 bg-slate-100 dark:bg-dark-800 rounded-2xl text-xs font-black text-slate-500 uppercase tracking-widest border border-slate-200 dark:border-dark-700/50">
                {customers.length} Accounts Found
              </div>
            </div>

            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl flex-1 flex flex-col">
              <div className="overflow-auto smart-scroll">
                <table className="w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                    <th className="table-cell text-left">Client Name (Urdu Support)</th>
                    <th className="table-cell text-left">Contact</th>
                    <th className="table-cell text-center">Actions</th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                    {filteredManage.length === 0 ? (
                      <tr><td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic font-medium">No customers found in database</td></tr>
                    ) : filteredManage.map((c) => (
                      <tr
                        key={c.id}
                        className="table-row text-[11px] hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all group cursor-pointer"
                        onClick={() => handleStartEdit(c)}
                      >
                        {editingId === c.id ? (
                          <>
                            <td className="px-6 py-3" colSpan={2} onClick={(e) => e.stopPropagation()}>
                              <div className="flex gap-4">
                                <input className="input !py-1.5 !text-sm flex-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus dir="auto" />
                                <input className="input !py-1.5 !text-sm flex-1" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value.replace(/\D/g, '').slice(0, 11) })} placeholder="Mobile (11 Digits)" maxLength={11} />
                              </div>
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
                                <span className="font-bold text-slate-800 dark:text-white font-urdu">{c.name}</span>
                              </div>
                            </td>
                            <td className="table-cell">
                              <span className="text-[11px] font-medium text-slate-500 font-mono tracking-tighter">{c.phone || '—'}</span>
                            </td>
                            <td className="table-cell text-right">
                              <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleStartEdit(c); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                {currentUser?.role === 'Admin' && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete customer and all history?')) deleteCustomer(c.id); }}
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
          title={editingEntity ? `Edit ${cust?.name}` : `Add Entry — ${cust?.name}`} 
          onClose={closeEntryForm} 
          variant="bottom-sheet"
        >
          <form onSubmit={handleSubmitEntry} className="flex flex-col h-full bg-slate-50 dark:bg-dark-950/20 -m-6 p-6">
            <div className="flex-1 space-y-4 mb-20 overflow-y-auto smart-scroll">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Transaction Date</label>
                <input type="date" className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-dark-500 px-1">Description</label>
                <input className="input w-full !h-12 !bg-white dark:!bg-dark-800" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Sales Invoice #123" dir="auto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-pink-600 px-1">Debit (Sale)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-pink-600" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} placeholder="0.00" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 px-1">Credit (Rec)</label>
                  <input type="number" step="any" className="input w-full !h-12 !bg-white dark:!bg-dark-800 !text-emerald-600" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="0.00" />
                </div>
              </div>

              <div className="bg-pink-600/5 dark:bg-pink-600/10 p-5 rounded-3xl border border-pink-600/10 text-center">
                 <p className="text-[10px] font-black text-pink-600 uppercase tracking-widest mb-1">Impact On Balance</p>
                 <p className={cn("text-xl font-black tabular-nums", (Number(form.debit)||0) - (Number(form.credit)||0) >= 0 ? "text-slate-900 dark:text-white" : "text-emerald-600")}>
                   ₨ {formatCurrency(Math.abs((Number(form.debit)||0) - (Number(form.credit)||0)))}
                   <span className="text-[10px] ml-1 uppercase">{(Number(form.debit)||0) - (Number(form.credit)||0) >= 0 ? 'Increase' : 'Decrease'}</span>
                 </p>
              </div>
            </div>

            <div className="sticky-bottom-actions">
              <button type="button" onClick={closeEntryForm} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-dark-500" disabled={isSaving}>Cancel</button>
              <button 
                type="submit" 
                className="flex-[2] py-4 bg-pink-600 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-2" 
                disabled={isSaving}
              >
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                {editingEntity ? 'Update' : 'Confirm Entry'}
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
            if (!selectedCust && customers.length > 0) setSelectedCust(customers[0].id);
            if (customers.length === 0) {
              setActiveTab('register');
              toast('Please register a customer first', 'info');
            } else {
              setShowEntryForm(true);
            }
          }} 
          label="NEW"
        />
      ) : null}

      {viewingEntity && (
        <TransactionReceiptModal
          entity={{ ...viewingEntity, amount: (viewingEntity.debit || viewingEntity.credit) }}
          type="customer"
          title={`Customer Receipt — ${cust?.name}`}
          onClose={() => setViewingEntity(null)}
        />
      )}

      {showReport && (
        <PrintReportModal
          data={withBalance}
          type="customer"
          title={`Account Statement — ${cust?.name}`}
          customerPhone={cust?.phone}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
