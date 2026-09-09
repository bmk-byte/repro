import { sanitizeText } from '../sanitize';
import { CASE_CATEGORIES } from '../../components/forms/SubmitCaseForm';

/**
 * Pure validation logic for the bulk Rapid Response CSV upload, extracted
 * from BulkRapidResponseUpload.tsx so it can be unit tested without
 * mounting the component or a real Supabase client. Behavior must stay
 * identical to what BulkRapidResponseUpload.tsx used inline before this
 * extraction — this is a refactor for testability, not a change to
 * validation rules.
 */

export const PRIORITY_LEVELS = ['Urgent', 'High', 'Medium', 'Low'];
export const STAGE_VALUES = ['intake', 'review', 'action', 'resolution'];
export const MAX_ROWS = 200;

export const mapStageToStatus = (stage: string): string => {
  switch (stage) {
    case 'intake': return 'pending';
    case 'review': return 'in_progress';
    case 'action': return 'in_progress';
    case 'resolution': return 'completed';
    default: return 'pending';
  }
};

export interface ColumnDef {
  key: string;
  header: string;
  required: boolean;
  example: string;
}

export const COLUMNS: ColumnDef[] = [
  { key: 'case_reference', header: 'Case Reference', required: true, example: 'RR-2025-001' },
  { key: 'case_filed', header: 'Case Title', required: true, example: 'Doe v. Ministry of Health' },
  { key: 'country', header: 'Country', required: true, example: 'Kenya' },
  { key: 'case_category', header: `Case Category (must match: ${CASE_CATEGORIES.join(', ')})`, required: true, example: 'Maternal Health and Mortality' },
  { key: 'case_summary', header: 'Case Summary', required: true, example: 'Brief summary of the case.' },
  { key: 'priority_level', header: `Priority Level (${PRIORITY_LEVELS.join('/')})`, required: false, example: 'Medium' },
  { key: 'rapid_response_stage', header: `Current Stage (${STAGE_VALUES.join('/')})`, required: false, example: 'intake' },
  { key: 'nature_of_case', header: 'Nature of Case', required: true, example: 'Constitutional challenge' },
  { key: 'action_taken', header: 'Action Taken', required: true, example: 'Petition filed in High Court' },
  { key: 'action_timeframe', header: 'Action Timeframe', required: true, example: 'Q1 2025' },
  { key: 'next_steps', header: 'Next Steps', required: true, example: 'Awaiting hearing date' },
  { key: 'partner', header: 'Partner Organization', required: false, example: 'Example Partner Org' },
  { key: 'client_name', header: 'Client Name', required: false, example: '' },
  { key: 'client_email', header: 'Client Email', required: false, example: '' },
  { key: 'client_phone', header: 'Client Phone', required: false, example: '' },
];

export interface ParsedRow {
  rowNumber: number;
  data: Record<string, string>;
  errors: string[];
}

/** Minimal i18n shape this module needs — matches react-i18next's `t`. */
export type Translate = (key: string, params?: Record<string, unknown>) => string;

export function validateRapidResponseRow(
  rawRow: Record<string, string>,
  rowNumber: number,
  countryIdByName: Map<string, string>,
  t: Translate
): ParsedRow {
  const errors: string[] = [];
  const data: Record<string, string> = {};

  for (const col of COLUMNS) {
    const value = sanitizeText((rawRow[col.header] ?? '').toString());
    if (col.required && !value) {
      errors.push(t('bulkUpload.errors.fieldRequired', { field: col.header }));
    }
    data[col.key] = value;
  }

  if (data.country) {
    const countryId = countryIdByName.get(String(data.country).toLowerCase());
    if (!countryId) {
      errors.push(t('bulkUpload.errors.unknownCountry', { country: data.country }));
    } else {
      data.country_id = countryId;
    }
  }

  const matchEnum = (value: string, allowed: string[]): string | null =>
    allowed.find(a => a.toLowerCase() === value.trim().toLowerCase()) ?? null;

  data.priority_level = data.priority_level ? matchEnum(data.priority_level, PRIORITY_LEVELS) : 'Medium';
  if (!data.priority_level) {
    errors.push(t('bulkUpload.errors.invalidPriorityLevel', { value: rawRow[COLUMNS[5].header] }));
    data.priority_level = 'Medium';
  }

  data.rapid_response_stage = data.rapid_response_stage ? matchEnum(data.rapid_response_stage, STAGE_VALUES) : 'intake';
  if (!data.rapid_response_stage) {
    errors.push(t('bulkUpload.errors.invalidStage', { value: rawRow[COLUMNS[6].header] }));
    data.rapid_response_stage = 'intake';
  }

  if (data.case_category) {
    const matched = CASE_CATEGORIES.find(c => c.toLowerCase() === String(data.case_category).toLowerCase());
    if (!matched) {
      errors.push(t('bulkUpload.errors.invalidCategory', { value: data.case_category }));
    } else {
      data.case_category = matched;
    }
  }

  return { rowNumber, data, errors };
}
