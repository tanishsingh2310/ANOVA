import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { CartProvider } from './modules/customer/context/CartContext';
import CustomerLayout from './modules/customer/components/CustomerLayout';
import BranchList from './modules/customer/pages/BranchList';
import Menu from './modules/customer/pages/Menu';
import Checkout from './modules/customer/pages/Checkout';
import OrderTracking from './modules/customer/pages/OrderTracking';
import Profile from './modules/customer/pages/Profile';

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route index element={<BranchList />} />
            <Route path="branches/:branchId/menu" element={<Menu />} />
            <Route path="checkout" element={<Checkout />} />
            <Route path="orders/:orderId" element={<OrderTracking />} />
            <Route path="profile" element={<Profile />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
