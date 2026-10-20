// client/src/modules/customer/pages/MyOrders.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getMyOrders } from '../services/orderService';
import { formatDate, formatPrice, statusLabel } from '../utils/format';

export default function MyOrders() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      setOrders(await getMyOrders());
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => { load(); }, []);

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load your orders</h2>
        <p className="error">{error}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!orders) return <div className="panel"><p>Loading your orders...</p></div>;

  return (
    <div className="panel">
      <h2>My orders</h2>
      {orders.length === 0 && (
        <>
          <p className="muted">You have not placed an order yet.</p>
          <Link className="btn" to="/branches">Choose a branch</Link>
        </>
      )}
      <ul className="list">
        {orders.map((o) => (
          <li key={o._id}>
            <div>
              <strong>Order {o.orderNumber || o._id.slice(-6)}</strong>
              <div className="muted">
                {o.branch?.name ? `${o.branch.name}, ` : ''}{formatDate(o.createdAt)}, {o.items.length} item(s)
              </div>
            </div>
            <div className="actions">
              <span className="badge">{statusLabel(o.status)}</span>
              <strong>{formatPrice(o.total)}</strong>
              <Link className="btn secondary" to={`/orders/${o._id}`}>View</Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
