import React, { useMemo, useState } from 'react';
import { 
  Briefcase, Users, Package, Database, BarChart3, LayoutDashboard,
  FileText, TrendingUp, Wallet, ArrowRight, Table as TableIcon,
  AlertTriangle, Landmark, Plus, Check, X, Edit3, Trash2
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, cn, filterByStartDate, today } from '../lib/utils';
import { useToast } from '../components/ui/Toast';

export default function BalanceSheet() {
  const store = useStore();
  const { toast } = useToast();
  
  const assetCategories = store.assetCategories || [];
  const assetEntries = store.assetEntries || [];
  const liabilityCategories = store.liabilityCategories || [];
  const liabilityEntries = store.liabilityEntries || [];
  const capitalCategories = store.capitalCategories || [];
  const capitalEntries = store.capitalEntries || [];
  const customers = store.customers || [];
  const customerEntries = store.customerEntries || [];
  const purchases = store.purchases || [];
  const sales = store.sales || [];
  const settings = store.settings || { startDate: '' };
  
  const startDate = settings.startDate || '';

  const data = useMemo(() => {
    try {
      // 1. Asset Balances
      const assets = assetCategories.map(cat => {
        const entries = assetEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
        return { id: cat.id, name: cat.name, balance };
      }).filter(a => Math.abs(a.balance) > 0.01).sort((a, b) => b.balance - a.balance);

      const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);

      // 2. Customer Receivables & Payables (Detailed)
      const customerBalances = customers.map(cust => {
        const entries = customerEntries.filter(e => e.customerId === cust.id);
        const balance = entries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
        return { id: cust.id, name: cust.name, balance };
      }).filter(c => Math.abs(c.balance) > 0.01);

      const receivables = customerBalances.filter(c => c.balance > 0);
      const payables = customerBalances.filter(c => c.balance < 0).map(c => ({ ...c, balance: Math.abs(c.balance) }));

      const totalReceivables = receivables.reduce((sum, r) => sum + r.balance, 0);
      const totalPayables = payables.reduce((sum, p) => sum + p.balance, 0);

      // 3. Stock Valuation
      const getStockStats = (type: 'HSD' | 'PMG') => {
        const p = purchases.filter(x => x.type === type);
        const s = sales.filter(x => x.type === type);
        const pQty = p.reduce((sum, x) => sum + (x.quantity || 0), 0);
        const sQty = s.reduce((sum, x) => sum + (x.quantity || 0), 0);
        const stockQty = pQty - sQty;

        const totalCost = p.reduce((sum, x) => sum + (x.totalAmount || 0), 0);
        const totalQty = p.reduce((sum, x) => sum + (x.quantity || 0), 0);
        const avgPrice = totalQty > 0 ? totalCost / totalQty : 0;
        
        return { qty: stockQty, avgPrice, value: stockQty * avgPrice };
      };

      const hsdStock = getStockStats('HSD');
      const pmgStock = getStockStats('PMG');

      // 4. Liabilities
      const liabilities = liabilityCategories.map(cat => {
        const entries = liabilityEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.credit || 0) - (e.debit || 0)), 0); 
        return { id: cat.id, name: cat.name, balance };
      }).filter(l => Math.abs(l.balance) > 0.01).sort((a, b) => b.balance - a.balance);

      const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);

      // 5. Capital / Equity
      const capital = capitalCategories.map(cat => {
        const entries = capitalEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
        return { id: cat.id, name: cat.name, balance };
      }).filter(c => Math.abs(c.balance) > 0.01);

      const totalCapital = capital.reduce((sum, c) => sum + c.balance, 0);

      const finalTotalAssets = totalAssets + totalReceivables + hsdStock.value + pmgStock.value;
      const finalTotalLiabilities = totalLiabilities + totalPayables + totalCapital;

      return {
        assets, totalAssets,
        receivables, totalReceivables,
        hsdStock, pmgStock, totalStockValue: hsdStock.value + pmgStock.value,
        liabilities, totalLiabilities,
        payables, totalPayables,
        capital, totalCapital,
        finalTotalAssets,
        finalTotalLiabilities,
        error: null
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [assetCategories, assetEntries, liabilityCategories, liabilityEntries, capitalCategories, capitalEntries, customers, customerEntries, purchases, sales, startDate]);

  const handleDelete = async (id: string, type: 'asset' | 'liability' | 'capital') => {
    if (!window.confirm(`Are you sure you want to delete this ${type} category?`)) return;
    try {
      if (type === 'asset') await store.deleteAssetCategory(id);
      else if (type === 'liability') await store.deleteLiabilityCategory(id);
      else if (type === 'capital') await store.deleteCapitalCategory(id);
      toast.success(`${type} category deleted`);
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (data.error) {
    return <div className="p-10 text-red-500">Error: {data.error}</div>;
  }

  const { finalTotalAssets, finalTotalLiabilities } = data;

  return (
    <div className="p-6 lg:p-8 space-y-8 bg-slate-50 dark:bg-dark-950 min-h-full overflow-y-auto smart-scroll">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Balance Sheet</h1>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">Snapshot as of {today()}</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className={cn(
            "px-6 py-3 rounded-2xl border-2 flex items-center gap-3 transition-all",
            Math.abs(finalTotalAssets - finalTotalLiabilities) < 1 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              : "bg-red-500/10 border-red-500/20 text-red-600"
          )}>
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              Math.abs(finalTotalAssets - finalTotalLiabilities) < 1 ? "bg-emerald-500" : "bg-red-500"
            )} />
            <span className="font-black uppercase tracking-widest text-xs">
              {Math.abs(finalTotalAssets - finalTotalLiabilities) < 1 ? "Balanced" : "Unbalanced"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Assets', value: finalTotalAssets, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-600/10 border-blue-600/20' },
          { label: 'Total Liabilities', value: finalTotalLiabilities, icon: Landmark, color: 'text-orange-600', bg: 'bg-orange-600/10 border-orange-600/20' },
          { label: 'Total Equity', value: data.totalCapital, icon: Wallet, color: 'text-indigo-600', bg: 'bg-indigo-600/10 border-indigo-600/20' },
          { label: 'Stock Value', value: data.totalStockValue, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-600/10 border-emerald-600/20' },
        ].map((card, i) => (
          <div key={i} className={cn("p-6 rounded-[2rem] border shadow-sm flex items-center justify-between", card.bg)}>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">{card.label}</p>
              <p className={cn("text-2xl font-black tabular-nums", card.color)}>₨ {formatCurrency(card.value)}</p>
            </div>
            <card.icon className={cn("w-8 h-8 opacity-20", card.color)} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-10">
        {/* ASSETS COLUMN */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-dark-900 rounded-[2.5rem] border border-slate-200 dark:border-dark-800 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 dark:bg-dark-800/50 border-b border-slate-100 dark:border-dark-800 flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Assets Breakdown</h2>
            </div>
            
            <div className="p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-dark-800">
                    <th className="px-6 py-4 text-left">Particulars</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-dark-800">
                   {/* Stock Assets */}
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-dark-200">Inventory: Stock HSD</td>
                    <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums">₨ {formatCurrency(data.hsdStock.value)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-6 py-4 font-bold text-slate-700 dark:text-dark-200">Inventory: Stock PMG</td>
                    <td className="px-6 py-4 text-right font-black text-blue-600 tabular-nums">₨ {formatCurrency(data.pmgStock.value)}</td>
                  </tr>

                  {/* Customer Receivables */}
                  <tr className="bg-blue-50/30"><td colSpan={2} className="px-6 py-2 text-[9px] font-black uppercase text-blue-500">Customer Receivables</td></tr>
                  {data.receivables.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-3 text-slate-600 dark:text-dark-300 font-medium pl-10">{r.name}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(r.balance)}</td>
                    </tr>
                  ))}

                  {/* Category Assets */}
                  <tr className="bg-slate-50/50"><td colSpan={2} className="px-6 py-2 text-[9px] font-black uppercase text-slate-400">Fixed & Other Assets</td></tr>
                  {data.assets.map(a => (
                    <tr key={a.id} className="group hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between pl-4">
                          <span className="font-bold text-slate-700 dark:text-dark-200">{a.name}</span>
                          <button onClick={() => handleDelete(a.id, 'asset')} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-200 dark:border-dark-700">
                  <tr>
                    <td className="px-6 py-6 uppercase tracking-widest text-xs">Total Assets</td>
                    <td className="px-6 py-6 text-right text-xl tabular-nums">₨ {formatCurrency(finalTotalAssets)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        {/* LIABILITIES & EQUITY COLUMN */}
        <div className="space-y-8">
          <div className="bg-white dark:bg-dark-900 rounded-[2.5rem] border border-slate-200 dark:border-dark-800 shadow-xl overflow-hidden">
            <div className="p-6 bg-slate-50 dark:bg-dark-800/50 border-b border-slate-100 dark:border-dark-800 flex items-center gap-3">
              <Landmark className="w-5 h-5 text-orange-600" />
              <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Liabilities & Equity Breakdown</h2>
            </div>
            
            <div className="p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-dark-800">
                    <th className="px-6 py-4 text-left">Particulars</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-dark-800">
                  {/* Capital Section */}
                  <tr className="bg-indigo-50/30"><td colSpan={2} className="px-6 py-2 text-[9px] font-black uppercase text-indigo-500">Capital & Equity</td></tr>
                  {data.capital.map(c => (
                    <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-dark-200">
                         <div className="flex items-center justify-between pl-4">
                            <span>{c.name}</span>
                            <button onClick={() => handleDelete(c.id, 'capital')} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(c.balance)}</td>
                    </tr>
                  ))}

                  {/* Customer Payables */}
                  <tr className="bg-orange-50/30"><td colSpan={2} className="px-6 py-2 text-[9px] font-black uppercase text-orange-500">Customer Payables (Credits)</td></tr>
                  {data.payables.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                      <td className="px-6 py-3 text-slate-600 dark:text-dark-300 font-medium pl-10">{p.name}</td>
                      <td className="px-6 py-3 text-right font-bold text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(p.balance)}</td>
                    </tr>
                  ))}

                  {/* Liabilities Section */}
                  <tr className="bg-slate-50/50"><td colSpan={2} className="px-6 py-2 text-[9px] font-black uppercase text-slate-400">Other Liabilities</td></tr>
                  {data.liabilities.map(l => (
                    <tr key={l.id} className="group hover:bg-slate-50 dark:hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-700 dark:text-dark-200">
                         <div className="flex items-center justify-between pl-4">
                            <span>{l.name}</span>
                            <button onClick={() => handleDelete(l.id, 'liability')} className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900 dark:text-white tabular-nums">₨ {formatCurrency(l.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black border-t-2 border-slate-200 dark:border-dark-700">
                  <tr>
                    <td className="px-6 py-6 uppercase tracking-widest text-xs">Total Liabilities & Equity</td>
                    <td className="px-6 py-6 text-right text-xl tabular-nums">₨ {formatCurrency(finalTotalLiabilities)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
