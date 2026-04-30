import React, { useState, useMemo, useEffect } from 'react';
import { Wallet, Plus, Trash2, Eye, Edit2, Check, X, ArrowRight, Save } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';
import TransactionReceiptModal from '../components/modals/TransactionReceiptModal';
import FAB from '../components/ui/FAB';
import ModuleHeader from '../components/ui/ModuleHeader';

export default function CapitalPage() {
  const { capitalCategories, capitalEntries, addCapitalCategory, updateCapitalCategory, deleteCapitalCategory, addCapitalEntry, updateCapitalEntry, deleteCapitalEntry, settings, currentUser } = useStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'database' | 'register' | 'manage'>('dashboard');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntity, setEditingEntity] = useState<any>(null);
  const [viewingEntity, setViewingEntity] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '' });
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(40);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [manageSearch, setManageSearch] = useState('');

  useEffect(() => {
    if (!selectedCat && capitalCategories.length > 0) setSelectedCat(capitalCategories[0].id);
  }, [capitalCategories, selectedCat]);

  const cat = capitalCategories.find(c => c.id === selectedCat);

  const filteredEntries = useMemo(() => {
    if (!selectedCat) return [];
    return filterByStartDate(capitalEntries, settings.startDate)
      .filter(e => e.categoryId === selectedCat)
      .filter(e => {
        const ms = !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search);
        const mf = !fromDate || e.date >= fromDate;
        const mt = !toDate || e.date <= toDate;
        return ms && mf && mt;
      });
  }, [capitalEntries, settings.startDate, selectedCat, search, fromDate, toDate]);

  const withBalance = useMemo(() => {
    const sorted = [...filteredEntries].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    return sorted.map(e => { bal += (e.debit || 0) - (e.credit || 0); return { ...e, balance: bal }; })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredEntries]);

  const paged = paginate(withBalance, page, perPage);
  const totals = useMemo(() => ({ debit: filteredEntries.reduce((s, e) => s + (e.debit || 0), 0), credit: filteredEntries.reduce((s, e) => s + (e.credit || 0), 0) }), [filteredEntries]);

  const closeForm = () => { setShowEntryForm(false); setEditingEntity(null); setForm({ date: today(), description: '', debit: '', credit: '' }); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCat) return;

    const confirmed = window.confirm(editingEntity ? 'Confirm Update: Save changes to this capital record?' : 'Confirm Save: Register this new capital entry?');
    if (!confirmed) return;

    const payload = { categoryId: selectedCat, date: form.date, description: form.description, debit: parseFloat(form.debit) || 0, credit: parseFloat(form.credit) || 0, balance: 0 };
    setIsSaving(true);
    try {
      if (editingEntity) { await updateCapitalEntry(editingEntity.id, payload); toast('Entry updated', 'success'); closeForm(); }
      else { await addCapitalEntry(payload); toast('Entry added', 'success'); setEditingEntity(null); setForm(p => ({ ...p, description: '', debit: '', credit: '' })); }
    } catch (err: any) { toast(`Failed: ${err?.message || err}`, 'error'); }
    finally { setIsSaving(false); }
  };

  const handleEdit = (e: any) => { setEditingEntity(e); setForm({ date: e.date, description: e.description || '', debit: e.debit ? String(e.debit) : '', credit: e.credit ? String(e.credit) : '' }); setShowEntryForm(true); };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (capitalCategories.some(c => c.name.toLowerCase() === newName.trim().toLowerCase())) { toast('Account already exists!', 'error'); return; }
    addCapitalCategory(newName.trim()); setNewName(''); toast('Capital account registered', 'success'); setActiveTab('dashboard');
  };

  return (
    <div className="animate-fade-in flex flex-col h-full w-full overflow-hidden">
      <ModuleHeader title="Capital Accounts" icon={Wallet} iconClassName="!bg-indigo-100 !text-indigo-600" />

      <div className="p-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 flex-shrink-0 z-10">
        <div className="pill-nav-container">
          <button onClick={() => setActiveTab('dashboard')} className={cn("pill-nav-item", activeTab === 'dashboard' ? "pill-nav-item-active bg-indigo-600 border-indigo-600 shadow-indigo-500/30" : "hover:border-indigo-100")}>Analytics</button>
          <button onClick={() => setActiveTab('database')} className={cn("pill-nav-item", activeTab === 'database' ? "pill-nav-item-active bg-indigo-600 border-indigo-600 shadow-indigo-500/30" : "hover:border-indigo-100")}>Ledger</button>
          <button onClick={() => setActiveTab('register')} className={cn("pill-nav-item", activeTab === 'register' ? "pill-nav-item-active bg-indigo-600 border-indigo-600 shadow-indigo-500/30" : "hover:border-indigo-100")}>New Account</button>
          <button onClick={() => setActiveTab('manage')} className={cn("pill-nav-item", activeTab === 'manage' ? "pill-nav-item-active bg-indigo-600 border-indigo-600 shadow-indigo-500/30" : "hover:border-indigo-100")}>Settings</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto smart-scroll">
        {activeTab === 'dashboard' && (
          <div className="p-4 md:p-6 space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-2 gap-4">
              {(() => {
                const all = filterByStartDate(capitalEntries, settings.startDate);
                const gd = all.reduce((s, e) => s + (e.debit || 0), 0);
                const gc = all.reduce((s, e) => s + (e.credit || 0), 0);
                const net = gd - gc;
                return (
                  <>
                    <div className="glass p-5 rounded-3xl border-l-4 border-indigo-600 shadow-xl bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-900/10 dark:to-dark-900 col-span-2">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Total Net Capital</p>
                      <p className={cn("text-3xl font-black tabular-nums leading-tight", net >= 0 ? "text-slate-900 dark:text-white" : "text-red-600")}>
                        ₨ {formatCurrency(Math.abs(net))}
                        <span className="text-xs ml-1 font-bold text-slate-400 uppercase">{net >= 0 ? 'DR' : 'CR'}</span>
                      </p>
                    </div>
                    <div className="glass p-5 rounded-3xl border-l-4 border-slate-400 shadow-lg bg-white/50 dark:bg-dark-800/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Accounts</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{capitalCategories.length}</p>
                    </div>
                    <div className="glass p-5 rounded-3xl border-l-4 border-indigo-400 shadow-lg bg-indigo-50/30 dark:bg-indigo-900/10">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">Total Entries</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{all.length}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Account List */}
            <div className="space-y-3">
              {capitalCategories.map(c => {
                const ents = filterByStartDate(capitalEntries, settings.startDate).filter(e => e.categoryId === c.id);
                const d = ents.reduce((s, e) => s + (e.debit || 0), 0);
                const r = ents.reduce((s, e) => s + (e.credit || 0), 0);
                const b = d - r;
                return (
                  <div key={c.id} onClick={() => { setSelectedCat(c.id); setActiveTab('database'); }}
                    className="glass p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all border-l-4 border-indigo-500 shadow-sm cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Wallet className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase tracking-tight">{c.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{ents.length} Entries</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn('text-lg font-black tabular-nums leading-none', b >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500')}>
                        ₨ {formatCurrency(Math.abs(b))} <span className="text-[9px]">{b >= 0 ? 'DR' : 'CR'}</span>
                      </p>
                      <ArrowRight className="w-4 h-4 text-slate-300 ml-auto mt-1 group-hover:text-indigo-500 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="p-4 flex flex-col h-full space-y-4">
             <div className="pill-nav-container mb-6">
               {capitalCategories.map(c => (
                 <button
                   key={c.id}
                   onClick={() => { setSelectedCat(c.id); setPage(1); }}
                   className={cn(
                     "pill-nav-item border-2",
                     selectedCat === c.id 
                       ? "pill-nav-item-active bg-indigo-600 border-indigo-600 shadow-indigo-500/30" 
                       : "bg-white dark:bg-dark-900 border-slate-100 dark:border-dark-800 hover:border-indigo-200"
                   )}
                 >
                   {c.name}
                 </button>
               ))}
            </div>

            <div className="flex items-center gap-2 bg-white/50 dark:bg-dark-900/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200 dark:border-dark-800 shadow-sm">
              <div className="flex-1">
                <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search transactions..." fullWidth className="!py-1.5 !text-[11px]" />
              </div>
              <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24 px-1 border border-slate-200 dark:border-dark-700 rounded-lg py-1" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} />
              <input type="date" className="bg-transparent text-[10px] font-black text-slate-600 dark:text-dark-400 outline-none w-24 px-1 border border-slate-200 dark:border-dark-700 rounded-lg py-1" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} />
            </div>

            <div className="flex-1 glass rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-xl overflow-hidden flex flex-col">
              <div className="flex-1 overflow-x-auto overflow-y-auto smart-scroll">
                <table className="table-excel min-w-[700px] w-full">
                  <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                    <tr className="table-header">
                      <th className="table-cell text-left px-4">Date</th>
                      <th className="table-cell text-left px-4">Description</th>
                      <th className="table-cell text-right px-4">Debit (+)</th>
                      <th className="table-cell text-right px-4">Credit (-)</th>
                      <th className="table-cell text-right px-4">Balance</th>
                      <th className="table-cell text-center px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-20 text-center text-xs font-black text-slate-400 uppercase tracking-widest">No entries found</td></tr>
                    ) : paged.map(e => (
                      <tr key={e.id} className="table-row text-[11px] group">
                        <td className="table-cell font-bold text-slate-600">{formatDate(e.date)}</td>
                        <td className="table-cell font-medium text-slate-900 dark:text-white" dir="auto">{e.description || 'Capital Injection'}</td>
                        <td className="table-cell text-right text-indigo-600 font-bold">{e.debit > 0 ? `₨ ${formatCurrency(e.debit)}` : '---'}</td>
                        <td className="table-cell text-right text-orange-500 font-bold">{e.credit > 0 ? `₨ ${formatCurrency(e.credit)}` : '---'}</td>
                        <td className="table-cell text-right font-black text-slate-900 dark:text-white">
                          ₨ {formatCurrency(Math.abs(e.balance))} <span className="text-[9px] ml-1 opacity-50">{e.balance >= 0 ? 'DR' : 'CR'}</span>
                        </td>
                        <td className="table-cell text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setViewingEntity(e)} className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"><Eye className="w-4 h-4" /></button>
                             <button 
                               onClick={() => { if(window.confirm('Modify this capital entry?')) handleEdit(e); }} 
                               className="p-1.5 text-slate-400 hover:text-amber-600 transition-colors"
                             >
                               <Edit2 className="w-4 h-4" />
                             </button>
                             {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                               <button 
                                 onClick={() => { if (window.confirm('Permanently delete this capital record?')) deleteCapitalEntry(e.id); }} 
                                 className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="sticky bottom-0 bg-indigo-600 text-white text-[11px] font-black uppercase tracking-wider">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right opacity-80">Ledger Totals:</td>
                      <td className="px-4 py-3 text-right">₨ {formatCurrency(totals.debit)}</td>
                      <td className="px-4 py-3 text-right">₨ {formatCurrency(totals.credit)}</td>
                      <td className="px-4 py-3 text-right" colSpan={2}>NET: ₨ {formatCurrency(Math.abs(totals.debit - totals.credit))} <span className="text-[9px] opacity-80">{totals.debit - totals.credit >= 0 ? 'DR' : 'CR'}</span></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="mt-4"><Pagination page={page} total={withBalance.length} perPage={perPage} onChange={setPage} /></div>
          </div>
        )}

        {activeTab === 'register' && (
          <div className="p-6">
            <div className="max-w-xl mx-auto glass p-8 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-2xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 flex items-center justify-center"><Plus className="w-7 h-7 text-indigo-600" /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">New Account</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest opacity-60">Register Partner or Equity Account</p>
                </div>
              </div>
              <form onSubmit={handleAddCategory} className="space-y-6">
                <div>
                  <label className="label">Account Name *</label>
                  <input className="input !py-4" placeholder="e.g. Haji Sahab Equity" value={newName} onChange={e => setNewName(e.target.value)} required autoFocus dir="auto" />
                </div>
                <button type="submit" className="btn-primary w-full !py-4 justify-center !bg-indigo-600 shadow-xl shadow-indigo-600/20">
                  <Check className="w-5 h-5" /> Create Account
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'manage' && (
          <div className="p-6 space-y-4">
            <SearchBar value={manageSearch} onChange={setManageSearch} placeholder="Filter accounts..." fullWidth />
            <div className="glass rounded-3xl overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl">
              <table className="w-full">
                <thead className="bg-slate-50 dark:bg-dark-800"><tr className="table-header"><th className="table-cell text-left">Account Name</th><th className="table-cell text-right">Actions</th></tr></thead>
                <tbody>
                  {capitalCategories.filter(c => !manageSearch || c.name.toLowerCase().includes(manageSearch.toLowerCase())).map(c => (
                    <tr key={c.id} className="table-row group">
                      {editingId === c.id ? (
                        <>
                          <td className="px-4 py-3"><input className="input !py-2" value={editForm.name} onChange={e => setEditForm({ name: e.target.value })} autoFocus dir="auto" /></td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => { if (editForm.name.trim()) { updateCapitalCategory(c.id, editForm.name.trim()); setEditingId(null); toast('Updated', 'success'); } }} className="p-2 text-indigo-600"><Check className="w-5 h-5" /></button>
                              <button onClick={() => setEditingId(null)} className="p-2 text-slate-400"><X className="w-5 h-5" /></button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="table-cell font-bold text-slate-800 dark:text-white">{c.name}</td>
                          <td className="table-cell text-right">
                            <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingId(c.id); setEditForm({ name: c.name }); }} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                              {(currentUser?.role === 'Admin' || currentUser?.role === 'Developer') && (
                                <button onClick={() => { if (confirm('Delete account and all entries?')) deleteCapitalCategory(c.id); }} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
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
        )}
      </div>

      {(activeTab === 'dashboard' || activeTab === 'database') && (
        <FAB icon={Plus} onClick={() => {
          if (activeTab === 'dashboard') { setActiveTab('register'); }
          else { if (capitalCategories.length === 0) { setActiveTab('register'); toast('Register a capital account first', 'info'); } else { setShowEntryForm(true); } }
        }} label="NEW" />
      )}

      {showEntryForm && (
        <Modal title={editingEntity ? `Edit Entry` : `New Capital Entry`} onClose={closeForm}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-4 overflow-y-auto no-scrollbar max-h-[60vh]">
              <div>
                <label className="label">Transaction Date</label>
                <input type="date" className="input !h-12" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Description</label>
                <input className="input !h-12" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details of investment/withdrawal..." dir="auto" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-indigo-600">Debit (+)</label>
                  <input type="number" step="any" className="input !h-12 !text-lg !text-indigo-600" value={form.debit} onChange={e => setForm({ ...form, debit: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="label text-orange-600">Credit (-)</label>
                  <input type="number" step="any" className="input !h-12 !text-lg !text-orange-600" value={form.credit} onChange={e => setForm({ ...form, credit: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="bg-indigo-600/5 p-6 rounded-3xl border border-indigo-600/10 text-center shadow-lg">
                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Impact on Equity</p>
                <p className={cn('text-3xl font-black tabular-nums tracking-tighter', (Number(form.debit) || 0) - (Number(form.credit) || 0) >= 0 ? 'text-slate-900 dark:text-white' : 'text-red-500')}>
                  ₨ {formatCurrency(Math.abs((Number(form.debit) || 0) - (Number(form.credit) || 0)))}
                  <span className="text-xs ml-1 uppercase">{(Number(form.debit) || 0) - (Number(form.credit) || 0) >= 0 ? 'DR' : 'CR'}</span>
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={closeForm} className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-slate-400" disabled={isSaving}>Cancel</button>
              <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl flex items-center justify-center gap-3 disabled:opacity-50" disabled={isSaving}>
                {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                <span>{editingEntity ? 'Update Entry' : 'Save Transaction'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {viewingEntity && <TransactionReceiptModal entity={viewingEntity} type="asset" onClose={() => setViewingEntity(null)} />}
    </div>
  );
}
