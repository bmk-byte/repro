import { describe, it, expect } from 'vitest';
import { validateRapidResponseRow, COLUMNS, mapStageToStatus, type Translate } from './bulkRapidResponseUpload';
import { CASE_CATEGORIES } from '../../constants/caseCategories';

const t: Translate = (key, params) => (params ? `${key}:${JSON.stringify(params)}` : key);

const countryIdByName = new Map<string, string>([
  ['kenya', 'country-kenya-id'],
]);

function buildValidRawRow(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  const row: Record<string, string> = {};
  for (const col of COLUMNS) {
    if (col.key === 'country') { row[col.header] = 'Kenya'; continue; }
    if (col.key === 'case_category') { row[col.header] = CASE_CATEGORIES[0]; continue; }
    if (col.key === 'priority_level') { row[col.header] = 'High'; continue; }
    if (col.key === 'rapid_response_stage') { row[col.header] = 'review'; continue; }
    if (col.required) { row[col.header] = `value for ${col.key}`; continue; }
    row[col.header] = '';
  }
  return { ...row, ...overrides };
}

describe('validateRapidResponseRow — valid rows', () => {
  it('accepts a fully valid row with no errors', () => {
    const result = validateRapidResponseRow(buildValidRawRow(), 2, countryIdByName, t);
    expect(result.errors).toEqual([]);
    expect(result.data.country_id).toBe('country-kenya-id');
    expect(result.data.priority_level).toBe('High');
    expect(result.data.rapid_response_stage).toBe('review');
  });

  it('defaults priority_level to Medium when left blank (not an error)', () => {
    const row = buildValidRawRow({ 'Priority Level (Urgent/High/Medium/Low)': '' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidPriorityLevel'))).toBe(false);
    expect(result.data.priority_level).toBe('Medium');
  });

  it('defaults rapid_response_stage to intake when left blank (not an error)', () => {
    const row = buildValidRawRow({ 'Current Stage (intake/review/action/resolution)': '' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidStage'))).toBe(false);
    expect(result.data.rapid_response_stage).toBe('intake');
  });

  it('leaves optional client contact fields empty without error', () => {
    const row = buildValidRawRow({ 'Client Name': '', 'Client Email': '', 'Client Phone': '' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors).toEqual([]);
  });
});

describe('validateRapidResponseRow — missing required fields', () => {
  it('flags a missing required field (case_reference)', () => {
    const row = buildValidRawRow({ 'Case Reference': '' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('fieldRequired'))).toBe(true);
  });

  it('flags a missing required field (case_summary)', () => {
    const row = buildValidRawRow({ 'Case Summary': '' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('fieldRequired'))).toBe(true);
  });
});

describe('validateRapidResponseRow — malformed / invalid values', () => {
  it('rejects an unknown country', () => {
    const row = buildValidRawRow({ Country: 'Atlantis' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('unknownCountry'))).toBe(true);
  });

  it('rejects an invalid priority level and still falls back to Medium', () => {
    const row = buildValidRawRow({ 'Priority Level (Urgent/High/Medium/Low)': 'Critical' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidPriorityLevel'))).toBe(true);
    expect(result.data.priority_level).toBe('Medium');
  });

  it('rejects an invalid stage and still falls back to intake', () => {
    const row = buildValidRawRow({ 'Current Stage (intake/review/action/resolution)': 'closed' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidStage'))).toBe(true);
    expect(result.data.rapid_response_stage).toBe('intake');
  });

  it('rejects a case category not in CASE_CATEGORIES', () => {
    const header = COLUMNS.find(c => c.key === 'case_category')!.header;
    const row = buildValidRawRow({ [header]: 'Not A Real Category' });
    const result = validateRapidResponseRow(row, 2, countryIdByName, t);
    expect(result.errors.some(e => e.includes('invalidCategory'))).toBe(true);
  });
});

describe('mapStageToStatus', () => {
  it('maps each known stage to its expected status', () => {
    expect(mapStageToStatus('intake')).toBe('pending');
    expect(mapStageToStatus('review')).toBe('in_progress');
    expect(mapStageToStatus('action')).toBe('in_progress');
    expect(mapStageToStatus('resolution')).toBe('completed');
  });

  it('defaults an unrecognized stage to pending rather than throwing', () => {
    expect(mapStageToStatus('unknown-stage')).toBe('pending');
  });
});
