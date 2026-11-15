import "server-only";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export type ProviderName = "mock" | "supabase" | "shopify";

export function providerName(): ProviderName {
  const value = (process.env.COMMERCE_PROVIDER ?? "mock").toLowerCase();
  if (value === "supabase" || value === "shopify" || value === "mock") return value;
  throw new Error(`Unknown COMMERCE_PROVIDER "${value}". Use mock, supabase or shopify.`);
}
