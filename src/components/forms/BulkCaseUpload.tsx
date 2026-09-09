import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Download, Upload, FileSpreadsheet, CircleCheck as CheckCircle, CircleAlert as AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { reportError } from '../../lib/errorReporting';
import { sanitizeArray, sanitizeText } from '../../lib/sanitize';
import { Button, Card } from '../ui';
import { CASE_CATEGORIES } from './SubmitCaseForm';

interface BulkCaseUploadProps {
  onDone?: () => void;
}

// Accepted enum values, kept in sync with the CHECK constraints on
// pending_cases (supabase/migrations/20250630113200_mute_temple.sql) and the
// <option> values in SubmitCaseForm.tsx's own selects.
const TIMELINE_STATUS_VALUES = ['filed', 'ongoing', 'resolved', 'dismissed'];
const JUDICIAL_BODY_TYPE_VALUES = ['National Court', 'Regional Court'];
const LEGAL_FRAMEWORK_TYPE_VALUES = ['Domestic Law', 'International Law', 'Both'];

const MAX_ROWS = 200;

// Column definition drives both the downloadable template and the parser —
// `header` is the exact CSV column label used in both directions, so a
// partner who doesn't rename headers round-trips cleanly.
interface ColumnDef {
  key: string;
  header: string;
  required: boolean;
  multi?: boolean;
  example: string;
}

const COLUMNS: ColumnDef[] = [
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

const escapeCSV = (val: unknown): string => {
  const str = val == null ? '' : String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

interface ParsedRow {
  rowNumber: number;
  data: Record<string, any>;
  errors: string[];
}

interface SubmitResults {
  successCount: number;
  failures: { rowNumber: number; title: string; message: string }[];
}

const BulkCaseUpload: React.FC<BulkCaseUploadProps> = ({ onDone }) => {
  const { t } = useTranslation('forms');
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmitResults | null>(null);

  useEffect(() => {
    supabase
      .from('countries')
      .select('id, name')
      .order('name')
      .then(({ data, error }) => {
        if (error) {
          console.error('Error fetching countries:', error);
          toast.error(t('bulkCaseUpload.errors.countriesLoadError'));
          return;
        }
        setCountries(data || []);
      });
  }, [t]);

  const countryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    countries.forEach(c => map.set(c.name.trim().toLowerCase(), c.id));
    return map;
  }, [countries]);

  const downloadTemplate = () => {
    const header = COLUMNS.map(c => escapeCSV(c.header)).join(',');
    const example = COLUMNS.map(c => escapeCSV(c.example)).join(',');
    const csv = `${header}\n${example}\n`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-case-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateRow = (rawRow: Record<string, string>, rowNumber: number): ParsedRow => {
    const errors: string[] = [];
    const data: Record<string, any> = {};

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

    // Country -> country_id lookup
    if (data.country) {
      const countryId = countryIdByName.get(String(data.country).toLowerCase());
      if (!countryId) {
        errors.push(t('bulkCaseUpload.errors.unknownCountry', { country: data.country }));
      } else {
        data.country_id = countryId;
      }
    }

    // Enum normalization/validation
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
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      setResults(null);
      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        setFileError(
          reason?.code === 'file-invalid-type'
            ? t('bulkCaseUpload.errors.fileInvalidType')
            : reason?.message || t('bulkCaseUpload.errors.fileRejectedGeneric')
        );
        return;
      }
      const file = acceptedFiles[0];
      if (!file) return;

      setFileError(null);
      setRows(null);

      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          if (result.data.length === 0) {
            setFileError(t('bulkCaseUpload.errors.emptyFile'));
            return;
          }
          if (result.data.length > MAX_ROWS) {
            setFileError(t('bulkCaseUpload.errors.tooManyRows', { max: MAX_ROWS, count: result.data.length }));
            return;
          }
          const parsed = result.data.map((rawRow, index) => validateRow(rawRow, index + 2)); // +2: header is row 1, data starts at row 2
          setRows(parsed);
        },
        error: (err) => {
          setFileError(err.message || t('bulkCaseUpload.errors.fileRejectedGeneric'));
        },
      });
    },
    accept: { 'text/csv': ['.csv'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const validRows = useMemo(() => (rows ?? []).filter(r => r.errors.length === 0), [rows]);
  const invalidRows = useMemo(() => (rows ?? []).filter(r => r.errors.length > 0), [rows]);

  const handleSubmit = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    setResults(null);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error(t('common.noAuthenticatedUser'));

      // Fail open: only an explicit `false` blocks — an RPC error (e.g.
      // offline) shouldn't itself lock the partner out of bulk uploading.
      const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_key: `bulk-case-upload:${user.id}`,
        p_max_count: 5,
        p_window_seconds: 3600,
      });
      if (!rateLimitError && allowed === false) {
        toast.error(t('bulkCaseUpload.errors.rateLimited'));
        setSubmitting(false);
        return;
      }

      // Inserted one row at a time (not a single array insert) — pending_cases
      // has a UNIQUE(title, country_id, nature_of_case) constraint plus a
      // duplicate-check trigger, so one conflicting row must not abort the
      // whole batch.
      const failures: SubmitResults['failures'] = [];
      let successCount = 0;

      for (const row of validRows) {
        const d = row.data;
        const { error } = await supabase.from('pending_cases').insert({
          title: d.title,
          summary: d.summary,
          document_url: null,
          submitted_by: user.id,
          country_id: d.country_id,
          status: 'pending',
          tracking_period: d.tracking_period,
          programme: d.programme,
          partner: d.partner,
          nature_of_case: d.nature_of_case,
          action_taken: d.action_taken,
          action_timeframe: d.action_timeframe,
          next_steps: d.next_steps,
          court: d.court,
          timeline_status: d.timeline_status,
          litigants: d.litigants,
          defending_institutions: d.defending_institutions,
          judicial_body_type: d.judicial_body_type,
          judicial_body: d.judicial_body,
          regional_appeals: d.regional_appeals,
          regional_bodies: d.regional_bodies,
          legal_framework_type: d.legal_framework_type,
          domestic_laws: d.domestic_laws,
          international_laws: d.international_laws,
          protocols: d.protocols,
          case_impact: d.case_impact,
          case_categories: d.case_categories,
          case_outcome: d.case_outcome,
        });

        if (error) {
          console.error(`Bulk case upload row ${row.rowNumber} failed:`, error);
          reportError(error, { context: 'bulkCaseUpload.row', rowNumber: row.rowNumber });
          failures.push({
            rowNumber: row.rowNumber,
            title: d.title,
            message: t('bulkCaseUpload.errors.unexpectedRowError'),
          });
        } else {
          successCount += 1;
        }
      }

      setResults({ successCount, failures });
      if (successCount > 0) {
        toast.success(t('bulkCaseUpload.toasts.submitted', { count: successCount }));
      }
      if (failures.length === 0 && successCount > 0) {
        setRows(null);
      }
    } catch (error: any) {
      console.error('Bulk case upload error:', error);
      reportError(error, { context: 'bulkCaseUpload.submit' });
      toast.error(t('bulkCaseUpload.errors.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="h-6 w-6 text-primary flex-none mt-0.5" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-medium text-stone-900">{t('bulkCaseUpload.heading')}</h3>
            <p className="text-sm text-stone-600 mt-1">{t('bulkCaseUpload.description')}</p>
          </div>
        </div>

        <ul className="text-sm text-stone-600 list-disc pl-5 space-y-1">
          <li>{t('bulkCaseUpload.instructions.multiValue')}</li>
          <li>{t('bulkCaseUpload.instructions.enums')}</li>
          <li>{t('bulkCaseUpload.instructions.country')}</li>
          <li>{t('bulkCaseUpload.instructions.document')}</li>
          <li>{t('bulkCaseUpload.instructions.maxRows', { max: MAX_ROWS })}</li>
        </ul>

        <Button type="button" variant="outline" onClick={downloadTemplate} icon={<Download className="h-4 w-4" />}>
          {t('bulkCaseUpload.downloadTemplate')}
        </Button>
      </Card>

      <Card className="p-6 space-y-4">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : fileError
                ? 'border-danger bg-danger-light/40'
                : 'border-stone-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} aria-label={t('bulkCaseUpload.uploadAriaLabel')} />
          <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-stone-600">{t('bulkCaseUpload.dropzonePrompt')}</p>
          <p className="text-sm text-stone-500 mt-2">{t('bulkCaseUpload.maxFileSize')}</p>
        </div>

        {fileError && (
          <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
            <AlertCircle className="h-4 w-4 flex-none" />
            {fileError}
          </p>
        )}

        {rows && rows.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-success">
                <CheckCircle className="h-4 w-4" aria-hidden="true" />
                {t('bulkCaseUpload.validCount', { count: validRows.length })}
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-danger">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t('bulkCaseUpload.invalidCount', { count: invalidRows.length })}
                </span>
              )}
              <button
                type="button"
                onClick={() => { setRows(null); setResults(null); }}
                className="ml-auto text-stone-500 hover:text-danger flex items-center gap-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('bulkCaseUpload.clear')}
              </button>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkCaseUpload.table.row')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkCaseUpload.table.title')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkCaseUpload.table.country')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkCaseUpload.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-3 py-2 text-stone-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-stone-900">{row.data.title || '—'}</td>
                      <td className="px-3 py-2 text-stone-700">{row.data.country || '—'}</td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('bulkCaseUpload.table.ok')}
                          </span>
                        ) : (
                          <span className="inline-flex items-start gap-1 text-danger">
                            <AlertCircle className="h-3.5 w-3.5 flex-none mt-0.5" aria-hidden="true" />
                            <span>{row.errors.join('; ')}</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                loading={submitting}
                disabled={validRows.length === 0}
              >
                {submitting
                  ? t('bulkCaseUpload.submitting')
                  : t('bulkCaseUpload.submitButton', { count: validRows.length })}
              </Button>
            </div>
          </div>
        )}

        {results && (
          <div className="border-t border-stone-200 pt-4 space-y-2">
            <p className="text-sm font-medium text-stone-900">
              {t('bulkCaseUpload.results.summary', { success: results.successCount, failed: results.failures.length })}
            </p>
            {results.failures.length > 0 && (
              <ul className="text-sm text-danger space-y-1">
                {results.failures.map(f => (
                  <li key={f.rowNumber}>
                    {t('bulkCaseUpload.results.failureLine', { row: f.rowNumber, title: f.title, message: f.message })}
                  </li>
                ))}
              </ul>
            )}
            {results.successCount > 0 && (
              <Button type="button" variant="outline" onClick={onDone}>
                {t('bulkCaseUpload.results.viewCases')}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BulkCaseUpload;
