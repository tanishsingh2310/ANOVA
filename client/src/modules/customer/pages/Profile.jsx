// client/src/modules/customer/pages/Profile.jsx
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/axios';
import * as svc from '../services/customerService';

const DIETARY_OPTIONS = ['vegetarian', 'vegan', 'gluten-free', 'halal', 'nut-free', 'dairy-free'];
const emptyAddr = { label: 'Home', line1: '', city: '', postalCode: '' };

export default function Profile() {
  const [customer, setCustomer] = useState(null);
  const [phone, setPhone] = useState('');
  const [dietary, setDietary] = useState([]);
  const [addr, setAddr] = useState(emptyAddr);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }
  const [busy, setBusy] = useState(false);

  const applyCustomer = (c) => {
    setCustomer(c);
    setPhone(c.phone || '');
    setDietary(c.preferences?.dietary || []);
  };

  const load = async () => {
    try {
      applyCustomer(await svc.getProfile());
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  };
  useEffect(() => { load(); }, []);

  // Runs an action, shows success or the server's error message.
  const run = async (action, okText) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
      if (okText) setNotice({ type: 'ok', text: okText });
      return true;
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = (e) => {
    e.preventDefault();
    run(() => svc.updateProfile({ phone, preferences: { dietary } }), 'Profile saved');
  };

  const toggleDietary = (item) =>
    setDietary((cur) => (cur.includes(item) ? cur.filter((d) => d !== item) : [...cur, item]));

  const addAddress = async (e) => {
    e.preventDefault();
    const done = await run(() => svc.addAddress(addr), 'Address added');
    if (done) setAddr(emptyAddr);
  };

  if (loadError) {
    return (
      <div className="panel">
        <h2>Could not load your profile</h2>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!customer) return <div className="panel"><p>Loading your profile...</p></div>;

  return (
    <div className="panel">
      <h2>My profile</h2>
      <p className="muted">
        {customer.user?.name || 'Customer'}{customer.user?.email ? `, ${customer.user.email}` : ''}
      </p>
      <p className="muted">Loyalty points: {customer.loyaltyPoints}</p>

      {notice && <p className={notice.type === 'ok' ? 'success' : 'error'} role="status">{notice.text}</p>}

      <form onSubmit={saveProfile} className="stack">
        <label>
          Phone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 9876543210" />
        </label>
        <fieldset>
          <legend>Dietary preferences</legend>
          {DIETARY_OPTIONS.map((d) => (
            <label key={d} className="check">
              <input type="checkbox" checked={dietary.includes(d)} onChange={() => toggleDietary(d)} />
              {d}
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={busy}>Save profile</button>
      </form>

      <h3>Saved addresses</h3>
      {customer.addresses.length === 0 && (
        <p className="muted">No saved addresses yet. Add one below to use it at checkout.</p>
      )}
      <ul className="list">
        {customer.addresses.map((a) => (
          <li key={a._id}>
            <div>
              <strong>{a.label}</strong>{a.isDefault && <span className="badge">Default</span>}
              <div className="muted">{[a.line1, a.city, a.postalCode].filter(Boolean).join(', ')}</div>
            </div>
            <div className="actions">
              {!a.isDefault && (
                <button className="secondary" disabled={busy}
                  onClick={() => run(() => svc.setDefaultAddress(a._id), 'Default address changed')}>
                  Make default
                </button>
              )}
              <button className="danger" disabled={busy}
                onClick={() => run(() => svc.deleteAddress(a._id), 'Address deleted')}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <h3>Add an address</h3>
      <form onSubmit={addAddress} className="stack">
        <label>Label
          <input value={addr.label} onChange={(e) => setAddr({ ...addr, label: e.target.value })} />
        </label>
        <label>Address line
          <input required value={addr.line1} onChange={(e) => setAddr({ ...addr, line1: e.target.value })} />
        </label>
        <label>City
          <input value={addr.city} onChange={(e) => setAddr({ ...addr, city: e.target.value })} />
        </label>
        <label>Postal code
          <input value={addr.postalCode} onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })} />
        </label>
        <button type="submit" disabled={busy}>Add address</button>
      </form>
    </div>
  );
}
