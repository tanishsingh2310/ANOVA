// client/src/modules/customer/pages/OrderTracking.jsx
// Module 4 (simulated GPS map) will plug into this page for out-for-delivery orders.
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import DeliveryMap from '../components/DeliveryMap';
import { errorMessage } from '../../../api/axios';
import { getOrder } from '../services/orderService';
import { getTracking } from '../services/deliveryService';
import { ORDER_FLOW, TERMINAL_STATUSES, addressLine, deliveryLabel, formatDate, formatPrice, statusLabel, trackingText } from '../utils/format';

const POLL_MS = 5000;
const LIVE_POLL_MS = 3000; // faster while the rider is moving, so the marker keeps up

export default function OrderTracking() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [delivery, setDelivery] = useState(null); // rider name and delivery status, if any
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let timer;
    const tick = async () => {
      try {
        const o = await getOrder(id);
        let d = null;
        if (o.orderType === 'delivery') {
          try { d = await getTracking(id); } catch { d = null; } // no delivery record yet is normal
        }
        if (!active) return;
        setOrder(o);
        setDelivery(d);
        setError('');
        if (!TERMINAL_STATUSES.includes(o.status)) {
          timer = setTimeout(tick, d?.status === 'on_the_way' ? LIVE_POLL_MS : POLL_MS);
        }
      } catch (err) {
        if (active) setError(errorMessage(err));
      }
    };
    tick();
    return () => { active = false; clearTimeout(timer); };
  }, [id, attempt]);

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load this order</h2>
        <p className="error">{error}</p>
        <div className="actions">
          <button onClick={() => setAttempt((n) => n + 1)}>Try again</button>
          <Link className="btn secondary" to="/orders">My orders</Link>
        </div>
      </div>
    );
  }
  if (!order) return <div className="panel"><p>Loading your order...</p></div>;

  const flow = ORDER_FLOW[order.orderType] || ORDER_FLOW.delivery;
  const currentIndex = flow.indexOf(order.status);
  const cancelled = order.status === 'cancelled';
  const branch = order.branch && typeof order.branch === 'object' ? order.branch : null;

  return (
    <div className="panel">
      <h2>Order {order.orderNumber || order._id.slice(-6)}</h2>
      <p className="muted">
        {order.orderType === 'delivery' ? 'Delivery' : 'Takeaway'}, placed {formatDate(order.createdAt)}
      </p>

      {cancelled ? (
        <p className="error" role="status">This order was cancelled.</p>
      ) : currentIndex === -1 ? (
        <p role="status">Status: {statusLabel(order.status)}</p>
      ) : (
        <ol className="progress" aria-label="Order progress">
          {flow.map((s, i) => (
            <li key={s} className={i < currentIndex ? 'done' : i === currentIndex ? 'current' : ''}
              aria-current={i === currentIndex ? 'step' : undefined}>
              {statusLabel(s)}
            </li>
          ))}
        </ol>
      )}

      {branch && (
        <p className="muted">
          {order.orderType === 'takeaway' ? 'Collect from' : 'Prepared at'} {branch.name}
          {branch.address ? `, ${addressLine(branch.address)}` : ''}
        </p>
      )}
      {delivery?.riderName && (
        <p role="status">Your rider: <strong>{delivery.riderName}</strong> ({deliveryLabel(delivery.status)})</p>
      )}
      {delivery?.position && delivery.route?.length > 0 && (
        <section aria-label="Delivery map">
          <h3>Live tracking <span className="muted">(simulated demo)</span></h3>
          <DeliveryMap route={delivery.route} pickup={delivery.pickup.location}
            dropoff={delivery.dropoff.location} position={delivery.position} />
          <p>{trackingText(delivery)}</p>
        </section>
      )}
      {order.delivery?.address && (
        <p className="muted">
          Delivering to {[order.delivery.address.line1, order.delivery.address.city].filter(Boolean).join(', ')}
        </p>
      )}

      <h3>Items</h3>
      <ul className="list">
        {order.items.map((i) => (
          <li key={i.menuItem}>
            <span>{i.quantity} x {i.name}</span>
            <span>{formatPrice(i.price * i.quantity)}</span>
          </li>
        ))}
      </ul>
      {order.discount > 0 && (
        <div className="summary">
          <span>Offer{order.couponCode ? ` (${order.couponCode})` : ''}</span>
          <span>-{formatPrice(order.discount)}</span>
        </div>
      )}
      {order.tax !== undefined && <div className="summary"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>}
      <div className="summary"><span>Total</span><strong>{formatPrice(order.total)}</strong></div>

      <div className="actions">
        <Link className="btn secondary" to="/orders">All my orders</Link>
        <Link className="btn secondary" to="/branches">Order again</Link>
      </div>
    </div>
  );
}
