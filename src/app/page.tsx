import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { getCategories, getProducts } from "@/lib/commerce";

export default async function Home() {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const bestsellers = products.filter((p) => p.tags.includes("bestseller")).slice(0, 4);

  return (
    <>
      <section className="relative overflow-hidden bg-sand">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 sm:px-6 md:grid-cols-2 md:py-28">
          <div>
            <p className="eyebrow">The Everyday Gold Edit</p>
            <h1 className="mt-4 font-serif text-5xl leading-[1.05] sm:text-6xl lg:text-7xl">
              Jewellery that keeps your light.
            </h1>
            <p className="mt-6 max-w-md text-muted">
              Demi-fine pieces in 18k gold vermeil, made to be layered, gifted and lived in.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn">Shop the collection</Link>
              <Link href="/products?category=Necklaces" className="btn-outline">New necklaces</Link>
            </div>
          </div>
          <div aria-hidden className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#e9d9b8] via-[#d4b98a] to-[#b08d57] opacity-80 blur-2xl" />
            <div className="absolute inset-10 rounded-full border border-gold/40" />
            <div className="absolute inset-20 rounded-full border border-gold/60" />
            <div className="absolute inset-0 flex items-center justify-center font-serif text-8xl text-ivory drop-shadow">
              A
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <p className="eyebrow">Featured</p>
            <h2 className="mt-2 font-serif text-4xl">Signature pieces</h2>
          </div>
          <Link href="/products" className="text-sm underline underline-offset-4 hover:text-gold-dark">
            View all
          </Link>
        </div>
        <ProductGrid products={featured.length ? featured : products.slice(0, 4)} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
        <p className="eyebrow">Shop by category</p>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c}
              href={`/products?category=${encodeURIComponent(c)}`}
              className="flex aspect-[3/2] items-center justify-center rounded-xl border border-line bg-white font-serif text-2xl transition hover:border-gold hover:text-gold-dark"
            >
              {c}
            </Link>
          ))}
        </div>
      </section>

      {bestsellers.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-20 sm:px-6">
          <p className="eyebrow">Loved by many</p>
          <h2 className="mt-2 mb-10 font-serif text-4xl">Bestsellers</h2>
          <ProductGrid products={bestsellers} />
        </section>
      )}
    </>
  );
}
