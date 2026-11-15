import type { Product } from "../types";

/**
 * Demo catalog for COMMERCE_PROVIDER=mock. Mirrors the shape of the live
 * Aurrelis Ops catalog (mood-based 20 ml perfumes) so the site looks the same
 * without Supabase configured.
 */

const inr = (amount: number) => ({ amount, currencyCode: "INR" });

type Seed = {
  handle: string;
  title: string;
  mood: "Warm" | "Bright" | "Grounded" | "Soft";
  description: string;
  notes: [top: string, heart: string, base: string];
  accent: string;
  price: number;
  stock: number;
};

const seeds: Seed[] = [
  { handle: "date-night", title: "Date Night", mood: "Warm", description: "For the evening you want to linger a little longer.", notes: ["Rose", "Amber", "Smoke"], accent: "#b5563f", price: 899, stock: 50 },
  { handle: "lust", title: "Lust", mood: "Warm", description: "Deep and close to skin, for the people nearest to you.", notes: ["Oud", "Vanilla", "Spice"], accent: "#5a1f2b", price: 999, stock: 50 },
  { handle: "calm", title: "Calm", mood: "Soft", description: "A quiet pause for the end of a loud day.", notes: ["Lavender", "Cedar", "Vetiver"], accent: "#6f80a8", price: 749, stock: 50 },
  { handle: "confidence", title: "Confidence", mood: "Grounded", description: "Clean and steady, for the meeting you are ready for.", notes: ["Bergamot", "Vetiver", "Leather"], accent: "#4f6b4a", price: 899, stock: 50 },
  { handle: "focus", title: "Focus", mood: "Bright", description: "Clear and sharp when the work needs your full attention.", notes: ["Peppermint", "Basil", "Cedarwood"], accent: "#5fa595", price: 799, stock: 20 },
  { handle: "abundance", title: "Abundance", mood: "Bright", description: "Warm and generous, for the year you are building.", notes: ["Mandarin", "Neroli", "Amber"], accent: "#e0a93a", price: 899, stock: 20 },
  { handle: "sleep", title: "Sleep", mood: "Soft", description: "A soft, slow scent for the hours before you rest.", notes: ["Lavender", "Chamomile", "Vanilla"], accent: "#3f4f7a", price: 849, stock: 0 },
  { handle: "protection", title: "Protection", mood: "Grounded", description: "A grounding layer for days you feel exposed.", notes: ["Sandalwood", "Patchouli", "Earth"], accent: "#8a6a4a", price: 849, stock: 20 },
];

export const mockProducts: Product[] = seeds.map((s, i) => ({
  id: `mock-${i + 1}`,
  handle: s.handle,
  title: s.title,
  description: s.description,
  category: s.mood,
  tags: [s.mood.toLowerCase(), s.stock > 0 ? "in-stock" : "sold-out"],
  featured: s.stock > 0,
  images: [],
  accentColor: s.accent,
  price: inr(s.price),
  variants: [
    {
      id: `mock-${i + 1}-20ml`,
      title: "20 ml",
      price: inr(s.price),
      available: s.stock > 0,
      sku: `${s.handle.toUpperCase()}-20ML`,
      inventory: s.stock,
    },
  ],
  details: [`Top: ${s.notes[0]}`, `Heart: ${s.notes[1]}`, `Base: ${s.notes[2]}`],
}));
