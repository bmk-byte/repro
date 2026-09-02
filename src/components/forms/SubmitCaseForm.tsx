import React, { useState, useEffect, useRef } from 'react';
import { Upload, X, ChevronRight, ChevronLeft, CircleAlert as AlertCircle } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import MultiStepFormProgress from './MultiStepFormProgress';
import { useFormDraft } from '../../hooks/useFormDraft';
import { createSafeDisplayName } from '../../lib/sanitize';
import { Input, Select, Textarea, Button, TagListInput } from '../ui';
import { sendEmail } from '../../lib/email';
import { renderEmail } from '../../lib/emailTemplates';

interface SubmitCaseFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  isDirectUpload?: boolean;
}

const CASE_CATEGORIES = [
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

  // Fields touched (blurred) so far — inline errors only show for a field
  // once the user has actually interacted with it, matching Auth.tsx's
  // validate-on-blur pattern rather than showing every error up front.
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

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
    markTouched('case_categories');
  };

  // Array field handlers — each TagListInput owns its own text-input value;
  // these just append/remove from the form's array state.
  const addLitigant = (value: string) => {
    setFormData(prev => ({ ...prev, litigants: [...prev.litigants, value] }));
    markTouched('litigants');
  };
  const removeLitigant = (index: number) => {
    setFormData(prev => ({ ...prev, litigants: prev.litigants.filter((_, i) => i !== index) }));
    markTouched('litigants');
  };

  const addDefendingInstitution = (value: string) => {
    setFormData(prev => ({ ...prev, defending_institutions: [...prev.defending_institutions, value] }));
    markTouched('defending_institutions');
  };
  const removeDefendingInstitution = (index: number) => {
    setFormData(prev => ({ ...prev, defending_institutions: prev.defending_institutions.filter((_, i) => i !== index) }));
    markTouched('defending_institutions');
  };

  const addRegionalBody = (value: string) => {
    setFormData(prev => ({ ...prev, regional_bodies: [...prev.regional_bodies, value] }));
  };
  const removeRegionalBody = (index: number) => {
    setFormData(prev => ({ ...prev, regional_bodies: prev.regional_bodies.filter((_, i) => i !== index) }));
  };

  const addDomesticLaw = (value: string) => {
    setFormData(prev => ({ ...prev, domestic_laws: [...prev.domestic_laws, value] }));
  };
  const removeDomesticLaw = (index: number) => {
    setFormData(prev => ({ ...prev, domestic_laws: prev.domestic_laws.filter((_, i) => i !== index) }));
  };

  const addInternationalLaw = (value: string) => {
    setFormData(prev => ({ ...prev, international_laws: [...prev.international_laws, value] }));
  };
  const removeInternationalLaw = (index: number) => {
    setFormData(prev => ({ ...prev, international_laws: prev.international_laws.filter((_, i) => i !== index) }));
  };

  const addProtocol = (value: string) => {
    setFormData(prev => ({ ...prev, protocols: [...prev.protocols, value] }));
  };
  const removeProtocol = (index: number) => {
    setFormData(prev => ({ ...prev, protocols: prev.protocols.filter((_, i) => i !== index) }));
  };

  // Field keys per step, in the same order as getMissingFields below — used
  // to mark every field on the current step "touched" the moment the user
  // tries to move on but validation blocks them, so inline errors light up
  // together with the aggregate banner instead of only one field at a time.
  const STEP_FIELDS: Record<number, string[]> = {
    0: ['title', 'summary', 'country_id'],
    1: ['tracking_period', 'programme', 'partner', 'nature_of_case', 'action_taken', 'action_timeframe', 'next_steps', 'court'],
    2: ['timeline_status', 'litigants', 'defending_institutions'],
    3: ['judicial_body_type', 'judicial_body', 'legal_framework_type'],
    4: ['case_impact', 'case_categories'],
    5: [],
  };

  const touchStep = (step: number) => {
    const fields = STEP_FIELDS[step] || [];
    setTouched(prev => {
      const next = { ...prev };
      fields.forEach(f => { next[f] = true; });
      return next;
    });
  };

  const nextStep = () => {
    if (getMissingFields(currentStep).length > 0) {
      touchStep(currentStep);
      return;
    }
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
  // instead of a generic "please fill in all required fields." This stays
  // the source of truth for step-gating (Next/Submit disabled state);
  // per-field inline errors below are a visual layer on top of it.
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

  // Per-field inline error, shown once the field has been touched (blurred).
  const fieldError = (field: string, label: string, isEmpty: boolean): string | undefined =>
    touched[field] && isEmpty ? `${label} is required` : undefined;

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

        // Notify moderators and confirm to the submitter — fire-and-forget so
        // an email failure never blocks or rolls back the submission itself.
        (async () => {
          try {
            const { data: moderatorProfiles, error: moderatorsError } = await supabase
              .from('profiles')
              .select('email')
              .eq('is_moderator', true);
            if (moderatorsError) throw moderatorsError;

            const moderatorEmails = (moderatorProfiles || [])
              .map((m) => m.email)
              .filter((email): email is string => !!email);

            await Promise.allSettled(
              moderatorEmails.map((email) =>
                sendEmail({
                  to: email,
                  subject: 'New submission awaiting review',
                  html: renderEmail({
                    heading: 'New Submission Awaiting Review',
                    body: `A new case, "${formData.title}", has been submitted and needs moderation.`,
                  }),
                })
              )
            );
          } catch (err) {
            console.error('Failed to send moderator notification emails:', err);
          }
        })();

        if (user.email) {
          sendEmail({
            to: user.email,
            subject: 'We received your submission',
            html: renderEmail({
              heading: 'Submission Received',
              body: `Thanks for submitting "${formData.title}". Our moderators will review it, and you'll be notified once a decision is made.`,
            }),
          }).catch((err) => console.error('Failed to send submitter confirmation email:', err));
        }

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
            <Input
              label="Case Title"
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              onBlur={() => markTouched('title')}
              error={fieldError('title', 'Case Title', !formData.title)}
              placeholder="Enter a descriptive title for the case"
            />

            <Textarea
              label="Case Summary"
              name="summary"
              required
              rows={4}
              value={formData.summary}
              onChange={handleInputChange}
              onBlur={() => markTouched('summary')}
              error={fieldError('summary', 'Case Summary', !formData.summary)}
              placeholder="Provide a brief summary of the case"
            />

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
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <Input
              label="Tracking Period"
              name="tracking_period"
              required
              value={formData.tracking_period}
              onChange={handleInputChange}
              onBlur={() => markTouched('tracking_period')}
              error={fieldError('tracking_period', 'Tracking Period', !formData.tracking_period)}
              placeholder="e.g., Q1 2025"
            />

            <Input
              label="Programme"
              name="programme"
              required
              value={formData.programme}
              onChange={handleInputChange}
              onBlur={() => markTouched('programme')}
              error={fieldError('programme', 'Programme', !formData.programme)}
              placeholder="e.g., LIRA Programme"
            />

            <Input
              label="Partner Organization"
              name="partner"
              required
              value={formData.partner}
              onChange={handleInputChange}
              onBlur={() => markTouched('partner')}
              error={fieldError('partner', 'Partner Organization', !formData.partner)}
              placeholder="e.g., Afya Na Haki"
            />

            <Input
              label="Court"
              name="court"
              required
              value={formData.court}
              onChange={handleInputChange}
              onBlur={() => markTouched('court')}
              error={fieldError('court', 'Court', !formData.court)}
              placeholder="e.g., High Court of Kenya"
            />

            <Textarea
              label="Nature of Case"
              name="nature_of_case"
              required
              rows={3}
              value={formData.nature_of_case}
              onChange={handleInputChange}
              onBlur={() => markTouched('nature_of_case')}
              error={fieldError('nature_of_case', 'Nature of Case', !formData.nature_of_case)}
              placeholder="Describe the nature of the case"
            />

            <Textarea
              label="Action Taken"
              name="action_taken"
              required
              rows={3}
              value={formData.action_taken}
              onChange={handleInputChange}
              onBlur={() => markTouched('action_taken')}
              error={fieldError('action_taken', 'Action Taken', !formData.action_taken)}
              placeholder="Describe the actions taken"
            />

            <Input
              label="Action Timeframe"
              name="action_timeframe"
              required
              value={formData.action_timeframe}
              onChange={handleInputChange}
              onBlur={() => markTouched('action_timeframe')}
              error={fieldError('action_timeframe', 'Action Timeframe', !formData.action_timeframe)}
              placeholder="e.g., 3 months"
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
              placeholder="Describe the next steps"
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Select
              label="Timeline Status"
              name="timeline_status"
              required
              value={formData.timeline_status}
              onChange={handleInputChange}
              onBlur={() => markTouched('timeline_status')}
              error={fieldError('timeline_status', 'Timeline Status', !formData.timeline_status)}
            >
              <option value="">Select status</option>
              <option value="filed">Filed</option>
              <option value="ongoing">Ongoing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </Select>

            <TagListInput
              label="Litigants"
              required
              items={formData.litigants}
              onAdd={addLitigant}
              onRemove={removeLitigant}
              placeholder="Add a litigant"
              error={touched.litigants && formData.litigants.length === 0 ? 'At least one litigant is required' : undefined}
            />
            {/* Mark touched once the user has interacted with the litigants list at all */}
            <input type="hidden" onFocus={() => markTouched('litigants')} />

            <TagListInput
              label="Defending Institutions"
              required
              items={formData.defending_institutions}
              onAdd={addDefendingInstitution}
              onRemove={removeDefendingInstitution}
              placeholder="Add a defending institution"
              error={touched.defending_institutions && formData.defending_institutions.length === 0 ? 'At least one defending institution is required' : undefined}
            />

            <Textarea
              label="Case Outcome"
              name="case_outcome"
              rows={3}
              value={formData.case_outcome}
              onChange={handleInputChange}
              placeholder="Describe the outcome of the case (if resolved)"
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Select
              label="Judicial Body Type"
              name="judicial_body_type"
              required
              value={formData.judicial_body_type}
              onChange={handleInputChange}
              onBlur={() => markTouched('judicial_body_type')}
              error={fieldError('judicial_body_type', 'Judicial Body Type', !formData.judicial_body_type)}
            >
              <option value="">Select type</option>
              <option value="National Court">National Court</option>
              <option value="Regional Court">Regional Court</option>
            </Select>

            <Input
              label="Judicial Body"
              name="judicial_body"
              required
              value={formData.judicial_body}
              onChange={handleInputChange}
              onBlur={() => markTouched('judicial_body')}
              error={fieldError('judicial_body', 'Judicial Body', !formData.judicial_body)}
              placeholder="e.g., Supreme Court of Kenya"
            />

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

            {formData.regional_appeals && (
              <TagListInput
                label="Regional Bodies"
                items={formData.regional_bodies}
                onAdd={addRegionalBody}
                onRemove={removeRegionalBody}
                placeholder="Add a regional body"
              />
            )}

            <Select
              label="Legal Framework Type"
              name="legal_framework_type"
              required
              value={formData.legal_framework_type}
              onChange={handleInputChange}
              onBlur={() => markTouched('legal_framework_type')}
              error={fieldError('legal_framework_type', 'Legal Framework Type', !formData.legal_framework_type)}
              helperText="Choosing Domestic, International, or Both determines which law lists appear below."
            >
              <option value="">Select type</option>
              <option value="Domestic Law">Domestic Law</option>
              <option value="International Law">International Law</option>
              <option value="Both">Both</option>
            </Select>

            {(formData.legal_framework_type === 'Domestic Law' || formData.legal_framework_type === 'Both') && (
              <TagListInput
                label="Domestic Laws"
                items={formData.domestic_laws}
                onAdd={addDomesticLaw}
                onRemove={removeDomesticLaw}
                placeholder="Add a domestic law"
              />
            )}

            {(formData.legal_framework_type === 'International Law' || formData.legal_framework_type === 'Both') && (
              <TagListInput
                label="International Laws"
                items={formData.international_laws}
                onAdd={addInternationalLaw}
                onRemove={removeInternationalLaw}
                placeholder="Add an international law"
              />
            )}

            <TagListInput
              label="Protocols"
              items={formData.protocols}
              onAdd={addProtocol}
              onRemove={removeProtocol}
              placeholder="Add a protocol"
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Textarea
              label="Case Impact"
              name="case_impact"
              required
              rows={4}
              value={formData.case_impact}
              onChange={handleInputChange}
              onBlur={() => markTouched('case_impact')}
              error={fieldError('case_impact', 'Case Impact', !formData.case_impact)}
              placeholder="Describe the impact of this case"
            />

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Case Categories <span className="text-danger ml-0.5" aria-hidden="true">*</span>
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto p-2 border border-stone-200 rounded-md">
                {CASE_CATEGORIES.map((category) => (
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
              {touched.case_categories && formData.case_categories.length === 0 && (
                <p role="alert" className="mt-1.5 text-sm text-danger">At least one category is required</p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                Upload Case Document <span className="text-danger ml-0.5" aria-hidden="true">*</span>
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
              <div className="bg-warning-light border-l-4 border-warning p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-warning" aria-hidden="true" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-warning-dark">
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
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep} icon={<ChevronLeft className="h-4 w-4" />}>
                Previous
              </Button>
            )}

            {currentStep < steps.length - 1 ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={!validateCurrentStep()}
                icon={<ChevronRight className="h-4 w-4" />}
                iconPosition="right"
              >
                Next
              </Button>
            ) : (
              <Button type="submit" loading={loading} disabled={!validateCurrentStep()}>
                {loading ? 'Submitting...' : isDirectUpload ? 'Upload Case' : 'Submit Case'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitCaseForm;
