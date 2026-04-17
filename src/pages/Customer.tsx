import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Trash2, Users, UserPlus, Printer, Search, Phone, Edit2, Check, X, UserCog, User, BarChart3, ArrowRight, ArrowUpDown, Save, Shield } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn, startOfMonth, startOfYear } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import PrintReportModal from '../components/modals/PrintReportModal';

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
    <div className="animate-fade-in space-y-4 flex flex-col h-full overflow-hidden">
      {/* Parallel Horizontal Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'dashboard'
                ? "bg-white dark:bg-dark-900 text-pink-600 shadow-sm shadow-pink-600/10"
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
                ? "bg-white dark:bg-dark-900 text-pink-600 shadow-sm shadow-pink-600/10"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <Users className="w-4 h-4" /> Customer Database
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex-1 md:flex-none justify-center",
              activeTab === 'register'
                ? "bg-white dark:bg-dark-900 text-primary-600 shadow-sm shadow-primary-600/10"
                : "text-slate-500 hover:text-slate-800 dark:hover:text-white"
            )}
          >
            <UserPlus className="w-4 h-4" /> Register Customer
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
            <UserCog className="w-4 h-4" /> Manage Accounts
          </button>
        </div>
        {activeTab === 'database' && cust && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowReport(true)}
              className="btn-secondary flex items-center gap-2 hover:bg-slate-200 transition-colors"
            >
              <Printer className="w-4 h-4" /> Statement
            </button>
            <button onClick={() => setShowReport(true)} className="btn-secondary flex items-center gap-2">
              <Printer className="w-4 h-4" /> Reports
            </button>
            <button onClick={() => setShowEntryForm(true)} className="btn-primary !bg-pink-600 hover:!bg-pink-500 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 h-full overflow-hidden">
        {activeTab === 'dashboard' ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Global Summary Cards */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in slide-in-from-top duration-500">
                  <div className="glass p-5 rounded-3xl border-l-8 border-pink-500 shadow-lg bg-white dark:bg-dark-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-pink-600/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-pink-600/10 transition-colors" />
                    <p className="text-[9px] font-black text-pink-600 uppercase tracking-widest mb-1">Total Receivable (Debits)</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                      ₨ {formatCurrency(globalDebit)}
                    </p>
                  </div>

                  <div className="glass p-5 rounded-3xl border-l-8 border-emerald-500 shadow-lg bg-white dark:bg-dark-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-600/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-emerald-600/10 transition-colors" />
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Total Payable (Credits)</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                      ₨ {formatCurrency(globalCredit)}
                    </p>
                  </div>

                  <div className="glass p-5 rounded-3xl border-l-8 border-primary-500 shadow-lg bg-white dark:bg-dark-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-primary-600/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-primary-600/10 transition-colors" />
                    <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest mb-1">Net Cash Balance</p>
                    <div className="flex items-center gap-2">
                       <p className={cn("text-2xl font-black tabular-nums font-mono tracking-tighter", globalNet >= 0 ? "text-pink-600" : "text-emerald-600")}>
                        ₨ {formatCurrency(Math.abs(globalNet))}
                      </p>
                      <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded border", globalNet >= 0 ? "bg-pink-50 text-pink-600 border-pink-200" : "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                        {globalNet >= 0 ? 'DR' : 'CR'}
                      </span>
                    </div>
                  </div>

                  <div className="glass p-5 rounded-3xl border-l-8 border-slate-400 shadow-lg bg-white dark:bg-dark-900 overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-slate-600/5 rounded-bl-full -mr-10 -mt-10 group-hover:bg-slate-600/10 transition-colors" />
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clients & Transactions</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">
                      {customers.length} <span className="text-xs text-slate-400">Cust.</span> / {allFilteredEntries.length} <span className="text-xs text-slate-400">Trx.</span>
                    </p>
                  </div>
                </div>
              );
            })()}

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

            <div className="flex-1 glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-sm flex flex-col animate-in slide-in-from-bottom duration-500 delay-200">
              <div className="overflow-y-auto smart-scroll flex-1">
                <table className="w-full border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header text-[10px]">
                      <th className="table-cell text-left">Client Name / Contact</th>
                      <th className="table-cell text-right">Pending Balance</th>
                      <th className="table-cell text-center">Entries</th>
                      <th className="table-cell w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50 bg-white/50 dark:bg-dark-900/50">
                    {(() => {
                      // 1. Calculate totals for ALL customers first to allow sorting
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
                        return { 
                          ...c, 
                          totalDebit: dr, 
                          totalCredit: cr, 
                          balance: bal, 
                          entriesCount: entries.length 
                        };
                      });

                      // 2. Filter by search
                      const filtered = dashboardItems.filter(c => 
                        !dashboardSearch || 
                        c.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || 
                        (c.phone && c.phone.includes(dashboardSearch))
                      );

                      // 3. Apply Live Sorting
                      const sorted = [...filtered].sort((a, b) => {
                        switch (dashSort) {
                          case 'name_asc':    return a.name.localeCompare(b.name);
                          case 'name_desc':   return b.name.localeCompare(a.name);
                          case 'debit_desc':  return b.totalDebit - a.totalDebit;
                          case 'debit_asc':   return a.totalDebit - b.totalDebit;
                          case 'credit_desc': return b.totalCredit - a.totalCredit;
                          case 'credit_asc':  return a.totalCredit - b.totalCredit;
                          case 'balance_desc':return b.balance - a.balance;
                          case 'balance_asc': return a.balance - b.balance;
                          default:            return 0;
                        }
                      });
                      
                      let grandSum = 0;
                      let grandCount = 0;

                      return (
                        <>
                          {paginate(sorted, dashPage, perPage).map(c => {
                            grandSum += c.balance;
                            grandCount += c.entriesCount;

                            return (
                              <tr 
                                key={c.id}
                                onClick={() => { setSelectedCust(c.id); setActiveTab('database'); }}
                                className="table-row hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-all cursor-pointer group text-[11px]"
                              >
                                <td className="table-cell">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-md bg-pink-600/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <User className="w-3 h-3 text-pink-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-700 dark:text-slate-200 leading-none">{c.name}</span>
                                      {c.phone && <span className="text-[9px] text-slate-400 font-bold">{c.phone}</span>}
                                    </div>
                                  </div>
                                </td>
                                <td className="table-cell text-right">
                                  <span className={cn("text-sm font-black tabular-nums", c.balance >= 0 ? "text-pink-600" : "text-emerald-600")}>
                                    ₨ {formatCurrency(Math.abs(c.balance))}
                                    <span className="text-[9px] ml-1 font-bold uppercase tracking-tighter">{c.balance >= 0 ? 'DR' : 'CR'}</span>
                                  </span>
                                </td>
                                <td className="table-cell text-center">
                                  <span className="font-bold text-slate-500 uppercase tracking-widest">{c.entriesCount} Entries</span>
                                </td>
                                <td className="table-cell text-right">
                                  <div className="w-6 h-6 rounded-md bg-slate-100 dark:bg-dark-800 flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition-all float-right">
                                    <ArrowRight className="w-3 h-3" />
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                          
                          {sorted.length > 0 && (
                            <tr className="font-black text-black dark:text-white bg-slate-100 dark:bg-dark-800 border-t-[3px] border-slate-300 dark:border-dark-700 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                              <td className="table-cell text-left text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black">Totals for visible accounts</td>
                              <td className={cn("table-cell text-right text-sm tabular-nums font-black", grandSum >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                                ₨ {formatCurrency(Math.abs(grandSum))}
                                <span className="text-[10px] ml-1 uppercase text-slate-400">{grandSum >= 0 ? 'DR' : 'CR'}</span>
                              </td>
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
                const f = customers.filter(c => !dashboardSearch || c.name.toLowerCase().includes(dashboardSearch.toLowerCase()) || (c.phone && c.phone.includes(dashboardSearch)));
                return f.length > 0 ? <Pagination page={dashPage} total={f.length} perPage={perPage} onChange={setDashPage} onPerPageChange={(v) => { setPerPage(v); setDashPage(1); setPage(1); }} /> : null;
              })()}
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
          <>
            {/* Sidebar List */}
            <div className="w-64 flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-3 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between">
                <p className="text-[10px] font-extrabold text-slate-600 dark:text-dark-200 uppercase tracking-widest">Active Database</p>
                <span className="text-[10px] font-bold text-slate-300">{filteredSidebar.length}</span>
              </div>
              <div className="p-2 space-y-2 border-b border-slate-100 dark:border-dark-700/30 bg-slate-50/30">
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
              <div className="smart-scroll flex-1 p-2 space-y-1">
                {filteredSidebar.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 italic">No customers found</div>
                ) : (
                  filteredSidebar.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => { setSelectedCust(c.id); setSearch(''); setPage(1); }}
                      className={cn(
                        'group flex items-center justify-between px-3 py-3 rounded-xl cursor-pointer text-xs font-black transition-all duration-200 border border-transparent',
                        selectedCust === c.id
                          ? 'bg-pink-600/10 text-pink-600 border-pink-600/10 shadow-sm relative overflow-hidden'
                          : 'text-slate-600 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                      )}
                    >
                      {selectedCust === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-pink-600 rounded-r-full"></span>}
                      <div className="flex flex-col min-w-0">
                        <p className="truncate text-slate-900 dark:text-white">{c.name}</p>
                        {c.phone && <p className="text-[9px] text-slate-500 dark:text-dark-400 font-bold truncate mt-0.5">{c.phone}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Main Content (Database View) */}
            <div className="flex-1 min-w-0 flex flex-col h-full pr-1">
              {cust ? (
                <>
                  <div className="flex items-center justify-between mb-5 animate-in slide-in-from-bottom duration-350">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-pink-600/10 dark:bg-pink-600/20 flex items-center justify-center">
                        <User className="w-8 h-8 text-pink-600 dark:text-pink-400" />
                      </div>
                      <div>
                        <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                          {cust.name}
                          {cust.phone && <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-dark-800 px-3 py-1 rounded-xl tracking-normal">{cust.phone}</span>}
                        </h1>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-bottom duration-350">
                    <div className="glass p-5 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Debit (Sales)</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(totals.debit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Credit (Received)</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums break-words break-all whitespace-normal leading-tight w-full">₨ {formatCurrency(totals.credit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-pink-600 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Pending Balance</p>
                      <p className={cn("text-2xl font-black tabular-nums break-words break-all whitespace-normal leading-tight w-full", balance >= 0 ? "text-pink-600" : "text-emerald-600")}>
                        ₨ {formatCurrency(Math.abs(balance))} {balance >= 0 ? '(Dr)' : '(Cr)'}
                      </p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50 flex-1 flex flex-col">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
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
                          <>
                            <button onClick={() => setShowReport(true)} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-slate-600 bg-slate-50 dark:bg-dark-900/20 rounded-lg hover:bg-slate-100 transition-all border border-slate-200 dark:border-dark-700/50 flex items-center gap-2">
                              <Printer className="w-3 h-3" /> Reports
                            </button>
                            <button onClick={() => { setFromDate(''); setToDate(''); setPage(1); }} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30">Clear</button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 overflow-auto smart-scroll">
                      <table className="table-excel">
                        <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                          <tr className="table-header">
                            <th className="px-4 py-3 text-left w-24">Date</th>
                            <th className="px-4 py-3 text-left w-[30rem]">Description</th>
                            <th className="px-4 py-3 text-right w-36">Debit</th>
                            <th className="px-4 py-3 text-right w-36">Credit</th>
                            <th className="px-4 py-3 text-right w-44">Balance</th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.length === 0 ? (
                            <tr><td colSpan={6} className="text-center text-slate-400 py-12 italic">No transactions found</td></tr>
                          ) : paged.map((e) => (
                            <tr key={e.id} className="group">
                              <td className="whitespace-nowrap text-[11px] font-medium uppercase tracking-tighter text-slate-500 dark:text-dark-400">{formatDate(e.date)}</td>
                              <td className="text-black dark:text-white font-medium text-[13px] whitespace-normal break-words max-w-[15rem] leading-5 truncate">{e.description || '—'}</td>
                              <td className="amount !text-red-600 dark:!text-red-400 whitespace-nowrap tabular-nums">₨{e.debit ? formatCurrency(e.debit) : '—'}</td>
                              <td className="amount !text-emerald-600 dark:!text-emerald-500 whitespace-nowrap tabular-nums">₨{e.credit ? formatCurrency(e.credit) : '—'}</td>
                              <td className="amount !text-black dark:!text-white !text-sm whitespace-nowrap tabular-nums">₨{formatCurrency(e.balance)}</td>
                              <td className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setViewingEntity(e)}
                                    className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-900/20 border border-pink-200/50 dark:border-pink-800/30 rounded hover:bg-pink-100 dark:hover:bg-pink-800/40 transition-all font-serif"
                                    title="Quick Print Invoice"
                                  >
                                    <Printer className="w-3 h-3" />
                                    <span>PRINT</span>
                                  </button>
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
                        <tfoot className="border-t-[3px] border-slate-300 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50 font-black text-black">
                          <tr className="bg-slate-200 dark:bg-dark-800">
                            <td colSpan={2} className="px-4 py-3 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-slate-500 uppercase tracking-tighter leading-none">Page Total</span>
                                <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter mt-1">Grand Total</span>
                              </div>
                            </td>
                             <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                               <div className="flex flex-col items-end">
                                 <span className="text-sm font-black text-slate-500 leading-none">₨ {formatCurrency(pageTotals.debit)}</span>
                                 <span className="text-sm font-black text-slate-800 dark:text-white mt-1">₨ {formatCurrency(totals.debit)}</span>
                               </div>
                             </td>
                             <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                               <div className="flex flex-col items-end">
                                 <span className="text-sm font-black text-slate-500 leading-none">₨ {formatCurrency(pageTotals.credit)}</span>
                                 <span className="text-sm font-black text-emerald-600 mt-1">₨ {formatCurrency(totals.credit)}</span>
                               </div>
                             </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <div className="flex flex-col items-end border-l border-slate-300 dark:border-dark-700 pl-4">
                                <span className="text-lg font-black text-pink-600/70 leading-none">₨ {formatCurrency(pageTotals.debit - pageTotals.credit)}</span>
                                <span className="text-lg font-black text-pink-600 mt-1">₨ {formatCurrency(totals.debit - totals.credit)}</span>
                              </div>
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
            </div>
          </>
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
                        className="input !pl-12 !py-4 !text-lg !font-bold"
                        placeholder="e.g. Malik Muhammad Abbass"
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
                        className="input !pl-12 !py-4 !text-lg !font-bold"
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
                  className="input !pl-10 !py-3 !text-lg !font-bold"
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
                    <th className="table-cell text-left">Client Name</th>
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
                                <input className="input !py-1.5 !text-sm flex-1" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus />
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
                                <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
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
          title={editingEntity ? `Edit Entry — ${cust?.name}` : `Add Entry — ${cust?.name}`} 
          onClose={closeEntryForm}
          isDesktop
          icon={User}
        >
          <form onSubmit={handleSubmitEntry} className="flex flex-col gap-1">
            <div className="bg-slate-50 dark:bg-dark-800/50 rounded-2xl p-4 mb-4 border border-slate-200 dark:border-dark-700/50">
              <div className="desktop-form-row">
                <label className="desktop-form-label">Date *</label>
                <div className="desktop-form-field">
                  <input type="date" className="input !py-1.5" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                </div>
              </div>
              <div className="desktop-form-row">
                <label className="desktop-form-label">Description</label>
                <div className="desktop-form-field">
                  <input className="input !py-1.5" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" />
                </div>
              </div>
            </div>

            <div className="px-2 space-y-1">
              <div className="desktop-form-row">
                <label className="desktop-form-label text-emerald-600 dark:text-emerald-400">Debit (₨)</label>
                <div className="desktop-form-field">
                  <input type="number" step="0.01" className="input !py-1.5 !bg-emerald-50/30 dark:!bg-emerald-900/10 focus:ring-emerald-500/20" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="desktop-form-row !border-b-0">
                <label className="desktop-form-label text-red-600 dark:text-red-400">Credit (₨)</label>
                <div className="desktop-form-field">
                  <input type="number" step="0.01" className="input !py-1.5 !bg-red-50/30 dark:!bg-red-900/10 focus:ring-red-500/20" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} placeholder="0.00" />
                </div>
              </div>
            </div>

            <div className="desktop-form-footer">
              <div className="desktop-summary-strip flex-1 mr-4">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Current Balance Change</span>
                  <span className={`text-xl font-black font-mono tracking-tighter ${ (Number(form.debit)||0) >= (Number(form.credit)||0) ? 'text-emerald-600 dark:text-emerald-500' : 'text-red-600 dark:text-red-500'}`}>
                    ₨ {formatCurrency((Number(form.debit)||0) - (Number(form.credit)||0))}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={closeEntryForm} className="btn-secondary !py-2 !px-4" disabled={isSaving}>Cancel</button>
                <button type="submit" className="btn-primary-emerald !py-2 !px-6" disabled={isSaving}>
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
