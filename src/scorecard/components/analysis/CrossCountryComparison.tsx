import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronUp, ChevronDown, ChevronRight, Download } from 'lucide-react';
import type { CountryAnalysisData } from '../../lib/api';
import type { ScorecardPillar as Pillar } from '../../types/database';
import { Badge, Button } from '../../../components/ui';

interface CrossCountryComparisonProps {
  data: CountryAnalysisData[];
  pillars: Pillar[];
  onExport: () => void;
}

type SortField = 'country' | 'region' | 'composite' | 'tier' | string;
type SortDirection = 'asc' | 'desc';

const TIER_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Progressive: 'success',
  Emergent: 'warning',
  Regressive: 'danger',
};

export function CrossCountryComparison({ data, pillars, onExport }: CrossCountryComparisonProps) {
  const { t } = useTranslation('scorecard');
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>('composite');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    return data.filter(
      (d) =>
        d.submission?.composite_score !== null &&
        d.submission?.composite_score !== undefined
    );
  }, [data]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      if (sortField === 'country') {
        aValue = a.country.name;
        bValue = b.country.name;
      } else if (sortField === 'region') {
        aValue = a.country.region;
        bValue = b.country.region;
      } else if (sortField === 'composite') {
        aValue = a.submission?.composite_score ?? -1;
        bValue = b.submission?.composite_score ?? -1;
      } else if (sortField === 'tier') {
        const tierOrder = { Progressive: 3, Emergent: 2, Regressive: 1 };
        aValue = a.submission?.tier ? tierOrder[a.submission.tier] : 0;
        bValue = b.submission?.tier ? tierOrder[b.submission.tier] : 0;
      } else {
        const aPillar = a.pillarResults.find((pr) => pr.pillar_id === sortField);
        const bPillar = b.pillarResults.find((pr) => pr.pillar_id === sortField);
        aValue = aPillar?.average_score ?? -1;
        bValue = bPillar?.average_score ?? -1;
      }

      if (typeof aValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleCountrySelection = (countryId: string) => {
    const newSelection = new Set(selectedCountries);
    if (newSelection.has(countryId)) {
      newSelection.delete(countryId);
    } else {
      newSelection.add(countryId);
    }
    setSelectedCountries(newSelection);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const getScoreColor = (score: number): string => {
    if (score >= 70) return 'bg-success-light text-success-dark';
    if (score >= 40) return 'bg-warning-light text-warning-dark';
    return 'bg-danger-light text-danger-dark';
  };

  return (
    <div className="bg-white rounded-lg border border-stone-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-stone-900">{t('crossCountryComparison.heading')}</h2>
          <p className="text-sm text-stone-600 mt-1">
            {t('crossCountryComparison.subheading', { count: filteredData.length })}
          </p>
        </div>
        <Button onClick={onExport} icon={<Download className="w-4 h-4" />}>
          {t('crossCountryComparison.exportData')}
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedCountries.size === filteredData.length && filteredData.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCountries(new Set(filteredData.map((d) => d.country.id)));
                    } else {
                      setSelectedCountries(new Set());
                    }
                  }}
                  className="rounded"
                />
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                onClick={() => handleSort('country')}
              >
                <div className="flex items-center gap-1">
                  {t('crossCountryComparison.country')}
                  <SortIcon field="country" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                onClick={() => handleSort('region')}
              >
                <div className="flex items-center gap-1">
                  {t('regionalAnalysis.region')}
                  <SortIcon field="region" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                onClick={() => handleSort('composite')}
              >
                <div className="flex items-center gap-1">
                  {t('crossCountryComparison.score')}
                  <SortIcon field="composite" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                onClick={() => handleSort('tier')}
              >
                <div className="flex items-center gap-1">
                  {t('countryDetail.tier')}
                  <SortIcon field="tier" />
                </div>
              </th>
              {pillars.map((pillar) => (
                <th
                  key={pillar.id}
                  className="px-4 py-3 text-left text-xs font-medium text-stone-700 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                  onClick={() => handleSort(pillar.id)}
                  title={pillar.title}
                >
                  <div className="flex items-center gap-1">
                    {pillar.code}
                    <SortIcon field={pillar.id} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-stone-200">
            {sortedData.map((countryData) => (
              <tr
                key={countryData.country.id}
                className="hover:bg-primary-50 cursor-pointer transition-colors group"
                onClick={() => navigate(`/scorecard/analysis/country/${countryData.country.id}`)}
              >
                <td
                  className="px-4 py-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={selectedCountries.has(countryData.country.id)}
                    onChange={() => toggleCountrySelection(countryData.country.id)}
                    className="rounded"
                  />
                </td>
                <td className="px-4 py-3 text-sm font-medium text-stone-900">
                  <div className="flex items-center gap-1.5">
                    {countryData.country.name}
                    <ChevronRight className="w-3.5 h-3.5 text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-stone-600">
                  {countryData.country.region}
                </td>
                <td className="px-4 py-3 text-sm">
                  {countryData.submission?.composite_score !== null &&
                  countryData.submission?.composite_score !== undefined ? (
                    <span
                      className={`inline-flex px-2 py-1 rounded font-medium ${getScoreColor(
                        countryData.submission.composite_score
                      )}`}
                    >
                      {countryData.submission.composite_score.toFixed(1)}
                    </span>
                  ) : (
                    <span className="text-stone-400">{t('countryDetail.notAvailable')}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {countryData.submission?.tier ? (
                    <Badge tone={TIER_TONE[countryData.submission.tier] ?? 'neutral'}>
                      {t(`tier.${countryData.submission.tier.toLowerCase()}`)}
                    </Badge>
                  ) : (
                    <span className="text-stone-400">{t('countryDetail.notAvailable')}</span>
                  )}
                </td>
                {pillars.map((pillar) => {
                  const pillarResult = countryData.pillarResults.find(
                    (pr) => pr.pillar_id === pillar.id
                  );
                  return (
                    <td key={pillar.id} className="px-4 py-3 text-sm">
                      {pillarResult ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 rounded-full bg-primary-200"
                            style={{ width: '40px' }}
                          >
                            <div
                              className="h-2 rounded-full bg-primary-600"
                              style={{
                                width: `${(pillarResult.average_score / 100) * 40}px`,
                              }}
                            />
                          </div>
                          <span className="text-stone-700">
                            {pillarResult.average_score.toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-stone-400">{t('countryDetail.notAvailable')}</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedCountries.size > 0 && (
        <div className="mt-4 p-4 bg-primary-50 rounded-lg">
          <p className="text-sm text-primary-900">
            {t('crossCountryComparison.countriesSelected', { count: selectedCountries.size })}
          </p>
        </div>
      )}
    </div>
  );
}
