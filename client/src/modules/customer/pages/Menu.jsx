import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { getBranch, getMenu } from '../services/orderService';

export default function Menu() {
  const { branchId } = useParams();
  const { addItem, itemCount } = useCart();
  const [branch, setBranch] = useState(null);
  const [items, setItems] = useState([]);
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getBranch(branchId), getMenu(branchId)])
      .then(([b, menu]) => {
        setBranch(b);
        setItems(menu);
        setCategory('All');
      })
      .catch((err) => setError(err.message || 'Failed to load menu'))
      .finally(() => setLoading(false));
  }, [branchId]);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ['All', ...Array.from(set)];
  }, [items]);

  const visible = useMemo(() => {
    if (category === 'All') return items;
    return items.filter((i) => i.category === category);
  }, [items, category]);

  if (loading) return <p>Loading menu...</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!branch) return <p>Branch not found.</p>;

  return (
    <div>
      <p>
        <Link to="/">← Branches</Link>
      </p>
      <h1>{branch.name} menu</h1>
      <p>
        {branch.address}, {branch.city} ·{' '}
        <Link to="/checkout">Cart ({itemCount})</Link>
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0' }}>
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            style={{
              fontWeight: category === c ? 700 : 400,
              textDecoration: category === c ? 'underline' : 'none',
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {visible.map((item) => (
          <li
            key={item._id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              opacity: item.available ? 1 : 0.5,
            }}
          >
            <div>
              <strong>{item.name}</strong>
              <div style={{ color: '#555', fontSize: 14 }}>{item.description}</div>
              <div>Rs. {item.price}</div>
            </div>
            <button
              type="button"
              disabled={!item.available}
              onClick={() => addItem(branchId, item)}
            >
              {item.available ? 'Add' : 'Unavailable'}
            </button>
          </li>
        ))}
      </ul>

      {visible.length === 0 && <p>No items in this category.</p>}
    </div>
  );
}
