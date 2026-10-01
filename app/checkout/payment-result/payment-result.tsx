"use client";

import Link from "next/link";
import { Check, CircleAlert, ShieldCheck } from "lucide-react";
import { useEffect, useRef } from "react";
import { useShop } from "@/app/components/shop-provider";

export function PaymentResult({
  status,
  orderNumber,
  emailSent,
}: {
  status: "success" | "failed";
  orderNumber: string;
  emailSent: boolean;
}) {
  const { clearCart } = useShop();
  const cleared = useRef(false);

  useEffect(() => {
    if (status !== "success" || cleared.current) return;
    cleared.current = true;
    clearCart();
  }, [clearCart, status]);

  if (status === "success") {
    return (
      <section className="confirmation" aria-live="polite">
        <div className="confirmation-icon">
          <Check size={24} />
        </div>
        <p className="eyebrow">Payment confirmed</p>
        <h1>Thank you for choosing Pelz.</h1>
        <p>
          Your payment was verified and order <strong>{orderNumber}</strong> is confirmed.
        </p>
        <p>
          {emailSent
            ? "A confirmation has been sent to your inbox."
            : "Your payment is confirmed. We’ll be in touch with your order details."}
        </p>
        <Link className="button" href="/#shop">
          Continue shopping
        </Link>
      </section>
    );
  }

  return (
    <section className="confirmation" aria-live="polite">
      <div className="confirmation-icon">
        <CircleAlert size={24} />
      </div>
      <p className="eyebrow">Payment not confirmed</p>
      <h1>Your order is not confirmed yet.</h1>
      <p>
        We couldn’t verify a successful payment. Your bag is still saved; you can return to checkout
        and try again, or contact us if you were charged.
      </p>
      <Link className="button" href="/checkout">
        Return to checkout
      </Link>
      <p className="checkout-security">
        <ShieldCheck size={14} /> We only confirm orders after Paystack verifies payment.
      </p>
    </section>
  );
}
