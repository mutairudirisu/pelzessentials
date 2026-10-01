import { createHmac, timingSafeEqual } from "node:crypto";
import { completePaystackPayment } from "@/lib/paystack";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  if (!secretKey || !signature || !/^[a-f0-9]{128}$/i.test(signature)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  const rawBody = await request.text();
  const expected = createHmac("sha512", secretKey).update(rawBody).digest();
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Invalid webhook signature." }, { status: 401 });
  }

  let event: { event?: unknown; data?: { reference?: unknown } };
  try {
    event = JSON.parse(rawBody) as { event?: unknown; data?: { reference?: unknown } };
  } catch {
    return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (event.event !== "charge.success") return Response.json({ received: true });
  const reference = event.data?.reference;
  if (typeof reference !== "string") {
    return Response.json({ error: "Missing transaction reference." }, { status: 400 });
  }

  try {
    await completePaystackPayment(reference);
    return Response.json({ received: true });
  } catch (error) {
    console.error(
      "Paystack webhook verification failed",
      error instanceof Error ? error.message : "Unknown webhook verification error",
    );
    return Response.json({ error: "Payment verification failed." }, { status: 500 });
  }
}
