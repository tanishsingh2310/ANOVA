// client/src/modules/customer/pages/Checkout.jsx
import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getProfile } from '../services/customerService';
import { placeOrder } from '../services/orderService';
import { validateCoupon } from '../services/couponService';
import { useCart } from '../context/CartContext';
import { addressLine, formatPrice, isOpenNow } from '../utils/format';

export default function Checkout() {
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [couponInput, setCouponInput] = useState(location.state?.code || '');
  const [applied, setApplied] = useState(null); // { code, title, discount }, a preview from the server
  const [couponMsg, setCouponMsg] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [orderType, setOrderType] = useState('delivery');
  const [addressId, setAddressId] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const p = await getProfile();
        setProfile(p);
        const def = p.addresses.find((a) => a.isDefault) || p.addresses[0];
        if (def) setAddressId(def._id);
      } catch (err) {
        setLoadError(errorMessage(err));
      }
    })();
  }, []);

  if (!cart.branch) return <Navigate to="/branches" replace />;

  if (cart.items.length === 0) {
    return (
      <div className="panel">
        <h2>Nothing to check out</h2>
        <p className="muted">Your cart is empty.</p>
        <Link className="btn" to="/menu">Browse the menu</Link>
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="panel">
        <h2>Could not load your details</h2>
        <p className="error">{loadError}</p>
        <button onClick={() => window.location.reload()}>Try again</button>
      </div>
    );
  }
  if (!profile) return <div className="panel"><p>Loading checkout...</p></div>;

  const address = profile.addresses.find((a) => a._id === addressId);
  const branch = cart.branch;
  const branchOpen = isOpenNow(branch.operatingHours);

  const applyCoupon = async () => {
    setCouponMsg('');
    setCouponBusy(true);
    try {
      setApplied(await validateCoupon({ code: couponInput, branch: branch._id, subtotal: cart.subtotal }));
    } catch (err) {
      setApplied(null);
      setCouponMsg(errorMessage(err));
    } finally {
      setCouponBusy(false);
    }
  };
  const removeCoupon = () => { setApplied(null); setCouponMsg(''); };

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    if (!branchOpen) return setError(`${branch.name} is closed right now.`);
    if (orderType === 'delivery') {
      if (!address) return setError('Choose a delivery address, or add one in your profile.');
      if (!profile.phone) return setError('Add a phone number in your profile so the rider can reach you.');
    }

    // Only ids and quantities are sent. Prices are decided by the server.
    const payload = {
      branch: branch._id,
      orderType,
      items: cart.items.map((i) => ({ menuItem: i.menuItem, quantity: i.quantity })),
      notes: notes.trim() || undefined,
      contactPhone: profile.phone || undefined,
      couponCode: applied?.code, // the server recalculates the discount from this code
    };
    if (orderType === 'delivery') {
      const { label, line1, city, postalCode, location } = address;
      payload.delivery = { address: { label, line1, city, postalCode, location } };
    }

    setBusy(true);
    try {
      const order = await placeOrder(payload);
      cart.clear();
      navigate(`/orders/${order._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2>Checkout</h2>
      <p className="muted">Ordering from <strong>{branch.name}</strong>, {addressLine(branch.address)}</p>
      {!branchOpen && (
        <p className="notice" role="status">This branch is closed right now, so orders cannot be placed.</p>
      )}

      <form onSubmit={submit} className="stack">
        <fieldset>
          <legend>How would you like your order?</legend>
          <label className="check">
            <input type="radio" name="orderType" checked={orderType === 'delivery'}
              onChange={() => setOrderType('delivery')} /> Delivery
          </label>
          <label className="check">
            <input type="radio" name="orderType" checked={orderType === 'takeaway'}
              onChange={() => setOrderType('takeaway')} /> Takeaway (collect from the branch)
          </label>
        </fieldset>

        {orderType === 'delivery' && (
          profile.addresses.length === 0 ? (
            <p className="muted">
              You have no saved addresses. <Link to="/profile">Add one in your profile</Link>, then come back.
            </p>
          ) : (
            <label>Deliver to
              <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                {profile.addresses.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.label}: {[a.line1, a.city].filter(Boolean).join(', ')}
                  </option>
                ))}
              </select>
            </label>
          )
        )}

        <label>Notes for the kitchen (optional)
          <textarea rows={2} maxLength={200} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        <fieldset>
          <legend>Offer code</legend>
          {applied ? (
            <div className="summary">
              <span>{applied.code}: {applied.title}</span>
              <button type="button" className="secondary" onClick={removeCoupon}>Remove</button>
            </div>
          ) : (
            <div className="actions">
              <input value={couponInput} placeholder="Enter code" aria-label="Offer code" maxLength={20}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (couponInput.trim()) applyCoupon(); } }} />
              <button type="button" disabled={couponBusy || !couponInput.trim()} onClick={applyCoupon}>
                {couponBusy ? 'Checking...' : 'Apply'}
              </button>
            </div>
          )}
          {couponMsg && <p className="error" role="alert">{couponMsg}</p>}
          {applied && <p className="success" role="status">Offer applied.</p>}
        </fieldset>

        <h3>Order summary</h3>
        <ul className="list">
          {cart.items.map((i) => (
            <li key={i.menuItem}>
              <span>{i.quantity} x {i.name}</span>
              <span>{formatPrice(i.price * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="summary"><span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong></div>
        {applied && (
          <div className="summary"><span>Offer ({applied.code})</span><span>-{formatPrice(applied.discount)}</span></div>
        )}
        <p className="muted">
          The restaurant confirms the final total, including tax and offers. Payment is simulated and handled at billing.
        </p>

        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={busy || !branchOpen}>{busy ? 'Placing order...' : 'Place order'}</button>
      </form>
    </div>
  );
}
