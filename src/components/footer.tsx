import { cacheLife } from "next/cache";
import Link from "next/link";
import { getCategories } from "@/lib/commerce";

export async function Footer() {
  "use cache";
  cacheLife("days");
  const categories = (await getCategories()).slice(0, 3);
  return (
    <footer className="mt-24 border-t border-line bg-sand">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="font-serif text-2xl tracking-[0.3em] uppercase">Aurrelis</p>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Demi-fine jewellery in 18k gold vermeil and sterling silver, designed to be layered,
            gifted and worn every day.
          </p>
        </div>
        <div>
          <p className="eyebrow">Shop</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-gold-dark">Shop all</Link></li>
            {categories.map((c) => (
              <li key={c}>
                <Link href={`/products?category=${encodeURIComponent(c)}`} className="hover:text-gold-dark">{c}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Care</p>
          <ul className="mt-4 space-y-2 text-sm text-muted">
            <li>Free shipping over ₹2,500</li>
            <li>15-day returns</li>
            <li>1-year plating warranty</li>
          </ul>
        </div>
      </div>
      <p className="border-t border-line py-6 text-center text-xs text-muted">
        © {new Date().getFullYear()} Aurrelis. All rights reserved.
      </p>
    </footer>
  );
}
