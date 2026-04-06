import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import { ToastProvider } from './components/ui/Toast';
import Dashboard  from './pages/Dashboard';
import Purchase   from './pages/Purchase';
import Sale       from './pages/Sale';
import Ledger     from './pages/Ledger';
import Expense    from './pages/Expense';
import Asset      from './pages/Asset';
import Liability  from './pages/Liability';
import Stock      from './pages/Stock';
import StockDetail from './pages/StockDetail';
import Customer   from './pages/Customer';

import { ThemeProvider } from './contexts/ThemeContext';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index           element={<Dashboard />} />
              <Route path="purchase" element={<Purchase />} />
              <Route path="sale"     element={<Sale />} />
              <Route path="ledger"   element={<Ledger />} />
              <Route path="expense"  element={<Expense />} />
              <Route path="asset"    element={<Asset />} />
              <Route path="liability"element={<Liability />} />
              <Route path="stock"    element={<Stock />} />
              <Route path="stock/:type" element={<StockDetail />} />
              <Route path="customer" element={<Customer />} />
            </Route>
          </Routes>
        </ToastProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
