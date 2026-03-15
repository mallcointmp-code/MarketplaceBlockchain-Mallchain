import React, { createContext, useContext, useEffect, useState } from 'react';
import { syncCart } from '../api/order.api';

export const CartContext = createContext<any>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('cart', JSON.stringify(cart)); }, [cart]);

  // Sync to server when user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    let mounted = true;
    async function sync() {
      try {
        await syncCart(cart);
      } catch (e: any) { if (mounted) console.warn('cart sync failed', e); }
    }
    // debounce small delay
    const t = setTimeout(sync, 500);
    return () => { mounted = false; clearTimeout(t); };
  }, [cart]);

  function addItem(item: any) {
    setCart((prev: any[]) => {
      const found = prev.find((p: any) => p.id === item.id);
      if (found) return prev.map((p: any) => p.id === item.id ? { ...p, qty: p.qty + (item.qty || 1) } : p);
      return [...prev, { ...item, qty: item.qty || 1 }];
    });
  }

  function removeItem(id: any) {
    setCart((prev: any[]) => prev.filter((p: any) => p.id !== id));
  }

  function updateQty(id: any, qty: any) {
    setCart((prev: any[]) => prev.map((p: any) => p.id === id ? { ...p, qty: Number(qty) } : p));
  }

  function clear() { setCart([]); }

  const value = { cart, addItem, removeItem, updateQty, clear };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() { return useContext(CartContext); }

export default CartContext;
