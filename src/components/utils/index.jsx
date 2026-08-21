// Re-export all utilities
export * from './offlineCache';

// Currency utilities — shared single source of truth (keeps active-currency state in one module)
export { CURRENCIES, formatCurrency, getCurrencySymbol, setActiveCurrency } from '../../utils/currencyStore';

// Page URL utility
export function createPageUrl(pageName) {
  return `/${pageName}`;
}