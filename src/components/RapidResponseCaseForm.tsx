import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Calendar, Clock, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useFormDraft } from '../hooks/useFormDraft';
import { createSafeDisplayName } from '../lib/sanitize';

interface RapidResponseCaseFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  caseData?: any;
  teamMembers: { id: string; name: string }[];
}

interface Deadline {
  id: string;
  date: string;
  description: string;
}

const RapidResponseCaseForm: React.FC<RapidResponseCaseFormProps> = ({
  onSuccess,
  onCancel,
  caseData,
  teamMembers
}) => {
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([]);

  const initialFormData = {
    case_filed: '',
    case_summary: '',
    country_id: '',
    priority_level: 'Medium',
    rapid_response_stage: 'intake',
    status: 'pending',
    client_name: '',
    client_email: '',
    client_phone: '',
    key_deadlines: [] as Deadline[],
    nature_of_case: '',
    action_taken: '',
    action_timeframe: '',
    next_steps: '',
    partner: '',
    case_reference: '',
    case_category: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const isEditing = !!caseData;

  const draftKey = isEditing ? `rapid-response-edit-${caseData?.id || 'unknown'}` : 'rapid-response-new';
  const { loadDraft, saveDraft, clearDraft } = useFormDraft(draftKey, { formData: initialFormData, deadlines: [] as Deadline[] });
  const draftLoaded = useRef(false);

  // Load saved draft on mount (only for new cases, not editing)
  useEffect(() => {
    if (isEditing) {
      draftLoaded.current = true;
      return;
    }
    const draft = loadDraft();
    if (draft) {
      setFormData(draft.formData);
      if (draft.deadlines && draft.deadlines.length > 0) {
        setDeadlines(draft.deadlines);
      }
      toast.success('Restored your previous draft. You can continue where you left off.', {
        duration: 6000,
        onClick: () => toast.dismiss(),
      });
    }
    draftLoaded.current = true;
  }, [loadDraft, isEditing]);

  // Auto-save form data and deadlines (debounced)
  useEffect(() => {
    if (!draftLoaded.current || isEditing) return;
    const timeout = setTimeout(() => {
      saveDraft({ formData, deadlines });
    }, 800);
    return () => clearTimeout(timeout);
  }, [formData, deadlines, saveDraft, isEditing]);

  // Case category options
  const caseCategoryOptions = [
    'Access to Safe Abortion',
    'Maternal Health and Mortality',
    'Forced Sterilization',
    'Contraceptive Access and Denial',
    'Sexual and Gender-Based Violence (SGBV)',
    'Child Marriage and Early/Forced Marriage',
    'Menstrual Health and Hygiene Rights',
    'Sexual and Reproductive Health Education',
    'Criminalization of Pregnancy Outcomes',
    'Access to Assisted Reproductive Technologies',
    'Access to Reproductive Health Services for Incarcerated Women',
    'Consent and Access for Adolescents and Minors',
    'Discrimination in Reproductive Healthcare',
    'Reproductive Rights in Conflict and Humanitarian Settings',
    'Access to Reproductive Health Services for Marginalized Groups',
    'Parental Leave and Reproductive Labor Rights',
    'Violation of Confidentiality and Privacy in Reproductive Healthcare',
    'Denial of Post-Abortion Care',
    'Reproductive Health and Environmental Justice',
    'Religious and Cultural Barriers to Reproductive Healthcare Access',
    'Other'
  ];

  // Function to map rapid response stage to general case status
  const mapStageToStatus = (stage: string): string => {
    switch (stage) {
      case 'intake':
        return 'pending';
      case 'review':
        return 'in_progress';
      case 'action':
        return 'in_progress';
      case 'resolution':
        return 'completed';
      default:
        return 'pending';
    }
  };

  useEffect(() => {
    fetchCountries();
    
    if (caseData) {
      // Initialize form with existing case data
      const initialStage = caseData.rapid_response_stage || 'intake';
      setFormData({
        case_filed: caseData.case_filed || '',
        case_summary: caseData.case_summary || '',
        country_id: caseData.country_id || '',
        priority_level: caseData.priority_level || 'Medium',
        rapid_response_stage: initialStage,
        status: caseData.status || mapStageToStatus(initialStage), // Map stage to status
        client_name: caseData.client_name || '',
        client_email: caseData.client_email || '',
        client_phone: caseData.client_phone || '',
        key_deadlines: [],
        nature_of_case: caseData.nature_of_case || '',
        action_taken: caseData.action_taken || '',
        action_timeframe: caseData.action_timeframe || '',
        next_steps: caseData.next_steps || '',
        partner: caseData.partner || '', // Initialize partner field
        case_reference: caseData.case_reference || '', // Initialize case reference field
        case_category: caseData.case_categories?.[0] || '' // Initialize case category field from array
      });
      
      // Parse key_deadlines from JSON if it exists
      if (caseData.key_deadlines) {
        try {
          const parsedDeadlines = typeof caseData.key_deadlines === 'string' 
            ? JSON.parse(caseData.key_deadlines) 
            : caseData.key_deadlines;
          
          setDeadlines(Array.isArray(parsedDeadlines) ? parsedDeadlines.map((d: any, idx: number) => ({
            ...d,
            id: d.id || `deadline-${idx}`
          })) : []);
        } catch (err) {
          console.error('Error parsing deadlines:', err);
          setDeadlines([]);
        }
      }
    }
  }, [caseData]);

  const fetchCountries = async () => {
    try {
      const { data, error } = await supabase
        .from('countries')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setCountries(data || []);
    } catch (err) {
      console.error('Error fetching countries:', err);
      toast.error('Failed to load countries');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        setFileError(
          reason?.code === 'file-too-large'
            ? 'That file is larger than 10MB. Please choose a smaller file.'
            : reason?.code === 'file-invalid-type'
              ? 'Only PDF, DOC, and DOCX files are accepted.'
              : reason?.message || 'That file could not be accepted.'
        );
        return;
      }
      if (acceptedFiles[0]) {
        setFileError(null);
        setFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    // Update form data and map rapid_response_stage to status
    setFormData((prev) => {
      const updatedData = { ...prev, [name]: value };
      
      // If rapid_response_stage is being updated, also update status
      if (name === 'rapid_response_stage') {
        updatedData.status = mapStageToStatus(value);
      }
      
      return updatedData;
    });
  };

  const addDeadline = () => {
    const newDeadline: Deadline = {
      id: `deadline-${Date.now()}`,
      date: '',
      description: ''
    };
    setDeadlines([...deadlines, newDeadline]);
  };

  const updateDeadline = (id: string, field: keyof Deadline, value: string) => {
    setDeadlines(deadlines.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  const removeDeadline = (id: string) => {
    setDeadlines(deadlines.filter(d => d.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.case_reference) {
      toast.error('Case reference is required');
      return;
    }
    
    if (!formData.case_category) {
      toast.error('Case category is required');
      return;
    }
    
    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare case data - transform case_category to case_categories array
      const { case_category, ...restFormData } = formData;
      const caseDataToSubmit = {
        ...restFormData,
        case_type: 'rapid-response',
        key_deadlines: deadlines,
        moderation_status: 'approved',
        case_categories: [case_category]
      };

      // Upload file if present
      let fileUrl = '';
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('case-documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('case-documents')
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      if (isEditing) {
        // Update existing case
        const { error: updateError } = await supabase
          .from('cases')
          .update({
            ...caseDataToSubmit,
            ...(fileUrl ? { pdf_url: fileUrl } : {})
          })
          .eq('id', caseData.id);

        if (updateError) throw updateError;
      } else {
        // Create new case
        const { error: insertError } = await supabase
          .from('cases')
          .insert({
            ...caseDataToSubmit,
            pdf_url: fileUrl,
            user_id: user.id
          });

        if (insertError) throw insertError;
      }

      onSuccess();
      if (!isEditing) {
        clearDraft();
      }
    } catch (error: any) {
      console.error('Error saving case:', error);
      toast.error(handleSupabaseError(error));
    } finally {
      setLoading(false);
    }
  };

  // Get priority level color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'High':
        return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'Medium':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'Low':
        return 'bg-green-100 border-green-300 text-green-800';
      default:
        return 'bg-stone-100 border-stone-300 text-stone-800';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="case_reference" className="block text-sm font-medium text-stone-700">
                Case Reference * <span className="text-xs text-stone-500">(Unique Identifier)</span>
              </label>
              <input
                type="text"
                id="case_reference"
                name="case_reference"
                value={formData.case_reference}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., RR-2025-001"
              />
            </div>

            <div>
              <label htmlFor="case_filed" className="block text-sm font-medium text-stone-700">
                Case Title *
              </label>
              <input
                type="text"
                id="case_filed"
                name="case_filed"
                value={formData.case_filed}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="country_id" className="block text-sm font-medium text-stone-700">
                Country/Jurisdiction *
              </label>
              <select
                id="country_id"
                name="country_id"
                value={formData.country_id}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Select a country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>{country.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="case_category" className="block text-sm font-medium text-stone-700">
                Case Category *
              </label>
              <select
                id="case_category"
                name="case_category"
                value={formData.case_category}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Select a category</option>
                {caseCategoryOptions.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="case_summary" className="block text-sm font-medium text-stone-700">
              Case Description *
            </label>
            <textarea
              id="case_summary"
              name="case_summary"
              value={formData.case_summary}
              onChange={handleInputChange}
              rows={3}
              required
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>
        </div>

        {/* Priority and Status */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-stone-900">Priority and Status</h3>
          
          <div>
            <label htmlFor="priority_level" className="block text-sm font-medium text-stone-700">
              Priority Level *
            </label>
            <div className="mt-1 grid grid-cols-4 gap-2">
              {['Urgent', 'High', 'Medium', 'Low'].map((priority) => (
                <label
                  key={priority}
                  className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${
                    formData.priority_level === priority 
                      ? getPriorityColor(priority) 
                      : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="priority_level"
                    value={priority}
                    checked={formData.priority_level === priority}
                    onChange={handleInputChange}
                    className="sr-only"
                  />
                  {priority}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="rapid_response_stage" className="block text-sm font-medium text-stone-700">
              Current Stage *
            </label>
            <select
              id="rapid_response_stage"
              name="rapid_response_stage"
              value={formData.rapid_response_stage}
              onChange={handleInputChange}
              required
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            >
              <option value="intake">Intake</option>
              <option value="review">Review</option>
              <option value="action">Action</option>
              <option value="resolution">Resolution</option>
            </select>
            <p className="mt-1 text-sm text-stone-500">
              {formData.rapid_response_stage === 'intake' && 'Initial assessment and information gathering'}
              {formData.rapid_response_stage === 'review' && 'Analyzing case details and planning response'}
              {formData.rapid_response_stage === 'action' && 'Implementing response strategies'}
              {formData.rapid_response_stage === 'resolution' && 'Case resolution and follow-up'}
            </p>
          </div>

          <div>
            <label htmlFor="nature_of_case" className="block text-sm font-medium text-stone-700">
              Nature of Case *
            </label>
            <textarea
              id="nature_of_case"
              name="nature_of_case"
              value={formData.nature_of_case}
              onChange={handleInputChange}
              rows={2}
              required
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>
        </div>

        {/* Client Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-stone-900">Client Information</h3>
          
          <div>
            <label htmlFor="client_name" className="block text-sm font-medium text-stone-700">
              Client Name
            </label>
            <input
              type="text"
              id="client_name"
              name="client_name"
              value={formData.client_name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="client_email" className="block text-sm font-medium text-stone-700">
              Client Email
            </label>
            <input
              type="email"
              id="client_email"
              name="client_email"
              value={formData.client_email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>

          <div>
            <label htmlFor="client_phone" className="block text-sm font-medium text-stone-700">
              Client Phone
            </label>
            <input
              type="tel"
              id="client_phone"
              name="client_phone"
              value={formData.client_phone}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
          </div>
        </div>

        {/* Partner Organization */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Partner Organization</h3>
          
          <div>
            <label htmlFor="partner" className="block text-sm font-medium text-stone-700">
              Partner Organization
            </label>
            <input
              type="text"
              id="partner"
              name="partner"
              value={formData.partner}
              onChange={handleInputChange}
              placeholder="e.g., Afya Na Haki, LIRA Programme, KELIN"
              className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
            />
            <p className="mt-1 text-sm text-stone-500">
              Enter the name of the partner organization involved in this case
            </p>
          </div>
        </div>

        {/* Key Deadlines */}
        <div className="space-y-6 md:col-span-2">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-stone-900">Key Deadlines</h3>
            <button
              type="button"
              onClick={addDeadline}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Deadline
            </button>
          </div>
          
          {deadlines.length === 0 ? (
            <p className="text-sm text-stone-500 italic">No deadlines added yet. Click "Add Deadline" to create one.</p>
          ) : (
            <div className="space-y-4">
              {deadlines.map((deadline) => (
                <div key={deadline.id} className="flex items-start space-x-2">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                      <input
                        type="date"
                        value={deadline.date}
                        onChange={(e) => updateDeadline(deadline.id, 'date', e.target.value)}
                        className="pl-10 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                      />
                    </div>
                    <input
                      type="text"
                      value={deadline.description}
                      onChange={(e) => updateDeadline(deadline.id, 'description', e.target.value)}
                      placeholder="Deadline description"
                      className="block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDeadline(deadline.id)}
                    className="p-2 text-stone-400 hover:text-red-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Details */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Action Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="action_taken" className="block text-sm font-medium text-stone-700">
                Action Taken *
              </label>
              <textarea
                id="action_taken"
                name="action_taken"
                value={formData.action_taken}
                onChange={handleInputChange}
                rows={3}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>

            <div>
              <label htmlFor="next_steps" className="block text-sm font-medium text-stone-700">
                Next Steps *
              </label>
              <textarea
                id="next_steps"
                name="next_steps"
                value={formData.next_steps}
                onChange={handleInputChange}
                rows={3}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label htmlFor="action_timeframe" className="block text-sm font-medium text-stone-700">
              Action Timeframe *
            </label>
            <div className="relative mt-1">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                id="action_timeframe"
                name="action_timeframe"
                value={formData.action_timeframe}
                onChange={handleInputChange}
                required
                placeholder="e.g., 48 hours, 1 week, 30 days"
                className="pl-10 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Document Upload */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Document Upload</h3>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : fileError
                  ? 'border-danger bg-danger-light/40'
                  : 'border-stone-300 hover:border-primary'
            }`}
          >
            <input {...getInputProps()} aria-label="Upload case document" />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-stone-900 font-medium">{createSafeDisplayName(file.name)}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  aria-label="Remove selected file"
                  className="ml-2 text-stone-500 hover:text-danger"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div>
                <p className="text-stone-600">Drop your file here or click to browse</p>
                <p className="text-xs text-stone-500 mt-1">PDF, DOC, DOCX up to 10MB</p>
              </div>
            )}
          </div>
          {fileError && (
            <p role="alert" className="flex items-center gap-1.5 text-sm text-danger">
              <AlertCircle className="h-4 w-4 flex-none" />
              {fileError}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark disabled:opacity-50"
        >
          {loading ? 'Saving...' : isEditing ? 'Update Case' : 'Create Case'}
        </button>
      </div>
    </form>
  );
};

export default RapidResponseCaseForm;