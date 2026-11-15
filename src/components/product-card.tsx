import Link from "next/link";
import type { Product } from "@/lib/commerce/types";
import { formatMoney } from "@/lib/format";
import { ProductImage } from "./product-image";
import { ProductTile } from "./product-tile";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const image = product.images[0];
  const soldOut = product.variants.every((v) => !v.available);
  return (
    <Link href={`/products/${product.handle}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-sand">
        {image ? (
          <ProductImage
            src={image.url}
            alt={image.alt}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductTile product={product} />
        )}
        {(product.compareAtPrice || soldOut || product.tags.includes("new")) && (
          <span className="absolute top-3 left-3 rounded-full bg-ivory/90 px-3 py-1 text-[10px] tracking-[0.15em] uppercase">
            {soldOut ? "Sold out" : product.compareAtPrice ? "Sale" : "New"}
          </span>
        )}
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg leading-snug">{product.title}</h3>
          <p className="text-xs text-muted">{product.category}</p>
        </div>
        <div className="text-right text-sm whitespace-nowrap">
          <p>{formatMoney(product.price)}</p>
          {product.compareAtPrice && (
            <p className="text-xs text-muted line-through">{formatMoney(product.compareAtPrice)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-muted">No pieces found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
