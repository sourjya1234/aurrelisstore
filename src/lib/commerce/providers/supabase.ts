import "server-only";
import { createRazorpayOrder } from "@/lib/razorpay";
import { requireEnv } from "../env";
import type { CommerceProvider, Product } from "../types";

/**
 * Catalog stored in Supabase (see supabase/migrations), payments via Razorpay.
 * Talks to Supabase's PostgREST API directly so no SDK is needed.
 */

type ProductRow = {
  id: string;
  handle: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  featured: boolean;
  images: { url: string; alt?: string }[] | null;
  price: number;
  compare_at_price: number | null;
  currency: string;
  product_variants: { id: string; title: string; price: number | null; available: boolean; position: number }[];
};

const SELECT = "*,product_variants(*)";

function restUrl(path: string) {
  return `${requireEnv("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`;
}

async function rest<T>(path: string, init: RequestInit & { serviceRole?: boolean } = {}): Promise<T> {
  const key = init.serviceRole
    ? requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    : requireEnv("SUPABASE_ANON_KEY");
  const res = await fetch(restUrl(path), {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase request failed (${res.status}): ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

function toProduct(row: ProductRow): Product {
  const currencyCode = row.currency ?? "INR";
  const variantRows = [...(row.product_variants ?? [])].sort((a, b) => a.position - b.position);
  const variants = variantRows.length
    ? variantRows.map((v) => ({
        id: v.id,
        title: v.title,
        price: { amount: Number(v.price ?? row.price), currencyCode },
        available: v.available,
      }))
    : [{ id: row.id, title: "Default", price: { amount: Number(row.price), currencyCode }, available: true }];
  return {
    id: row.id,
    handle: row.handle,
    title: row.title,
    description: row.description ?? "",
    category: row.category ?? "Other",
    tags: row.tags ?? [],
    featured: row.featured,
    images: (row.images ?? []).map((img) => ({ url: img.url, alt: img.alt ?? row.title })),
    price: { amount: Math.min(...variants.map((v) => v.price.amount)), currencyCode },
    compareAtPrice: row.compare_at_price
      ? { amount: Number(row.compare_at_price), currencyCode }
      : undefined,
    variants,
  };
}

export const supabaseProvider: CommerceProvider = {
  name: "supabase",
  async getProducts() {
    const rows = await rest<ProductRow[]>(
      `products?select=${SELECT}&published=eq.true&order=created_at.desc`,
    );
    return rows.map(toProduct);
  },
  async getProduct(handle) {
    const rows = await rest<ProductRow[]>(
      `products?select=${SELECT}&published=eq.true&handle=eq.${encodeURIComponent(handle)}&limit=1`,
    );
    return rows[0] ? toProduct(rows[0]) : undefined;
  },
  async createCheckout(lines, customer) {
    const currency = lines[0]?.variant.price.currencyCode ?? "INR";
    const total = lines.reduce((sum, l) => sum + l.variant.price.amount * l.quantity, 0);
    const amountMinor = Math.round(total * 100);

    // 1. Record a pending order (service role bypasses RLS; never expose this key to the browser).
    const [order] = await rest<{ id: string }[]>("orders", {
      method: "POST",
      serviceRole: true,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        status: "pending",
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: customer.address,
        line_items: lines.map((l) => ({
          product_id: l.product.id,
          variant_id: l.variant.id,
          title: l.product.title,
          variant_title: l.variant.title,
          unit_price: l.variant.price.amount,
          quantity: l.quantity,
        })),
        amount: total,
        currency,
      }),
    });

    // 2. Create the matching Razorpay order and link it.
    const rzp = await createRazorpayOrder(amountMinor, currency, order.id);
    await rest(`orders?id=eq.${order.id}`, {
      method: "PATCH",
      serviceRole: true,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ razorpay_order_id: rzp.id }),
    });

    return {
      type: "razorpay",
      keyId: requireEnv("RAZORPAY_KEY_ID"),
      razorpayOrderId: rzp.id,
      orderId: order.id,
      amount: amountMinor,
      currency,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
    };
  },
};

/** Marks a Supabase order paid once Razorpay's signature has been verified. */
export async function markSupabaseOrderPaid(razorpayOrderId: string, razorpayPaymentId: string) {
  const rows = await rest<{ id: string }[]>(
    `orders?razorpay_order_id=eq.${encodeURIComponent(razorpayOrderId)}`,
    {
      method: "PATCH",
      serviceRole: true,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ status: "paid", razorpay_payment_id: razorpayPaymentId }),
    },
  );
  return rows[0]?.id;
}
