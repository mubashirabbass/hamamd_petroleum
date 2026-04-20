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

  const [activeTab, setActiveTab] = useState<'analytics' | 'entries' | 'register' | 'manage'>('analytics');
  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showReport, setShowReport] = useState(false);

  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [manageSearch, setManageSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '' });

  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'register') setActiveTab('register');
    else if (tab === 'analytics') setActiveTab('analytics');
    else if (tab === 'entries') setActiveTab('entries');
    else if (tab === 'manage') setActiveTab('manage');
  }, [searchParams]);

  useEffect(() => {
    if (!selectedCust && customers.length > 0) setSelectedCust(customers[0].id);
  }, [customers, selectedCust]);

  const cust = customers.find((c) => c.id === selectedCust);

  const entriesWithBalance = useMemo(() => {
    if (!selectedCust) return [];
    const filtered = filterByStartDate(customerEntries, settings.startDate)
      .filter((e) => e.customerId === selectedCust)
      .filter((e) => {
        const matchesSearch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const matchesFrom = !fromDate || e.date >= fromDate;
        const matchesTo   = !toDate   || e.date <= toDate;
        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    let bal = 0;
    return filtered.map(e => {
      bal += (e.debit || 0) - (e.credit || 0);
      return { ...e, runningBalance: bal };
    }).reverse();
  }, [customerEntries, settings.startDate, selectedCust, search, fromDate, toDate]);

  const dashStats = useMemo(() => {
    const all = filterByStartDate(customerEntries, settings.startDate);
    const globalDebit = all.reduce((s, e) => s + (e.debit || 0), 0);
    const globalCredit = all.reduce((s, e) => s + (e.credit || 0), 0);
    const globalNet = globalDebit - globalCredit;

    const custStats = customers.map(c => {
      const cEntries = all.filter(e => e.customerId === c.id);
      const cDebit = cEntries.reduce((s, e) => s + (e.debit || 0), 0);
      const cCredit = cEntries.reduce((s, e) => s + (e.credit || 0), 0);
      return { ...c, balance: cDebit - cCredit };
    }).sort((a, b) => b.balance - a.balance);

    return { globalNet, custStats };
  }, [customerEntries, customers, settings.startDate]);

  const handleSubmitEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !form.date) { toast('Fill required fields', 'error'); return; }
    setIsSaving(true);
    try {
      const payload = { ...form, debit: parseFloat(form.debit) || 0, credit: parseFloat(form.credit) || 0, customerId: selectedCust };
      if (editingEntity) {
        await updateCustomerEntry(editingEntity.id, payload);
        toast('Updated', 'success');
      } else {
        await addCustomerEntry({ ...payload, balance: 0 });
        toast('Added', 'success');
      }
      closeEntryForm();
    } catch (err) {
      toast('Failed to save', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const closeEntryForm = () => { setShowEntryForm(false); setEditingEntity(null); setForm({ date: today(), description: '', debit: '', credit: '' }); };

  const handleEditEntry = (e: any) => { setEditingEntity(e); setForm({ date: e.date, description: e.description || '', debit: e.debit.toString(), credit: e.credit.toString() }); setShowEntryForm(true); setViewingEntity(null); };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden text-slate-900 dark:text-white">
      <div className="px-4 pt-4 pb-2 bg-white dark:bg-dark-900/50 border-b border-slate-200 dark:border-dark-800 shrink-0">
        <div className="segmented-control overflow-x-auto no-scrollbar">
          {(['analytics', 'entries', 'register', 'manage'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={cn("segmented-item", activeTab === t ? "segmented-item-active" : "segmented-item-inactive")}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {activeTab === 'analytics' ? (
          <div className="p-4 space-y-6">
            <div className="glass-card !bg-pink-600 border-none shadow-pink-600/30">
               <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">TOTAL RECEIVABLES (NET)</p>
               <h2 className="text-4xl font-[900] text-white">₨ {formatCurrency(Math.abs(dashStats.globalNet))}</h2>
               <div className="mt-4 pt-4 border-t border-white/10 flex justify-between">
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{customers.length} CLIENTS</span>
                  <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{dashStats.globalNet >= 0 ? 'STATUS: DEBIT' : 'STATUS: CREDIT'}</span>
               </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">CLIENT RECOVERY BREAKDOWN</h3>
              {dashStats.custStats.map(c => (
                <div key={c.id} onClick={() => { setSelectedCust(c.id); setActiveTab('entries'); }} className="glass-card flex items-center justify-between active:scale-[0.98] transition-transform">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/10 flex items-center justify-center border border-pink-100 dark:border-pink-900/20">
                         <User className="w-5 h-5 text-pink-600" />
                      </div>
                      <div className="flex flex-col gap-0.5">
                         <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight font-urdu">{c.name}</p>
                         <p className={cn("text-[9px] font-bold uppercase tracking-widest", c.balance >= 0 ? "text-slate-400" : "text-emerald-500")}>
                           ₨ {formatCurrency(Math.abs(c.balance))} {c.balance >= 0 ? 'DR' : 'CR'}
                         </p>
                      </div>
                   </div>
                   <div className="text-right flex flex-col items-end">
                      <div className="h-1.5 w-24 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden">
                         <div className="h-full bg-pink-500 rounded-full" style={{ width: `${Math.min(100, (Math.abs(c.balance) / (Math.abs(dashStats.globalNet) || 1)) * 100)}%` }} />
                      </div>
                      <p className="text-[9px] font-black text-pink-600 mt-1 uppercase">TOTAL SHARE</p>
                   </div>
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'entries' ? (
          <div className="flex flex-col h-full">
            <div className="p-4 bg-white dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 space-y-3 shrink-0">
               <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {customers.map(c => (
                    <button key={c.id} onClick={() => setSelectedCust(c.id)} className={cn("shrink-0 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all", selectedCust === c.id ? "bg-pink-600 text-white shadow-lg" : "bg-white dark:bg-dark-800 text-slate-500 border border-slate-200 dark:border-dark-700")}>
                      {c.name}
                    </button>
                  ))}
               </div>
               <SearchBar value={search} onChange={setSearch} placeholder="SEARCH LEDGER..." fullWidth />
            </div>
            <div className="divide-y divide-slate-100 dark:divide-dark-800">
               {entriesWithBalance.map(e => (
                 <MobileActivityCard 
                   key={e.id} 
                   title={e.description || 'Customer Entry'} 
                   subtitle={formatDate(e.date)} 
                   amount={`₨ ${formatCurrency(Math.abs(e.debit - e.credit))}`} 
                   date={cust?.name || ''} 
                   icon={e.debit > 0 ? Plus : Trash2} 
                   iconColor={e.debit > 0 ? "text-pink-500" : "text-emerald-500"} 
                   onClick={() => setViewingEntity(e)} 
                 />
               ))}
               {entriesWithBalance.length === 0 && <div className="py-20 text-center uppercase text-[10px] font-black text-slate-400 tracking-widest">No entries found</div>}
            </div>
          </div>
        ) : activeTab === 'register' ? (
          <div className="p-6">
            <div className="glass-card space-y-6">
              <h2 className="text-xl font-black uppercase tracking-tight">Register New Customer</h2>
              <form onSubmit={handleAddCustomer} className="space-y-4">
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-pink-600 uppercase tracking-widest px-1">Customer Name</label>
                   <input className="input w-full !h-12 font-urdu" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. MALIK SAHIB" required dir="auto" />
                </div>
                <div className="space-y-1.5">
                   <label className="text-[10px] font-black text-pink-600 uppercase tracking-widest px-1">Phone Number</label>
                   <input className="input w-full !h-12" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="03XXXXXXXXX" />
                </div>
                <button type="submit" className="w-full py-4 bg-pink-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-pink-600/20 active:scale-95 transition-all">
                  ACTIVATE ACCOUNT
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <SearchBar value={manageSearch} onChange={setManageSearch} placeholder="FILTER CLIENTS..." fullWidth />
            <div className="space-y-2">
              {customers.filter(c => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase()) || (c.phone && c.phone.includes(manageSearch))).map(c => (
                <div key={c.id} className="glass-card flex items-center justify-between py-3">
                   {editingId === c.id ? (
                     <div className="flex-1 flex flex-col gap-2">
                        <input className="input w-full !h-10 font-urdu" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} autoFocus dir="auto" />
                        <div className="flex gap-2">
                           <input className="input flex-1 !h-10" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} />
                           <button onClick={() => handleSaveEdit(c.id)} className="p-2 text-emerald-600"><Check className="w-5 h-5" /></button>
                           <button onClick={() => setEditingId(null)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
                        </div>
                     </div>
                   ) : (
                     <>
                        <div className="flex flex-col">
                           <span className="font-black text-sm uppercase font-urdu">{c.name}</span>
                           <span className="text-[10px] font-bold text-slate-400">{c.phone || 'NO PHONE'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                           <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name, phone: c.phone || '' }); }} className="p-2 text-slate-400"><Edit2 className="w-4 h-4" /></button>
                           {currentUser?.role === 'Admin' && <button onClick={() => { if(confirm('Delete customer?')) deleteCustomer(c.id); }} className="p-2 text-red-400"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                     </>
                   )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showEntryForm && (
        <Modal title={editingEntity ? `EDIT — ${cust?.name}` : `ADD — ${cust?.name}`} onClose={closeEntryForm} variant="bottom-sheet">
          <form onSubmit={handleSubmitEntry} className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Date</label><input type="date" className="input w-full !h-12" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required /></div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Description</label><input className="input w-full !h-12" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="DETAILS..." dir="auto" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-pink-600 uppercase tracking-widest px-1">Debit (Sale)</label><input type="number" step="any" className="input w-full !h-12 !text-pink-600" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value })} placeholder="0.00" /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest px-1">Credit (Rec)</label><input type="number" step="any" className="input w-full !h-12 !text-emerald-600" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value })} placeholder="0.00" /></div>
              </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-pink-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-pink-600/20 active:scale-95 transition-all">
              {isSaving ? 'SYNCING...' : 'CONFIRM LEDGER ENTRY'}
            </button>
          </form>
        </Modal>
      )}

      {(activeTab === 'analytics' || activeTab === 'entries') && (
        <FAB icon={Plus} onClick={() => { if(customers.length === 0) setActiveTab('register'); else setShowEntryForm(true); }} label="NEW" className="!bg-pink-600 shadow-pink-600/40" />
      )}

      {viewingEntity && <TransactionReceiptModal entity={{ ...viewingEntity, amount: viewingEntity.debit || viewingEntity.credit }} type="customer" onClose={() => setViewingEntity(null)} onEdit={handleEditEntry} onDelete={() => deleteCustomerEntry(viewingEntity.id)} />}
      {showReport && <PrintReportModal data={entriesWithBalance} type="customer" onClose={() => setShowReport(false)} />}
    </div>
  );

  function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault(); if (!newName.trim()) return;
    if (customers.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) { toast('Already exists', 'error'); return; }
    addCustomer({ name: newName.trim(), phone: newPhone.trim() }); setNewName(''); setNewPhone(''); toast('Customer registered', 'success'); setActiveTab('analytics');
  }

  function handleSaveEdit(id: string) {
    if (!editForm.name.trim()) return;
    updateCustomer(id, { name: editForm.name.trim(), phone: editForm.phone.trim() }); setEditingId(null); toast('Updated', 'success');
  }
}
