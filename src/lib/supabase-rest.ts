import "server-only";
import { requireEnv } from "./commerce/env";

/**
 * Minimal Supabase PostgREST client (no SDK needed).
 *
 * `serviceRole: true` uses SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
 * Only use it from server code (route handlers, server components, actions).
 */
export type RestInit = RequestInit & { serviceRole?: boolean };

function restUrl(path: string) {
  return `${requireEnv("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`;
}

function headersFor(init: RestInit) {
  const key = init.serviceRole
    ? requireEnv("SUPABASE_SERVICE_ROLE_KEY")
    : requireEnv("SUPABASE_ANON_KEY");
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    ...init.headers,
  };
}

export async function rest<T>(path: string, init: RestInit = {}): Promise<T> {
  const { serviceRole, ...rest } = init;
  void serviceRole;
  const res = await fetch(restUrl(path), { ...rest, headers: headersFor(init) });
  if (!res.ok) {
    throw new Error(`Supabase request failed (${res.status}): ${await res.text()}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/**
 * Fetches every row of a query, paging past PostgREST's max-rows limit.
 * `path` must include an `order=` so pages are stable.
 */
export async function restAll<T>(path: string, init: RestInit = {}, pageSize = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await rest<T[]>(path, {
      ...init,
      headers: { ...init.headers, Range: `${from}-${from + pageSize - 1}`, "Range-Unit": "items" },
    });
    out.push(...page);
    if (page.length < pageSize) return out;
  }
}
