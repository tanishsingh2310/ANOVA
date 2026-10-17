// client/src/modules/customer/context/CartContext.jsx
// The cart belongs to ONE branch (menus and orders are per branch). Choosing a
// different branch empties the cart. Prices saved here are for DISPLAY only; the
// server recalculates every price when the order is placed.
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const KEY = 'anova_cart_v2';
const MAX_QTY = 20;
const CartContext = createContext(null);

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw && Array.isArray(raw.items)) return { branch: raw.branch || null, items: raw.items };
  } catch { /* ignore broken saved data */ }
  return { branch: null, items: [] };
};

export function CartProvider({ children }) {
  const [state, setState] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage blocked */ }
  }, [state]);

  const value = useMemo(() => {
    const { branch, items } = state;

    // Same branch: refresh its details. Different branch: start with an empty cart.
    const chooseBranch = (b) =>
      setState((cur) => (cur.branch?._id === b._id ? { ...cur, branch: b } : { branch: b, items: [] }));

    const add = (menuItem) =>
      setState((cur) => {
        const found = cur.items.find((i) => i.menuItem === menuItem._id);
        const next = found
          ? cur.items.map((i) =>
              i.menuItem === menuItem._id ? { ...i, quantity: Math.min(i.quantity + 1, MAX_QTY) } : i)
          : [...cur.items, { menuItem: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: 1 }];
        return { ...cur, items: next };
      });

    const setQuantity = (id, quantity) =>
      setState((cur) => ({
        ...cur,
        items:
          quantity <= 0
            ? cur.items.filter((i) => i.menuItem !== id)
            : cur.items.map((i) => (i.menuItem === id ? { ...i, quantity: Math.min(quantity, MAX_QTY) } : i)),
      }));

    const remove = (id) => setState((cur) => ({ ...cur, items: cur.items.filter((i) => i.menuItem !== id) }));
    const clear = () => setState((cur) => ({ ...cur, items: [] }));
    const reset = () => setState({ branch: null, items: [] }); // used on sign out

    return {
      branch,
      items,
      chooseBranch,
      add,
      setQuantity,
      remove,
      clear,
      reset,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
};
