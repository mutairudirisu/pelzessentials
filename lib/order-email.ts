import { Resend } from "resend";

export type OrderEmail = {
  order_number: string;
  customer_name: string;
  email: string;
  total: number;
  items: { name: string; quantity: number; line_total: number }[];
};

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}

export async function sendOrderConfirmationEmail(order: OrderEmail) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return false;

  const resend = new Resend(process.env.RESEND_API_KEY);
  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      maximumFractionDigits: 0,
    }).format(amount);
  const orderItems = order.items
    .map(
      (item) =>
        `<li>${escapeHtml(item.name)} × ${item.quantity} — ${formatPrice(item.line_total)}</li>`,
    )
    .join("");

  try {
    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: order.email,
      subject: `Your Pelz Essentials order ${order.order_number}`,
      text: `Hi ${order.customer_name}, we received your order ${order.order_number}. Your total is ${formatPrice(order.total)}. We'll be in touch with the next steps.`,
      html: `<div style="font-family:Arial,sans-serif;color:#20231f;line-height:1.7;max-width:560px;margin:auto"><p style="color:#c9a64d;letter-spacing:3px">PELZ ESSENTIALS</p><h1 style="font-family:Georgia,serif;font-weight:400">Thank you, ${escapeHtml(order.customer_name)}.</h1><p>We’ve received your order <strong>${order.order_number}</strong>.</p><ul>${orderItems}</ul><p><strong>Total: ${formatPrice(order.total)}</strong></p><p>We’ll be in touch shortly with the next steps.</p></div>`,
    });
    if (error) {
      console.error("Order confirmation email failed", error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "Order confirmation email failed",
      error instanceof Error ? error.message : "Unknown Resend error",
    );
    return false;
  }
}
