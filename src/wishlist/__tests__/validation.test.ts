import { normalizeUrl, parsePriceToMinor, validateAddItem } from '../validation';

describe('parsePriceToMinor', () => {
  it.each([
    ['449', 44900],
    ['449,5', 44950],
    ['449.95', 44995],
    [' 449,95 kr. ', 44995],
    ['0,29', 29], // the float trap: parseFloat('0.29') * 100 !== 29
  ])('parses %p as %p øre', (input, expected) => {
    expect(parsePriceToMinor(input)).toBe(expected);
  });

  it.each(['', 'abc', '-10', '1.299,00', '12,345', '1e3'])('rejects %p', (input) => {
    expect(parsePriceToMinor(input)).toBeNull();
  });
});

describe('normalizeUrl', () => {
  it('treats an empty field as no link', () => {
    expect(normalizeUrl('   ')).toBeUndefined();
  });

  it('adds https:// when the scheme is missing', () => {
    expect(normalizeUrl('shop.dk/lamp')).toBe('https://shop.dk/lamp');
    expect(normalizeUrl('shop.dk:8080/lamp')).toBe('https://shop.dk:8080/lamp');
  });

  it('keeps http and https links as they are', () => {
    expect(normalizeUrl('http://shop.dk')).toBe('http://shop.dk');
  });

  it.each([
    'shop.dk',
    'www.shop.co.uk/lamp?colour=green#reviews',
    'my-shop.dk',
    'blåbær.dk',
    'xn--blbr-roa.dk',
    'l.com.ard/s.com', // well-formed; only a list of real TLDs could reject it
  ])('accepts %p', (input) => {
    expect(normalizeUrl(input)).toBe(`https://${input}`);
  });

  it.each([
    'javascript:alert(1)',
    'ftp://shop.dk',
    'not a link',
    'localhost',
    'shop.123', // TLD must be letters
    'a.b', // TLD must be 2+ letters
    'x..y', // empty part between dots
    'a_b.com', // _ isn't allowed in host names
    '-shop.dk', // a part can't start with a hyphen
    'shop-.dk', // ...or end with one
    '-.--',
    'user@shop.dk', // no credentials in shared links
  ])('rejects %p', (input) => {
    expect(normalizeUrl(input)).toBeNull();
  });
});

describe('validateAddItem', () => {
  it('returns a clean item for valid input', () => {
    expect(validateAddItem({ title: '  Cast   iron pan ', price: '599', url: '' })).toEqual({
      ok: true,
      value: { title: 'Cast iron pan', priceMinor: 59900 },
    });
  });

  it('reports every invalid field at once', () => {
    const result = validateAddItem({ title: ' ', price: '0', url: 'nope' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['price', 'title', 'url']);
  });

  it('caps the title length and the price', () => {
    const result = validateAddItem({ title: 'x'.repeat(101), price: '100000,01', url: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveProperty('title');
    if (!result.ok) expect(result.errors).toHaveProperty('price');
  });
});
