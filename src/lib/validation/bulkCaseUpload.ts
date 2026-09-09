import { sanitizeArray, sanitizeText } from '../sanitize';
import { CASE_CATEGORIES } from '../../components/forms/SubmitCaseForm';

/**
 * Pure validation logic for the bulk Cases CSV upload, extracted from
 * BulkCaseUpload.tsx so it can be unit tested without mounting the
 * component or a real Supabase client. Behavior must stay identical to
 * what BulkCaseUpload.tsx used inline before this extraction — this is a
 * refactor for testability, not a change to validation rules.
 */

export const TIMELINE_STATUS_VALUES = ['filed', 'ongoing', 'resolved', 'dismissed'];
export const JUDICIAL_BODY_TYPE_VALUES = ['National Court', 'Regional Court'];
export const LEGAL_FRAMEWORK_TYPE_VALUES = ['Domestic Law', 'International Law', 'Both'];
export const MAX_ROWS = 200;

export interface ColumnDef {
  key: string;
  header: string;
  required: boolean;
  multi?: boolean;
  example: string;
}

export const COLUMNS: ColumnDef[] = [
  { key: 'title', header: 'Case Title', required: true, example: 'Doe v. Ministry of Health' },
  { key: 'summary', header: 'Case Summary', required: true, example: 'Brief summary of the case.' },
  { key: 'country', header: 'Country', required: true, example: 'Kenya' },
  { key: 'tracking_period', header: 'Tracking Period', required: true, example: '2024-2025' },
  { key: 'programme', header: 'Programme', required: true, example: 'Reproductive Rights Litigation' },
  { key: 'partner', header: 'Partner', required: true, example: 'Example Partner Org' },
  { key: 'nature_of_case', header: 'Nature of Case', required: true, example: 'Constitutional challenge' },
  { key: 'action_taken', header: 'Action Taken', required: true, example: 'Petition filed in High Court' },
  { key: 'action_timeframe', header: 'Action Timeframe', required: true, example: 'Q1 2025' },
  { key: 'next_steps', header: 'Next Steps', required: true, example: 'Awaiting hearing date' },
  { key: 'court', header: 'Court', required: true, example: 'High Court' },
  { key: 'timeline_status', header: 'Timeline Status (filed/ongoing/resolved/dismissed)', required: true, example: 'ongoing' },
  { key: 'litigants', header: 'Litigants (semicolon-separated)', required: true, multi: true, example: 'Jane Doe' },
  { key: 'defending_institutions', header: 'Defending Institutions (semicolon-separated)', required: true, multi: true, example: 'Ministry of Health' },
  { key: 'case_outcome', header: 'Case Outcome', required: false, example: '' },
  { key: 'judicial_body_type', header: 'Judicial Body Type (National Court/Regional Court)', required: true, example: 'National Court' },
  { key: 'judicial_body', header: 'Judicial Body', required: true, example: 'Supreme Court of Kenya' },
  { key: 'regional_appeals', header: 'Regional Appeals (true/false)', required: false, example: 'false' },
  { key: 'regional_bodies', header: 'Regional Bodies (semicolon-separated)', required: false, multi: true, example: '' },
  { key: 'legal_framework_type', header: 'Legal Framework Type (Domestic Law/International Law/Both)', required: true, example: 'Domestic Law' },
  { key: 'domestic_laws', header: 'Domestic Laws (semicolon-separated)', required: false, multi: true, example: 'Constitution Article 43' },
  { key: 'international_laws', header: 'International Laws (semicolon-separated)', required: false, multi: true, example: '' },
  { key: 'protocols', header: 'Protocols (semicolon-separated)', required: false, multi: true, example: '' },
  { key: 'case_impact', header: 'Case Impact', required: true, example: 'Sets precedent for access to care.' },
  { key: 'case_categories', header: `Case Categories (semicolon-separated; must match: ${CASE_CATEGORIES.join(', ')})`, required: true, multi: true, example: 'Maternal Health and Mortality' },
];

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string | string[] | boolean>;
  errors: string[];
}

/** Minimal i18n shape this module needs — matches react-i18next's `t`. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

export function validateCaseRow(
  rawRow: Record<string, string>,
  rowNumber: number,
  countryIdByName: Map<string, string>,
  t: Translate
): ParsedRow {
  const errors: string[] = [];
  const data: Record<string, string | string[] | boolean> = {};

  for (const col of COLUMNS) {
    const raw = (rawRow[col.header] ?? '').toString();

    if (col.key === 'regional_appeals') {
      data.regional_appeals = /^(true|yes|1)$/i.test(raw.trim());
      continue;
    }

    if (col.multi) {
      const list = sanitizeArray(raw.split(';'));
      if (col.required && list.length === 0) {
        errors.push(t('bulkCaseUpload.errors.fieldRequired', { field: col.header }));
      }
      data[col.key] = list;
      continue;
    }

    const value = sanitizeText(raw);
    if (col.required && !value) {
      errors.push(t('bulkCaseUpload.errors.fieldRequired', { field: col.header }));
    }
    data[col.key] = value;
  }

  if (data.country) {
    const countryId = countryIdByName.get(String(data.country).toLowerCase());
    if (!countryId) {
      errors.push(t('bulkCaseUpload.errors.unknownCountry', { country: data.country }));
    } else {
      data.country_id = countryId;
    }
  }

  const matchEnum = (value: string, allowed: string[]): string | null =>
    allowed.find(a => a.toLowerCase() === value.trim().toLowerCase()) ?? null;

  if (data.timeline_status) {
    const matched = matchEnum(data.timeline_status, TIMELINE_STATUS_VALUES);
    if (!matched) {
      errors.push(t('bulkCaseUpload.errors.invalidTimelineStatus', { value: data.timeline_status }));
    } else {
      data.timeline_status = matched;
    }
  }

  if (data.judicial_body_type) {
    const matched = matchEnum(data.judicial_body_type, JUDICIAL_BODY_TYPE_VALUES);
    if (!matched) {
      errors.push(t('bulkCaseUpload.errors.invalidJudicialBodyType', { value: data.judicial_body_type }));
    } else {
      data.judicial_body_type = matched;
    }
  }

  if (data.legal_framework_type) {
    const matched = matchEnum(data.legal_framework_type, LEGAL_FRAMEWORK_TYPE_VALUES);
    if (!matched) {
      errors.push(t('bulkCaseUpload.errors.invalidLegalFrameworkType', { value: data.legal_framework_type }));
    } else {
      data.legal_framework_type = matched;
    }
  }

  if (Array.isArray(data.case_categories) && data.case_categories.length > 0) {
    const normalized: string[] = [];
    for (const cat of data.case_categories as string[]) {
      const matched = CASE_CATEGORIES.find(c => c.toLowerCase() === cat.toLowerCase());
      if (!matched) {
        errors.push(t('bulkCaseUpload.errors.invalidCategory', { value: cat }));
      } else {
        normalized.push(matched);
      }
    }
    data.case_categories = normalized;
  }

  return { rowNumber, data, errors };
}
