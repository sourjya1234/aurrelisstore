import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-24">
      <p className="eyebrow">Aurrelis Ops</p>
      <h1 className="mt-2 font-serif text-4xl">Sign in</h1>
      <p className="mt-3 text-sm text-muted">For team members with CRM access in Aurrelis Ops.</p>
      <LoginForm />
    </div>
  );
}
