import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, ChevronRight, ChevronLeft, CircleAlert as AlertCircle } from 'lucide-react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { supabase } from '../../lib/supabase';
import { toast } from '../../lib/toast';
import MultiStepFormProgress from './MultiStepFormProgress';
import { useFormDraft } from '../../hooks/useFormDraft';
import { createSafeDisplayName, safeFileExtension } from '../../lib/sanitize';
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
  const { t } = useTranslation('forms');
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
      toast.success(t('submitCaseForm.toasts.draftRestored'), {
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
    t('submitCaseForm.steps.basicInfo'),
    t('submitCaseForm.steps.caseDetails'),
    t('submitCaseForm.steps.parties'),
    t('submitCaseForm.steps.legalFramework'),
    t('submitCaseForm.steps.categories'),
    t('submitCaseForm.steps.document')
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
      toast.error(t('submitCaseForm.toasts.countriesLoadError'));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[], rejections: FileRejection[]) => {
      if (rejections.length > 0) {
        const reason = rejections[0].errors[0];
        setFileError(
          reason?.code === 'file-too-large'
            ? t('common.fileTooLarge')
            : reason?.code === 'file-invalid-type'
              ? t('common.fileInvalidType')
              : reason?.message || t('common.fileRejectedGeneric')
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
          !formData.title && t('submitCaseForm.fields.title'),
          !formData.summary && t('submitCaseForm.fields.summary'),
          !formData.country_id && t('submitCaseForm.fields.country'),
        ].filter((v): v is string => !!v);
      case 1: // Case Details
        return [
          !formData.tracking_period && t('submitCaseForm.fields.trackingPeriod'),
          !formData.programme && t('submitCaseForm.fields.programme'),
          !formData.partner && t('submitCaseForm.fields.partner'),
          !formData.nature_of_case && t('submitCaseForm.fields.natureOfCase'),
          !formData.action_taken && t('submitCaseForm.fields.actionTaken'),
          !formData.action_timeframe && t('submitCaseForm.fields.actionTimeframe'),
          !formData.next_steps && t('submitCaseForm.fields.nextSteps'),
          !formData.court && t('submitCaseForm.fields.court'),
        ].filter((v): v is string => !!v);
      case 2: // Parties
        return [
          !formData.timeline_status && t('submitCaseForm.fields.timelineStatus'),
          formData.litigants.length === 0 && t('common.atLeastOne', { label: t('submitCaseForm.fields.litigant') }),
          formData.defending_institutions.length === 0 && t('common.atLeastOne', { label: t('submitCaseForm.fields.defendingInstitution') }),
        ].filter((v): v is string => !!v);
      case 3: // Legal Framework
        return [
          !formData.judicial_body_type && t('submitCaseForm.fields.judicialBodyType'),
          !formData.judicial_body && t('submitCaseForm.fields.judicialBody'),
          !formData.legal_framework_type && t('submitCaseForm.fields.legalFrameworkType'),
        ].filter((v): v is string => !!v);
      case 4: // Categories
        return [
          !formData.case_impact && t('submitCaseForm.fields.caseImpact'),
          formData.case_categories.length === 0 && t('common.atLeastOne', { label: t('submitCaseForm.fields.category') }),
        ].filter((v): v is string => !!v);
      case 5: // Document
        return [!file && t('submitCaseForm.fields.document')].filter((v): v is string => !!v);
      default:
        return [];
    }
  };

  const validateCurrentStep = (): boolean => getMissingFields(currentStep).length === 0;

  // Per-field inline error, shown once the field has been touched (blurred).
  const fieldError = (field: string, label: string, isEmpty: boolean): string | undefined =>
    touched[field] && isEmpty ? t('common.fieldRequired', { label }) : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const missing = getMissingFields(currentStep);
    if (missing.length > 0) {
      toast.error(t('common.pleaseFillIn', { fields: missing.join(', ') }));
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error(t('common.noAuthenticatedUser'));

      // Upload file if present
      let fileUrl = '';
      if (file) {
        const fileExt = safeFileExtension(file.name);
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
        toast.success(t('submitCaseForm.toasts.caseUploaded'));
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
            <p className="font-medium">{t('submitCaseForm.toasts.caseSubmittedTitle')}</p>
            <p className="text-sm mt-1">{t('submitCaseForm.toasts.caseSubmittedBody')}</p>
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
          <p className="font-medium">{t('submitCaseForm.toasts.submitErrorTitle')}</p>
          <p className="text-sm mt-1">{error.message || t('submitCaseForm.toasts.failedToSubmitFallback')}</p>
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
              label={t('submitCaseForm.step0.caseTitleLabel')}
              name="title"
              required
              value={formData.title}
              onChange={handleInputChange}
              onBlur={() => markTouched('title')}
              error={fieldError('title', t('submitCaseForm.step0.caseTitleLabel'), !formData.title)}
              placeholder={t('submitCaseForm.step0.caseTitlePlaceholder')}
            />

            <Textarea
              label={t('submitCaseForm.step0.caseSummaryLabel')}
              name="summary"
              required
              rows={4}
              value={formData.summary}
              onChange={handleInputChange}
              onBlur={() => markTouched('summary')}
              error={fieldError('summary', t('submitCaseForm.step0.caseSummaryLabel'), !formData.summary)}
              placeholder={t('submitCaseForm.step0.caseSummaryPlaceholder')}
            />

            <Select
              label={t('submitCaseForm.step0.countryLabel')}
              name="country_id"
              required
              value={formData.country_id}
              onChange={handleInputChange}
              onBlur={() => markTouched('country_id')}
              error={fieldError('country_id', t('submitCaseForm.step0.countryLabel'), !formData.country_id)}
            >
              <option value="">{t('common.selectCountry')}</option>
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
              label={t('submitCaseForm.step1.trackingPeriodLabel')}
              name="tracking_period"
              required
              value={formData.tracking_period}
              onChange={handleInputChange}
              onBlur={() => markTouched('tracking_period')}
              error={fieldError('tracking_period', t('submitCaseForm.step1.trackingPeriodLabel'), !formData.tracking_period)}
              placeholder={t('submitCaseForm.step1.trackingPeriodPlaceholder')}
            />

            <Input
              label={t('submitCaseForm.step1.programmeLabel')}
              name="programme"
              required
              value={formData.programme}
              onChange={handleInputChange}
              onBlur={() => markTouched('programme')}
              error={fieldError('programme', t('submitCaseForm.step1.programmeLabel'), !formData.programme)}
              placeholder={t('submitCaseForm.step1.programmePlaceholder')}
            />

            <Input
              label={t('submitCaseForm.step1.partnerLabel')}
              name="partner"
              required
              value={formData.partner}
              onChange={handleInputChange}
              onBlur={() => markTouched('partner')}
              error={fieldError('partner', t('submitCaseForm.step1.partnerLabel'), !formData.partner)}
              placeholder={t('submitCaseForm.step1.partnerPlaceholder')}
            />

            <Input
              label={t('submitCaseForm.step1.courtLabel')}
              name="court"
              required
              value={formData.court}
              onChange={handleInputChange}
              onBlur={() => markTouched('court')}
              error={fieldError('court', t('submitCaseForm.step1.courtLabel'), !formData.court)}
              placeholder={t('submitCaseForm.step1.courtPlaceholder')}
            />

            <Textarea
              label={t('submitCaseForm.step1.natureOfCaseLabel')}
              name="nature_of_case"
              required
              rows={3}
              value={formData.nature_of_case}
              onChange={handleInputChange}
              onBlur={() => markTouched('nature_of_case')}
              error={fieldError('nature_of_case', t('submitCaseForm.step1.natureOfCaseLabel'), !formData.nature_of_case)}
              placeholder={t('submitCaseForm.step1.natureOfCasePlaceholder')}
            />

            <Textarea
              label={t('submitCaseForm.step1.actionTakenLabel')}
              name="action_taken"
              required
              rows={3}
              value={formData.action_taken}
              onChange={handleInputChange}
              onBlur={() => markTouched('action_taken')}
              error={fieldError('action_taken', t('submitCaseForm.step1.actionTakenLabel'), !formData.action_taken)}
              placeholder={t('submitCaseForm.step1.actionTakenPlaceholder')}
            />

            <Input
              label={t('submitCaseForm.step1.actionTimeframeLabel')}
              name="action_timeframe"
              required
              value={formData.action_timeframe}
              onChange={handleInputChange}
              onBlur={() => markTouched('action_timeframe')}
              error={fieldError('action_timeframe', t('submitCaseForm.step1.actionTimeframeLabel'), !formData.action_timeframe)}
              placeholder={t('submitCaseForm.step1.actionTimeframePlaceholder')}
            />

            <Textarea
              label={t('submitCaseForm.step1.nextStepsLabel')}
              name="next_steps"
              required
              rows={3}
              value={formData.next_steps}
              onChange={handleInputChange}
              onBlur={() => markTouched('next_steps')}
              error={fieldError('next_steps', t('submitCaseForm.step1.nextStepsLabel'), !formData.next_steps)}
              placeholder={t('submitCaseForm.step1.nextStepsPlaceholder')}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Select
              label={t('submitCaseForm.step2.timelineStatusLabel')}
              name="timeline_status"
              required
              value={formData.timeline_status}
              onChange={handleInputChange}
              onBlur={() => markTouched('timeline_status')}
              error={fieldError('timeline_status', t('submitCaseForm.step2.timelineStatusLabel'), !formData.timeline_status)}
            >
              <option value="">{t('common.selectStatus')}</option>
              <option value="filed">{t('common.statusFiled')}</option>
              <option value="ongoing">{t('common.statusOngoing')}</option>
              <option value="resolved">{t('common.statusResolved')}</option>
              <option value="dismissed">{t('common.statusDismissed')}</option>
            </Select>

            <TagListInput
              label={t('submitCaseForm.step2.litigantsLabel')}
              required
              items={formData.litigants}
              onAdd={addLitigant}
              onRemove={removeLitigant}
              placeholder={t('submitCaseForm.step2.litigantsPlaceholder')}
              error={touched.litigants && formData.litigants.length === 0 ? t('submitCaseForm.step2.litigantsRequiredError') : undefined}
            />
            {/* Mark touched once the user has interacted with the litigants list at all */}
            <input type="hidden" onFocus={() => markTouched('litigants')} />

            <TagListInput
              label={t('submitCaseForm.step2.defendingInstitutionsLabel')}
              required
              items={formData.defending_institutions}
              onAdd={addDefendingInstitution}
              onRemove={removeDefendingInstitution}
              placeholder={t('submitCaseForm.step2.defendingInstitutionsPlaceholder')}
              error={touched.defending_institutions && formData.defending_institutions.length === 0 ? t('submitCaseForm.step2.defendingInstitutionsRequiredError') : undefined}
            />

            <Textarea
              label={t('submitCaseForm.step2.caseOutcomeLabel')}
              name="case_outcome"
              rows={3}
              value={formData.case_outcome}
              onChange={handleInputChange}
              placeholder={t('submitCaseForm.step2.caseOutcomePlaceholder')}
            />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Select
              label={t('common.judicialBodyTypeLabel')}
              name="judicial_body_type"
              required
              value={formData.judicial_body_type}
              onChange={handleInputChange}
              onBlur={() => markTouched('judicial_body_type')}
              error={fieldError('judicial_body_type', t('common.judicialBodyTypeLabel'), !formData.judicial_body_type)}
            >
              <option value="">{t('common.selectType')}</option>
              <option value="National Court">{t('common.nationalCourt')}</option>
              <option value="Regional Court">{t('common.regionalCourt')}</option>
            </Select>

            <Input
              label={t('common.judicialBodyLabel')}
              name="judicial_body"
              required
              value={formData.judicial_body}
              onChange={handleInputChange}
              onBlur={() => markTouched('judicial_body')}
              error={fieldError('judicial_body', t('common.judicialBodyLabel'), !formData.judicial_body)}
              placeholder={t('common.judicialBodyPlaceholder')}
            />

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="regional_appeals"
                checked={formData.regional_appeals}
                onChange={handleCheckboxChange}
                className="rounded border-stone-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-stone-700">{t('common.regionalAppeals')}</span>
            </label>

            {formData.regional_appeals && (
              <TagListInput
                label={t('common.regionalBodiesLabel')}
                items={formData.regional_bodies}
                onAdd={addRegionalBody}
                onRemove={removeRegionalBody}
                placeholder={t('common.addRegionalBody')}
              />
            )}

            <Select
              label={t('common.legalFrameworkTypeLabel')}
              name="legal_framework_type"
              required
              value={formData.legal_framework_type}
              onChange={handleInputChange}
              onBlur={() => markTouched('legal_framework_type')}
              error={fieldError('legal_framework_type', t('common.legalFrameworkTypeLabel'), !formData.legal_framework_type)}
              helperText={t('common.legalFrameworkHelperText')}
            >
              <option value="">{t('common.selectType')}</option>
              <option value="Domestic Law">{t('common.domesticLaw')}</option>
              <option value="International Law">{t('common.internationalLaw')}</option>
              <option value="Both">{t('common.both')}</option>
            </Select>

            {(formData.legal_framework_type === 'Domestic Law' || formData.legal_framework_type === 'Both') && (
              <TagListInput
                label={t('common.domesticLawsLabel')}
                items={formData.domestic_laws}
                onAdd={addDomesticLaw}
                onRemove={removeDomesticLaw}
                placeholder={t('common.addDomesticLaw')}
              />
            )}

            {(formData.legal_framework_type === 'International Law' || formData.legal_framework_type === 'Both') && (
              <TagListInput
                label={t('common.internationalLawsLabel')}
                items={formData.international_laws}
                onAdd={addInternationalLaw}
                onRemove={removeInternationalLaw}
                placeholder={t('common.addInternationalLaw')}
              />
            )}

            <TagListInput
              label={t('common.protocolsLabel')}
              items={formData.protocols}
              onAdd={addProtocol}
              onRemove={removeProtocol}
              placeholder={t('common.addProtocol')}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Textarea
              label={t('common.caseImpactLabel')}
              name="case_impact"
              required
              rows={4}
              value={formData.case_impact}
              onChange={handleInputChange}
              onBlur={() => markTouched('case_impact')}
              error={fieldError('case_impact', t('common.caseImpactLabel'), !formData.case_impact)}
              placeholder={t('submitCaseForm.step4.caseImpactPlaceholder')}
            />

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('common.caseCategoriesLabel')} <span className="text-danger ml-0.5" aria-hidden="true">*</span>
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
                <p role="alert" className="mt-1.5 text-sm text-danger">{t('common.atLeastOneCategoryRequired')}</p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                {t('submitCaseForm.step5.uploadLabel')} <span className="text-danger ml-0.5" aria-hidden="true">*</span>
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
                <input {...getInputProps()} aria-label={t('submitCaseForm.step5.uploadAriaLabel')} />
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
                      aria-label={t('common.removeSelectedFile')}
                      className="text-stone-500 hover:text-danger"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="h-8 w-8 text-stone-400 mx-auto mb-2" aria-hidden="true" />
                    <p className="text-stone-600">{t('common.dropzonePrompt')}</p>
                    <p className="text-sm text-stone-500 mt-2">{t('common.maxFileSize')}</p>
                    <p className="text-sm text-stone-600 mt-4 italic">
                      {t('submitCaseForm.step5.documentNote')}
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
                      {t('common.moderationNotice')}
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
              {t('common.beforeContinueFillIn', { fields: missing.join(', ') })}
            </p>
          ) : null;
        })()}

        <div className="mt-4 flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('common.cancel')}
          </Button>

          <div className="flex space-x-3">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep} icon={<ChevronLeft className="h-4 w-4" />}>
                {t('common.previous')}
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
                {t('common.next')}
              </Button>
            ) : (
              <Button type="submit" loading={loading} disabled={!validateCurrentStep()}>
                {loading ? t('common.submitting') : isDirectUpload ? t('submitCaseForm.submitButton.upload') : t('submitCaseForm.submitButton.submit')}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default SubmitCaseForm;
