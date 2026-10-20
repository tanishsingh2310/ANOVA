// client/src/modules/customer/pages/AdminDeliveries.jsx
// Staff screen: see every delivery, assign a rider, cancel. The backend decides who may do what.
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/axios';
import * as svc from '../services/deliveryService';
import { addressLine, deliveryLabel, formatDate } from '../utils/format';

const FILTERS = ['all', 'pending', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];
const REFRESH_MS = 10000;

export default function AdminDeliveries() {
  const [data, setData] = useState(null); // { items, counts }
  const [staff, setStaff] = useState([]);
  const [filter, setFilter] = useState('all');
  const [choice, setChoice] = useState({}); // deliveryId -> chosen staff id
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async (silent = false) => {
    try {
      const [list, staffList] = await Promise.all([
        svc.listDeliveries({ status: filter === 'all' ? undefined : filter }),
        svc.listStaff(),
      ]);
      setData(list);
      setStaff(staffList);
      setError('');
    } catch (err) {
      if (!silent) setError(errorMessage(err)); // a failed background refresh should not wipe the screen
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(t);
  }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (action, okText) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ type: 'ok', text: okText });
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const cancel = (d) => {
    const reason = window.prompt('Reason for cancelling (optional)');
    if (reason === null) return;
    run(() => svc.cancelDelivery(d._id, reason.trim()), 'Delivery cancelled');
  };

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load deliveries</h2>
        <p className="error">{error}</p>
        <button onClick={() => load()}>Try again</button>
      </div>
    );
  }
  if (!data) return <div className="panel"><p>Loading deliveries...</p></div>;

  const total = Object.values(data.counts || {}).reduce((a, b) => a + b, 0);

  return (
    <div className="page">
      <h2>Deliveries</h2>
      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f} className={`chip ${f === filter ? 'active' : ''}`} aria-pressed={f === filter}
              onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${total})` : `${deliveryLabel(f)} (${data.counts?.[f] || 0})`}
            </button>
          ))}
        </div>
        <button className="secondary" onClick={() => load()}>Refresh</button>
      </div>
      {notice && <p className={notice.type === 'ok' ? 'success' : 'error'} role="status">{notice.text}</p>}

      {data.items.length === 0 ? (
        <p className="muted">
          {filter === 'all' ? 'No deliveries yet. They appear here when a customer places a delivery order.' : 'No deliveries with this status.'}
        </p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Order</th><th>Pickup</th><th>Drop-off</th><th>Status</th><th>Rider</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {data.items.map((d) => {
                const canAssign = ['pending', 'assigned'].includes(d.status);
                const canCancel = ['pending', 'assigned', 'picked_up', 'on_the_way'].includes(d.status);
                const selected = choice[d._id] ?? d.deliveryStaff?._id ?? '';
                return (
                  <tr key={d._id}>
                    <td><strong>{d.orderNumber || d.order?.slice?.(-6)}</strong>
                      <div className="muted">{formatDate(d.createdAt)}</div></td>
                    <td className="muted">{d.pickup?.name}</td>
                    <td>{d.customerName}<div className="muted">{addressLine(d.dropoff?.address)}</div></td>
                    <td><span className={`badge ${d.status === 'cancelled' ? 'closed' : ''}`}>{deliveryLabel(d.status)}</span></td>
                    <td>{d.deliveryStaff?.name || <span className="muted">Not assigned</span>}</td>
                    <td>
                      <div className="actions">
                        {canAssign && (
                          <>
                            <select aria-label={`Rider for order ${d.orderNumber}`} value={selected}
                              onChange={(e) => setChoice({ ...choice, [d._id]: e.target.value })}>
                              <option value="">Choose a rider</option>
                              {staff.map((s) => (
                                <option key={s._id} value={s._id}>{s.name} ({s.activeCount} active)</option>
                              ))}
                            </select>
                            <button disabled={busy || !selected || selected === d.deliveryStaff?._id}
                              onClick={() => run(() => svc.assignDelivery(d._id, selected), 'Rider assigned')}>
                              {d.status === 'assigned' ? 'Reassign' : 'Assign'}
                            </button>
                          </>
                        )}
                        {canCancel && <button className="danger" disabled={busy} onClick={() => cancel(d)}>Cancel</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {staff.length === 0 && (
        <p className="muted">No delivery staff found. Riders are users with the role "delivery".</p>
      )}
    </div>
  );
}
