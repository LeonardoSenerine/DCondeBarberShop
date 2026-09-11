import type { Product } from "@/hooks/useCatalog";

/** A promo counts only while it has a percentage and today falls within its start/end dates. */
export function isOnSale(p: Pick<Product, "sale_percent" | "sale_from" | "sale_until">): boolean {
  if (!p.sale_percent || p.sale_percent <= 0) return false;
  const today = new Date().toISOString().slice(0, 10);
  if (p.sale_from && p.sale_from > today) return false;
  if (p.sale_until && p.sale_until < today) return false;
  return true;
}

/** Price the customer actually pays, after any active promo. */
export function effectivePriceCents(
  p: Pick<Product, "price_cents" | "sale_percent" | "sale_from" | "sale_until">,
): number {
  if (!isOnSale(p)) return p.price_cents;
  return Math.round(p.price_cents * (1 - p.sale_percent / 100));
}
