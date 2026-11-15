import type { Money } from "./commerce/types";

export function formatMoney({ amount, currencyCode }: Money) {
  return new Intl.NumberFormat(currencyCode === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
