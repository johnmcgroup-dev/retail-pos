// Re-export offline cache utilities
export { offlineCache, CACHE_KEYS } from '../components/utils/offlineCache';

// Currency utilities — single source of truth in currencyStore
export { CURRENCIES, formatCurrency, getCurrencySymbol, setActiveCurrency, getActiveCurrency } from './currencyStore';

export function createPageUrl(pageName: string): string {
  return `/${pageName}`;
}

// Inventory alert generation
export async function generateInventoryAlerts(companyId: string, inventory: any[], products: any[], sales: any[]) {
  const alerts: any[] = [];
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  for (const inv of inventory) {
    const product = products.find((p: any) => p.id === inv.product_id);
    if (!product) continue;

    const reorderLevel = product.reorder_level || 10;

    // Low stock / out of stock
    if (inv.quantity === 0) {
      alerts.push({
        company_id: companyId,
        type: 'out_of_stock',
        severity: 'critical',
        product_id: product.id,
        product_name: product.name,
        title: 'Out of Stock',
        message: `${product.name} is out of stock.`,
        current_stock: inv.quantity,
        reorder_level: reorderLevel,
      });
    } else if (inv.quantity <= reorderLevel) {
      alerts.push({
        company_id: companyId,
        type: 'low_stock',
        severity: inv.quantity <= reorderLevel / 2 ? 'critical' : 'warning',
        product_id: product.id,
        product_name: product.name,
        title: 'Low Stock',
        message: `${product.name} has only ${inv.quantity} units remaining (reorder level: ${reorderLevel}).`,
        current_stock: inv.quantity,
        reorder_level: reorderLevel,
      });
    }

    // Expiring soon
    if (inv.expiration_date) {
      const expiryDate = new Date(inv.expiration_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry <= 30 && daysUntilExpiry >= 0) {
        alerts.push({
          company_id: companyId,
          type: 'expiring_soon',
          severity: daysUntilExpiry <= 7 ? 'critical' : 'warning',
          product_id: product.id,
          product_name: product.name,
          title: 'Expiring Soon',
          message: `${product.name} expires in ${daysUntilExpiry} day(s).`,
          days_until_expiry: daysUntilExpiry,
        });
      }
    }
  }

  return alerts;
}

export async function createAlertsIfNeeded(alerts: any[]) {
  // Dynamically import base44 to avoid circular dependencies
  const { base44 } = await import('@/api/base44Client');
  // De-duplicate against already-active (non-dismissed) alerts so we never
  // spam the notification center with repeat alerts for the same product + type.
  let existing: any[] = [];
  try {
    existing = await base44.entities.Alert.filter({ is_dismissed: false });
  } catch (_) {}
  const keyOf = (a: any) => `${a.company_id}|${a.product_id || ''}|${a.type}`;
  const existingKeys = new Set(existing.map(keyOf));
  let created = 0;
  for (const alert of alerts) {
    if (existingKeys.has(keyOf(alert))) continue;
    try {
      await base44.entities.Alert.create({ ...alert, is_read: false, is_dismissed: false });
      existingKeys.add(keyOf(alert));
      created++;
    } catch (e) {
      // Ignore failed alert creation
    }
  }
  return created;
}