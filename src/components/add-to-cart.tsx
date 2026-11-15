"use client";

import Link from "next/link";
import { useState } from "react";
import { cart } from "@/lib/cart-store";
import type { Product } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/format";

export function AddToCart({ product }: { product: Product }) {
  const firstAvailable = product.variants.find((v) => v.available) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstAvailable?.id);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const variant = product.variants.find((v) => v.id === variantId) ?? firstAvailable;
  const showVariants = product.variants.length > 1;

  function add() {
    if (!variant?.available) return;
    cart.add(
      {
        handle: product.handle,
        variantId: variant.id,
        title: product.title,
        variantTitle: variant.title,
        price: variant.price,
        image: product.images[0]?.url,
      },
      quantity,
    );
    setAdded(true);
  }

  return (
    <div className="mt-8 space-y-6">
      {showVariants && (
        <fieldset>
          <legend className="mb-3 text-sm font-medium">Option</legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                disabled={!v.available}
                onClick={() => {
                  setVariantId(v.id);
                  setAdded(false);
                }}
                aria-pressed={v.id === variant?.id}
                className={`rounded-full border px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 ${
                  v.id === variant?.id ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"
                }`}
              >
                {v.title}
                {v.price.amount !== product.price.amount && ` · ${formatMoney(v.price)}`}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full border border-line">
          <button
            type="button"
            className="px-4 py-3"
            aria-label="Decrease quantity"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          >
            −
          </button>
          <span className="w-6 text-center text-sm" aria-live="polite">{quantity}</span>
          <button
            type="button"
            className="px-4 py-3"
            aria-label="Increase quantity"
            onClick={() => setQuantity((q) => Math.min(20, q + 1))}
          >
            +
          </button>
        </div>
        <button type="button" className="btn flex-1" onClick={add} disabled={!variant?.available}>
          {variant?.available
            ? `Add to bag · ${formatMoney({ ...variant.price, amount: variant.price.amount * quantity })}`
            : "Sold out"}
        </button>
      </div>

      {added && (
        <p className="rounded-lg bg-sand px-4 py-3 text-sm" role="status">
          Added to your bag.{" "}
          <Link href="/cart" className="underline underline-offset-4">View bag</Link>
        </p>
      )}
    </div>
  );
}
