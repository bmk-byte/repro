import React from 'react';
import { Calendar, Gavel, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from './ui';

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
  onClick: (id: string) => void;
}

const typeTone = (type: string): 'success' | 'warning' | 'info' | 'primary' | 'neutral' => {
  switch (type) {
    case 'Final Judgment':
      return 'success';
    case 'Interim Order':
      return 'warning';
    case 'Ruling':
      return 'info';
    case 'Consent Judgment':
    case 'Consent':
    case 'Default Judgment':
    case 'Default':
      return 'primary';
    default:
      return 'neutral';
  }
};

/** Memoized — see CaseCard for why `onClick` takes the id rather than a pre-bound closure. */
const JudgmentCard: React.FC<JudgmentCardProps> = ({ judgment, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-card hover:shadow-raised transition-shadow duration-200 border border-stone-100"
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Badge tone={typeTone(judgment.type)}>{judgment.type}</Badge>
          <div className="flex items-center text-sm text-stone-500">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(judgment.judgment_date).toLocaleDateString()}
          </div>
        </div>

        <h3 className="text-lg font-semibold text-stone-900 mb-3">
          {judgment.citation}
        </h3>

        <div className="flex items-center text-sm text-stone-500 mb-4">
          <Gavel className="h-4 w-4 mr-1" />
          {judgment.court}
        </div>

        <button
          onClick={() => onClick(judgment.id)}
          className="flex items-center text-primary hover:text-primary-dark transition-colors"
        >
          <span className="text-sm font-medium">View Details</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </button>
      </div>
    </motion.div>
  );
};

export default React.memo(JudgmentCard);
