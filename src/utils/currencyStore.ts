// Single source of truth for currency display across the app.
// Expanded to cover major world currencies so the app is usable everywhere.

export const CURRENCIES: Record<string, { name: string; symbol: string; code: string }> = {
  // North & South America
  USD: { name: "US Dollar", symbol: "$", code: "USD" },
  CAD: { name: "Canadian Dollar", symbol: "C$", code: "CAD" },
  MXN: { name: "Mexican Peso", symbol: "$", code: "MXN" },
  BRL: { name: "Brazilian Real", symbol: "R$", code: "BRL" },
  ARS: { name: "Argentine Peso", symbol: "$", code: "ARS" },
  COP: { name: "Colombian Peso", symbol: "$", code: "COP" },
  CLP: { name: "Chilean Peso", symbol: "$", code: "CLP" },
  PEN: { name: "Peruvian Sol", symbol: "S/", code: "PEN" },
  // Europe
  EUR: { name: "Euro", symbol: "€", code: "EUR" },
  GBP: { name: "British Pound", symbol: "£", code: "GBP" },
  CHF: { name: "Swiss Franc", symbol: "CHF", code: "CHF" },
  SEK: { name: "Swedish Krona", symbol: "kr", code: "SEK" },
  NOK: { name: "Norwegian Krone", symbol: "kr", code: "NOK" },
  DKK: { name: "Danish Krone", symbol: "kr", code: "DKK" },
  PLN: { name: "Polish Zloty", symbol: "zł", code: "PLN" },
  CZK: { name: "Czech Koruna", symbol: "Kč", code: "CZK" },
  HUF: { name: "Hungarian Forint", symbol: "Ft", code: "HUF" },
  RON: { name: "Romanian Leu", symbol: "lei", code: "RON" },
  RUB: { name: "Russian Ruble", symbol: "₽", code: "RUB" },
  UAH: { name: "Ukrainian Hryvnia", symbol: "₴", code: "UAH" },
  TRY: { name: "Turkish Lira", symbol: "₺", code: "TRY" },
  // Africa
  NGN: { name: "Nigerian Naira", symbol: "₦", code: "NGN" },
  ZAR: { name: "South African Rand", symbol: "R", code: "ZAR" },
  KES: { name: "Kenyan Shilling", symbol: "KSh", code: "KES" },
  GHS: { name: "Ghanaian Cedi", symbol: "₵", code: "GHS" },
  EGP: { name: "Egyptian Pound", symbol: "E£", code: "EGP" },
  MAD: { name: "Moroccan Dirham", symbol: "DH", code: "MAD" },
  ETB: { name: "Ethiopian Birr", symbol: "Br", code: "ETB" },
  TZS: { name: "Tanzanian Shilling", symbol: "TSh", code: "TZS" },
  UGX: { name: "Ugandan Shilling", symbol: "USh", code: "UGX" },
  RWF: { name: "Rwandan Franc", symbol: "Rf", code: "RWF" },
  XOF: { name: "West African CFA Franc", symbol: "CFA", code: "XOF" },
  XAF: { name: "Central African CFA Franc", symbol: "FCFA", code: "XAF" },
  // Middle East
  SAR: { name: "Saudi Riyal", symbol: "﷼", code: "SAR" },
  AED: { name: "UAE Dirham", symbol: "د.إ", code: "AED" },
  QAR: { name: "Qatari Riyal", symbol: "﷼", code: "QAR" },
  KWD: { name: "Kuwaiti Dinar", symbol: "د.ك", code: "KWD" },
  ILS: { name: "Israeli Shekel", symbol: "₪", code: "ILS" },
  // Asia & Pacific
  JPY: { name: "Japanese Yen", symbol: "¥", code: "JPY" },
  CNY: { name: "Chinese Yuan", symbol: "¥", code: "CNY" },
  INR: { name: "Indian Rupee", symbol: "₹", code: "INR" },
  PKR: { name: "Pakistani Rupee", symbol: "₨", code: "PKR" },
  BDT: { name: "Bangladeshi Taka", symbol: "৳", code: "BDT" },
  LKR: { name: "Sri Lankan Rupee", symbol: "₨", code: "LKR" },
  IDR: { name: "Indonesian Rupiah", symbol: "Rp", code: "IDR" },
  MYR: { name: "Malaysian Ringgit", symbol: "RM", code: "MYR" },
  THB: { name: "Thai Baht", symbol: "฿", code: "THB" },
  VND: { name: "Vietnamese Dong", symbol: "₫", code: "VND" },
  PHP: { name: "Philippine Peso", symbol: "₱", code: "PHP" },
  KRW: { name: "South Korean Won", symbol: "₩", code: "KRW" },
  SGD: { name: "Singapore Dollar", symbol: "S$", code: "SGD" },
  HKD: { name: "Hong Kong Dollar", symbol: "HK$", code: "HKD" },
  AUD: { name: "Australian Dollar", symbol: "A$", code: "AUD" },
  NZD: { name: "New Zealand Dollar", symbol: "NZ$", code: "NZD" },
  GEL: { name: "Georgian Lari", symbol: "₾", code: "GEL" },
};

// Active display currency is set once from the company record (see Layout/Settings).
let activeCurrency = "NGN";
let activeShowSymbol = true;

export function setActiveCurrency(code?: string, showSymbol?: boolean) {
  if (code) activeCurrency = code;
  if (showSymbol !== undefined) activeShowSymbol = showSymbol;
}

export function getActiveCurrency(): string {
  return activeCurrency;
}

export function formatCurrency(
  amount: number | string | null | undefined,
  currencyCode?: string,
  showSymbol?: boolean
): string {
  const code = currencyCode || activeCurrency || "NGN";
  const useSymbol = showSymbol !== undefined ? showSymbol : activeShowSymbol;
  const num = parseFloat(String(amount ?? 0));
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (!useSymbol) return formatted;
  const symbol = (CURRENCIES[code] && CURRENCIES[code].symbol) || code;
  return `${symbol}${formatted}`;
}

export function getCurrencySymbol(currencyCode?: string): string {
  const code = currencyCode || activeCurrency || "NGN";
  return (CURRENCIES[code] && CURRENCIES[code].symbol) || code;
}