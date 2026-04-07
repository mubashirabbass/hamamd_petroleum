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

  const getInvoiceTitle = () => {
    if (type === 'sale') return `Sale Invoice - ${entity.type || ''}`;
    if (type === 'purchase') return `Purchase Bill - ${entity.type || ''}`;
    if (title) return title;
    return `${type.charAt(0).toUpperCase() + type.slice(1)} Receipt`;
  };

  const total = entity.amount || (entity.debit || entity.credit) || 0;

  const getHeaders = () => {
    if (type === 'sale' || type === 'purchase') {
      return [
        { label: 'Description (Bill Details)', width: '50%', align: 'left' },
        { label: 'Unit', width: '15%', align: 'center' },
        { label: 'Rate (₨)', width: '15%', align: 'right' },
        { label: 'Qty (L)', width: '15%', align: 'right' },
        { label: 'Amount (₨)', width: '25%', align: 'right' }
      ];
    }
    if (type === 'ledger' || type === 'asset' || type === 'liability') {
      return [
        { label: 'Description (Particulars)', width: '55%', align: 'left' },
        { label: 'Debit (₨)', width: '20%', align: 'right' },
        { label: 'Credit (₨)', width: '20%', align: 'right' },
        { label: 'Balance (₨)', width: '25%', align: 'right' }
      ];
    }
    if (type === 'expense') {
      return [
        { label: 'Description (Expense Details)', width: '70%', align: 'left' },
        { label: 'Amount (₨)', width: '30%', align: 'right' }
      ];
    }
    return [];
  };

  const getRowData = () => {
    if (type === 'sale' || type === 'purchase') {
      return [
        { value: entity.details || entity.description || 'Petroleum Product Sale', align: 'left', className: 'item-details' },
        { value: 'Liters', align: 'center' },
        { value: `₨ ${formatCurrency(entity.rate || 0)}`, align: 'right' },
        { value: (entity.quantity || 0).toLocaleString(), align: 'right' },
        { value: `₨ ${formatCurrency(entity.amount || 0)}`, align: 'right', className: 'font-black text-[18px]' }
      ];
    }
    if (type === 'ledger' || type === 'asset' || type === 'liability') {
      return [
        { value: entity.description || 'N/A', align: 'left', className: 'item-details' },
        { value: entity.debit ? `₨ ${formatCurrency(entity.debit)}` : '—', align: 'right' },
        { value: entity.credit ? `₨ ${formatCurrency(entity.credit)}` : '—', align: 'right' },
        { value: `₨ ${formatCurrency(entity.balance || 0)}`, align: 'right', className: 'font-black text-[18px]' }
      ];
    }
    if (type === 'expense') {
      return [
        { value: entity.details || 'N/A', align: 'left', className: 'item-details' },
        { value: `₨ ${formatCurrency(entity.amount || 0)}`, align: 'right', className: 'font-black text-[18px]' }
      ];
    }
    return [];
  };

  const handlePrint = () => {
    const invTitle = getInvoiceTitle();
    const invNo = entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———';
    const invDate = formatDate(entity.date);
    const headers = getHeaders();
    const rows = getRowData();
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${invTitle} — ${invNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 10mm 15mm; margin: 0 auto; background: #fff; display: flex; flex-direction: column; }
  .header-box { border: 3px double #111; padding: 2px; margin-bottom: 8px; }
  .header-inner { border: 1px solid #111; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .logo-box { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .center-info { text-align: center; flex: 1; }
  h1 { font-size: 24px; font-weight: 1000; text-transform: uppercase; line-height: 1.1; margin-bottom: 2px; }
  .address { font-size: 10.5px; font-weight: 700; font-style: italic; text-transform: uppercase; margin-bottom: 3px; }
  .contact { display: flex; justify-content: center; gap: 15px; font-size: 10px; font-weight: 900; }
  .meta-bar { display: flex; justify-content: space-between; border: 1.5px solid #111; padding: 5px 12px; margin-bottom: 10px; font-size: 10.5px; font-weight: 1000; text-transform: uppercase; background: #f5f5f5; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; border-left: 1.5px solid #111; border-right: 1.5px solid #111; border-bottom: 1.5px solid #111; }
  th { border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; background: #ececec; padding: 4px 6px; font-size: 10.5px; font-weight: 1000; text-transform: uppercase; text-align: left; border-right: 1px solid #bbb; }
  th:last-child { border-right: none; }
  td { padding: 10px 8px; border-bottom: 1.5px solid #111; font-size: 14px; font-weight: 700; vertical-align: top; }
  .item-details { font-size: 17px; font-weight: 1000; color: #000; margin-bottom: 5px; }
  .flex-spacer { flex: 1; }
  .totals-section { padding-top: 20px; }
  .total-grid { border: 1.5px solid #111; display: grid; grid-template-columns: 1fr 1fr; background: #fff; }
  .total-cell { padding: 8px 12px; }
  .total-label { font-size: 10px; font-weight: 1000; text-transform: uppercase; margin-bottom: 2px; }
  .total-value-qty { font-size: 18px; font-weight: 1000; font-style: italic; }
  .total-value-amt { font-size: 22px; font-weight: 1000; display: inline-block; line-height: 1; padding-bottom: 2px; white-space: nowrap; }
  .words-box { border: 1.5px solid #111; border-top: none; padding: 8px 12px; font-size: 11.5px; font-weight: 1000; font-style: italic; background: #fdfdfd; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 30px; }
  .legal-note { font-size: 10.5px; font-weight: 800; font-style: italic; border-left: 3px solid #111; padding-left: 12px; line-height: 1.3; text-transform: uppercase; }
  .signature-block { text-align: center; width: 280px; }
  .sign-img { height: 60px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px; }
  .sign-line { border-top: 2px solid #111; padding-top: 4px; margin-top: 4px; }
  .ceo-name { font-size: 16px; font-weight: 1000; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
  .ceo-title { font-size: 10.5px; font-weight: 900; text-transform: uppercase; color: #111; margin-top: 2px; }
  @media print { @page { size: A4 portrait; margin: 0; } .page { margin: 0; width: 100%; height: 100%; } }
</style>
</head>
<body>
  <div class="page">
    <div class="header-box">
      <div class="header-inner">
        <div class="logo-box">
          <img src="/assets/logo-hr.png" alt="HR" onerror="this.style.display='none'"/>
        </div>
        <div class="center-info">
          <h1>HAMMAD RAHIM FILLING STATION</h1>
          <p class="address">Muzafar Garh Road, Ada Ghyl Pur, District Jhang</p>
          <div class="contact">
            <span>📱 WhatsApp: +92-301-7221831</span>
            <span>📞 Phone: +92-300-0989192</span>
          </div>
        </div>
        <div class="logo-box">
          <img src="/assets/logo-go.png" alt="GO" onerror="this.style.display='none'"/>
        </div>
      </div>
    </div>

    <div class="meta-bar">
      <div style="flex: 1; text-align: left;">Invoice No: ${invNo}</div>
      <div style="flex: 1; text-align: center;">${type === 'sale' || type === 'purchase' ? `Product: ${entity.type || 'N/A'}` : `Bill Title : ${type.toUpperCase()}`}</div>
      <div style="flex: 1; text-align: right;">Dated: ${invDate}</div>
    </div>

    <table>
      <thead>
        <tr>
          ${headers.map(h => `<th style="width: ${h.width}; text-align: ${h.align};">${h.label}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        <tr>
          ${rows.map(r => `<td style="text-align: ${r.align};" class="${r.className || r.className === 'item-details' ? r.className : ''}">${r.value}</td>`).join('')}
        </tr>
      </tbody>
      <tfoot>
        <tr style="border-top: 2px solid #111; border-bottom: 2px solid #111; background: #fafafa;">
          <td colspan="${headers.length - 1}" style="text-align: right; padding: 12px 12px; font-weight: 1000; text-transform: uppercase;">Total Receipt Amount</td>
          <td style="text-align: right; padding: 12px 12px; font-weight: 1000; font-size: 16px; border-left: 1px solid #ddd; white-space: nowrap;">₨ ${formatCurrency(total)}</td>
        </tr>
      </tfoot>
    </table>

    <div class="flex-spacer"></div>

    <div class="totals-section">
      <div class="total-grid">
        <div class="total-cell" style="border-right: 1.5px solid #111;">
          <div class="total-label">Transaction Reference</div>
          <div class="total-value-qty">${invNo}</div>
        </div>
        <div class="total-cell" style="background: #f0f0f0;">
          <div class="total-label">Net Payable Amount</div>
          <div class="total-value-amt">₨ ${formatCurrency(total)}</div>
        </div>
      </div>
      <div class="words-box">
        Amount In Words: <span style="text-transform: uppercase;">${toWords(total)}</span>
      </div>

      <div class="footer">
        <div class="legal-note">
          * Verified Computerized Entry <br />
          * Errors and Omissions Accepted
        </div>
        <div class="signature-block">
          <div class="sign-img">
            <img src="/assets/imtiaz-sign.png" alt="" style="max-height: 100%; max-width: 160px; object-fit: contain;" onerror="this.style.display='none'"/>
          </div>
          <div class="sign-line">
            <div class="ceo-name">Muhammad Imtiaz ul Hassan</div>
            <div class="ceo-title">CEO Hammad Rahim Filling station</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) { alert('Please allow popups to print the bill.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.onload = () => { win.focus(); setTimeout(() => win.print(), 350); };
  };

  const headers = getHeaders();
  const rows = getRowData();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
      <div 
        ref={modalRef} 
        className="w-full max-w-[850px] max-h-[95vh] bg-white shadow-2xl relative mx-auto rounded-xl overflow-hidden flex flex-col"
      >
        {/* Header Actions - Fixed at Top */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Official Bill Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-all font-black text-[11px] uppercase tracking-wider shadow-lg shadow-slate-900/20" 
              title="Print Invoice"
            >
              <Printer className="w-4 h-4" /> 
              Print A4 Bill
            </button>
            <button 
              onClick={onClose} 
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Bill Preview - PERFECTED A4 LAYOUT */}
        <div className="p-8 bg-slate-100/50 flex-1 overflow-y-auto custom-scrollbar">
           <div 
             className="bg-white shadow-[0_0_40px_rgba(0,0,0,0.05)] mx-auto w-[210mm] min-h-[297mm] p-[10mm_15mm] flex flex-col"
             style={{ fontFamily: "'Times New Roman', Times, serif" }}
           >
              {/* Header Restoration */}
              <div className="border-[3px] border-double border-[#111] p-[2px] mb-2">
                <div className="border border-[#111] p-[6px_10px] flex justify-between items-center gap-[10px]">
                  <div className="w-[70px] h-[70px] flex items-center justify-center">
                    <img src="/assets/logo-hr.png" alt="HR" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="text-center flex-1">
                    <h1 className="text-[24px] font-black uppercase leading-[1.1] mb-1">HAMMAD RAHIM FILLING STATION</h1>
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

              {/* Meta Restoration */}
              <div className="flex items-center border-[1.5px] border-[#111] p-[5px_12px] mb-2 text-[10.5px] font-black uppercase bg-[#f5f5f5]">
                <div className="flex-1 text-left">Invoice No: {entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———'}</div>
                  {type === 'sale' || type === 'purchase' ? `Product: ${entity.type || 'N/A'}` : `Bill Title : ${type.toUpperCase()}`}
                <div className="flex-1 text-right">Dated: {formatDate(entity.date)}</div>
              </div>

              {/* Table Restoration */}
              <div className="mt-4">
                <table className="w-full border-collapse border-x-[1.5px] border-b-[1.5px] border-[#111]">
                   <thead>
                      <tr className="border-y-[1.5px] border-[#111] bg-[#ececec]">
                        {headers.map((h, idx) => (
                           <th key={idx} className={`p-[4px_6px] text-${h.align} text-[10.5px] font-black uppercase border-r border-[#bbb] last:border-r-0`} style={{ width: h.width }}>{h.label}</th>
                        ))}
                      </tr>
                   </thead>
                   <tbody>
                      <tr>
                        {rows.map((r, idx) => (
                           <td key={idx} className={`p-[15px_8px] text-${r.align} align-top border-b-[1.5px] border-[#111] ${r.className || ''}`}>{r.value}</td>
                        ))}
                      </tr>
                   </tbody>
                   <tfoot>
                     <tr className="bg-[#fcfcfc] border-y-[2px] border-[#111]">
                       <td colSpan={headers.length - 1} className="p-[12px_12px] text-right text-[12px] font-black uppercase border-r border-[#bbb]">Total Bill Amount</td>
                       <td className="p-[12px_12px] text-right font-black text-[18px] text-nowrap">₨ {formatCurrency(total)}</td>
                     </tr>
                   </tfoot>
                </table>
              </div>

              {/* Spacing */}
              <div className="flex-1"></div>

              {/* Totals Restoration */}
              <div className="pt-8 mb-[10mm]">
                <div className="border-[1.5px] border-[#111] grid grid-cols-2 bg-white">
                   <div className="p-[8px_12px] border-r-[1.5px] border-[#111]">
                      <div className="text-[10px] font-black uppercase mb-0.5">Reference No.</div>
                      <div className="text-[18px] font-black italic">{entity.billNo || entity.invoiceNo || entity.id?.slice(0, 8).toUpperCase() || '———'}</div>
                   </div>
                   <div className="p-[8px_12px] bg-[#f0f0f0]">
                      <div className="text-[10px] font-black uppercase mb-0.5">Gross Bill Amount</div>
                      <div className="text-[22px] font-black inline-block leading-none pb-1 whitespace-nowrap">₨ {formatCurrency(total)}</div>
                   </div>
                </div>
                <div className="border-[1.5px] border-[#111] border-t-0 p-[8px_12px] italic text-[11px] font-black bg-[#fdfdfd]">
                  Amount In Words: <span className="uppercase ml-2">{toWords(total)}</span>
                </div>

                <div className="flex justify-between items-end pt-10">
                   <div className="text-[10.5px] font-bold italic border-l-3 border-[#111] pl-3 leading-tight uppercase text-left">
                      * Verified Computerized Entry <br />
                      * Errors and Omissions Accepted
                   </div>
                   <div className="text-center w-[280px]">
                      <div className="h-[60px] flex items-end justify-center mb-1">
                         <img src="/assets/imtiaz-sign.png" alt="" className="max-h-full max-w-[170px] object-contain" />
                      </div>
                      <div className="border-t-[2.5px] border-[#111] pt-1.5">
                         <div className="text-[16px] font-black uppercase text-black whitespace-nowrap">Muhammad Imtiaz ul Hassan</div>
                         <div className="text-[10.5px] font-bold uppercase text-[#111] mt-1 whitespace-nowrap">CEO Hammad Rahim Filling station</div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
