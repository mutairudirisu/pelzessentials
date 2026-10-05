"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { formatNaira, useShop } from "@/app/components/shop-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const { lines, subtotal, deliveryFee, total, setQuantity, cartError } = useShop();

  useEffect(() => {
    function show() {
      setOpen(true);
    }
    function hide() {
      setOpen(false);
    }
    window.addEventListener("pelz:open-cart", show);
    window.addEventListener("pelz:close-cart", hide);
    return () => {
      window.removeEventListener("pelz:open-cart", show);
      window.removeEventListener("pelz:close-cart", hide);
    };
  }, []);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;
  function close() {
    setOpen(false);
  }

  return (
    <div className="cart-layer">
      <button className="cart-backdrop" onClick={close} aria-label="Close shopping bag" />
      <aside className="cart-panel" aria-label="Shopping bag" role="dialog" aria-modal="true">
        <div className="cart-head">
          <h2>
            Your bag <span>({lines.reduce((sum, line) => sum + line.quantity, 0)})</span>
          </h2>
          <button className="icon-button" onClick={close} aria-label="Close bag">
            <X size={18} />
          </button>
        </div>
        {cartError && (
          <p className="form-error" role="alert">
            {cartError}
          </p>
        )}
        {!signedIn && (
          <p className="cart-sync-note">
            <Link href="/auth/sign-in" onClick={close}>
              Sign in with Google
            </Link>{" "}
            to sync your bag with the Pelz mobile app.
          </p>
        )}
        {lines.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBag size={27} strokeWidth={1.3} />
            <h3>Your bag is waiting.</h3>
            <p>Find a little something for your everyday.</p>
            <button className="button" onClick={close}>
              Keep exploring
            </button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {lines.map(({ product, quantity }) => (
                <article className="cart-line" key={product.id}>
                  <div className="cart-line-image">
                    <Image src={product.image_url} alt={product.name} fill sizes="78px" />
                  </div>
                  <div className="cart-line-details">
                    <h3>{product.name}</h3>
                    <p>{formatNaira(product.price)}</p>
                    <div className="quantity-control">
                      <button
                        aria-label={`Remove one ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity - 1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span>{quantity}</span>
                      <button
                        aria-label={`Add one ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="cart-line-price">{formatNaira(product.price * quantity)}</div>
                </article>
              ))}
            </div>
            <div className="cart-summary">
              <p className="summary-row">
                <span>Subtotal</span>
                <span>{formatNaira(subtotal)}</span>
              </p>
              <p className="summary-row">
                <span>Delivery</span>
                <span>{deliveryFee ? formatNaira(deliveryFee) : "Complimentary"}</span>
              </p>
              <p className="summary-row summary-total">
                <strong>Total</strong>
                <strong>{formatNaira(total)}</strong>
              </p>
              <Link className="button" href="/checkout" onClick={close}>
                Continue to checkout
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
