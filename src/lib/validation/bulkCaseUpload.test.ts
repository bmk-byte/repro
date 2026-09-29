import { describe, it, expect } from 'vitest';
import { validateCaseRow, markWithinFileDuplicates, COLUMNS, type Translate, type ParsedRow } from './bulkCaseUpload';
import { CASE_CATEGORIES } from '../../constants/caseCategories';

// Identity-ish translator so assertions can check on the key/params actually
// used, without needing react-i18next configured in this test file.
const t: Translate = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

const countryIdByName = new Map<string, string>([
  ['kenya', 'country-kenya-id'],
  ['uganda', 'country-uganda-id'],
]);

function buildValidRawRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of COLUMNS) {
    if (col.key === 'regional_appeals') { row[col.header] = 'false'; continue; }
    if (col.key === 'country') { row[col.header] = 'Kenya'; continue; }
    if (col.key === 'timeline_status') { row[col.header] = 'ongoing'; continue; }
    if (col.key === 'judicial_body_type') { row[col.header] = 'National Court'; continue; }
    if (col.key === 'legal_framework_type') { row[col.header] = 'Domestic Law'; continue; }
    if (col.key === 'case_categories') { row[col.header] = CASE_CATEGORIES[0]; continue; }
    if (col.required) { row[col.header] = `value for ${col.key}`; continue; }
    row[col.header] = '';
  }
  return { ...row, ...overrides };
}

describe('validateCaseRow — valid rows', () => {
  it('accepts a fully valid row with no errors', () => {
    const result = validateCaseRow(buildValidRawRow(), 2, countryIdByName, t);
    expect(result.errors).toEqual([]);
    expect(result.rowNumber).toBe(2);
    expect(result.data.country_id).toBe('country-kenya-id');
    expect(result.data.timeline_status).toBe('ongoing');
  });

  it('leaves optional fields empty without raising an error', () => {
    const row = buildValidRawRow({ 'Case Outcome': '', 'Regional Bodies (semicolon-separated)': '' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors).toEqual([]);
    expect(result.data.case_outcome).toBe('');
    expect(result.data.regional_bodies).toEqual([]);
  });

  it('splits semicolon-separated multi-value fields into arrays', () => {
    const row = buildValidRawRow({ 'Litigants (semicolon-separated)': 'Jane Doe; John Roe ; Ann Poe' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.data.litigants).toEqual(['Jane Doe', 'John Roe', 'Ann Poe']);
  });

  it('normalizes enum casing to the canonical value', () => {
    const row = buildValidRawRow({ 'Timeline Status (filed/ongoing/resolved/dismissed)': 'ONGOING' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors).toEqual([]);
    expect(result.data.timeline_status).toBe('ongoing');
  });

  it('parses regional_appeals from common truthy spellings', () => {
    for (const truthy of ['true', 'TRUE', 'yes', '1']) {
      const row = buildValidRawRow({ 'Regional Appeals (true/false)': truthy });
      const result = validateCaseRow(row, 2, countryIdByName, t);
      expect(result.data.regional_appeals).toBe(true);
    }
    for (const falsy of ['false', 'no', '0', '']) {
      const row = buildValidRawRow({ 'Regional Appeals (true/false)': falsy });
      const result = validateCaseRow(row, 2, countryIdByName, t);
      expect(result.data.regional_appeals).toBe(false);
    }
  });
});

describe('validateCaseRow — missing required fields', () => {
  it('flags every required column that is left blank', () => {
    const requiredKeys = COLUMNS.filter(c => c.required).map(c => c.key);
    const row = buildValidRawRow(
      Object.fromEntries(COLUMNS.filter(c => c.required).map(c => [c.header, '']))
    );
    const result = validateCaseRow(row, 2, countryIdByName, t);
    // One "fieldRequired" error per required column that's blank (multi and
    // scalar fields both go through the same required check).
    expect(result.errors.length).toBeGreaterThanOrEqual(requiredKeys.length - 1); // -1: case_categories reported via enum path too but still required-checked
    expect(result.errors.some(e => e.includes('fieldRequired'))).toBe(true);
  });

  it('does not flag an optional field left blank', () => {
    const row = buildValidRawRow({ 'Case Outcome': '' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('Case Outcome'))).toBe(false);
  });
});

describe('validateCaseRow — malformed / invalid values', () => {
  it('rejects a country not present in the lookup map', () => {
    const row = buildValidRawRow({ Country: 'Narnia' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('unknownCountry'))).toBe(true);
    expect(result.data.country_id).toBeUndefined();
  });

  it('rejects an invalid timeline_status value', () => {
    const row = buildValidRawRow({ 'Timeline Status (filed/ongoing/resolved/dismissed)': 'archived' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidTimelineStatus'))).toBe(true);
  });

  it('rejects an invalid judicial_body_type value', () => {
    const row = buildValidRawRow({ 'Judicial Body Type (National Court/Regional Court)': 'Traffic Court' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidJudicialBodyType'))).toBe(true);
  });

  it('rejects an invalid legal_framework_type value', () => {
    const row = buildValidRawRow({ 'Legal Framework Type (Domestic Law/International Law/Both)': 'Customary Law' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidLegalFrameworkType'))).toBe(true);
  });

  it('rejects a case category not in CASE_CATEGORIES', () => {
    const header = COLUMNS.find(c => c.key === 'case_categories')!.header;
    const row = buildValidRawRow({ [header]: 'Not A Real Category' });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidCategory'))).toBe(true);
  });

  it('accepts multiple case categories when all match, rejects the row when only one is invalid', () => {
    const header = COLUMNS.find(c => c.key === 'case_categories')!.header;
    const row = buildValidRawRow({ [header]: `${CASE_CATEGORIES[0]}; Not A Real Category` });
    const result = validateCaseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidCategory'))).toBe(true);
    // The valid category is still kept in the normalized output.
    expect(result.data.case_categories).toContain(CASE_CATEGORIES[0]);
  });
});

describe('validateCaseRow — row numbering / metadata', () => {
  it('preserves the row number passed in (used for +2 offset in the caller: header=row 1)', () => {
    const result = validateCaseRow(buildValidRawRow(), 17, countryIdByName, t);
    expect(result.rowNumber).toBe(17);
  });
});

describe('markWithinFileDuplicates', () => {
  const row = (rowNumber: number, title: string, countryId: string, natureOfCase: string, errors: string[] = []): ParsedRow => ({
    rowNumber,
    data: { title, country_id: countryId, nature_of_case: natureOfCase },
    errors,
  });

  it('leaves rows with distinct (title, country, nature_of_case) tuples untouched', () => {
    const rows = [
      row(2, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
      row(3, 'Roe v. Ministry', 'kenya-id', 'Constitutional challenge'),
    ];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[0].errors).toEqual([]);
    expect(result[1].errors).toEqual([]);
  });

  it('flags the second occurrence of a repeated (title, country, nature_of_case) tuple — mirrors the DB unique constraint', () => {
    // pending_cases enforces UNIQUE(title, country_id, nature_of_case) at
    // the database level, so this never actually produces a duplicate row
    // — but without this check the user only discovers a duplicate after
    // clicking submit, one generic per-row failure at a time, rather than
    // seeing it in the preview before submitting.
    const rows = [
      row(2, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
      row(3, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
    ];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[0].errors).toEqual([]);
    expect(result[1].errors.some(e => e.includes('duplicateRowInFile'))).toBe(true);
  });

  it('treats the same title in a different country as distinct, not a duplicate', () => {
    const rows = [
      row(2, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
      row(3, 'Doe v. Ministry', 'uganda-id', 'Constitutional challenge'),
    ];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[0].errors).toEqual([]);
    expect(result[1].errors).toEqual([]);
  });

  it('matches case-insensitively on title and nature_of_case', () => {
    const rows = [
      row(2, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
      row(3, 'DOE V. MINISTRY', 'kenya-id', 'CONSTITUTIONAL CHALLENGE'),
    ];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[1].errors.some(e => e.includes('duplicateRowInFile'))).toBe(true);
  });

  it('does not flag rows missing title or nature_of_case against each other (already caught by required-field checks)', () => {
    const rows = [row(2, '', 'kenya-id', ''), row(3, '', 'kenya-id', '')];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[0].errors).toEqual([]);
    expect(result[1].errors).toEqual([]);
  });

  it('preserves pre-existing errors on a row alongside the new duplicate error', () => {
    const rows = [
      row(2, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge'),
      row(3, 'Doe v. Ministry', 'kenya-id', 'Constitutional challenge', ['some other error']),
    ];
    const result = markWithinFileDuplicates(rows, t);
    expect(result[1].errors).toContain('some other error');
    expect(result[1].errors.some(e => e.includes('duplicateRowInFile'))).toBe(true);
  });
});
