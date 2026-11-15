import "server-only";
import { requireEnv } from "../env";
import type { CommerceProvider, Product } from "../types";

/** Catalog, cart and hosted checkout from a Shopify store via the Storefront API. */

async function storefront<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const domain = requireEnv("SHOPIFY_STORE_DOMAIN").replace(/^https?:\/\//, "").replace(/\/$/, "");
  const version = process.env.SHOPIFY_API_VERSION ?? "2025-10";
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": requireEnv("SHOPIFY_STOREFRONT_ACCESS_TOKEN"),
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) {
    throw new Error(`Shopify Storefront API error: ${JSON.stringify(json.errors ?? res.status)}`);
  }
  return json.data as T;
}

const PRODUCT_FIELDS = /* GraphQL */ `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    productType
    tags
    images(first: 10) { nodes { url altText } }
    priceRange { minVariantPrice { amount currencyCode } }
    compareAtPriceRange { maxVariantPrice { amount currencyCode } }
    variants(first: 50) {
      nodes { id title availableForSale price { amount currencyCode } }
    }
  }
`;

type MoneyV2 = { amount: string; currencyCode: string };
type ShopifyProduct = {
  id: string;
  handle: string;
  title: string;
  description: string;
  productType: string;
  tags: string[];
  images: { nodes: { url: string; altText: string | null }[] };
  priceRange: { minVariantPrice: MoneyV2 };
  compareAtPriceRange: { maxVariantPrice: MoneyV2 };
  variants: { nodes: { id: string; title: string; availableForSale: boolean; price: MoneyV2 }[] };
};

const money = (m: MoneyV2) => ({ amount: Number(m.amount), currencyCode: m.currencyCode });

function toProduct(p: ShopifyProduct): Product {
  const compareAt = money(p.compareAtPriceRange.maxVariantPrice);
  const price = money(p.priceRange.minVariantPrice);
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    description: p.description,
    category: p.productType || "Other",
    tags: p.tags,
    featured: p.tags.map((t) => t.toLowerCase()).includes("featured"),
    images: p.images.nodes.map((img) => ({ url: img.url, alt: img.altText ?? p.title })),
    price,
    compareAtPrice: compareAt.amount > price.amount ? compareAt : undefined,
    variants: p.variants.nodes.map((v) => ({
      id: v.id,
      title: v.title === "Default Title" ? "Default" : v.title,
      price: money(v.price),
      available: v.availableForSale,
    })),
  };
}

export const shopifyProvider: CommerceProvider = {
  name: "shopify",
  async getProducts() {
    const data = await storefront<{ products: { nodes: ShopifyProduct[] } }>(
      `${PRODUCT_FIELDS}
       query Products { products(first: 100, sortKey: CREATED_AT, reverse: true) { nodes { ...ProductFields } } }`,
    );
    return data.products.nodes.map(toProduct);
  },
  async getProduct(handle) {
    const data = await storefront<{ product: ShopifyProduct | null }>(
      `${PRODUCT_FIELDS}
       query Product($handle: String!) { product(handle: $handle) { ...ProductFields } }`,
      { handle },
    );
    return data.product ? toProduct(data.product) : undefined;
  },
  async createCheckout(lines, customer) {
    const data = await storefront<{
      cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] };
    }>(
      `mutation CartCreate($input: CartInput!) {
         cartCreate(input: $input) { cart { checkoutUrl } userErrors { message } }
       }`,
      {
        input: {
          lines: lines.map((l) => ({ merchandiseId: l.variant.id, quantity: l.quantity })),
          buyerIdentity: { email: customer.email, phone: customer.phone || undefined },
        },
      },
    );
    const { cart, userErrors } = data.cartCreate;
    if (!cart || userErrors.length) {
      throw new Error(userErrors.map((e) => e.message).join("; ") || "Could not create Shopify cart");
    }
    return { type: "redirect", url: cart.checkoutUrl };
  },
};
