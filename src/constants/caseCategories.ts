// Single source of truth for the case-category allowlist, mirrored by the
// DB CHECK constraint on pending_cases.case_categories. Kept as a small,
// side-effect-free module (no component/Supabase-client imports) so it can
// be imported from validation logic and tests without pulling in
// SubmitCaseForm.tsx's full dependency chain — that chain includes
// src/lib/supabase.ts, which throws at import time if VITE_SUPABASE_URL
// isn't set, which is fine in the running app (env is always configured)
// but breaks tests/tools that only need this one constant.
export const CASE_CATEGORIES = [
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
