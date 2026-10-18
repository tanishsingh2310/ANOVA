// client/src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import Dashboard from "./pages/Dashboard";

// Customer Online Ordering & Analytics pages
import Home from "./modules/customer/pages/Home";
import BranchList from "./modules/customer/pages/BranchList";
import Menu from "./modules/customer/pages/Menu";
import Offers from "./modules/customer/pages/Offers";
import Cart from "./modules/customer/pages/Cart";
import Checkout from "./modules/customer/pages/Checkout";
import MyOrders from "./modules/customer/pages/MyOrders";
import OrderTracking from "./modules/customer/pages/OrderTracking";
import ReviewForm from "./modules/customer/pages/ReviewForm";
import Feedback from "./modules/customer/pages/Feedback";
import Profile from "./modules/customer/pages/Profile";

// Operations & Staff pages
import AdminDeliveries from "./modules/customer/pages/AdminDeliveries";
import MyDeliveries from "./modules/customer/pages/MyDeliveries";
import AdminCoupons from "./modules/customer/pages/AdminCoupons";
import AdminFeedback from "./modules/customer/pages/AdminFeedback";
import DevLogin from "./modules/customer/pages/DevLogin";
import RequireRole from "./modules/customer/components/RequireRole";

import { CartProvider } from "./modules/customer/context/CartContext";
import { getRole } from "./modules/customer/utils/session";
import { USE_MOCK } from "./modules/customer/config";

const STAFF = ["owner", "admin", "manager"];

const staffOnly = (el) => <RequireRole roles={STAFF}>{el}</RequireRole>;
const riderOnly = (el) => <RequireRole roles={["delivery", ...STAFF]}>{el}</RequireRole>;

function HomeRoute() {
  const role = getRole();
  if (role === "delivery") return <Navigate to="/deliveries" replace />;
  if (STAFF.includes(role)) return <Navigate to="/admin" replace />;
  return <Home />;
}

function AppLayout() {
  return (
    <div className="anova-app-shell">
      <Sidebar />

      <main className="anova-main">
        <Topbar />

        {USE_MOCK && (
          <p className="demo-note">
            Demo mode: branches, menus and orders are simulated until the restaurant API is connected.
          </p>
        )}

        <div className="anova-page-content">
          <Routes>
            <Route path="/" element={<HomeRoute />} />
            <Route path="/admin" element={staffOnly(<Dashboard />)} />
            <Route path="/branches" element={<BranchList />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/orders" element={<MyOrders />} />
            <Route path="/orders/:id" element={<OrderTracking />} />
            <Route path="/orders/:id/review" element={<ReviewForm />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/profile" element={<Profile />} />

            <Route path="/admin/deliveries" element={staffOnly(<AdminDeliveries />)} />
            <Route path="/deliveries" element={riderOnly(<MyDeliveries />)} />
            <Route path="/admin/coupons" element={staffOnly(<AdminCoupons />)} />
            <Route path="/admin/feedback" element={staffOnly(<AdminFeedback />)} />
            <Route path="/dev-login" element={<DevLogin />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
        <AppLayout />
      </CartProvider>
    </BrowserRouter>
  );
}
