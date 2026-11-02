// client/src/modules/customer/pages/ReviewForm.jsx
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getOrder } from '../services/orderService';
import { createReview } from '../services/feedbackService';
import StarRating from '../components/StarRating';

export default function ReviewForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [food, setFood] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getOrder(id).then(setOrder).catch((err) => setLoadError(errorMessage(err)));
  }, [id]);

  if (loadError) {
    return (
      <div className="panel">
        <h2>Could not load this order</h2>
        <p className="error">{loadError}</p>
        <Link className="btn secondary" to="/orders">My orders</Link>
      </div>
    );
  }
  if (!order) return <div className="panel"><p>Loading...</p></div>;

  if (!['delivered', 'completed'].includes(order.status)) {
    return (
      <div className="panel">
        <h2>Not ready for a review</h2>
        <p className="muted">You can review an order once it has been delivered or collected.</p>
        <Link className="btn secondary" to={`/orders/${order._id}`}>Back to the order</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    if (!food) return setError('Please rate the food from 1 to 5.');
    setBusy(true);
    setError('');
    try {
      await createReview({
        order: order._id, foodRating: food, comment: comment.trim() || undefined,
        deliveryRating: order.orderType === 'delivery' && delivery ? delivery : undefined,
      });
      navigate(`/orders/${order._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <h2>Rate order {order.orderNumber}</h2>
      {order.branch?.name && <p className="muted">{order.branch.name}</p>}
      <form onSubmit={submit} className="stack">
        <StarRating name="food" legend="How was the food?" value={food} onChange={setFood} />
        {order.orderType === 'delivery' && (
          <StarRating name="delivery" legend="How was the delivery? (optional)" value={delivery} onChange={setDelivery} optional />
        )}
        <label>Comment (optional)
          <textarea rows={3} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="submit" disabled={busy}>{busy ? 'Sending...' : 'Send review'}</button>
          <Link className="btn secondary" to={`/orders/${order._id}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
