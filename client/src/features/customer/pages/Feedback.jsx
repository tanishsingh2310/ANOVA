// client/src/modules/customer/pages/Feedback.jsx
// My reviews, my complaints (with the restaurant's replies), and a form to report a problem.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { createComplaint, getMyComplaints, getMyReviews } from '../services/feedbackService';
import { getMyOrders } from '../services/orderService';
import Stars from '../components/Stars';
import { CATEGORY_LABELS, complaintLabel, formatDate } from '../utils/format';

export default function Feedback() {
  const [params] = useSearchParams();
  const [reviews, setReviews] = useState(null);
  const [complaints, setComplaints] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ category: 'other', order: params.get('order') || '', subject: '', description: '' });
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([getMyReviews(), getMyComplaints()]);
      setReviews(r);
      setComplaints(c);
      setLoadError('');
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  };
  useEffect(() => {
    load();
    getMyOrders().then(setOrders).catch(() => setOrders([])); // the order list is optional; the form still works without it
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      await createComplaint({
        category: form.category, subject: form.subject, description: form.description || undefined,
        order: form.order || undefined,
      });
      setForm({ category: 'other', order: '', subject: '', description: '' });
      setNotice({ type: 'ok', text: 'Complaint sent. We will reply as soon as we can.' });
      await load();
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <div className="panel">
        <h2>Could not load your feedback</h2>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!reviews || !complaints) return <div className="panel"><p>Loading...</p></div>;

  return (
    <div className="page">
      <h2>Feedback</h2>

      <div className="panel" style={{ maxWidth: 'none' }}>
        <h3 style={{ marginTop: 0 }}>Report a problem</h3>
        <form onSubmit={submit} className="stack">
          <div className="grid2">
            <label>Type
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            {orders.length > 0 && (
              <label>About an order (optional)
                <select value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })}>
                  <option value="">Not about a specific order</option>
                  {orders.map((o) => (
                    <option key={o._id} value={o._id}>{o.orderNumber || o._id.slice(-6)}, {formatDate(o.createdAt)}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <label>Subject
            <input required maxLength={100} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </label>
          <label>What happened?
            <textarea rows={3} maxLength={1000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          {notice && <p className={notice.type === 'ok' ? 'success' : 'error'} role="status">{notice.text}</p>}
          <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send complaint'}</button>
        </form>
      </div>

      <div className="panel" style={{ maxWidth: 'none' }}>
        <h3 style={{ marginTop: 0 }}>My complaints</h3>
        {complaints.length === 0 && <p className="muted">You have not sent any complaints.</p>}
        <ul className="list">
          {complaints.map((c) => (
            <li key={c._id}>
              <div>
                <strong>{c.subject}</strong>
                <div className="muted">{CATEGORY_LABELS[c.category]}{c.orderNumber ? `, order ${c.orderNumber}` : ''}, {formatDate(c.createdAt)}</div>
                {c.response && <p className="reply"><strong>Reply:</strong> {c.response}</p>}
              </div>
              <span className={`badge ${c.status === 'rejected' ? 'closed' : ''}`}>{complaintLabel(c.status)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel" style={{ maxWidth: 'none' }}>
        <h3 style={{ marginTop: 0 }}>My reviews</h3>
        {reviews.length === 0 && (
          <p className="muted">No reviews yet. After an order is delivered or collected, open it from <Link to="/orders">My orders</Link> to rate it.</p>
        )}
        <ul className="list">
          {reviews.map((r) => (
            <li key={r._id}>
              <div>
                <strong>Order {r.orderNumber}</strong> <Stars value={r.foodRating} />
                {r.deliveryRating ? <span className="muted"> (delivery <Stars value={r.deliveryRating} />)</span> : null}
                {r.comment && <div>{r.comment}</div>}
                {r.reply?.text && <p className="reply"><strong>Restaurant reply:</strong> {r.reply.text}</p>}
              </div>
              <span className="muted">{formatDate(r.createdAt)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
