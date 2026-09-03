import React from 'react';
import { Upload, File, X as XIcon, CircleAlert as AlertCircle } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { toast } from '../lib/toast';
import { createSafeDisplayName, sanitizeText, safeFileExtension } from '../lib/sanitize';
import { Modal, Input, Textarea, Select, Button } from './ui';

interface UploadLawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const UploadLawModal: React.FC<UploadLawModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [fileError, setFileError] = React.useState<string | null>(null);
  const [countries, setCountries] = React.useState<{ id: string; name: string }[]>([]);
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    country_id: '',
    category: '',
    type: 'policy' as 'policy' | 'act',
  });

  React.useEffect(() => {
    const fetchCountries = async () => {
      try {
        const { data, error } = await supabase
          .from('countries')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setCountries(data || []);
      } catch (error) {
        console.error('Error fetching countries:', error);
        toast.error(handleSupabaseError(error));
      }
    };

    fetchCountries();
  }, []);

  const onDrop = React.useCallback((acceptedFiles: File[], rejections: FileRejection[]) => {
    if (rejections.length > 0) {
      const reason = rejections[0].errors[0];
      setFileError(
        reason?.code === 'file-too-large'
          ? 'That file is larger than 10MB. Please choose a smaller PDF.'
          : reason?.code === 'file-invalid-type'
            ? 'Only PDF files are accepted.'
            : reason?.message || 'That file could not be accepted.'
      );
      return;
    }
    setFileError(null);
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setFileError('Please choose a PDF file to upload.');
      return;
    }

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = safeFileExtension(file.name);
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('laws')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('laws')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('law_documents')
        .insert({
          ...formData,
          file_url: publicUrl,
          uploaded_by: user.id
        });

      if (dbError) throw dbError;

      toast.success('Document uploaded successfully');
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Legal Document"
      size="lg"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" form="upload-law-form" loading={loading} disabled={!file}>
            {loading ? 'Uploading…' : 'Upload Document'}
          </Button>
        </>
      }
    >
      <form id="upload-law-form" onSubmit={handleSubmit} className="space-y-6">
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
            <input {...getInputProps()} aria-label="Upload PDF file" />
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
                  className="ml-2 p-1 rounded-full text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
                <p className="text-stone-600">Drop your PDF file here or click to browse</p>
                <p className="text-sm text-stone-500 mt-2">PDF only, maximum file size 10MB</p>
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
            required
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: sanitizeText(e.target.value) }))}
          />

          <Textarea
            label="Description"
            rows={3}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: sanitizeText(e.target.value) }))}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Country"
              required
              value={formData.country_id}
              onChange={(e) => setFormData(prev => ({ ...prev, country_id: e.target.value }))}
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </Select>

            <Select
              label="Type"
              required
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'policy' | 'act' }))}
            >
              <option value="policy">Policy</option>
              <option value="act">Act</option>
            </Select>

            <Select
              label="Category"
              required
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
            >
              <option value="">Select a category</option>
              <option value="reproductive-health">Reproductive Health</option>
              <option value="criminal-law">Criminal Law</option>
              <option value="human-rights">Human Rights</option>
              <option value="constitutional-law">Constitutional Law</option>
            </Select>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default UploadLawModal;
