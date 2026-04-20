import { useRef, useState } from 'react';
import { X, Printer, FileText, Download, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
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

  const handlePrint = useReactToPrint({ 
    contentRef,
    documentTitle: `${type.toUpperCase()}_REPORT_${customTitle?.split('—')[0]?.trim() || 'General'}_${new Date().toLocaleDateString().replace(/\//g, '-')}`
  });

  const handleGeneratePDF = async () => {
    if (!contentRef.current || isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const container = contentRef.current;
      const pages = container.getElementsByClassName('report-page');
      
      for (let i = 0; i < pages.length; i++) {
        const canvas = await html2canvas(pages[i] as HTMLElement, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
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
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; width: 210mm !important; }
          .no-print { display: none !important; }
          .page-print-container { margin: 0 !important; padding: 0 !important; width: 210mm !important; }
          .report-page { 
            width: 210mm !important; height: 297mm !important; padding: 12mm 10mm !important;
            margin: 0 !important; box-sizing: border-box !important; position: relative;
            page-break-after: always; background: #fff !important; color: #000 !important;
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

                <div style={{ display: 'flex', justifyContent: 'space-between', border: '2px solid #111', padding: '8px 15px', marginBottom: '15px', fontSize: '11px', fontWeight: 1000, textTransform: 'uppercase', background: '#f9f9f9' }}>
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

                <table style={{ 
                  width: '100%', borderCollapse: 'collapse', fontSize: isPurchase ? '8px' : '10px', 
                  borderLeft: '2px solid #111', borderRight: '2px solid #111', borderBottom: '2px solid #111',
                  tableLayout: isPurchase ? 'fixed' : 'auto'
                }}>
                  <thead style={{ background: '#f0f0f0', borderTop: '2px solid #111', borderBottom: '2px solid #111' }}>
                    <tr>
                      {isPurchase ? (
                        <>
                          <th style={{ width: '60px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Date</th>
                          <th style={{ width: '65px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Inv. No</th>
                          <th style={{ padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Description</th>
                          <th style={{ width: '65px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'left' }}>Vehicle</th>
                          <th style={{ width: '55px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                          <th style={{ width: '55px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty (L)</th>
                          <th style={{ width: '65px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Carriage</th>
                          <th style={{ width: '85px', padding: '4px 2px', borderRight: '1px solid #111', textAlign: 'right' }}>Amount</th>
                          <th style={{ width: '95px', padding: '4px 2px', textAlign: 'right' }}>Total</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'left' }}>{(isStock) ? 'Details' : 'Description'}</th>
                          {isSale ? (
                            <>
                              <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Rate</th>
                              <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Qty (L)</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
                            </>
                          ) : isLedger ? (
                            <>
                              <th style={{ width: '130px', padding: '6px 4px', borderRight: '1px solid #111', textAlign: 'right' }}>{type === 'asset' ? 'Debit (In)' : type === 'liability' ? 'Debit (Paid)' : 'Debit'}</th>
                              <th style={{ width: '130px', padding: '6px 4px', borderRight: '1px solid #111', textAlign: 'right' }}>{type === 'asset' ? 'Credit (Out)' : type === 'liability' ? 'Credit (Owed)' : 'Credit'}</th>
                              <th style={{ width: '140px', padding: '6px 4px', textAlign: 'right' }}>{type === 'asset' ? 'Valuation' : 'Balance'}</th>
                            </>
                          ) : isStock ? (
                            <>
                              <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>In (L)</th>
                              <th style={{ padding: '6px 8px', borderRight: '1px solid #111', textAlign: 'right' }}>Out (L)</th>
                              <th style={{ padding: '6px 8px', textAlign: 'right' }}>Balance</th>
                            </>
                          ) : (
                            <th style={{ padding: '6px 8px', textAlign: 'right' }}>Amount</th>
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
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', fontWeight: 'bold' }}>{row.invoiceNo || '—'}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', fontSize: '7px' }}>{row.description || '—'}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0' }}>{row.vehicleNo || '—'}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity?.toLocaleString()}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.carriage)}</td>
                              <td style={{ padding: '4px 2px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.amount)}</td>
                              <td style={{ padding: '4px 2px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.totalAmount)}</td>
                            </>
                          ) : (
                            <>
                              <td style={{ padding: '6px 8px', borderRight: '1px solid #f0f0f0' }}>{formatDate(row.date)}</td>
                              <td style={{ padding: '5px 8px', borderRight: '1px solid #f0f0f0', wordBreak: 'break-word', fontSize: '9px' }}>{row.description || row.details || row.type || '—'}</td>
                              {isSale ? (
                                <>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right' }}>{formatCurrency(row.rate)}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 'bold' }}>{row.quantity?.toLocaleString()}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                                </>
                              ) : isLedger ? (
                                <>
                                  <td style={{ padding: '5px 4px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.debit ? formatCurrency(row.debit) : '—'}</td>
                                  <td style={{ padding: '5px 4px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.credit ? formatCurrency(row.credit) : '—'}</td>
                                  <td style={{ padding: '5px 4px', textAlign: 'right', fontWeight: 'bold' }}>{type === 'customer' ? balText : formatCurrency(row.balance)}</td>
                                </>
                              ) : isStock ? (
                                <>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#059669' }}>{row.qtyIn ? `+${row.qtyIn.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #f0f0f0', textAlign: 'right', color: '#dc2626' }}>{row.qtyOut ? `-${row.qtyOut.toLocaleString()}` : '—'}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{row.balance?.toLocaleString()} L</td>
                                </>
                              ) : (
                                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(row.amount)}</td>
                              )}
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {Array.from({ length: Math.max(0, ROWS_PER_PAGE - chunk.length) }).map((_, fi) => (
                      <tr key={`filler-${fi}`} style={{ height: '24px', borderBottom: '1px solid #eee' }}>
                        {Array.from({ length: isPurchase ? 9 : isSale || isLedger || isStock ? 5 : 3 }).map((__, tdidx) => (
                          <td key={tdidx} style={{ borderRight: tdidx === (isPurchase ? 8 : isSale || isLedger || isStock ? 4 : 2) ? 'none' : '1px solid #f0f0f0' }}></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot style={{ background: '#f9f9f9', fontWeight: 1000, borderTop: '2px solid #111' }}>
                    {isPurchase ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '4px 2px', textAlign: 'right' }}>PAGE TOTAL:</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.carriage || 0), 0))}</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                        <td style={{ padding: '4px 2px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.totalAmount || 0), 0))}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td colSpan={2} style={{ padding: '8px', textAlign: 'right' }}>PAGE TOTAL:</td>
                        {isSale ? (
                          <>
                            <td></td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{chunk.reduce((s, x) => s + (x.quantity || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                          </>
                        ) : isLedger ? (
                          <>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.debit || 0), 0))}</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.credit || 0), 0))}</td>
                            <td></td>
                          </>
                        ) : isStock ? (
                          <>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#059669' }}>+{chunk.reduce((s, x) => s + (x.qtyIn || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '8px', textAlign: 'right', color: '#dc2626' }}>-{chunk.reduce((s, x) => s + (x.qtyOut || 0), 0).toLocaleString()} L</td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{chunk[chunk.length - 1]?.balance?.toLocaleString()} L</td>
                          </>
                        ) : (
                          <td style={{ padding: '8px', textAlign: 'right' }}>₨ {formatCurrency(chunk.reduce((s, x) => s + (x.amount || 0), 0))}</td>
                        )}
                      </tr>
                    )}
                  </tfoot>
                </table>

                {isLast && (
                  <div style={{ marginTop: 'auto', paddingTop: '15px' }}>
                    <div style={{ border: '2px solid #000', display: 'grid', gridTemplateColumns: `repeat(${isLedger ? 3 : 2}, minmax(0, 1fr))`, background: '#f8f8f8', overflow: 'hidden' }}>
                      {isSale || isPurchase ? (
                        <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Volume</div>
                          <div style={{ fontSize: '16px', fontWeight: 900 }}>{totalQty.toLocaleString()} L</div>
                        </div>
                      ) : isLedger ? (
                        <>
                          <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Debit</div>
                            <div style={{ fontSize: '14px', fontWeight: 900 }}>₨ {formatCurrency(totalDebit)}</div>
                          </div>
                          <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                            <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Total Credit</div>
                            <div style={{ fontSize: '14px', fontWeight: 900 }}>₨ {formatCurrency(totalCredit)}</div>
                          </div>
                        </>
                      ) : (
                        <div style={{ padding: '10px 15px', borderRight: '2px solid #000' }}>
                          <div style={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }}>Count</div>
                          <div style={{ fontSize: '16px', fontWeight: 900 }}>{data.length} Records</div>
                        </div>
                      )}
                      <div style={{ padding: '10px 15px', background: '#fff' }}>
                        <div style={{ fontSize: '9px', fontWeight: 1000, textTransform: 'uppercase' }}>Grand Total</div>
                        <div style={{ fontSize: '20px', fontWeight: 1000, borderBottom: '3px solid #000', display: 'inline-block' }}>
                          ₨ {formatCurrency(grandTotal)} {type === 'customer' ? (totalDebit >= totalCredit ? '(Dr)' : '(Cr)') : ''}
                        </div>
                      </div>
                    </div>
                    {!isStock && (
                      <div style={{ padding: '8px 12px', fontStyle: 'italic', fontSize: '9px', fontWeight: 1000, border: '2px solid #111', borderTop: 'none' }}>
                        Amount in words: <span style={{ textTransform: 'uppercase' }}>{toWords(grandTotal)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 25 }}>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, fontStyle: 'italic', color: '#555' }}>
                          This is a computer generated bill.<br />Errors and omissions are accepted.
                        </div>
                        <div style={{ marginTop: 12, fontSize: '9px', color: '#999', fontStyle: 'italic' }}>
                          Software Solution by <strong>Mb Soft and Tech</strong> — 0304-1654629
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
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
