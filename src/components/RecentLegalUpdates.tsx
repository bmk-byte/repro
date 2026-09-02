import React from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, Scale, Gavel } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { LoadingState } from './ui';

interface LegalUpdate {
  id: string;
  title: string;
  citation: string;
  court: string;
  judgment_date: string;
  flynote: string;
  case_summary: string;
  case_categories: string[];
  countries: {
    name: string;
  };
}

const RecentLegalUpdates = () => {
  const [updates, setUpdates] = React.useState<LegalUpdate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedArea, setSelectedArea] = React.useState('all');
  const [selectedJurisdiction, setSelectedJurisdiction] = React.useState('all');
  const [dateRange, setDateRange] = React.useState({
    start: '',
    end: ''
  });
  const [categories, setCategories] = React.useState<string[]>([]);
  const [jurisdictions, setJurisdictions] = React.useState<{id: string, name: string}[]>([]);

  React.useEffect(() => {
    fetchCategories();
    fetchJurisdictions();
  }, []);

  React.useEffect(() => {
    fetchUpdates();
  }, [selectedArea, selectedJurisdiction, dateRange]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('judgments')
        .select('case_categories')
        .not('case_categories', 'is', null);

      if (error) throw error;

      // Flatten and get unique categories
      const allCategories = data?.flatMap(item => item.case_categories || []) || [];
      const uniqueCategories = Array.from(new Set(allCategories));
      setCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if needed
      setCategories([
        'Access to Safe Abortion',
        'Maternal Health and Mortality',
        'Sexual and Gender-Based Violence (SGBV)',
        'Reproductive Healthcare',
        'Family Planning'
      ]);
    }
  };

  const fetchJurisdictions = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setJurisdictions(data || []);
    } catch (err) {
      console.error('Error fetching jurisdictions:', err);
    }
  };

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('judgments')
        .select(`
          id,
          citation,
          court,
          judgment_date,
          flynote,
          case_summary,
          case_categories,
          countries (name)
        `)
        .order('judgment_date', { ascending: false })
        .limit(5);

      if (selectedArea !== 'all') {
        query = query.contains('case_categories', [selectedArea]);
      }

      if (selectedJurisdiction !== 'all') {
        query = query.eq('country_id', selectedJurisdiction);
      }

      if (dateRange.start) {
        query = query.gte('judgment_date', dateRange.start);
      }

      if (dateRange.end) {
        query = query.lte('judgment_date', dateRange.end);
      }

      const { data, error } = await query;

      if (error) throw error;

      setUpdates(data || []);
    } catch (err) {
      console.error('Error fetching legal updates:', err);
      setError('Failed to load recent legal updates');
      toast.error('Failed to load recent legal updates');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-stone-900">Recent Legal Updates</h2>
        <div className="flex items-center space-x-4">
          <select
            value={selectedArea}
            onChange={(e) => setSelectedArea(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>

          <select
            value={selectedJurisdiction}
            onChange={(e) => setSelectedJurisdiction(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Jurisdictions</option>
            {jurisdictions.map(jurisdiction => (
              <option key={jurisdiction.id} value={jurisdiction.id}>{jurisdiction.name}</option>
            ))}
          </select>

          <div className="flex items-center space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <span className="text-stone-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <LoadingState label="Loading legal updates…" />
      ) : error ? (
        <div className="text-center py-12 text-red-500">
          {error}
        </div>
      ) : updates.length === 0 ? (
        <div className="text-center py-12 text-stone-500">
          No recent legal updates found
        </div>
      ) : (
        <div className="space-y-6">
          {updates.map((update, index) => (
            <motion.div
              key={update.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className="border-b border-stone-200 last:border-0 pb-6 last:pb-0"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-sm text-stone-500">
                      {formatDate(update.judgment_date)}
                    </span>
                    <span className="text-sm text-stone-400">•</span>
                    <span className="text-sm font-medium text-primary">
                      {update.countries?.name || 'Unknown'}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-stone-900 mb-2">
                    {update.citation}
                  </h3>
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center text-stone-600">
                      <Gavel className="h-4 w-4 mr-1" />
                      <span className="text-sm">{update.court}</span>
                    </div>
                    {update.case_categories && update.case_categories.length > 0 && (
                      <div className="flex items-center text-stone-600">
                        <Scale className="h-4 w-4 mr-1" />
                        <span className="text-sm">{update.case_categories[0]}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-stone-600 line-clamp-2 mb-3">
                    {update.flynote || update.case_summary}
                  </p>
                  {update.case_categories && update.case_categories.length > 0 && (
                    <div className="flex items-center space-x-2 flex-wrap">
                      {update.case_categories.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full mb-2"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button className="flex items-center text-primary hover:text-primary-dark ml-4">
                  <span className="text-sm font-medium">View Details</span>
                  <ChevronRight className="h-5 w-5 ml-1" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentLegalUpdates;