import type { Metadata } from "next";
import { CartView } from "./cart-view";

export const metadata: Metadata = { title: "Your bag" };

export default function CartPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
      <h1 className="font-serif text-5xl">Your bag</h1>
      <CartView />
    </div>
  );
}
