import React from 'react';
import { Calendar, MapPin, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './ui';

interface CaseCardProps {
  caseData: {
    id: string;
    case_filed: string;
    created_at: string;
    status: string;
    case_type: string;
    priority_level?: string;
    case_categories?: string[];
    rapid_response_stage?: string;
    countries: {
      name: string;
    };
  };
  onClick: (id: string) => void;
}

const statusTone = (status: string): 'success' | 'info' | 'warning' | 'neutral' => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'success';
    case 'in_progress':
      return 'info';
    case 'pending':
      return 'warning';
    default:
      return 'neutral';
  }
};

/**
 * Memoized — this renders inside a list of potentially many cases. `onClick`
 * takes the case id (not a pre-bound closure) so the parent can pass a
 * stable callback reference (e.g. the setState setter directly), letting
 * memo actually skip re-renders for unchanged cards.
 */
const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick }) => {
  const isRapidResponse = caseData.case_type === 'rapid-response';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-card hover:shadow-raised transition-shadow duration-200 border border-stone-100"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-wrap gap-2">
            {isRapidResponse && (
              <Badge tone="danger" icon={<AlertCircle className="h-3 w-3" />}>
                Rapid Response
              </Badge>
            )}
            <Badge tone={statusTone(caseData.status)}>{caseData.status.replace('_', ' ')}</Badge>
          </div>
          <div className="flex items-center text-sm text-stone-500">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(caseData.created_at).toLocaleDateString()}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-stone-900 mb-3 line-clamp-2">
          {caseData.case_filed}
        </h3>

        <div className="flex items-center text-sm text-stone-500 mb-4">
          <MapPin className="h-4 w-4 mr-1" />
          {caseData.countries?.name || 'Unknown Location'}

          {isRapidResponse && caseData.rapid_response_stage && (
            <>
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" />
              <span className="capitalize">{caseData.rapid_response_stage.replace('-', ' ')}</span>
            </>
          )}
        </div>

        <button
          onClick={() => onClick(caseData.id)}
          className="flex items-center text-primary hover:text-primary-dark transition-colors"
        >
          <span className="text-sm font-medium">View Details</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(CaseCard);
