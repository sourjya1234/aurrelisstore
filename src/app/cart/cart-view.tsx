"use client";

import Link from "next/link";
import { ProductImage } from "@/components/product-image";
import { cart, useCart } from "@/lib/cart-store";
import { formatMoney } from "@/lib/format";

export const FREE_SHIPPING_THRESHOLD = 2500;
export const SHIPPING_FEE = 99;

export function CartView() {
  const { lines, subtotal } = useCart();

  if (lines.length === 0) {
    return (
      <div className="mt-12 rounded-2xl border border-dashed border-line py-20 text-center">
        <p className="text-muted">Your bag is empty.</p>
        <Link href="/products" className="btn mt-6">Discover the collection</Link>
      </div>
    );
  }

  const remaining = FREE_SHIPPING_THRESHOLD - subtotal.amount;

  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_340px]">
      <ul className="divide-y divide-line border-y border-line">
        {lines.map((line) => (
          <li key={line.variantId} className="flex gap-4 py-6">
            <Link
              href={`/products/${line.handle}`}
              className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden rounded-lg bg-sand"
            >
              {line.image && (
                <ProductImage src={line.image} alt={line.title} fill sizes="96px" className="object-cover" />
              )}
            </Link>
            <div className="flex flex-1 flex-col justify-between">
              <div className="flex justify-between gap-4">
                <div>
                  <Link href={`/products/${line.handle}`} className="font-serif text-xl hover:text-gold-dark">
                    {line.title}
                  </Link>
                  {line.variantTitle !== "Default" && (
                    <p className="text-sm text-muted">{line.variantTitle}</p>
                  )}
                </div>
                <p className="text-sm whitespace-nowrap">
                  {formatMoney({ ...line.price, amount: line.price.amount * line.quantity })}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center rounded-full border border-line text-sm">
                  <button
                    className="px-3 py-1.5"
                    aria-label={`Decrease quantity of ${line.title}`}
                    onClick={() => cart.setQuantity(line.variantId, line.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{line.quantity}</span>
                  <button
                    className="px-3 py-1.5"
                    aria-label={`Increase quantity of ${line.title}`}
                    onClick={() => cart.setQuantity(line.variantId, line.quantity + 1)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="text-xs text-muted underline underline-offset-4 hover:text-ink"
                  onClick={() => cart.remove(line.variantId)}
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <aside className="h-fit rounded-2xl bg-sand p-6">
        <h2 className="font-serif text-2xl">Summary</h2>
        <dl className="mt-6 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted">
            <dt>Shipping</dt>
            <dd>Calculated at checkout</dd>
          </div>
        </dl>
        {remaining > 0 ? (
          <p className="mt-4 text-xs text-muted">
            Add {formatMoney({ ...subtotal, amount: remaining })} more for free shipping.
          </p>
        ) : (
          <p className="mt-4 text-xs text-gold-dark">You&apos;ve unlocked free shipping.</p>
        )}
        <Link href="/checkout" className="btn mt-6 w-full">Checkout</Link>
        <Link href="/products" className="mt-3 block text-center text-xs underline underline-offset-4">
          Continue shopping
        </Link>
      </aside>
    </div>
  );
}
