import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Aurrelis Ops" },
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white">
      <header className="border-b border-line bg-ivory">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="font-serif text-xl tracking-[0.3em] uppercase">
            Aurrelis <span className="text-gold-dark">Ops</span>
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            View store ↗
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
