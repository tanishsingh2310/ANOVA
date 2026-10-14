import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getOrder } from '../services/orderService';

/** Skeleton tracking page — real-time status comes with the orders API later. */
export default function OrderTracking() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(orderId)
      .then(setOrder)
      .catch((err) => setError(err.message || 'Failed to load order'))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) return <p>Loading order…</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!order) return <p>Order not found.</p>;

  return (
    <div>
      <p>
        <Link to="/">← Branches</Link>
      </p>
      <h1>Order tracking</h1>
      <p>
        Order <code>{order._id}</code>
      </p>
      <p>
        Status: <strong>{order.status}</strong>
        {order.estimatedMinutes != null && ` · ~${order.estimatedMinutes} min`}
      </p>

      <h3>Timeline (skeleton)</h3>
      <ol>
        {(order.timeline || []).map((step) => (
          <li key={`${step.status}-${step.at}`}>
            <strong>{step.status}</strong>
            {step.at && (
              <span style={{ color: '#666' }}> — {new Date(step.at).toLocaleString()}</span>
            )}
          </li>
        ))}
      </ol>

      <p style={{ color: '#666', fontSize: 14 }}>
        Live updates and kitchen / delivery status will plug into this page once the
        orders API is available. Data currently comes from{' '}
        <code>orderService.getOrder</code>.
      </p>
    </div>
  );
}
