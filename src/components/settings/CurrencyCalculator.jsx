import React, { useState, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calculator, Globe, ArrowRight, RefreshCw, MapPin, TrendingUp } from "lucide-react";
import { CURRENCIES } from "@/utils";
import DrawerSelect from "@/components/shared/DrawerSelect";

const QUICK_AMOUNTS = [100, 500, 1000, 5000, 10000, 50000];

export default function CurrencyCalculator() {
  const { detectedCountry, detectedCurrency, rates, loading, convert, getRate, lastUpdated } = useCurrency();
  const [amount, setAmount] = useState(100);
  const [fromCurrency, setFromCurrency] = useState(detectedCurrency || "USD");
  const [toCurrency, setToCurrency] = useState("NGN");

  // Auto-set "from" when detection completes
  React.useEffect(() => {
    if (detectedCurrency && fromCurrency === "USD") {
      setFromCurrency(detectedCurrency);
    }
  }, [detectedCurrency]);

  const result = useMemo(() => {
    const val = parseFloat(amount);
    if (isNaN(val)) return null;
    return convert(val, fromCurrency, toCurrency);
  }, [amount, fromCurrency, toCurrency, convert]);

  const rate = useMemo(() => getRate(fromCurrency, toCurrency), [fromCurrency, toCurrency, getRate]);

  const handleSwap = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const popularCurrencies = ["USD", "EUR", "GBP", "NGN", "GHS", "KES", "ZAR", "CAD", "AUD", "JPY"];

  return (
    <div className="space-y-4">
      {/* Auto-detected location banner */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-900">Auto-Detected Location</p>
          <p className="text-xs text-blue-700">
            {loading ? "Detecting your location…" : detectedCountry ? (
              <>Detected: <strong>{detectedCountry}</strong> → Local currency: <strong>{detectedCurrency}</strong></>
            ) : "Could not detect location — you can set currency manually."}
          </p>
        </div>
        {detectedCurrency && (
          <Badge className="bg-blue-600 text-white">{detectedCurrency}</Badge>
        )}
      </div>

      {/* Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-600" />
            Currency Calculator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* From */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Amount</label>
                <Input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="mt-1 text-lg font-semibold"
                  placeholder="0.00"
                />
                <DrawerSelect
                  value={fromCurrency}
                  onValueChange={setFromCurrency}
                  options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.symbol} ${code} — ${c.name}` }))}
                  triggerClassName="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  label="From Currency"
                />
              </div>

              {/* Swap button */}
              <Button
                variant="outline"
                size="icon"
                onClick={handleSwap}
                className="mb-1 rounded-full"
                title="Swap currencies"
              >
                <ArrowRight className="w-4 h-4 rotate-90 md:rotate-0" />
              </Button>

              {/* To */}
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase">Converted</label>
                <div className="mt-1 px-3 py-2 border border-slate-300 rounded-md bg-slate-50 text-lg font-bold text-slate-900 min-h-[38px] flex items-center">
                  {result !== null ? (
                    <>
                      {CURRENCIES[toCurrency]?.symbol || ""}
                      {result.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </>
                  ) : (
                    <span className="text-slate-400 text-sm">—</span>
                  )}
                </div>
                <DrawerSelect
                  value={toCurrency}
                  onValueChange={setToCurrency}
                  options={Object.entries(CURRENCIES).map(([code, c]) => ({ value: code, label: `${c.symbol} ${code} — ${c.name}` }))}
                  triggerClassName="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md text-sm"
                  label="To Currency"
                />
              </div>
            </div>

            {/* Exchange rate display */}
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <span className="text-sm text-slate-600">
                  1 {fromCurrency} = {rate !== null ? rate.toFixed(4) : "—"} {toCurrency}
                </span>
              </div>
              {lastUpdated && (
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  Updated {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </div>

            {/* Quick amounts */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Quick Amounts</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    onClick={() => setAmount(amt)}
                    className="text-xs"
                  >
                    {CURRENCIES[fromCurrency]?.symbol || ""}{amt.toLocaleString()}
                  </Button>
                ))}
              </div>
            </div>

            {/* Popular currency quick-switch */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-2">Popular Currencies</p>
              <div className="flex flex-wrap gap-2">
                {popularCurrencies.map(code => (
                  <button
                    key={code}
                    onClick={() => setToCurrency(code)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                      toCurrency === code
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {CURRENCIES[code]?.symbol || ""} {code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live rates table for popular pairs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-indigo-600" />
            Live Exchange Rates
            <Badge variant="outline" className="ml-auto text-xs">
              Base: USD
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !Object.keys(rates).length ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {popularCurrencies.filter(c => c !== "USD").map(code => (
                <div key={code} className="p-3 border rounded-lg hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-900">{code}</span>
                    <span className="text-xs text-slate-400">{CURRENCIES[code]?.name || ""}</span>
                  </div>
                  <p className="text-lg font-bold text-slate-900 mt-1">
                    {rates[code] ? rates[code].toFixed(4) : "—"}
                  </p>
                  <p className="text-xs text-slate-400">per 1 USD</p>
                </div>
              ))}
            </div>
          )}
          {lastUpdated && (
            <p className="text-xs text-slate-400 mt-3">
              Rates last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}