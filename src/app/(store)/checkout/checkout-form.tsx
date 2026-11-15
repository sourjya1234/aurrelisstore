"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cart, useCart } from "@/lib/cart-store";
import type { CheckoutResult, Customer } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/format";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay"));
    document.body.appendChild(script);
  });
}

export function CheckoutForm() {
  const router = useRouter();
  const { lines, subtotal } = useCart();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (lines.length === 0) {
    return (
      <div className="mt-12 rounded-2xl border border-dashed border-line py-20 text-center">
        <p className="text-muted">Your bag is empty.</p>
        <Link href="/products" className="btn mt-6">Shop the collection</Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const f = new FormData(e.currentTarget);
    const s = (k: string) => String(f.get(k) ?? "").trim();
    const customer: Customer = {
      name: s("name"),
      email: s("email"),
      phone: s("phone"),
      address: {
        line1: s("line1"),
        line2: s("line2") || undefined,
        city: s("city"),
        state: s("state"),
        postalCode: s("postalCode"),
        country: s("country") || "IN",
      },
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          lines: lines.map((l) => ({ handle: l.handle, variantId: l.variantId, quantity: l.quantity })),
        }),
      });
      const data = (await res.json()) as CheckoutResult | { error: string };
      if (!res.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Checkout failed");
      }

      if (data.type === "redirect") {
        const external = /^https?:\/\//.test(data.url);
        if (external) {
          window.location.assign(data.url); // Shopify hosted checkout
        } else {
          cart.clear();
          router.push(data.url);
        }
        return;
      }

      await loadRazorpay();
      const rzp = new window.Razorpay!({
        key: data.keyId,
        order_id: data.razorpayOrderId,
        amount: data.amount,
        currency: data.currency,
        name: "Aurrelis",
        description: `Order ${data.orderId.slice(0, 8)}`,
        prefill: { name: data.customer.name, email: data.customer.email, contact: data.customer.phone },
        theme: { color: "#1c1a17" },
        modal: { ondismiss: () => setPending(false) },
        handler: async (payment: RazorpayResponse) => {
          const verify = await fetch("/api/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payment),
          });
          if (!verify.ok) {
            setError("We couldn't verify your payment. If you were charged, please contact us.");
            setPending(false);
            return;
          }
          cart.clear();
          router.push(`/checkout/success?order=${encodeURIComponent(data.orderId)}`);
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        <fieldset className="space-y-4">
          <legend className="mb-4 font-serif text-2xl">Contact</legend>
          <input className="input" name="name" placeholder="Full name" autoComplete="name" required />
          <div className="grid gap-4 sm:grid-cols-2">
            <input className="input" name="email" type="email" placeholder="Email" autoComplete="email" required />
            <input className="input" name="phone" type="tel" placeholder="Phone" autoComplete="tel" required />
          </div>
        </fieldset>
        <fieldset className="space-y-4">
          <legend className="mb-4 font-serif text-2xl">Shipping address</legend>
          <input className="input" name="line1" placeholder="Address" autoComplete="address-line1" required />
          <input className="input" name="line2" placeholder="Apartment, suite (optional)" autoComplete="address-line2" />
          <div className="grid gap-4 sm:grid-cols-3">
            <input className="input" name="city" placeholder="City" autoComplete="address-level2" required />
            <input className="input" name="state" placeholder="State" autoComplete="address-level1" required />
            <input className="input" name="postalCode" placeholder="PIN code" autoComplete="postal-code" required />
          </div>
          <input type="hidden" name="country" value="IN" />
        </fieldset>
      </div>

      <aside className="h-fit rounded-2xl bg-sand p-6">
        <h2 className="font-serif text-2xl">Order summary</h2>
        <ul className="mt-6 space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l.variantId} className="flex justify-between gap-4">
              <span>
                {l.title}
                {l.variantTitle !== "Default" && <span className="text-muted"> · {l.variantTitle}</span>}
                <span className="text-muted"> × {l.quantity}</span>
              </span>
              <span className="whitespace-nowrap">
                {formatMoney({ ...l.price, amount: l.price.amount * l.quantity })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex justify-between border-t border-line pt-4 font-medium">
          <span>Subtotal</span>
          <span>{formatMoney(subtotal)}</span>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn mt-6 w-full" disabled={pending}>
          {pending ? "Processing…" : "Continue to payment"}
        </button>
        <p className="mt-3 text-center text-xs text-muted">Secure payment. Prices confirmed at payment.</p>
      </aside>
    </form>
  );
}
