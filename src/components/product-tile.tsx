import type { Product } from "@/lib/commerce/types";

/** Placeholder artwork for products without photos (e.g. Supabase catalog), tinted with the brand accent. */
export function ProductTile({ product, large }: { product: Product; large?: boolean }) {
  const accent = product.accentColor ?? "#b08d57";
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center"
      style={{ background: `radial-gradient(circle at 50% 35%, ${accent}33, ${accent}99 70%, ${accent})` }}
    >
      <span className={`font-serif text-ivory drop-shadow ${large ? "text-6xl" : "text-4xl"}`}>
        {product.title.charAt(0)}
      </span>
      <span className="px-4 text-[10px] tracking-[0.25em] text-ivory/90 uppercase">{product.title}</span>
    </div>
  );
}
