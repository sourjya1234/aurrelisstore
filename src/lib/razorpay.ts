import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { requireEnv } from "./commerce/env";

type RazorpayOrder = { id: string; amount: number; currency: string; status: string };

/** Creates a Razorpay order. `amount` is in minor units (paise). */
export async function createRazorpayOrder(
  amount: number,
  currency: string,
  receipt: string,
): Promise<RazorpayOrder> {
  const keyId = requireEnv("RAZORPAY_KEY_ID");
  const keySecret = requireEnv("RAZORPAY_KEY_SECRET");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
    },
    body: JSON.stringify({ amount, currency, receipt: receipt.slice(0, 40) }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Razorpay order creation failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** Verifies the signature Razorpay Checkout returns after a successful payment. */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  const expected = createHmac("sha256", requireEnv("RAZORPAY_KEY_SECRET"))
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
