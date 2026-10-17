// client/src/modules/customer/pages/DevLogin.jsx
// TEMPORARY. Delete when Member 1's real login page is merged.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setToken } from '../utils/session';

export default function DevLogin() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = (e) => {
    e.preventDefault();
    setToken(value);
    navigate('/');
  };

  return (
    <div className="panel">
      <h2>Developer sign-in</h2>
      <p className="muted">
        Temporary until the real login exists. Paste a token printed by
        <code> node scripts/seedUser.js</code>.
      </p>
      <form onSubmit={submit} className="stack">
        <textarea rows={5} required value={value} onChange={(e) => setValue(e.target.value)}
          placeholder="Paste token" />
        <button type="submit">Use this token</button>
      </form>
    </div>
  );
}
