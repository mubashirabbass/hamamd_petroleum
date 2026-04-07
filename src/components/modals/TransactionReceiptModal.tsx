import { useEffect, useRef } from 'react';
import { X, Printer } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';

// ── Amount in words ──────────────────────────────────────────────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
function toWords(n: number): string {
  const i = Math.floor(Math.abs(n));
  function conv(x: number): string {
    if (x === 0) return '';
    if (x < 20) return ONES[x] + ' ';
    if (x < 100) return TENS[Math.floor(x / 10)] + (x % 10 ? ' ' + ONES[x % 10] : '') + ' ';
    if (x < 1000) return ONES[Math.floor(x / 100)] + ' Hundred ' + conv(x % 100);
    if (x < 100000) return conv(Math.floor(x / 1000)) + 'Thousand ' + conv(x % 1000);
    if (x < 10000000) return conv(Math.floor(x / 100000)) + 'Lakh ' + conv(x % 100000);
    return conv(Math.floor(x / 10000000)) + 'Crore ' + conv(x % 10000000);
  }
  return i === 0 ? 'PKR Zero Only' : 'PKR ' + conv(i).trim() + ' Only';
}

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

  const total = entity.totalAmount || entity.amount || (entity.debit || entity.credit) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-white print:p-0 print:block overflow-y-auto">
      <div 
        ref={modalRef} 
        className="w-full max-w-[800px] bg-white shadow-2xl relative print:shadow-none print:w-[210mm] print:m-0 mx-auto"
      >
        {/* Header Actions - Hidden on Print */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/95 backdrop-blur print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Official Bill Preview</h2>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white rounded hover:bg-slate-800 transition-all font-black text-[10px] uppercase tracking-wider shadow-sm" 
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" /> 
              Print A4 Bill
            </button>
            <button 
              onClick={onClose} 
              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The Exact High-Fidelity Bill Restoration */}
        <div 
          className="printable-area bg-white text-slate-900 flex flex-col mx-auto" 
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          
          {/* Header */}
          <div className="m-[8mm] border-[3px] border-double border-[#111] p-[2px]">
            <div className="border border-[#111] p-[6px_10px]">
              <div className="flex justify-between items-center gap-[10px]">
                <div className="w-[70px] h-[70px] flex items-center justify-center">
                   <img src="/assets/logo-hr.png" alt="HR" className="max-w-full max-h-full object-contain" />
                </div>
                <div className="text-center flex-1">
                  <h1 className="text-[24px] font-[1000] uppercase underline underline-offset-[3px] leading-none mb-1">HAMMAD RAHIM FILLING STATION</h1>
                  <p className="text-[10.5px] font-bold italic uppercase mb-0.5">Muzafar Garh Road, Ada Ghyl Pur, District Jhang</p>
                  <div className="flex justify-center gap-[15px] text-[10px] font-black">
                     <span>📱 WhatsApp: +92-301-7221831</span>
                     <span>📞 Phone: +92-300-0989192</span>
                  </div>
                </div>
                <div className="w-[70px] h-[70px] flex items-center justify-center">
                   <img src="/assets/logo-go.png" alt="GO" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
            </div>
          </div>

          <div className="mx-[8mm] flex justify-between border-[1.5px] border-[#111] p-[5px_12px] mb-2 text-[10.5px] font-[1000] uppercase bg-[#f5f5f5]">
            <div className="flex gap-4">
              <span>Document: {getInvoiceTitle()}</span>
              <span>Product: {entity.type || 'N/A'}</span>
            </div>
            <div className="flex gap-4 text-right">
              <span>Invoice No: {entity.billNo || entity.invoiceNo || 'LEGACY'}</span>
              <span>Dated: {formatDate(entity.date)}</span>
            </div>
          </div>

          <div className="px-[12mm] flex-1 flex flex-col pt-4">
               <table className="w-full border-collapse">
                  <thead>
                     <tr className="border-y-[1.5px] border-[#111] bg-[#ececec]">
                        <th className="py-1 px-2 text-left border-r border-[#bbb] uppercase text-[10px] font-[1000]">Description (Bill Details)</th>
                        <th className="py-1 px-2 text-center border-r border-[#bbb] uppercase text-[10px] font-[1000] w-24">Unit</th>
                        <th className="py-1 px-2 text-right border-r border-[#bbb] uppercase text-[10px] font-[1000] w-32">Rate (₨)</th>
                        <th className="py-1 px-2 text-right border-r border-[#bbb] uppercase text-[10px] font-[1000] w-32">Qty (L)</th>
                        <th className="py-1 px-2 text-right uppercase text-[10px] font-[1000] w-40">Amount (₨)</th>
                     </tr>
                  </thead>
                  <tbody>
                     <tr className="border-b border-slate-300">
                        <td className="py-5 px-2 align-top font-[1000] text-[17px] text-black">
                           {entity.details || entity.description || 'Petroleum Product Sale'}
                        </td>
                        <td className="py-5 px-2 text-center align-top font-bold text-[14px]">Liters</td>
                        <td className="py-5 px-2 text-right align-top font-bold text-[14px]">₨ {formatCurrency(entity.rate || 0)}</td>
                        <td className="py-5 px-2 text-right align-top font-bold text-[14px]">{(entity.quantity || 0).toLocaleString()}</td>
                        <td className="py-5 px-2 text-right align-top font-[1000] text-[18px]">₨ {formatCurrency(total)}</td>
                     </tr>
                     {/* Compact Spacers */}
                     {Array.from({ length: 12 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50 h-[30px] print:visible invisible">
                           <td colSpan={5}></td>
                        </tr>
                     ))}
                  </tbody>
                  <tfoot className="border-t-[1.5px] border-[#111]">
                      <tr>
                         <td colSpan={3} className="py-2 px-2 text-right uppercase text-[9.5px] font-[1000] border-r border-[#bbb] bg-[#f9f9f9]">Accumulated Transaction Result:</td>
                         <td className="py-2 px-2 text-right text-[11px] font-[1000] border-r border-[#bbb]">{(entity.quantity || 0).toLocaleString()} L</td>
                         <td className="py-2 px-2 text-right text-[11px] font-[1000]">₨ {formatCurrency(total)}</td>
                      </tr>
                   </tfoot>
               </table>

             <div className="mt-6 pb-[10mm]">
                <div className="border-[1.5px] border-[#111] grid grid-cols-2">
                   <div className="p-[8px_12px] border-r-[1.5px] border-[#111]">
                      <div className="text-[9.5px] font-[1000] uppercase mb-0.5">Total Quantity (Net)</div>
                      <div className="text-[17px] font-[1000] italic">{(entity.quantity || 0).toLocaleString()} L</div>
                   </div>
                   <div className="p-[8px_12px] bg-[#f0f0f0]">
                      <div className="text-[9.5px] font-[1000] uppercase mb-0.5">Gross Bill Amount</div>
                      <div className="text-[22px] font-[1000] border-b-2 border-black inline-block leading-none pb-1">₨ {formatCurrency(total)}</div>
                   </div>
                </div>
                <div className="p-[8px_12px] border-[1.5px] border-[#111] border-t-0 italic text-[11px] font-[1000] bg-[#fdfdfd]">
                  Amount In Words: <span className="uppercase ml-2 border-b border-black">{toWords(total)}</span>
                </div>

                <div className="flex justify-between items-end pt-8">
                   <div className="text-[10.5px] font-bold italic border-l-3 border-[#111] pl-3 leading-tight uppercase">
                      * Verified Computerized Entry <br />
                      * Errors and Omissions Accepted <br />
                      * Official Stamp Required
                   </div>
                   <div className="text-right w-[240px]">
                      <div className="h-[60px] flex items-end justify-end mb-1">
                         <img src="/assets/imtiaz-sign.png" alt="" className="max-h-full max-w-[170px] object-contain" />
                      </div>
                      <div className="border-t-2 border-[#111] pt-1">
                         <div className="text-[14px] font-[1000] uppercase">Muhammad Imtiaz ul Hassan</div>
                         <div className="text-[9.5px] font-[1000] uppercase text-[#444]">CEO Hammad Rahim Filling station</div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          html, body { width: 210mm; height: 297mm; margin: 0; padding: 0; background: white; }
          body > *:not(.fixed) { display: none !important; }
          .fixed { position: static !important; display: block !important; background: white !important; padding: 0 !important; margin: 0 !important; }
          .fixed > div { box-shadow: none !important; border: none !important; max-width: none !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border-radius: 0 !important; }
          .print-hidden, .print\\:hidden, .sticky, button { display: none !important; }
          .printable-area { display: flex !important; visibility: visible !important; width: 210mm !important; margin: 0 auto !important; position: static !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Times New Roman', Times, serif !important; }
          @page { size: A4 portrait; margin: 0; }
        }
      `}} />
    </div>
  );
}
