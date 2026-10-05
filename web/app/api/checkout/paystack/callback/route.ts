import { NextResponse } from "next/server";
import { completePaystackPayment } from "@/lib/paystack";

function paymentResultUrl(request: Request, status: "success" | "failed") {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  const resultUrl = new URL("/checkout/payment-result", siteUrl);
  resultUrl.searchParams.set("status", status);
  return resultUrl;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const reference = requestUrl.searchParams.get("reference");
  if (!reference) return NextResponse.redirect(paymentResultUrl(request, "failed"));

  try {
    const { order, emailSent } = await completePaystackPayment(reference);
    const resultUrl = paymentResultUrl(request, "success");
    resultUrl.searchParams.set("orderNumber", order.order_number);
    resultUrl.searchParams.set("emailSent", String(emailSent));
    return NextResponse.redirect(resultUrl);
  } catch (error) {
    console.error(
      "Paystack callback verification failed",
      error instanceof Error ? error.message : "Unknown payment verification error",
    );
    return NextResponse.redirect(paymentResultUrl(request, "failed"));
  }
}
