// client/src/modules/customer/pages/MyDeliveries.jsx
// Rider screen: only the deliveries assigned to me, with just the details needed to deliver.
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/axios';
import * as svc from '../services/deliveryService';
import { USE_MOCK } from '../config';
import { MOCK_STAFF } from '../mock/staffData';
import { getMockRider, setMockRider } from '../mock/mockBackend';
import { RIDER_NEXT, addressLine, deliveryLabel, formatDate } from '../utils/format';

const REFRESH_MS = 10000;

export default function MyDeliveries() {
  const [tab, setTab] = useState('active');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);
  const [rider, setRider] = useState(getMockRider); // demo mode only

  const load = async (silent = false) => {
    try {
      setItems(await svc.getMyDeliveries({ history: tab === 'history' }));
      setError('');
    } catch (err) {
      if (!silent) setError(errorMessage(err));
    }
  };

  useEffect(() => {
    setItems(null);
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [tab, rider]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = async (d) => {
    setBusy(true);
    setNotice(null);
    try {
      await svc.riderUpdateStatus(d._id, RIDER_NEXT[d.status].to);
      await load();
    } catch (err) {
      setNotice(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const changeRider = (id) => { setMockRider(id); setRider(id); };

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load your deliveries</h2>
        <p className="error">{error}</p>
        <button onClick={() => load()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="page">
      <h2>My deliveries</h2>
      {USE_MOCK && (
        <label className="notice">Demo: act as rider
          <select value={rider} onChange={(e) => changeRider(e.target.value)}>
            {MOCK_STAFF.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </label>
      )}
      <div className="chips" role="group" aria-label="Deliveries">
        <button className={`chip ${tab === 'active' ? 'active' : ''}`} aria-pressed={tab === 'active'} onClick={() => setTab('active')}>Active</button>
        <button className={`chip ${tab === 'history' ? 'active' : ''}`} aria-pressed={tab === 'history'} onClick={() => setTab('history')}>History</button>
      </div>
      {notice && <p className="error" role="alert">{notice}</p>}

      {!items && <p>Loading...</p>}
      {items && items.length === 0 && (
        <p className="muted">{tab === 'active' ? 'Nothing assigned to you right now. New jobs appear here automatically.' : 'No finished deliveries yet.'}</p>
      )}

      <div className="menu-grid">
        {(items || []).map((d) => {
          const next = RIDER_NEXT[d.status];
          return (
            <article key={d._id} className="dish">
              <div className="dish-body">
                <h3>Order {d.orderNumber}</h3>
                <span className={`badge ${d.status === 'cancelled' ? 'closed' : ''}`}>{deliveryLabel(d.status)}</span>
                <p><strong>Pick up:</strong> {d.pickup?.name}<br />
                  <span className="muted">{addressLine(d.pickup?.address)}</span></p>
                <p><strong>Deliver to:</strong> {d.customerName}<br />
                  <span className="muted">{addressLine(d.dropoff?.address)}</span><br />
                  {d.customerPhone && <a href={`tel:${d.customerPhone}`}>{d.customerPhone}</a>}</p>
                <p className="muted">{d.itemCount} item(s)
                  {d.deliveredAt ? `, delivered ${formatDate(d.deliveredAt)}` : ''}</p>
              </div>
              {next && (
                <div className="dish-foot">
                  <span />
                  <button disabled={busy} onClick={() => advance(d)}>{next.label}</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
