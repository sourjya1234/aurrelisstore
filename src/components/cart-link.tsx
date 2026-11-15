"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-store";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="relative flex items-center gap-2 text-sm hover:text-gold-dark">
      <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 7h12l-1 13H7L6 7Z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
      <span>Bag</span>
      <span
        className="min-w-5 rounded-full bg-ink px-1.5 text-center text-[11px] leading-5 text-ivory"
        aria-label={`${count} items in bag`}
      >
        {count}
      </span>
    </Link>
  );
}
