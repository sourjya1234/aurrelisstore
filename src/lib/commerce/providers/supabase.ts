import "server-only";
import { randomBytes } from "node:crypto";
import { createRazorpayOrder } from "@/lib/razorpay";
import { rest } from "@/lib/supabase-rest";
import { requireEnv } from "../env";
import type { CommerceProvider, Product } from "../types";

/**
 * Catalog and orders stored in the Aurrelis Ops Supabase project (`io_*` tables),
 * payments via Razorpay.
 *
 * Tables used:
 * - io_moods            (id, label, sort_order)                    -> category
 * - io_products         (slug, name, mood_id, notes, accent_color)  -> product
 * - io_product_variants (sku, size_ml, price_inr, stock, is_active) -> variants
 * - io_orders / io_order_items                                      -> checkout
 *
 * RLS lets anon read active products and variants. Orders are written with the
 * service role key, which never leaves the server.
 */

type VariantRow = {
  id: string;
  sku: string;
  size_ml: number;
  price_inr: number;
  stock: number;
  is_active: boolean;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  top_note: string | null;
  heart_note: string | null;
  base_note: string | null;
  accent_color: string | null;
  created_at: string;
  io_moods: { id: string; label: string } | null;
  io_product_variants: VariantRow[];
};

const SELECT =
  "id,slug,name,description,top_note,heart_note,base_note,accent_color,created_at," +
  "io_moods(id,label),io_product_variants(id,sku,size_ml,price_inr,stock,is_active)";

const CURRENCY = "INR";

function toProduct(row: ProductRow): Product | undefined {
  const variants = row.io_product_variants
    .filter((v) => v.is_active)
    .sort((a, b) => a.size_ml - b.size_ml)
    .map((v) => ({
      id: v.id,
      title: `${v.size_ml} ml`,
      price: { amount: v.price_inr, currencyCode: CURRENCY },
      available: v.stock > 0,
      sku: v.sku,
      inventory: v.stock,
    }));
  // A product with no active variant can't be bought, so hide it.
  if (variants.length === 0) return undefined;

  const notes = [
    row.top_note && `Top: ${row.top_note}`,
    row.heart_note && `Heart: ${row.heart_note}`,
    row.base_note && `Base: ${row.base_note}`,
  ].filter((n): n is string => Boolean(n));

  const inStock = variants.some((v) => v.available);
  return {
    id: row.id,
    handle: row.slug,
    title: row.name,
    description: row.description ?? "",
    category: row.io_moods?.label ?? "Other",
    tags: [row.io_moods?.id, inStock ? "in-stock" : "sold-out"].filter((t): t is string => Boolean(t)),
    // No "featured" flag in io_products: feature what can actually be bought.
    featured: inStock,
    images: [],
    accentColor: row.accent_color ?? undefined,
    price: { amount: Math.min(...variants.map((v) => v.price.amount)), currencyCode: CURRENCY },
    variants,
    details: notes,
  };
}

function compact<T>(items: (T | undefined)[]): T[] {
  return items.filter((x): x is T => x !== undefined);
}

/** Human-friendly, unique-enough order number, e.g. AUR-261115-7KQ2XF. */
function newOrderNumber() {
  const d = new Date();
  const ymd = [d.getUTCFullYear() % 100, d.getUTCMonth() + 1, d.getUTCDate()]
    .map((n) => String(n).padStart(2, "0"))
    .join("");
  const suffix = randomBytes(4).readUInt32BE(0).toString(36).toUpperCase().padStart(6, "0").slice(-6);
  return `AUR-${ymd}-${suffix}`;
}

export const supabaseProvider: CommerceProvider = {
  name: "supabase",
  async getProducts() {
    const rows = await rest<ProductRow[]>(`io_products?select=${SELECT}&is_active=eq.true&order=created_at.asc`);
    return compact(rows.map(toProduct));
  },
  async getProduct(handle) {
    const rows = await rest<ProductRow[]>(
      `io_products?select=${SELECT}&is_active=eq.true&slug=eq.${encodeURIComponent(handle)}&limit=1`,
    );
    return rows[0] ? toProduct(rows[0]) : undefined;
  },
  async createCheckout(lines, customer) {
    const subtotal = lines.reduce((sum, l) => sum + l.variant.price.amount * l.quantity, 0);
    const shipping = 0;
    const total = subtotal + shipping;
    const { address } = customer;

    // 1. Record a pending order (service role bypasses RLS; never expose this key to the browser).
    const [order] = await rest<{ id: string; order_number: string }[]>("io_orders", {
      method: "POST",
      serviceRole: true,
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        order_number: newOrderNumber(),
        status: "pending",
        shipping_name: customer.name,
        shipping_email: customer.email,
        shipping_phone: customer.phone,
        shipping_line1: address.line1,
        shipping_line2: address.line2 ?? null,
        shipping_city: address.city,
        shipping_state: address.state,
        shipping_pin: address.postalCode,
        subtotal_inr: subtotal,
        shipping_inr: shipping,
        total_inr: total,
      }),
    });

    await rest("io_order_items", {
      method: "POST",
      serviceRole: true,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(
        lines.map((l) => ({
          order_id: order.id,
          variant_id: l.variant.id,
          product_name: l.product.title,
          sku: l.variant.sku ?? l.variant.id,
          unit_price_inr: l.variant.price.amount,
          quantity: l.quantity,
        })),
      ),
    });

    // 2. Create the matching Razorpay order and store its id in payment_ref.
    const amountMinor = total * 100;
    const rzp = await createRazorpayOrder(amountMinor, CURRENCY, order.order_number);
    await rest(`io_orders?id=eq.${order.id}`, {
      method: "PATCH",
      serviceRole: true,
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ payment_ref: rzp.id }),
    });

    return {
      type: "razorpay",
      keyId: requireEnv("RAZORPAY_KEY_ID"),
      razorpayOrderId: rzp.id,
      orderId: order.order_number,
      amount: amountMinor,
      currency: CURRENCY,
      customer: { name: customer.name, email: customer.email, phone: customer.phone },
    };
  },
};

/**
 * Marks an order paid once Razorpay's signature has been verified, and deducts
 * stock for its items in the same database transaction (io_mark_order_paid).
 * payment_ref holds the Razorpay order id. Returns the order number, or
 * undefined if the order was already paid (so stock is never deducted twice).
 */
export async function markSupabaseOrderPaid(razorpayOrderId: string) {
  const orderNumber = await rest<string | null>("rpc/io_mark_order_paid", {
    method: "POST",
    serviceRole: true,
    body: JSON.stringify({ p_payment_ref: razorpayOrderId }),
  });
  return orderNumber ?? undefined;
}
