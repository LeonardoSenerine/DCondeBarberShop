import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type CartState = Record<string, number>;

interface CartContextValue {
  cart: CartState;
  add: (productId: string) => void;
  decrement: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
  isEmpty: boolean;
}

const STORAGE_KEY = "dconde:cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as CartState) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage unavailable — ignore */
    }
  }, [cart]);

  const add = useCallback((productId: string) => {
    setCart((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + 1 }));
  }, []);

  const decrement = useCallback((productId: string) => {
    setCart((prev) => {
      const current = prev[productId] ?? 0;
      if (current <= 1) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: current - 1 };
    });
  }, []);

  const remove = useCallback((productId: string) => {
    setCart((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  }, []);

  const clear = useCallback(() => setCart({}), []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, add, decrement, remove, clear, isEmpty: Object.keys(cart).length === 0 }),
    [cart, add, decrement, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa ser usado dentro de <CartProvider>");
  return ctx;
}
