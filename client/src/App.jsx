// client/src/App.jsx
// NOTE: when the team merges, the shared dashboard shell (Member 1) will own this file.
// Member 4 only adds its own <Route> entries, the CartProvider and the css imports.
import { BrowserRouter, Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import './modules/customer/customer.css';
import './modules/customer/ordering.css';
import Profile from './modules/customer/pages/Profile';
import DevLogin from './modules/customer/pages/DevLogin';
import BranchList from './modules/customer/pages/BranchList';
import Menu from './modules/customer/pages/Menu';
import Cart from './modules/customer/pages/Cart';
import Checkout from './modules/customer/pages/Checkout';
import MyOrders from './modules/customer/pages/MyOrders';
import Offers from './modules/customer/pages/Offers';
import AdminCoupons from './modules/customer/pages/AdminCoupons';
import OrderTracking from './modules/customer/pages/OrderTracking';
import RequireRole from './modules/customer/components/RequireRole';
import { CartProvider, useCart } from './modules/customer/context/CartContext';
import { clearToken, getRole } from './modules/customer/utils/session';
import { USE_MOCK } from './modules/customer/config';

function TopBar() {
  const navigate = useNavigate();
  const cart = useCart();
  const role = getRole();
  const logout = () => { clearToken(); cart.reset(); navigate('/dev-login'); };
  return (
    <>
      <header className="topbar">
        <span className="brand">ANOVA</span>
        {role === 'customer' && (
          <nav aria-label="Main">
            <NavLink to="/branches">Branches</NavLink>
            <NavLink to="/menu">Menu</NavLink>
            <NavLink to="/offers">Offers</NavLink>
            <NavLink to="/cart">
              Cart{cart.count > 0 && <span className="cart-count">{cart.count}</span>}
            </NavLink>
            <NavLink to="/orders">My orders</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>
        )}
        {STAFF.includes(role) && (
          <nav aria-label="Staff">
            <NavLink to="/admin/coupons">Promotions</NavLink>
          </nav>
        )}
        {role && <button className="secondary" onClick={logout}>Sign out</button>}
      </header>
      {USE_MOCK && (
        <p className="demo-note">Demo mode: branches, menus and orders are simulated until the restaurant API is connected.</p>
      )}
    </>
  );
}

const STAFF = ['owner', 'admin', 'manager'];
const staffOnly = (el) => <RequireRole roles={STAFF}>{el}</RequireRole>;
const customerOnly = (el) => <RequireRole roles={['customer']}>{el}</RequireRole>;

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <TopBar />
        <Routes>
          <Route path="/dev-login" element={<DevLogin />} />
          <Route path="/branches" element={customerOnly(<BranchList />)} />
          <Route path="/menu" element={customerOnly(<Menu />)} />
          <Route path="/offers" element={customerOnly(<Offers />)} />
          <Route path="/admin/coupons" element={staffOnly(<AdminCoupons />)} />
          <Route path="/cart" element={customerOnly(<Cart />)} />
          <Route path="/checkout" element={customerOnly(<Checkout />)} />
          <Route path="/orders" element={customerOnly(<MyOrders />)} />
          <Route path="/orders/:id" element={customerOnly(<OrderTracking />)} />
          <Route path="/profile" element={customerOnly(<Profile />)} />
          <Route path="*" element={<Navigate to={STAFF.includes(getRole()) ? '/admin/coupons' : '/branches'} replace />} />
        </Routes>
      </CartProvider>
    </BrowserRouter>
  );
}
