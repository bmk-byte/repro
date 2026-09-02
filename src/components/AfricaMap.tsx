import React from 'react';
import { ParentSize } from '@visx/responsive';
import { Mercator } from '@visx/geo';
import { scaleQuantize } from '@visx/scale';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import topology from '../data/africa-topo.json';
import { feature } from 'topojson-client';
import { LoadingState } from './ui';

interface MapData {
  [key: string]: {
    total: number;
    categories: {
      [key: string]: number;
    };
    trend: number;
  };
}

const AfricaMap = () => {
  const [mapData, setMapData] = React.useState<MapData>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [tooltipData, setTooltipData] = React.useState<any>(null);
  const [tooltipPosition, setTooltipPosition] = React.useState({ x: 0, y: 0 });
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [availableCategories, setAvailableCategories] = React.useState<string[]>([]);
  const [dateRange, setDateRange] = React.useState<[Date, Date]>([
    new Date(new Date().setFullYear(new Date().getFullYear() - 1)),
    new Date()
  ]);

  React.useEffect(() => {
    fetchAvailableCategories();
  }, []);

  React.useEffect(() => {
    fetchCaseData();
  }, [selectedCategory, dateRange]);

  const fetchAvailableCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('case_categories')
        .eq('moderation_status', 'approved')
        .not('case_categories', 'is', null);

      if (error) throw error;

      // Flatten and get unique categories
      const allCategories = data?.flatMap(item => item.case_categories || []) || [];
      const uniqueCategories = Array.from(new Set(allCategories));
      setAvailableCategories(uniqueCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Fallback to default categories if needed
      setAvailableCategories([
        'Access to Safe Abortion',
        'Maternal Health and Mortality',
        'Sexual and Gender-Based Violence (SGBV)',
        'Reproductive Healthcare',
        'Family Planning'
      ]);
    }
  };

  const fetchCaseData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch cases with filters
      let query = supabase
        .from('cases')
        .select(`
          id,
          countries (id, name),
          case_categories,
          created_at
        `)
        .eq('moderation_status', 'approved') // Only include moderator-approved cases
        .gte('created_at', dateRange[0].toISOString())
        .lte('created_at', dateRange[1].toISOString());

      if (selectedCategory !== 'all') {
        query = query.contains('case_categories', [selectedCategory]);
      }

      const { data: cases, error } = await query;

      if (error) throw error;

      if (!cases || cases.length === 0) {
        setMapData({});
        setLoading(false);
        return;
      }

      // Process data by country
      const processedData: MapData = {};
      cases.forEach(caseItem => {
        const countryName = caseItem.countries?.name;
        if (!countryName) return;

        if (!processedData[countryName]) {
          processedData[countryName] = {
            total: 0,
            categories: {},
            trend: 0
          };
        }

        processedData[countryName].total++;
        
        // Process categories
        if (caseItem.case_categories && Array.isArray(caseItem.case_categories)) {
          caseItem.case_categories.forEach(category => {
            processedData[countryName].categories[category] = 
              (processedData[countryName].categories[category] || 0) + 1;
          });
        }
      });

      // Calculate trends
      const midpoint = new Date((dateRange[0].getTime() + dateRange[1].getTime()) / 2);
      cases.forEach(caseItem => {
        const countryName = caseItem.countries?.name;
        if (!countryName) return;

        const caseDate = new Date(caseItem.created_at);
        if (caseDate > midpoint) {
          processedData[countryName].trend++;
        } else {
          processedData[countryName].trend--;
        }
      });

      setMapData(processedData);
    } catch (err) {
      console.error('Error fetching case data:', err);
      setError('Failed to load map data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Convert TopoJSON to GeoJSON
  const { features: countries } = feature(topology as any, topology.objects.continent as any) as any;

  // Create color scale based on case counts
  const maxCases = Math.max(...Object.values(mapData).map(d => d.total), 1); // Ensure at least 1 to prevent division by zero
  const colorScale = scaleQuantize({
    domain: [0, maxCases],
    range: [
      'rgb(254, 235, 226)',
      'rgb(251, 180, 174)',
      'rgb(247, 104, 161)',
      'rgb(197, 27, 138)',
      'rgb(122, 1, 119)'
    ]
  });

  const handleMouseMove = (event: React.MouseEvent) => {
    if (tooltipData) {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-stone-900">Case Distribution</h2>
        <div className="flex space-x-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          
          <select
            value={dateRange[1].getFullYear() - dateRange[0].getFullYear()}
            onChange={(e) => {
              const years = parseInt(e.target.value);
              setDateRange([
                new Date(new Date().setFullYear(new Date().getFullYear() - years)),
                new Date()
              ]);
            }}
            className="px-3 py-1.5 border border-stone-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="1">Last Year</option>
            <option value="2">Last 2 Years</option>
            <option value="5">Last 5 Years</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-danger-light border border-danger/30 text-danger-dark px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="h-[600px] relative" onMouseMove={handleMouseMove}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingState label="Loading map data…" />
          </div>
        ) : Object.keys(mapData).length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-stone-500">No data available for the selected filters</div>
          </div>
        ) : (
          <ParentSize>
            {({ width, height }) => (
              <svg width={width} height={height}>
                <rect width={width} height={height} fill="#f8fafc" rx={14} />
                <Mercator
                  data={countries}
                  scale={width * 0.8}
                  translate={[width / 2, height / 1.5]}
                >
                  {(mercator) => (
                    <g>
                      {mercator.features.map(({ feature, path }, i) => {
                        const countryName = feature.properties.name;
                        const countryData = mapData[countryName];
                        return (
                          <motion.path
                            key={`country-${i}`}
                            d={path || ''}
                            fill={countryData ? colorScale(countryData.total) : '#eee'}
                            stroke="#fff"
                            strokeWidth={0.5}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.5, delay: i * 0.01 }}
                            onMouseEnter={() => {
                              if (countryData) {
                                setTooltipData({
                                  name: countryName,
                                  ...countryData
                                });
                              }
                            }}
                            onMouseLeave={() => setTooltipData(null)}
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        );
                      })}
                    </g>
                  )}
                </Mercator>
              </svg>
            )}
          </ParentSize>
        )}

        {tooltipData && (
          <div
            style={{
              position: 'fixed',
              left: tooltipPosition.x + 10,
              top: tooltipPosition.y + 10,
              backgroundColor: 'white',
              padding: '0.5rem',
              borderRadius: '0.375rem',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              border: '1px solid rgb(229 231 235)',
              fontSize: '0.875rem',
              zIndex: 10,
              minWidth: '200px',
              maxWidth: '300px'
            }}
          >
            <div className="font-semibold mb-2">{tooltipData.name}</div>
            <div className="text-stone-600">Total Cases: {tooltipData.total}</div>
            {Object.entries(tooltipData.categories).length > 0 ? (
              <div className="mt-1 max-h-32 overflow-y-auto">
                <div className="text-sm font-medium text-stone-700">Categories:</div>
                {Object.entries(tooltipData.categories)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b - a)
                  .map(([category, count]: [string, any]) => (
                    <div key={category} className="text-sm text-stone-500 flex justify-between">
                      <span className="truncate mr-2">{category}:</span>
                      <span>{count}</span>
                    </div>
                  ))}
              </div>
            ) : null}
            <div className="mt-2 text-sm">
              <span className={tooltipData.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                {tooltipData.trend >= 0 ? '↑' : '↓'} {Math.abs(tooltipData.trend)} case trend
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center">
          <div className="text-sm text-stone-500">Case Volume</div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-[rgb(254,235,226)]"></div>
            <div className="text-xs text-stone-500">Low</div>
            <div className="w-3 h-3 bg-[rgb(122,1,119)]"></div>
            <div className="text-xs text-stone-500">High</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AfricaMap;