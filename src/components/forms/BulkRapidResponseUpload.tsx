import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Papa from 'papaparse';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Download, Upload, FileSpreadsheet, CircleCheck as CheckCircle, CircleAlert as AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import { reportError } from '../../lib/errorReporting';
import { fetchCountries, toCountryIdByName, type Country } from '../../lib/data/countries';
import { Button, Card } from '../ui';
import {
  COLUMNS,
  MAX_ROWS,
  mapStageToStatus,
  validateRapidResponseRow,
  type ParsedRow,
} from '../../lib/validation/bulkRapidResponseUpload';

interface BulkRapidResponseUploadProps {
  onDone?: () => void;
}

const escapeCSV = (val: unknown): string => {
  const str = val == null ? '' : String(val);
  return str.includes(',') || str.includes('"') || str.includes('\n')
    ? `"${str.replace(/"/g, '""')}"`
    : str;
};

interface SubmitResults {
  successCount: number;
  failures: { rowNumber: number; title: string; message: string }[];
}

// Bulk equivalent of RapidResponseCaseForm's "new case" path, for
// moderators — inserts straight into `cases` (moderation_status:
// 'approved'), the same as the single-case form does for a moderator
// creating a new rapid-response case. Key deadlines and a supporting
// document can't be set through the spreadsheet; add those afterward by
// editing the case.
const BulkRapidResponseUpload: React.FC<BulkRapidResponseUploadProps> = ({ onDone }) => {
  const { t } = useTranslation('rapidResponse');
  const [countries, setCountries] = useState<Country[]>([]);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<SubmitResults | null>(null);

  useEffect(() => {
    fetchCountries().then(({ data, error }) => {
      if (error) {
        toast.error(t('caseForm.errors.failedToLoadCountries'));
        return;
      }
      setCountries(data ?? []);
    });
  }, [t]);

  const countryIdByName = useMemo(() => toCountryIdByName(countries), [countries]);

  const downloadTemplate = () => {
    const header = COLUMNS.map(c => escapeCSV(c.header)).join(',');
    const example = COLUMNS.map(c => escapeCSV(c.example)).join(',');
    const csv = `${header}\n${example}\n`;
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk-rapid-response-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validateRow = (rawRow: Record<string, string>, rowNumber: number): ParsedRow =>
    validateRapidResponseRow(rawRow, rowNumber, countryIdByName, t);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      setResults(null);
      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        setFileError(
          reason?.code === 'file-invalid-type'
            ? t('bulkUpload.errors.fileInvalidType')
            : reason?.message || t('bulkUpload.errors.fileRejectedGeneric')
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
            setFileError(t('bulkUpload.errors.emptyFile'));
            return;
          }
          if (result.data.length > MAX_ROWS) {
            setFileError(t('bulkUpload.errors.tooManyRows', { max: MAX_ROWS, count: result.data.length }));
            return;
          }
          const parsed = result.data.map((rawRow, index) => validateRow(rawRow, index + 2));
          setRows(parsed);
        },
        error: (err) => {
          setFileError(err.message || t('bulkUpload.errors.fileRejectedGeneric'));
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
      if (!user) throw new Error(t('caseForm.errors.userNotAuthenticated'));

      // Fail open: only an explicit `false` blocks. Higher cap than the
      // partner-facing bulk upload since this is a trusted, direct-insert
      // moderator path.
      const { data: allowed, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
        p_key: `bulk-rapid-response-upload:${user.id}`,
        p_max_count: 10,
        p_window_seconds: 3600,
      });
      if (!rateLimitError && allowed === false) {
        toast.error(t('bulkUpload.errors.rateLimited'));
        setSubmitting(false);
        return;
      }

      // One row at a time, not a single array insert, so one bad row's
      // error is attributable and doesn't abort the whole batch.
      const failures: SubmitResults['failures'] = [];
      let successCount = 0;

      for (const row of validRows) {
        const d = row.data;
        const { error } = await supabase.from('cases').insert({
          case_reference: d.case_reference,
          case_filed: d.case_filed,
          case_summary: d.case_summary,
          country_id: d.country_id,
          priority_level: d.priority_level,
          rapid_response_stage: d.rapid_response_stage,
          status: mapStageToStatus(d.rapid_response_stage),
          client_name: d.client_name,
          client_email: d.client_email,
          client_phone: d.client_phone,
          key_deadlines: [],
          nature_of_case: d.nature_of_case,
          action_taken: d.action_taken,
          action_timeframe: d.action_timeframe,
          next_steps: d.next_steps,
          partner: d.partner,
          case_categories: [d.case_category],
          case_type: 'rapid-response',
          moderation_status: 'approved',
          pdf_url: '',
          user_id: user.id,
        });

        if (error) {
          console.error(`Bulk rapid response upload row ${row.rowNumber} failed:`, error);
          reportError(error, { context: 'bulkRapidResponseUpload.row', rowNumber: row.rowNumber, category: 'DATA' });
          failures.push({
            rowNumber: row.rowNumber,
            title: d.case_filed,
            message: t('bulkUpload.errors.unexpectedRowError'),
          });
        } else {
          successCount += 1;
        }
      }

      setResults({ successCount, failures });
      if (successCount > 0) {
        toast.success(t('bulkUpload.toasts.submitted', { count: successCount }));
      }
      if (failures.length === 0 && successCount > 0) {
        setRows(null);
      }
    } catch (error: any) {
      console.error('Bulk rapid response upload error:', error);
      reportError(error, { context: 'bulkRapidResponseUpload.submit', category: 'DATA' });
      toast.error(t('bulkUpload.errors.submitFailed'));
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
            <h3 className="text-lg font-medium text-stone-900">{t('bulkUpload.heading')}</h3>
            <p className="text-sm text-stone-600 mt-1">{t('bulkUpload.description')}</p>
          </div>
        </div>

        <ul className="text-sm text-stone-600 list-disc pl-5 space-y-1">
          <li>{t('bulkUpload.instructions.enums')}</li>
          <li>{t('bulkUpload.instructions.country')}</li>
          <li>{t('bulkUpload.instructions.deadlinesAndDocument')}</li>
          <li>{t('bulkUpload.instructions.maxRows', { max: MAX_ROWS })}</li>
        </ul>

        <Button type="button" variant="outline" onClick={downloadTemplate} icon={<Download className="h-4 w-4" />}>
          {t('bulkUpload.downloadTemplate')}
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
          <input {...getInputProps()} aria-label={t('bulkUpload.uploadAriaLabel')} />
          <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
          <p className="text-stone-600">{t('bulkUpload.dropzonePrompt')}</p>
          <p className="text-sm text-stone-500 mt-2">{t('bulkUpload.maxFileSize')}</p>
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
                {t('bulkUpload.validCount', { count: validRows.length })}
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-danger">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t('bulkUpload.invalidCount', { count: invalidRows.length })}
                </span>
              )}
              <button
                type="button"
                onClick={() => { setRows(null); setResults(null); }}
                className="ml-auto text-stone-500 hover:text-danger flex items-center gap-1"
              >
                <X className="h-4 w-4" aria-hidden="true" />
                {t('bulkUpload.clear')}
              </button>
            </div>

            <div className="overflow-x-auto border border-stone-200 rounded-md">
              <table className="min-w-full text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkUpload.table.row')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkUpload.table.reference')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkUpload.table.title')}</th>
                    <th className="px-3 py-2 text-left font-medium text-stone-600">{t('bulkUpload.table.status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {rows.map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="px-3 py-2 text-stone-500">{row.rowNumber}</td>
                      <td className="px-3 py-2 text-stone-700">{row.data.case_reference || '—'}</td>
                      <td className="px-3 py-2 text-stone-900">{row.data.case_filed || '—'}</td>
                      <td className="px-3 py-2">
                        {row.errors.length === 0 ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            {t('bulkUpload.table.ok')}
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
                  ? t('bulkUpload.submitting')
                  : t('bulkUpload.submitButton', { count: validRows.length })}
              </Button>
            </div>
          </div>
        )}

        {results && (
          <div className="border-t border-stone-200 pt-4 space-y-2">
            <p className="text-sm font-medium text-stone-900">
              {t('bulkUpload.results.summary', { success: results.successCount, failed: results.failures.length })}
            </p>
            {results.failures.length > 0 && (
              <ul className="text-sm text-danger space-y-1">
                {results.failures.map(f => (
                  <li key={f.rowNumber}>
                    {t('bulkUpload.results.failureLine', { row: f.rowNumber, title: f.title, message: f.message })}
                  </li>
                ))}
              </ul>
            )}
            {results.successCount > 0 && (
              <Button type="button" variant="outline" onClick={onDone}>
                {t('bulkUpload.results.viewCases')}
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default BulkRapidResponseUpload;
