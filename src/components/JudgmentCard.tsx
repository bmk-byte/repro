import React from 'react';
import { Calendar, Gavel, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface JudgmentCardProps {
  judgment: {
    id: string;
    citation: string;
    court: string;
    judgment_date: string;
    countries: {
      name: string;
    };
    type: string;
  };
  onClick: () => void;
}

const JudgmentCard: React.FC<JudgmentCardProps> = ({ judgment, onClick }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Final Judgment':
        return 'bg-green-100 text-green-800';
      case 'Interim Order':
        return 'bg-yellow-100 text-yellow-800';
      case 'Ruling':
        return 'bg-blue-100 text-blue-800';
      case 'Consent Judgment':
      case 'Consent':
        return 'bg-purple-100 text-purple-800';
      case 'Default Judgment':
      case 'Default':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(judgment.type)}`}>
            {judgment.type}
          </span>
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(judgment.judgment_date).toLocaleDateString()}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {judgment.citation}
        </h3>

        <div className="flex items-center text-sm text-gray-500 mb-4">
          <Gavel className="h-4 w-4 mr-1" />
          {judgment.court}
        </div>

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

export default JudgmentCard;