import { useTranslation } from 'react-i18next';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { Badge } from '../../components/ui';

interface CompositeResultsProps {
  compositeScore: number;
  finalScore: number;
  tier: string;
  equityPenaltyApplied: boolean;
  insights: string[];
}

const TIER_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Progressive: 'success',
  Emergent: 'warning',
  Regressive: 'danger',
};

export function CompositeResults({
  compositeScore,
  finalScore,
  tier,
  equityPenaltyApplied,
  insights,
}: CompositeResultsProps) {
  const { t } = useTranslation('scorecard');

  return (
    <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-6 py-5">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-7 h-7" />
          {t('compositeResults.heading')}
        </h2>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-600 font-semibold mb-2">
              {t('compositeResults.compositeScore')}
            </div>
            <div className="text-5xl font-bold text-gray-900">
              {compositeScore.toFixed(1)}%
            </div>
          </div>

          {equityPenaltyApplied && (
            <div className="text-center p-6 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-sm text-orange-700 font-semibold mb-2">
                {t('compositeResults.equityPenalty')}
              </div>
              <div className="text-5xl font-bold text-orange-600">-5%</div>
              <div className="text-xs text-orange-600 mt-2">
                {t('compositeResults.appliedDueToLowEquity')}
              </div>
            </div>
          )}

          <div
            className={`text-center p-6 rounded-lg border ${
              equityPenaltyApplied ? 'md:col-span-1' : 'md:col-span-2'
            } bg-gradient-to-br from-primary-50 to-orange-50 border-primary-200`}
          >
            <div className="text-sm text-primary-700 font-semibold mb-2">
              {t('compositeResults.finalScore')}
            </div>
            <div className="text-5xl font-bold text-primary-900">
              {finalScore.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm text-gray-600 font-semibold mb-3 text-center">
            {t('compositeResults.classificationTier')}
          </div>
          <div className="flex justify-center">
            <Badge tone={TIER_TONE[tier] ?? 'neutral'} className="text-2xl px-8 py-3 font-bold">
              {t(`tier.${tier.toLowerCase()}`)}
            </Badge>
          </div>
        </div>

        {equityPenaltyApplied && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-800">
              <strong>{t('compositeResults.equityPenaltyAppliedLabel')}</strong> {t('compositeResults.equityPenaltyAppliedDetail')}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            {t('compositeResults.keyInsights')}
          </h3>
          <div className="space-y-3">
            {insights.map((insight, index) => (
              <div
                key={index}
                className="p-4 bg-primary-50 border border-primary-200 rounded-lg"
              >
                <p className="text-sm text-gray-800 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
