import React, { useState } from 'react';
import { X, Upload, File, CircleAlert as AlertCircle } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { createSafeDisplayName, sanitizeText, safeFileExtension } from '../lib/sanitize';
import { Modal, Input, Textarea, Select, Button, Badge } from './ui';

interface UploadResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'text/plain': ['.txt'],
  'text/csv': ['.csv']
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadResourceModal: React.FC<UploadResourceModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    resource_type: 'template',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');

  const onDrop = React.useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      const reason = rejections[0].errors[0];
      setFileError(
        reason?.code === 'file-too-large'
          ? 'That file is larger than 10MB. Please choose a smaller file.'
          : reason?.code === 'file-invalid-type'
            ? 'That file type isn’t supported. See the accepted formats below.'
            : reason?.message || 'That file could not be accepted.'
      );
      return;
    }

    const file = acceptedFiles[0];
    setFileError(null);
    setFile(file);

    if (!formData.title) {
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const cleanTitle = fileName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      setFormData(prev => ({ ...prev, title: cleanTitle }));
    }
  }, [formData.title]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: sanitizeText(value) }));
  };

  const addTag = () => {
    const sanitized = sanitizeText(newTag);
    if (sanitized && !formData.tags.includes(sanitized)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, sanitized] }));
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please select a file to upload.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = safeFileExtension(file.name);
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('resources')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('resources')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('resources')
        .insert({
          title: formData.title,
          description: formData.description,
          file_url: publicUrl,
          resource_type: formData.resource_type,
          tags: formData.tags,
          user_id: user.id,
          downloads: 0
        });

      if (dbError) throw dbError;

      toast.success('Resource uploaded successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error uploading resource:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Resource"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="upload-resource-form" loading={loading} disabled={!file}>
            {loading ? 'Uploading…' : 'Upload Resource'}
          </Button>
        </>
      }
    >
      <form id="upload-resource-form" onSubmit={handleSubmit} className="space-y-6">
        <div>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : fileError
                  ? 'border-danger bg-danger-light/40'
                  : 'border-stone-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} aria-label="Upload resource file" />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <File className="h-6 w-6 text-primary flex-none" aria-hidden="true" />
                <div className="text-left">
                  <p className="text-stone-900 text-sm font-medium">{createSafeDisplayName(file.name)}</p>
                  <p className="text-stone-500 text-xs">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  aria-label="Remove selected file"
                  className="ml-2 p-1 rounded-full text-stone-400 hover:bg-stone-100 hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
                <p className="text-stone-600">Drop your file here or click to browse</p>
                <p className="text-sm text-stone-500 mt-2">
                  Supported formats: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV
                </p>
                <p className="text-sm text-stone-500">Maximum file size: 10MB</p>
              </div>
            )}
          </div>
          {fileError && (
            <p role="alert" className="mt-2 flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4 flex-none" />
              {fileError}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Input
            label="Title"
            name="title"
            required
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter a descriptive title for the resource"
          />

          <Textarea
            label="Description"
            name="description"
            required
            rows={3}
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Provide a detailed description of the resource"
          />

          <Select
            label="Resource Type"
            name="resource_type"
            required
            value={formData.resource_type}
            onChange={handleInputChange}
          >
            <option value="template">Template</option>
            <option value="guide">Guide</option>
            <option value="analysis">Analysis</option>
            <option value="research">Research</option>
          </Select>

          <div>
            <label htmlFor="new-tag" className="block text-sm font-medium text-stone-700 mb-1.5">
              Tags
            </label>
            <div className="flex gap-2">
              <input
                id="new-tag"
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Add a tag"
                className="flex-1 h-10 rounded-md border border-stone-300 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
              <Button type="button" variant="secondary" onClick={addTag}>
                Add
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} tone="primary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      aria-label={`Remove tag ${tag}`}
                      className="ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-stone-500 mt-1">
              Tags help users find resources more easily. Press Enter or click Add to add a tag.
            </p>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UploadResourceModal;
