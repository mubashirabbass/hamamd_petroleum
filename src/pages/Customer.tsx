import { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Trash2, Users, UserPlus, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import ManageCustomersModal from '../components/modals/ManageCustomersModal';
import { formatCurrency, formatDate, today, paginate, filterByStartDate, cn } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

const PER_PAGE = 10;

export default function CustomerPage() {
  const { 
    customers, customerEntries, 
    addCustomerEntry, deleteCustomerEntry, settings, currentUser 
  } = useStore();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [custModalMode, setCustModalMode] = useState<'register' | 'manage'>('register');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });
  
  useEffect(() => {
    if (!selectedCust && customers.length > 0) {
      setSelectedCust(customers[0].id);
    }
  }, [customers, selectedCust]);

  const cust = customers.find((c) => c.id === selectedCust);

  const filteredCustomers = useMemo(() =>
    customers.filter((c) => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)),
    [customers, custSearch]
  );

  const filtered = useMemo(() => {
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
    const sorted = [...filtered].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [filtered]);

  const paged = paginate(withBalance, page, PER_PAGE);
  const totals = { debit: filtered.reduce((s, e) => s + e.debit, 0), credit: filtered.reduce((s, e) => s + e.credit, 0) };
  const balance = totals.debit - totals.credit;

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCust || !form.date) { toast('Fill required fields', 'error'); return; }
    addCustomerEntry({ customerId: selectedCust, date: form.date, description: form.description, debit: parseFloat(form.debit) || 0, credit: parseFloat(form.credit) || 0, balance: 0 });
    toast('Entry added', 'success'); setForm({ date: today(), description: '', debit: '', credit: '' }); setShowEntryForm(false);
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content || !cust) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Invoice — ${cust.name}</title>
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
    <div className="animate-fade-in flex gap-4 h-full">
      <div className="w-64 flex-shrink-0 flex flex-col h-[calc(100vh-140px)] gap-3 font-bold">
        <div className="flex flex-col h-full bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-dark-700/50 bg-pink-500/5 flex items-center gap-2">
            <Users className="w-4 h-4 text-pink-600" />
            <h2 className="font-bold text-slate-800 dark:text-white text-sm">Customer Centre</h2>
          </div>

          <div className="p-2 space-y-1 border-b border-slate-100 dark:border-dark-700/30">
            <button 
              onClick={() => { setCustModalMode('register'); setShowManageModal(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] text-slate-600 dark:text-dark-400 hover:bg-pink-50 dark:hover:bg-pink-900/10 hover:text-pink-600 transition-all border border-transparent hover:border-pink-200"
            >
              <div className="w-6 h-6 rounded-lg bg-pink-100 dark:bg-pink-900/20 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              Register Customer
            </button>
            <button 
              onClick={() => { setCustModalMode('manage'); setShowManageModal(true); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] text-slate-600 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 transition-all border border-transparent hover:border-slate-200"
            >
              <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-dark-810 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
              Manage Customers
            </button>
          </div>

          <div className="p-3 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer Database</p>
            <span className="text-[10px] font-bold text-slate-300">{filteredCustomers.length}</span>
          </div>

          <div className="p-2 border-b border-slate-100 dark:border-dark-700/30">
            <SearchBar value={custSearch} onChange={setCustSearch} placeholder="Database search..." fullWidth={true} className="!py-1.5 !text-[11px]" />
          </div>
          
          <div className="smart-scroll flex-1 p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">No customers found</div>
            ) : (
              filteredCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => { setSelectedCust(c.id); setSearch(''); setPage(1); }}
                  className={cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-bold transition-all duration-200 border border-transparent',
                    selectedCust === c.id 
                      ? 'bg-pink-600/10 text-pink-600 border-pink-600/10 shadow-sm shadow-pink-600/5 relative overflow-hidden' 
                      : 'text-slate-500 dark:text-dark-400 hover:bg-slate-50 dark:hover:bg-dark-800 hover:text-slate-900 dark:hover:text-white hover:border-slate-200 dark:hover:border-dark-700/50'
                  )}
                >
                   {selectedCust === c.id && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-pink-600 rounded-r-full"></span>}
                   <div className="flex flex-col min-w-0">
                      <p className="truncate">{c.name}</p>
                      {c.phone && <p className="text-[9px] opacity-60 font-medium truncate mt-0.5">{c.phone}</p>}
                   </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
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

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-600/10 dark:bg-pink-600/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Customer Database</h1>
              {cust && <span className="text-xs text-slate-500 dark:text-dark-400 font-bold uppercase tracking-wider">{cust.name}</span>}
            </div>
          </div>
          {selectedCust && (
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-secondary flex items-center gap-2"><Printer className="w-4 h-4" /> Statement</button>
              <button onClick={() => setShowEntryForm(true)} className="btn-primary !bg-pink-600 hover:!bg-pink-500 flex items-center gap-2">
                <Plus className="w-4 h-4" /> New Entry
              </button>
            </div>
          )}
        </div>

        {selectedCust ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">From</span>
                    <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">To</span>
                    <input type="date" className="input !py-1 !px-2 !w-32 !text-xs" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }} />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="table-header">
                    <th className="table-cell text-left">Date</th>
                    <th className="table-cell text-left">Description</th>
                    <th className="table-cell text-right">Debit</th>
                    <th className="table-cell text-right">Credit</th>
                    <th className="table-cell text-right">Balance</th>
                    <th className="table-cell"></th>
                  </tr></thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                    {paged.length === 0 ? (
                      <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12 italic">No transactions found for this customer</td></tr>
                    ) : paged.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell whitespace-nowrap text-xs text-slate-500">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300 min-w-[200px] font-medium">{e.description || '—'}</td>
                        <td className="table-cell text-right text-slate-600 italic font-mono text-xs">{e.debit ? `₨ ${formatCurrency(e.debit)}` : '—'}</td>
                        <td className="table-cell text-right text-emerald-600 dark:text-emerald-400 font-mono text-xs italic">{e.credit ? `₨ ${formatCurrency(e.credit)}` : '—'}</td>
                        <td className="table-cell text-right font-black text-slate-900 dark:text-white text-sm">₨ {formatCurrency(e.balance)}</td>
                        <td className="table-cell text-right">
                          {currentUser?.role === 'Admin' && (
                            <button onClick={() => { if(confirm('Delete entry?')) { deleteCustomerEntry(e.id); toast('Entry deleted', 'warning'); } }} className="text-slate-300 hover:text-red-600 transition-colors p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={page} total={withBalance.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 dark:text-dark-500 animate-fade-in opacity-40">
            <Users className="w-16 h-16 mb-4" />
            <p className="font-medium">Select a customer from the left</p>
          </div>
        )}
      </div>

      <ManageCustomersModal
        isOpen={showManageModal}
        onClose={() => setShowManageModal(false)}
        mode={custModalMode}
      />
    </div>
  );
}
