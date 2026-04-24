import React, { useMemo } from 'react';
import { 
  Calculator, ShoppingCart, DollarSign, Layers, Activity, FileText
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
      }).sort((a, b) => new Date(a.date).getTime() - new Date(a.date).getTime());

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

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-dark-950 font-mono text-[11px]">
      {/* Excel Header */}
      <div className="bg-slate-100 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-slate-500" />
          <h1 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tighter">Profit & Loss Statement (Excel View)</h1>
        </div>
        <div className="flex gap-4">
          <div className="bg-white dark:bg-dark-800 border border-slate-300 dark:border-dark-700 px-3 py-1 rounded shadow-sm">
             <span className="text-slate-400 mr-2">NET PROFIT:</span>
             <span className={cn("font-bold", netProfit >= 0 ? "text-emerald-600" : "text-red-600")}>₨ {formatCurrency(netProfit)}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="max-w-[1400px] mx-auto space-y-8">
          
          {/* 1. TRADING ACCOUNT TABLE */}
          <div className="border border-slate-300 dark:border-dark-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-800 text-white px-4 py-2 font-bold text-xs uppercase text-center tracking-widest border-b border-slate-300">
              Trading Account (Gross Profit Calculation)
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
              
              {/* DEBIT SIDE (PURCHASES) */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-2/5">Particulars (Debit)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800">Liters</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800">Rate</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Purchase (PMG)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.pmg?.purchase.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.pmg?.purchase.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-indigo-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.pmg?.purchase.amt)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Purchase (HSD)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.hsd?.purchase.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.hsd?.purchase.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-indigo-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.hsd?.purchase.amt)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Sum 1 (Total)</td>
                    <td colSpan={2} className="border-r border-slate-300"></td>
                    <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(sum1)}</td>
                  </tr>
                </tfoot>
              </table>

              {/* CREDIT SIDE (SALES & STOCK) */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-2/5">Particulars (Credit)</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800">Liters</th>
                    <th className="px-3 py-2 text-right border-r border-slate-200 dark:border-dark-800">Rate</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Sales (PMG)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.pmg?.sale.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.pmg?.sale.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.pmg?.sale.amt)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Sales (HSD)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.hsd?.sale.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.hsd?.sale.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.hsd?.sale.amt)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Closing Stock (PMG)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.pmg?.stock.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.pmg?.stock.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.pmg?.stock.amt)}</td>
                  </tr>
                  <tr className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-bold text-slate-700 dark:text-dark-200 border-r border-slate-200 dark:border-dark-800">Closing Stock (HSD)</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{data.hsd?.stock.qty.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right tabular-nums border-r border-slate-200 dark:border-dark-800">{formatCurrency(data.hsd?.stock.avg)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-blue-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(data.hsd?.stock.amt)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">Sum 2 (Total)</td>
                    <td colSpan={2} className="border-r border-slate-300"></td>
                    <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(sum2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* 2. PROFIT & LOSS ACCOUNT TABLE (NET PROFIT) */}
          <div className="border border-slate-300 dark:border-dark-700 rounded-lg overflow-hidden shadow-sm">
            <div className="bg-slate-700 text-white px-4 py-2 font-bold text-xs uppercase text-center tracking-widest border-b border-slate-300">
              Profit & Loss Account (Net Profit Calculation)
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-300 dark:divide-dark-700">
              
              {/* DEBIT SIDE (EXPENSES) */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5">Operating Expenses (Debit)</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  {data.detailedExpenses?.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-dark-800/50">
                      <td className="px-4 py-2 border-r border-slate-200 dark:border-dark-800">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700 dark:text-dark-200">{exp.categoryName}</span>
                          <span className="text-[9px] text-slate-400 uppercase">{exp.date} — {exp.details}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-orange-600 bg-slate-100/30 dark:bg-dark-800/20 font-bold">{formatCurrency(exp.amount)}</td>
                    </tr>
                  ))}
                  {netProfit >= 0 && (
                    <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                      <td className="px-4 py-4 font-black text-emerald-600 border-r border-slate-200 dark:border-dark-800 uppercase text-[12px]">Net Profit c/d</td>
                      <td className="px-4 py-4 text-right font-black tabular-nums text-emerald-700 bg-emerald-100/30 dark:bg-emerald-900/40 text-[12px]">{formatCurrency(netProfit)}</td>
                    </tr>
                  )}
                  {data.detailedExpenses?.length === 0 && <tr className="h-20"><td></td><td className="bg-slate-100/30"></td></tr>}
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">P&L Debit Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(Math.max(grossProfit, 0) + (data.totalExpenses || 0))}</td>
                  </tr>
                </tfoot>
              </table>

              {/* CREDIT SIDE (GROSS PROFIT BROUGHT DOWN) */}
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-900 border-b border-slate-300 dark:border-dark-700">
                    <th className="px-4 py-2 text-left border-r border-slate-200 dark:border-dark-800 w-3/5">Income (Credit)</th>
                    <th className="px-4 py-2 text-right bg-slate-100/50 dark:bg-dark-800">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-dark-800">
                  {grossProfit >= 0 ? (
                    <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                      <td className="px-4 py-3 font-bold text-indigo-600 border-r border-slate-200 dark:border-dark-800">Gross Profit b/d</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-indigo-600 bg-slate-100/30 dark:bg-dark-800/20">{formatCurrency(grossProfit)}</td>
                    </tr>
                  ) : (
                    <tr><td className="border-r border-slate-200 dark:border-dark-800"></td><td className="bg-slate-100/30"></td></tr>
                  )}
                  {netProfit < 0 && (
                    <tr className="bg-red-50 dark:bg-red-900/20">
                      <td className="px-4 py-4 font-black text-red-600 border-r border-slate-200 dark:border-dark-800 uppercase text-[12px]">Net Loss c/d</td>
                      <td className="px-4 py-4 text-right font-black tabular-nums text-red-700 bg-red-100/30 dark:bg-red-900/40 text-[12px]">{formatCurrency(Math.abs(netProfit))}</td>
                    </tr>
                  )}
                  {/* Empty rows to balance height roughly */}
                  {Array.from({ length: Math.max(0, (data.detailedExpenses?.length || 0) - 1) }).map((_, i) => (
                    <tr key={i} className="h-10">
                      <td className="border-r border-slate-200 dark:border-dark-800"></td><td className="bg-slate-100/30"></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-200 dark:bg-dark-800 text-slate-900 dark:text-white font-bold border-t-2 border-slate-400">
                  <tr>
                    <td className="px-4 py-3 border-r border-slate-300 uppercase tracking-widest text-[9px]">P&L Credit Total</td>
                    <td className="px-4 py-3 text-right tabular-nums">₨ {formatCurrency(Math.max(grossProfit, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

        </div>
        
        {/* EXCEL FOOTER */}
        <div className="max-w-[1400px] mx-auto mt-10 p-4 border-t border-slate-200 dark:border-dark-800 text-slate-400 text-[10px] flex justify-between uppercase font-bold tracking-widest">
           <span>Report Generated: {new Date().toLocaleString()}</span>
           <span>Sheet: P&L Statement</span>
           <span>Software: HR Petroleum Business Suite</span>
        </div>
      </div>
    </div>
  );
}
