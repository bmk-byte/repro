import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface CaseStageProgressProps {
  stages?: {
    stage_name: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    count?: number;
  }[];
  showCounts?: boolean;
}

const CaseStageProgress: React.FC<CaseStageProgressProps> = ({ 
  stages = [],
  showCounts = false
}) => {
  const { t } = useTranslation('rapidResponse');
  // Default stages for rapid response workflow if none provided
  const defaultStages = [
    { stage_name: t('progress.stageNames.initialContact'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.investigationAndArrest'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.localMediation'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.medicalAndCounselling'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.legalProsecution'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.courtTrial'), status: 'Pending' as const },
    { stage_name: t('progress.stageNames.postTrial'), status: 'Pending' as const }
  ];

  // Use provided stages or default stages if none provided
  const displayStages = stages.length > 0 ? stages : defaultStages;
  
  // Calculate completion percentage
  const totalStages = displayStages.length;
  const completedStages = displayStages.filter(stage => stage.status === 'Completed').length;
  const inProgressStages = displayStages.filter(stage => stage.status === 'In Progress').length;
  const completionPercentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="relative pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-primary">
              {t('progress.caseProgress')}
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-primary">
              {completionPercentage}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-stone-200">
          <div 
            style={{ width: `${completionPercentage}%` }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
          ></div>
        </div>
      </div>

      {/* Stages list */}
      <div className="space-y-2">
        {displayStages.map((stage, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center">
              {stage.status === 'Completed' ? (
                <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              ) : stage.status === 'In Progress' ? (
                <Clock className="h-5 w-5 text-blue-500 mr-2" />
              ) : (
                <AlertCircle className="h-5 w-5 text-stone-400 mr-2" />
              )}
              <span className={`text-sm ${
                stage.status === 'Completed' ? 'text-green-700' : 
                stage.status === 'In Progress' ? 'text-blue-700' : 
                'text-stone-500'
              }`}>
                {stage.stage_name}
              </span>
            </div>
            {showCounts && stage.count !== undefined && (
              <span className="text-sm font-medium text-stone-700">
                {stage.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs text-stone-500 mt-2">
        <span>{t('progress.completed', { count: completedStages })}</span>
        <span>{t('progress.inProgress', { count: inProgressStages })}</span>
        <span>{t('progress.pending', { count: totalStages - completedStages - inProgressStages })}</span>
      </div>
    </div>
  );
};

export default CaseStageProgress;