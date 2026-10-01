// Export helpers for the Scorecard analysis dashboard. Uses Repropulse's
// `toCsv`/`downloadCsv` (src/lib/csv.ts) — the same CSV-injection-safe
// helper used by every other export path in the app.
import type { CountryAnalysisData } from './api';
import type { ScorecardPillar as Pillar, ScorecardIndicator as Indicator } from '../types/database';
import { toCsv, downloadCsv } from '../../lib/csv';

export function exportToCSV(data: CountryAnalysisData[], pillars: Pillar[], indicators: Indicator[]): string {
  const headers = ['Country', 'Region', 'Composite Score', 'Tier', 'Equity Penalty'];

  pillars.forEach((pillar) => {
    headers.push(`${pillar.code} - ${pillar.title}`);
  });

  indicators.forEach((indicator) => {
    headers.push(`${indicator.code} - ${indicator.title}`);
  });

  const rows: (string | number)[][] = data.map((countryData) => {
    const row: (string | number)[] = [
      countryData.country.name,
      countryData.country.region ?? '',
      countryData.submission?.composite_score?.toFixed(2) || 'N/A',
      countryData.submission?.tier || 'N/A',
      countryData.submission?.equity_penalty_applied ? 'Yes' : 'No',
    ];

    pillars.forEach((pillar) => {
      const pillarResult = countryData.pillarResults.find((pr) => pr.pillar_id === pillar.id);
      row.push(pillarResult?.average_score.toFixed(2) || 'N/A');
    });

    indicators.forEach((indicator) => {
      const score = countryData.indicatorScores.find((s) => s.indicator_id === indicator.id);
      row.push(score?.normalized_score.toFixed(2) || 'N/A');
    });

    return row;
  });

  return toCsv([headers, ...rows]);
}

export function downloadCSV(csvContent: string, filename: string): void {
  downloadCsv(csvContent, filename);
}

export function exportToJSON(data: unknown, filename: string): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
