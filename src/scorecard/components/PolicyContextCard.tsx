import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Award, ArrowRight } from 'lucide-react';
import { fetchLatestPublishedScorecard, type LatestPublishedScorecard } from '../../lib/data/scorecard';
import { Badge } from '../../components/ui';

interface PolicyContextCardProps {
  countryId: string | null | undefined;
  countryName?: string | null;
}

const TIER_TONE: Record<string, 'success' | 'warning' | 'danger'> = {
  Progressive: 'success',
  Emergent: 'warning',
  Regressive: 'danger',
};

/**
 * Shown on a case's detail page: surfaces that case's country's latest
 * *published* Maputo Protocol scorecard tier/score, linking out to the
 * full public analysis. Purely navigational/contextual — this deliberately
 * does not attempt to assert any correlation between a country's scorecard
 * tier and its litigation activity (that's a research question, not
 * something to imply in the UI).
 */
const PolicyContextCard: React.FC<PolicyContextCardProps> = ({ countryId, countryName }) => {
  const { t } = useTranslation('scorecard');
  const navigate = useNavigate();
  const [scorecard, setScorecard] = React.useState<LatestPublishedScorecard | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchLatestPublishedScorecard(countryId).then((result) => {
      if (!cancelled) {
        setScorecard(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [countryId]);

  if (loading || !scorecard) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/scorecard/analysis/country/${countryId}`)}
      className="w-full text-left bg-white rounded-xl shadow-card hover:shadow-raised transition-shadow duration-200 border border-stone-100 p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Award className="h-5 w-5 text-primary flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-stone-900">
              {countryName ? t('policyContext.titleWithCountry', { country: countryName }) : t('policyContext.title')}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {scorecard.composite_score !== null
                ? t('policyContext.compositeScore', { score: Math.round(scorecard.composite_score) })
                : t('policyContext.publishedAssessment')}
              {scorecard.equity_penalty_applied ? ` · ${t('policyContext.equityPenaltyApplied')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {scorecard.tier && (
            <Badge tone={TIER_TONE[scorecard.tier] ?? 'neutral'}>
              {t(`tier.${scorecard.tier.toLowerCase()}`)}
            </Badge>
          )}
          <ArrowRight className="h-4 w-4 text-stone-400" />
        </div>
      </div>
    </button>
  );
};

export default PolicyContextCard;
