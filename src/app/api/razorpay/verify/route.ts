import { revalidateTag } from "next/cache";
import { PRODUCTS_TAG } from "@/lib/commerce";
import { markSupabaseOrderPaid } from "@/lib/commerce/providers/supabase";
import { verifyRazorpaySignature } from "@/lib/razorpay";

/** Called by the browser after Razorpay Checkout reports success. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const orderId = body?.razorpay_order_id;
  const paymentId = body?.razorpay_payment_id;
  const signature = body?.razorpay_signature;
  if (![orderId, paymentId, signature].every((v) => typeof v === "string" && v)) {
    return Response.json({ error: "Missing payment details" }, { status: 400 });
  }
  if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
    return Response.json({ error: "Payment signature mismatch" }, { status: 400 });
  }
  try {
    const id = await markSupabaseOrderPaid(orderId);
    // Stock changed, so refresh the cached catalog (sold-out badges, quantities).
    if (id) revalidateTag(PRODUCTS_TAG, "max");
    return Response.json({ ok: true, orderId: id ?? orderId });
  } catch (err) {
    console.error("Failed to mark order paid", err);
    // Payment is verified; surface success and reconcile via Razorpay webhooks/dashboard.
    return Response.json({ ok: true, orderId });
  }
}
