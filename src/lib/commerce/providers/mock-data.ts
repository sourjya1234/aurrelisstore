import type { Product } from "../types";

const inr = (amount: number) => ({ amount, currencyCode: "INR" });

type Seed = {
  handle: string;
  title: string;
  category: string;
  description: string;
  price: number;
  compareAt?: number;
  featured?: boolean;
  tags?: string[];
  variants?: { title: string; price?: number; available?: boolean }[];
};

const seeds: Seed[] = [
  {
    handle: "lumen-solitaire-ring",
    title: "Lumen Solitaire Ring",
    category: "Rings",
    description:
      "A single brilliant-cut stone held in a slender four-prong setting of 18k gold vermeil. Quietly radiant, made for every day.",
    price: 4890,
    compareAt: 5990,
    featured: true,
    tags: ["bestseller"],
    variants: [{ title: "Size 6" }, { title: "Size 7" }, { title: "Size 8", available: false }],
  },
  {
    handle: "aurora-pearl-drops",
    title: "Aurora Pearl Drops",
    category: "Earrings",
    description:
      "Freshwater pearls suspended from fine gold hooks. Light enough to forget you're wearing them, luminous enough to be noticed.",
    price: 3290,
    featured: true,
  },
  {
    handle: "celeste-pendant-necklace",
    title: "Celeste Pendant Necklace",
    category: "Necklaces",
    description:
      "A crescent pendant on an adjustable 16–18\" cable chain. Hand-polished and finished with a protective e-coat.",
    price: 5490,
    featured: true,
    tags: ["new"],
    variants: [{ title: "Gold" }, { title: "Silver", price: 4990 }],
  },
  {
    handle: "halo-tennis-bracelet",
    title: "Halo Tennis Bracelet",
    category: "Bracelets",
    description:
      "A continuous line of hand-set stones in a flexible gold setting, closed with a secure box clasp.",
    price: 8990,
    compareAt: 10990,
    featured: true,
  },
  {
    handle: "vela-stacking-rings",
    title: "Vela Stacking Rings (Set of 3)",
    category: "Rings",
    description:
      "Three delicate bands — smooth, twisted and beaded — designed to be worn together or apart.",
    price: 2790,
    variants: [{ title: "Size 6" }, { title: "Size 7" }, { title: "Size 8" }],
  },
  {
    handle: "orla-huggie-hoops",
    title: "Orla Huggie Hoops",
    category: "Earrings",
    description: "Petite hoops that hug the lobe, with a hinged closure. An effortless everyday staple.",
    price: 1990,
    tags: ["bestseller"],
  },
  {
    handle: "selene-layered-chain",
    title: "Selene Layered Chain",
    category: "Necklaces",
    description: "Two pre-layered chains — a satellite and a paperclip — on a single clasp. No tangles.",
    price: 3990,
    tags: ["new"],
  },
  {
    handle: "iris-charm-bracelet",
    title: "Iris Charm Bracelet",
    category: "Bracelets",
    description: "A fine rolo chain with a single engraved iris charm. Adjustable from 6\" to 7.5\".",
    price: 2490,
  },
];

export const mockProducts: Product[] = seeds.map((s, i) => {
  const variants = (s.variants ?? [{ title: "Default" }]).map((v, j) => ({
    id: `mock-${i + 1}-${j + 1}`,
    title: v.title,
    price: inr(v.price ?? s.price),
    available: v.available ?? true,
  }));
  return {
    id: `mock-${i + 1}`,
    handle: s.handle,
    title: s.title,
    description: s.description,
    category: s.category,
    tags: s.tags ?? [],
    featured: s.featured ?? false,
    images: [
      { url: `/products/${s.handle}.svg`, alt: s.title },
    ],
    price: inr(Math.min(...variants.map((v) => v.price.amount))),
    compareAtPrice: s.compareAt ? inr(s.compareAt) : undefined,
    variants,
  };
});
