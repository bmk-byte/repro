import { useTranslation } from 'react-i18next';
import { FileText, BarChart3, Download } from 'lucide-react';
import { Modal, Button } from '../../components/ui';

interface WelcomeModalProps {
  onClose: () => void;
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

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const { t } = useTranslation('scorecard');

  const steps = t('welcomeModal.steps', { returnObjects: true }) as { title: string; description: string }[];
  const pillars = t('welcomeModal.pillars', { returnObjects: true }) as { code: string; title: string; weight: string }[];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={t('welcomeModal.title')}
      size="xl"
      footer={<Button onClick={onClose} className="w-full">{t('welcomeModal.getStarted')}</Button>}
    >
      <p className="text-sm text-gray-500 -mt-2 mb-6">{t('welcomeModal.subtitle')}</p>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          {t('welcomeModal.aboutThisTool')}
        </h2>
        <p className="text-gray-700 leading-relaxed mb-4">
          {t('welcomeModal.aboutParagraph1')}
        </p>
        <p className="text-gray-700 leading-relaxed">
          {t('welcomeModal.aboutParagraph2')}
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('welcomeModal.howToUse')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {steps.map((step, index) => (
            <div key={step.title} className={`p-5 border rounded-lg ${STEP_COLORS[index % STEP_COLORS.length].bg}`}>
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-8 h-8 text-white rounded-full flex items-center justify-center font-bold ${STEP_COLORS[index % STEP_COLORS.length].badge}`}>
                  {index + 1}
                </div>
                <h3 className="font-bold text-gray-900">{step.title}</h3>
              </div>
              <p className="text-sm text-gray-700 ml-11">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t('welcomeModal.pillarsFramework')}
        </h2>
        <div className="space-y-3">
          {pillars.map((pillar, index) => (
            <div
              key={pillar.code}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span
                className={`px-3 py-1 rounded-md font-bold text-sm ${PILLAR_COLORS[index % PILLAR_COLORS.length]}`}
              >
                {pillar.code}
              </span>
              <span className="flex-1 font-medium text-gray-900">
                {pillar.title}
              </span>
              <span className="text-sm font-semibold text-gray-600">
                {pillar.weight}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
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
    </Modal>
  );
}
