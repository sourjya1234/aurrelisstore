export type Money = {
  /** Amount in major units (e.g. rupees, not paise). */
  amount: number;
  currencyCode: string;
};

export type ProductImage = {
  url: string;
  alt: string;
};

export type ProductVariant = {
  id: string;
  title: string;
  price: Money;
  available: boolean;
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  featured: boolean;
  images: ProductImage[];
  price: Money;
  compareAtPrice?: Money;
  variants: ProductVariant[];
};

export type CartLineInput = {
  handle: string;
  variantId: string;
  quantity: number;
};

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
};

/** What the client should do after a checkout request. */
export type CheckoutResult =
  | { type: "redirect"; url: string }
  | {
      type: "razorpay";
      keyId: string;
      razorpayOrderId: string;
      orderId: string;
      amount: number; // minor units (paise)
      currency: string;
      customer: Pick<Customer, "name" | "email" | "phone">;
    };

export type PricedLine = {
  product: Product;
  variant: ProductVariant;
  quantity: number;
};

export interface CommerceProvider {
  name: "mock" | "supabase" | "shopify";
  getProducts(): Promise<Product[]>;
  getProduct(handle: string): Promise<Product | undefined>;
  createCheckout(lines: PricedLine[], customer: Customer): Promise<CheckoutResult>;
}
