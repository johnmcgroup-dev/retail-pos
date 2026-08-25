// Shared variety configuration and helpers for POS + product editing.
// Each variety on a product stores { price, quantity } where quantity is the
// number of base pieces that one unit of the variety represents (used to deduct
// piece-based inventory). Legacy products may store a plain number (price only);
// the helpers below read both formats.

export const VARIETIES = ["Pieces", "Roll", "Bundle", "Dozen", "Packet", "Carton"];

export const DEFAULT_VARIETY_QTY = {
  Pieces: 1,
  Roll: 1,
  Bundle: 1,
  Dozen: 12,
  Packet: 1,
  Carton: 12,
};

export function getVarietyPrice(product, variety) {
  if (!product) return null;
  if (variety === "Pieces") return product.selling_price ?? null;
  const v = product.varieties?.[variety];
  if (v == null) return null;
  if (typeof v === "number") return v;
  return v.price ?? null;
}

export function getVarietyQuantity(product, variety) {
  if (!product) return DEFAULT_VARIETY_QTY[variety] ?? 1;
  if (variety === "Pieces") return 1;
  const v = product.varieties?.[variety];
  if (v == null) return DEFAULT_VARIETY_QTY[variety] ?? 1;
  if (typeof v === "number") return DEFAULT_VARIETY_QTY[variety] ?? 1;
  return v.quantity ?? DEFAULT_VARIETY_QTY[variety] ?? 1;
}