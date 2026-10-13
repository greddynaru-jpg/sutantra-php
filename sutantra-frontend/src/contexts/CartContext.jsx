import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCart } from "../services/api";
import { useAuth } from "./AuthContext";

// Keeps the header cart count in sync with the backend. The cart page still
// fetches the full cart itself; this only tracks the total quantity.
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const cart = await getCart();
      const items = cart?.items ?? [];
      const total = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      setCount(total);
    } catch {
      // The header count is non-critical; the cart page surfaces real errors.
      setCount(0);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => ({ count, refresh }), [count, refresh]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }
  return context;
}
