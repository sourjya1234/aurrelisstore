import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireEnv } from "@/lib/commerce/env";
import { rest } from "@/lib/supabase-rest";

/**
 * Dashboard sessions: a signed, httpOnly cookie holding the user's email and expiry.
 *
 * Who may sign in mirrors the database's `is_crm()` rule: an active row in
 * `app_users` with `crm_access = true` or `role = 'owner'`. The password is a
 * shared secret (DASHBOARD_PASSWORD); the cookie is signed with
 * DASHBOARD_SESSION_SECRET.
 */

const COOKIE = "aurrelis_dash";
const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

export type DashboardUser = { email: string; name: string | null; role: string };

type AppUserRow = { email: string; name: string | null; role: string | null; active: boolean; crm_access: boolean };

function sign(payload: string) {
  return createHmac("sha256", requireEnv("DASHBOARD_SESSION_SECRET")).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Looks up a CRM-enabled user by email (case-insensitive). */
export async function findCrmUser(email: string): Promise<DashboardUser | undefined> {
  const wanted = email.trim().toLowerCase();
  const users = await rest<AppUserRow[]>("app_users?select=email,name,role,active,crm_access", {
    serviceRole: true,
    cache: "no-store",
  });
  const u = users.find((row) => row.email?.toLowerCase() === wanted);
  if (!u || !u.active || !(u.crm_access || u.role === "owner")) return undefined;
  return { email: wanted, name: u.name, role: u.role ?? "staff" };
}

export function checkPassword(password: string) {
  const a = createHmac("sha256", "pw").update(password).digest("hex");
  const b = createHmac("sha256", "pw").update(requireEnv("DASHBOARD_PASSWORD")).digest("hex");
  return safeEqual(a, b);
}

export async function startSession(email: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = Buffer.from(JSON.stringify({ email, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/dashboard",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession() {
  (await cookies()).delete({ name: COOKIE, path: "/dashboard" });
}

async function readSessionEmail(): Promise<string | undefined> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return undefined;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sign(payload), sig)) return undefined;
  try {
    const { email, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { email: string; exp: number };
    if (typeof email !== "string" || typeof exp !== "number" || exp * 1000 < Date.now()) return undefined;
    return email;
  } catch {
    return undefined;
  }
}

/**
 * Returns the signed-in dashboard user or redirects to the login page.
 * Re-checks app_users on every request so revoking access takes effect immediately.
 */
export async function requireDashboardUser(): Promise<DashboardUser> {
  // Session checks compare against the current time, so they must run per request.
  await connection();
  const email = await readSessionEmail();
  const user = email ? await findCrmUser(email) : undefined;
  if (!user) redirect("/dashboard/login");
  return user;
}
