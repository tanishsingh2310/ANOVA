// client/src/modules/customer/pages/Cart.jsx
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import QtyStepper from '../components/QtyStepper';
import { formatPrice } from '../utils/format';

export default function Cart() {
  const cart = useCart();

  if (cart.items.length === 0) {
    return (
      <div className="panel">
        <h2>Your cart is empty</h2>
        <p className="muted">Pick a branch and add a few dishes to get started.</p>
        <Link className="btn" to={cart.branch ? '/menu' : '/branches'}>{cart.branch ? 'Browse the menu' : 'Choose a branch'}</Link>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2>Your cart</h2>
      {cart.branch && (
        <p className="muted">From {cart.branch.name}. <Link to="/branches">Change branch</Link> (switching branches empties the cart)</p>
      )}
      <ul className="list">
        {cart.items.map((i) => (
          <li key={i.menuItem}>
            <div>
              <strong>{i.name}</strong>
              <div className="muted">{formatPrice(i.price)} each</div>
            </div>
            <div className="actions">
              <QtyStepper name={i.name} quantity={i.quantity} onChange={(q) => cart.setQuantity(i.menuItem, q)} />
              <strong>{formatPrice(i.price * i.quantity)}</strong>
              <button className="danger" onClick={() => cart.remove(i.menuItem)}>Remove</button>
            </div>
          </li>
        ))}
      </ul>

      <div className="summary">
        <span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong>
      </div>
      <p className="muted">Tax and any offers are added by the restaurant when the order is placed.</p>

      <div className="actions">
        <Link className="btn" to="/checkout">Go to checkout</Link>
        <button className="secondary" onClick={cart.clear}>Empty cart</button>
      </div>
    </div>
  );
}
