import { Link, Outlet } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CustomerLayout() {
  const { itemCount } = useCart();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 800, margin: '0 auto', padding: 16 }}>
      <nav
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          marginBottom: 24,
          paddingBottom: 12,
          borderBottom: '1px solid #ddd',
        }}
      >
        <Link to="/">Branches</Link>
        <Link to="/checkout">Cart ({itemCount})</Link>
        <Link to="/profile">Profile</Link>
      </nav>
      <Outlet />
    </div>
  );
}
