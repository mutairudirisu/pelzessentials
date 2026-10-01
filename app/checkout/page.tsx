"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { formatNaira, useShop } from "@/app/components/shop-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";

type OrderResult = { orderNumber: string; emailSent: boolean };

export default function CheckoutPage() {
  const { lines, subtotal, deliveryFee, total, clearCart } = useShop();
  const nameField = useRef<HTMLInputElement>(null);
  const emailField = useRef<HTMLInputElement>(null);
  const phoneField = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<OrderResult | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) return;

      const metadata = user.user_metadata ?? {};
      const fullName = [metadata.given_name, metadata.family_name]
        .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
        .join(" ");
      const name =
        (typeof metadata.full_name === "string" && metadata.full_name) ||
        (typeof metadata.name === "string" && metadata.name) ||
        fullName;

      if (nameField.current && !nameField.current.value && name) {
        nameField.current.value = name;
      }
      if (emailField.current && !emailField.current.value && user.email) {
        emailField.current.value = user.email;
      }
      if (phoneField.current && !phoneField.current.value && user.phone) {
        phoneField.current.value = user.phone;
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const payload = {
      customer: {
        name: String(formData.get("name") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? ""),
        city: String(formData.get("city") ?? ""),
        notes: String(formData.get("notes") ?? ""),
      },
      paymentMethod: String(formData.get("paymentMethod") ?? "bank_transfer"),
      items: lines.map(({ product, quantity }) => ({ id: product.id, quantity })),
    };

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "We couldn't place your order. Please try again.");
      if (payload.paymentMethod === "paystack") {
        if (typeof result.authorizationUrl !== "string") {
          throw new Error("We couldn't open Paystack checkout. Please try again.");
        }
        window.location.assign(result.authorizationUrl);
        return;
      }
      setOrder({ orderNumber: result.orderNumber, emailSent: result.emailSent });
      clearCart();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "We couldn't place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (order)
    return (
      <section className="confirmation">
        <div className="confirmation-icon">
          <Check size={24} />
        </div>
        <p className="eyebrow">Order received</p>
        <h1>Thank you for choosing Pelz.</h1>
        <p>
          Your order <strong>{order.orderNumber}</strong> is in.{" "}
          {order.emailSent
            ? "A confirmation has been sent to your inbox."
            : "We’ll be in touch shortly with your order details."}
        </p>
        <p>
          For bank transfer orders, we’ll share payment details with you directly. For delivery
          questions, message us on WhatsApp.
        </p>
        <a className="button" href="https://wa.me/2349044489844">
          Chat with Pelz
        </a>
      </section>
    );

  if (lines.length === 0)
    return (
      <section className="confirmation">
        <div className="confirmation-icon">
          <ShieldCheck size={24} />
        </div>
        <h1>Your bag is empty.</h1>
        <p>Take a look around and find something lovely for your everyday.</p>
        <Link className="button" href="/#shop">
          Explore the collection
        </Link>
      </section>
    );

  return (
    <div className="checkout-page">
      <div className="checkout-title">
        <p className="eyebrow">Almost yours</p>
        <h1>Let’s make it yours.</h1>
        <p>Enter your delivery details and we’ll take care of the rest.</p>
      </div>
      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={submitOrder}>
          <section className="form-section">
            <h2>Contact &amp; delivery</h2>
            <div className="form-grid">
              <div className="field field-full">
                <label htmlFor="name">Full name</label>
                <input
                  id="name"
                  name="name"
                  ref={nameField}
                  autoComplete="name"
                  required
                  maxLength={100}
                />
              </div>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input
                  id="email"
                  name="email"
                  ref={emailField}
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone number</label>
                <input
                  id="phone"
                  name="phone"
                  ref={phoneField}
                  type="tel"
                  autoComplete="tel"
                  required
                  maxLength={30}
                  placeholder="+234 ..."
                />
              </div>
              <div className="field field-full">
                <label htmlFor="address">Street address</label>
                <input
                  id="address"
                  name="address"
                  autoComplete="street-address"
                  required
                  maxLength={250}
                />
              </div>
              <div className="field">
                <label htmlFor="city">City / area</label>
                <input
                  id="city"
                  name="city"
                  autoComplete="address-level2"
                  required
                  maxLength={100}
                />
              </div>
              <div className="field field-full">
                <label htmlFor="notes">
                  Delivery notes <span>(optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  maxLength={500}
                  placeholder="Anything we should know about your delivery?"
                />
              </div>
            </div>
            <p className="checkout-note" style={{ textAlign: "left" }}>
              Already have an account?{" "}
              <Link className="checkout-signin" href="/auth/sign-in">
                Continue with Google
              </Link>
            </p>
          </section>
          <section className="form-section">
            <h2>Payment preference</h2>
            <div className="payment-options">
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="bank_transfer" defaultChecked />
                <span>
                  <strong>Bank transfer</strong>
                  <small>
                    We’ll contact you with transfer details after your order is confirmed.
                  </small>
                </span>
              </label>
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="pay_on_delivery" />
                <span>
                  <strong>Pay on delivery</strong>
                  <small>Pay when your order arrives. Availability depends on your area.</small>
                </span>
              </label>
              <label className="payment-option">
                <input type="radio" name="paymentMethod" value="paystack" />
                <span>
                  <strong>Pay securely with Paystack</strong>
                  <small>Pay online by card, bank transfer, or another available method.</small>
                </span>
              </label>
            </div>
          </section>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="checkout-security">
            <LockKeyhole size={14} /> Your details are used only to fulfil this order.
          </div>
          <button className="button checkout-submit" type="submit" disabled={submitting}>
            {submitting ? "Placing your order…" : `Place order · ${formatNaira(total)}`}
          </button>
        </form>
        <aside className="order-summary">
          <h2>Your order</h2>
          <div>
            {lines.map(({ product, quantity }) => (
              <div className="summary-product" key={product.id}>
                <div className="summary-product-image">
                  <Image src={product.image_url} alt={product.name} fill sizes="57px" />
                </div>
                <div className="summary-product-copy">
                  <strong>{product.name}</strong>
                  <small>
                    Qty {quantity} · {formatNaira(product.price)} each
                  </small>
                </div>
                <span className="summary-product-price">
                  {formatNaira(product.price * quantity)}
                </span>
              </div>
            ))}
          </div>
          <div className="order-summary-totals">
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
          </div>
          <p className="checkout-note">Orders over ₦100,000 ship free. Delivery fee is ₦3,500.</p>
        </aside>
      </div>
    </div>
  );
}
