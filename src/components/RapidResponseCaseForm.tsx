import React, { useState, useEffect, useRef } from 'react';
import { X, CircleAlert as AlertCircle } from 'lucide-react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useDropzone, FileRejection } from 'react-dropzone';
import { useFormDraft } from '../hooks/useFormDraft';
import { createSafeDisplayName } from '../lib/sanitize';
import { Input, Select, Textarea, Button } from './ui';

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

const PRIORITY_LEVELS = ['Urgent', 'High', 'Medium', 'Low'] as const;

// Selected/unselected classes for the priority segmented-button group, using
// the app's semantic Tailwind tokens (success/warning/danger/info) instead of
// raw Tailwind colors, so each priority reads consistently with badges and
// other status UI elsewhere in the app.
const PRIORITY_BUTTON_CLASSES: Record<string, { selected: string; unselected: string }> = {
  Urgent: {
    selected: 'bg-danger border-danger text-white',
    unselected: 'bg-danger-light border-danger-light text-danger-dark hover:bg-danger-light/70',
  },
  High: {
    selected: 'bg-warning border-warning text-white',
    unselected: 'bg-warning-light border-warning-light text-warning-dark hover:bg-warning-light/70',
  },
  Medium: {
    selected: 'bg-info border-info text-white',
    unselected: 'bg-info-light border-info-light text-info-dark hover:bg-info-light/70',
  },
  Low: {
    selected: 'bg-success border-success text-white',
    unselected: 'bg-success-light border-success-light text-success-dark hover:bg-success-light/70',
  },
};

const RapidResponseCaseForm: React.FC<RapidResponseCaseFormProps> = ({
  onSuccess,
  onCancel,
  caseData
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
  const [deadlineDraftDate, setDeadlineDraftDate] = useState('');
  const [deadlineDraftDescription, setDeadlineDraftDescription] = useState('');
  const [editingDeadlineIndex, setEditingDeadlineIndex] = useState<number | null>(null);
  const isEditing = !!caseData;

  // Fields touched (blurred) so far — inline errors only show for a field
  // once the user has actually interacted with it, matching the validate-on-
  // blur pattern used in SubmitCaseForm.tsx.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

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

  const handlePriorityChange = (priority: string) => {
    setFormData(prev => ({ ...prev, priority_level: priority }));
    markTouched('priority_level');
  };

  // Key deadlines — a small bespoke add/edit/remove list rather than the
  // shared TagListInput, since deadlines need in-place editing (fix a typo'd
  // date or description without deleting and re-adding), which no other
  // "add item to a list" field in the app needs.
  const commitDeadline = () => {
    const description = deadlineDraftDescription.trim();
    if (!description) return;

    if (editingDeadlineIndex !== null) {
      setDeadlines(prev => prev.map((d, i) =>
        i === editingDeadlineIndex ? { ...d, date: deadlineDraftDate, description } : d
      ));
      setEditingDeadlineIndex(null);
    } else {
      const newDeadline: Deadline = {
        id: `deadline-${Date.now()}`,
        date: deadlineDraftDate,
        description
      };
      setDeadlines(prev => [...prev, newDeadline]);
    }

    setDeadlineDraftDate('');
    setDeadlineDraftDescription('');
    markTouched('key_deadlines');
  };

  const startEditDeadline = (index: number) => {
    const deadline = deadlines[index];
    setDeadlineDraftDate(deadline.date);
    setDeadlineDraftDescription(deadline.description);
    setEditingDeadlineIndex(index);
  };

  const cancelEditDeadline = () => {
    setDeadlineDraftDate('');
    setDeadlineDraftDescription('');
    setEditingDeadlineIndex(null);
  };

  const removeDeadline = (index: number) => {
    setDeadlines(prev => prev.filter((_, i) => i !== index));
    if (editingDeadlineIndex === index) cancelEditDeadline();
    markTouched('key_deadlines');
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

  // Per-field inline error, shown once the field has been touched (blurred).
  const fieldError = (field: string, label: string, isEmpty: boolean): string | undefined =>
    touched[field] && isEmpty ? `${label} is required` : undefined;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Case Reference"
              name="case_reference"
              required
              value={formData.case_reference}
              onChange={handleInputChange}
              onBlur={() => markTouched('case_reference')}
              error={fieldError('case_reference', 'Case Reference', !formData.case_reference)}
              helperText="Unique identifier"
              placeholder="e.g., RR-2025-001"
            />

            <Input
              label="Case Title"
              name="case_filed"
              required
              value={formData.case_filed}
              onChange={handleInputChange}
              onBlur={() => markTouched('case_filed')}
              error={fieldError('case_filed', 'Case Title', !formData.case_filed)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Country/Jurisdiction"
              name="country_id"
              required
              value={formData.country_id}
              onChange={handleInputChange}
              onBlur={() => markTouched('country_id')}
              error={fieldError('country_id', 'Country/Jurisdiction', !formData.country_id)}
            >
              <option value="">Select a country</option>
              {countries.map(country => (
                <option key={country.id} value={country.id}>{country.name}</option>
              ))}
            </Select>

            <Select
              label="Case Category"
              name="case_category"
              required
              value={formData.case_category}
              onChange={handleInputChange}
              onBlur={() => markTouched('case_category')}
              error={fieldError('case_category', 'Case Category', !formData.case_category)}
            >
              <option value="">Select a category</option>
              {caseCategoryOptions.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Case Description"
            name="case_summary"
            required
            rows={3}
            value={formData.case_summary}
            onChange={handleInputChange}
            onBlur={() => markTouched('case_summary')}
            error={fieldError('case_summary', 'Case Description', !formData.case_summary)}
          />
        </div>

        {/* Priority and Status */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-stone-900">Priority and Status</h3>

          <div className="flex flex-col gap-1.5">
            {/* Label typography matches Select's rendered label exactly, so
                this bespoke segmented group reads consistently with the
                "Current Stage" Select right below it. */}
            <span className="text-sm font-medium text-stone-700">
              Priority Level
              <span className="text-danger ml-0.5" aria-hidden="true">*</span>
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITY_LEVELS.map((priority) => {
                const isSelected = formData.priority_level === priority;
                const classes = PRIORITY_BUTTON_CLASSES[priority];
                return (
                  <label
                    key={priority}
                    className={`flex items-center justify-center px-4 py-2 border rounded-md cursor-pointer transition-colors ${
                      isSelected ? classes.selected : classes.unselected
                    }`}
                  >
                    <input
                      type="radio"
                      name="priority_level"
                      value={priority}
                      checked={isSelected}
                      onChange={() => handlePriorityChange(priority)}
                      className="sr-only"
                    />
                    {priority}
                  </label>
                );
              })}
            </div>
          </div>

          <Select
            label="Current Stage"
            name="rapid_response_stage"
            required
            value={formData.rapid_response_stage}
            onChange={handleInputChange}
            onBlur={() => markTouched('rapid_response_stage')}
            error={fieldError('rapid_response_stage', 'Current Stage', !formData.rapid_response_stage)}
            helperText={
              formData.rapid_response_stage === 'intake' ? 'Initial assessment and information gathering' :
              formData.rapid_response_stage === 'review' ? 'Analyzing case details and planning response' :
              formData.rapid_response_stage === 'action' ? 'Implementing response strategies' :
              formData.rapid_response_stage === 'resolution' ? 'Case resolution and follow-up' :
              undefined
            }
          >
            <option value="intake">Intake</option>
            <option value="review">Review</option>
            <option value="action">Action</option>
            <option value="resolution">Resolution</option>
          </Select>

          <Textarea
            label="Nature of Case"
            name="nature_of_case"
            required
            rows={2}
            value={formData.nature_of_case}
            onChange={handleInputChange}
            onBlur={() => markTouched('nature_of_case')}
            error={fieldError('nature_of_case', 'Nature of Case', !formData.nature_of_case)}
          />
        </div>

        {/* Client Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-medium text-stone-900">Client Information</h3>

          <Input
            label="Client Name"
            name="client_name"
            value={formData.client_name}
            onChange={handleInputChange}
          />

          <Input
            label="Client Email"
            name="client_email"
            type="email"
            value={formData.client_email}
            onChange={handleInputChange}
          />

          <Input
            label="Client Phone"
            name="client_phone"
            type="tel"
            value={formData.client_phone}
            onChange={handleInputChange}
          />
        </div>

        {/* Partner Organization */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Partner Organization</h3>

          <Input
            label="Partner Organization"
            name="partner"
            value={formData.partner}
            onChange={handleInputChange}
            placeholder="e.g., Afya Na Haki, LIRA Programme, KELIN"
            helperText="Enter the name of the partner organization involved in this case"
          />
        </div>

        {/* Key Deadlines */}
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Key Deadlines</h3>

          <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-3 items-end">
            <Input
              label="Deadline Date"
              type="date"
              value={deadlineDraftDate}
              onChange={(e) => setDeadlineDraftDate(e.target.value)}
            />
            <Input
              label="Deadline Description"
              value={deadlineDraftDescription}
              onChange={(e) => setDeadlineDraftDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitDeadline();
                }
              }}
              placeholder="Describe this deadline"
            />
          </div>

          <div className="flex gap-2">
            <Button type="button" onClick={commitDeadline}>
              {editingDeadlineIndex !== null ? 'Save Changes' : 'Add Deadline'}
            </Button>
            {editingDeadlineIndex !== null && (
              <Button type="button" variant="ghost" onClick={cancelEditDeadline}>
                Cancel Edit
              </Button>
            )}
          </div>

          {deadlines.length > 0 && (
            <ul className="divide-y divide-stone-200 rounded-md border border-stone-200">
              {deadlines.map((deadline, index) => (
                <li
                  key={deadline.id}
                  className={`flex items-center justify-between gap-3 px-3 py-2 text-sm ${
                    editingDeadlineIndex === index ? 'bg-primary-50' : ''
                  }`}
                >
                  <span className="text-stone-700">
                    {deadline.date && <span className="font-medium text-stone-900">{deadline.date} — </span>}
                    {deadline.description}
                  </span>
                  <span className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEditDeadline(index)}
                      className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDeadline(index)}
                      aria-label={`Remove deadline: ${deadline.description}`}
                      className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-danger"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action Details */}
        <div className="space-y-6 md:col-span-2">
          <h3 className="text-lg font-medium text-stone-900">Action Details</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Textarea
              label="Action Taken"
              name="action_taken"
              required
              rows={3}
              value={formData.action_taken}
              onChange={handleInputChange}
              onBlur={() => markTouched('action_taken')}
              error={fieldError('action_taken', 'Action Taken', !formData.action_taken)}
            />

            <Textarea
              label="Next Steps"
              name="next_steps"
              required
              rows={3}
              value={formData.next_steps}
              onChange={handleInputChange}
              onBlur={() => markTouched('next_steps')}
              error={fieldError('next_steps', 'Next Steps', !formData.next_steps)}
            />
          </div>

          <Input
            label="Action Timeframe"
            name="action_timeframe"
            required
            value={formData.action_timeframe}
            onChange={handleInputChange}
            onBlur={() => markTouched('action_timeframe')}
            error={fieldError('action_timeframe', 'Action Timeframe', !formData.action_timeframe)}
            placeholder="e.g., 48 hours, 1 week, 30 days"
          />
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
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          {loading ? 'Saving...' : isEditing ? 'Update Case' : 'Create Case'}
        </Button>
      </div>
    </form>
  );
};

export default RapidResponseCaseForm;
