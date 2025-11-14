// Re-export all utilities
export * from './offlineCache';

// Currency utilities
export const CURRENCIES = {
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
};

export function formatCurrency(amount, currencyCode = 'USD') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return `${currency.symbol}${parseFloat(amount || 0).toFixed(2)}`;
}

export function getCurrencySymbol(currencyCode = 'USD') {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  return currency.symbol;
}

// Page URL utility
export function createPageUrl(pageName) {
  return `/${pageName}`;
}