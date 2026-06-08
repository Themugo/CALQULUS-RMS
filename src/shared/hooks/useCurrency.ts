import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";

export const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]["code"];

export function useCurrency() {
  const { user } = useAuth();
  const [currency, setCurrencyState] = useState<CurrencyCode>("KES");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrency = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("currency")
        .eq("id", user.id)
        .maybeSingle();

      if (data?.currency) {
        setCurrencyState(data.currency as CurrencyCode);
      }
      setLoading(false);
    };

    fetchCurrency();
  }, [user]);

  const setCurrency = async (value: CurrencyCode) => {
    setCurrencyState(value);
    if (user) {
      await supabase
        .from("profiles")
        .update({ currency: value })
        .eq("id", user.id);
    }
  };

  const formatCurrency = (amount: number, options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: options?.minimumFractionDigits ?? 0,
      maximumFractionDigits: options?.maximumFractionDigits ?? 0,
    }).format(amount);
  };

  const formatCurrencyCompact = (value: number) => {
    if (value >= 1000) {
      const symbol = CURRENCIES.find(c => c.code === currency)?.symbol || "$";
      return `${symbol}${(value / 1000).toFixed(0)}k`;
    }
    return formatCurrency(value);
  };

  return {
    currency,
    setCurrency,
    formatCurrency,
    formatCurrencyCompact,
    loading,
    currencies: CURRENCIES,
  };
}
