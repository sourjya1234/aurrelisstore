import Link from "next/link";
import { CartLink } from "./cart-link";

const nav = [
  { href: "/products", label: "Shop all" },
  { href: "/products?category=Rings", label: "Rings" },
  { href: "/products?category=Necklaces", label: "Necklaces" },
  { href: "/products?category=Earrings", label: "Earrings" },
  { href: "/products?category=Bracelets", label: "Bracelets" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-ivory/90 backdrop-blur">
      <div className="bg-ink py-2 text-center text-[11px] tracking-[0.2em] text-ivory uppercase">
        Complimentary shipping on orders over ₹2,500
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
        <Link href="/" className="font-serif text-2xl tracking-[0.3em] uppercase sm:text-3xl">
          Aurrelis
        </Link>
        <nav className="hidden gap-8 text-sm md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="transition hover:text-gold-dark">
              {item.label}
            </Link>
          ))}
        </nav>
        <CartLink />
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-3 text-sm md:hidden">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="shrink-0 hover:text-gold-dark">
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
