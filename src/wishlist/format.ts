import type { WishItem } from '../api';

const formatters = new Map<string, Intl.NumberFormat>();

function formatter(currency: string, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('da-DK', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

/** 44900 → "449 kr.", 44950 → "449,50 kr." (whole amounts drop the ",00"). */
export function formatPrice(priceMinor: number, currency: WishItem['currency'] = 'DKK') {
  const fractionDigits = priceMinor % 100 === 0 ? 0 : 2;
  return formatter(currency, fractionDigits).format(priceMinor / 100);
}
