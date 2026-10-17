// client/src/modules/customer/pages/Offers.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getOffers } from '../services/couponService';
import { useCart } from '../context/CartContext';
import { describeOffer, formatDate } from '../utils/format';

export default function Offers() {
  const [offers, setOffers] = useState(null);
  const [error, setError] = useState('');
  const cart = useCart();
  const navigate = useNavigate();
  const branch = cart.branch;

  const load = async () => {
    setError('');
    try {
      setOffers(await getOffers(branch?._id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => { load(); }, [branch?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load offers</h2>
        <p className="error">{error}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!offers) return <div className="panel"><p>Loading offers...</p></div>;

  return (
    <div className="page">
      <h2>Offers</h2>
      <p className="muted">
        {branch ? `Offers you can use at ${branch.name}.` : 'Choose a branch to see offers for that branch.'}
      </p>
      {offers.length === 0 && <p className="muted">There are no offers right now. Please check back soon.</p>}

      <div className="menu-grid">
        {offers.map((o) => (
          <article key={o.code} className="dish">
            <div className="dish-body">
              <span className="code-chip">{o.code}</span>
              <h3>{o.title}</h3>
              <p>{describeOffer(o)}</p>
              {o.description && <p className="muted">{o.description}</p>}
              <p className="muted">
                {o.branches?.length ? 'Selected branches only' : 'All branches'}
                {o.validTo ? `, valid until ${formatDate(o.validTo)}` : ''}
              </p>
            </div>
            <div className="dish-foot">
              <span />
              <button onClick={() => navigate('/checkout', { state: { code: o.code } })}>Use at checkout</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
