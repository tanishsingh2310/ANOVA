import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { useCart } from '../context/CartContext';
import { getBranch, placeOrder } from '../services/orderService';

const FULFILLMENT = {
  DELIVERY: 'delivery',
  PICKUP: 'pickup',
  DINE_IN: 'dine-in',
};

export default function Checkout() {
  const navigate = useNavigate();
  const { branchId, items, subtotal, setQuantity, removeItem, clearCart } = useCart();
  const [branch, setBranch] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [fulfillment, setFulfillment] = useState(FULFILLMENT.DELIVERY);
  const [addressId, setAddressId] = useState('');
  const [coupon, setCoupon] = useState('');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (branchId) {
      getBranch(branchId)
        .then(setBranch)
        .catch(() => setBranch(null));
    }
  }, [branchId]);

  useEffect(() => {
    api
      .get('/customers/me')
      .then(({ data }) => {
        const list = data.data?.addresses || [];
        setAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) setAddressId(def._id);
      })
      .catch(() => {
        // Guest / no token — delivery still needs a saved address later
        setAddresses([]);
      });
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (!items.length) {
      setError('Your cart is empty.');
      return;
    }
    if (fulfillment === FULFILLMENT.DELIVERY && !addressId) {
      setError('Pick a saved delivery address, or switch to pickup / dine-in.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        branchId,
        items,
        fulfillment,
        addressId: fulfillment === FULFILLMENT.DELIVERY ? addressId : null,
        couponCode: coupon.trim() || null, // placeholder — not validated yet
        subtotal,
      });
      clearCart();
      setMsg('Order placed (mock).');
      navigate(`/orders/${order._id}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Could not place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <div>
        <h1>Checkout</h1>
        <p>Your cart is empty.</p>
        <Link to="/">Browse branches</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Checkout</h1>
      {branch && (
        <p>
          Ordering from <strong>{branch.name}</strong>
        </p>
      )}

      <h3>Cart</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => (
          <li
            key={item.menuItemId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 8,
              padding: '8px 0',
              borderBottom: '1px solid #eee',
            }}
          >
            <span>
              {item.name} · Rs. {item.price}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={() => setQuantity(item.menuItemId, item.quantity - 1)}
              >
                −
              </button>
              {item.quantity}
              <button
                type="button"
                onClick={() => setQuantity(item.menuItemId, item.quantity + 1)}
              >
                +
              </button>
              <button type="button" onClick={() => removeItem(item.menuItemId)}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <p>
        <strong>Subtotal: Rs. {subtotal}</strong>
      </p>

      <form onSubmit={submit}>
        <h3>Fulfillment</h3>
        <label style={{ display: 'block', marginBottom: 6 }}>
          <input
            type="radio"
            name="fulfillment"
            checked={fulfillment === FULFILLMENT.DELIVERY}
            onChange={() => setFulfillment(FULFILLMENT.DELIVERY)}
          />{' '}
          Delivery
        </label>
        <label style={{ display: 'block', marginBottom: 6 }}>
          <input
            type="radio"
            name="fulfillment"
            checked={fulfillment === FULFILLMENT.PICKUP}
            onChange={() => setFulfillment(FULFILLMENT.PICKUP)}
          />{' '}
          Pickup
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          <input
            type="radio"
            name="fulfillment"
            checked={fulfillment === FULFILLMENT.DINE_IN}
            onChange={() => setFulfillment(FULFILLMENT.DINE_IN)}
          />{' '}
          Dine-in
        </label>

        {fulfillment === FULFILLMENT.DELIVERY && (
          <div style={{ marginBottom: 16 }}>
            <h4>Delivery address</h4>
            {addresses.length === 0 ? (
              <p>
                No saved addresses.{' '}
                <Link to="/profile">Add one on your profile</Link>.
              </p>
            ) : (
              addresses.map((a) => (
                <label key={a._id} style={{ display: 'block', marginBottom: 6 }}>
                  <input
                    type="radio"
                    name="address"
                    checked={addressId === a._id}
                    onChange={() => setAddressId(a._id)}
                  />{' '}
                  <strong>{a.label}</strong>
                  {a.isDefault && ' (default)'}: {a.line1}, {a.city} {a.postalCode}
                </label>
              ))
            )}
          </div>
        )}

        <h3>Coupon</h3>
        <p style={{ fontSize: 14, color: '#666' }}>
          Coupon validation is a placeholder until the promotions API is ready.
        </p>
        <input
          placeholder="Coupon code"
          value={coupon}
          onChange={(e) => setCoupon(e.target.value)}
          style={{ marginBottom: 16 }}
        />

        {error && <p style={{ color: 'crimson' }}>{error}</p>}
        {msg && <p>{msg}</p>}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Placing…' : 'Place order'}
        </button>
      </form>
    </div>
  );
}
