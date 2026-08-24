import React from 'react';
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
  // Default stages for rapid response workflow if none provided
  const defaultStages = [
    { stage_name: 'Initial Contact', status: 'Pending' as const },
    { stage_name: 'Investigation & Arrest', status: 'Pending' as const },
    { stage_name: 'Local Mediation', status: 'Pending' as const },
    { stage_name: 'Medical & Counselling', status: 'Pending' as const },
    { stage_name: 'Legal Prosecution', status: 'Pending' as const },
    { stage_name: 'Court Trial', status: 'Pending' as const },
    { stage_name: 'Post-Trial', status: 'Pending' as const }
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
              Case Progress
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-primary">
              {completionPercentage}%
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
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
                <AlertCircle className="h-5 w-5 text-gray-400 mr-2" />
              )}
              <span className={`text-sm ${
                stage.status === 'Completed' ? 'text-green-700' : 
                stage.status === 'In Progress' ? 'text-blue-700' : 
                'text-gray-500'
              }`}>
                {stage.stage_name}
              </span>
            </div>
            {showCounts && stage.count !== undefined && (
              <span className="text-sm font-medium text-gray-700">
                {stage.count}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="flex justify-between text-xs text-gray-500 mt-2">
        <span>{completedStages} completed</span>
        <span>{inProgressStages} in progress</span>
        <span>{totalStages - completedStages - inProgressStages} pending</span>
      </div>
    </div>
  );
};

export default CaseStageProgress;