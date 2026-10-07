// Shared variety configuration and helpers for POS + product editing.
// Each variety on a product stores { price, quantity } where quantity is the
// number of base pieces that one unit of the variety represents (used to deduct
// piece-based inventory). Legacy products may store a plain number (price only);
// the helpers below read both formats.
//
// Half varieties (Half-Roll, Half-Bundle, Half-Dozen, Half-Packet, Half-Carton)
// are never set up by hand: their price and quantity default to exactly half of
// their parent variety. A half variety only stores the fields the user has
// manually overridden, so any field that is still untouched keeps following its
// parent. Clearing the stored entry (the "Reset to half" action) hands the field
// back to the auto-calculation.

export const VARIETIES = ["Pieces", "Roll", "Bundle", "Dozen", "Packet", "Carton"];

export const DEFAULT_VARIETY_QTY = {
  Pieces: 1,
  Roll: 1,
  Bundle: 1,
  Dozen: 12,
  Packet: 1,
  Carton: 12,
};

// parent variety -> its half variety ("Pieces" is already the smallest unit)
export const HALF_VARIETY_OF = {
  Roll: "Half-Roll",
  Bundle: "Half-Bundle",
  Dozen: "Half-Dozen",
  Packet: "Half-Packet",
  Carton: "Half-Carton",
};

export const HALF_VARIETIES = Object.values(HALF_VARIETY_OF);

// Every variety in display order, each half sitting directly under its parent
export const VARIETY_OPTIONS = VARIETIES.flatMap((v) =>
  HALF_VARIETY_OF[v] ? [v, HALF_VARIETY_OF[v]] : [v]
);

export const isHalfVariety = (variety) => HALF_VARIETIES.includes(variety);

export const halfVarietyParent = (variety) =>
  Object.keys(HALF_VARIETY_OF).find((parent) => HALF_VARIETY_OF[parent] === variety) || null;

// Prices keep 2 decimals; quantities stay whole numbers like the existing Qty fields
export const roundPrice = (value) => Math.round(value * 100) / 100;
export const halfQuantity = (value) => Math.max(1, Math.round(value / 2));

// What a product stores for one variety, normalised to an object.
// Legacy plain-number entries become { price }. Returns null when not set.
export function getStoredVariety(product, variety) {
  const stored = product?.varieties?.[variety];
  if (stored == null) return null;
  return typeof stored === "number" ? { price: stored } : stored;
}

// Half of the parent's CURRENT values, ignoring any manual override on the half
export function getHalfVarietyDefaults(product, halfVariety) {
  const parent = halfVarietyParent(halfVariety);
  const parentPrice = parent ? getVarietyPrice(product, parent) : null;
  const parentQty = parent ? getVarietyQuantity(product, parent) : 1;
  return {
    price: parentPrice == null ? null : roundPrice(parentPrice / 2),
    quantity: halfQuantity(parentQty),
  };
}

export function getVarietyPrice(product, variety) {
  if (!product) return null;
  if (variety === "Pieces") return product.selling_price ?? null;
  if (isHalfVariety(variety)) {
    const stored = getStoredVariety(product, variety);
    if (stored?.price != null) return stored.price;
    return getHalfVarietyDefaults(product, variety).price;
  }
  const v = product.varieties?.[variety];
  if (v == null) return null;
  if (typeof v === "number") return v;
  return v.price ?? null;
}

export function getVarietyQuantity(product, variety) {
  if (isHalfVariety(variety)) {
    const stored = getStoredVariety(product, variety);
    if (stored?.quantity != null) return stored.quantity;
    return getHalfVarietyDefaults(product, variety).quantity;
  }
  if (!product) return DEFAULT_VARIETY_QTY[variety] ?? 1;
  if (variety === "Pieces") return 1;
  const v = product.varieties?.[variety];
  if (v == null) return DEFAULT_VARIETY_QTY[variety] ?? 1;
  if (typeof v === "number") return DEFAULT_VARIETY_QTY[variety] ?? 1;
  return v.quantity ?? DEFAULT_VARIETY_QTY[variety] ?? 1;
}

// Build the product's varieties map after saving a half variety.
// Only fields that differ from the auto-calculated half are stored as overrides,
// so saving an unchanged half leaves it following its parent. Returns the map to
// write (the half key is removed entirely when nothing is overridden).
export function withHalfVarietyOverride(product, halfVariety, { price, quantity }) {
  const defaults = getHalfVarietyDefaults(product, halfVariety);
  const override = {};
  if (price != null && price !== defaults.price) override.price = price;
  if (quantity != null && quantity !== defaults.quantity) override.quantity = quantity;

  const varieties = { ...(product?.varieties || {}) };
  if (Object.keys(override).length > 0) varieties[halfVariety] = override;
  else delete varieties[halfVariety];
  return varieties;
}