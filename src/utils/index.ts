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

export function formatCurrency(amount: number | string, currencyCode: string = 'USD'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return `${currency.symbol}${parseFloat(String(amount || 0)).toFixed(2)}`;
}

export function getCurrencySymbol(currencyCode: string = 'USD'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return currency.symbol;
}

export function createPageUrl(pageName: string): string {
  return `/${pageName}`;
}