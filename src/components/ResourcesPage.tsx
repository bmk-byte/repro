import React, { useState, useEffect } from 'react';
import { Download, FileText, Search, Filter, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import UploadResourceModal from './UploadResourceModal';

interface Resource {
  id: string;
  title: string;
  description: string;
  file_url: string;
  resource_type: string;
  downloads: number;
  tags: string[];
  created_at: string;
  user_id: string;
}

const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Use the moderator status hook
  const { isModerator } = useModeratorStatus();
  
  // Resource types for filtering
  const resourceTypes = [
    { id: 'all', name: 'All Resources' },
    { id: 'template', name: 'Templates' },
    { id: 'guide', name: 'Guides' },
    { id: 'analysis', name: 'Analysis' },
    { id: 'research', name: 'Research' }
  ];

  useEffect(() => {
    fetchResources();
  }, []);

  // Set up real-time subscription for new resources
  useEffect(() => {
    const subscription = supabase
      .channel('resources-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'resources'
        },
        (payload) => {
          console.log('New resource added:', payload);
          fetchResources();
          toast.success('New resource has been added');
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'resources'
        },
        (payload) => {
          console.log('Resource updated:', payload);
          fetchResources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setResources(data || []);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      // Increment download count
      const { error: updateError } = await supabase
        .from('resources')
        .update({ downloads: resource.downloads + 1 })
        .eq('id', resource.id);

      if (updateError) {
        console.error('Error updating download count:', updateError);
        // Don't block the download if we can't update the count
      }

      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = resource.file_url;
      link.download = resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Downloading ${resource.title}`);
      
      // Refresh the resources to show updated download count
      fetchResources();
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Filter resources based on search term and selected type
  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         resource.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = selectedType === 'all' || resource.resource_type === selectedType;
    return matchesSearch && matchesType;
  });

  // Group resources by type
  const groupedResources: Record<string, Resource[]> = {};
  filteredResources.forEach(resource => {
    const type = resource.resource_type;
    const typeName = resourceTypes.find(t => t.id === type)?.name || type.charAt(0).toUpperCase() + type.slice(1);
    
    if (!groupedResources[typeName]) {
      groupedResources[typeName] = [];
    }
    groupedResources[typeName].push(resource);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="mt-1 text-sm text-gray-500">
            Access templates, guides, and research materials for reproductive justice advocacy
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {isModerator && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark"
            >
              <Plus className="h-4 w-4" />
              <span>Upload Resource</span>
            </button>
          )}
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`bg-white p-4 rounded-lg shadow-md mb-6 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search resources by title, description, or tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
          
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              {resourceTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Active filters */}
        {(searchTerm || selectedType !== 'all') && (
          <div className="flex flex-wrap gap-2 mt-4">
            {searchTerm && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Search: {searchTerm}
                <button onClick={() => setSearchTerm('')} className="ml-1 text-blue-600 hover:text-blue-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {selectedType !== 'all' && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Type: {resourceTypes.find(t => t.id === selectedType)?.name}
                <button onClick={() => setSelectedType('all')} className="ml-1 text-purple-600 hover:text-purple-800">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedType('all');
              }}
              className="text-sm text-primary hover:text-primary-dark"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Resources List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
          <button
            onClick={fetchResources}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      ) : Object.keys(groupedResources).length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedType !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'No resources have been uploaded yet'}
          </p>
          {isModerator && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Upload First Resource
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResources).map(([category, categoryResources]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryResources.map((resource) => (
                  <div key={resource.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">{resource.title}</h3>
                          <p className="text-sm text-gray-600 mb-3 line-clamp-3">{resource.description}</p>
                          
                          {/* Tags */}
                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {resource.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {/* Resource type and stats */}
                          <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                            <span className="capitalize">{resource.resource_type}</span>
                            <span>{resource.downloads} downloads</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Added {new Date(resource.created_at).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => handleDownload(resource)}
                          className="flex items-center space-x-2 text-sm text-primary hover:text-primary-dark"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Resource Modal */}
      {showUploadModal && (
        <UploadResourceModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchResources();
          }}
        />
      )}
    </div>
  );
};

export default ResourcesPage;