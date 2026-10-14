import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';

const STORAGE_KEY = 'mbrems_cart';

const CartContext = createContext(null);

const emptyState = () => ({
  branchId: null,
  items: [], // { menuItemId, name, price, quantity }
});

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.items)) return emptyState();
    return {
      branchId: parsed.branchId || null,
      items: parsed.items,
    };
  } catch {
    return emptyState();
  }
}

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const { branchId, item } = action.payload;
      // Switching branch clears the cart
      let items = state.branchId && state.branchId !== branchId ? [] : [...state.items];
      const idx = items.findIndex((i) => i.menuItemId === item._id);
      if (idx >= 0) {
        items[idx] = { ...items[idx], quantity: items[idx].quantity + 1 };
      } else {
        items.push({
          menuItemId: item._id,
          name: item.name,
          price: item.price,
          quantity: 1,
        });
      }
      return { branchId, items };
    }
    case 'REMOVE':
      return {
        ...state,
        items: state.items.filter((i) => i.menuItemId !== action.payload),
      };
    case 'SET_QTY': {
      const { menuItemId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((i) => i.menuItemId !== menuItemId),
        };
      }
      return {
        ...state,
        items: state.items.map((i) =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i
        ),
      };
    }
    case 'CLEAR':
      return emptyState();
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo(() => {
    const itemCount = state.items.reduce((n, i) => n + i.quantity, 0);
    const subtotal = state.items.reduce((n, i) => n + i.price * i.quantity, 0);

    return {
      branchId: state.branchId,
      items: state.items,
      itemCount,
      subtotal,
      addItem: (branchId, item) => dispatch({ type: 'ADD', payload: { branchId, item } }),
      removeItem: (menuItemId) => dispatch({ type: 'REMOVE', payload: menuItemId }),
      setQuantity: (menuItemId, quantity) =>
        dispatch({ type: 'SET_QTY', payload: { menuItemId, quantity } }),
      clearCart: () => dispatch({ type: 'CLEAR' }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
