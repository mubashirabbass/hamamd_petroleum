import React, { useEffect, useRef } from 'react';
import { X, Printer, Phone, Calendar, Hash, Mail, MessageSquare } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

type ReceiptType = 'purchase' | 'sale' | 'ledger' | 'expense' | 'asset' | 'liability';

interface TransactionReceiptModalProps {
  entity: any;
  type: ReceiptType;
  title?: string;
  onClose: () => void;
}

export default function TransactionReceiptModal({ entity, type, title, onClose }: TransactionReceiptModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!entity) return;
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement  = focusableElements?.[focusableElements.length - 1] as HTMLElement;
    const printBtn = modalRef.current?.querySelector('button[title="Print Invoice"]') as HTMLElement;
    (printBtn || firstElement)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === firstElement) { e.preventDefault(); lastElement?.focus(); }
      } else {
        if (document.activeElement === lastElement) { e.preventDefault(); firstElement?.focus(); }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [entity, onClose]);

  if (!entity) return null;

  const handlePrint = () => { window.print(); };

  const getInvoiceTitle = () => {
    if (type === 'sale') return `Sale Invoice - ${entity.type || ''}`;
    if (type === 'purchase') return `Purchase Bill - ${entity.type || ''}`;
    if (title) return title;
    return `${type.charAt(0).toUpperCase() + type.slice(1)} Receipt`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block overflow-y-auto">
      <div 
        ref={modalRef} 
        className="w-full max-w-[800px] bg-white shadow-2xl relative print:shadow-none print:w-[210mm] print:h-[297mm] print:m-0 mx-auto"
      >
        {/* Header Actions - Hidden on Print */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/90 backdrop-blur print:hidden">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">A4 Official Invoice</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-500 transition-colors font-bold text-sm shadow-lg shadow-primary-600/20" title="Print Invoice">
              <Printer className="w-4 h-4" /> Print A4 Invoice
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Page - Optimized for A4 Printing with 100% Visual Fidelity */}
        <div 
          className="printable-area bg-white text-slate-900 min-h-[297mm] w-[210mm] flex flex-col font-serif mx-auto" 
          style={{ fontFamily: 'serif' }}
        >
          
          {/* Official Letterhead - Double Border Header Box */}
          <div className="m-[10mm] border-[3px] border-double border-slate-900 p-4 pb-2">
            <div className="flex justify-between items-start mb-2">
              {/* HR Logo */}
              <div className="w-24 h-24 flex-shrink-0">
                 <img src="/assets/logo-hr.png" alt="HR" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
              </div>

              {/* Center Info */}
              <div className="text-center flex-1 px-4">
                <h1 className="text-[34px] font-black text-slate-900 uppercase tracking-tight leading-none mb-2 underline decoration-1 underline-offset-4">
                   HAMMAD RAHIM FILLING STATION
                </h1>
                <p className="text-[13px] font-bold text-slate-800 mb-4 tracking-normal uppercase italic">
                  Muzafar Garh Road Ada Ghyl Pur District Jhang
                </p>
                
                <div className="flex items-center justify-center gap-6 text-[12px] font-bold text-slate-800">
                   <div className="flex items-center gap-1"><MessageSquare className="w-4 h-4 text-emerald-600 fill-emerald-600/10" /> +923017221831</div>
                   <div className="flex items-center gap-1"><Phone className="w-4 h-4 text-primary-600 fill-primary-600/10" /> +923000989192</div>
                   <div className="flex items-center gap-1"><Mail className="w-4 h-4 text-primary-600 fill-primary-600/10" /> hammadrahimfs@gmail.com</div>
                </div>
              </div>

              {/* GO Logo */}
              <div className="w-24 h-24 flex-shrink-0">
                 <img src="/assets/logo-go.png" alt="GO" className="w-full h-full object-contain" onError={(e) => { (e.target as any).style.display = 'none'; }} />
              </div>
            </div>

            {/* Meta Fields Inside the Header Box */}
            <div className="flex justify-between items-end mt-2 text-[15px] font-bold text-slate-900">
               <div className="flex items-baseline gap-2">
                  <span className="uppercase tracking-tight">Invoice No :</span>
                  <span className="border-b border-slate-900 min-w-[250px] pb-0.5 text-lg font-black">{entity.id.substring(0, 8).toUpperCase()}</span>
               </div>
               <div className="flex items-baseline gap-2 text-right">
                  <span className="uppercase tracking-tight">Dated :</span>
                  <span className="border-b border-slate-900 min-w-[250px] pb-0.5 text-lg font-black">{formatDate(entity.date)}</span>
               </div>
            </div>
          </div>

          <div className="px-[15mm] flex-1 flex flex-col">
            {/* Transaction Type Header */}
            <div className="text-center my-10">
               <h2 className="inline-block border-2 border-slate-900 px-8 py-2 text-2xl font-black uppercase tracking-[0.2em] bg-slate-50 shadow-sm">
                 {getInvoiceTitle()}
               </h2>
            </div>

            {/* Invoice Table */}
            <div className="flex-1">
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="border-y-2 border-slate-900 bg-slate-50">
                        <th className="py-3 px-4 text-left border-r border-slate-200 uppercase tracking-widest text-[11px] font-black">Description</th>
                        <th className="py-3 px-4 text-center border-r border-slate-200 uppercase tracking-widest text-[11px] font-black w-24">Unit</th>
                        <th className="py-3 px-4 text-right border-r border-slate-200 uppercase tracking-widest text-[11px] font-black w-32">Rate</th>
                        <th className="py-3 px-4 text-right border-r border-slate-200 uppercase tracking-widest text-[11px] font-black w-32">Qty</th>
                        <th className="py-3 px-4 text-right uppercase tracking-widest text-[11px] font-black w-40">Amount</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 min-h-[300px]">
                     <tr className="border-b border-slate-200">
                        <td className="py-6 px-4 align-top font-medium text-lg">
                           {entity.details || entity.description || 'Petroleum Product Sale'}
                           {entity.type && <span className="block text-xs text-slate-500 mt-1 uppercase">Product Category: {entity.type}</span>}
                        </td>
                        <td className="py-6 px-4 text-center align-top text-slate-500">Liters</td>
                        <td className="py-6 px-4 text-right align-top font-mono">₨ {formatCurrency(entity.rate || 0)}</td>
                        <td className="py-6 px-4 text-right align-top font-mono">{(entity.quantity || 0).toLocaleString()}</td>
                        <td className="py-6 px-4 text-right align-top font-bold text-lg font-mono">₨ {formatCurrency(entity.amount || (entity.debit || entity.credit) || 0)}</td>
                     </tr>
                     {/* Add more lines if needed for multi-line invoices in future */}
                     {Array.from({ length: 10 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50 h-10 print:visible invisible">
                           <td colSpan={5}></td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot>
                     <tr className="border-t-2 border-slate-900 font-black">
                        <td colSpan={4} className="py-4 px-4 text-right uppercase tracking-widest text-xs">Net Total (PKR):</td>
                        <td className="py-4 px-4 text-right text-2xl font-mono">
                           ₨ {formatCurrency(entity.totalAmount || entity.amount || (entity.debit || entity.credit) || 0)}
                        </td>
                     </tr>
                  </tfoot>
               </table>

               {/* Total in Words - Simple implementation */}
               <div className="mt-4 text-[10px] text-slate-400 italic">
                  Note: Standard terms and conditions apply.
               </div>
            </div>

            {/* Footer Signature */}
            <div className="mt-auto pt-20">
               <div className="flex justify-between items-end">
                  <div className="text-[11px] font-bold text-slate-500 border-t border-slate-300 pt-2 min-w-[250px]">
                     This is computerized generated bill <br />
                     Errors and Emission are accepted
                  </div>
                  
                  <div className="text-right flex flex-col items-center">
                     {/* Placeholder for Signature Image */}
                     <div className="mb-[-20px] pr-10 opacity-80 scale-75">
                        <img src="/assets/signature.png" alt="" className="h-16" onError={(e) => { (e.target as any).style.display = 'none'; }} />
                     </div>
                     <div className="w-[300px] border-t-2 border-slate-900 flex flex-col items-start pt-2 px-1">
                        <span className="font-black text-base uppercase">Muhammad Hammad Rahim</span>
                        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left w-full">CEO Hammad Rahim Filling station</span>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body > *:not(.fixed) { display: none !important; }
          .fixed:not(.z-50) { display: none !important; }
          .modal-overlay, .backdrop-blur-sm { background: white !important; padding: 0 !important; position: static !important; }
          .print-hidden, .print\\:hidden, button { display: none !important; }
          .printable-area { display: flex !important; visibility: visible !important; width: 210mm !important; height: 297mm !important; margin: 0 auto !important; border: none !important; position: relative !important; left: 0 !important; top: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
