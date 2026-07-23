import { useState, useEffect, useCallback } from "react";

const CACHE_KEY = "currency_rates_cache";
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

/**
 * Detects the user's local currency via IP geolocation and fetches
 * live exchange rates from a free API (open.er-api.com, no key needed).
 */
export function useCurrency() {
  const [detectedCountry, setDetectedCountry] = useState(null);
  const [detectedCountryCode, setDetectedCountryCode] = useState(null);
  const [detectedCurrency, setDetectedCurrency] = useState(null);
  const [rates, setRates] = useState({});
  const [baseCurrency, setBaseCurrency] = useState("USD");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Try cached rates first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Date.now() - parsed.timestamp < CACHE_TTL) {
            setRates(parsed.rates);
            setBaseCurrency(parsed.base || "USD");
            setLastUpdated(new Date(parsed.timestamp));
          }
        }

        // Detect location via IP (works in any country)
        try {
          const locRes = await fetch("https://ipapi.co/json/");
          if (locRes.ok) {
            const locData = await locRes.json();
            if (locData && !locData.error) {
              setDetectedCountry(locData.country_name);
              setDetectedCountryCode(locData.country_code);
              if (locData.currency) {
                setDetectedCurrency(locData.currency);
              }
            }
          }
        } catch (_) {
          // IP detection is best-effort — don't block rates
        }

        // Fetch live exchange rates (free, no API key)
        const ratesRes = await fetch("https://open.er-api.com/v6/latest/USD");
        if (ratesRes.ok) {
          const ratesData = await ratesRes.json();
          if (ratesData && ratesData.rates) {
            setRates(ratesData.rates);
            setBaseCurrency(ratesData.base_code || "USD");
            setLastUpdated(new Date());
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              rates: ratesData.rates,
              base: ratesData.base_code || "USD",
              timestamp: Date.now(),
            }));
          }
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  /**
   * Convert an amount from one currency to another using live rates.
   * Returns null if rates aren't loaded yet.
   */
  const convert = useCallback((amount, from, to) => {
    if (!rates[from] || !rates[to]) return null;
    // Convert: from -> USD (base) -> to
    const inUSD = amount / rates[from];
    return inUSD * rates[to];
  }, [rates]);

  /**
   * Get the exchange rate for a currency pair (1 unit of `from` in `to`).
   */
  const getRate = useCallback((from, to) => {
    if (!rates[from] || !rates[to]) return null;
    return (1 / rates[from]) * rates[to];
  }, [rates]);

  return {
    detectedCountry,
    detectedCountryCode,
    detectedCurrency,
    rates,
    baseCurrency,
    loading,
    error,
    lastUpdated,
    convert,
    getRate,
  };
}