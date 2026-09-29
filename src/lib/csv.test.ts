import { describe, it, expect } from 'vitest';
import { sanitizeCsvCell, toCsv } from './csv';

describe('sanitizeCsvCell — formula/CSV injection prevention', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['=CMD(\'/c calc\')', "'=CMD('/c calc')"],
    ['+1+1', "'+1+1"],
    ['-1+1', "'-1+1"],
    ['@SUM(A1:A10)', "'@SUM(A1:A10)"],
    ['\t=malicious', "'\t=malicious"],
  ])('prefixes a leading formula-trigger character with a quote: %s', (input, expected) => {
    expect(sanitizeCsvCell(input)).toBe(expected);
  });

  it('does not mangle ordinary text that happens to contain a hyphen or plus mid-string', () => {
    expect(sanitizeCsvCell('Doe v. Ministry of Health')).toBe('Doe v. Ministry of Health');
    expect(sanitizeCsvCell('Case number 5+3')).toBe('Case number 5+3');
  });

  it('does not treat a negative number as a formula trigger differently from any other text — still neutralizes it, since spreadsheets cannot tell a negative number from a subtraction formula by content alone', () => {
    // This is a deliberate, documented trade-off: "-5" is indistinguishable
    // from a formula to the spreadsheet application itself, so the safe
    // default (quote-prefix) applies uniformly. A caller needing numeric
    // values to sort/calculate in the destination spreadsheet should not
    // route them through a text-safety layer built for free-text fields.
    expect(sanitizeCsvCell('-5')).toBe("'-5");
  });

  it('still escapes commas, quotes, and newlines as before', () => {
    expect(sanitizeCsvCell('a,b')).toBe('"a,b"');
    expect(sanitizeCsvCell('a"b')).toBe('"a""b"');
    expect(sanitizeCsvCell('a\nb')).toBe('"a\nb"');
  });

  it('applies both protections together when a formula-triggering value also needs quoting', () => {
    expect(sanitizeCsvCell('=A1,B1')).toBe('"\'=A1,B1"');
  });

  it('applies both protections together with embedded quotes too (a realistic HYPERLINK payload)', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://evil.example","Click")')).toBe(
      '"\'=HYPERLINK(""http://evil.example"",""Click"")"'
    );
  });

  it('handles null/undefined/empty values without throwing', () => {
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
    expect(sanitizeCsvCell('')).toBe('');
  });

  it('coerces non-string values to string first', () => {
    expect(sanitizeCsvCell(42)).toBe('42');
    expect(sanitizeCsvCell(true)).toBe('true');
  });
});

describe('toCsv', () => {
  it('joins sanitized rows with comma-separated columns and CRLF row separators', () => {
    const csv = toCsv([
      ['Title', 'Notes'],
      ['Doe v. Ministry', 'ok'],
      ['=HYPERLINK("evil")', 'malicious'],
    ]);
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Title,Notes');
    expect(lines[1]).toBe('Doe v. Ministry,ok');
    // The formula-trigger quote-prefix makes the cell start with `'`, and
    // the embedded double quotes from HYPERLINK("evil") force RFC 4180
    // quoting + doubling on top of that.
    expect(lines[2]).toBe('"\'=HYPERLINK(""evil"")",malicious');
  });
});
