// client/src/modules/customer/pages/DevLogin.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken, clearToken } from '../utils/session';

export default function DevLogin() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    setToken(value);
    navigate('/');
  };

  const setTestRole = (role) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      id: `test_${role}`,
      name: `Demo ${role.charAt(0).toUpperCase() + role.slice(1)}`,
      role,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    }));
    const fakeToken = `${header}.${payload}.sig`;
    setToken(fakeToken);
    navigate('/');
  };

  return (
    <div className="panel" style={{ maxWidth: '580px', margin: '2rem auto' }}>
      <h2>Developer & Role Sign-In</h2>
      <p className="muted">
        Select a role below for instant testing or paste a real JWT token from the backend.
      </p>

      {/* Quick Role Selectors */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '1.2rem 0' }}>
        <button
          type="button"
          onClick={() => setTestRole('delivery')}
          style={{ background: 'var(--color-primary, #183C34)', color: '#FFFFFF', padding: '10px 16px' }}
        >
          Login as Delivery Partner
        </button>

        <button
          type="button"
          onClick={() => setTestRole('manager')}
          style={{ background: 'var(--color-accent, #C5A46D)', color: 'var(--color-primary, #183C34)', padding: '10px 16px' }}
        >
          Login as Manager (Staff)
        </button>

        <button
          type="button"
          onClick={() => setTestRole('customer')}
          className="secondary"
          style={{ padding: '10px 16px' }}
        >
          Login as Customer
        </button>
      </div>

      <div style={{ margin: '1.5rem 0', borderTop: '1px solid var(--color-border, #E2E7E1)', paddingTop: '1.2rem' }}>
        <p className="muted" style={{ marginBottom: '8px', fontSize: '13px' }}>
          Or paste an existing token printed by <code>node scripts/seedUser.js</code>:
        </p>
        <form onSubmit={submit} className="stack">
          <textarea
            rows={4}
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste JWT token here..."
          />
          <button type="submit">Use this token</button>
        </form>
      </div>
    </div>
  );
}
