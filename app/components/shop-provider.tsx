"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import type { Product } from "@/lib/catalog";

type CartEntry = { id: string; quantity: number };
type CartLine = { product: Product; quantity: number };
type ShopContextValue = {
  products: Product[];
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  addItem: (id: string) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
};

const ShopContext = createContext<ShopContextValue | null>(null);
const CART_KEY = "pelz-cart";
const CART_CHANGE_EVENT = "pelz:cart-change";
const EMPTY_CART = "[]";

function parseCart(snapshot: string): CartEntry[] {
  try {
    const value: unknown = JSON.parse(snapshot);
    if (!Array.isArray(value)) return [];
    return value.filter(
      (entry): entry is CartEntry =>
        entry &&
        typeof entry.id === "string" &&
        Number.isInteger(entry.quantity) &&
        entry.quantity >= 1 &&
        entry.quantity <= 20,
    );
  } catch {
    return [];
  }
}

function getCartSnapshot() {
  return window.localStorage.getItem(CART_KEY) ?? EMPTY_CART;
}

function getServerCartSnapshot() {
  return EMPTY_CART;
}

function subscribeToCart(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CART_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CART_CHANGE_EVENT, onChange);
  };
}

function updateCart(update: (current: CartEntry[]) => CartEntry[]) {
  const next = update(parseCart(getCartSnapshot()));
  window.localStorage.setItem(CART_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CART_CHANGE_EVENT));
}

export function ShopProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const entries = parseCart(cartSnapshot);

  const lines = entries.flatMap((entry) => {
    const product = products.find((item) => item.id === entry.id);
    return product ? [{ product, quantity: entry.quantity }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const deliveryFee = subtotal === 0 || subtotal >= 100000 ? 0 : 3500;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  function addItem(id: string) {
    updateCart((current) => {
      const existing = current.find((entry) => entry.id === id);
      return existing
        ? current.map((entry) =>
            entry.id === id ? { ...entry, quantity: Math.min(20, entry.quantity + 1) } : entry,
          )
        : [...current, { id, quantity: 1 }];
    });
  }

  function setQuantity(id: string, quantity: number) {
    updateCart((current) =>
      quantity < 1
        ? current.filter((entry) => entry.id !== id)
        : current.map((entry) =>
            entry.id === id ? { ...entry, quantity: Math.min(20, quantity) } : entry,
          ),
    );
  }

  function clearCart() {
    updateCart(() => []);
  }

  return (
    <ShopContext.Provider
      value={{
        products,
        lines,
        itemCount,
        subtotal,
        deliveryFee,
        total: subtotal + deliveryFee,
        addItem,
        setQuantity,
        clearCart,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
}

export function formatNaira(amount: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);
}
