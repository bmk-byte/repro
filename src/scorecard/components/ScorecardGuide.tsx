import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, FileText, BarChart3, Download, Info } from 'lucide-react';

interface ScorecardGuideProps {
  expanded: boolean;
  onToggle: () => void;
}

const PILLAR_COLORS = [
  'bg-primary-100 text-primary-700',
  'bg-orange-100 text-orange-700',
  'bg-yellow-100 text-yellow-700',
  'bg-green-100 text-green-700',
  'bg-primary-200 text-primary-800',
  'bg-gray-100 text-gray-700',
  'bg-slate-100 text-slate-700',
];

const STEP_COLORS = [
  { bg: 'bg-primary-50 border-primary-200', badge: 'bg-primary-600' },
  { bg: 'bg-green-50 border-green-200', badge: 'bg-green-600' },
  { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-600' },
  { bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-600' },
];

/**
 * How the scorecard works, as a permanent collapsible strip in the page
 * flow rather than a dismiss-once modal. First-time visitors see it
 * expanded (see ScorecardPage.tsx's `maputo-scorecard-visited` check); the
 * header bar itself never goes away, so "how does this work?" stays one
 * click away instead of being lost after the first close.
 */
export function ScorecardGuide({ expanded, onToggle }: ScorecardGuideProps) {
  const { t } = useTranslation('scorecard');

  const steps = t('welcomeModal.steps', { returnObjects: true }) as { title: string; description: string }[];
  const pillars = t('welcomeModal.pillars', { returnObjects: true }) as { code: string; title: string; weight: string }[];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Info className="w-4.5 h-4.5 text-primary-600 flex-shrink-0" />
          <span className="text-sm font-semibold text-gray-900 truncate">{t('welcomeModal.title')}</span>
          <span className="hidden sm:inline text-xs text-gray-500 truncate">{t('welcomeModal.subtitle')}</span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="px-6 pb-6 pt-1 border-t border-gray-100">
          <section className="mb-7 mt-5">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {t('welcomeModal.aboutThisTool')}
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed mb-3">
              {t('welcomeModal.aboutParagraph1')}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {t('welcomeModal.aboutParagraph2')}
            </p>
          </section>

          <section className="mb-7">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('welcomeModal.howToUse')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {steps.map((step, index) => (
                <div key={step.title} className={`p-4 border rounded-lg ${STEP_COLORS[index % STEP_COLORS.length].bg}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-7 h-7 text-white rounded-full flex items-center justify-center font-bold text-sm ${STEP_COLORS[index % STEP_COLORS.length].badge}`}>
                      {index + 1}
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm">{step.title}</h3>
                  </div>
                  <p className="text-xs text-gray-700 ml-10">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-7">
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('welcomeModal.pillarsFramework')}
            </h2>
            <div className="space-y-2">
              {pillars.map((pillar, index) => (
                <div
                  key={pillar.code}
                  className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <span
                    className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${PILLAR_COLORS[index % PILLAR_COLORS.length]}`}
                  >
                    {pillar.code}
                  </span>
                  <span className="flex-1 font-medium text-gray-900 text-sm">
                    {pillar.title}
                  </span>
                  <span className="text-xs font-semibold text-gray-600">
                    {pillar.weight}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">
              {t('welcomeModal.keyFeatures')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex gap-3">
                <FileText className="w-5 h-5 text-primary-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {t('welcomeModal.evidenceTracking')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {t('welcomeModal.evidenceTrackingDescription')}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <BarChart3 className="w-5 h-5 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {t('welcomeModal.visualAnalytics')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {t('welcomeModal.visualAnalyticsDescription')}
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <Download className="w-5 h-5 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {t('welcomeModal.exportReports')}
                  </div>
                  <div className="text-xs text-gray-600">
                    {t('welcomeModal.exportReportsDescription')}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
