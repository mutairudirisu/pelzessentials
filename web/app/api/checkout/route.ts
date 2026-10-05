import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { initializePaystackTransaction } from "@/lib/paystack";
import { sendOrderConfirmationEmail } from "@/lib/order-email";

type SavedOrder = {
  order_number: string;
  total: number;
  items: { name: string; quantity: number; line_total: number }[];
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return jsonError("Invalid order details.", 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Invalid order details.", 400);
  }

  const customer =
    body.customer && typeof body.customer === "object" && !Array.isArray(body.customer)
      ? (body.customer as Record<string, unknown>)
      : null;
  if (!customer) return jsonError("Please provide your contact and delivery details.", 400);
  const name = typeof customer.name === "string" ? customer.name.trim() : "";
  const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const address = typeof customer.address === "string" ? customer.address.trim() : "";
  const city = typeof customer.city === "string" ? customer.city.trim() : "";
  const notes = typeof customer.notes === "string" ? customer.notes.trim() : "";
  if (
    !name ||
    name.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    phone.length < 7 ||
    phone.length > 30 ||
    !address ||
    address.length > 250 ||
    !city ||
    city.length > 100 ||
    notes.length > 500
  ) {
    return jsonError("Please check your name, email, phone number, and delivery address.", 400);
  }

  const paymentMethod = body.paymentMethod;
  if (
    paymentMethod !== "bank_transfer" &&
    paymentMethod !== "pay_on_delivery" &&
    paymentMethod !== "paystack"
  ) {
    return jsonError("Choose a valid payment preference.", 400);
  }
  if (paymentMethod === "paystack" && !process.env.PAYSTACK_SECRET_KEY) {
    return jsonError(
      "Online payment is not configured yet. Please choose another payment method.",
      503,
    );
  }

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 20)
    return jsonError("Your bag is empty or contains too many items.", 400);
  const items = body.items.map((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    if (
      typeof item.id !== "string" ||
      item.id.length > 100 ||
      !Number.isInteger(item.quantity) ||
      Number(item.quantity) < 1 ||
      Number(item.quantity) > 20
    )
      return null;
    return { id: item.id, quantity: Number(item.quantity) };
  });
  if (items.some((item) => item === null))
    return jsonError("One or more items in your bag are invalid.", 400);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey)
    return jsonError("Checkout is not connected yet. Please contact us to place your order.", 503);
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("create_store_order", {
    p_customer_name: name,
    p_email: email,
    p_phone: phone,
    p_address: address,
    p_city: city,
    p_notes: notes || null,
    p_payment_method: paymentMethod,
    p_items: items,
  });
  if (error || !data) {
    console.error("Order creation failed", error?.message);
    return jsonError("We couldn't verify your bag. Please refresh and try again.", 400);
  }

  const order = data as SavedOrder;
  if (paymentMethod === "paystack") {
    if (!Number.isSafeInteger(order.total) || order.total < 1) {
      return jsonError(
        "This order cannot be paid online. Please choose another payment method.",
        400,
      );
    }

    const reference = `PELZ-${order.order_number}-${randomUUID()}`;
    const { error: referenceError } = await supabase
      .from("orders")
      .update({ payment_reference: reference, payment_status: "pending" })
      .eq("order_number", order.order_number)
      .eq("payment_method", "paystack")
      .select("id")
      .single();
    if (referenceError) {
      console.error("Paystack order reference could not be saved", referenceError.message);
      return jsonError("We couldn't start online payment. Please try again.", 500);
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    try {
      const authorizationUrl = await initializePaystackTransaction({
        email,
        amountKobo: order.total * 100,
        reference,
        orderNumber: order.order_number,
        callbackUrl: new URL("/api/checkout/paystack/callback", siteUrl).toString(),
      });
      return Response.json({ authorizationUrl }, { status: 200 });
    } catch (paymentError) {
      console.error(
        "Paystack transaction initialization failed",
        paymentError instanceof Error ? paymentError.message : "Unknown Paystack error",
      );
      await supabase
        .from("orders")
        .update({ payment_status: "failed" })
        .eq("payment_reference", reference);
      return jsonError("We couldn't start online payment. Please try again.", 502);
    }
  }

  const emailSent = await sendOrderConfirmationEmail({
    order_number: order.order_number,
    customer_name: name,
    email,
    total: order.total,
    items: order.items ?? [],
  });
  return Response.json(
    { orderNumber: order.order_number, total: order.total, emailSent },
    { status: 201 },
  );
}
