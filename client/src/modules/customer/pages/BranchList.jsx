// client/src/modules/customer/pages/BranchList.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getBranches } from '../services/branchService';
import { useCart } from '../context/CartContext';
import { addressLine, hoursLabel, isOpenNow } from '../utils/format';

export default function BranchList() {
  const [branches, setBranches] = useState(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null); // branch waiting for "switch and empty cart" confirmation
  const cart = useCart();
  const navigate = useNavigate();

  const load = async () => {
    setError('');
    try {
      setBranches(await getBranches());
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => { load(); }, []);

  const go = (b) => {
    cart.chooseBranch(b);
    setPending(null);
    navigate('/menu');
  };

  const choose = (b) => {
    const switching = cart.branch && cart.branch._id !== b._id && cart.count > 0;
    if (switching) setPending(b);
    else go(b);
  };

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load our branches</h2>
        <p className="error">{error}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!branches) return <div className="panel"><p>Loading branches...</p></div>;

  return (
    <div className="page">
      <h2>Choose a branch</h2>
      <p className="muted">Menus, availability and delivery depend on the branch you pick.</p>

      {pending && (
        <div className="notice" role="alert">
          <p>
            Your cart has {cart.count} item(s) from {cart.branch.name}. Switching to {pending.name} will empty it.
          </p>
          <div className="actions">
            <button onClick={() => go(pending)}>Switch and empty cart</button>
            <button className="secondary" onClick={() => setPending(null)}>Keep my cart</button>
          </div>
        </div>
      )}

      {branches.length === 0 && <p className="muted">No branches are open for ordering right now.</p>}

      <div className="menu-grid">
        {branches.map((b) => {
          const open = isOpenNow(b.operatingHours);
          const selected = cart.branch?._id === b._id;
          return (
            <article key={b._id} className="dish">
              <div className="dish-body">
                <h3>{b.name}</h3>
                <p className="muted">{addressLine(b.address)}</p>
                {b.phone && <p className="muted">Phone: {b.phone}</p>}
                <p className="muted">Open {hoursLabel(b.operatingHours)}</p>
              </div>
              <div className="dish-foot">
                <span className={`badge ${open ? '' : 'closed'}`}>{open ? 'Open now' : 'Closed now'}</span>
                <button onClick={() => choose(b)}>{selected ? 'Continue ordering' : 'Order from here'}</button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
