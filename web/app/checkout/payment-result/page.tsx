import { createClient } from "@supabase/supabase-js";
import { PaymentResult } from "@/app/checkout/payment-result/payment-result";

type PaymentSearchParams = {
  status?: string | string[];
  orderNumber?: string | string[];
  emailSent?: string | string[];
};

export default async function PaymentResultPage({
  searchParams,
}: {
  searchParams: Promise<PaymentSearchParams>;
}) {
  const params = await searchParams;
  const orderNumber = typeof params.orderNumber === "string" ? params.orderNumber : "";
  const emailSent = params.emailSent === "true";
  let paymentVerified = false;

  if (params.status === "success" && orderNumber) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && serviceKey) {
      const supabase = createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data } = await supabase
        .from("orders")
        .select("payment_status")
        .eq("order_number", orderNumber)
        .eq("payment_method", "paystack")
        .maybeSingle();
      paymentVerified = data?.payment_status === "paid";
    }
  }

  return (
    <PaymentResult
      status={paymentVerified ? "success" : "failed"}
      orderNumber={paymentVerified ? orderNumber : ""}
      emailSent={paymentVerified && emailSent}
    />
  );
}
