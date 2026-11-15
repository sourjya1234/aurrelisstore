import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ProductGrid } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/commerce";

export const metadata: Metadata = { title: "Shop all" };

type SearchParams = PageProps<"/products">["searchParams"];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <p className="eyebrow">The collection</p>
      <h1 className="mt-2 font-serif text-5xl">Shop all</h1>
      <Suspense fallback={<GridSkeleton />}>
        <Catalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const sorts = [
  { value: "", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

async function Catalog({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const category = one(params.category);
  const sort = one(params.sort) ?? "";
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);

  let list = category ? products.filter((p) => p.category === category) : products;
  if (sort === "price-asc") list = [...list].sort((a, b) => a.price.amount - b.price.amount);
  if (sort === "price-desc") list = [...list].sort((a, b) => b.price.amount - a.price.amount);

  const href = (c?: string, s = sort) => {
    const q = new URLSearchParams();
    if (c) q.set("category", c);
    if (s) q.set("sort", s);
    const qs = q.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  const chip = (active: boolean) =>
    `rounded-full border px-4 py-1.5 text-sm transition ${
      active ? "border-ink bg-ink text-ivory" : "border-line hover:border-ink"
    }`;

  return (
    <>
      <div className="mt-8 mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-line pb-6">
        <div className="flex flex-wrap gap-2">
          <Link href={href()} className={chip(!category)}>All</Link>
          {categories.map((c) => (
            <Link key={c} href={href(c)} className={chip(category === c)}>{c}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-muted">
          {sorts.map((s) => (
            <Link
              key={s.value}
              href={href(category, s.value)}
              className={sort === s.value ? "text-ink underline underline-offset-4" : "hover:text-ink"}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="mb-6 text-sm text-muted">{list.length} {list.length === 1 ? "scent" : "scents"}</p>
      <ProductGrid products={list} />
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="mt-24 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="aspect-[4/5] animate-pulse rounded-xl bg-sand" />
      ))}
    </div>
  );
}
