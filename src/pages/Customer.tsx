import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Users, UserPlus, Printer, Search, Phone, Edit2, Check, X, UserCog, User } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

// const PER_PAGE = 40; // Replaced by state

export default function CustomerPage() {
  const { 
    customers, customerEntries, 
    addCustomerEntry, deleteCustomerEntry, addCustomer, updateCustomer, deleteCustomer, settings, currentUser 
  } = useStore();
  const { toast } = useToast();

  // Layout State
  const [activeTab, setActiveTab] = useState<'database' | 'register' | 'manage'>('database');
  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  
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
  const [perPage, setPerPage] = useState(40);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  
  useEffect(() => {
    if (!selectedCust && customers.length > 0) {
      setSelectedCust(customers[0].id);
    }
  }, [customers, selectedCust]);

  const cust = customers.find((c) => c.id === selectedCust);

  const filteredSidebar = useMemo(() =>
    customers.filter((c) => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)),
    [customers, custSearch]
  );

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
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      });
  }, [customerEntries, settings.startDate, selectedCust, search, fromDate, toDate]);

  const withBalance = useMemo(() => {
    const sorted = [...filteredEntries].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [filteredEntries]);

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
    addCustomer({ name: newName.trim(), phone: newPhone.trim() });
    setNewName(''); setNewPhone('');
    toast('Customer registered successfully', 'success');
    setActiveTab('database');
  };

  const handleStartEdit = (cust: any) => {
    setEditingId(cust.id);
    setEditForm({ name: cust.name, phone: cust.phone || '' });
  };

  const handleSaveEdit = (id: string) => {
    if (!editForm.name.trim()) return;
    updateCustomer(id, { name: editForm.name.trim(), phone: editForm.phone.trim() });
    setEditingId(null);
    toast('Customer details updated', 'success');
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !form.date) { toast('Fill required fields', 'error'); return; }
    addCustomerEntry({ customerId: selectedCust, date: form.date, description: form.description, debit: parseFloat(form.debit) || 0, credit: parseFloat(form.credit) || 0, balance: 0 });
    toast('Entry added', 'success'); 
    setForm(prev => ({ ...prev, description: '', debit: '', credit: '' }));
  };

  const handlePrint = () => {
    if (!cust) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Account Statement — ${cust.name}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        .header { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
        h1 { font-size: 24px; margin-bottom: 8px; color: #db2777; }
        .meta { color: #555; font-size: 14px; margin-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #f8fafc; padding: 12px 15px; text-align: left; font-size: 11px; text-transform: uppercase; color: #64748b; border-bottom: 2px solid #e2e8f0; }
        td { padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
        .amount { text-align: right; font-family: 'Courier New', Courier, monospace; }
        .total { font-weight: bold; background: #fff1f2; }
        .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; color: #94a3b8; font-size: 11px; text-align: center; }
      </style></head><body>
      <div class="header">
        <h1>Customer Account Statement</h1>
        <div class="meta"><strong>Customer:</strong> ${cust.name}</div>
        ${cust.phone ? `<div class="meta"><strong>Phone:</strong> ${cust.phone}</div>` : ''}
        <div class="meta"><strong>Report Period:</strong> Since ${formatDate(settings.startDate)}</div>
        <div class="meta"><strong>Print Date:</strong> ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      </div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th class="amount">Debit (₨)</th><th class="amount">Credit (₨)</th><th class="amount">Balance (₨)</th></tr></thead>
        <tbody>
          ${withBalance.map((e) => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${e.description || '—'}</td>
              <td class="amount">${e.debit ? formatCurrency(e.debit) : '—'}</td>
              <td class="amount">${e.credit ? formatCurrency(e.credit) : '—'}</td>
              <td class="amount total" style="color: ${e.balance >= 0 ? '#dc2626' : '#059669'}">${formatCurrency(Math.abs(e.balance))} ${e.balance >= 0 ? '(Dr)' : '(Cr)'}</td>
            </tr>`).join('')}
          <tr style="background:#f8fafc; font-weight: bold;">
            <td colspan="2" style="text-align: right;">Final Summary:</td>
            <td class="amount">${formatCurrency(totals.debit)}</td>
            <td class="amount">${formatCurrency(totals.credit)}</td>
            <td class="amount" style="color: ${balance >= 0 ? '#dc2626' : '#059669'}">${formatCurrency(Math.abs(balance))} ${balance >= 0 ? '(Dr)' : '(Cr)'}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">EBS Business Management Suite &bull; System Generated Report</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Parallel Horizontal Tabs (Perpendicular Layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex bg-slate-100 dark:bg-dark-800 p-1 rounded-2xl border border-slate-200 dark:border-dark-700/50 w-full md:w-auto">
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
            <button onClick={handlePrint} className="btn-secondary flex items-center gap-2"><Printer className="w-4 h-4" /> Statement</button>
            <button onClick={() => setShowEntryForm(true)} className="btn-primary !bg-pink-600 hover:!bg-pink-500 flex items-center gap-2">
              <Plus className="w-4 h-4" /> New Entry
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-4 h-[calc(100vh-160px)] overflow-hidden">
        {activeTab === 'database' ? (
          <>
            {/* Sidebar List */}
            <div className="w-64 flex-shrink-0 flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
               <div className="p-3 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Database</p>
                <span className="text-[10px] font-bold text-slate-300">{filteredSidebar.length}</span>
              </div>
              <div className="p-2 border-b border-slate-100 dark:border-dark-700/30">
                <SearchBar value={custSearch} onChange={setCustSearch} placeholder="Search names..." fullWidth={true} className="!py-1.5 !text-[11px]" />
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
            <div className="flex-1 min-w-0 smart-scroll h-full pr-1">
              {cust ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 animate-in slide-in-from-bottom duration-350">
                    <div className="glass p-5 rounded-2xl border-l-4 border-slate-400 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Debit (Sales)</p>
                      <p className="text-2xl font-black text-slate-800 dark:text-white tabular-nums">₨ {formatCurrency(totals.debit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-emerald-500 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Total Credit (Received)</p>
                      <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums">₨ {formatCurrency(totals.credit)}</p>
                    </div>
                    <div className="glass p-5 rounded-2xl border-l-4 border-pink-600 shadow-sm">
                      <p className="text-[10px] font-black text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Pending Balance</p>
                      <p className={cn("text-2xl font-black tabular-nums", balance >= 0 ? "text-pink-600" : "text-emerald-600")}>
                        ₨ {formatCurrency(Math.abs(balance))} {balance >= 0 ? '(Dr)' : '(Cr)'}
                      </p>
                    </div>
                  </div>

                  <div className="glass rounded-2xl overflow-hidden border border-slate-200 dark:border-dark-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 border-b border-slate-200 dark:border-dark-700/50 bg-white/30 dark:bg-dark-800/30">
                      <div className="flex-1 min-w-0"><SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search transactions..." /></div>
                      <div className="flex items-center gap-2">
                        <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                        <span className="text-slate-400">→</span>
                        <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                      </div>
                    </div>
                    <div className="overflow-x-auto smart-scroll">
                      <table className="table-excel">
                        <thead>
                          <tr className="table-header">
                            <th className="px-4 py-3 text-left w-12 border-r border-slate-300 dark:border-dark-700/50">S.No</th>
                            <th className="px-4 py-3 text-left">Date</th>
                            <th className="px-4 py-3 text-left">Description</th>
                            <th className="px-4 py-3 text-right">Debit</th>
                            <th className="px-4 py-3 text-right">Credit</th>
                            <th className="px-4 py-3 text-right">Balance</th>
                            <th className="px-4 py-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paged.length === 0 ? (
                            <tr><td colSpan={7} className="text-center text-slate-400 py-12 italic">No transactions found</td></tr>
                          ) : paged.map((e, i) => (
                            <tr key={e.id} className="group">
                              <td className="text-[11px] font-bold text-slate-400 border-r border-slate-300 dark:border-dark-700/50 text-center">{(page - 1) * perPage + i + 1}</td>
                              <td className="whitespace-nowrap text-[11px] font-medium uppercase tracking-tighter text-slate-500 dark:text-dark-400">{formatDate(e.date)}</td>
                              <td className="text-black dark:text-white font-medium text-[13px]">{e.description || '—'}</td>
                              <td className="amount !text-red-600 dark:!text-red-400">{e.debit ? formatCurrency(e.debit) : '—'}</td>
                              <td className="amount !text-emerald-600 dark:!text-emerald-500">{e.credit ? formatCurrency(e.credit) : '—'}</td>
                              <td className="amount !text-black dark:!text-white !text-sm">₨ {formatCurrency(e.balance)}</td>
                              <td className="text-right">
                                {currentUser?.role === 'Admin' && (
                                  <button onClick={() => { if(confirm('Delete entry?')) { deleteCustomerEntry(e.id); toast('Entry deleted', 'warning'); } }} className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t-2 border-slate-200 dark:border-dark-700 bg-slate-50/50 dark:bg-dark-900/50">
                          <tr className="font-bold text-slate-900 dark:text-white">
                            <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-widest text-[10px]">Page Total</td>
                            <td className="px-4 py-3 text-right text-red-600">₨ {formatCurrency(pageTotals.debit)}</td>
                            <td className="px-4 py-3 text-right text-emerald-600">₨ {formatCurrency(pageTotals.credit)}</td>
                            <td colSpan={2}></td>
                          </tr>
                          {page === Math.ceil(withBalance.length / perPage) && (
                            <tr className="font-black text-slate-900 dark:text-white bg-pink-600/5 border-t border-pink-600/20">
                              <td colSpan={3} className="px-4 py-4 text-right uppercase tracking-widest text-xs text-pink-600">Grand Total</td>
                              <td className="px-4 py-4 text-right text-red-700 dark:text-red-400 text-base">₨ {formatCurrency(totals.debit)}</td>
                              <td className="px-4 py-4 text-right text-emerald-700 dark:text-emerald-400 text-base">₨ {formatCurrency(totals.credit)}</td>
                              <td colSpan={2}></td>
                            </tr>
                          )}
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
                    <label className="label text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">Contact Number (Optional)</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input 
                        className="input !pl-12 !py-4 !text-lg !font-bold" 
                        placeholder="e.g. 0300-1234567" 
                        value={newPhone} 
                        onChange={e => setNewPhone(e.target.value)} 
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
               <div className="overflow-x-auto smart-scroll">
                  <table className="w-full">
                    <thead><tr className="bg-slate-50/50 dark:bg-dark-800/50 border-b border-slate-200 dark:border-dark-700/50">
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Client Name</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black uppercase text-slate-400 tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-slate-400 tracking-widest">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-dark-800/50">
                      {filteredManage.length === 0 ? (
                        <tr><td colSpan={3} className="px-6 py-20 text-center text-slate-400 italic font-medium">No customers found in database</td></tr>
                      ) : filteredManage.map((c) => (
                        <tr 
                          key={c.id} 
                          className="hover:bg-slate-50 dark:hover:bg-dark-800/20 transition-all group cursor-pointer"
                          onClick={() => handleStartEdit(c)}
                        >
                           {editingId === c.id ? (
                             <>
                               <td className="px-6 py-3" colSpan={2} onClick={(e) => e.stopPropagation()}>
                                  <div className="flex gap-4">
                                     <input className="input !py-1.5 !text-sm flex-1" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus />
                                     <input className="input !py-1.5 !text-sm flex-1" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone" />
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
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                     <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-dark-800 flex items-center justify-center text-slate-400 font-black text-xs uppercase">{c.name.substring(0, 2)}</div>
                                     <span className="font-bold text-slate-800 dark:text-white">{c.name}</span>
                                  </div>
                               </td>
                               <td className="px-6 py-4">
                                  <span className="text-sm font-medium text-slate-500 font-mono tracking-tighter">{c.phone || '—'}</span>
                               </td>
                               <td className="px-6 py-4 text-right">
                                  <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                     <button onClick={(e) => { e.stopPropagation(); handleStartEdit(c); }} className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                                     {currentUser?.role === 'Admin' && (
                                       <button 
                                         onClick={(e) => { e.stopPropagation(); if(confirm('Delete customer and all history?')) deleteCustomer(c.id); }} 
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
        <Modal title={`Add Entry — ${cust?.name}`} onClose={() => setShowEntryForm(false)}>
          <form onSubmit={handleAddEntry} className="space-y-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
            <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Debit (₨)</label><input type="number" step="0.01" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></div>
              <div><label className="label">Credit (₨)</label><input type="number" step="0.01" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowEntryForm(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary"><Plus className="w-4 h-4" /> Add Entry</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
