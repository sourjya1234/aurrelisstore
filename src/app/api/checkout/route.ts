import { getProvider, priceLines, type CartLineInput, type Customer } from "@/lib/commerce";

function isCustomer(c: unknown): c is Customer {
  if (!c || typeof c !== "object") return false;
  const x = c as Customer;
  const a = x.address;
  return (
    typeof x.name === "string" && x.name.trim().length > 0 &&
    typeof x.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.email) &&
    typeof x.phone === "string" &&
    !!a && typeof a === "object" &&
    [a.line1, a.city, a.state, a.postalCode, a.country].every((v) => typeof v === "string" && v.trim())
  );
}

export async function POST(request: Request) {
  let body: { lines?: CartLineInput[]; customer?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!Array.isArray(body.lines) || body.lines.length === 0 || body.lines.length > 50) {
    return Response.json({ error: "Your cart is empty" }, { status: 400 });
  }
  if (!isCustomer(body.customer)) {
    return Response.json({ error: "Please complete all required contact and shipping fields" }, { status: 400 });
  }

  try {
    const priced = await priceLines(body.lines);
    const result = await getProvider().createCheckout(priced, body.customer);
    return Response.json(result);
  } catch (err) {
    console.error("Checkout failed", err);
    const message = err instanceof Error ? err.message : "Checkout failed";
    // Don't leak configuration errors (missing env vars) to shoppers.
    const safe = message.startsWith("Missing required environment variable")
      ? "Checkout is not configured yet. Please try again later."
      : message;
    return Response.json({ error: safe }, { status: 422 });
  }
}
