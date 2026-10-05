import { createClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/order-email";

const PAYSTACK_API = "https://api.paystack.co";

type PaystackResponse<T> = { status: boolean; message: string; data: T };

type PaystackTransaction = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
};

type FinalizedOrder = {
  order_number: string;
  customer_name: string;
  email: string;
  total: number;
  items: { name: string; quantity: number; line_total: number }[];
};

type FinalizeResult = { newly_paid: boolean; order: FinalizedOrder };

function getSecretKey() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) throw new Error("Paystack is not configured.");
  return secretKey;
}

async function requestPaystack<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${PAYSTACK_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const result = (await response.json()) as PaystackResponse<T>;
  if (!response.ok || !result.status || !result.data) {
    throw new Error(result.message || "Paystack request failed.");
  }
  return result.data;
}

export async function initializePaystackTransaction({
  email,
  amountKobo,
  reference,
  orderNumber,
  callbackUrl,
}: {
  email: string;
  amountKobo: number;
  reference: string;
  orderNumber: string;
  callbackUrl: string;
}) {
  const data = await requestPaystack<{
    authorization_url: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email,
      amount: String(amountKobo),
      currency: "NGN",
      reference,
      callback_url: callbackUrl,
      metadata: { order_number: orderNumber },
    }),
  });

  const authorizationUrl = new URL(data.authorization_url);
  if (
    data.reference !== reference ||
    authorizationUrl.protocol !== "https:" ||
    authorizationUrl.hostname !== "checkout.paystack.com"
  ) {
    throw new Error("Paystack returned an unexpected checkout response.");
  }
  return authorizationUrl.toString();
}

export async function completePaystackPayment(reference: string) {
  if (!/^[A-Za-z0-9.=\-]{1,100}$/.test(reference)) {
    throw new Error("Invalid Paystack reference.");
  }

  const transaction = await requestPaystack<PaystackTransaction>(
    `/transaction/verify/${encodeURIComponent(reference)}`,
  );
  if (
    transaction.reference !== reference ||
    transaction.status !== "success" ||
    transaction.currency !== "NGN" ||
    !Number.isSafeInteger(transaction.amount) ||
    transaction.amount < 1
  ) {
    throw new Error("Paystack has not confirmed a valid payment.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Order storage is not configured.");
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("finalize_paystack_payment", {
    p_reference: reference,
    p_amount_kobo: transaction.amount,
  });
  if (error) throw error;

  const result = data as FinalizeResult | null;
  if (!result?.order?.order_number) throw new Error("The matching order could not be found.");
  const emailSent = result.newly_paid ? await sendOrderConfirmationEmail(result.order) : false;
  return { order: result.order, emailSent };
}
