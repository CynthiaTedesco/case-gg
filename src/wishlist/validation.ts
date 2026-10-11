import type { WishItem } from '../api';

export const TITLE_MAX_LENGTH = 100;
export const PRICE_MAX_MINOR = 100_000_00; // 100.000 kr.

export type AddItemForm = { title: string; price: string; url: string };
export type AddItemErrors = Partial<Record<keyof AddItemForm, string>>;
export type NewItem = Pick<WishItem, 'title' | 'priceMinor' | 'url'>;

export type ValidationResult = { ok: true; value: NewItem } | { ok: false; errors: AddItemErrors };

// Whole kroner, optionally followed by "," or "." and one or two øre digits. Thousands separators
// are rejected on purpose: "1.299" means 1299 kr. in Danish but 1.299 kr. in English notation.
const PRICE_PATTERN = /^(\d+)(?:[.,](\d{1,2}))?$/;

/** Parses what a person types ("449", "449,5", "449.50 kr") into øre, or null if it isn't a price. */
export function parsePriceToMinor(raw: string): number | null {
  const match = PRICE_PATTERN.exec(raw.trim().replace(/\s*kr\.?$/i, ''));
  if (!match) return null;
  const [, kroner, ore = ''] = match;
  // Integer maths only: parseFloat('0.29') * 100 is 28.999999999999996.
  return Number(kroner) * 100 + Number(ore.padEnd(2, '0'));
}

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const HTTP_URL = /^https?:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i;

/**
 * Empty → undefined (the field is optional). "shop.dk/lamp" → "https://shop.dk/lamp".
 * Anything that isn't an http(s) link → null. That also keeps javascript: links off the page.
 */
export function normalizeUrl(raw: string): string | null | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const withScheme = HAS_SCHEME.test(trimmed) ? trimmed : `https://${trimmed}`;
  return HTTP_URL.test(withScheme) ? withScheme : null;
}

export function validateAddItem(form: AddItemForm): ValidationResult {
  const errors: AddItemErrors = {};

  const title = form.title.trim().replace(/\s+/g, ' ');
  if (!title) errors.title = 'Give the item a name.';
  else if (title.length > TITLE_MAX_LENGTH)
    errors.title = `Keep it to ${TITLE_MAX_LENGTH} characters or fewer.`;

  const priceMinor = parsePriceToMinor(form.price);
  if (!form.price.trim()) errors.price = 'Add a price so people can plan their budget.';
  else if (priceMinor === null) errors.price = 'Use a number like 449 or 449,95.';
  else if (priceMinor === 0) errors.price = 'The price must be more than 0 kr.';
  else if (priceMinor > PRICE_MAX_MINOR)
    errors.price = 'That looks like a typo. The max is 100.000 kr.';

  const url = normalizeUrl(form.url);
  if (url === null) errors.url = "That doesn't look like a web link (e.g. shop.dk/item).";

  if (priceMinor === null || url === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: url ? { title, priceMinor, url } : { title, priceMinor } };
}
