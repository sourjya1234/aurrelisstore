# Aurrelis Store: Frontend

Storefront for Aurrelis mood perfumes, built with **Next.js 16** (App Router, Cache Components), **React 19**, **TypeScript** and **Tailwind CSS v4**.

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
| `/dashboard` | Ops dashboard: investor, B2B and review-request outreach (sign-in required) |

## Commerce providers

The data layer lives in `src/lib/commerce`. Set `COMMERCE_PROVIDER` to choose a backend:

| Provider | Catalog | Checkout |
| --- | --- | --- |
| `mock` (default) | `providers/mock-data.ts` | Simulated order, goes straight to the success page |
| `supabase` | `io_products`, `io_product_variants`, `io_moods` in the Aurrelis Ops project | Writes a pending order to `io_orders` + `io_order_items`, pays with Razorpay Checkout, verifies the signature server-side, marks the order paid |
| `shopify` | Storefront API | `cartCreate`, then redirects to Shopify's hosted checkout |

Pages only call `getProducts()` and `getProduct()` from `@/lib/commerce`. These are cached with `"use cache"` (1 hour, tag `products`). To add another backend, implement `CommerceProvider` in `types.ts`.

**Prices are never trusted from the browser.** `/api/checkout` re-prices every line against the catalog and rejects variants that are sold out or unknown.

### Supabase + Razorpay setup

The store uses the existing **aurrelis-ops** Supabase project (`eqixqpcxlfedijqghggo`). No migration is needed; it reads and writes these tables:

| Table | Used for |
| --- | --- |
| `io_moods` | Categories (Warm, Bright, Grounded, Soft) |
| `io_products` | Product name, slug, description, top/heart/base notes, accent colour. Only `is_active` rows are shown |
| `io_product_variants` | Sizes and prices (`price_inr`, whole rupees). A variant with `stock = 0` shows as sold out |
| `io_orders`, `io_order_items` | Orders, including the full shipping address (`shipping_line2`, `shipping_state`). `payment_ref` holds the Razorpay order id |

**Stock.** Checkout rejects a quantity larger than the variant's `stock`. Once Razorpay's signature is verified, `io_mark_order_paid()` marks the order paid and deducts stock for its items in one transaction; calling it twice never deducts twice. The catalog cache is then refreshed so sold-out badges update. If you change stock by hand in Supabase, call `POST /api/revalidate` (or wait up to an hour) to see it on the site.

The columns and function come from `supabase/migrations/20261115_io_orders_address_and_paid_stock.sql`, already applied to the project.

1. Set `COMMERCE_PROVIDER=supabase`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
2. Existing RLS lets visitors read active products and variants only. Orders are written with the service-role key, which stays on the server.
3. Products have no image column yet, so cards show a tile in the product's `accent_color`.

### Ops dashboard

`/dashboard` shows the outreach pipelines from the same project:

- **Investors**: `investor_outreach` + `investor_followup_log`
- **B2B partners**: `b2b_outreach` + `b2b_followup_log`
- **Review requests**: `review_outreach`

Each pipeline has status and segment breakdowns, follow-ups per day for the last 30 days, overdue follow-ups, and a searchable, filterable table. Data is cached for about a minute; **Refresh data** reloads it.

Click a lead to open its page (`/dashboard/leads/investors/<id>` or `/dashboard/leads/b2b/<id>`), where you can:

- change its status (Under discussion, Won, Not interested, Bounced, the values the table allows), status detail, owner and remark; a status change is also written to the follow-up log
- log a follow-up with channel, note, next follow-up date and optional new status; it's recorded under your email
- see the full follow-up history

Sign-in uses the existing `app_users` table with the same rule as the database's `is_crm()` function: the account must be active and have `crm_access` (or the `owner` role). Set `DASHBOARD_PASSWORD` (shared password) and `DASHBOARD_SESSION_SECRET` (signs the session cookie). The dashboard reads with the service-role key, so it needs `SUPABASE_SERVICE_ROLE_KEY` too.

### Shopify setup

Create a Storefront API access token (Headless channel or a custom app). Then set `SHOPIFY_STORE_DOMAIN` and `SHOPIFY_STOREFRONT_ACCESS_TOKEN`. To mark a product as featured on the home page, give it the tag `featured`.

### Cache revalidation

`POST /api/revalidate` with `Authorization: Bearer $REVALIDATE_SECRET` refreshes the catalog cache. Point Shopify product webhooks or a Supabase database webhook at it.

## Scripts

- `npm run dev`: start the dev server
- `npm run build`: production build
- `npm start`: serve the production build
- `npm run lint`: run ESLint
