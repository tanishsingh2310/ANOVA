import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBranches } from '../services/orderService';

export default function BranchList() {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getBranches()
      .then(setBranches)
      .catch((err) => setError(err.message || 'Failed to load branches'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading branches...</p>;
  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  return (
    <div>
      <h1>Choose a branch</h1>
      <p>Select a location to browse the menu and place an order.</p>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {branches.map((b) => (
          <li
            key={b._id}
            style={{
              padding: '12px 0',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div>
              <strong>{b.name}</strong>
              <div style={{ color: '#555' }}>
                {b.address}, {b.city}
              </div>
              <div style={{ fontSize: 14, color: b.open ? 'green' : '#999' }}>
                {b.open ? 'Open' : 'Closed'}
              </div>
            </div>
            {b.open ? (
              <Link to={`/branches/${b._id}/menu`}>View menu</Link>
            ) : (
              <span style={{ color: '#999' }}>Unavailable</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
