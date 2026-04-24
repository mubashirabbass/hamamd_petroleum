import React, { useMemo, useState } from 'react';
import { 
  Briefcase, Users, Package, Database, BarChart3, LayoutDashboard,
  FileText, TrendingUp, Wallet, ArrowRight, Table as TableIcon,
  AlertTriangle, Landmark, Plus, Check, X, Edit3, Trash2, Calculator,
  PlusCircle, Save
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
  
  const settings = store.settings || {};
  const startDate = settings.startDate || '';

  // Data Entry State
  const [newCapName, setNewCapName] = useState('');
  const [newCapAmount, setNewCapAmount] = useState('');
  const [showCapEntry, setShowCapEntry] = useState(false);
  
  const [newAssetName, setNewAssetName] = useState('');
  const [newAssetAmount, setNewAssetAmount] = useState('');
  const [showAssetEntry, setShowAssetEntry] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const data = useMemo(() => {
    try {
      // 1. Assets
      const allAssets = assetCategories.map(cat => {
        const entries = assetEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
        return { id: cat.id, name: cat.name, balance };
      });
      const totalRegisteredAssets = allAssets.reduce((sum, a) => sum + a.balance, 0);

      // User Logic: "in reciveabel fethc ll sum up of all customers credits"
      const totalReceivables = customerEntries.reduce((sum, e) => sum + (e.credit || 0), 0);

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

      // 2. Liabilities
      // User Logic: "in payable fetch the amount sum up of all teh customers debit"
      const totalPayables = customerEntries.reduce((sum, e) => sum + (e.debit || 0), 0);

      const liabilities = liabilityCategories.map(cat => {
        const entries = liabilityEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.credit || 0) - (e.debit || 0)), 0); 
        return { id: cat.id, name: cat.name, balance };
      });
      const totalOtherLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);

      // 3. Capital
      const capital = capitalCategories.map(cat => {
        const entries = capitalEntries.filter(e => e.categoryId === cat.id);
        const balance = entries.reduce((sum, e) => sum + ((e.debit || 0) - (e.credit || 0)), 0);
        return { id: cat.id, name: cat.name, balance };
      });
      const totalCapital = capital.reduce((sum, c) => sum + c.balance, 0);

      return {
        allAssets, totalRegisteredAssets,
        totalReceivables,
        hsdStock, pmgStock, totalStockValue: hsdStock.value + pmgStock.value,
        totalPayables,
        liabilities, totalOtherLiabilities,
        capital, totalCapital,
        error: null
      };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [assetCategories, assetEntries, liabilityCategories, liabilityEntries, capitalCategories, capitalEntries, customers, customerEntries, purchases, sales, startDate]);

  const handleQuickAsset = async () => {
    if (!newAssetName || !newAssetAmount) {
      toast.error('Enter name and amount');
      return;
    }
    setIsSaving(true);
    try {
      let catId = assetCategories.find(c => c.name.toLowerCase() === newAssetName.toLowerCase())?.id;
      if (!catId) {
        catId = await store.addAssetCategory(newAssetName) as any;
      }
      await store.addAssetEntry({
        categoryId: catId!,
        date: today(),
        description: 'Balance Sheet Entry',
        debit: parseFloat(newAssetAmount) || 0,
        credit: 0,
        balance: 0
      });
      setNewAssetName('');
      setNewAssetAmount('');
      setShowAssetEntry(false);
      toast.success('Asset added');
    } catch (err) {
      toast.error('Failed to add asset');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickCapital = async () => {
    if (!newCapName || !newCapAmount) {
      toast.error('Enter name and amount');
      return;
    }
    setIsSaving(true);
    try {
      let catId = capitalCategories.find(c => c.name.toLowerCase() === newCapName.toLowerCase())?.id;
      if (!catId) {
        catId = await store.addCapitalCategory(newCapName) as any;
      }
      await store.addCapitalEntry({
        categoryId: catId!,
        date: today(),
        description: 'Balance Sheet Entry',
        debit: parseFloat(newCapAmount) || 0,
        credit: 0,
        balance: 0
      });
      setNewCapName('');
      setNewCapAmount('');
      setShowCapEntry(false);
      toast.success('Capital updated');
    } catch (err) {
      toast.error('Failed to add capital');
    } finally {
      setIsSaving(false);
    }
  };

  if (data.error) {
    return <div className="p-10 text-red-500 font-mono">Error: {data.error}</div>;
  }

  const finalTotalAssets = data.totalRegisteredAssets + data.totalReceivables + data.totalStockValue;
  const finalTotalEquity = data.totalPayables + data.totalOtherLiabilities + data.totalCapital;

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-dark-950 font-mono text-[11px] overflow-hidden">
      {/* Excel Header */}
      <div className="bg-slate-100 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-800 p-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-500" />
          <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Balance Sheet (Financial Position)</h1>
        </div>
        <div className="flex items-center gap-6">
           <div className="flex items-center gap-2">
             <span className="text-[9px] font-black text-slate-400 uppercase">Audit:</span>
             <span className={cn("px-2 py-0.5 rounded text-[10px] font-black uppercase", Math.abs(finalTotalAssets - finalTotalEquity) < 1 ? "bg-emerald-500 text-white" : "bg-red-500 text-white shadow-lg")}>
               {Math.abs(finalTotalAssets - finalTotalEquity) < 1 ? "Balanced" : "Unbalanced"}
             </span>
           </div>
           <div className="text-right">
             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Net Worth</p>
             <p className="text-base font-black text-slate-900 dark:text-white tabular-nums leading-none mt-1">₨ {formatCurrency(finalTotalAssets)}</p>
           </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto smart-scroll p-4 lg:p-8 space-y-12 pb-20">
        <div className="max-w-[1400px] mx-auto space-y-12">
          
          {/* SECTION 1: ASSETS */}
          <div className="border border-slate-300 dark:border-dark-700 rounded shadow-sm overflow-hidden bg-white dark:bg-dark-900">
             <div className="bg-slate-800 text-white px-4 py-2 font-bold text-[10px] uppercase text-center tracking-widest border-b border-slate-300 flex items-center justify-center relative">
               Part 1: Assets Allocation
             </div>
             <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
                
                {/* REGISTERED ASSETS (LEFT) */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                      <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5 uppercase tracking-widest text-[9px] text-slate-500">
                        <div className="flex items-center justify-between">
                           Asset Account Name
                           <button onClick={() => setShowAssetEntry(true)} className="p-1 hover:bg-slate-200 rounded transition-colors text-blue-600 cursor-pointer">
                             <PlusCircle className="w-4 h-4" />
                           </button>
                        </div>
                      </th>
                      <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                    {showAssetEntry && (
                      <tr className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-400 animate-slide-down">
                        <td className="px-4 py-2 border-r border-slate-200">
                           <input type="text" placeholder="[Enter Asset Name]" className="w-full bg-transparent outline-none font-bold text-blue-600 placeholder:text-slate-300 uppercase" autoFocus value={newAssetName} onChange={(e) => setNewAssetName(e.target.value)} />
                        </td>
                        <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                           <input type="number" placeholder="0.00" className="w-full bg-transparent outline-none font-black text-slate-900 dark:text-white text-right placeholder:text-slate-300" value={newAssetAmount} onChange={(e) => setNewAssetAmount(e.target.value)} />
                           <button onClick={handleQuickAsset} className={cn("p-1 rounded transition-colors cursor-pointer", isSaving ? "bg-slate-400" : "bg-blue-600 hover:bg-blue-700 text-white")} disabled={isSaving}>
                             {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                           </button>
                           <button onClick={() => setShowAssetEntry(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"><X className="w-3 h-3" /></button>
                        </td>
                      </tr>
                    )}
                    {data.allAssets.map(a => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                        <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800 uppercase">{a.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {formatCurrency(a.balance)}</td>
                      </tr>
                    ))}
                    <tr className="h-10"><td colSpan={2} className="border-r border-slate-200"></td></tr>
                  </tbody>
                  <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                    <tr>
                      <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Registered Assets Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]">₨ {formatCurrency(data.totalRegisteredAssets)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* DYNAMIC ASSETS (RIGHT: STOCK & RECEIVABLES) */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                      <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-2/5 uppercase tracking-widest text-[9px] text-slate-500">Particulars</th>
                      <th className="px-2 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Liters</th>
                      <th className="px-2 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Rate</th>
                      <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                    <tr className="hover:bg-slate-50 group transition-colors">
                      <td className="px-4 py-3 border-r border-slate-200 font-black text-blue-600 uppercase tracking-tighter">Stock PMG</td>
                      <td className="px-2 py-3 text-right tabular-nums border-r border-slate-200 text-slate-600">{data.pmgStock.qty.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right tabular-nums border-r border-slate-200 text-slate-600">{formatCurrency(data.pmgStock.avgPrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-black text-blue-700 bg-slate-50/30">₨ {formatCurrency(data.pmgStock.value)}</td>
                    </tr>
                    <tr className="hover:bg-slate-50 group transition-colors">
                      <td className="px-4 py-3 border-r border-slate-200 font-black text-blue-600 uppercase tracking-tighter">Stock HSD</td>
                      <td className="px-2 py-3 text-right tabular-nums border-r border-slate-200 text-slate-600">{data.hsdStock.qty.toLocaleString()}</td>
                      <td className="px-2 py-3 text-right tabular-nums border-r border-slate-200 text-slate-600">{formatCurrency(data.hsdStock.avgPrice)}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-black text-blue-700 bg-slate-50/30">₨ {formatCurrency(data.hsdStock.value)}</td>
                    </tr>
                    {/* CUSTOMER RECEIVABLES (CONSOLIDATED) */}
                    <tr className="bg-slate-50 dark:bg-dark-800/50"><td colSpan={4} className="px-4 py-1.5 font-black text-[9px] uppercase text-slate-400">Consolidated Receivables</td></tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-4 py-4 border-r border-slate-200 font-black text-slate-700 uppercase tracking-widest">Total Accounts Receivable (Credits Sum)</td>
                      <td className="px-2 py-4 border-r border-slate-200"></td>
                      <td className="px-2 py-4 border-r border-slate-200"></td>
                      <td className="px-4 py-4 text-right tabular-nums font-black text-emerald-600 bg-slate-50/30 text-base">₨ {formatCurrency(data.totalReceivables)}</td>
                    </tr>
                    <tr className="h-10"><td colSpan={4} className="border-r border-slate-200"></td></tr>
                  </tbody>
                  <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                    <tr>
                      <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]" colSpan={3}>Current Assets Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]">₨ {formatCurrency(data.totalReceivables + data.totalStockValue)}</td>
                    </tr>
                  </tfoot>
                </table>
             </div>
          </div>

          {/* SECTION 2: LIABILITIES & CAPITAL */}
          <div className="border border-slate-300 dark:border-dark-700 rounded shadow-sm overflow-hidden bg-white dark:bg-dark-900">
             <div className="bg-slate-700 text-white px-4 py-2 font-bold text-[10px] uppercase text-center tracking-widest border-b border-slate-300">
               Part 2: Liabilities & Capital Matrix
             </div>
             <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
                
                {/* PAYABLES (CONSOLIDATED) */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                      <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5 uppercase tracking-widest text-[9px] text-slate-500">Liability Account Summary</th>
                      <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Amount Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                    <tr className="bg-orange-50 dark:bg-orange-900/20"><td colSpan={2} className="px-4 py-1.5 font-black text-[9px] uppercase text-orange-500">Customer Payables (Debits Sum)</td></tr>
                    <tr className="hover:bg-orange-50/30">
                       <td className="px-4 py-5 font-black text-slate-800 dark:text-white border-r border-slate-200 uppercase tracking-widest">Total Accounts Payable (Debits Sum)</td>
                       <td className="px-4 py-5 text-right tabular-nums font-black text-red-600 bg-slate-50/30 text-base">₨ {formatCurrency(data.totalPayables)}</td>
                    </tr>
                    <tr className="bg-slate-50 dark:bg-dark-800/50"><td colSpan={2} className="px-4 py-1.5 font-black text-[9px] uppercase text-slate-400">Other Registered Liabilities</td></tr>
                    {data.liabilities.map(l => (
                      <tr key={l.id} className="hover:bg-slate-50"><td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">{l.name}</td><td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {formatCurrency(l.balance)}</td></tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                    <tr>
                      <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Total Liabilities Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-[12px]">₨ {formatCurrency(data.totalPayables + data.totalOtherLiabilities)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* CAPITAL (RIGHT) */}
                <div className="flex flex-col">
                  <table className="w-full border-collapse flex-1">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                        <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5 uppercase tracking-widest text-[9px] text-slate-500">
                          <div className="flex items-center justify-between">
                            Business Capital Accounts
                            <button onClick={() => setShowCapEntry(true)} className="p-1 hover:bg-slate-200 rounded transition-colors text-indigo-600 cursor-pointer">
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </th>
                        <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Net Equity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                      {showCapEntry && (
                        <tr className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-400 animate-slide-down">
                          <td className="px-4 py-2 border-r border-slate-200">
                             <input type="text" placeholder="[Enter Capital Name]" className="w-full bg-transparent outline-none font-bold text-indigo-600 placeholder:text-slate-300 uppercase" autoFocus value={newCapName} onChange={(e) => setNewCapName(e.target.value)} />
                          </td>
                          <td className="px-4 py-2 text-right flex items-center justify-end gap-2">
                             <input type="number" placeholder="0.00" className="w-full bg-transparent outline-none font-black text-slate-900 dark:text-white text-right placeholder:text-slate-300" value={newCapAmount} onChange={(e) => setNewCapAmount(e.target.value)} />
                             <button onClick={handleQuickCapital} className={cn("p-1 rounded transition-colors cursor-pointer", isSaving ? "bg-slate-400" : "bg-indigo-600 hover:bg-indigo-700 text-white")} disabled={isSaving}>
                               {isSaving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check className="w-3 h-3" />}
                             </button>
                             <button onClick={() => setShowCapEntry(false)} className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"><X className="w-3 h-3" /></button>
                          </td>
                        </tr>
                      )}
                      {data.capital.map(c => (
                        <tr key={c.id} className="hover:bg-indigo-50/30">
                          <td className="px-4 py-2.5 font-bold text-indigo-700 dark:text-indigo-300 border-r border-slate-200 dark:border-dark-800 uppercase">{c.name}</td>
                          <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {formatCurrency(c.balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                      <tr>
                        <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Total Capital Total</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[12px]">₨ {formatCurrency(data.totalCapital)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
             </div>
          </div>

          {/* FOOTER SUMMARY */}
          <div className="p-8 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-2xl">
             <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Financial Integrity Check</p>
               <p className="text-sm font-bold text-slate-300 uppercase italic tracking-widest">Assets = Liabilities + Equity</p>
             </div>
             <div className="flex items-center gap-10">
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Total Assets Sum</p>
                  <p className="text-3xl font-black tabular-nums tracking-tighter">₨ {formatCurrency(finalTotalAssets)}</p>
                </div>
                <div className="w-px h-10 bg-slate-700" />
                <div className="text-right">
                  <p className="text-[9px] font-black uppercase text-slate-500 mb-1">Total Equity Sum</p>
                  <p className="text-3xl font-black tabular-nums tracking-tighter text-emerald-400">₨ {formatCurrency(finalTotalEquity)}</p>
                </div>
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}
