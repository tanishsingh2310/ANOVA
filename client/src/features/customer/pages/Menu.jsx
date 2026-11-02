// client/src/modules/customer/pages/Menu.jsx
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { errorMessage } from '../../../api/axios';
import { getMenu } from '../services/menuService';
import { useCart } from '../context/CartContext';
import QtyStepper from '../components/QtyStepper';
import { formatPrice, hoursLabel, isOpenNow } from '../utils/format';

export default function Menu() {
  const cart = useCart();
  const branch = cart.branch;
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');

  const load = async () => {
    if (!branch) return;
    setError('');
    setItems(null);
    try {
      setItems(await getMenu(branch._id));
    } catch (err) {
      setError(errorMessage(err));
    }
  };
  useEffect(() => { setCategory('All'); load(); }, [branch?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = useMemo(
    () => ['All', ...new Set((items || []).map((i) => i.category).filter(Boolean))],
    [items]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (items || []).filter(
      (i) =>
        (category === 'All' || i.category === category) &&
        (!q || `${i.name} ${i.description || ''}`.toLowerCase().includes(q))
    );
  }, [items, category, query]);

  if (!branch) return <Navigate to="/branches" replace />;

  if (error) {
    return (
      <div className="panel">
        <h2>Could not load the menu</h2>
        <p className="error">{error}</p>
        <div className="actions">
          <button onClick={load}>Try again</button>
          <Link className="btn secondary" to="/branches">Choose another branch</Link>
        </div>
      </div>
    );
  }
  if (!items) return <div className="panel"><p>Loading the menu for {branch.name}...</p></div>;

  const open = isOpenNow(branch.operatingHours);

  return (
    <div className="page">
      <h2>Menu</h2>
      <p className="muted">
        Ordering from <strong>{branch.name}</strong> (open {hoursLabel(branch.operatingHours)}).{' '}
        <Link to="/branches">Change branch</Link>
      </p>
      {!open && (
        <p className="notice" role="status">
          This branch is closed right now. You can browse the menu, but orders cannot be placed until it opens.
        </p>
      )}

      <div className="toolbar">
        <div className="chips" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} className={`chip ${c === category ? 'active' : ''}`}
              aria-pressed={c === category} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search dishes" aria-label="Search dishes" />
      </div>

      {items.length === 0 && <p className="muted">This branch has no menu items yet. Try another branch.</p>}
      {items.length > 0 && visible.length === 0 && (
        <p className="muted">No dishes match your search. Try another category or word.</p>
      )}

      <div className="menu-grid">
        {visible.map((item) => {
          const inCart = cart.items.find((c) => c.menuItem === item._id);
          return (
            <article key={item._id} className={`dish ${item.isAvailable ? '' : 'unavailable'}`}>
              <div className="dish-body">
                <h3>{item.name}</h3>
                {item.description && <p className="muted">{item.description}</p>}
              </div>
              <div className="dish-foot">
                <strong>{formatPrice(item.price)}</strong>
                {!item.isAvailable && <span className="muted">Not available today</span>}
                {item.isAvailable && !inCart && <button onClick={() => cart.add(item)}>Add</button>}
                {item.isAvailable && inCart && (
                  <QtyStepper name={item.name} quantity={inCart.quantity}
                    onChange={(q) => cart.setQuantity(item._id, q)} />
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
