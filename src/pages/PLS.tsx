import React, { useMemo } from 'react';
import { 
  Calculator, ShoppingCart, DollarSign, Layers, Activity, FileText, TrendingUp, ArrowDownCircle, PieChart, ArrowRightCircle, Target
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { formatCurrency, cn } from '../lib/utils';

export default function PLS() {
  const store = useStore();
  const { purchases, sales, expenseEntries, expenseCategories, settings } = store;

  const data = useMemo(() => {
    try {
      const getStats = (type: 'HSD' | 'PMG') => {
        const p = purchases.filter(x => x.type === type);
        const s = sales.filter(x => x.type === type);

        const pQty = p.reduce((sum, x) => sum + (x.quantity || 0), 0);
        const pAmt = p.reduce((sum, x) => sum + (x.totalAmount || 0), 0);
        const pAvg = pQty > 0 ? pAmt / pQty : 0;

        const sQty = s.reduce((sum, x) => sum + (x.quantity || 0), 0);
        const sAmt = s.reduce((sum, x) => sum + (x.amount || 0), 0);
        const sAvg = sQty > 0 ? sAmt / sQty : 0;

        const stockQty = pQty - sQty; 
        const stockVal = stockQty * pAvg;

        return {
          purchase: { qty: pQty, avg: pAvg, amt: pAmt },
          sale: { qty: sQty, avg: sAvg, amt: sAmt },
          stock: { qty: stockQty, avg: pAvg, amt: stockVal }
        };
      };

      const hsd = getStats('HSD');
      const pmg = getStats('PMG');

      const detailedExpenses = expenseEntries.map(e => {
        const cat = expenseCategories.find(c => c.id === e.categoryId);
        return { ...e, categoryName: cat?.name || 'Unknown' };
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const totalExpenses = detailedExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

      return { hsd, pmg, detailedExpenses, totalExpenses, error: null };
    } catch (err: any) {
      return { error: err.message };
    }
  }, [purchases, sales, expenseEntries, expenseCategories]);

  if (data.error) {
    return <div className="p-10 text-red-500">Error: {data.error}</div>;
  }

  const sum1 = (data.pmg?.purchase.amt || 0) + (data.hsd?.purchase.amt || 0);
  const sum2 = (data.pmg?.sale.amt || 0) + (data.hsd?.sale.amt || 0) + (data.pmg?.stock.amt || 0) + (data.hsd?.stock.amt || 0);
  const grossProfit = sum2 - sum1;
  const netProfit = grossProfit - (data.totalExpenses || 0);

  // Helper for massive numbers to avoid layout break
  const smartFormat = (val: number) => {
    const formatted = formatCurrency(val);
    if (val > 1000000) return formatted.replace('.00', '');
    return formatted;
  };

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-dark-950 font-mono text-[11px] overflow-hidden">
      {/* Excel Header */}
      <div className="bg-slate-100 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-800 p-4 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-500" />
          <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Profit & Loss Statement (Excel View)</h1>
        </div>
        <div className="flex gap-4">
          <div className="bg-white dark:bg-dark-800 border border-slate-300 dark:border-dark-700 px-3 py-1 rounded shadow-sm">
             <span className="text-slate-400 mr-2 uppercase text-[9px] font-black">Net Profit:</span>
             <span className={cn("font-bold text-sm", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>₨ {smartFormat(netProfit)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto smart-scroll p-4 lg:p-8 space-y-8 pb-20">
        <div className="max-w-[1400px] mx-auto space-y-10 pb-20">
          
          {/* 1. TRADING ACCOUNT TABLE */}
          <div className="border border-slate-300 dark:border-dark-700 rounded overflow-hidden shadow-sm bg-white dark:bg-dark-900">
            <div className="bg-slate-800 text-white px-4 py-2 font-bold text-[10px] uppercase text-center tracking-widest border-b border-slate-300">
              Part 1: Trading Account (Gross Profit)
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-2/5 uppercase tracking-widest text-[9px] text-slate-500">Particulars (Debit)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Liters</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Rate</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">Purchase (PMG)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200">{data.pmg?.purchase.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.pmg?.purchase.avg || 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.pmg?.purchase.amt || 0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">Purchase (HSD)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200">{data.hsd?.purchase.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.hsd?.purchase.avg || 0)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.hsd?.purchase.amt || 0)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]" colSpan={3}>Debit Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">₨ {smartFormat(sum1)}</td>
                  </tr>
                </tfoot>
              </table>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-2/5 uppercase tracking-widest text-[9px] text-slate-500">Particulars (Credit)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Liters</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Rate</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">Sales (PMG)</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{data.pmg?.sale.qty.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.pmg?.sale.avg || 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.pmg?.sale.amt || 0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">Sales (HSD)</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{data.hsd?.sale.qty.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.hsd?.sale.avg || 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.hsd?.sale.amt || 0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase pl-8 italic">Stock PMG</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{data.pmg?.stock.qty.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.pmg?.stock.avg || 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.pmg?.stock.amt || 0)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase pl-8 italic">Stock HSD</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{data.hsd?.stock.qty.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border-r border-slate-200">{formatCurrency(data.hsd?.stock.avg || 0)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(data.hsd?.stock.amt || 0)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]" colSpan={3}>Credit Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">₨ {smartFormat(sum2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 2. PROFIT & LOSS ACCOUNT TABLE */}
          <div className="border border-slate-300 dark:border-dark-700 rounded overflow-hidden shadow-sm bg-white dark:bg-dark-900">
            <div className="bg-slate-700 text-white px-4 py-2 font-bold text-[10px] uppercase text-center tracking-widest border-b border-slate-300">
              Part 2: Operating Expenses & Other Income
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5 uppercase tracking-widest text-[9px] text-slate-500">Particulars (Debit)</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  {data.detailedExpenses.map((e, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 uppercase">{e.categoryName} ({e.description || 'General'})</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-black text-red-600 bg-slate-50/30">₨ {smartFormat(e.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Total Expenses Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">₨ {smartFormat(data.totalExpenses)}</td>
                  </tr>
                </tfoot>
              </table>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5 uppercase tracking-widest text-[9px] text-slate-500">Particulars (Credit)</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800 uppercase tracking-widest text-[9px] text-slate-500">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-bold text-emerald-600 border-r border-slate-200 uppercase italic">Gross Profit b/d</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-black text-slate-900 dark:text-white bg-slate-50/30">₨ {smartFormat(grossProfit)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-black border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Gross Profit Total</td>
                    <td className="px-4 py-3 text-right tabular-nums text-xs">₨ {smartFormat(grossProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 3. FINAL SUMMARY ACCOUNT (Standard Table Layout) */}
          <div className="max-w-[800px] mx-auto border-2 border-slate-900 dark:border-dark-700 rounded-xl overflow-hidden shadow-2xl bg-white dark:bg-dark-900">
             <div className="bg-slate-900 text-white px-4 py-3 font-black text-[11px] uppercase text-center tracking-[0.4em] border-b border-slate-700">
                Part 3: Profit & Loss Final Summary
             </div>
             <table className="w-full border-collapse">
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                   <tr className="group hover:bg-slate-50">
                      <td className="px-6 py-4 border-r border-slate-200 w-1/2">
                         <div className="flex items-center gap-3">
                            <TrendingUp className="w-4 h-4 text-emerald-600" />
                            <span className="font-black text-slate-700 dark:text-dark-100 uppercase tracking-widest text-[10px]">Total Gross Profit Sum</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-emerald-700 tabular-nums text-lg break-all">
                         ₨ {smartFormat(grossProfit)}
                      </td>
                   </tr>
                   <tr className="group hover:bg-slate-50">
                      <td className="px-6 py-4 border-r border-slate-200">
                         <div className="flex items-center gap-3">
                            <ArrowDownCircle className="w-4 h-4 text-red-600" />
                            <span className="font-black text-slate-700 dark:text-dark-100 uppercase tracking-widest text-[10px]">Total Operating Expenses</span>
                         </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-red-700 tabular-nums text-lg break-all">
                         ₨ {smartFormat(data.totalExpenses)}
                      </td>
                   </tr>
                   <tr className={cn("text-white", netProfit >= 0 ? "bg-emerald-600" : "bg-red-600")}>
                      <td className="px-6 py-6 border-r border-white/20">
                         <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                               <PieChart className="w-6 h-6" />
                            </div>
                            <span className="font-black uppercase tracking-[0.3em] text-[13px] italic">Net Profit / Loss</span>
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right font-black tabular-nums text-3xl break-all">
                         ₨ {smartFormat(netProfit)}
                      </td>
                   </tr>
                </tbody>
             </table>
          </div>

        </div>
      </div>
    </div>
  );
}
