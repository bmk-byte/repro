/*
  # Scorecard module — schema, permission, and reference data

  Merges AfyaScore (afyascore.org, a separate Supabase project) into
  Repropulse. See the approved plan for full context. This migration:

  1. Adds a `code text` column to the existing `countries` table (nullable —
     only AfyaScore's ~34 countries get one; the cross-country-link feature
     reuses this table rather than creating a duplicate, so a case's
     `country_id` and a scorecard submission's `country_id` are the same FK
     target).
  2. Creates the 5 scorecard_* tables, mirroring AfyaScore's schema.
  3. Adds the `is_scorecard_editor` permission (profiles column + helper
     function + admin-gated grant RPC), mirroring the existing
     `is_moderator`/`admin_set_moderator` pattern exactly, including the
     grant-lockdown discipline from
     20260908100000_lock_down_security_definer_function_grants.sql (never
     leave a SECURITY DEFINER function on the default PUBLIC grant).
  4. Seeds the 7 pillars and 44 indicators as currently live in AfyaScore's
     database (sourced from its migration history + a live CSV export, not
     guessed — see the plan's "What was verified" section). One correction
     applied during seeding: indicators A6–A8, B7, B8, D6, F6 have
     `max_score = 100` in AfyaScore's live database, but every real score
     ever entered against them was computed as if max_score were 4 (e.g. a
     raw score of 3 produced normalized_score 75, i.e. 3/4*100, not
     3/100*100) — confirmed against the CSV export. `100` was dead,
     never-applied metadata; this migration seeds `max_score = 4` for all
     44 indicators so the scoring formula is actually correct going
     forward.
  5. Grants `is_scorecard_editor = true` to the three Afya na Haki staff
     already confirmed as AfyaScore admins and Repropulse moderators/admins.

  Real submission/score data migration (from the CSV export, with country
  and user-email remapping) is a separate one-off script, not part of this
  migration — see the plan.
*/

-- 1. countries.code -------------------------------------------------------

ALTER TABLE countries ADD COLUMN IF NOT EXISTS code text;

-- 2. Scorecard tables -------------------------------------------------------

CREATE TABLE IF NOT EXISTS scorecard_pillars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  weight numeric NOT NULL,
  order_index integer NOT NULL
);

CREATE TABLE IF NOT EXISTS scorecard_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id uuid REFERENCES scorecard_pillars(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  title text NOT NULL,
  definition text NOT NULL,
  scoring_criteria jsonb NOT NULL DEFAULT '{}',
  evidence_sources text[] DEFAULT '{}',
  max_score integer NOT NULL DEFAULT 4,
  order_index integer NOT NULL
);

CREATE TABLE IF NOT EXISTS scorecard_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id) ON DELETE CASCADE,
  version integer DEFAULT 1,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published')),
  composite_score numeric,
  tier text CHECK (tier IN ('Regressive', 'Emergent', 'Progressive')),
  equity_penalty_applied boolean DEFAULT false,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  submitted_at timestamptz,
  notes text,
  UNIQUE(country_id, version)
);

CREATE TABLE IF NOT EXISTS scorecard_indicator_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES scorecard_submissions(id) ON DELETE CASCADE,
  indicator_id uuid REFERENCES scorecard_indicators(id) ON DELETE CASCADE,
  score integer CHECK (score >= 0 AND score <= 4),
  normalized_score numeric,
  evidence_notes text,
  evidence_complete boolean DEFAULT false,
  last_edited_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, indicator_id)
);

CREATE TABLE IF NOT EXISTS scorecard_pillar_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid REFERENCES scorecard_submissions(id) ON DELETE CASCADE,
  pillar_id uuid REFERENCES scorecard_pillars(id) ON DELETE CASCADE,
  average_score numeric,
  weighted_contribution numeric,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(submission_id, pillar_id)
);

CREATE INDEX IF NOT EXISTS idx_scorecard_indicators_pillar ON scorecard_indicators(pillar_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_submissions_country ON scorecard_submissions(country_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_submissions_status ON scorecard_submissions(status);
CREATE INDEX IF NOT EXISTS idx_scorecard_indicator_scores_submission ON scorecard_indicator_scores(submission_id);
CREATE INDEX IF NOT EXISTS idx_scorecard_pillar_results_submission ON scorecard_pillar_results(submission_id);

ALTER TABLE scorecard_pillars ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_indicator_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_pillar_results ENABLE ROW LEVEL SECURITY;

-- 3. Permission: is_scorecard_editor -----------------------------------------

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_scorecard_editor boolean DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_scorecard_editor()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
  SELECT COALESCE((SELECT is_scorecard_editor FROM profiles WHERE id = auth.uid()), false);
$$;

REVOKE ALL ON FUNCTION public.is_scorecard_editor() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_scorecard_editor() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_scorecard_editor(target_email text, should_grant boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can change scorecard editor status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.email = target_email) THEN
    RAISE EXCEPTION 'No profile found for %', target_email;
  END IF;

  UPDATE profiles SET is_scorecard_editor = should_grant WHERE profiles.email = target_email;

  INSERT INTO audit_logs (table_name, record_id, action, performed_by, changes)
  SELECT 'profiles', profiles.id, 'update', auth.uid(),
         jsonb_build_object('is_scorecard_editor', should_grant, 'via', 'admin_set_scorecard_editor')
  FROM profiles WHERE profiles.email = target_email;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_scorecard_editor(text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_scorecard_editor(text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_scorecard_editors()
RETURNS TABLE(id uuid, email text, full_name text, organization text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true) THEN
    RAISE EXCEPTION 'Only admins can list scorecard editors';
  END IF;

  RETURN QUERY
    SELECT profiles.id, profiles.email, profiles.full_name, profiles.organization, profiles.created_at
    FROM profiles
    WHERE profiles.is_scorecard_editor = true
    ORDER BY profiles.created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_scorecard_editors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_scorecard_editors() TO authenticated;

-- 4. RLS policies -------------------------------------------------------

CREATE POLICY "Anyone can view scorecard pillars"
  ON scorecard_pillars FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view scorecard indicators"
  ON scorecard_indicators FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view published scorecard submissions"
  ON scorecard_submissions FOR SELECT
  USING (status IN ('submitted', 'published'));

CREATE POLICY "Scorecard editors can view all submissions"
  ON scorecard_submissions FOR SELECT
  TO authenticated
  USING (is_scorecard_editor());

CREATE POLICY "Scorecard editors can create submissions"
  ON scorecard_submissions FOR INSERT
  TO authenticated
  WITH CHECK (is_scorecard_editor());

CREATE POLICY "Scorecard editors can update submissions"
  ON scorecard_submissions FOR UPDATE
  TO authenticated
  USING (is_scorecard_editor())
  WITH CHECK (is_scorecard_editor());

CREATE POLICY "Anyone can view scores for published submissions"
  ON scorecard_indicator_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scorecard_submissions
      WHERE scorecard_submissions.id = scorecard_indicator_scores.submission_id
      AND scorecard_submissions.status IN ('submitted', 'published')
    )
  );

CREATE POLICY "Scorecard editors can view all scores"
  ON scorecard_indicator_scores FOR SELECT
  TO authenticated
  USING (is_scorecard_editor());

CREATE POLICY "Scorecard editors can manage scores"
  ON scorecard_indicator_scores FOR ALL
  TO authenticated
  USING (is_scorecard_editor())
  WITH CHECK (is_scorecard_editor());

CREATE POLICY "Anyone can view pillar results for published submissions"
  ON scorecard_pillar_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scorecard_submissions
      WHERE scorecard_submissions.id = scorecard_pillar_results.submission_id
      AND scorecard_submissions.status IN ('submitted', 'published')
    )
  );

CREATE POLICY "Scorecard editors can manage pillar results"
  ON scorecard_pillar_results FOR ALL
  TO authenticated
  USING (is_scorecard_editor())
  WITH CHECK (is_scorecard_editor());

-- 5. Reference data: 7 pillars --------------------------------------------

INSERT INTO scorecard_pillars (code, title, description, weight, order_index) VALUES
('P1', 'Legal & Policy Alignment (Article 14(2)(c) Benchmark)', 'Assesses the extent to which national laws and policies align with the Maputo Protocol Article 14(2)(c) minimum grounds for safe abortion, including constitutional provisions, penal codes, health legislation, and policy frameworks.', 20, 1),
('P2', 'Service Availability & Readiness', 'Evaluates the geographical distribution, method mix, cadre mix, commodity security, and operational readiness of abortion service delivery points, including emergency and telemedicine pathways.', 15, 2),
('P3', 'Affordability & Financial Protection', 'Measures financial accessibility of abortion services, inclusion in national health benefit packages, public-sector pricing, protections against catastrophic expenditure, and integration with broader financing systems.', 20, 3),
('P4', 'Quality & Person-Centred Care', 'Assesses compliance with WHO clinical standards, informed consent procedures, privacy and dignity protections, pain management, adverse event surveillance, and continuity of care mechanisms.', 10, 4),
('P5', 'Information, Education & Stigma Reduction', 'Evaluates public awareness campaigns, comprehensive sexuality education integration, facility-level information availability, media guidance, and systematic stigma measurement and reduction initiatives.', 10, 5),
('P6', 'Accountability, Data & Remedies', 'Assesses integration of abortion data into health information systems, maternal death surveillance, independent oversight mechanisms, judicial and administrative remedies, and public transparency in reporting.', 10, 6),
('P7', 'Equity & Priority Populations', 'Evaluates measures to ensure equitable access for priority populations including adolescents, survivors of sexual violence, women in detention, refugees and displaced persons, women with disabilities, and monitoring of equity outcomes.', 15, 7);

-- 6. Reference data: 44 indicators ------------------------------------------
-- scoring_criteria is the original rubric from AfyaScore's seed migration
-- for the 37 indicators that survived its later restructuring; the 7
-- indicators added afterward (A6-A8, B7, B8, D6, F6) never had a rubric
-- written and are seeded with '{}', matching their live state honestly
-- rather than inventing scoring text that was never authored.

INSERT INTO scorecard_indicators (pillar_id, code, title, definition, scoring_criteria, evidence_sources, max_score, order_index)
SELECT p.id, v.code, v.title, v.definition, v.scoring_criteria::jsonb, v.evidence_sources, 4, v.order_index
FROM (VALUES
  ('P1', 'A1', 'Domestic legal authorisation consistent with Article 14(2)(c)', 'Extent to which national law recognises all minimum Maputo grounds for lawful abortion.', '{"0": "No legal grounds or highly restrictive", "1": "Life-saving only", "2": "Life + physical health", "3": "Life + health + rape/incest or fetal impairment", "4": "All Maputo grounds explicitly authorized"}', ARRAY['Constitution','Penal Code','Health Acts','Gazetted regulations'], 1),
  ('P1', 'A2', 'Scope and clarity of grounds', 'Precision, breadth, and evidentiary standards attached to each lawful ground.', '{"0": "No mention", "1": "General health rights only", "2": "Reproductive health mentioned", "3": "SRHR explicitly protected", "4": "SRHR + specific abortion protections"}', ARRAY['Constitution','Bill of Rights'], 2),
  ('P1', 'A3', 'Third-party consent and autonomy safeguards', 'Whether adult women can consent independently and adolescents have structured access pathways.', '{"0": "No policy", "1": "PAC only", "2": "Draft abortion policy", "3": "Adopted policy for some grounds", "4": "Comprehensive policy covering all legal grounds"}', ARRAY['National Health Policy','SRHR Strategy','Clinical Guidelines'], 3),
  ('P1', 'A4', 'Procedural feasibility and gestational parameters', 'Whether gestational limits and procedures enable timely and practical access.', '{"0": "Providers criminalized", "1": "Partial immunity", "2": "Immunity with conditions", "3": "Clear immunity for lawful provision", "4": "Full legal protection + safeguards"}', ARRAY['Penal Code','Health Practitioner Acts'], 4),
  ('P1', 'A5', 'Decriminalisation within lawful grounds', 'Absence of criminal penalties for women and providers acting within lawful grounds.', '{"0": "Women criminalized", "1": "Reduced penalties", "2": "Penalties for unlawful only", "3": "No penalties for lawful abortion", "4": "Full decriminalization"}', ARRAY['Penal Code','Court precedents'], 5),
  ('P1', 'A6', 'Protection around obstetric emergencies, miscarriages, and post-abortion care (PAC)', 'Legal and clinical safeguards preventing criminalisation of miscarriage and post-abortion care.', '{}', ARRAY[]::text[], 6),
  ('P1', 'A7', 'National clinical guideline aligned with WHO Abortion Care Guideline (2022)', 'Existence and implementation of abortion care guidelines consistent with WHO standards.', '{}', ARRAY[]::text[], 7),
  ('P1', 'A8', 'Conscientious objection regulation with assured access', 'Regulation of provider objection that protects patient access through referral and coverage duties.', '{}', ARRAY[]::text[], 8),

  ('P2', 'B1', 'Geographical service availability', 'National distribution of authorised abortion service facilities across districts.', '{"0": "Very restrictive (<8 weeks)", "1": "8-12 weeks", "2": "12-16 weeks", "3": "16-20 weeks or condition-based", "4": "20+ weeks or no arbitrary limits"}', ARRAY['Abortion Act','Clinical Guidelines'], 1),
  ('P2', 'B2', 'Method mix availability (MVA, misoprostol-only, mifepristone + misoprostol)', 'Availability of WHO-recommended abortion methods at appropriate facility levels.', '{"0": "Court order required", "1": "Multi-doctor panels", "2": "Two doctor approval", "3": "Single doctor certification", "4": "Self-determination/minimal requirements"}', ARRAY['Regulations','Ministerial directives'], 2),
  ('P2', 'B3', 'Cadre mix and task-sharing', 'Authorisation and deployment of trained mid-level providers consistent with WHO guidance.', '{"0": ">7 days", "1": "3-7 days", "2": "24-48 hours", "3": "<24 hours", "4": "No mandatory waiting period"}', ARRAY['Abortion Law','Protocols'], 3),
  ('P2', 'B4', 'Commodity security and quality', 'Reliable registration, procurement, and stock of quality-assured abortion-related commodities.', '{"0": "Mandatory consent required", "1": "Consent + judicial bypass", "2": "Notification only", "3": "Consent for minors only", "4": "No third-party consent"}', ARRAY['Family Law','Health Regulations'], 4),
  ('P2', 'B5', 'Post-abortion care (PAC) coverage', 'Availability of comprehensive PAC services, including complication management and contraception.', '{"0": "Unregulated refusal", "1": "Individual opt-out", "2": "Opt-out + weak referral", "3": "Opt-out + mandatory referral", "4": "Strong referral duty + institutional limits"}', ARRAY['Health Professional Standards','Codes of Conduct'], 5),
  ('P2', 'B6', 'Referral, emergency pathways, and 24/7 access', 'Functioning emergency and referral systems ensuring continuous access.', '{"0": "Complex/unclear", "1": "Multiple bureaucratic steps", "2": "Moderate complexity", "3": "Streamlined process", "4": "Simple, clear, accessible procedures"}', ARRAY['Implementation guidelines','Patient flow charts'], 6),
  ('P2', 'B7', 'Telemedicine and self-management enablement', 'Policy and operational support for telemedicine and supported self-managed abortion.', '{}', ARRAY[]::text[], 7),
  ('P2', 'B8', 'Facility readiness and quality assurance', 'Infrastructure, equipment, supervision, and audit systems ensuring safe service delivery.', '{}', ARRAY[]::text[], 8),

  ('P3', 'C1', 'Inclusion of abortion in national health benefit packages', 'Recognition of abortion and PAC within national insurance or essential health packages.', '{"0": "No trained providers", "1": "Very limited (<10% facilities)", "2": "Limited (10-30%)", "3": "Moderate (30-60%)", "4": "Widespread (>60%)"}', ARRAY['Training records','Provider registries'], 1),
  ('P3', 'C2', 'Public-sector pricing and financial barriers', 'Level of direct costs women face in public abortion services.', '{"0": "No designated facilities", "1": "<10% of facilities", "2": "10-30% of facilities", "3": "30-60% of facilities", "4": ">60% equipped facilities"}', ARRAY['Health facility assessments','Infrastructure audits'], 2),
  ('P3', 'C3', 'Financial access for vulnerable populations', 'Existence of subsidies or exemptions for priority or vulnerable groups.', '{"0": "No WHO methods available", "1": "Surgical only (limited)", "2": "MVA available", "3": "MVA + medication abortion", "4": "Full range of WHO methods widely available"}', ARRAY['Essential medicines list','Procurement records'], 3),
  ('P3', 'C4', 'Protection against catastrophic expenditure', 'Extent to which households are shielded from financially devastating costs.', '{"0": "Frequent stockouts", "1": "Irregular supply", "2": "Mostly available", "3": "Reliable supply", "4": "Consistent availability with forecasting"}', ARRAY['Supply chain data','Logistics management systems'], 4),
  ('P3', 'C5', 'Integration with broader financing and procurement systems', 'Degree to which abortion services are embedded in national budgeting and procurement cycles.', '{"0": "No guidelines", "1": "Outdated guidelines", "2": "Partial WHO alignment", "3": "Mostly WHO-aligned", "4": "Fully WHO-compliant protocols"}', ARRAY['National clinical guidelines','Training curricula'], 5),

  ('P4', 'D1', 'Compliance with WHO clinical standards', 'Alignment of national clinical protocols with WHO abortion care recommendations.', '{"0": "No campaigns", "1": "Rare/limited reach", "2": "Occasional campaigns", "3": "Regular campaigns", "4": "Sustained multi-channel awareness programs"}', ARRAY['Campaign reports','Media materials'], 1),
  ('P4', 'D2', 'Informed consent and counselling', 'Availability of voluntary, confidential, and structured counselling and consent processes.', '{"0": "Not included", "1": "Abstinence-only approach", "2": "Basic reproductive health", "3": "CSE with abortion awareness", "4": "Comprehensive rights-based CSE"}', ARRAY['Education curriculum','Teacher training materials'], 2),
  ('P4', 'D3', 'Privacy, dignity, and confidentiality', 'Protection of patient privacy and respectful treatment during service provision.', '{"0": "No training", "1": "PAC training only", "2": "Limited abortion training", "3": "Regular comprehensive training", "4": "Mandatory curricula + continuous education"}', ARRAY['Medical school curricula','Training records'], 3),
  ('P4', 'D4', 'Pain management and supportive care', 'Provision of adequate analgesia and emotional support during and after procedures.', '{"0": "No materials", "1": "Limited/unclear info", "2": "Basic materials", "3": "Comprehensive materials", "4": "Multi-format, multi-language accessible materials"}', ARRAY['Patient information leaflets','Hotlines','Websites'], 4),
  ('P4', 'D5', 'Adverse event surveillance and quality assurance', 'Systems for monitoring complications and ensuring corrective action.', '{"0": "No efforts", "1": "Reactive responses", "2": "Occasional fact-checking", "3": "Active counter-messaging", "4": "Comprehensive anti-stigma strategy"}', ARRAY['Public health messaging','Media engagement'], 5),
  ('P4', 'D6', 'Continuity of care and follow-up', 'Structured follow-up, referral, and contraception integration after abortion care.', '{}', ARRAY[]::text[], 6),

  ('P5', 'E1', 'Public information and awareness campaigns', 'Government dissemination of accurate information on lawful abortion and service access.', '{"0": "No PAC services", "1": "Tertiary only", "2": "Secondary + tertiary", "3": "Primary care + referral", "4": "Universal PAC availability"}', ARRAY['Service availability mapping','EmONC assessments'], 1),
  ('P5', 'E2', 'Comprehensive sexuality education (CSE) and curricula integration', 'Inclusion of abortion and pregnancy options within national sexuality education curricula.', '{"0": "No integration", "1": "Referral only", "2": "Counseling provided", "3": "Counseling + methods", "4": "Full integration with long-acting methods"}', ARRAY['Service protocols','Integration guidelines'], 2),
  ('P5', 'E3', 'Availability of accurate service information at facility level', 'Visibility of up-to-date service information within health facilities and official platforms.', '{"0": "No linkages", "1": "Minimal referral", "2": "Some coordination", "3": "Strong referrals", "4": "Fully integrated SRHR platform"}', ARRAY['Service delivery models','Referral protocols'], 3),
  ('P5', 'E4', 'Media and official communications guidance', 'Guidelines and training to prevent stigma and misinformation in public communications.', '{"0": "No protocols", "1": "Basic guidelines", "2": "Standard protocols", "3": "Comprehensive evidence-based protocols", "4": "Protocols + regular training + QA"}', ARRAY['Clinical guidelines','Emergency care protocols'], 4),
  ('P5', 'E5', 'Stigma measurement and reduction initiatives', 'National programmes that assess and actively reduce abortion-related stigma.', '{"0": "No data collection", "1": "Ad-hoc reporting", "2": "Basic HMIS data", "3": "Systematic PAC monitoring", "4": "Comprehensive data with analysis"}', ARRAY['HMIS indicators','Facility registers'], 5),

  ('P6', 'F1', 'Integration of abortion into health information systems (HMIS)', 'Inclusion of abortion-related indicators in national health data systems.', '{"0": "No data collected", "1": "Partial/incomplete", "2": "Facility-level registers", "3": "HMIS integration", "4": "Comprehensive national reporting system"}', ARRAY['HMIS','Facility reporting forms'], 1),
  ('P6', 'F2', 'Maternal death surveillance and response (MDSR) inclusion', 'Recognition and review of unsafe abortion in maternal mortality monitoring.', '{"0": "No reporting", "1": "Internal use only", "2": "Irregular reports", "3": "Annual reports", "4": "Regular public dashboards/reports"}', ARRAY['Annual health reports','Public health bulletins'], 2),
  ('P6', 'F3', 'Independent oversight and complaints mechanisms', 'Accessible and enforceable grievance systems for rights violations.', '{"0": "No mechanisms", "1": "General complaints only", "2": "Health facility complaints", "3": "SRHR-specific channels", "4": "Accessible multi-channel redress system"}', ARRAY['Complaints procedures','Patient rights charters'], 3),
  ('P6', 'F4', 'Judicial and administrative remedies', 'Availability and enforcement of legal redress for unlawful denial of services.', '{"0": "No enforcement", "1": "Rare enforcement", "2": "Complaint-driven action", "3": "Proactive monitoring", "4": "Systematic enforcement with penalties"}', ARRAY['Inspection reports','Legal cases','Disciplinary actions'], 4),
  ('P6', 'F5', 'Public transparency and reporting', 'Government publication of abortion-related service and mortality data.', '{"0": "No oversight", "1": "Minimal attention", "2": "Occasional inquiries", "3": "Regular oversight", "4": "Strong independent monitoring + recommendations"}', ARRAY['Parliamentary hansards','NHRI reports'], 5),
  ('P6', 'F6', 'Regional and international reporting compliance', 'Fulfilment of treaty-reporting obligations concerning abortion rights.', '{}', ARRAY[]::text[], 6),

  ('P7', 'G1', 'Adolescent access and consent frameworks', 'Legal and practical pathways enabling confidential adolescent access.', '{"0": "Prohibited for adolescents", "1": "Parental consent required", "2": "Consent + judicial bypass", "3": "Mature minor doctrine", "4": "Autonomous access for adolescents"}', ARRAY['Children''s Act','Health consent laws'], 1),
  ('P7', 'G2', 'Survivors of sexual violence', 'Availability of integrated abortion and related care for survivors.', '{"0": "No rural access", "1": "Urban-only services", "2": "Limited rural facilities", "3": "District-level availability", "4": "Universal geographic access including telemedicine"}', ARRAY['Service distribution maps','Telemedicine policies'], 2),
  ('P7', 'G3', 'Women in detention and custodial settings', 'Provision of abortion and PAC services within correctional facilities.', '{"0": "High user fees", "1": "Subsidized", "2": "Free in public sector", "3": "Free + transport support", "4": "Comprehensive financial protection"}', ARRAY['Fee schedules','Health financing policy'], 3),
  ('P7', 'G4', 'Refugees, displaced persons, and humanitarian settings', 'Inclusion of displaced populations in national abortion service frameworks.', '{"0": "Discriminatory barriers", "1": "No special provisions", "2": "General non-discrimination", "3": "Targeted outreach", "4": "Comprehensive equity measures"}', ARRAY['Disability Act','Refugee policies','Anti-discrimination laws'], 4),
  ('P7', 'G5', 'Women with disabilities', 'Accessibility and adaptation of services for women with disabilities.', '{"0": "Single language only", "1": "Limited translation", "2": "Major languages covered", "3": "Multi-language materials", "4": "Full linguistic and cultural accommodation"}', ARRAY['Translation policies','Cultural competency training'], 5),
  ('P7', 'G6', 'Monitoring equity outcomes', 'Collection and use of disaggregated data to track equitable access.', '{"0": "No enforcement", "1": "Complaints possible", "2": "Anti-discrimination policy", "3": "Monitoring + sanctions", "4": "Proactive enforcement with penalties"}', ARRAY['Equality laws','Enforcement records'], 6)
) AS v(pillar_code, code, title, definition, scoring_criteria, evidence_sources, order_index)
JOIN scorecard_pillars p ON p.code = v.pillar_code;

-- 7. Grant scorecard-editor to the three confirmed Afya na Haki staff --------

UPDATE profiles SET is_scorecard_editor = true
WHERE email IN ('kuteesa@afyanahaki.org', 'mukone@afyanahaki.org', 'ssebibubbu@afyanahaki.org');
