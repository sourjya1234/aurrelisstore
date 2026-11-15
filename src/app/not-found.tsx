import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-serif text-5xl">This page has drifted off.</h1>
      <Link href="/products" className="btn mt-10">Back to the collection</Link>
    </div>
  );
}
