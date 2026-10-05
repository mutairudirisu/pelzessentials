"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Product } from "@/lib/catalog";
import { createBrowserSupabase } from "@/lib/supabase/client";

type CartEntry = { id: string; quantity: number };
type CartLine = { product: Product; quantity: number };
type ShopContextValue = {
  products: Product[];
  lines: CartLine[];
  itemCount: number;
  subtotal: number;
  deliveryFee: number;
  total: number;
  cartError: string;
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
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountCartId, setAccountCartId] = useState<string | null>(null);
  const [accountEntries, setAccountEntries] = useState<CartEntry[] | null>(null);
  const [cartError, setCartError] = useState("");
  const cartSnapshot = useSyncExternalStore(
    subscribeToCart,
    getCartSnapshot,
    getServerCartSnapshot,
  );
  const entries = accountId && accountEntries !== null ? accountEntries : parseCart(cartSnapshot);

  useEffect(() => {
    let active = true;
    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccountId(session?.user.id ?? null);
      setAccountCartId(null);
      setAccountEntries(null);
      setCartError("");
    });

    void supabase.auth.getSession().then(({ data, error }) => {
      if (error) {
        setCartError("Your account could not be checked. Please refresh the page.");
        return;
      }
      if (active) setAccountId(data.session?.user.id ?? null);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    const supabase = createBrowserSupabase();

    async function loadAccountCart() {
      const { data, error } = await supabase
        .from("carts")
        .upsert({ user_id: accountId }, { onConflict: "user_id" })
        .select("id")
        .single();
      if (error) throw error;
      if (active) setAccountCartId(data.id);
    }

    void loadAccountCart().catch(() => {
      if (active) setCartError("Your account cart could not be initialized. Please try again.");
    });
    return () => {
      active = false;
    };
  }, [accountId]);

  useEffect(() => {
    if (!accountId || !accountCartId) return;
    let active = true;
    const supabase = createBrowserSupabase();

    async function refreshCart() {
      const { data, error } = await supabase
        .from("cart_items")
        .select("product_id,quantity")
        .eq("cart_id", accountCartId)
        .gt("quantity", 0);
      if (error) throw error;
      return (data ?? []).map((entry) => ({
        id: entry.product_id,
        quantity: entry.quantity,
      }));
    }

    async function loadCart() {
      try {
        const remoteEntries = await refreshCart();
        if (!active) return;

        const guestEntries = parseCart(getCartSnapshot());
        const mergedEntries = [...remoteEntries];
        for (const guestEntry of guestEntries) {
          const existing = mergedEntries.find((entry) => entry.id === guestEntry.id);
          if (existing) {
            existing.quantity = Math.min(20, existing.quantity + guestEntry.quantity);
          } else {
            mergedEntries.push(guestEntry);
          }
        }

        if (guestEntries.length > 0) {
          const { error } = await supabase.from("cart_items").upsert(
            mergedEntries.map((entry) => ({
              cart_id: accountCartId,
              product_id: entry.id,
              quantity: entry.quantity,
            })),
            { onConflict: "cart_id,product_id" },
          );
          if (error) throw error;
          window.localStorage.removeItem(CART_KEY);
          window.dispatchEvent(new Event(CART_CHANGE_EVENT));
        }
        if (active) setAccountEntries(mergedEntries);
      } catch {
        if (active) setCartError("Your account cart could not be loaded. Please try again.");
      }
    }

    const channel = supabase
      .channel(`cart-${accountId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart_items",
          filter: `cart_id=eq.${accountCartId}`,
        },
        () => {
          void refreshCart()
            .then((remoteEntries) => {
              if (active) setAccountEntries(remoteEntries);
            })
            .catch(() => {
              if (active) setCartError("Your synced cart could not be refreshed.");
            });
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "carts", filter: `user_id=eq.${accountId}` },
        () => {
          void refreshCart()
            .then((remoteEntries) => {
              if (active) setAccountEntries(remoteEntries);
            })
            .catch(() => {
              if (active) setCartError("Your synced cart could not be refreshed.");
            });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void loadCart();
        } else if (active && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
          setCartError("Live cart sync disconnected. Please check your connection.");
        }
      });

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [accountCartId, accountId]);

  const lines = entries.flatMap((entry) => {
    const product = products.find((item) => item.id === entry.id);
    return product ? [{ product, quantity: entry.quantity }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  const deliveryFee = subtotal === 0 || subtotal >= 100000 ? 0 : 3500;
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  async function saveAccountCart(nextEntries: CartEntry[]) {
    if (!accountId || !accountCartId) return;
    setAccountEntries(nextEntries);
    setCartError("");
    if (nextEntries.length === 0) return;
    const supabase = createBrowserSupabase();
    const { error } = await supabase.from("cart_items").upsert(
      nextEntries.map((entry) => ({
        cart_id: accountCartId,
        product_id: entry.id,
        quantity: entry.quantity,
      })),
      { onConflict: "cart_id,product_id" },
    );
    if (error) {
      setCartError("Your cart change could not be saved. Please try again.");
      const { data } = await supabase
        .from("cart_items")
        .select("product_id,quantity")
        .eq("cart_id", accountCartId)
        .gt("quantity", 0);
      if (data) {
        setAccountEntries(
          data.map((entry) => ({ id: entry.product_id, quantity: entry.quantity })),
        );
      }
    }
  }

  function changeCart(update: (current: CartEntry[]) => CartEntry[]) {
    if (!accountId) {
      updateCart(update);
      return;
    }
    if (!accountCartId) {
      setCartError("Your account cart is still loading. Please try again.");
      return;
    }
    const nextEntries = update(entries);
    const currentIds = new Set(nextEntries.map((entry) => entry.id));
    const removedIds = entries
      .filter((entry) => !currentIds.has(entry.id))
      .map((entry) => entry.id);
    if (removedIds.length > 0) {
      const supabase = createBrowserSupabase();
      void supabase
        .from("cart_items")
        .update({ quantity: 0 })
        .eq("cart_id", accountCartId)
        .in("product_id", removedIds)
        .then(({ error }) => {
          if (error) setCartError("Your cart change could not be saved. Please try again.");
        });
    }
    void saveAccountCart(nextEntries);
  }

  function addItem(id: string) {
    changeCart((current) => {
      const existing = current.find((entry) => entry.id === id);
      return existing
        ? current.map((entry) =>
            entry.id === id ? { ...entry, quantity: Math.min(20, entry.quantity + 1) } : entry,
          )
        : [...current, { id, quantity: 1 }];
    });
  }

  function setQuantity(id: string, quantity: number) {
    changeCart((current) =>
      quantity < 1
        ? current.filter((entry) => entry.id !== id)
        : current.map((entry) =>
            entry.id === id ? { ...entry, quantity: Math.min(20, quantity) } : entry,
          ),
    );
  }

  function clearCart() {
    if (!accountId) {
      updateCart(() => []);
      return;
    }
    if (!accountCartId) {
      setCartError("Your account cart is still loading. Please try again.");
      return;
    }
    setAccountEntries([]);
    setCartError("");
    void createBrowserSupabase()
      .from("cart_items")
      .update({ quantity: 0 })
      .eq("cart_id", accountCartId)
      .gt("quantity", 0)
      .then(({ error }) => {
        if (error) setCartError("Your cart could not be cleared. Please try again.");
      });
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
        cartError,
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
