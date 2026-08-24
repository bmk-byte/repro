import React from 'react';
import { Calendar, MapPin, ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

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
  onClick: () => void;
}

const CaseCard: React.FC<CaseCardProps> = ({ caseData, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isRapidResponse = caseData.case_type === 'rapid-response';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300"
    >
      <div className="p-6">
        {/* Status and Date */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-wrap gap-2">
            {/* Only show rapid response label on cards */}
            {isRapidResponse && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 flex items-center">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rapid Response
              </span>
            )}
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(caseData.created_at).toLocaleDateString()}
          </div>
        </div>

        {/* Case Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
          {caseData.case_filed}
        </h3>

        {/* Location and Stage */}
        <div className="flex items-center text-sm text-gray-500 mb-4">
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

        {/* View Details Button */}
        <button
          onClick={onClick}
          className="flex items-center text-primary hover:text-primary-dark transition-colors"
        >
          <span className="text-sm font-medium">View Details</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </motion.div>
  );
};

export default CaseCard;