import React from 'react';
import { Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { handleQueryError } from '../lib/errorHandling';

interface CaseFilterProps {
  onFilterChange: (organization: string) => void;
}

const CaseFilter: React.FC<CaseFilterProps> = ({ onFilterChange }) => {
  const [organizations, setOrganizations] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cases')
        .select('partner')
        .not('partner', 'is', null);

      if (error) throw error;

      const uniqueOrganizations = Array.from(
        new Set(data.map(item => item.partner))
      ).sort();

      setOrganizations(uniqueOrganizations);
    } catch (error) {
      handleQueryError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <select
            onChange={(e) => onFilterChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={loading}
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org} value={org}>
                {org}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CaseFilter;