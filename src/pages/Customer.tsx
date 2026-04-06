import { useState, useMemo, useRef } from 'react';
import { Plus, Trash2, Users, UserPlus, Printer } from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today, paginate } from '../lib/utils';
import { useToast } from '../components/ui/Toast';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import Modal from '../components/ui/Modal';

const PER_PAGE = 10;

export default function CustomerPage() {
  const { customers, customerEntries, addCustomer, deleteCustomer, addCustomerEntry, deleteCustomerEntry } = useStore();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  const [selectedCust, setSelectedCust] = useState<string | null>(null);
  const [showCustForm, setShowCustForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [custForm, setCustForm] = useState({ name: '', phone: '' });
  const [form, setForm] = useState({ date: today(), description: '', debit: '', credit: '' });

  const cust = customers.find((c) => c.id === selectedCust);

  const filteredCustomers = useMemo(() =>
    customers.filter((c) => !custSearch || c.name.toLowerCase().includes(custSearch.toLowerCase()) || c.phone.includes(custSearch)),
    [customers, custSearch]
  );

  const filtered = useMemo(() => {
    if (!selectedCust) return [];
    return customerEntries
      .filter((e) => e.customerId === selectedCust)
      .filter((e) => !search || e.description.toLowerCase().includes(search.toLowerCase()) || e.date.includes(search));
  }, [customerEntries, selectedCust, search]);

  const withBalance = useMemo(() => {
    const sorted = [...filtered].reverse();
    let bal = 0;
    return sorted.map((e) => { bal += e.debit - e.credit; return { ...e, balance: bal }; }).reverse();
  }, [filtered]);

  const paged = paginate(withBalance, page, PER_PAGE);
  const totals = { debit: filtered.reduce((s, e) => s + e.debit, 0), credit: filtered.reduce((s, e) => s + e.credit, 0) };
  const balance = totals.debit - totals.credit;

  const handleAddCust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim()) { toast('Enter customer name', 'error'); return; }
    addCustomer({ name: custForm.name.trim(), phone: custForm.phone.trim() });
    toast('Customer registered', 'success');
    setCustForm({ name: '', phone: '' }); setShowCustForm(false);
  };

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
        body { font-family: Arial, sans-serif; padding: 30px; color: #111; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        .meta { color: #555; font-size: 13px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f0f0f0; padding: 8px 12px; text-align: left; font-size: 12px; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #eee; font-size: 13px; }
        .amount { text-align: right; }
        .total { font-weight: bold; }
        .footer { margin-top: 30px; color: #888; font-size: 12px; text-align: center; }
      </style></head><body>
      <h1>Customer Statement</h1>
      <div class="meta"><strong>${cust.name}</strong>${cust.phone ? ` &bull; ${cust.phone}` : ''}</div>
      <div class="meta">Generated: ${new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
      <table>
        <thead><tr><th>Date</th><th>Description</th><th class="amount">Debit (₨)</th><th class="amount">Credit (₨)</th><th class="amount">Balance (₨)</th></tr></thead>
        <tbody>
          ${withBalance.map((e) => `
            <tr>
              <td>${formatDate(e.date)}</td>
              <td>${e.description || '—'}</td>
              <td class="amount">${e.debit ? formatCurrency(e.debit) : '—'}</td>
              <td class="amount">${e.credit ? formatCurrency(e.credit) : '—'}</td>
              <td class="amount total">${formatCurrency(e.balance)}</td>
            </tr>`).join('')}
          <tr style="background:#f9f9f9">
            <td colspan="2" class="total">Totals</td>
            <td class="amount total">${formatCurrency(totals.debit)}</td>
            <td class="amount total">${formatCurrency(totals.credit)}</td>
            <td class="amount total">${formatCurrency(balance)}</td>
          </tr>
        </tbody>
      </table>
      <div class="footer">EBS Business Manager &mdash; Confidential</div>
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="animate-fade-in flex gap-4 h-full">
      {/* Customer List Sidebar */}
      <div className="w-56 flex-shrink-0 flex flex-col gap-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-slate-500 dark:text-dark-300">Customers</h2>
          <button onClick={() => setShowCustForm(true)} className="p-1.5 rounded-lg bg-primary-600/10 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400 hover:bg-primary-600/20 dark:hover:bg-primary-600/30 transition-colors"><UserPlus className="w-4 h-4" /></button>
        </div>
        <div className="relative mb-1">
          <input className="input text-xs py-1.5" placeholder="Search customers..." value={custSearch} onChange={(e) => setCustSearch(e.target.value)} />
        </div>
        {filteredCustomers.length === 0 && <p className="text-xs text-slate-400 dark:text-dark-500 text-center mt-4">No customers yet.</p>}
        <div className="flex-1 overflow-y-auto space-y-1">
          {filteredCustomers.map((c) => (
            <div key={c.id} onClick={() => { setSelectedCust(c.id); setSearch(''); setPage(1); }}
              className={`flex items-start justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-all group ${selectedCust === c.id ? 'bg-primary-50 dark:bg-primary-600/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20' : 'text-slate-500 dark:text-dark-400 hover:bg-slate-100 dark:hover:bg-dark-700/50 hover:text-slate-900 dark:hover:text-dark-100'}`}>
              <div className="min-w-0">
                <p className="font-medium truncate">{c.name}</p>
                {c.phone && <p className="text-xs text-slate-400 dark:text-dark-500 truncate">{c.phone}</p>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteCustomer(c.id); if (selectedCust === c.id) setSelectedCust(null); toast('Customer deleted', 'warning'); }}
                className="opacity-0 group-hover:opacity-100 text-slate-400 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-all mt-0.5 flex-shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        {showCustForm && (
          <Modal title="Register Customer" onClose={() => setShowCustForm(false)}>
            <form onSubmit={handleAddCust} className="space-y-3">
              <div><label className="label">Full Name *</label><input className="input" value={custForm.name} onChange={(e) => setCustForm({ ...custForm, name: e.target.value })} placeholder="Customer name" required /></div>
              <div><label className="label">Phone Number</label><input className="input" value={custForm.phone} onChange={(e) => setCustForm({ ...custForm, phone: e.target.value })} placeholder="03xx-xxxxxxx" /></div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowCustForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Register</button></div>
            </form>
          </Modal>
        )}
        {showEntryForm && (
          <Modal title={`Add Entry — ${cust?.name}`} onClose={() => setShowEntryForm(false)}>
            <form onSubmit={handleAddEntry} className="space-y-3">
              <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required /></div>
              <div><label className="label">Description</label><input className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Transaction details" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Debit (₨)</label><input type="number" step="0.01" className="input" value={form.debit} onChange={(e) => setForm({ ...form, debit: e.target.value })} /></div>
                <div><label className="label">Credit (₨)</label><input type="number" step="0.01" className="input" value={form.credit} onChange={(e) => setForm({ ...form, credit: e.target.value })} /></div>
              </div>
              <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowEntryForm(false)} className="btn-secondary">Cancel</button><button type="submit" className="btn-primary"><Plus className="w-4 h-4" />Add Entry</button></div>
            </form>
          </Modal>
        )}

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-pink-600/10 dark:bg-pink-600/20 flex items-center justify-center"><Users className="w-5 h-5 text-pink-600 dark:text-pink-400" /></div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">Customer</h1>
              {cust && <span className="text-xs text-slate-500 dark:text-dark-400">{cust.name}{cust.phone ? ` • ${cust.phone}` : ''}</span>}
            </div>
          </div>
          {selectedCust && (
            <div className="flex gap-2">
              <button onClick={handlePrint} className="btn-secondary"><Printer className="w-4 h-4" /> Print Statement</button>
              <button onClick={() => setShowEntryForm(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Entry</button>
            </div>
          )}
        </div>

        {selectedCust ? (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[{ label: 'Total Debit', value: totals.debit, color: 'text-red-600 dark:text-red-400' }, { label: 'Total Credit', value: totals.credit, color: 'text-emerald-600 dark:text-emerald-400' }, { label: 'Net Balance', value: balance, color: balance >= 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400' }].map((s) => (
                <div key={s.label} className="stat-card"><p className="text-xs text-slate-500 dark:text-dark-400 uppercase tracking-wide">{s.label}</p><p className={`text-lg font-bold ${s.color}`}>₨ {formatCurrency(s.value)}</p></div>
              ))}
            </div>
            <div className="glass rounded-xl overflow-hidden" ref={printRef}>
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-dark-700/50">
                <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search entries..." />
              </div>
              <table className="w-full">
                <thead><tr className="table-header"><th className="table-cell text-left">Date</th><th className="table-cell text-left">Description</th><th className="table-cell text-right">Debit</th><th className="table-cell text-right">Credit</th><th className="table-cell text-right">Balance</th><th className="table-cell"></th></tr></thead>
                <tbody>
                  {paged.length === 0 ? <tr><td colSpan={6} className="table-cell text-center text-slate-400 dark:text-dark-500 py-12">No transactions yet</td></tr>
                    : paged.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-cell">{formatDate(e.date)}</td>
                        <td className="table-cell text-slate-600 dark:text-dark-300">{e.description || '—'}</td>
                        <td className="table-cell text-right text-red-600 dark:text-red-400">{e.debit ? `₨ ${formatCurrency(e.debit)}` : '—'}</td>
                        <td className="table-cell text-right text-emerald-600 dark:text-emerald-400">{e.credit ? `₨ ${formatCurrency(e.credit)}` : '—'}</td>
                        <td className="table-cell text-right font-semibold text-slate-900 dark:text-white">₨ {formatCurrency(e.balance)}</td>
                        <td className="table-cell text-right"><button onClick={() => { deleteCustomerEntry(e.id); toast('Entry deleted', 'warning'); }} className="text-slate-400 dark:text-dark-500 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"><Trash2 className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                </tbody>
              </table>
              <Pagination page={page} total={withBalance.length} perPage={PER_PAGE} onChange={setPage} />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 dark:text-dark-500">
            <Users className="w-12 h-12 mb-3 opacity-20 dark:opacity-30" />
            <p>Select a customer from the left</p>
            <button onClick={() => setShowCustForm(true)} className="btn-primary mt-4"><UserPlus className="w-4 h-4" /> Register Customer</button>
          </div>
        )}
      </div>
    </div>
  );
}
