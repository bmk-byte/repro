import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, ChevronRight, ChevronLeft, CircleAlert as AlertCircle } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import MultiStepFormProgress from './MultiStepFormProgress';
import { useFormDraft } from '../../hooks/useFormDraft';
import { createSafeDisplayName } from '../../lib/sanitize';

interface SubmitCaseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isDirectUpload?: boolean;
}

const SubmitCaseForm: React.FC<SubmitCaseFormProps> = ({ 
  onSuccess, 
  onCancel,
  isDirectUpload = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [countries, setCountries] = useState<{ id: string, name: string }[]>([]);
  const initialFormData = {
    // Basic Information
    title: '',
    summary: '',
    country_id: '',
    
    // Case Details
    tracking_period: '',
    programme: '',
    partner: '',
    nature_of_case: '',
    action_taken: '',
    action_timeframe: '',
    next_steps: '',
    court: '',
    
    // Timeline and Parties
    timeline_status: '',
    litigants: [] as string[],
    defending_institutions: [] as string[],
    
    // Legal Framework
    judicial_body_type: '',
    judicial_body: '',
    regional_appeals: false,
    regional_bodies: [] as string[],
    legal_framework_type: '',
    domestic_laws: [] as string[],
    international_laws: [] as string[],
    protocols: [] as string[],
    
    // Impact and Categories
    case_impact: '',
    case_categories: [] as string[],
    case_outcome: ''
  };

  const [formData, setFormData] = useState(initialFormData);
  
  // Form fields for adding array items
  const [newLitigant, setNewLitigant] = useState('');
  const [newDefendingInstitution, setNewDefendingInstitution] = useState('');
  const [newRegionalBody, setNewRegionalBody] = useState('');
  const [newDomesticLaw, setNewDomesticLaw] = useState('');
  const [newInternationalLaw, setNewInternationalLaw] = useState('');
  const [newProtocol, setNewProtocol] = useState('');

  const draftKey = isDirectUpload ? 'strategic-case-direct' : 'strategic-case-submission';
  const { loadDraft, saveDraft, clearDraft } = useFormDraft(draftKey, { formData: initialFormData, currentStep: 0 });
  const draftLoaded = useRef(false);

  // Load saved draft on mount (before first render of form data)
  useEffect(() => {
    const draft = loadDraft();
    if (draft) {
      setFormData(draft.formData);
      setCurrentStep(draft.currentStep ?? 0);
      toast.success('Restored your previous draft. You can continue where you left off.', {
        duration: 6000,
        onClick: () => toast.dismiss(),
      });
    }
    draftLoaded.current = true;
  }, [loadDraft]);

  // Auto-save form data (debounced)
  useEffect(() => {
    if (!draftLoaded.current) return;
    const timeout = setTimeout(() => {
      saveDraft({ formData, currentStep });
    }, 800);
    return () => clearTimeout(timeout);
  }, [formData, currentStep, saveDraft]);

  // Form steps
  const steps = [
    'Basic Info',
    'Case Details',
    'Parties',
    'Legal Framework',
    'Categories',
    'Document'
  ];

  useEffect(() => {
    fetchCountries();
  }, []);

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
      toast.error('Failed to load countries');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
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
      if (acceptedFiles[0]) {
        setFileError(null);
        setFile(acceptedFiles[0]);
      }
    },
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleCategoryToggle = (category: string) => {
    setFormData(prev => {
      const categories = [...prev.case_categories];
      if (categories.includes(category)) {
        return { ...prev, case_categories: categories.filter(c => c !== category) };
      } else {
        return { ...prev, case_categories: [...categories, category] };
      }
    });
  };

  // Array field handlers
  const addLitigant = () => {
    if (newLitigant.trim()) {
      setFormData(prev => ({
        ...prev,
        litigants: [...prev.litigants, newLitigant.trim()]
      }));
      setNewLitigant('');
    }
  };

  const removeLitigant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      litigants: prev.litigants.filter((_, i) => i !== index)
    }));
  };

  const addDefendingInstitution = () => {
    if (newDefendingInstitution.trim()) {
      setFormData(prev => ({
        ...prev,
        defending_institutions: [...prev.defending_institutions, newDefendingInstitution.trim()]
      }));
      setNewDefendingInstitution('');
    }
  };

  const removeDefendingInstitution = (index: number) => {
    setFormData(prev => ({
      ...prev,
      defending_institutions: prev.defending_institutions.filter((_, i) => i !== index)
    }));
  };

  const addRegionalBody = () => {
    if (newRegionalBody.trim()) {
      setFormData(prev => ({
        ...prev,
        regional_bodies: [...prev.regional_bodies, newRegionalBody.trim()]
      }));
      setNewRegionalBody('');
    }
  };

  const removeRegionalBody = (index: number) => {
    setFormData(prev => ({
      ...prev,
      regional_bodies: prev.regional_bodies.filter((_, i) => i !== index)
    }));
  };

  const addDomesticLaw = () => {
    if (newDomesticLaw.trim()) {
      setFormData(prev => ({
        ...prev,
        domestic_laws: [...prev.domestic_laws, newDomesticLaw.trim()]
      }));
      setNewDomesticLaw('');
    }
  };

  const removeDomesticLaw = (index: number) => {
    setFormData(prev => ({
      ...prev,
      domestic_laws: prev.domestic_laws.filter((_, i) => i !== index)
    }));
  };

  const addInternationalLaw = () => {
    if (newInternationalLaw.trim()) {
      setFormData(prev => ({
        ...prev,
        international_laws: [...prev.international_laws, newInternationalLaw.trim()]
      }));
      setNewInternationalLaw('');
    }
  };

  const removeInternationalLaw = (index: number) => {
    setFormData(prev => ({
      ...prev,
      international_laws: prev.international_laws.filter((_, i) => i !== index)
    }));
  };

  const addProtocol = () => {
    if (newProtocol.trim()) {
      setFormData(prev => ({
        ...prev,
        protocols: [...prev.protocols, newProtocol.trim()]
      }));
      setNewProtocol('');
    }
  };

  const removeProtocol = (index: number) => {
    setFormData(prev => ({
      ...prev,
      protocols: prev.protocols.filter((_, i) => i !== index)
    }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  // Returns the human-readable labels of whatever's still missing on the
  // current step, so the UI can tell the user exactly what to fill in
  // instead of a generic "please fill in all required fields."
  const getMissingFields = (step: number): string[] => {
    switch (step) {
      case 0: // Basic Info
        return [
          !formData.title && 'Title',
          !formData.summary && 'Summary',
          !formData.country_id && 'Country',
        ].filter((v): v is string => !!v);
      case 1: // Case Details
        return [
          !formData.tracking_period && 'Tracking Period',
          !formData.programme && 'Programme',
          !formData.partner && 'Partner',
          !formData.nature_of_case && 'Nature of Case',
          !formData.action_taken && 'Action Taken',
          !formData.action_timeframe && 'Action Timeframe',
          !formData.next_steps && 'Next Steps',
          !formData.court && 'Court',
        ].filter((v): v is string => !!v);
      case 2: // Parties
        return [
          !formData.timeline_status && 'Timeline Status',
          formData.litigants.length === 0 && 'at least one Litigant',
          formData.defending_institutions.length === 0 && 'at least one Defending Institution',
        ].filter((v): v is string => !!v);
      case 3: // Legal Framework
        return [
          !formData.judicial_body_type && 'Judicial Body Type',
          !formData.judicial_body && 'Judicial Body',
          !formData.legal_framework_type && 'Legal Framework Type',
        ].filter((v): v is string => !!v);
      case 4: // Categories
        return [
          !formData.case_impact && 'Case Impact',
          formData.case_categories.length === 0 && 'at least one Category',
        ].filter((v): v is string => !!v);
      case 5: // Document
        return [!file && 'a supporting Document'].filter((v): v is string => !!v);
      default:
        return [];
    }
  };

  const validateCurrentStep = (): boolean => getMissingFields(currentStep).length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const missing = getMissingFields(currentStep);
    if (missing.length > 0) {
      toast.error(`Please fill in: ${missing.join(', ')}`);
      return;
    }
    
    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No authenticated user found');

      // Upload file if present
      let fileUrl = '';
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
        
        // Use different storage bucket based on whether this is a direct upload or submission
        const storageBucket = isDirectUpload ? 'case-documents' : 'submission-documents';
        
        const { error: uploadError } = await supabase.storage
          .from(storageBucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(storageBucket)
          .getPublicUrl(fileName);

        fileUrl = publicUrl;
      }

      if (isDirectUpload) {
        // Direct upload to cases table (for moderators)
        const { error: insertError } = await supabase
          .from('cases')
          .insert({
            case_filed: formData.title,
            case_summary: formData.summary,
            country_id: formData.country_id,
            user_id: user.id,
            pdf_url: fileUrl,
            status: 'pending',
            case_type: 'litigation',
            moderation_status: 'approved',
            tracking_period: formData.tracking_period,
            programme: formData.programme,
            partner: formData.partner,
            nature_of_case: formData.nature_of_case,
            action_taken: formData.action_taken,
            action_timeframe: formData.action_timeframe,
            next_steps: formData.next_steps,
            court: formData.court,
            timeline_status: formData.timeline_status,
            litigants: formData.litigants,
            defending_institutions: formData.defending_institutions,
            judicial_body_type: formData.judicial_body_type,
            judicial_body: formData.judicial_body,
            regional_appeals: formData.regional_appeals,
            regional_bodies: formData.regional_bodies,
            legal_framework_type: formData.legal_framework_type,
            domestic_laws: formData.domestic_laws,
            international_laws: formData.international_laws,
            protocols: formData.protocols,
            case_impact: formData.case_impact,
            case_categories: formData.case_categories,
            case_outcome: formData.case_outcome
          });

        if (insertError) throw insertError;
        toast.success('Case uploaded successfully');
        clearDraft();
        onSuccess?.();
      } else {
        // Submit the case for review - use the new pending_cases table
        const { error: submissionError } = await supabase
          .from('pending_cases')
          .insert({
            title: formData.title,
            summary: formData.summary,
            document_url: fileUrl,
            submitted_by: user.id,
            country_id: formData.country_id,
            status: 'pending',
            // Additional fields
            tracking_period: formData.tracking_period,
            programme: formData.programme,
            partner: formData.partner,
            nature_of_case: formData.nature_of_case,
            action_taken: formData.action_taken,
            action_timeframe: formData.action_timeframe,
            next_steps: formData.next_steps,
            court: formData.court,
            timeline_status: formData.timeline_status,
            litigants: formData.litigants,
            defending_institutions: formData.defending_institutions,
            judicial_body_type: formData.judicial_body_type,
            judicial_body: formData.judicial_body,
            regional_appeals: formData.regional_appeals,
            regional_bodies: formData.regional_bodies,
            legal_framework_type: formData.legal_framework_type,
            domestic_laws: formData.domestic_laws,
            international_laws: formData.international_laws,
            protocols: formData.protocols,
            case_impact: formData.case_impact,
            case_categories: formData.case_categories,
            case_outcome: formData.case_outcome
          });

        if (submissionError) throw submissionError;

        // Show success notification with more details
        toast.success(
          <div>
            <p className="font-medium">Case submitted successfully!</p>
            <p className="text-sm mt-1">Your case has been sent for review. You'll be notified when it's approved.</p>
          </div>,
          { duration: 5000 }
        );
        
        // Add a delay before redirecting to allow the user to see the success message
        setTimeout(() => {
          clearDraft();
          onSuccess?.();
        }, 2000);
      }
    } catch (error: any) {
      console.error('Error submitting case:', error);
      toast.error(
        <div>
          <p className="font-medium">Error submitting case:</p>
          <p className="text-sm mt-1">{error.message || 'Failed to submit case'}</p>
        </div>,
        { duration: 5000 }
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Case Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Enter a descriptive title for the case"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Case Summary *
              </label>
              <textarea
                name="summary"
                value={formData.summary}
                onChange={handleInputChange}
                required
                rows={4}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Provide a brief summary of the case"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Country/Jurisdiction *
              </label>
              <select
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
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Tracking Period *
              </label>
              <input
                type="text"
                name="tracking_period"
                value={formData.tracking_period}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., Q1 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Programme *
              </label>
              <input
                type="text"
                name="programme"
                value={formData.programme}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., LIRA Programme"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Partner Organization *
              </label>
              <input
                type="text"
                name="partner"
                value={formData.partner}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., Afya Na Haki"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Court *
              </label>
              <input
                type="text"
                name="court"
                value={formData.court}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., High Court of Kenya"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Nature of Case *
              </label>
              <textarea
                name="nature_of_case"
                value={formData.nature_of_case}
                onChange={handleInputChange}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Describe the nature of the case"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Action Taken *
              </label>
              <textarea
                name="action_taken"
                value={formData.action_taken}
                onChange={handleInputChange}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Describe the actions taken"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Action Timeframe *
              </label>
              <input
                type="text"
                name="action_timeframe"
                value={formData.action_timeframe}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., 3 months"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Next Steps *
              </label>
              <textarea
                name="next_steps"
                value={formData.next_steps}
                onChange={handleInputChange}
                required
                rows={3}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Describe the next steps"
              />
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Timeline Status *
              </label>
              <select
                name="timeline_status"
                value={formData.timeline_status}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Select status</option>
                <option value="filed">Filed</option>
                <option value="ongoing">Ongoing</option>
                <option value="resolved">Resolved</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Litigants *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newLitigant}
                  onChange={(e) => setNewLitigant(e.target.value)}
                  placeholder="Add a litigant"
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addLitigant}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.litigants.map((litigant, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {litigant}
                    <button
                      type="button"
                      onClick={() => removeLitigant(index)}
                      className="ml-1 text-blue-800 hover:text-blue-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Defending Institutions *
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newDefendingInstitution}
                  onChange={(e) => setNewDefendingInstitution(e.target.value)}
                  placeholder="Add a defending institution"
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addDefendingInstitution}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.defending_institutions.map((institution, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {institution}
                    <button
                      type="button"
                      onClick={() => removeDefendingInstitution(index)}
                      className="ml-1 text-green-800 hover:text-green-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Case Outcome
              </label>
              <textarea
                name="case_outcome"
                value={formData.case_outcome}
                onChange={handleInputChange}
                rows={3}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Describe the outcome of the case (if resolved)"
              />
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Judicial Body Type *
              </label>
              <select
                name="judicial_body_type"
                value={formData.judicial_body_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Select type</option>
                <option value="National Court">National Court</option>
                <option value="Regional Court">Regional Court</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Judicial Body *
              </label>
              <input
                type="text"
                name="judicial_body"
                value={formData.judicial_body}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="e.g., Supreme Court of Kenya"
              />
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  name="regional_appeals"
                  checked={formData.regional_appeals}
                  onChange={handleCheckboxChange}
                  className="rounded border-stone-300 text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium text-stone-700">Regional Appeals</span>
              </label>
            </div>

            {formData.regional_appeals && (
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Regional Bodies
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newRegionalBody}
                    onChange={(e) => setNewRegionalBody(e.target.value)}
                    placeholder="Add a regional body"
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={addRegionalBody}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.regional_bodies.map((body, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                    >
                      {body}
                      <button
                        type="button"
                        onClick={() => removeRegionalBody(index)}
                        className="ml-1 text-purple-800 hover:text-purple-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Legal Framework Type *
              </label>
              <select
                name="legal_framework_type"
                value={formData.legal_framework_type}
                onChange={handleInputChange}
                required
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
              >
                <option value="">Select type</option>
                <option value="Domestic Law">Domestic Law</option>
                <option value="International Law">International Law</option>
                <option value="Both">Both</option>
              </select>
            </div>

            {(formData.legal_framework_type === 'Domestic Law' || formData.legal_framework_type === 'Both') && (
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  Domestic Laws
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newDomesticLaw}
                    onChange={(e) => setNewDomesticLaw(e.target.value)}
                    placeholder="Add a domestic law"
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={addDomesticLaw}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.domestic_laws.map((law, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                    >
                      {law}
                      <button
                        type="button"
                        onClick={() => removeDomesticLaw(index)}
                        className="ml-1 text-amber-800 hover:text-amber-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {(formData.legal_framework_type === 'International Law' || formData.legal_framework_type === 'Both') && (
              <div>
                <label className="block text-sm font-medium text-stone-700">
                  International Laws
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newInternationalLaw}
                    onChange={(e) => setNewInternationalLaw(e.target.value)}
                    placeholder="Add an international law"
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={addInternationalLaw}
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                  >
                    Add
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.international_laws.map((law, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {law}
                      <button
                        type="button"
                        onClick={() => removeInternationalLaw(index)}
                        className="ml-1 text-blue-800 hover:text-blue-900"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700">
                Protocols
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newProtocol}
                  onChange={(e) => setNewProtocol(e.target.value)}
                  placeholder="Add a protocol"
                  className="flex-1 rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addProtocol}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {formData.protocols.map((protocol, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                  >
                    {protocol}
                    <button
                      type="button"
                      onClick={() => removeProtocol(index)}
                      className="ml-1 text-indigo-800 hover:text-indigo-900"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700">
                Case Impact *
              </label>
              <textarea
                name="case_impact"
                value={formData.case_impact}
                onChange={handleInputChange}
                required
                rows={4}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2 focus:border-primary focus:outline-none focus:ring-primary"
                placeholder="Describe the impact of this case"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Case Categories *
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-stone-200 rounded-md">
                {[
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
                ].map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.case_categories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="rounded border-stone-300 text-primary focus:ring-primary"
                    />
                    <span className="ml-2 text-sm text-stone-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      
      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Upload Case Document *
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-primary bg-primary/5'
                    : file
                      ? 'border-primary bg-primary/5'
                      : fileError
                        ? 'border-danger bg-danger-light/40'
                        : 'border-stone-300 hover:border-primary'
                }`}
              >
                <input {...getInputProps()} aria-label="Upload case document (PDF)" />
                {file ? (
                  <div className="flex items-center justify-center gap-3">
                    <Upload className="h-6 w-6 text-primary flex-none" aria-hidden="true" />
                    <span className="text-stone-900 text-sm font-medium">{createSafeDisplayName(file.name)}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                      aria-label="Remove selected file"
                      className="text-stone-500 hover:text-danger"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-stone-600">Drop your PDF file here or click to browse</p>
                    <p className="text-sm text-stone-500 mt-2">Maximum file size: 10MB</p>
                    <p className="text-sm text-stone-600 mt-4 italic">
                      This document serves to capture any additional important information relevant to the case that may not have been included in the form fields.
                    </p>
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

            {!isDirectUpload && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      Your submission will be reviewed by a moderator before being published. You will be notified once the review is complete.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <MultiStepFormProgress 
        steps={steps} 
        currentStep={currentStep} 
        onStepClick={goToStep}
      />
      
      <form onSubmit={handleSubmit} className="mt-6">
        {renderStepContent()}
        
        {(() => {
          const missing = getMissingFields(currentStep);
          return missing.length > 0 ? (
            <p role="status" className="mt-4 text-sm text-danger text-right">
              Before you continue, please fill in: {missing.join(', ')}
            </p>
          ) : null;
        })()}

        <div className="mt-4 flex justify-between">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
          >
            Cancel
          </button>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || !validateCurrentStep()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : isDirectUpload ? 'Upload Case' : 'Submit Case'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitCaseForm;