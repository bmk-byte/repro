import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Info, FileText } from 'lucide-react';
import type { ScorecardIndicator as Indicator, ScorecardIndicatorScore as IndicatorScore, ScorecardPillar as Pillar } from '../types/database';

interface ScoreInputTableProps {
  pillar: Pillar;
  indicators: Indicator[];
  scores: Map<string, IndicatorScore>;
  onScoreChange: (indicatorId: string, score: number) => void;
  onEvidenceClick: (indicator: Indicator, score?: IndicatorScore) => void;
  onIndicatorInfoClick: (indicator: Indicator) => void;
}

export function ScoreInputTable({
  pillar,
  indicators,
  scores,
  onScoreChange,
  onEvidenceClick,
  onIndicatorInfoClick,
}: ScoreInputTableProps) {
  const { t } = useTranslation('scorecard');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Map<string, string>>(new Map());

  const getScore = (indicatorId: string): number => {
    return scores.get(indicatorId)?.score ?? 0;
  };

  const getNormalizedScore = (indicatorId: string): number => {
    return scores.get(indicatorId)?.normalized_score ?? 0;
  };

  const hasEvidence = (indicatorId: string): boolean => {
    const score = scores.get(indicatorId);
    return !!(score?.evidence_notes && score.evidence_notes.trim().length > 0);
  };

  const getInputValue = (indicatorId: string): string => {
    if (editingId === indicatorId && inputValues.has(indicatorId)) {
      return inputValues.get(indicatorId)!;
    }
    return String(getScore(indicatorId));
  };

  const handleInputChange = (indicatorId: string, value: string) => {
    setInputValues(prev => new Map(prev).set(indicatorId, value));
  };

  const handleInputBlur = (indicatorId: string) => {
    const value = inputValues.get(indicatorId);

    if (value === undefined || value === '') {
      setInputValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(indicatorId);
        return newMap;
      });
      setEditingId(null);
      return;
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      setInputValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(indicatorId);
        return newMap;
      });
      setEditingId(null);
      return;
    }

    const clampedValue = Math.max(0, Math.min(4, Math.round(numValue)));

    onScoreChange(indicatorId, clampedValue);

    setInputValues(prev => {
      const newMap = new Map(prev);
      newMap.delete(indicatorId);
      return newMap;
    });
    setEditingId(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, indicatorId: string) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setInputValues(prev => {
        const newMap = new Map(prev);
        newMap.delete(indicatorId);
        return newMap;
      });
      setEditingId(null);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-4">
        <h3 className="text-xl font-bold text-white">{pillar.title}</h3>
        <p className="text-primary-100 text-sm mt-1">{t('scoreInputTable.weight', { weight: pillar.weight })}</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {t('scoreInputTable.code')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                {t('scoreInputTable.indicator')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                {t('scoreInputTable.score')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-32">
                {t('scoreInputTable.normalized')}
              </th>
              <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-24">
                {t('scoreInputTable.actions')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {indicators.map((indicator) => {
              const normalized = getNormalizedScore(indicator.id);
              const hasEvidenceNotes = hasEvidence(indicator.id);

              return (
                <tr
                  key={indicator.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm font-semibold text-gray-700">
                      {indicator.code}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {indicator.title}
                        </div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {indicator.definition}
                        </div>
                      </div>
                      <button
                        onClick={() => onIndicatorInfoClick(indicator)}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-primary-600 transition-colors"
                        title={t('scoreInputTable.viewDetails')}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="1"
                      value={getInputValue(indicator.id)}
                      onChange={(e) => handleInputChange(indicator.id, e.target.value)}
                      onFocus={() => setEditingId(indicator.id)}
                      onBlur={() => handleInputBlur(indicator.id)}
                      onKeyDown={(e) => handleKeyDown(e, indicator.id)}
                      className={`w-20 px-3 py-2 text-center border rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 font-semibold transition-colors text-gray-900 bg-white ${
                        editingId === indicator.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-300'
                      }`}
                      placeholder={t('scoreInputTable.placeholder')}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-semibold text-gray-700">
                      {normalized.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() =>
                        onEvidenceClick(indicator, scores.get(indicator.id))
                      }
                      className={`p-2 rounded-md transition-colors ${
                        hasEvidenceNotes
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={hasEvidenceNotes ? t('scoreInputTable.editEvidence') : t('scoreInputTable.addEvidence')}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
