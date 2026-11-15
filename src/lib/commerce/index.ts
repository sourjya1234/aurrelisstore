import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { providerName } from "./env";
import { mockProvider } from "./providers/mock";
import { shopifyProvider } from "./providers/shopify";
import { supabaseProvider } from "./providers/supabase";
import type { CartLineInput, CommerceProvider, PricedLine } from "./types";

export * from "./types";

export const PRODUCTS_TAG = "products";

export function getProvider(): CommerceProvider {
  switch (providerName()) {
    case "supabase":
      return supabaseProvider;
    case "shopify":
      return shopifyProvider;
    default:
      return mockProvider;
  }
}

export async function getProducts() {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG);
  return getProvider().getProducts();
}

export async function getProduct(handle: string) {
  "use cache";
  cacheLife("hours");
  cacheTag(PRODUCTS_TAG, `product:${handle}`);
  return getProvider().getProduct(handle);
}

export async function getCategories() {
  const products = await getProducts();
  return [...new Set(products.map((p) => p.category))].sort();
}

/**
 * Re-prices cart lines against the catalog on the server so the client
 * can never set its own prices.
 */
export async function priceLines(lines: CartLineInput[]): Promise<PricedLine[]> {
  const provider = getProvider();
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const quantity = Math.floor(line.quantity);
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > 20) {
      throw new Error(`Invalid quantity for ${line.handle}`);
    }
    const product = await provider.getProduct(line.handle);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant) throw new Error(`Item no longer available: ${line.handle}`);
    if (!variant.available) throw new Error(`${product.title} (${variant.title}) is sold out`);
    priced.push({ product, variant, quantity });
  }
  return priced;
}
