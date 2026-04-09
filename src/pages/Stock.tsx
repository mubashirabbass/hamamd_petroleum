import { useState, useMemo, useEffect } from 'react';
import {
  BarChart3, TrendingUp, TrendingDown, ArrowLeft,
  Package, LayoutList, Fuel, Zap, Clock, Download,
  ChevronRight, Calendar
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

    return withBal.reverse();
  }, [rawPurchases, rawSales, selectedType, view, settings.startDate]);

  const filteredHistory = historyData.filter((h) => {
    const matchesSearch = !search || h.details.toLowerCase().includes(search.toLowerCase()) || h.date.includes(search);
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
        const ws = workbook.addWorksheet(`${fuel} Ledger`);
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
      <div className="animate-fade-in flex flex-col h-[calc(100vh-80px)]">
        {/* Detail Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/stock')}
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700 shadow-sm hover:scale-110 active:scale-95 transition-all text-slate-600 dark:text-dark-400"
              title="Back to Overview"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", selectedType === 'HSD' ? 'bg-amber-600/10' : 'bg-emerald-600/10')}>
                {selectedType === 'HSD' ? <Fuel className="w-8 h-8 text-amber-600" /> : <Zap className="w-8 h-8 text-emerald-600" />}
              </div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">{selectedType} Stock Status</h1>
                <p className="text-xs font-bold text-slate-500 dark:text-dark-500 uppercase tracking-widest">Global Inventory Management</p>
              </div>
            </div>
          </div>

          {/* Quick Date Range */}
          <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto">
            <div className="flex items-center bg-slate-50 dark:bg-dark-800 p-1 rounded-xl border border-slate-100 dark:border-dark-750 mr-2">
              <button onClick={() => { setFromDate(today()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
              <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
              <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); setPage(1); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
            </div>
            <div className="flex items-center gap-2 px-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-32 !text-xs" />
            </div>
            <div className="flex items-center gap-2 px-2 border-l border-slate-100 dark:border-dark-700">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="input !py-1 !px-2 !w-32 !text-xs" />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); setPage(1); }}
                className="ml-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30"
                title="Clear Filters"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Sidebar Layout */}
        <div className="flex gap-6 flex-1 overflow-hidden">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0 flex flex-col bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-700/50 rounded-3xl overflow-hidden shadow-sm">
            <div className="p-4 bg-slate-50/50 dark:bg-dark-800/30 border-b border-slate-100 dark:border-dark-700/30">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuel Categories</p>
            </div>
            <div className="p-4 space-y-2">
              {[
                { id: 'HSD', label: 'HSD Stock', icon: Fuel, color: 'text-amber-600', bg: 'bg-amber-600/10' },
                { id: 'PMG', label: 'PMG Stock', icon: Zap, color: 'text-emerald-600', bg: 'bg-emerald-600/10' },
              ].map(fuel => (
                <button
                  key={fuel.id}
                  onClick={() => navigate(`/stock/${fuel.id.toLowerCase()}`)}
                  className={cn(
                    'w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 group relative overflow-hidden border',
                    selectedType === fuel.id
                      ? 'bg-primary-600 text-white border-transparent shadow-lg shadow-primary-600/30 scale-[1.02]'
                      : 'bg-transparent text-slate-600 dark:text-dark-400 border-slate-100 dark:border-dark-800 hover:bg-slate-50 dark:hover:bg-dark-800 hover:border-slate-200 dark:hover:border-dark-700'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <fuel.icon className={cn("w-5 h-5", selectedType === fuel.id ? 'text-white' : fuel.color)} />
                    <span className="font-black text-sm uppercase tracking-tight">{fuel.label}</span>
                  </div>
                  <ChevronRight className={cn("w-4 h-4 transition-transform", selectedType === fuel.id ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0')} />
                </button>
              ))}
            </div>
            <div className="mt-auto p-6 bg-slate-50/50 dark:bg-dark-800/30 border-t border-slate-100 dark:border-dark-700/30">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Last Sync</p>
              <p className="text-[11px] font-bold text-slate-600 dark:text-dark-300">Working Offline</p>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto smart-scroll pr-2 space-y-6">
            {/* Status Summary Card */}
            <div className={cn("glass rounded-3xl overflow-hidden border-2 shadow-xl", selectedType === 'HSD' ? 'border-amber-500/20' : 'border-emerald-500/20')}>
              <div className="p-4 bg-white/50 dark:bg-dark-900/50 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
                <LayoutList className={cn("w-4 h-4", selectedType === 'HSD' ? 'text-amber-500' : 'text-emerald-500')} />
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-dark-400">Inventory Status Summary</h2>
              </div>
              <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-dark-800">
                <div className="p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Period Purchase</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums">{detailTotals.in.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span></p>
                </div>
                <div className="p-6 text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Period Sale</p>
                  <p className="text-2xl font-black text-red-600 tabular-nums">{detailTotals.out.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span></p>
                </div>
                <div className={cn("p-6 text-center bg-slate-50/30 dark:bg-dark-800/20")}>
                  <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2">Total Remaining</p>
                  <p className={cn("text-3xl font-black tabular-nums tracking-tighter", selectedType === 'HSD' ? 'text-amber-600' : 'text-emerald-600')}>
                    {stockData[selectedType].current.toLocaleString()} <span className="text-xs font-bold opacity-60">L</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Detailed History Toggle */}
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="btn-secondary !text-[10px] !py-1 !px-3 flex items-center gap-2 uppercase font-black tracking-widest"
              >
                {showHistory ? 'Hide Detailed History' : 'Show Detailed History'}
              </button>
            </div>

            {/* History Table */}
            {showHistory && (
              <div className="glass rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-dark-800 animate-slide-up">
                <div className="p-5 flex items-center justify-between border-b border-slate-100 dark:border-dark-800">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Transaction History</h3>
                  </div>
                  <div className="w-64">
                    <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search History..." />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="table-header text-[10px]">
                        <th className="table-cell text-left">Date</th>
                        <th className="table-cell text-left">Details</th>
                        <th className="table-cell text-right">In (L)</th>
                        <th className="table-cell text-right">Out (L)</th>
                        <th className="table-cell text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-dark-800/50">
                      {pagedHistory.length === 0 ? (
                        <tr><td colSpan={5} className="py-20 text-center text-xs text-slate-400 italic">No records found for this period</td></tr>
                      ) : pagedHistory.map((h, i) => (
                        <tr key={h.id + (h.date) + i} className="table-row group hover:bg-slate-50 dark:hover:bg-dark-800/50 text-[11px]">
                          <td className="table-cell whitespace-nowrap font-bold text-slate-600 dark:text-dark-300">{formatDate(h.date)}</td>
                          <td className="table-cell font-black text-slate-900 dark:text-white truncate max-w-[180px]">{h.details || 'Daily Sale'}</td>
                          <td className="table-cell text-right text-emerald-600 font-mono font-bold">{h.qtyIn ? `+${h.qtyIn.toLocaleString()}` : '—'}</td>
                          <td className="table-cell text-right text-red-600 font-mono font-bold">{h.qtyOut ? `-${h.qtyOut.toLocaleString()}` : '—'}</td>
                          <td className="table-cell text-right font-black text-slate-900 dark:text-white tabular-nums">{h.balance.toLocaleString()} L</td>
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
        </div>
      </div>
    );
  }

  // ── Overview Render ──
  const cards = [
    { type: 'HSD' as const, label: 'High Speed Diesel', color: 'amber', icon: <Fuel className="w-8 h-8" />, data: stockData.HSD },
    { type: 'PMG' as const, label: 'Petrol / Motor Gasoline', color: 'emerald', icon: <Zap className="w-8 h-8" />, data: stockData.PMG },
  ];

  return (
    <div className="animate-fade-in space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-cyan-600 to-cyan-800 flex items-center justify-center shadow-xl shadow-cyan-900/20 border-2 border-white/20">
            <BarChart3 className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Stock Overview</h1>
            <p className="text-slate-500 dark:text-dark-400 text-sm font-bold uppercase tracking-widest">Real-time Inventory Status</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadStats}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            Download Stock Stats
          </button>
          {/* Global Date Filter for Overview */}
          <div className="flex items-center gap-2 bg-white dark:bg-dark-900 p-2 rounded-2xl border border-slate-200 dark:border-dark-700 shadow-sm overflow-x-auto">
          <div className="flex items-center bg-slate-50 dark:bg-dark-800 p-1 rounded-xl border border-slate-100 dark:border-dark-750 mr-2">
            <button onClick={() => { setFromDate(today()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all">Today</button>
            <button onClick={() => { setFromDate(startOfMonth()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Month</button>
            <button onClick={() => { setFromDate(startOfYear()); setToDate(today()); }} className="px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-dark-900 rounded-lg transition-all border-l border-slate-200 dark:border-dark-700/50">This Year</button>
          </div>
          <div className="flex items-center gap-2 px-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">From</span>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); }} className="input !py-1 !px-2 !w-32 !text-xs" />
          </div>
          <div className="flex items-center gap-2 px-3 border-l border-slate-100 dark:border-dark-700">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">To</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); }} className="input !py-1 !px-2 !w-32 !text-xs" />
          </div>
          {(fromDate || toDate) && (
            <button
              onClick={() => { setFromDate(''); setToDate(''); }}
              className="ml-2 px-3 py-1.5 text-[10px] font-black uppercase tracking-tighter text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 transition-all border border-red-200 dark:border-red-800/30"
              title="Clear Filters"
            >
              Clear
            </button>
          )}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {cards.map(({ type, label, color, icon, data }) => (
          <div key={type} className="glass rounded-[2.5rem] p-8 border border-slate-200 dark:border-dark-700/50 shadow-2xl relative overflow-hidden group">
            <div className={cn("absolute top-0 right-0 w-40 h-40 rounded-bl-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700 opacity-20", color === 'amber' ? 'bg-amber-500' : 'bg-emerald-500')} />

            <div className="flex items-center gap-6 mb-10 relative">
              <div className={cn("w-16 h-16 rounded-3xl flex items-center justify-center border shadow-inner", color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-600' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600')}>
                {icon}
              </div>
              <div className="min-w-0">
                <h2 className={cn("text-2xl font-black tracking-tight", color === 'amber' ? 'text-amber-600' : 'text-emerald-600')}>{type}</h2>
                <p className="text-xs font-bold text-slate-500 dark:text-dark-500 uppercase tracking-widest truncate">{label}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 relative border-t border-slate-100 dark:border-dark-800/60 pt-10">
              {[
                { label: 'Purchase', qty: data.totalPurchased, value: data.purchaseValue, icon: TrendingUp, color: 'text-emerald-600' },
                { label: 'Sale', qty: data.totalSold, value: data.saleValue, icon: TrendingDown, color: 'text-red-600' },
                { label: 'Remaining', qty: data.current, value: null, icon: Package, color: color === 'amber' ? 'text-amber-600' : 'text-emerald-600', highlight: true },
              ].map(block => (
                <div key={block.label} className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <block.icon className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{block.label}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("font-black tabular-nums tracking-tighter", block.highlight ? 'text-4xl' : 'text-2xl text-slate-900 dark:text-white', block.color)}>
                      {block.qty.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">L</span>
                  </div>
                  {block.value !== null && (
                    <p className="text-[11px] font-bold text-slate-500 tabular-nums">₨ {formatCurrency(block.value)}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Progress Visualization */}
            <div className="mt-8 pt-8 border-t border-slate-100 dark:border-dark-800/60">
              <div className="flex justify-between text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3">
                <span>Utilization</span>
                <span className={color === 'amber' ? 'text-amber-600' : 'text-emerald-600'}>{data.totalPurchased > 0 ? ((data.totalSold / data.totalPurchased) * 100).toFixed(1) : 0}% sold</span>
              </div>
              <div className="h-4 bg-slate-100 dark:bg-dark-800 rounded-full overflow-hidden p-1 shadow-inner">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000 shadow-lg", color === 'amber' ? 'bg-gradient-to-r from-amber-400 to-amber-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600')}
                  style={{ width: `${Math.min(100, data.totalPurchased > 0 ? (data.totalSold / data.totalPurchased) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* NEW BUTTONS */}
            <button
              onClick={() => navigate(`/stock/${type.toLowerCase()}`)}
              className={cn(
                "w-full mt-8 py-4 rounded-3xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 border shadow-sm active:scale-95 group",
                color === 'amber'
                  ? "bg-amber-600 text-white border-transparent hover:bg-amber-700 shadow-amber-600/20"
                  : "bg-emerald-600 text-white border-transparent hover:bg-emerald-700 shadow-emerald-600/20"
              )}
            >
              <LayoutList className="w-4 h-4" />
              Manage {type} Stock Details
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        ))}
      </div>

      {/* Combined Insights Table */}
      <div className="glass rounded-[2rem] overflow-hidden border border-slate-200 dark:border-dark-700/50 shadow-xl">
        <div className="p-6 bg-white/30 dark:bg-dark-800/30 border-b border-slate-200 dark:border-dark-700/50 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Stock Analysis Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-dark-900/50">
                <th className="px-8 py-5 text-left text-[11px] font-black text-slate-400 uppercase tracking-widest">Fuel Category</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Purchase Volume (L)</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-slate-400 uppercase tracking-widest">Sales Volume (L)</th>
                <th className="px-8 py-5 text-right text-[11px] font-black text-primary-600 uppercase tracking-widest bg-primary-600/5">Remaining Stock (L)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-dark-800">
              <tr className="group hover:bg-slate-50/50 dark:hover:bg-dark-900/40">
                <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-dark-300 uppercase tracking-tighter">HSD</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-emerald-600">{stockData.HSD.totalPurchased.toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-red-600">{stockData.HSD.totalSold.toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums bg-primary-600/5 text-slate-900 dark:text-white">{stockData.HSD.current.toLocaleString()} L</td>
              </tr>
              <tr className="group hover:bg-slate-50/50 dark:hover:bg-dark-900/40">
                <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-dark-300 uppercase tracking-tighter">PMG</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-emerald-600">{stockData.PMG.totalPurchased.toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-red-600">{stockData.PMG.totalSold.toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums bg-primary-600/5 text-slate-900 dark:text-white">{stockData.PMG.current.toLocaleString()} L</td>
              </tr>
              <tr aria-hidden="true">
                <td colSpan={4} className="px-0 py-0">
                  <div className="h-[1px] w-full bg-slate-300 dark:bg-dark-600" />
                </td>
              </tr>
              <tr className="group hover:bg-slate-50/50 dark:hover:bg-dark-900/40">
                <td className="px-8 py-5 text-sm font-black text-slate-700 dark:text-dark-300 uppercase tracking-tighter">Total Volume</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-emerald-600">{(stockData.HSD.totalPurchased + stockData.PMG.totalPurchased).toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums text-red-600">{(stockData.HSD.totalSold + stockData.PMG.totalSold).toLocaleString()} L</td>
                <td className="px-8 py-5 text-right font-black tabular-nums bg-primary-600/5 text-2xl text-black dark:text-white">
                  {(stockData.HSD.current + stockData.PMG.current).toLocaleString()} L
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
