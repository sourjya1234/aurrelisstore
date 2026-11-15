"use client";

import { useSyncExternalStore } from "react";
import type { Money } from "./commerce/types";

export type CartLine = {
  handle: string;
  variantId: string;
  title: string;
  variantTitle: string;
  price: Money;
  image?: string;
  quantity: number;
};

const STORAGE_KEY = "aurrelis-cart-v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) lines = JSON.parse(raw);
  } catch {
    lines = EMPTY;
  }
}

function commit(next: CartLine[]) {
  lines = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode etc.) — the cart still works for this tab.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    try {
      lines = e.newValue ? JSON.parse(e.newValue) : EMPTY;
    } catch {
      lines = EMPTY;
    }
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  load();
  return lines;
}

export const cart = {
  add(line: Omit<CartLine, "quantity">, quantity = 1) {
    load();
    const existing = lines.find((l) => l.variantId === line.variantId);
    commit(
      existing
        ? lines.map((l) =>
            l.variantId === line.variantId ? { ...l, quantity: Math.min(20, l.quantity + quantity) } : l,
          )
        : [...lines, { ...line, quantity }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    load();
    commit(
      quantity <= 0
        ? lines.filter((l) => l.variantId !== variantId)
        : lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(20, quantity) } : l)),
    );
  },
  remove(variantId: string) {
    cart.setQuantity(variantId, 0);
  },
  clear() {
    commit(EMPTY);
  },
};

export function useCart() {
  const current = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const count = current.reduce((n, l) => n + l.quantity, 0);
  const subtotal: Money = {
    amount: current.reduce((sum, l) => sum + l.price.amount * l.quantity, 0),
    currencyCode: current[0]?.price.currencyCode ?? "INR",
  };
  return { lines: current, count, subtotal };
}
