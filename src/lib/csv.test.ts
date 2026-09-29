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

  it('quotes a value containing a bare carriage return, even when it does not itself start with a formula trigger', () => {
    // Regression test: an embedded \r that isn't wrapped in quotes can be
    // read by a spreadsheet application as a row break, exposing whatever
    // follows it as an unguarded new cell — e.g. `safe\r=1+1` would
    // otherwise be emitted as-is (no comma/quote/newline, and the value
    // doesn't *start* with `=`), letting `=1+1` execute as its own,
    // unquoted formula on the "next row".
    expect(sanitizeCsvCell('safe\r=1+1')).toBe('"safe\r=1+1"');
  });

  it('neutralizes a formula trigger that only appears after an embedded carriage return', () => {
    const result = sanitizeCsvCell('safe\r=1+1');
    // The whole cell is quoted, so a spreadsheet reader treats the \r as
    // literal content inside one cell rather than a row break — the
    // `=1+1` segment is never exposed as its own, unquoted formula cell.
    expect(result.startsWith('"') && result.endsWith('"')).toBe(true);
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
