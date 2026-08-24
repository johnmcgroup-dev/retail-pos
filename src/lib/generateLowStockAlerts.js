import { base44 } from "@/api/base44Client";

// Client-side low-stock alert generator.
// The ideal home for this is a scheduled backend function (generateLowStockAlerts),
// which requires a Builder+ plan. Until then, this runs on load of an admin surface
// (e.g. Products) and reconciles Alert records against current stock vs reorder_level.
export async function generateLowStockAlerts({ companyId, products = [], inventory = [] }) {
  if (!companyId || !products.length) return { created: 0, resolved: 0 };

  const stockByProduct = {};
  (inventory || []).forEach((inv) => {
    stockByProduct[inv.product_id] = (stockByProduct[inv.product_id] || 0) + (inv.quantity || 0);
  });

  let existing = [];
  try {
    existing = await base44.entities.Alert.filter({ company_id: companyId });
  } catch (e) {
    return { created: 0, resolved: 0 };
  }

  // Dedup: one active low/out-of-stock alert per product (any state)
  const existingForProduct = new Set(
    existing
      .filter((a) => a.type === "low_stock" || a.type === "out_of_stock")
      .map((a) => a.product_id)
  );

  const toCreate = [];
  for (const p of products) {
    if (!p || existingForProduct.has(p.id)) continue;
    const reorder = p.reorder_level || 0;
    if (reorder <= 0) continue; // no threshold set — skip
    const qty = stockByProduct[p.id] || 0;
    if (qty <= 0) {
      toCreate.push({
        company_id: companyId,
        type: "out_of_stock",
        severity: "critical",
        product_id: p.id,
        product_name: p.name,
        title: `Out of Stock: ${p.name}`,
        message: `${p.name} is out of stock.`,
        current_stock: qty,
        reorder_level: reorder,
        is_read: false,
        is_dismissed: false,
      });
    } else if (qty <= reorder) {
      toCreate.push({
        company_id: companyId,
        type: "low_stock",
        severity: "warning",
        product_id: p.id,
        product_name: p.name,
        title: `Low Stock: ${p.name}`,
        message: `${p.name} is running low — ${qty} left (reorder at ${reorder}).`,
        current_stock: qty,
        reorder_level: reorder,
        is_read: false,
        is_dismissed: false,
      });
    }
  }

  // Auto-resolve alerts for products that have recovered above their reorder level
  const toResolve = existing
    .filter((a) => !a.is_dismissed && (a.type === "low_stock" || a.type === "out_of_stock"))
    .filter((a) => {
      const qty = stockByProduct[a.product_id] || 0;
      const p = products.find((x) => x.id === a.product_id);
      const reorder = p?.reorder_level || 0;
      return reorder > 0 && qty > reorder;
    })
    .map((a) => ({ id: a.id, is_dismissed: true }));

  let created = 0;
  let resolved = 0;

  try {
    if (toCreate.length) {
      await base44.entities.Alert.bulkCreate(toCreate);
      created = toCreate.length;
    }
  } catch (e) {
    console.error("generateLowStockAlerts: create failed", e);
  }
  try {
    if (toResolve.length) {
      await base44.entities.Alert.bulkUpdate(toResolve);
      resolved = toResolve.length;
    }
  } catch (e) {
    console.error("generateLowStockAlerts: resolve failed", e);
  }

  return { created, resolved };
}