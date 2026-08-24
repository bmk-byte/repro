import React from 'react';
import { Files, TrendingUp, Activity, Gavel } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  change: string;
  type: 'cases' | 'success' | 'judgments';
  imageUrl?: string;
  onClick?: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, change, type, imageUrl, onClick }) => {
  const isPositive = change.startsWith('+');

  const getIcon = () => {
    switch (type) {
      case 'cases':
        return <Files className="h-6 w-6 text-white" />;
      case 'success':
        return <TrendingUp className="h-6 w-6 text-white" />;
      case 'judgments':
        return <Gavel className="h-6 w-6 text-white" />;
      default:
        return <Files className="h-6 w-6 text-white" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className="group w-full text-left cursor-pointer relative overflow-hidden rounded-lg p-6 transition-all duration-300 transform hover:scale-105"
    >
      {/* Background Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover   transition-opacity duration-300"
        />
      )}
      
      {/* Color Overlay */}
      <div className="absolute inset-0 transition-colors duration-300" />
      
      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-white text-l font-medium uppercase">{title}</h1>
          <div className="p-2 rounded-lg">
            {getIcon()}
          </div>
        </div>
        <div className="flex items-baseline">
          <p className="text-2xl font-semibold text-white">{value}</p>
          <span
            className={`ml-2 text-sm font-medium ${
              isPositive ? 'text-green-200' : 'text-red-200'
            }`}
          >
            {change}
          </span>
        </div>
      </div>
    </button>
  );
};

export default DashboardCard;