-- Aurrelis storefront schema (used when COMMERCE_PROVIDER=supabase)

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  title text not null,
  description text,
  category text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  published boolean not null default true,
  -- [{ "url": "https://...", "alt": "..." }]
  images jsonb not null default '[]',
  price numeric(12, 2) not null check (price >= 0),
  compare_at_price numeric(12, 2) check (compare_at_price >= 0),
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  title text not null,
  -- null = inherit products.price
  price numeric(12, 2) check (price >= 0),
  available boolean not null default true,
  position int not null default 0
);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  shipping_address jsonb not null,
  line_items jsonb not null,
  amount numeric(12, 2) not null,
  currency text not null default 'INR',
  razorpay_order_id text unique,
  razorpay_payment_id text,
  created_at timestamptz not null default now()
);

-- Row level security: catalog is publicly readable; orders are server-only
-- (written with the service role key from the Next.js API routes).
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.orders enable row level security;

drop policy if exists "Public can read published products" on public.products;
create policy "Public can read published products"
  on public.products for select
  to anon, authenticated
  using (published);

drop policy if exists "Public can read variants of published products" on public.product_variants;
create policy "Public can read variants of published products"
  on public.product_variants for select
  to anon, authenticated
  using (exists (select 1 from public.products p where p.id = product_id and p.published));

-- No policies on orders => anon/authenticated have no access.
