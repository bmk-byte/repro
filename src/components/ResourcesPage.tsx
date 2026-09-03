import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, Search, Filter, ChevronDown, ChevronUp, X, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../lib/toast';
import { useModeratorStatus } from '../hooks/useModeratorStatus';
import UploadResourceModal from './UploadResourceModal';
import { Button, Select, Badge, LoadingState, EmptyState } from './ui';

const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

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

const RESOURCE_TYPE_IDS = ['all', 'template', 'guide', 'analysis', 'research'] as const;
const RESOURCE_TYPE_NAME_KEYS: Record<string, string> = {
  all: 'resources.typeAll',
  template: 'resources.typeTemplate',
  guide: 'resources.typeGuide',
  analysis: 'resources.typeAnalysis',
  research: 'resources.typeResearch',
};

const ResourcesPage: React.FC = () => {
  const { t } = useTranslation();
  const resourceTypes = useMemo(
    () => RESOURCE_TYPE_IDS.map((id) => ({ id, name: t(RESOURCE_TYPE_NAME_KEYS[id]) })),
    [t]
  );
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const { isModerator } = useModeratorStatus();

  const fetchResources = useCallback(async () => {
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
      setError(t('resources.failedToLoad'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  useEffect(() => {
    const subscription = supabase
      .channel('resources-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'resources' },
        (payload) => {
          devLog('New resource added:', payload);
          fetchResources();
          toast.success(t('resources.newResourceAdded'));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'resources' },
        (payload) => {
          devLog('Resource updated:', payload);
          fetchResources();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchResources]);

  const handleDownload = async (resource: Resource) => {
    try {
      const { error: updateError } = await supabase
        .from('resources')
        .update({ downloads: resource.downloads + 1 })
        .eq('id', resource.id);

      if (updateError) {
        console.error('Error updating download count:', updateError);
      }

      const link = document.createElement('a');
      link.href = resource.file_url;
      link.download = resource.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('resources.downloading', { title: resource.title }));
      fetchResources();
    } catch (error) {
      console.error('Download error:', error);
      toast.error(t('resources.failedToDownload'));
    }
  };

  // Filtering/grouping only runs when the underlying data or filter inputs
  // actually change, instead of recomputing on every unrelated re-render
  // (e.g. toggling showUploadModal).
  const filteredResources = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return resources.filter((resource) => {
      const matchesSearch =
        resource.title.toLowerCase().includes(term) ||
        resource.description.toLowerCase().includes(term) ||
        resource.tags.some((tag) => tag.toLowerCase().includes(term));
      const matchesType = selectedType === 'all' || resource.resource_type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [resources, searchTerm, selectedType]);

  const groupedResources = useMemo(() => {
    const groups: Record<string, Resource[]> = {};
    filteredResources.forEach((resource) => {
      const typeName =
        resourceTypes.find((rt) => rt.id === resource.resource_type)?.name ||
        resource.resource_type.charAt(0).toUpperCase() + resource.resource_type.slice(1);
      (groups[typeName] ||= []).push(resource);
    });
    return groups;
  }, [filteredResources, resourceTypes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-stone-900">{t('resources.title')}</h1>
          <p className="mt-1 text-sm text-stone-500">
            {t('resources.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isModerator && (
            <Button onClick={() => setShowUploadModal(true)} icon={<Plus className="h-4 w-4" />}>
              {t('resources.uploadResource')}
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            icon={<Filter className="h-4 w-4" />}
          >
            {t('common.filters')}
            {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      {showFilters && (
        <div className="bg-white p-4 rounded-lg shadow-card border border-stone-100 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 relative">
              <label htmlFor="resources-search" className="sr-only">{t('resources.searchLabel')}</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400 pointer-events-none" />
              <input
                id="resources-search"
                type="text"
                placeholder={t('resources.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>

            <Select label={t('resources.resourceType')} value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
              {resourceTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </Select>
          </div>

          {(searchTerm || selectedType !== 'all') && (
            <div className="flex flex-wrap items-center gap-2 mt-4">
              {searchTerm && (
                <Badge tone="primary">
                  {t('common.search', { term: searchTerm })}
                  <button onClick={() => setSearchTerm('')} aria-label={t('common.clearSearchFilter')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              {selectedType !== 'all' && (
                <Badge tone="primary">
                  {t('common.type', { value: resourceTypes.find((rt) => rt.id === selectedType)?.name })}
                  <button onClick={() => setSelectedType('all')} aria-label={t('common.clearTypeFilter')} className="ml-1">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                }}
                className="text-sm text-primary hover:text-primary-dark"
              >
                {t('common.clearAllFilters')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Resources List */}
      {loading ? (
        <LoadingState label={t('resources.loading')} />
      ) : error ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('resources.failedToLoadTitle')}
          description={error}
          action={<Button variant="outline" onClick={fetchResources}>{t('common.retry')}</Button>}
        />
      ) : Object.keys(groupedResources).length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('resources.noResourcesFound')}
          description={
            searchTerm || selectedType !== 'all'
              ? t('resources.adjustSearchOrFilters')
              : t('resources.noResourcesUploaded')
          }
          action={
            isModerator && (
              <Button onClick={() => setShowUploadModal(true)} icon={<Plus className="h-4 w-4" />}>
                {t('resources.uploadFirstResource')}
              </Button>
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedResources).map(([category, categoryResources]) => (
            <div key={category}>
              <h2 className="text-xl font-serif font-semibold text-stone-900 mb-4">{category}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryResources.map((resource) => (
                  <div key={resource.id} className="bg-white border border-stone-200 rounded-xl shadow-card hover:shadow-raised transition-shadow duration-200">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-stone-900 mb-2">{resource.title}</h3>
                          <p className="text-sm text-stone-600 mb-3 line-clamp-3">{resource.description}</p>

                          {resource.tags && resource.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {resource.tags.map((tag, index) => (
                                <Badge key={index}>{tag}</Badge>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
                            <span className="capitalize">{resource.resource_type}</span>
                            <span>{t('resources.downloadsCount', { count: resource.downloads })}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500">
                          {t('resources.added', { date: new Date(resource.created_at).toLocaleDateString() })}
                        </span>
                        <button
                          onClick={() => handleDownload(resource)}
                          className="flex items-center gap-2 text-sm text-primary hover:text-primary-dark"
                        >
                          <Download className="h-4 w-4" />
                          <span>{t('resources.download')}</span>
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
