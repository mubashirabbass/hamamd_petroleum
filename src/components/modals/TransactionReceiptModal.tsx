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

  const total = entity.totalAmount || entity.amount || (entity.debit || entity.credit) || 0;

  const handlePrint = () => {
    const invTitle = getInvoiceTitle();
    const invNo = entity.billNo || entity.invoiceNo || 'LEGACY-TRX';
    const invDate = formatDate(entity.date);
    
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>${invTitle} — ${invNo}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; padding: 10mm 15mm; margin: 0 auto; background: #fff; display: flex; flex-direction: column; }
  .header-box { border: 3px double #111; padding: 2px; margin-bottom: 8px; }
  .header-inner { border: 1px solid #111; padding: 6px 10px; display: flex; justify-content: space-between; align-items: center; gap: 10px; }
  .logo-box { width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; }
  .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .center-info { text-align: center; flex: 1; }
  h1 { font-size: 24px; font-weight: 1000; text-transform: uppercase; text-decoration: underline; text-underline-offset: 3px; line-height: 1; margin-bottom: 1px; }
  .address { font-size: 10.5px; font-weight: 700; font-style: italic; text-transform: uppercase; margin-bottom: 2px; }
  .contact { display: flex; justify-content: center; gap: 15px; font-size: 10px; font-weight: 900; }
  .meta-bar { display: flex; justify-content: space-between; border: 1.5px solid #111; padding: 5px 12px; margin-bottom: 8px; font-size: 10.5px; font-weight: 1000; text-transform: uppercase; background: #f5f5f5; }
  table { width: 100%; border-collapse: collapse; margin-top: 15px; }
  th { border-top: 1.5px solid #111; border-bottom: 1.5px solid #111; background: #ececec; padding: 3px 6px; font-size: 10.5px; font-weight: 1000; text-transform: uppercase; text-align: left; border-right: 1px solid #bbb; }
  th:last-child { border-right: none; }
  td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 14px; font-weight: 700; vertical-align: top; }
  .item-details { font-size: 17px; font-weight: 1000; color: #000; margin-bottom: 2px; }
  .totals-section { margin-top: auto; padding-top: 15px; }
  .total-grid { border: 1.5px solid #111; display: grid; grid-template-columns: 1fr 1fr; background: #fff; }
  .total-cell { padding: 6px 12px; }
  .total-label { font-size: 10px; font-weight: 1000; text-transform: uppercase; margin-bottom: 1px; }
  .total-value-qty { font-size: 18px; font-weight: 1000; italic; }
  .total-value-amt { font-size: 22px; font-weight: 1000; border-bottom: 2px solid #000; display: inline-block; line-height: 1; }
  .words-box { border: 1.5px solid #111; border-top: none; padding: 6px 12px; font-size: 11px; font-weight: 1000; font-style: italic; background: #fdfdfd; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; padding-top: 15px; }
  .legal-note { font-size: 10.5px; font-weight: 700; font-style: italic; border-left: 2.5px solid #111; padding-left: 10px; line-height: 1.2; text-transform: uppercase; }
  .signature-block { text-align: right; width: 220px; }
  .sign-img { height: 50px; display: flex; align-items: flex-end; justify-content: flex-end; margin-bottom: 1px; }
  .sign-line { border-top: 2px solid #111; padding-top: 2px; margin-top: 2px; }
  .ceo-name { font-size: 13.5px; font-weight: 1000; text-transform: uppercase; }
  .ceo-title { font-size: 9.5px; font-weight: 900; text-transform: uppercase; color: #444; }
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
      <div>
        <span>Document: ${invTitle}</span> &nbsp;&nbsp;&nbsp;
        <span>Product: ${entity.type || 'N/A'}</span>
      </div>
      <div>
        <span>Invoice No: ${invNo}</span> &nbsp;&nbsp;&nbsp;
        <span>Dated: ${invDate}</span>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 50%;">Description (Bill Details)</th>
          <th style="text-align: center; width: 15%;">Unit</th>
          <th style="text-align: right; width: 15%;">Rate (₨)</th>
          <th style="text-align: right; width: 15%;">Qty (L)</th>
          <th style="text-align: right; width: 25%;">Amount (₨)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <div class="item-details">${entity.details || entity.description || 'Petroleum Product Sale'}</div>
          </td>
          <td style="text-align: center;">Liters</td>
          <td style="text-align: right;">₨ ${formatCurrency(entity.rate || 0)}</td>
          <td style="text-align: right;">${(entity.quantity || 0).toLocaleString()}</td>
          <td style="text-align: right;">₨ ${formatCurrency(total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals-section">
      <div class="total-grid">
        <div class="total-cell" style="border-right: 1.5px solid #111;">
          <div class="total-label">Total Quantity (Net)</div>
          <div class="total-value-qty">${(entity.quantity || 0).toLocaleString()} L</div>
        </div>
        <div class="total-cell" style="background: #f0f0f0;">
          <div class="total-label">Gross Bill Amount</div>
          <div class="total-value-amt">₨ ${formatCurrency(total)}</div>
        </div>
      </div>
      <div class="words-box">
        Amount In Words: <span style="text-transform: uppercase;">${toWords(total)}</span>
      </div>

      <div class="footer">
        <div class="legal-note">
          * Verified Computerized Entry <br />
          * Errors and Omissions Accepted <br />
          * Official Stamp Required
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden overflow-y-auto">
      <div 
        ref={modalRef} 
        className="w-full max-w-[800px] bg-white shadow-2xl relative mx-auto rounded-xl overflow-hidden"
      >
        {/* Compact Header Actions */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse"></div>
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

        {/* Simplified Preview for Screen */}
        <div className="p-8 bg-slate-50 min-h-[500px] flex items-center justify-center">
            <div className="bg-white p-8 shadow-sm border border-slate-200 rounded-lg max-w-md w-full text-center">
                <Printer className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Print</h3>
                <p className="text-slate-500 text-sm mb-6">Click the "Print A4 Bill" button above to generate the official high-fidelity document for {getInvoiceTitle()}.</p>
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest border-t pt-4">
                    Invoice: {entity.billNo || entity.invoiceNo || 'LEGACY'}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
