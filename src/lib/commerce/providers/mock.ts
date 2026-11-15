import type { CommerceProvider } from "../types";
import { mockProducts } from "./mock-data";

/** Local catalog with a simulated checkout. Used when COMMERCE_PROVIDER is unset or "mock". */
export const mockProvider: CommerceProvider = {
  name: "mock",
  async getProducts() {
    return mockProducts;
  },
  async getProduct(handle) {
    return mockProducts.find((p) => p.handle === handle);
  },
  async createCheckout() {
    const orderId = `AUR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    return { type: "redirect", url: `/checkout/success?order=${orderId}` };
  },
};
