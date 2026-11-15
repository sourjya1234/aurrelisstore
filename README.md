# Aurrelis Store: Frontend

Storefront for Aurrelis, built with **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript** and **Tailwind CSS v4**.

## Quick start

```bash
npm install
cp .env.example .env.local   # optional; defaults to the mock catalog
npm run dev                  # http://localhost:3000
```

## Pages

| Route | What it does |
| --- | --- |
| `/` | Hero, featured pieces, categories, bestsellers |
| `/products` | Full catalog with `?category=` filter and `?sort=price-asc\|price-desc` |
| `/products/[handle]` | Product detail, variant picker, add to bag, related items |
| `/cart` | Bag (stored in `localStorage`, synced across tabs) |
| `/checkout` | Contact and shipping form, then payment via the active provider |
| `/checkout/success` | Order confirmation |

## Commerce providers

The data layer lives in `src/lib/commerce`. Set `COMMERCE_PROVIDER` to choose a backend:

| Provider | Catalog | Checkout |
| --- | --- | --- |
| `mock` (default) | `providers/mock-data.ts` | Simulated order, goes straight to the success page |
| `supabase` | `products` and `product_variants` tables | Writes a pending order to `orders`, pays with Razorpay Checkout, verifies the signature server-side, marks the order paid |
| `shopify` | Storefront API | `cartCreate`, then redirects to Shopify's hosted checkout |

Pages only call `getProducts()` and `getProduct()` from `@/lib/commerce`. These are cached with `"use cache"` (1 hour, tag `products`). To add another backend, implement `CommerceProvider` in `types.ts`.

**Prices are never trusted from the browser.** `/api/checkout` re-prices every line against the catalog and rejects variants that are sold out or unknown.

### Supabase + Razorpay setup

1. Run `supabase/migrations/0001_storefront.sql` (Supabase SQL editor or `supabase db push`).
2. Set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
3. RLS lets visitors read published products only. Orders can be read and written only with the service-role key, which stays on the server.

### Shopify setup

Create a Storefront API access token (Headless channel or a custom app). Then set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN`. To mark a product as featured on the home page, give it the tag `featured`.

### Cache revalidation

`POST /api/revalidate` with `Authorization: Bearer $REVALIDATE_SECRET` refreshes the catalog cache. Point Shopify product webhooks or a Supabase database webhook at it.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: production build
- `npm start`: serve the production build
- `npm run lint`: run ESLint
