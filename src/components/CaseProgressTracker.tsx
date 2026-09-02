import React, { useState } from 'react';
import { FileUp, ChevronDown, ChevronRight, Clock, FileText, Edit2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { validateFile } from '../lib/errorHandling';
import { LoadingState } from './ui';

interface Stage {
  id: string;
  stage_group: string;
  stage_name: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  timestamp: string;
  notes: string;
  documents: string[];
}

interface StageGroup {
  name: string;
  stages: Stage[];
}

interface CaseProgressTrackerProps {
  caseId: string;
  onUpdate?: () => void;
}

const CaseProgressTracker: React.FC<CaseProgressTrackerProps> = ({ caseId, onUpdate }) => {
  const [loading, setLoading] = React.useState(true);
  const [stageGroups, setStageGroups] = React.useState<StageGroup[]>([]);
  const [expandedGroups, setExpandedGroups] = React.useState<string[]>([]);
  const [selectedStage, setSelectedStage] = React.useState<Stage | null>(null);
  const [showEditModal, setShowEditModal] = React.useState(false);

  React.useEffect(() => {
    fetchStages();
  }, [caseId]);

  const fetchStages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('case_stages')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group stages by stage_group
      const groups = data.reduce((acc: { [key: string]: Stage[] }, stage) => {
        if (!acc[stage.stage_group]) {
          acc[stage.stage_group] = [];
        }
        acc[stage.stage_group].push(stage);
        return acc;
      }, {});

      const groupsArray = Object.entries(groups).map(([name, stages]) => ({
        name,
        stages,
      }));

      setStageGroups(groupsArray);

      // Find the first in-progress group
      const inProgressGroup = Object.keys(groups).find(group =>
        groups[group].some(stage => stage.status === 'In Progress')
      );
      
      // If there's an in-progress group, expand it; otherwise expand the first group
      if (inProgressGroup) {
        setExpandedGroups([inProgressGroup]);
      } else if (groupsArray.length > 0) {
        setExpandedGroups([groupsArray[0].name]);
      }
    } catch (error) {
      console.error('Error fetching stages:', error);
      toast.error('Failed to load case stages');
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupName)
        ? prev.filter(g => g !== groupName)
        : [...prev, groupName]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-100 text-green-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-stone-100 text-stone-600';
    }
  };

  const handleStageClick = (stage: Stage) => {
    setSelectedStage(stage);
    setShowEditModal(true);
  };

  const StageEditModal: React.FC<{
    stage: Stage;
    onClose: () => void;
  }> = ({ stage, onClose }) => {
    const [status, setStatus] = useState(stage.status);
    const [notes, setNotes] = useState(stage.notes || '');
    const [uploading, setUploading] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);

    const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
      try {
        setUploading(true);
        setFileError(null);
        const file = acceptedFiles[0];
        
        // Validate file
        const fileValidation = validateFile(file, 5 * 1024 * 1024, [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]);
        
        if (!fileValidation.isValid) {
          setFileError(fileValidation.error || 'Invalid file');
          return;
        }
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('stage-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('stage-documents')
          .getPublicUrl(fileName);

        const documents = [...stage.documents, publicUrl];

        const { error } = await supabase
          .from('case_stages')
          .update({ documents })
          .eq('id', stage.id);

        if (error) throw error;

        toast.success('Document uploaded successfully');
        fetchStages();
      } catch (error) {
        console.error('Error uploading document:', error);
        toast.error('Failed to upload document');
      } finally {
        setUploading(false);
      }
    }, [stage.id]);

    const { getRootProps, getInputProps } = useDropzone({
      onDrop,
      accept: {
        'application/pdf': ['.pdf'],
        'application/msword': ['.doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
      },
      maxSize: 5 * 1024 * 1024 // 5MB
    });

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
        const { error } = await supabase
          .from('case_stages')
          .update({
            status,
            notes,
            timestamp: new Date().toISOString()
          })
          .eq('id', stage.id);

        if (error) throw error;

        toast.success('Stage updated successfully');
        onClose();
        fetchStages();
        if (onUpdate) onUpdate();
      } catch (error) {
        console.error('Error updating stage:', error);
        toast.error('Failed to update stage');
      }
    };

    // Function to get document type icon and label
    const getDocumentTypeInfo = (url: string) => {
      const filename = url.split('/').pop() || '';
      const extension = filename.split('.').pop()?.toLowerCase() || '';
      
      switch (extension) {
        case 'pdf':
          return { icon: 'pdf', label: 'PDF Document' };
        case 'doc':
        case 'docx':
          return { icon: 'word', label: 'Word Document' };
        default:
          return { icon: 'file', label: 'Document' };
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">{stage.stage_name}</h2>
            <button
              onClick={onClose}
              className="text-stone-500 hover:text-stone-700"
            >
              <ChevronDown className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Stage['status'])}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Pending">Pending</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Add notes about this stage..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Documents
              </label>
              <div
                {...getRootProps()}
                className="border-2 border-dashed border-stone-300 rounded-lg p-6 text-center hover:border-primary transition-colors"
              >
                <input {...getInputProps()} />
                <FileUp className="h-8 w-8 text-stone-400 mx-auto mb-2" />
                <p className="text-stone-600">
                  {uploading ? 'Uploading...' : 'Drop files here or click to upload'}
                </p>
                <p className="text-sm text-stone-500 mt-1">
                  PDF, DOC, DOCX up to 5MB
                </p>
                {fileError && (
                  <p className="text-sm text-red-500 mt-2">{fileError}</p>
                )}
              </div>

              {stage.documents.length > 0 && (
                <div className="mt-4 space-y-2">
                  {stage.documents.map((doc, index) => {
                    const docTypeInfo = getDocumentTypeInfo(doc);
                    return (
                      <a
                        key={index}
                        href={doc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center p-2 rounded-lg hover:bg-stone-50"
                      >
                        <FileText className="h-5 w-5 text-stone-400 mr-2" />
                        <span className="text-sm text-primary hover:underline">
                          {docTypeInfo.label} {index + 1}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-lg hover:bg-primary-dark"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <LoadingState label="Loading case timeline…" />
    );
  }

  // Calculate progress statistics
  const totalStages = stageGroups.reduce((sum, group) => sum + group.stages.length, 0);
  const completedStages = stageGroups.reduce((sum, group) => 
    sum + group.stages.filter(s => s.status === 'Completed').length, 0);
  const inProgressStages = stageGroups.reduce((sum, group) => 
    sum + group.stages.filter(s => s.status === 'In Progress').length, 0);
  const completionPercentage = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <div className="bg-white p-4 rounded-lg border border-stone-200 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-medium text-stone-700">Overall Progress</h3>
          <span className="text-sm font-medium text-stone-700">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-stone-200 rounded-full h-2.5">
          <div 
            className="bg-primary h-2.5 rounded-full" 
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-stone-500 mt-2">
          <span>{completedStages} completed</span>
          <span>{inProgressStages} in progress</span>
          <span>{totalStages - completedStages - inProgressStages} pending</span>
        </div>
      </div>

      {/* Accordion-style stage groups */}
      <div className="max-h-[300px] overflow-y-auto pr-2 rounded-lg border border-stone-200">
        {stageGroups.length === 0 ? (
          <div className="p-4 text-center text-stone-500">
            No stages found for this case
          </div>
        ) : (
          stageGroups.map((group) => (
            <div
              key={group.name}
              className="border-b border-stone-200 last:border-b-0"
            >
              <button
                onClick={() => toggleGroup(group.name)}
                className="w-full flex items-center justify-between p-3 bg-stone-50 hover:bg-stone-100 transition-colors"
              >
                <div className="flex items-center">
                  <span className="font-medium text-stone-900">{group.name}</span>
                  <span className="ml-2 text-xs text-stone-500">
                    ({group.stages.filter(s => s.status === 'Completed').length}/{group.stages.length})
                  </span>
                </div>
                {expandedGroups.includes(group.name) ? (
                  <ChevronDown className="h-5 w-5 text-stone-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-stone-500" />
                )}
              </button>

              {expandedGroups.includes(group.name) && (
                <div className="divide-y divide-stone-100">
                  {group.stages.map((stage) => (
                    <div
                      key={stage.id}
                      className="p-3 hover:bg-stone-50 transition-colors cursor-pointer"
                      onClick={() => handleStageClick(stage)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              stage.status
                            )}`}
                          >
                            {stage.status}
                          </span>
                          <span className="font-medium text-stone-900">
                            {stage.stage_name}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          {stage.documents.length > 0 && (
                            <span className="text-xs text-stone-500 flex items-center">
                              <FileText className="h-3 w-3 mr-1" />
                              {stage.documents.length}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStageClick(stage);
                            }}
                            className="p-1 text-stone-400 hover:text-primary rounded-full hover:bg-stone-100 transition-colors"
                            aria-label="Edit stage"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {stage.notes && (
                        <p className="mt-1 text-sm text-stone-600 line-clamp-1 pl-10">
                          {stage.notes}
                        </p>
                      )}

                      <div className="mt-1 pl-10 flex items-center text-xs text-stone-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>
                          {new Date(stage.timestamp).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {showEditModal && selectedStage && (
        <StageEditModal
          stage={selectedStage}
          onClose={() => {
            setShowEditModal(false);
            setSelectedStage(null);
          }}
        />
      )}
    </div>
  );
};

export default CaseProgressTracker;