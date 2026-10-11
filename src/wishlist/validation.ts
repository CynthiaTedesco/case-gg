import type { WishItem } from '../api';

export const TITLE_MAX_LENGTH = 100;
export const PRICE_MAX_MINOR = 100_000_00; // 100.000 kr.

export type AddItemForm = { title: string; price: string; url: string };
export type AddItemErrors = Partial<Record<keyof AddItemForm, string>>;
export type NewItem = Pick<WishItem, 'title' | 'priceMinor' | 'url'>;

export type ValidationResult = { ok: true; value: NewItem } | { ok: false; errors: AddItemErrors };

// Kroner, optionally followed by "," or "." and up to two øre digits. "449," and ",95" are fine:
// a phone's number pad makes a stray or leading comma easy, and the meaning is obvious. Mixed or
// repeated separators are rejected, not guessed: "1.299,95" (Danish) and "1,299.95" (English) are
// the same price written with opposite separators, and a wrong guess is off by 100x or more.
const PRICE_PATTERN = /^(?=[.,]?\d)(\d*)(?:[.,](\d{0,2}))?$/;

/** Removes a trailing "kr" / "kr." and surrounding spaces, common when pasting from a shop. */
function stripCurrency(raw: string) {
  return raw.trim().replace(/\s*kr\.?$/i, '');
}

/** Parses what a person types ("449", "449,5", "449.50 kr") into øre, or null if it isn't a price. */
export function parsePriceToMinor(raw: string): number | null {
  const match = PRICE_PATTERN.exec(stripCurrency(raw));
  if (!match) return null;
  const [, kroner = '', ore = ''] = match;
  // Integer maths only: parseFloat('0.29') * 100 is 28.999999999999996.
  return Number(kroner || '0') * 100 + Number(ore.padEnd(2, '0'));
}

/**
 * Says what's wrong with a price, in the separator the person typed: a phone's number pad
 * offers only one (a comma in Danish), so a message mentioning the other would be confusing.
 * The keyboard is only a hint, though. Pasting, web and physical keyboards can send anything,
 * so every case is covered. With both a format and a size problem, it names both.
 */
export function priceProblem(raw: string): string | undefined {
  const value = stripCurrency(raw);
  if (!value) return 'Add a price so people can plan their budget.';

  const separator = value.includes('.') && !value.includes(',') ? '.' : ',';
  const word = separator === ',' ? 'comma' : 'dot';
  const example = `449${separator}95`;

  if (value.startsWith('-')) return "The price can't be negative.";
  if (/[^\d.,]/.test(value))
    return `Use only digits, with a ${word} before the øre (e.g. ${example}).`;
  if (!/\d/.test(value)) return `Type the price in kroner (e.g. ${example}).`;

  const separators = value.match(/[.,]/g)?.length ?? 0;
  if (separators > 1) {
    return value.includes('.') && value.includes(',')
      ? `Leave out the thousands separator (e.g. 1299${separator}95).`
      : `Use only one ${word}, before the øre (e.g. 1299${separator}95).`;
  }

  const [kroner = '', ore = ''] = value.split(/[.,]/);
  // Uses only the first 2 decimals, so it still works while there are too many.
  const tooHigh =
    Number(kroner || '0') * 100 + Number(ore.slice(0, 2).padEnd(2, '0')) > PRICE_MAX_MINOR;
  if (ore.length === 3 && !tooHigh) {
    // Exactly 3 digits after one separator is almost always thousands: "1.299" is 1299 kr.
    return `Leave out the thousands separator: write ${kroner}${ore}, not ${value}.`;
  }
  const tooManyDecimals = ore.length > 2;
  if (tooManyDecimals && tooHigh) {
    return `Use at most 2 decimals, and no more than 100000 kr. (e.g. ${example}).`;
  }
  if (tooManyDecimals) {
    return `Use at most 2 decimals: ${kroner}${separator}${ore.slice(0, 2)}, not ${value}.`;
  }
  if (tooHigh) return 'That looks like a typo. The max is 100000 kr.';
  if (parsePriceToMinor(value) === 0) return 'The price must be more than 0 kr.';
  return undefined;
}

const HAS_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
// Accented Latin letters (æ, ø, å, ä, é…) so Danish domains like blåbær.dk pass. Listed as a
// range rather than \p{L}, which isn't guaranteed on every engine. Skips × (D7) and ÷ (F7).
const ACCENTED = '\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F';
// A host part: letters/digits/hyphens, never starting or ending with a hyphen.
const LABEL = `[a-z0-9${ACCENTED}](?:[a-z0-9${ACCENTED}-]*[a-z0-9${ACCENTED}])?`;
// Top-level domain: 2+ letters, or the xn-- encoded form of an international one.
const TLD = `(?:[a-z${ACCENTED}]{2,63}|xn--[a-z0-9-]+)`;
// Checks the shape only. "l.com.ard" passes because only a list of real TLDs could reject it.
const HTTP_URL = new RegExp(`^https?://(?:${LABEL}\\.)+${TLD}(?::\\d{1,5})?(?:[/?#]\\S*)?$`, 'i');

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
  const priceError = priceProblem(form.price);
  if (priceError) errors.price = priceError;

  const url = normalizeUrl(form.url);
  if (url === null) errors.url = "That doesn't look like a web link (e.g. shop.dk/item).";

  if (priceMinor === null || url === null || Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true, value: url ? { title, priceMinor, url } : { title, priceMinor } };
}
