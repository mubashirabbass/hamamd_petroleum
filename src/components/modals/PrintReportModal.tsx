import { useRef, useState } from 'react';
import { X, Printer, FileText, Download, Loader2 } from 'lucide-react';
import { formatCurrency, formatDate } from '../../lib/utils';
import PrintHeader from '../printing/PrintHeader';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface Props {
  data: any[];
  type: 'sale' | 'purchase' | 'expense' | 'asset' | 'liability' | 'customer' | 'stock';
  onClose: () => void;
  title?: string;
  customerPhone?: string;
}

const ROWS_PER_PAGE = 22;

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

export default function PrintReportModal({ data, type, onClose, title: customTitle, customerPhone }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handlePrint = () => {
    const fc = (n: number) => formatCurrency(n);
    const fd = (d: string) => formatDate(d);
    const sum = (arr: any[], k: string) => arr.reduce((s, x) => s + (x[k] || 0), 0);

    const isLedger = type === 'asset' || type === 'liability' || type === 'customer';
    const isSale = type === 'sale';
    const isPurchase = type === 'purchase';
    const isStock = type === 'stock';

    let grandTotal = 0;
    let totalQty = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    if (isSale) {
      grandTotal = sum(data, 'amount');
      totalQty = sum(data, 'quantity');
    } else if (isPurchase) {
      grandTotal = sum(data, 'totalAmount');
      totalQty = sum(data, 'quantity');
    } else if (isLedger) {
      totalDebit = sum(data, 'debit');
      totalCredit = sum(data, 'credit');
      grandTotal = totalDebit - totalCredit;
    } else if (isStock) {
      grandTotal = data[data.length - 1]?.balance || 0;
    } else {
      grandTotal = sum(data, 'amount');
    }

    const HEADER = `
      <div style="border:4px double #111;padding:2px;margin-bottom:10px;">
        <div style="border:1.2px solid #111;padding:10px 15px;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <img src="/assets/logo-hr.png" style="width:80px;height:80px;object-fit:contain;" />
            <div style="text-align:center;flex:1;">
              <div style="font-size:26px;font-weight:900;text-transform:uppercase;letter-spacing:1px;">Hammad Rahim Filling Station</div>
              <div style="font-size:10px;font-weight:700;font-style:italic;text-transform:uppercase;color:#444;margin-top:3px;">Muzafar Garh Road, Ada Ghyl Pur, District Jhang</div>
              <div style="display:flex;justify-content:center;gap:15px;font-size:9px;font-weight:900;text-transform:uppercase;margin-top:8px;">
                <span>&#128222; +92-301-7221831</span><span>|</span><span>&#128222; +92-300-0989192</span>
              </div>
            </div>
            <img src="/assets/logo-go.png" style="width:80px;height:80px;object-fit:contain;" />
          </div>
        </div>
      </div>`;

    const colCount = isPurchase ? 9 : (isSale || isLedger || isStock) ? 5 : 3;
    const TH = (txt: string, w = '', align = 'left', last = false) =>
      `<th style="padding:6px ${isPurchase ? '2px' : '8px'};border-right:${last ? 'none' : '1px solid #111'};text-align:${align};${w ? `width:${w};` : ''}">${txt}</th>`;

    let thead = '';
    if (isPurchase) thead = [TH('Date','60px'),TH('Inv. No','65px'),TH('Description'),TH('Vehicle','65px'),TH('Rate','55px','right'),TH('Qty (L)','55px','right'),TH('Carriage','65px','right'),TH('Amount','85px','right'),TH('Total','95px','right',true)].join('');
    else if (isSale) thead = [TH('Date'),TH('Description'),TH('Rate','','right'),TH('Qty (L)','','right'),TH('Amount','','right',true)].join('');
    else if (isLedger) thead = [TH('Date'),TH('Description'),(type==='asset'?TH('Debit (In)','130px','right'):type==='liability'?TH('Debit (Paid)','130px','right'):TH('Debit','130px','right')),(type==='asset'?TH('Credit (Out)','130px','right'):type==='liability'?TH('Credit (Owed)','130px','right'):TH('Credit','130px','right')),(type==='asset'?TH('Valuation','140px','right',true):TH('Balance','140px','right',true))].join('');
    else if (isStock) thead = [TH('Date'),TH('Details'),TH('In (L)','','right'),TH('Out (L)','','right'),TH('Balance','','right',true)].join('');
    else thead = [TH('Date'),TH('Description'),TH('Amount','','right',true)].join('');

    const TD = (txt: string|number, style = '') => `<td style="padding:${isPurchase?'5px 2px':'7px 8px'};border-right:1px solid #f0f0f0;${style}">${txt ?? '—'}</td>`;
    const TDL = (txt: string|number, style = '') => `<td style="padding:${isPurchase?'5px 2px':'7px 8px'};${style}">${txt ?? '—'}</td>`;

    const buildRow = (row: any) => {
      const bv = row.balance ?? 0;
      const bt = type==='customer' ? `${fc(Math.abs(bv))} ${bv>=0?'(Dr)':'(Cr)'}` : `₨ ${fc(bv)}`;
      if (isPurchase) return [TD(fd(row.date)),TD(row.invoiceNo||'—','font-weight:bold;'),TD(row.description||'—','font-size:9px;'),TD(row.vehicleNo||'—'),TD(fc(row.rate),'text-align:right;'),TD(row.quantity?.toLocaleString(),'text-align:right;font-weight:bold;'),TD(fc(row.carriage),'text-align:right;'),TD(fc(row.amount),'text-align:right;'),TDL(fc(row.totalAmount),'text-align:right;font-weight:bold;')].join('');
      if (isSale) return [TD(fd(row.date)),TD(row.description||'—'),TD(fc(row.rate),'text-align:right;'),TD(row.quantity?.toLocaleString(),'text-align:right;font-weight:bold;'),TDL(fc(row.amount),'text-align:right;font-weight:bold;')].join('');
      if (isLedger) return [TD(fd(row.date)),TD(row.description||row.details||row.type||'—'),TD(row.debit?fc(row.debit):'—','text-align:right;color:#dc2626;'),TD(row.credit?fc(row.credit):'—','text-align:right;color:#059669;'),TDL(type==='customer'?bt:fc(row.balance),'text-align:right;font-weight:bold;')].join('');
      if (isStock) return [TD(fd(row.date)),TD(row.description||row.details||row.type||'—'),TD(row.qtyIn?`+${row.qtyIn.toLocaleString()}`:'—','text-align:right;color:#059669;'),TD(row.qtyOut?`-${row.qtyOut.toLocaleString()}`:'—','text-align:right;color:#dc2626;'),TDL(`${row.balance?.toLocaleString()} L`,'text-align:right;font-weight:bold;')].join('');
      return [TD(fd(row.date)),TD(row.description||row.details||row.type||'—'),TDL(fc(row.amount),'text-align:right;font-weight:bold;')].join('');
    };

    const buildPageTotal = (chunk: any[]) => {
      const pageQty = sum(chunk, 'quantity');
      const pageAmt = sum(chunk, 'amount');
      const pageDebit = sum(chunk, 'debit');
      const pageCredit = sum(chunk, 'credit');
      const pageTotalAmt = sum(chunk, 'totalAmount');
      const pageCarriage = sum(chunk, 'carriage');
      const pageIn = sum(chunk, 'qtyIn');
      const pageOut = sum(chunk, 'qtyOut');

      const rowStyle = 'background:#f9f9f9;font-weight:900;border-top:2px solid #111;';
      const grandStyle = 'background:#f0f0f0;font-weight:900;border-top:1px solid #111;';

      if (isPurchase) {
        return `
          <tr style="${rowStyle}"><td colspan="5" style="padding:5px 2px;text-align:right;">PAGE TOTAL:</td><td style="padding:5px 2px;text-align:right;">${pageQty.toLocaleString()} L</td><td style="padding:5px 2px;text-align:right;">₨ ${fc(pageCarriage)}</td><td style="padding:5px 2px;text-align:right;">₨ ${fc(pageAmt)}</td><td style="padding:5px 2px;text-align:right;">₨ ${fc(pageTotalAmt)}</td></tr>
          <tr style="${grandStyle}"><td colspan="5" style="padding:5px 2px;text-align:right;color:#000;">GRAND TOTAL:</td><td style="padding:5px 2px;text-align:right;">${totalQty.toLocaleString()} L</td><td style="padding:5px 2px;text-align:right;">—</td><td style="padding:5px 2px;text-align:right;">—</td><td style="padding:5px 2px;text-align:right;font-size:14px;background:#eee;">₨ ${fc(grandTotal)}</td></tr>`;
      }
      if (isSale) {
        return `
          <tr style="${rowStyle}"><td colspan="2" style="padding:8px;text-align:right;">PAGE TOTAL:</td><td></td><td style="padding:8px;text-align:right;">${pageQty.toLocaleString()} L</td><td style="padding:8px;text-align:right;">₨ ${fc(pageAmt)}</td></tr>
          <tr style="${grandStyle}"><td colspan="2" style="padding:8px;text-align:right;color:#000;">GRAND TOTAL:</td><td></td><td style="padding:8px;text-align:right;">${totalQty.toLocaleString()} L</td><td style="padding:8px;text-align:right;font-size:14px;background:#eee;">₨ ${fc(grandTotal)}</td></tr>`;
      }
      if (isLedger) {
        const bv = grandTotal;
        const bt = type === 'customer' ? `${fc(Math.abs(bv))} ${bv >= 0 ? '(Dr)' : '(Cr)'}` : `₨ ${fc(bv)}`;
        return `
          <tr style="${rowStyle}"><td colspan="2" style="padding:8px;text-align:right;">PAGE TOTAL:</td><td style="padding:8px;text-align:right;color:#dc2626;">₨ ${fc(pageDebit)}</td><td style="padding:8px;text-align:right;color:#059669;">₨ ${fc(pageCredit)}</td><td></td></tr>
          <tr style="${grandStyle}"><td colspan="2" style="padding:8px;text-align:right;color:#000;">GRAND TOTAL:</td><td style="padding:8px;text-align:right;color:#dc2626;">₨ ${fc(totalDebit)}</td><td style="padding:8px;text-align:right;color:#059669;">₨ ${fc(totalCredit)}</td><td style="padding:8px;text-align:right;font-size:14px;background:#eee;">${bt}</td></tr>`;
      }
      if (isStock) {
        return `
          <tr style="${rowStyle}"><td colspan="2" style="padding:8px;text-align:right;">PAGE TOTAL:</td><td style="padding:8px;text-align:right;color:#059669;">+${pageIn.toLocaleString()} L</td><td style="padding:8px;text-align:right;color:#dc2626;">-${pageOut.toLocaleString()} L</td><td style="padding:8px;text-align:right;">${chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td></tr>
          <tr style="${grandStyle}"><td colspan="2" style="padding:8px;text-align:right;color:#000;">GRAND TOTAL:</td><td style="padding:8px;text-align:right;color:#059669;">—</td><td style="padding:8px;text-align:right;color:#dc2626;">—</td><td style="padding:8px;text-align:right;font-size:14px;background:#eee;">${chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td></tr>`;
      }
      return `
        <tr style="${rowStyle}"><td colspan="2" style="padding:8px;text-align:right;">PAGE TOTAL:</td><td style="padding:8px;text-align:right;">₨ ${fc(pageAmt)}</td></tr>
        <tr style="${grandStyle}"><td colspan="2" style="padding:8px;text-align:right;color:#000;">GRAND TOTAL:</td><td style="padding:8px;text-align:right;font-size:14px;background:#eee;">₨ ${fc(grandTotal)}</td></tr>`;
    };

    const pagesHTML = chunks.map((chunk, pi) => {
      const isLast = pi === chunks.length - 1;
      const fillers = Array.from({length: Math.max(0, ROWS_PER_PAGE - chunk.length)})
        .map(() => `<tr>${Array.from({length:colCount}).map((_,i)=>`<td style="height:22px;border-right:${i<colCount-1?'1px solid #f0f0f0':'none'};"></td>`).join('')}</tr>`).join('');

      const customerBox = (type==='customer'&&pi===0) ? `<div style="margin-bottom:12px;border:1px solid #eee;padding:10px;background:#fafafa;"><div style="font-size:12px;font-weight:900;border-bottom:1px solid #111;padding-bottom:4px;margin-bottom:6px;">CLIENT DETAILS:</div><div style="display:flex;gap:24px;"><span><b style="color:#666;">NAME:</b> ${customTitle?.split('—')[1]?.trim()||'N/A'}</span><span><b style="color:#666;">PHONE:</b> ${customerPhone||'—'}</span></div></div>` : '';

      const grandTotal_section = `
        <div style="padding-top:12px;">
          <div style="border:2px solid #000;display:grid;grid-template-columns:${isLedger ? '1fr 1fr 1fr' : '1fr 1fr'};background:#f8f8f8;overflow:hidden;">
            ${isSale || isPurchase ? `<div style="padding:10px 15px;border-right:2px solid #000;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;">Total Volume</div><div style="font-size:18px;font-weight:900;">${totalQty.toLocaleString()} L</div></div>` : ''}
            ${isLedger ? `<div style="padding:10px 15px;border-right:2px solid #000;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;">Total Debit</div><div style="font-size:16px;font-weight:900;">₨ ${fc(totalDebit)}</div></div><div style="padding:10px 15px;border-right:2px solid #000;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;">Total Credit</div><div style="font-size:16px;font-weight:900;">₨ ${fc(totalCredit)}</div></div>` : ''}
            ${!isSale && !isPurchase && !isLedger ? `<div style="padding:10px 15px;border-right:2px solid #000;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;">Count</div><div style="font-size:18px;font-weight:900;">${data.length} Records</div></div>` : ''}
            <div style="padding:10px 15px;background:#fff;"><div style="font-size:9px;font-weight:900;text-transform:uppercase;">Grand Total</div><div style="font-size:22px;font-weight:900;border-bottom:3px solid #000;display:inline-block;line-height:1;">₨ ${formatCurrency(grandTotal)}${type === 'customer' ? ' ' + (totalDebit >= totalCredit ? '(Dr)' : '(Cr)') : ''}</div></div>
          </div>
          ${!isStock ? `<div style="padding:8px 12px;font-style:italic;font-size:11px;font-weight:900;border:2px solid #111;border-top:none;">Amount in words: <span style="text-transform:uppercase;">${toWords(grandTotal)}</span></div>` : ''}
        </div>
        <div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;padding-top:16px;">
          <div><div style="font-size:10px;font-weight:700;font-style:italic;color:#555;">This is a computer generated bill.<br/>Errors and omissions are accepted.</div><div style="margin-top:10px;font-size:10px;color:#777;font-style:italic;text-align:center;font-weight:900;">Software Solution by Mb Soft and Tech — 0304-1654629</div></div>
          <div style="text-align:center;width:280px;"><div style="height:60px;border-bottom:2px solid #000;margin-bottom:5px;position:relative;"><img src="/assets/imtiaz-sign.png" style="position:absolute;bottom:-5px;left:50%;transform:translateX(-50%);height:75px;object-fit:contain;" /></div><div style="font-size:12px;font-weight:900;text-transform:uppercase;">Muhammad Imtiaz ul Hassan</div><div style="font-size:9px;font-weight:800;color:#444;">(Chief Executive Officer)</div></div>
        </div>`;

      return `<div class="page">
        ${HEADER}
        <div style="display:flex;justify-content:space-between;border:2px solid #111;padding:10px 15px;margin-bottom:10px;font-size:13px;font-weight:900;text-transform:uppercase;background:#f9f9f9;">
          <span>${customTitle||type.toUpperCase()+' REPORT'}</span><span>Period: ${dateRange}</span><span>Page ${pi+1} / ${chunks.length}</span>
        </div>
        ${customerBox}
        <table style="width:100%;border-collapse:collapse;font-size:${isPurchase?'9px':'12px'};border-left:2px solid #111;border-right:2px solid #111;border-bottom:2px solid #111;table-layout:${isPurchase?'fixed':'auto'};">
          <thead style="background:#f0f0f0;border-top:2px solid #111;border-bottom:2px solid #111;"><tr>${thead}</tr></thead>
          <tbody>${chunk.map(buildRow).map(r=>`<tr style="border-bottom:1px solid #eee;">${r}</tr>`).join('')}${fillers}</tbody>
          <tfoot style="background:#f9f9f9;font-weight:900;border-top:2px solid #111;">${buildPageTotal(chunk)}</tfoot>
        </table>
        ${grandTotal_section}
      </div>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Report</title><style>
      @page{size:A4 portrait;margin:0;}
      *,*::before,*::after{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
      html,body{margin:0;padding:0;background:#fff;font-family:'Times New Roman',serif;}
      .page{width:210mm;height:297mm;padding:12mm 10mm;display:flex;flex-direction:column;page-break-after:always;overflow:hidden;}
      .page:last-child{page-break-after:avoid;}
    </style></head><body>${pagesHTML}</body></html>`;

    let iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'print-iframe';
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
    }

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      if (iframe.contentWindow) {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      }
    }, 800);
  };

  const handleGeneratePDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const container = contentRef.current;
      const pages = container.getElementsByClassName('report-page');
      
      // A4 at 96 CSS DPI = 794 x 1123px
      const A4_PX_WIDTH = 794;
      const A4_PX_HEIGHT = 1123;

      for (let i = 0; i < pages.length; i++) {
        const el = pages[i] as HTMLElement;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          width: el.offsetWidth,
          height: el.offsetHeight,
          windowWidth: A4_PX_WIDTH,
          windowHeight: A4_PX_HEIGHT,
          scrollX: 0,
          scrollY: -window.scrollY,
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }
      
      pdf.save(`${type.toUpperCase()}_REPORT_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF Generation Error:', error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const dates = data.map(x => x.date).sort();
  const dateRange = dates.length
    ? `${formatDate(dates[0])} — ${formatDate(dates[dates.length - 1])}`
    : 'All Period';

  const chunks: any[][] = [];
  for (let i = 0; i < data.length; i += ROWS_PER_PAGE) chunks.push(data.slice(i, i + ROWS_PER_PAGE));
  if (chunks.length === 0) chunks.push([]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(2,6,23,0.95)', backdropFilter: 'blur(16px)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      fontFamily: "'Times New Roman', serif",
      overflowY: 'auto', paddingBottom: 100,
    }}>
      {/* Mobile-Friendly Control Bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100, width: '100%',
        display: 'flex', flexDirection: 'column',
        background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '12px 20px', gap: 12, boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ padding: 8, background: 'rgba(59,130,246,0.1)', borderRadius: 10 }}>
              <FileText style={{ width: 18, height: 18, color: '#3b82f6' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Document Preview</span>
              <span style={{ color: '#64748b', fontSize: 10 }}>{data.length} Records • {chunks.length} Pages</span>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button 
            disabled={isGeneratingPDF}
            onClick={handleGeneratePDF} 
            style={{ 
              flex: 1, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
              borderRadius: 12, background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', 
              fontWeight: 900, fontSize: 12, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
              opacity: isGeneratingPDF ? 0.7 : 1
            }}
          >
            {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Generate PDF Report
          </button>
          <button 
            onClick={handlePrint} 
            className="md-only"
            style={{ 
              width: 100, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
              borderRadius: 12, background: '#1e293b', color: '#fff', 
              fontWeight: 900, fontSize: 12, border: '1px solid #334155', cursor: 'pointer', textTransform: 'uppercase'
            }}
          >
            <Printer style={{ width: 18, height: 18 }} /> Print
          </button>
        </div>
      </div>

      <style>{`
        @page { size: A4 portrait; margin: 0; }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box !important; }
          html { 
            margin: 0 !important; padding: 0 !important; 
            background: #fff !important; 
            width: 210mm !important; 
            font-size: 16px !important;
          }
          body { 
            margin: 0 !important; padding: 0 !important; 
            background: #fff !important; 
            width: 210mm !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          .page-print-container { margin: 0 !important; padding: 0 !important; width: 210mm !important; }
          .report-page { 
            width: 210mm !important; height: 297mm !important; padding: 12mm 10mm !important;
            margin: 0 !important; box-sizing: border-box !important; position: relative;
            page-break-after: always; background: #fff !important; color: #000 !important;
            overflow: hidden !important; display: flex !important; flex-direction: column !important;
          }
          .report-page:last-child { page-break-after: avoid !important; }
        }
        @media (max-width: 768px) {
          .md-only { display: none !important; }
          .report-page { transform: scale(0.45); transform-origin: top center; margin-bottom: -160mm !important; }
        }
      `}</style>

      <div ref={contentRef} className="page-print-container" style={{ width: '210mm', margin: '20px auto' }}>
          {chunks.map((chunk, pi) => {
            const isLast = pi === chunks.length - 1;
            const isLedger = type === 'asset' || type === 'liability' || type === 'customer';
            const isSale = type === 'sale';
            const isPurchase = type === 'purchase';
            const isExpense = type === 'expense';
            const isStock = type === 'stock';

            let grandTotal = 0;
            let totalQty = 0;
            let totalDebit = 0;
            let totalCredit = 0;

            if (isSale) {
              grandTotal = data.reduce((s, x) => s + (x.amount ?? 0), 0);
              totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
            } else if (isPurchase) {
              grandTotal = data.reduce((s, x) => s + (x.totalAmount ?? 0), 0);
              totalQty = data.reduce((s, x) => s + (x.quantity || 0), 0);
            } else if (isExpense) {
              grandTotal = data.reduce((s, x) => s + (x.amount || 0), 0);
            } else if (isLedger) {
              totalDebit = data.reduce((s, x) => s + (x.debit || 0), 0);
              totalCredit = data.reduce((s, x) => s + (x.credit || 0), 0);
              grandTotal = Math.abs(totalDebit - totalCredit);
            } else if (isStock) {
              grandTotal = data.reduce((s, x) => s + (x.qtyIn || 0), 0);
            }

            return (
              <div key={pi} className="report-page" style={{ position: 'relative', width: '210mm', height: '297mm', background: '#fff', color: '#000', padding: '12mm 10mm', margin: '0 auto 20px auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', borderRadius: '2px' }}>
                <PrintHeader />

                <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid #111', padding: '12px 15px', marginBottom: '10px', fontSize: '14px', fontWeight: 1000, textTransform: 'uppercase', background: '#f9f9f9' }}>
                  <span>{customTitle || type.toUpperCase() + ' REPORT'}</span>
                  <span>Period: {dateRange}</span>
                  <span>Page {pi + 1} / {chunks.length}</span>
                </div>

                {type === 'customer' && pi === 0 && (
                   <div style={{ marginBottom: 15, border: '1px solid #eee', padding: 10, background: '#fafafa' }}>
                      <div style={{ fontSize: 13, fontWeight: 1000, borderBottom: '1px solid #111', paddingBottom: 4, marginBottom: 6 }}>CLIENT DETAILS:</div>
                      <div style={{ display: 'flex', gap: 30 }}>
                         <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>NAME:</span> <span style={{ fontWeight: 1000 }}>{customTitle?.split('—')[1]?.trim() || 'N/A'}</span></div>
                         <div><span style={{ fontSize: 10, fontWeight: 900, color: '#666' }}>PHONE:</span> <span style={{ fontWeight: 1000 }}>{customerPhone || '—'}</span></div>
                      </div>
                   </div>
                )}

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <table style={{ 
                  width: '100%', borderCollapse: 'collapse', fontSize: isPurchase ? '9px' : '12px', 
                  borderLeft: '2px solid #111', borderRight: '2px solid #111', borderBottom: '2px solid #111',
                  tableLayout: isPurchase ? 'fixed' : 'auto'
                }}>
                  <thead style={{ background: '#f0f0f0', borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                    <tr>
                      {isPurchase ? (
                        <>
                          <th style={{ width: '60px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Date</th>
                          <th style={{ width: '65px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Inv. No</th>
                          <th style={{ padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Description</th>
                          <th style={{ width: '65px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Vehicle</th>
                          <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                          <th style={{ width: '55px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty (L)</th>
                          <th style={{ width: '65px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Carriage</th>
                          <th style={{ width: '85px', padding: '6px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Amount</th>
                          <th style={{ width: '95px', padding: '6px 2px', textAlign: 'right' }}>Total</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '10px 8px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '14px' }}>Date</th>
                          <th style={{ padding: '10px 8px', borderRight: '1px solid #111', textAlign: 'left', fontSize: '14px' }}>{(isStock) ? 'Details' : 'Description'}</th>
                          {isSale ? (
                            <>
                              <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                              <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty (L)</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                            </>
                          ) : isLedger ? (
                            <>
                              <th style={{ width: '130px', padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>{type === 'asset' ? 'Debit (In)' : type === 'liability' ? 'Debit (Paid)' : 'Debit'}</th>
                              <th style={{ width: '130px', padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>{type === 'asset' ? 'Credit (Out)' : type === 'liability' ? 'Credit (Owed)' : 'Credit'}</th>
                              <th style={{ width: '140px', padding: '8px', textAlign: 'right' }}>{type === 'asset' ? 'Valuation' : 'Balance'}</th>
                            </>
                          ) : isStock ? (
                            <>
                              <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>In (L)</th>
                              <th style={{ padding: '8px', borderRight: '1px solid #111', textAlign: 'right' }}>Out (L)</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Balance</th>
                            </>
                          ) : (
                            <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                          )}
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {chunk.map((row: any, idx: number) => {
                      const balVal = row.balance ?? 0;
                      const balText = type === 'customer'
                        ? `${formatCurrency(Math.abs(balVal))} ${balVal >= 0 ? '(Dr)' : '(Cr)'}`
                        : `₨ ${formatCurrency(balVal)}`;
                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
                          {isPurchase ? (
                            <>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold' }}>{row.invoiceNo || '—'}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', fontSize: '10px' }}>{row.description || '—'}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0' }}>{row.vehicleNo || '—'}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity?.toLocaleString()}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.carriage)}</td>
                              <td style={{ padding: '6px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                              <td style={{ padding: '6px 2px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.totalAmount)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                              <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', wordBreak: 'break-word', fontSize: '12px' }}>{row.description || row.details || row.type || '—'}</td>
                              {isSale ? (
                                <>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity?.toLocaleString()}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                                </>
                              ) : isLedger ? (
                                <>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{type === 'customer' ? balText : formatCurrency(row.balance)}</td>
                                </>
                              ) : isStock ? (
                                <>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.qtyIn ? `+${row.qtyIn.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.qtyOut ? `-${row.qtyOut.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{row.balance?.toLocaleString()} L</td>
                                </>
                              ) : (
                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(0, ROWS_PER_PAGE - chunk.length) }).map((_, fi) => (
                      <tr key={`filler-${fi}`} style={{ height: '22px', borderBottom: '1px solid #eee' }}>
                        {Array.from({ length: isPurchase ? 9 : isSale || isLedger || isStock ? 5 : 3 }).map((__, tdidx) => (
                          <td key={tdidx} style={{ borderRight: tdidx === (isPurchase ? 8 : isSale || isLedger || isStock ? 4 : 2) ? 'none' : '1px solid #f0f0f0' }}></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f9f9f9', fontWeight: 1000, borderTop: '2px solid #111' }}>
                    <tr>
                      <td colSpan={isPurchase ? 5 : 2} style={{ padding: '10px', textAlign: 'right' }}>PAGE TOTAL:</td>
                      {isPurchase ? (
                        <>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.carriage || 0), 0))}</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.totalAmount || 0), 0))}</td>
                        </>
                      ) : isSale ? (
                        <>
                          <td></td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                        </>
                      ) : isLedger ? (
                        <>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.debit || 0), 0))}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.credit || 0), 0))}</td>
                          <td></td>
                        </>
                      ) : isStock ? (
                        <>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#059669' }}>+{chunk.reduce((s, x) => s + (x.qtyIn || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#dc2626' }}>-{chunk.reduce((s, x) => s + (x.qtyOut || 0), 0).toLocaleString()} L</td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td>
                        </>
                      ) : (
                        <td style={{ padding: '10px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                      )}
                    </tr>
                    <tr style={{ background: '#f1f5f9', borderTop: '1px solid #111' }}>
                      <td colSpan={isPurchase ? 5 : 2} style={{ padding: '8px', textAlign: 'right' }}>GRAND TOTAL:</td>
                      {isPurchase ? (
                        <>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>{totalQty.toLocaleString()} L</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>—</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right' }}>—</td>
                          <td style={{ padding: '6px 2px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                        </>
                      ) : isSale ? (
                        <>
                          <td></td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{totalQty.toLocaleString()} L</td>
                          <td style={{ padding: '8px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                        </>
                      ) : isLedger ? (
                        <>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>₨ {formatCurrency(totalDebit)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>₨ {formatCurrency(totalCredit)}</td>
                          <td style={{ padding: '8px', textAlign: 'right', background: '#e2e8f0' }}>
                            {type === 'customer' ? `${formatCurrency(Math.abs(grandTotal))} ${grandTotal >= 0 ? '(Dr)' : '(Cr)'}` : `₨ ${formatCurrency(grandTotal)}`}
                          </td>
                        </>
                      ) : isStock ? (
                        <>
                          <td></td><td></td>
                          <td style={{ padding: '8px', textAlign: 'right', background: '#e2e8f0' }}>{chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td>
                        </>
                      ) : (
                        <td style={{ padding: '8px', textAlign: 'right', background: '#e2e8f0' }}>₨ {formatCurrency(grandTotal)}</td>
                      )}
                    </tr>
                  </tfoot>
                </table>

                {isLast && (
                  <>
                    <div style={{ paddingTop: '12px' }}>
                      <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: `repeat(${isLedger ? 3 : 2}, minmax(0, 1fr))`, background: '#f8f8f8', overflow: 'hidden' }}>
                        {isSale || isPurchase ? (
                          <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Volume</div>
                            <div style={{ fontSize: '18px', fontWeight: 900 }}>{totalQty.toLocaleString()} L</div>
                          </div>
                        ) : isLedger ? (
                          <>
                            <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                              <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Debit</div>
                              <div style={{ fontSize: '16px', fontWeight: 900 }}>₨ {formatCurrency(totalDebit)}</div>
                            </div>
                            <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                              <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Credit</div>
                              <div style={{ fontSize: '16px', fontWeight: 900 }}>₨ {formatCurrency(totalCredit)}</div>
                            </div>
                          </>
                        ) : (
                          <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Count</div>
                            <div style={{ fontSize: '18px', fontWeight: 900 }}>{data.length} Records</div>
                          </div>
                        )}
                        <div style={{ padding: '10px 15px', background: '#fff' }}>
                          <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase' }}>Grand Total</div>
                          <div style={{ fontSize: '22px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block', lineHeight: 1 }}>
                            ₨ {formatCurrency(grandTotal)} {type === 'customer' ? (totalDebit >= totalCredit ? '(Dr)' : '(Cr)') : ''}
                          </div>
                        </div>
                      </div>
                      {!isStock && (
                        <div style={{ padding: '8px 12px', fontStyle: 'italic', fontSize: '11px', fontWeight: 1000, border: '2px solid #111', borderTop: 'none' }}>
                          Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(grandTotal)}</span>
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 16 }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', color: '#555' }}>
                          This is a computer generated bill.<br />Errors and omissions are accepted.
                        </div>
                        <div style={{ marginTop: '10px', fontSize: '10px', color: '#777', fontStyle: 'italic', textAlign: 'center', fontWeight: 900 }}>
                          Software Solution by Mb Soft and Tech — 0304-1654629
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', width: '280px' }}>
                        <div style={{ width: '100%', height: '60px', borderBottom: '2px solid #000', marginBottom: 5, position: 'relative' }}>
                          <img src="/assets/imtiaz-sign.png" style={{ position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)', height: '75px', objectFit: 'contain' }} />
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: 1000, textTransform: 'uppercase' }}>Muhammad Imtiaz ul Hassan</div>
                        <div style={{ fontSize: '9px', fontWeight: 800, color: '#444' }}>(Chief Executive Officer)</div>
                      </div>
                    </div>
                  </>
                )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
