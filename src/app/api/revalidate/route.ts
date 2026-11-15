import { revalidateTag } from "next/cache";
import { PRODUCTS_TAG } from "@/lib/commerce";

/**
 * Webhook target for catalog changes (Shopify product webhooks, a Supabase
 * database webhook, etc). Call with `Authorization: Bearer $REVALIDATE_SECRET`.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  revalidateTag(PRODUCTS_TAG, "max");
  return Response.json({ revalidated: true });
}
