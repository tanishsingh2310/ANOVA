// client/src/App.jsx
// NOTE: when the team merges, the shared dashboard shell (Member 1) will own this file.
// Member 4 only adds its own <Route> entries and the customer.css import.
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import './modules/customer/customer.css';
import Profile from './modules/customer/pages/Profile';
import DevLogin from './modules/customer/pages/DevLogin';
import RequireRole from './modules/customer/components/RequireRole';
import { clearToken, getRole } from './modules/customer/utils/session';

function TopBar() {
  const navigate = useNavigate();
  const role = getRole();
  const logout = () => { clearToken(); navigate('/dev-login'); };
  return (
    <header className="topbar">
      <span className="brand">ANOVA</span>
      {role === 'customer' && <Link to="/profile">My profile</Link>}
      {role && <button className="secondary" onClick={logout}>Sign out</button>}
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <TopBar />
      <Routes>
        <Route path="/dev-login" element={<DevLogin />} />
        <Route path="/profile" element={
          <RequireRole roles={['customer']}><Profile /></RequireRole>
        } />
        <Route path="*" element={<Navigate to="/profile" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
