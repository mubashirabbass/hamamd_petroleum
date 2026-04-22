import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, ArrowLeft,
  Package, LayoutList, Fuel, Zap, Clock, Download,
  ChevronRight, Calendar, Printer, ArrowUpDown, Pin, PinOff,
  ShoppingCart
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore, FuelType } from '../store/useStore';
import {
  formatCurrency, filterByStartDate, formatDate, getErrorMessage,
  paginate, cn, startOfMonth, startOfYear, today
} from '../lib/utils';
import SearchBar from '../components/ui/SearchBar';
import Pagination from '../components/ui/Pagination';
import { useToast } from '../components/ui/Toast';
import PullToRefresh from '../components/ui/PullToRefresh';
import PrintReportModal from '../components/modals/PrintReportModal';

// const PER_PAGE = 40; // Replaced by state

export default function StockPage() {
  const { toast } = useToast();
  const rawPurchases = useStore((s) => s.purchases);
  const rawSales = useStore((s) => s.sales);
  const settings = useStore((s) => s.settings);
  const initializeFromDB = useStore((s) => s.initializeFromDB);
  const dbReady = useStore((s) => s.dbReady);
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();

  // ── View State ──
  const [view, setView] = useState<'overview' | 'manage'>('overview');
  const [selectedType, setSelectedType] = useState<FuelType>('HSD');

  // Sync state with URL params
  useEffect(() => {
    if (type) {
      setView('manage');
      setSelectedType(type.toUpperCase() as FuelType);
    } else {
      setView('overview');
    }
  }, [type]);

  // Keep stock cards synced with latest Sale/Purchase writes.
  // This guarantees fresh totals when user returns to the Stock module.
  useEffect(() => {
    if (!dbReady) return;

    const refresh = () => {
      void initializeFromDB();
    };

    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [dbReady, initializeFromDB]);

  // ── Detail View State ──
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(40);
  const [showReport, setShowReport] = useState(false);
  const [entrySort, setEntrySort] = useState('date_desc');
  const [isSidebarPinned, setIsSidebarPinned] = useState(false);
  const isExpanded = isSidebarPinned;

  const handleRefresh = async () => {
    await initializeFromDB();
  };

  // ── Calculation Logic ──
  const stockData = useMemo(() => {
    const calc = (type: 'HSD' | 'PMG') => {
      // 1. Period Totals (for Purchase/Sale Volume)
      const periodPurchases = rawPurchases.filter(p =>
        p.type === type &&
        p.date >= settings.startDate &&
        (!fromDate || p.date >= fromDate) &&
        (!toDate || p.date <= toDate)
      );
      const periodSales = rawSales.filter(s =>
        s.type === type &&
        s.date >= settings.startDate &&
        (!fromDate || s.date >= fromDate) &&
        (!toDate || s.date <= toDate)
      );

      const totalPurchased = periodPurchases.reduce((s, p) => s + p.quantity, 0);
      const totalSold = periodSales.reduce((s, x) => s + x.quantity, 0);
      const purchaseValue = periodPurchases.reduce((s, p) => s + p.totalAmount, 0);
      const saleValue = periodSales.reduce((s, x) => s + x.amount, 0);

      // 2. Closing Balance (Total ever up to 'toDate')
      const upToDatePurchases = rawPurchases.filter(p =>
        p.type === type &&
        p.date >= settings.startDate &&
        (!toDate || p.date <= toDate)
      );
      const upToDateSales = rawSales.filter(s =>
        s.type === type &&
        s.date >= settings.startDate &&
        (!toDate || s.date <= toDate)
      );

      const current = upToDatePurchases.reduce((s, p) => s + p.quantity, 0) -
        upToDateSales.reduce((s, x) => s + x.quantity, 0);

      return { totalPurchased, totalSold, current, purchaseValue, saleValue };
    };
    return { HSD: calc('HSD'), PMG: calc('PMG') };
  }, [rawPurchases, rawSales, settings.startDate, fromDate, toDate]);

  const historyData = useMemo(() => {
    if (view !== 'manage') return [];

    const pFiltered = filterByStartDate(rawPurchases, settings.startDate)
      .filter((p) => p.type === selectedType)
      .map((p) => ({ id: p.id, date: p.date, type: 'Purchase' as const, qtyIn: p.quantity, qtyOut: 0, details: p.details, billNo: p.billNo }));

    const sFiltered = filterByStartDate(rawSales, settings.startDate)
      .filter((s) => s.type === selectedType)
      .map((s) => ({ id: s.id, date: s.date, type: 'Sale' as const, qtyIn: 0, qtyOut: s.quantity, details: 'Daily Sale', billNo: s.billNo }));

    const combined = [...pFiltered, ...sFiltered].sort((a, b) => b.date.localeCompare(a.date));

    // Sort chronological for balance calc, then reverse back
    const chrono = [...combined].sort((a, b) => a.date.localeCompare(b.date));
    let bal = 0;
    const withBal = chrono.map(item => {
      bal += item.qtyIn - item.qtyOut;
      return { ...item, balance: bal };
    });

    const sorted = [...withBal].sort((a, b) => {
      switch (entrySort) {
        case 'date_desc':    return b.date.localeCompare(a.date);
        case 'date_asc':     return a.date.localeCompare(b.date);
        case 'qtyIn_desc':   return b.qtyIn - a.qtyIn;
        case 'qtyOut_desc':  return b.qtyOut - a.qtyOut;
        case 'balance_desc': return b.balance - a.balance;
        default:             return b.date.localeCompare(a.date);
      }
    });

    return sorted;
  }, [rawPurchases, rawSales, selectedType, view, settings.startDate, entrySort]);

  const filteredHistory = historyData.filter((h) => {
    const matchesSearch = !search || (h.details || '').toLowerCase().includes(search.toLowerCase()) || h.date.includes(search);
    const matchesFrom = !fromDate || h.date >= fromDate;
    const matchesTo = !toDate || h.date <= toDate;
    return matchesSearch && matchesFrom && matchesTo;
  });

  const pagedHistory = paginate(filteredHistory, page, perPage);

  const pageTotals = useMemo(() => ({
    qtyIn: pagedHistory.reduce((s, h) => s + (h.qtyIn || 0), 0),
    qtyOut: pagedHistory.reduce((s, h) => s + (h.qtyOut || 0), 0),
  }), [pagedHistory]);

  const detailTotals = useMemo(() => {
    if (view !== 'manage') return { in: 0, out: 0 };
    return {
      in: rawPurchases
        .filter(p => p.type === selectedType)
        .filter(p => (!fromDate || p.date >= fromDate) && (!toDate || p.date <= toDate))
        .reduce((s, p) => s + p.quantity, 0),
      out: rawSales
        .filter(s => s.type === selectedType)
        .filter(s => (!fromDate || s.date >= fromDate) && (!toDate || s.date <= toDate))
        .reduce((s, x) => s + x.quantity, 0)
    };
  }, [rawPurchases, rawSales, selectedType, fromDate, toDate, view]);

  const handleDownloadStats = async () => {
    try {
      const ExcelJS = await import('exceljs');
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');

      const workbook = new ExcelJS.Workbook();
      workbook.creator = settings.softwareName;
      workbook.lastModifiedBy = settings.softwareName;
      workbook.created = new Date();
      workbook.modified = new Date();

      const filteredPeriod = `${fromDate || settings.startDate || 'Beginning'} to ${toDate || today()}`;
      const branding = {
        name: settings.softwareName.toUpperCase(),
        address: 'Muzafar Garh Road, Ada Ghyl Pur, District Jhang',
        contact: '03041654629',
        reportTitle: 'COMPREHENSIVE STOCK & INVENTORY ANALYSIS'
      };

      const start = fromDate || settings.startDate || '2000-01-01';
      const end = toDate || today();
      const allPurchases = filterByStartDate(rawPurchases, settings.startDate).filter(
        (p) => p.date >= start && p.date <= end
      );
      const allSales = filterByStartDate(rawSales, settings.startDate).filter(
        (s) => s.date >= start && s.date <= end
      );

      // ── Helper: Latest Rate for Valuation ──
      const getLatestRate = (fuel: FuelType) => {
        const last = rawPurchases.filter(p => p.type === fuel).sort((a,b) => b.date.localeCompare(a.date))[0];
        return last?.rate || 0;
      };

      const hsdLatestRate = getLatestRate('HSD');
      const pmgLatestRate = getLatestRate('PMG');

      // ── Helper: Performance Stats ──
      const getPerfStats = (fuel: FuelType) => {
        const fuelSales = allSales.filter(s => s.type === fuel);
        const fuelPurchases = allPurchases.filter(p => p.type === fuel);
        
        // Find unique days in period to calculate real average
        const d1 = new Date(start);
        const d2 = new Date(end);
        const days = Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) + 1);

        const totalSold = fuelSales.reduce((s, x) => s + x.quantity, 0);
        const totalPurchased = fuelPurchases.reduce((s, p) => s + p.quantity, 0);

        // Find Peaks
        const salesByDate: Record<string, number> = {};
        fuelSales.forEach(s => salesByDate[s.date] = (salesByDate[s.date] || 0) + s.quantity);
        const peakSaleDate = Object.keys(salesByDate).sort((a,b) => salesByDate[b] - salesByDate[a])[0] || 'N/A';
        const peakSaleQty = salesByDate[peakSaleDate] || 0;

        return {
          avgSale: totalSold / days,
          avgPurchase: totalPurchased / days,
          peakSaleDate,
          peakSaleQty,
          days
        };
      };

      const hsdPerf = getPerfStats('HSD');
      const pmgPerf = getPerfStats('PMG');

      // ── SHEET 1: EXECUTIVE SUMMARY ──
      const summary = workbook.addWorksheet('Executive Summary');
      summary.columns = [{ width: 25 }, { width: 20 }, { width: 20 }, { width: 20 }, { width: 25 }, { width: 25 }];
      
      // Branding Header
      summary.mergeCells('A1:F1');
      summary.mergeCells('A2:F2');
      summary.mergeCells('A3:F3');
      summary.mergeCells('A4:F4');
      const c1 = summary.getCell('A1');
      c1.value = branding.name;
      c1.font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } };
      c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      c1.alignment = { horizontal: 'center', vertical: 'middle' };

      const c2 = summary.getCell('A2');
      c2.value = branding.address;
      c2.font = { size: 11, color: { argb: 'FFFFFFFF' } };
      c2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
      c2.alignment = { horizontal: 'center', vertical: 'middle' };

      const c3 = summary.getCell('A3');
      c3.value = branding.reportTitle;
      c3.font = { size: 14, bold: true, color: { argb: 'FF0EA5E9' } };
      c3.alignment = { horizontal: 'center', vertical: 'middle' };

      const c4 = summary.getCell('A4');
      c4.value = `Analysis Period: ${filteredPeriod}`;
      c4.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
      c4.alignment = { horizontal: 'center', vertical: 'middle' };
      summary.getRow(1).height = 40;
      summary.getRow(2).height = 20;

      // Section: Current Inventory Status
      summary.addRow([]);
      summary.addRow(['INVENTORY STATUS OVERVIEW']).font = { bold: true, size: 12 };
      const headerRow = summary.addRow(['Fuel Type', 'Pur. Vol (L)', 'Sale Vol (L)', 'Stock (L)', 'Stock Value (Est)', 'Latest Rate']);
      headerRow.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      });

      const hsdStockVal = stockData.HSD.current * hsdLatestRate;
      const pmgStockVal = stockData.PMG.current * pmgLatestRate;

      summary.addRow(['HSD (Diesel)', stockData.HSD.totalPurchased, stockData.HSD.totalSold, stockData.HSD.current, hsdStockVal, hsdLatestRate]);
      summary.addRow(['PMG (Petrol)', stockData.PMG.totalPurchased, stockData.PMG.totalSold, stockData.PMG.current, pmgStockVal, pmgLatestRate]);
      const totalRow = summary.addRow(['GRAND TOTAL', 
        stockData.HSD.totalPurchased + stockData.PMG.totalPurchased,
        stockData.HSD.totalSold + stockData.PMG.totalSold,
        stockData.HSD.current + stockData.PMG.current,
        hsdStockVal + pmgStockVal,
        ''
      ]);
      totalRow.font = { bold: true };
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };

      // Section: Performance Insights
      summary.addRow([]);
      summary.addRow([]);
      summary.addRow(['BUSINESS PERFORMANCE INSIGHTS']).font = { bold: true, size: 12 };
      const perfHeader = summary.addRow(['Fuel Type', 'Days in Period', 'Daily Avg Sale', 'Daily Avg Pur.', 'Peak Sale Date', 'Peak Quantity']);
      perfHeader.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
      });
      summary.addRow(['HSD', hsdPerf.days, hsdPerf.avgSale.toFixed(2), hsdPerf.avgPurchase.toFixed(2), formatDate(hsdPerf.peakSaleDate), hsdPerf.peakSaleQty]);
      summary.addRow(['PMG', pmgPerf.days, pmgPerf.avgSale.toFixed(2), pmgPerf.avgPurchase.toFixed(2), formatDate(pmgPerf.peakSaleDate), pmgPerf.peakSaleQty]);

      // ── SHEET 2: DAILY PERFORMANCE SHEET ──
      const dailySheet = workbook.addWorksheet('Daily Activity');
      dailySheet.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'HSD Sale (L)', key: 'hsdSale', width: 15 },
        { header: 'PMG Sale (L)', key: 'pmgSale', width: 15 },
        { header: 'Total Sale (L)', key: 'totalSale', width: 15 },
        { header: 'HSD Pur. (L)', key: 'hsdPur', width: 15 },
        { header: 'PMG Pur. (L)', key: 'pmgPur', width: 15 }
      ];

      const dailyData: Record<string, any> = {};
      allSales.forEach(s => {
        if (!dailyData[s.date]) dailyData[s.date] = { date: s.date, hsdSale: 0, pmgSale: 0, hsdPur: 0, pmgPur: 0 };
        if (s.type === 'HSD') dailyData[s.date].hsdSale += s.quantity;
        else dailyData[s.date].pmgSale += s.quantity;
      });
      allPurchases.forEach(p => {
        if (!dailyData[p.date]) dailyData[p.date] = { date: p.date, hsdSale: 0, pmgSale: 0, hsdPur: 0, pmgPur: 0 };
        if (p.type === 'HSD') dailyData[p.date].hsdPur += p.quantity;
        else dailyData[p.date].pmgPur += p.quantity;
      });

      Object.values(dailyData).sort((a: any, b: any) => b.date.localeCompare(a.date)).forEach((day: any) => {
        dailySheet.addRow({
          ...day,
          totalSale: day.hsdSale + day.pmgSale
        });
      });
      dailySheet.getRow(1).font = { bold: true };
      dailySheet.views = [{ state: 'frozen', ySplit: 1 }];

      // ── SHEET 3 & 4: FUEL DETAILS ──
      const makeFuelDetailSheet = (fuel: FuelType) => {
        const ws = workbook.addWorksheet(`${fuel} Stock Record`);
        ws.columns = [
          { header: 'Date', key: 'date', width: 15 },
          { header: 'Transaction', key: 'type', width: 12 },
          { header: 'Bill/Inv #', key: 'billNo', width: 18 },
          { header: 'Description', key: 'description', width: 25 },
          { header: 'Supplier/Details', key: 'details', width: 30 },
          { header: 'Qty In (L)', key: 'qtyIn', width: 12 },
          { header: 'Qty Out (L)', key: 'qtyOut', width: 12 },
          { header: 'Rate (PKR)', key: 'rate', width: 12 },
          { header: 'Amount', key: 'amount', width: 15 },
          { header: 'Balance (L)', key: 'balance', width: 15 },
        ];

        const purchases = allPurchases.filter(p => p.type === fuel).map(p => ({
          date: p.date, type: 'Purchase', billNo: p.invoiceNo || p.billNo, description: p.description || '', details: p.details,
          qtyIn: p.quantity, qtyOut: 0, rate: p.rate, amount: p.totalAmount
        }));
        const sales = allSales.filter(s => s.type === fuel).map(s => ({
          date: s.date, type: 'Sale', billNo: s.billNo, description: s.description || 'Daily Sale', details: 'Direct Cash/Credit Sale',
          qtyIn: 0, qtyOut: s.quantity, rate: s.rate, amount: s.amount
        }));

        let running = 0;
        [...purchases, ...sales].sort((a,b) => a.date.localeCompare(b.date)).forEach(row => {
          running += row.qtyIn - row.qtyOut;
          ws.addRow({ ...row, balance: running });
        });

        ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fuel === 'HSD' ? 'FFB45309' : 'FF047857' } };
        ws.views = [{ state: 'frozen', ySplit: 1 }];
        ws.autoFilter = 'A1:J1';
      };

      makeFuelDetailSheet('HSD');
      makeFuelDetailSheet('PMG');

      // ── SHEET 5: SUPPLIER ANALYSIS ──
      const supplierWS = workbook.addWorksheet('Supplier Summary');
      supplierWS.columns = [
        { header: 'Supplier / Origin', key: 'supplier', width: 35 },
        { header: 'Total HSD (L)', key: 'hsd', width: 15 },
        { header: 'Total PMG (L)', key: 'pmg', width: 15 },
        { header: 'Total Value (PKR)', key: 'value', width: 20 },
        { header: 'Last Shipment', key: 'last', width: 15 }
      ];

      const supplierMap: Record<string, any> = {};
      allPurchases.forEach(p => {
        const s = p.details || 'Unknown Supplier';
        if (!supplierMap[s]) supplierMap[s] = { supplier: s, hsd: 0, pmg: 0, value: 0, last: p.date };
        if (p.type === 'HSD') supplierMap[s].hsd += p.quantity;
        else supplierMap[s].pmg += p.quantity;
        supplierMap[s].value += p.totalAmount;
        if (p.date > supplierMap[s].last) supplierMap[s].last = p.date;
      });

      Object.values(supplierMap).forEach(s => supplierWS.addRow(s));
      supplierWS.getRow(1).font = { bold: true };
      supplierWS.autoFilter = 'A1:E1';

      // ── SHEET 6 & 7: RAW DATA EXPORTS ──
      const purWS = workbook.addWorksheet('All Purchases Raw');
      purWS.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Fuel', key: 'type', width: 10 },
        { header: 'Bill No', key: 'billNo', width: 16 },
        { header: 'Invoice No', key: 'invoiceNo', width: 16 },
        { header: 'Vehicle No', key: 'vehicleNo', width: 16 },
        { header: 'Description', key: 'description' , width: 25 },
        { header: 'Supplier Details', key: 'details', width: 30 },
        { header: 'Rate', key: 'rate', width: 12 },
        { header: 'Qty (L)', key: 'quantity', width: 12 },
        { header: 'Carriage', key: 'carriage', width: 12 },
        { header: 'Net Amount', key: 'amount', width: 14 },
        { header: 'Total Amount', key: 'totalAmount', width: 16 },
      ];
      allPurchases.forEach(p => purWS.addRow(p));
      purWS.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      purWS.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      purWS.autoFilter = 'A1:L1';

      const saleWS = workbook.addWorksheet('All Sales Raw');
      saleWS.columns = [
        { header: 'Date', key: 'date', width: 14 },
        { header: 'Fuel', key: 'type', width: 10 },
        { header: 'Bill No', key: 'billNo', width: 16 },
        { header: 'Description', key: 'description', width: 30 },
        { header: 'Rate', key: 'rate', width: 12 },
        { header: 'Qty (L)', key: 'quantity', width: 12 },
        { header: 'Amount', key: 'amount', width: 14 },
      ];
      allSales.forEach(s => saleWS.addRow(s));
      saleWS.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      saleWS.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
      saleWS.autoFilter = 'A1:G1';

      // Finalize Save
      const defaultPath = `Detailed_Stock_Report_${today()}.xlsx`;
      const filePath = await save({
        defaultPath,
        filters: [{ name: 'Excel Workbook', extensions: ['xlsx'] }],
      });
      if (!filePath) return;

      const normalizedPath = filePath.startsWith('file://') ? filePath.replace('file://', '') : filePath;
      const buffer = await workbook.xlsx.writeBuffer();
      const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
      await writeFile(normalizedPath, data);
      toast('Comprehensive stock report downloaded', 'success');
    } catch (err: unknown) {
      console.error('Failed to download stock report', err);
      toast(`Failed to download stock stats: ${getErrorMessage(err)}`, 'error');
    }
  };

  // ── Render Helpers ──

  if (view === 'manage') {
    return (
      <PullToRefresh 
        onRefresh={handleRefresh} 
        scrollId="stock-manage-scroll"
        className="h-full w-full"
      >
        <div className="animate-fade-in flex flex-col w-full p-4 pb-32">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 pb-0">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/stock')}
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-sm active:scale-95 transition-all text-slate-600 dark:text-dark-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg", selectedType === 'HSD' ? 'bg-amber-600/10' : 'bg-emerald-600/10')}>
                  {selectedType === 'HSD' ? <Fuel className="w-7 h-7 text-amber-600" /> : <Zap className="w-7 h-7 text-emerald-600" />}
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase leading-none">{selectedType}</h1>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Inventory Management</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {[
              { label: 'Purchase', qty: detailTotals.in, icon: TrendingUp, color: 'blue' },
              { label: 'Sale', qty: detailTotals.out, icon: TrendingDown, color: 'red' },
              { label: 'Stock', qty: historyData[0]?.balance || 0, icon: Package, color: 'emerald', highlight: true },
            ].map(col => (
              <div key={col.label} className="glass p-5 rounded-3xl border border-slate-200 dark:border-dark-700/50 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <col.icon className={cn("w-4 h-4", `text-${col.color}-600`)} />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{col.label}</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5 ml-4">
                  <span className={cn('font-black tabular-nums tracking-tighter capitalize', col.highlight ? `text-2xl text-emerald-600 dark:text-emerald-400` : 'text-xl text-slate-800 dark:text-white')}>{col.qty.toLocaleString()}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">L</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto no-scrollbar smart-scroll mt-6">
            <div className="flex items-center bg-slate-50 dark:bg-dark-800 p-1 rounded-xl border border-slate-100 dark:border-dark-750 mr-2 shrink-0">
              <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all whitespace-nowrap">Today</button>
              <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50 whitespace-nowrap">Month</button>
            </div>
            <div className="flex items-center gap-2 px-2 shrink-0">
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-28 !text-[10px]" />
              <span className="text-slate-400">→</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-28 !text-[10px]" />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
                className="ml-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30 shrink-0"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-6">
            <div className="flex justify-center mb-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary !text-[10px] !py-1 !px-3 flex items-center gap-2 uppercase font-black tracking-widest"
              >
                {showHistory ? 'Hide Detailed History' : 'Show Detailed History'}
              </button>
            </div>

            {showHistory && (
              <div className="glass rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-dark-800 animate-slide-up">
                <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-dark-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white leading-none">History</h3>
                    </div>
                    <button 
                      onClick={() => setShowReport(true)}
                      className="md:hidden btn-secondary !py-1.5 !px-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-dark-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> Reports
                    </button>
                  </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 md:w-64">
                        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search..." className="!py-1.5 !text-[11px]" />
                      </div>
                      <div className="relative group shrink-0">
                        <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition-colors pointer-events-none" />
                        <select
                          value={entrySort}
                          onChange={(e) => setEntrySort(e.target.value)}
                          className="appearance-none pl-7 pr-8 py-1.5 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-xl text-[9px] font-black uppercase tracking-wider text-slate-700 dark:text-dark-200 focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600 transition-all cursor-pointer outline-none shadow-sm"
                        >
                          <option value="date_desc">Newest</option>
                          <option value="date_asc">Oldest</option>
                          <option value="qtyIn_desc">High Pur</option>
                          <option value="qtyOut_desc">High Sale</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <div className="w-1 h-1 border-r border-b border-current rotate-45" />
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowReport(true)}
                        className="hidden md:flex btn-secondary !py-1.5 !px-3 items-center gap-2 text-[10px] font-black uppercase tracking-widest"
                      >
                        <Printer className="w-3.5 h-3.5" /> Reports
                      </button>
                    </div>
                </div>
                <div className="overflow-auto smart-scroll max-h-[60vh]">
                  <table className="w-full">
                    <thead className="sticky top-0 z-10 bg-slate-200 dark:bg-dark-800">
                      <tr className="table-header text-[10px]">
                        <th className="table-cell text-left whitespace-nowrap">Date</th>
                        <th className="table-cell text-left whitespace-nowrap">Details</th>
                        <th className="table-cell text-right whitespace-nowrap">In (L)</th>
                        <th className="table-cell text-right whitespace-nowrap">Out (L)</th>
                        <th className="table-cell text-right whitespace-nowrap">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                      {pagedHistory.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-xs text-slate-400 italic">No records found for this period</td></tr>
                      ) : pagedHistory.map((h, i) => (
                        <tr key={h.id + (h.date) + i} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[11px]">
                          <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(h.date)}</td>
                          <td className="table-cell whitespace-nowrap overflow-hidden text-ellipsis max-w-sm font-black text-slate-900 dark:text-white">{h.details || 'Daily Sale'}</td>
                          <td className="table-cell text-right whitespace-nowrap text-emerald-600 font-mono font-bold">{h.qtyIn ? `+${h.qtyIn.toLocaleString()}` : '—'}</td>
                          <td className="table-cell text-right whitespace-nowrap text-red-600 font-mono font-bold">{h.qtyOut ? `-${h.qtyOut.toLocaleString()}` : '—'}</td>
                          <td className="table-cell text-right whitespace-nowrap font-black text-slate-900 dark:text-white tabular-nums">{h.balance.toLocaleString()} L</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-black text-black dark:text-white bg-slate-100/50 dark:bg-dark-800/50 border-t-[3px] border-black dark:border-black">
                        <td colSpan={2} className="table-cell text-right text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 font-black italic">Page Total</td>
                        <td className="table-cell text-right font-black font-mono whitespace-nowrap">+{pageTotals.qtyIn.toLocaleString()} L</td>
                        <td className="table-cell text-right font-black font-mono whitespace-nowrap">-{pageTotals.qtyOut.toLocaleString()} L</td>
                        <td className="table-cell"></td>
                      </tr>
                      <tr className="font-black text-black dark:text-white bg-slate-200/50 dark:bg-dark-700/50 border-t border-slate-300 dark:border-dark-600">
                        <td colSpan={2} className="table-cell text-right text-xs uppercase tracking-widest text-slate-600 dark:text-slate-300 font-black">Grand Total</td>
                        <td className="table-cell text-right font-black font-mono whitespace-nowrap">+{detailTotals.in.toLocaleString()} L</td>
                        <td className="table-cell text-right font-black font-mono whitespace-nowrap">-{detailTotals.out.toLocaleString()} L</td>
                        <td className="table-cell"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <Pagination
                  page={page}
                  total={filteredHistory.length}
                  perPage={perPage}
                  onChange={setPage}
                  onPerPageChange={(v) => { setPerPage(v); setPage(1); }}
                />
              </div>
            )}
          </div>
  
          {showReport && (
            <PrintReportModal 
              data={filteredHistory} 
              type="stock" 
              onClose={() => setShowReport(false)} 
              title={`${selectedType} STOCK HISTORY`}
            />
          )}
        </div>
      </PullToRefresh>
    );
  }

  // ── Overview Render ──
  const cards = [
    { type: 'HSD' as const, label: 'High Speed Diesel', color: 'amber', icon: <Fuel className="w-8 h-8" />, data: stockData.HSD },
    { type: 'PMG' as const, label: 'Petrol / Motor Gasoline', color: 'emerald', icon: <Zap className="w-8 h-8" />, data: stockData.PMG },
  ];

  return (
    <div className="flex-1 min-h-0 relative">
      <PullToRefresh 
        onRefresh={handleRefresh} 
        scrollId="stock-main-scroll"
        className="h-full w-full p-4 pb-32 pt-4"
      >
        <div className="animate-fade-in space-y-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-2">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase leading-none">Stock</h1>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Inventory Overview</p>
              </div>
            </div>
            <button onClick={handleDownloadStats} className="btn-primary !py-2.5 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider"><Download className="w-4 h-4" /> Stock Report</button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {cards.map(({ type, label, color, icon, data }) => (
              <div key={type} className="glass rounded-[2.5rem] p-8 border border-slate-200 dark:border-dark-700/50 shadow-2xl relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-8">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner", color === 'amber' ? 'bg-amber-500/10 text-amber-600' : 'bg-emerald-500/10 text-emerald-600')}>
                    {icon}
                  </div>
                  <div>
                    <h2 className={cn("text-xl font-black tracking-tight", color === 'amber' ? 'text-amber-600' : 'text-emerald-600')}>{type}</h2>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-dark-800/60 pt-6">
                  {[
                    { label: 'Purchase', qty: data.totalPurchased, icon: TrendingUp, color: 'text-blue-600' },
                    { label: 'Sale', qty: data.totalSold, icon: TrendingDown, color: 'text-red-600' },
                    { label: 'Stock', qty: data.current, icon: Package, color: color === 'amber' ? 'text-amber-600' : 'text-emerald-600', highlight: true },
                  ].map(block => (
                    <div key={block.label} className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{block.label}</p>
                      <p className={cn("font-black tabular-nums tracking-tighter", block.highlight ? 'text-2xl' : 'text-xl text-slate-900 dark:text-white', block.color)}>{block.qty.toLocaleString()} L</p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <button
                    onClick={() => navigate(`/stock/${type.toLowerCase()}`)}
                    className={cn(
                      "w-full py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-sm active:scale-95 group",
                      color === 'amber' ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"
                    )}
                  >
                    <LayoutList className="w-4 h-4" />
                    Details
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => navigate(`/sale?action=add&type=${type}`)}
                      className="py-3.5 rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                      + Sale
                    </button>
                    <button
                      onClick={() => navigate(`/purchase?action=add&type=${type}`)}
                      className="py-3.5 rounded-2xl bg-white dark:bg-dark-800 border border-slate-200 dark:border-dark-700 text-slate-900 dark:text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-sm active:scale-95"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                      + Purchase
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PullToRefresh>
    </div>
  );
}
