// Re-export offline cache utilities
export { offlineCache, CACHE_KEYS } from '../components/utils/offlineCache';

// Currency definitions
export const CURRENCIES: Record<string, { name: string; symbol: string; code: string }> = {
  USD: { name: 'US Dollar', symbol: '$', code: 'USD' },
  EUR: { name: 'Euro', symbol: '€', code: 'EUR' },
  GBP: { name: 'British Pound', symbol: '£', code: 'GBP' },
  JPY: { name: 'Japanese Yen', symbol: '¥', code: 'JPY' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', code: 'CNY' },
  INR: { name: 'Indian Rupee', symbol: '₹', code: 'INR' },
  NGN: { name: 'Nigerian Naira', symbol: '₦', code: 'NGN' },
  ZAR: { name: 'South African Rand', symbol: 'R', code: 'ZAR' },
  KES: { name: 'Kenyan Shilling', symbol: 'KSh', code: 'KES' },
  GHS: { name: 'Ghanaian Cedi', symbol: '₵', code: 'GHS' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', code: 'CAD' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', code: 'AUD' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', code: 'BRL' },
  MXN: { name: 'Mexican Peso', symbol: '$', code: 'MXN' },
  EGP: { name: 'Egyptian Pound', symbol: '£', code: 'EGP' },
};

export function formatCurrency(amount: number | string, currencyCode: string = 'USD', showSymbol: boolean = false): string {
  const num = parseFloat(String(amount || 0)).toFixed(2);
  if (!showSymbol) return num;
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return `${currency.symbol}${num}`;
}

export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return currency.symbol;
}

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
  for (const alert of alerts) {
    try {
      await base44.entities.Alert.create({ ...alert, is_read: false, is_dismissed: false });
    } catch (e) {
      // Ignore duplicate or failed alerts
    }
  }
}