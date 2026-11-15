import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductGrid } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { ProductTile } from "@/components/product-tile";
import { getProduct, getProducts } from "@/lib/commerce";
import { formatMoney } from "@/lib/format";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: PageProps<"/products/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) return {};
  return {
    title: product.title,
    description: product.description,
    openGraph: { images: product.images.slice(0, 1).map((i) => i.url) },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[handle]">) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  const related = (await getProducts())
    .filter((p) => p.category === product.category && p.handle !== product.handle)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <nav className="mb-8 text-xs text-muted">
        <Link href="/products" className="hover:text-ink">Shop</Link>
        <span className="mx-2">/</span>
        <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-ink">
          {product.category}
        </Link>
      </nav>

      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <div className="grid gap-4">
          {product.images.length ? (
            product.images.map((img, i) => (
              <div key={img.url} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
                <ProductImage
                  src={img.url}
                  alt={img.alt}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ))
          ) : (
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-sand">
              <ProductTile product={product} large />
            </div>
          )}
        </div>

        <div className="md:sticky md:top-32 md:self-start">
          <p className="eyebrow">{product.category}</p>
          <h1 className="mt-3 font-serif text-4xl sm:text-5xl">{product.title}</h1>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-xl">{formatMoney(product.price)}</span>
            {product.compareAtPrice && (
              <span className="text-muted line-through">{formatMoney(product.compareAtPrice)}</span>
            )}
          </div>
          <p className="mt-6 leading-relaxed text-muted">{product.description}</p>

          <AddToCart product={product} />

          <ul className="mt-10 space-y-3 border-t border-line pt-6 text-sm text-muted">
            {product.details?.map((d) => <li key={d}>✦ {d}</li>)}
            <li>✦ Free shipping over ₹2,500 · 15-day returns</li>
          </ul>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-24">
          <h2 className="mb-8 font-serif text-3xl">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
