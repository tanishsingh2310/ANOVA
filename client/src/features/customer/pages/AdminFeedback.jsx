// client/src/modules/customer/pages/AdminFeedback.jsx
// Staff: moderate and answer reviews, and work through complaints.
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/axios';
import * as svc from '../services/adminFeedbackService';
import Stars from '../components/Stars';
import { CATEGORY_LABELS, complaintLabel, formatDate } from '../utils/format';

const REVIEW_FILTERS = [['all', 'All'], ['low', 'Low ratings (1-2)'], ['hidden', 'Hidden']];
const COMPLAINT_FILTERS = ['all', 'open', 'in_review', 'resolved', 'rejected'];

export default function AdminFeedback() {
  const [tab, setTab] = useState('complaints');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [complaintFilter, setComplaintFilter] = useState('all');
  const [data, setData] = useState(null);
  const [drafts, setDrafts] = useState({}); // id -> text being typed (review reply or complaint response)
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setData(tab === 'reviews'
        ? await svc.listReviews({ low: reviewFilter === 'low', hidden: reviewFilter === 'hidden' })
        : await svc.listComplaints({ status: complaintFilter === 'all' ? undefined : complaintFilter }));
      setError('');
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => { setData(null); load(); }, [tab, reviewFilter, complaintFilter]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const draft = (id, fallback = '') => drafts[id] ?? fallback;
  const setDraft = (id, v) => setDrafts({ ...drafts, [id]: v });

  return (
    <div className="page">
      <h2>Customer feedback</h2>
      <div className="chips" role="group" aria-label="Section">
        <button className={`chip ${tab === 'complaints' ? 'active' : ''}`} aria-pressed={tab === 'complaints'} onClick={() => setTab('complaints')}>Complaints</button>
        <button className={`chip ${tab === 'reviews' ? 'active' : ''}`} aria-pressed={tab === 'reviews'} onClick={() => setTab('reviews')}>Reviews</button>
      </div>

      {tab === 'reviews' ? (
        <div className="chips" role="group" aria-label="Filter reviews" style={{ margin: '.75rem 0' }}>
          {REVIEW_FILTERS.map(([k, label]) => (
            <button key={k} className={`chip ${reviewFilter === k ? 'active' : ''}`} aria-pressed={reviewFilter === k} onClick={() => setReviewFilter(k)}>{label}</button>
          ))}
        </div>
      ) : (
        <div className="chips" role="group" aria-label="Filter complaints" style={{ margin: '.75rem 0' }}>
          {COMPLAINT_FILTERS.map((f) => (
            <button key={f} className={`chip ${complaintFilter === f ? 'active' : ''}`} aria-pressed={complaintFilter === f} onClick={() => setComplaintFilter(f)}>
              {f === 'all' ? 'All' : `${complaintLabel(f)} (${data?.counts?.[f] ?? 0})`}
            </button>
          ))}
        </div>
      )}

      {notice && <p className={notice.type === 'ok' ? 'success' : 'error'} role="status">{notice.text}</p>}
      {error && (
        <div className="panel"><p className="error">{error}</p><button onClick={load}>Try again</button></div>
      )}
      {!error && !data && <p>Loading...</p>}
      {data && data.items.length === 0 && <p className="muted">Nothing here.</p>}

      {data && tab === 'reviews' && data.items.map((r) => (
        <article key={r._id} className={`panel ${r.isHidden ? 'dim' : ''}`} style={{ maxWidth: 'none' }}>
          <div className="actions" style={{ justifyContent: 'space-between' }}>
            <span>
              <Stars value={r.foodRating} /> food
              {r.deliveryRating ? <> , <Stars value={r.deliveryRating} /> delivery</> : null}
              {r.isHidden && <span className="badge closed">Hidden</span>}
            </span>
            <span className="muted">{formatDate(r.createdAt)}</span>
          </div>
          <p className="muted">
            {r.customer?.name || r.customerName || 'Customer'}, order {r.orderNumber}{r.branch?.name ? `, ${r.branch.name}` : ''}
          </p>
          {r.comment ? <p>{r.comment}</p> : <p className="muted">No comment.</p>}
          {r.reply?.text && <p className="reply"><strong>Reply:</strong> {r.reply.text}</p>}
          <label>{r.reply?.text ? 'Change reply' : 'Reply'}
            <textarea rows={2} maxLength={500} value={draft(r._id, r.reply?.text || '')} onChange={(e) => setDraft(r._id, e.target.value)} />
          </label>
          <div className="actions">
            <button disabled={busy} onClick={() => run(() => svc.moderateReview(r._id, { reply: draft(r._id, r.reply?.text || '') }), 'Reply saved')}>Save reply</button>
            <button className="secondary" disabled={busy}
              onClick={() => run(() => svc.moderateReview(r._id, { isHidden: !r.isHidden }), r.isHidden ? 'Review is visible again' : 'Review hidden')}>
              {r.isHidden ? 'Show review' : 'Hide review'}
            </button>
          </div>
        </article>
      ))}

      {data && tab === 'complaints' && data.items.map((c) => {
        const closed = ['resolved', 'rejected'].includes(c.status);
        const text = draft(c._id, c.response || '');
        return (
          <article key={c._id} className="panel" style={{ maxWidth: 'none' }}>
            <div className="actions" style={{ justifyContent: 'space-between' }}>
              <strong>{c.subject}</strong>
              <span className={`badge ${c.status === 'rejected' ? 'closed' : ''}`}>{complaintLabel(c.status)}</span>
            </div>
            <p className="muted">
              {c.customer?.name || c.customerName || 'Customer'}, {CATEGORY_LABELS[c.category]}
              {c.orderNumber ? `, order ${c.orderNumber}` : ''}{c.branch?.name ? `, ${c.branch.name}` : ''}, {formatDate(c.createdAt)}
            </p>
            {c.description && <p>{c.description}</p>}
            {closed ? (
              <p className="reply"><strong>Reply:</strong> {c.response}</p>
            ) : (
              <>
                <label>Response to the customer
                  <textarea rows={2} maxLength={1000} value={text} onChange={(e) => setDraft(c._id, e.target.value)} />
                </label>
                <div className="actions">
                  {c.status === 'open' && (
                    <button className="secondary" disabled={busy}
                      onClick={() => run(() => svc.updateComplaint(c._id, { status: 'in_review', response: text || undefined }), 'Marked as being reviewed')}>Start review</button>
                  )}
                  {c.status === 'in_review' && (
                    <button className="secondary" disabled={busy || !text.trim()}
                      onClick={() => run(() => svc.updateComplaint(c._id, { response: text }), 'Response saved')}>Save response</button>
                  )}
                  <button disabled={busy || !text.trim()}
                    onClick={() => run(() => svc.updateComplaint(c._id, { status: 'resolved', response: text }), 'Complaint resolved')}>Resolve</button>
                  <button className="danger" disabled={busy || !text.trim()}
                    onClick={() => run(() => svc.updateComplaint(c._id, { status: 'rejected', response: text }), 'Complaint closed as not upheld')}>Not upheld</button>
                </div>
                <p className="muted">Resolving or closing needs a response, which the customer will see.</p>
              </>
            )}
          </article>
        );
      })}
    </div>
  );
}
