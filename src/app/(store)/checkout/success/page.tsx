import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

export const metadata: Metadata = { title: "Thank you" };

export default function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center sm:px-6">
      <p className="eyebrow">Order confirmed</p>
      <h1 className="mt-3 font-serif text-5xl">Thank you.</h1>
      <p className="mt-6 text-muted">
        Your pieces are being prepared with care. A confirmation will arrive in your inbox shortly.
      </p>
      <Suspense fallback={<p className="mt-6 h-6" />}>
        <OrderNumber searchParams={searchParams} />
      </Suspense>
      <Link href="/products" className="btn mt-10">Continue shopping</Link>
    </div>
  );
}

async function OrderNumber({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const { order } = await searchParams;
  if (typeof order !== "string") return null;
  return (
    <p className="mt-6 text-sm">
      Order reference: <span className="font-mono">{order}</span>
    </p>
  );
}
