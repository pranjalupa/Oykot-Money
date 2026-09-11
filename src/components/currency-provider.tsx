"use client";

import { createContext, useContext } from "react";
import {
  CURRENCIES,
  DEFAULT_CURRENCY,
  type CurrencyCode,
} from "@/lib/currency";
import { DEFAULT_REGION, REGIONS, type RegionCode } from "@/lib/region";
import { formatDay } from "@/lib/dates";

/**
 * The signed-in user's display preferences, set once in the root layout.
 *
 * A context rather than props because money and dates are formatted in
 * dozens of places, many deep inside client components that have no business
 * knowing about the user's profile.
 */
type Prefs = { currency: CurrencyCode; region: RegionCode; timeZone?: string };

const PrefsContext = createContext<Prefs>({
  currency: DEFAULT_CURRENCY,
  region: DEFAULT_REGION,
});

export function CurrencyProvider({
  currency,
  region = DEFAULT_REGION,
  timeZone,
  children,
}: Prefs & { children: React.ReactNode }) {
  return (
    <PrefsContext.Provider value={{ currency, region, timeZone }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function useCurrency() {
  return useContext(PrefsContext).currency;
}

export function useRegion() {
  return useContext(PrefsContext).region;
}

export function useLocale() {
  return REGIONS[useContext(PrefsContext).region].locale;
}

export function useTimeZone() {
  return useContext(PrefsContext).timeZone;
}

/** The symbol alone, for field labels — "Amount (€)". */
export function CurrencySymbol() {
  return <>{CURRENCIES[useCurrency()].symbol}</>;
}

/** A stored calendar date in the user's regional format — "3 Sept" or "Sep 3". */
export function LocalDate({
  date,
  options,
}: {
  date: string;
  options?: Intl.DateTimeFormatOptions;
}) {
  return <>{formatDay(date, useLocale(), options)}</>;
}
