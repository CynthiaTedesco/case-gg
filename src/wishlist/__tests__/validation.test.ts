import { normalizeUrl, parsePriceToMinor, priceProblem, validateAddItem } from '../validation';

describe('parsePriceToMinor', () => {
  it.each([
    ['449', 44900],
    ['449,5', 44950],
    ['449.95', 44995],
    [' 449,95 kr. ', 44995],
    ['449,', 44900], // a stray comma from the number pad
    [',95', 95],
    ['0,29', 29], // the float trap: parseFloat('0.29') * 100 !== 29
  ])('parses %p as %p øre', (input, expected) => {
    expect(parsePriceToMinor(input)).toBe(expected);
  });

  it.each(['', ',', 'abc', '-10', '1.299,00', '12,345', '1e3'])('rejects %p', (input) => {
    expect(parsePriceToMinor(input)).toBeNull();
  });
});

describe('priceProblem', () => {
  it.each(['449', '449,5', '449.95 kr', '449,', ',95', '100000'])('accepts %p', (input) => {
    expect(priceProblem(input)).toBeUndefined();
  });

  it.each([
    ['', /add a price/i],
    [',', /type the price/i],
    ['-10', /negative/i],
    ['12 kroner', /only digits, with a comma .* 449,95/i],
    ['12.5 kroner', /only digits, with a dot .* 449\.95/i],
    ['1.299,95', /thousands separator \(e\.g\. 1299,95\)/i], // pasted from a Danish shop
    ['1,299.95', /thousands separator/i], // pasted from an English one
    ['1,299,95', /only one comma, before the øre \(e\.g\. 1299,95\)/i], // typed on the number pad
    ['1.299', /write 1299, not 1\.299/i], // Danish thousands, not 3 decimals
    ['449,9575', /at most 2 decimals: 449,95, not 449,9575/i],
    ['449.9575', /at most 2 decimals: 449\.95, not 449\.9575/i],
    ['100000,01', /max is 100000 kr/i],
    ['0', /more than 0/i],
    ['0,', /more than 0/i],
  ])('explains what is wrong with %p', (input, message) => {
    expect(priceProblem(input)).toMatch(message);
  });

  it('names both problems when there are two', () => {
    expect(priceProblem('999999999999,435646476')).toMatch(
      /2 decimals, and no more than 100000 kr/i,
    );
  });

  it('never mentions a dot to someone who only typed commas', () => {
    for (const input of ['1,299,95', '449,9575', '12 kroner', ',', '999999999999,435646476']) {
      expect(priceProblem(input)).not.toMatch(/\bdot\b|\d\.\d/);
    }
  });

  it('agrees with the parser on what is a valid price', () => {
    for (const input of ['449', '449,', ',95', '0,01', '1.299,95', '1.299', '449,957', 'abc']) {
      const parsed = parsePriceToMinor(input);
      const valid = parsed !== null && parsed > 0 && parsed <= 100_000_00;
      expect(priceProblem(input) === undefined).toBe(valid);
    }
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
