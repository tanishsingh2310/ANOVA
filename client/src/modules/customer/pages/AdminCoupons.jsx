// client/src/modules/customer/pages/AdminCoupons.jsx
// Staff screen for promotions. The backend decides who may do what; this page only
// hides controls the role cannot use (owner/admin manage, manager is read-only).
import { useEffect, useState } from 'react';
import { errorMessage } from '../../../api/axios';
import * as svc from '../services/adminCouponService';
import { describeOffer, formatDate } from '../utils/format';
import { getRole } from '../utils/session';

const empty = {
  code: '', title: '', description: '', discountType: 'percent', discountValue: '',
  minOrderAmount: '', maxDiscount: '', validFrom: '', validTo: '', usageLimit: '',
  perCustomerLimit: 1, isPublic: true, branches: [],
};

const num = (v) => (v === '' || v === null ? undefined : Number(v));
// Dates are chosen as days. Start = beginning of that day, end = last second of that day.
const startOf = (d) => (d ? new Date(`${d}T00:00:00`).toISOString() : undefined);
const endOf = (d) => (d ? new Date(`${d}T23:59:59`).toISOString() : undefined);

export default function AdminCoupons() {
  const canManage = ['owner', 'admin'].includes(getRole());
  const [coupons, setCoupons] = useState(null);
  const [branches, setBranches] = useState(null); // null = unavailable
  const [form, setForm] = useState(empty);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoadError('');
    try {
      setCoupons(await svc.listCoupons());
    } catch (err) {
      setLoadError(errorMessage(err));
    }
  };
  useEffect(() => {
    load();
    svc.listBranchesForAdmin().then(setBranches).catch(() => setBranches(null));
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleBranch = (id) =>
    set('branches', form.branches.includes(id) ? form.branches.filter((b) => b !== id) : [...form.branches, id]);

  const run = async (action, okText) => {
    setBusy(true);
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ type: 'ok', text: okText });
      return true;
    } catch (err) {
      setNotice({ type: 'error', text: errorMessage(err) });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      code: form.code, title: form.title, description: form.description || undefined,
      discountType: form.discountType, discountValue: num(form.discountValue),
      minOrderAmount: num(form.minOrderAmount), maxDiscount: num(form.maxDiscount),
      validFrom: startOf(form.validFrom), validTo: endOf(form.validTo),
      usageLimit: num(form.usageLimit), perCustomerLimit: num(form.perCustomerLimit),
      isPublic: form.isPublic, branches: form.branches,
    };
    if (await run(() => svc.createCoupon(body), 'Coupon created')) setForm(empty);
  };

  if (loadError) {
    return (
      <div className="panel">
        <h2>Could not load coupons</h2>
        <p className="error">{loadError}</p>
        <button onClick={load}>Try again</button>
      </div>
    );
  }
  if (!coupons) return <div className="panel"><p>Loading coupons...</p></div>;

  return (
    <div className="page">
      <h2>Promotions</h2>
      {!canManage && <p className="muted">You can view coupons. Owners and admins can change them.</p>}
      {notice && <p className={notice.type === 'ok' ? 'success' : 'error'} role="status">{notice.text}</p>}

      {coupons.length === 0 ? (
        <p className="muted">No coupons yet.{canManage ? ' Create the first one below.' : ''}</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Code</th><th>Offer</th><th>Valid</th><th>Used</th><th>Status</th>{canManage && <th>Actions</th>}</tr>
            </thead>
            <tbody>
              {coupons.map((c) => (
                <tr key={c._id}>
                  <td><span className="code-chip">{c.code}</span><div className="muted">{c.isPublic ? 'Public' : 'Private'}</div></td>
                  <td><strong>{c.title}</strong><div className="muted">{describeOffer(c)}</div>
                    <div className="muted">{c.branches?.length ? `${c.branches.length} branch(es)` : 'All branches'}</div></td>
                  <td className="muted">{c.validFrom ? formatDate(c.validFrom) : 'Now'} to {c.validTo ? formatDate(c.validTo) : 'no end'}</td>
                  <td>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ''}</td>
                  <td><span className={`badge ${c.isActive ? '' : 'closed'}`}>{c.isActive ? 'Active' : 'Inactive'}</span></td>
                  {canManage && (
                    <td>
                      <div className="actions">
                        <button className="secondary" disabled={busy}
                          onClick={() => run(() => svc.updateCoupon(c._id, { isActive: !c.isActive }),
                            c.isActive ? 'Coupon deactivated' : 'Coupon activated')}>
                          {c.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                        <button className="danger" disabled={busy}
                          onClick={() => window.confirm(`Delete ${c.code}?`) && run(() => svc.deleteCoupon(c._id), 'Coupon deleted')}>
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canManage && (
        <form onSubmit={submit} className="panel stack" style={{ maxWidth: 'none' }}>
          <h3 style={{ margin: 0 }}>Create a coupon</h3>
          <div className="grid2">
            <label>Code<input required value={form.code} maxLength={20} onChange={(e) => set('code', e.target.value.toUpperCase())} /></label>
            <label>Title<input required value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} /></label>
          </div>
          <label>Description<input value={form.description} maxLength={300} onChange={(e) => set('description', e.target.value)} /></label>
          <div className="grid2">
            <label>Discount type
              <select value={form.discountType} onChange={(e) => set('discountType', e.target.value)}>
                <option value="percent">Percent</option>
                <option value="fixed">Fixed amount</option>
              </select>
            </label>
            <label>Discount value<input required type="number" min="0.01" step="0.01" value={form.discountValue} onChange={(e) => set('discountValue', e.target.value)} /></label>
            <label>Minimum order<input type="number" min="0" value={form.minOrderAmount} onChange={(e) => set('minOrderAmount', e.target.value)} /></label>
            {form.discountType === 'percent' && (
              <label>Maximum discount<input type="number" min="0" value={form.maxDiscount} onChange={(e) => set('maxDiscount', e.target.value)} /></label>
            )}
          </div>
          <div className="grid2">
            <label>Starts<input type="date" value={form.validFrom} onChange={(e) => set('validFrom', e.target.value)} /></label>
            <label>Ends<input type="date" value={form.validTo} onChange={(e) => set('validTo', e.target.value)} /></label>
            <label>Total uses (blank = unlimited)<input type="number" min="1" value={form.usageLimit} onChange={(e) => set('usageLimit', e.target.value)} /></label>
            <label>Uses per customer<input type="number" min="1" value={form.perCustomerLimit} onChange={(e) => set('perCustomerLimit', e.target.value)} /></label>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => set('isPublic', e.target.checked)} />
            Show on the customer Offers page
          </label>

          {branches ? (
            <fieldset>
              <legend>Branches (none ticked = all branches)</legend>
              {branches.map((b) => (
                <label key={b._id} className="check">
                  <input type="checkbox" checked={form.branches.includes(b._id)} onChange={() => toggleBranch(b._id)} />
                  {b.name}
                </label>
              ))}
            </fieldset>
          ) : (
            <p className="muted">The branch list is not available yet, so this coupon will apply to all branches.</p>
          )}

          <button type="submit" disabled={busy}>Create coupon</button>
        </form>
      )}
    </div>
  );
}
