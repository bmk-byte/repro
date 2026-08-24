import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm, sanitizeOrFilterTerm, sanitizeEmail } from './sanitize';

describe('sanitizeSearchTerm', () => {
  it('escapes LIKE wildcards so they are treated literally', () => {
    expect(sanitizeSearchTerm('50%')).toBe('50\\%');
    expect(sanitizeSearchTerm('a_b')).toBe('a\\_b');
    expect(sanitizeSearchTerm('a\\b')).toBe('a\\\\b');
  });

  it('trims whitespace', () => {
    expect(sanitizeSearchTerm('  hello  ')).toBe('hello');
  });

  it('returns an empty string for falsy input', () => {
    expect(sanitizeSearchTerm('')).toBe('');
  });
});

describe('sanitizeOrFilterTerm', () => {
  it('strips characters that have meaning in the PostgREST .or() filter DSL', () => {
    // A malicious search term trying to inject an extra filter clause.
    const malicious = 'a,is_moderator.eq.true';
    const sanitized = sanitizeOrFilterTerm(malicious);
    expect(sanitized).not.toContain(',');
    expect(sanitized).not.toContain('(');
    expect(sanitized).not.toContain(')');
  });

  it('still escapes LIKE wildcards on top of DSL characters', () => {
    expect(sanitizeOrFilterTerm('50%,foo')).toBe('50\\%foo');
  });
});

describe('sanitizeEmail', () => {
  it('lowercases and trims a valid email', () => {
    expect(sanitizeEmail('  Person@Example.COM  ')).toBe('person@example.com');
  });

  it('rejects an invalid email', () => {
    expect(sanitizeEmail('not-an-email')).toBe('');
  });
});
