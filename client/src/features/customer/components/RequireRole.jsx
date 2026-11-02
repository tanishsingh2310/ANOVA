// client/src/modules/customer/components/RequireRole.jsx
// UX guard only: hides pages the role should not see. The API enforces access.
import { Navigate } from 'react-router-dom';
import { getRole } from '../utils/session';

export default function RequireRole({ roles, children }) {
  const role = getRole();
  if (!role) return <Navigate to="/dev-login" replace />;
  if (!roles.includes(role)) {
    return (
      <div className="panel">
        <h2>No access</h2>
        <p>Your account type ({role}) cannot open this page.</p>
      </div>
    );
  }
  return children;
}
