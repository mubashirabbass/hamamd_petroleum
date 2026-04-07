import React, { useEffect, useRef } from 'react';
import { X, Printer, Phone, Mail, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

interface Props {
  data: any[];
  type: 'sale' | 'purchase';
  onClose: () => void;
}

const ROWS_PER_PAGE = 25;

export default function PrintReportModal({ data, type, onClose }: Props) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const chunks = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) {
    chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  }

  const grandTotals = {
    qty: data.reduce((s, x) => s + (x.quantity || 0), 0),
    amount: data.reduce((s, x) => s + (x.amount || 0), 0),
    carriage: data.reduce((s, x) => s + (x.carriage || 0), 0),
    total: data.reduce((s, x) => s + (x.totalAmount || x.amount || 0), 0),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block overflow-y-auto">
      <div 
        ref={modalRef} 
        className="w-full max-w-[850px] bg-white shadow-2xl relative print:shadow-none print:w-full print:m-0 mx-auto"
      >
        {/* Header Actions */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90 backdrop-blur print:hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest font-sans">A4 {type.toUpperCase()} REPORT</h2>
          <div className="flex gap-2 font-sans">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors font-bold text-sm shadow-lg shadow-primary-600/20">
              <Printer className="w-4 h-4" /> Print Full Report
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Report Pages */}
        <div className="bg-slate-100 print:bg-white pb-10 print:pb-0">
          {chunks.map((chunk, pageIndex) => {
            const pageTotals = {
              qty: chunk.reduce((s, x) => s + (x.quantity || 0), 0),
              amount: chunk.reduce((s, x) => s + (x.amount || 0), 0),
              carriage: chunk.reduce((s, x) => s + (x.carriage || 0), 0),
              total: chunk.reduce((s, x) => s + (x.totalAmount || x.amount || 0), 0),
            };

            return (
              <div 
                key={pageIndex} 
                className="printable-page bg-white mx-auto my-8 print:my-0 shadow-lg print:shadow-none w-[210mm] min-h-[297mm] p-[10mm] flex flex-col font-serif page-break-after-always"
                style={{ fontFamily: 'serif' }}
              >
                {/* Official Letterhead - Double Border Header Box */}
                <div className="border-[3px] border-double border-slate-900 p-4 pb-2 mb-6">
                  <div className="flex justify-between items-start mb-2">
                    {/* HR Logo */}
                    <div className="w-20 h-20 flex-shrink-0">
                       <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    </div>

                    {/* Center Info */}
                    <div className="text-center flex-1 px-4">
                      <h1 className="text-[28px] font-black text-slate-900 uppercase tracking-tight leading-none mb-1 underline decoration-1 underline-offset-4">
                         HAMMAD RAHIM FILLING STATION
                      </h1>
                      <p className="text-[11px] font-bold text-slate-800 mb-3 tracking-normal uppercase italic">
                        Muzafar Garh Road Ada Ghyl Pur District Jhang
                      </p>
                      
                      <div className="flex items-center justify-center gap-5 text-[10px] font-bold text-slate-800">
                         <div className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600/10" /> +923017221831</div>
                         <div className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-primary-600 fill-primary-600/10" /> +923000989192</div>
                         <div className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-primary-600 fill-primary-600/10" /> hammadrahimfs@gmail.com</div>
                      </div>
                    </div>

                    {/* GO Logo */}
                    <div className="w-20 h-20 flex-shrink-0">
                       <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                    </div>
                  </div>
                </div>

                {/* Report Tracking Header */}
                <div className="flex justify-between items-center mb-6 text-xs font-bold uppercase tracking-widest bg-slate-50 px-3 py-2 border border-slate-200">
                   <span>{type === 'sale' ? 'SALES REGISTER' : 'PURCHASE REGISTER'}</span>
                   <span>PAGE {pageIndex + 1} OF {chunks.length}</span>
                   <span>PRINTED: {formatDate(new Date().toISOString().split('T')[0])}</span>
                </div>

                {/* Table */}
                <div className="flex-1">
                   <table className="w-full border-collapse">
                      <thead>
                         <tr className="border-y border-slate-900 text-left bg-slate-50">
                            <th className="p-2 text-[10px] font-black border-r border-slate-200">DATE</th>
                            <th className="p-2 text-[10px] font-black border-r border-slate-200">{type === 'sale' ? 'PRODUCT' : 'DETAILS'}</th>
                            <th className="p-2 text-[10px] font-black border-r border-slate-200 text-right">RATE</th>
                            <th className="p-2 text-[10px] font-black border-r border-slate-200 text-right">QTY (L)</th>
                            {type === 'purchase' && <th className="p-2 text-[10px] font-black border-r border-slate-200 text-right">CARR.</th>}
                            <th className="p-2 text-[10px] font-black text-right">AMOUNT</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {chunk.map((item, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
                               <td className="p-2 text-[11px]">{formatDate(item.date)}</td>
                               <td className="p-2 text-[11px] uppercase truncate max-w-[200px]">{item.details || item.type || 'N/A'}</td>
                               <td className="p-2 text-[11px] text-right font-mono italic">₨ {formatCurrency(item.rate)}</td>
                               <td className="p-2 text-[11px] text-right font-mono font-bold">{item.quantity.toLocaleString()}</td>
                               {type === 'purchase' && <td className="p-2 text-[11px] text-right font-mono italic">₨ {formatCurrency(item.carriage)}</td>}
                               <td className="p-2 text-[11px] text-right font-mono font-black">₨ {formatCurrency(item.totalAmount || item.amount)}</td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>

                {/* Page Subtotal Footer (Repeats on every page) */}
                <div className="mt-4 border-t-2 border-slate-900 pt-3">
                   <div className="flex justify-between items-center px-2">
                      <span className="text-[10px] font-black uppercase text-slate-500">Page {pageIndex + 1} Subtotal:</span>
                      <div className="flex gap-8 text-[11px] font-black">
                         <span>QTY: {pageTotals.qty.toLocaleString()} L</span>
                         <span>TOTAL: ₨ {formatCurrency(pageTotals.total)}</span>
                      </div>
                   </div>
                </div>

                {/* Final Column Summary & Signatures (Last page only) */}
                {pageIndex === chunks.length - 1 && (
                   <div className="mt-8 border-t-4 border-double border-slate-900 pt-6">
                      <div className="bg-slate-900 text-white p-4 flex justify-between items-center mb-10">
                         <span className="text-sm font-black uppercase tracking-[0.2em]">Grand Total (All Pages)</span>
                         <div className="flex gap-10 text-lg font-black">
                            <span>{grandTotals.qty.toLocaleString()} Liters</span>
                            <span>PKR {formatCurrency(grandTotals.total)}</span>
                         </div>
                      </div>

                      {/* Footer Signature */}
                      <div className="flex justify-between items-end pt-10">
                         <div className="text-[10px] font-bold text-slate-500 border-t border-slate-300 pt-2 min-w-[250px]">
                            This is computerized generated bill <br />
                            Errors and Emission are accepted
                         </div>
                         <div className="text-right flex flex-col items-center">
                            <div className="w-[280px] border-t-2 border-slate-900 flex flex-col items-start pt-2">
                               <span className="font-black text-sm uppercase">Muhammad Hammad Rahim</span>
                               <span className="text-[9px] font-bold text-slate-600 uppercase tracking-wider text-left">CEO Hammad Rahim Filling station</span>
                            </div>
                         </div>
                      </div>
                   </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(.fixed) { display: none !important; }
          .fixed:not(.z-50) { display: none !important; }
          .modal-overlay, .backdrop-blur-sm { background: white !important; padding: 0 !important; position: static !important; }
          .print-hidden, .print\\:hidden, button { display: none !important; }
          .printable-page { display: flex !important; visibility: visible !important; width: 210mm !important; min-height: 297mm !important; margin: 0 auto !important; border: none !important; position: relative !important; }
          .page-break-after-always { page-break-after: always !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
