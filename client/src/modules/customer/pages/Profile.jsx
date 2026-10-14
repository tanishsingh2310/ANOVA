import { useEffect, useState } from 'react';
import api from '../../../api/axios';

const emptyAddr = { label: 'Home', line1: '', city: '', postalCode: '' };

export default function Profile() {
  const [customer, setCustomer] = useState(null);
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState(emptyAddr);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    const { data } = await api.get('/customers/me');
    setCustomer(data.data);
    setPhone(data.data.phone || '');
  };

  useEffect(() => {
    load().catch((err) => {
      setError(err.response?.data?.message || err.message || 'Failed to load profile');
    });
  }, []);

  const saveProfile = async (e) => {
    e.preventDefault();
    await api.put('/customers/me', { phone });
    setMsg('Profile saved');
    load();
  };

  const addAddress = async (e) => {
    e.preventDefault();
    await api.post('/customers/me/addresses', addr);
    setAddr(emptyAddr);
    load();
  };

  const makeDefault = async (id) => {
    await api.put(`/customers/me/addresses/${id}`, { isDefault: true });
    load();
  };

  const remove = async (id) => {
    await api.delete(`/customers/me/addresses/${id}`);
    load();
  };

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;
  if (!customer) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <h2>My Profile</h2>
      <p>
        {customer.user?.name} · {customer.user?.email}
      </p>

      <form onSubmit={saveProfile}>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone" />
        <button type="submit">Save</button> {msg}
      </form>

      <h3>Saved addresses</h3>
      {customer.addresses.map((a) => (
        <div key={a._id}>
          <strong>{a.label}</strong>
          {a.isDefault && ' (default)'}: {a.line1}, {a.city} {a.postalCode}
          {!a.isDefault && (
            <button type="button" onClick={() => makeDefault(a._id)}>
              Make default
            </button>
          )}
          <button type="button" onClick={() => remove(a._id)}>
            Delete
          </button>
        </div>
      ))}

      <h4>Add address</h4>
      <form onSubmit={addAddress}>
        <input
          placeholder="Label"
          value={addr.label}
          onChange={(e) => setAddr({ ...addr, label: e.target.value })}
        />
        <input
          placeholder="Address line"
          required
          value={addr.line1}
          onChange={(e) => setAddr({ ...addr, line1: e.target.value })}
        />
        <input
          placeholder="City"
          value={addr.city}
          onChange={(e) => setAddr({ ...addr, city: e.target.value })}
        />
        <input
          placeholder="Postal code"
          value={addr.postalCode}
          onChange={(e) => setAddr({ ...addr, postalCode: e.target.value })}
        />
        <button type="submit">Add</button>
      </form>
    </div>
  );
}
