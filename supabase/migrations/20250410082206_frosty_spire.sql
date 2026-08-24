/*
  # Add Sample Law Documents and Storage Setup

  1. Changes
    - Create storage bucket for legal documents if not exists
    - Insert sample law documents
    - Add storage policies for document access

  2. Security
    - Maintain existing RLS policies
    - Add appropriate storage policies
*/

-- Create storage bucket for legal documents if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'legal-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('legal-documents', 'legal-documents', true);
  END IF;
END $$;

-- Add storage policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public can read legal documents" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload legal documents" ON storage.objects;

  CREATE POLICY "Public can read legal documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'legal-documents');

  CREATE POLICY "Authenticated users can upload legal documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'legal-documents');
END $$;

-- Insert sample law documents
DO $$
DECLARE
  kenya_id uuid;
  uganda_id uuid;
  nigeria_id uuid;
BEGIN
  -- Get country IDs
  SELECT id INTO kenya_id FROM countries WHERE name = 'Kenya';
  SELECT id INTO uganda_id FROM countries WHERE name = 'Uganda';
  SELECT id INTO nigeria_id FROM countries WHERE name = 'Nigeria';

  -- Insert documents for Kenya
  IF kenya_id IS NOT NULL THEN
    INSERT INTO law_documents (title, content, country_id, category, type)
    VALUES
      (
        'Sexual Offences Act',
        E'AN ACT of Parliament to make provision about sexual offences, their definition, prevention and the protection of all persons from harm from unlawful sexual acts, and for connected purposes\n\nPART I – PRELIMINARY\n\n1. This Act may be cited as the Sexual Offences Act.\n\n2. In this Act, unless the context otherwise requires—\n"child" has the meaning assigned thereto in the Children Act;\n"complainant" means the Republic or the person who lodges a complaint or in respect of whom a sexual offence is alleged to have been committed;\n\nPART II – SEXUAL OFFENCES\n\n3. (1) A person commits the offence termed rape if—\n(a) he or she intentionally and unlawfully commits an act which causes penetration with his or her genital organs;\n(b) the other person does not consent to the penetration; or\n(c) the consent is obtained by force or by means of threats or intimidation of any kind.',
        kenya_id,
        'Criminal Law',
        'act'
      ),
      (
        'Reproductive Healthcare Policy',
        E'REPRODUCTIVE HEALTHCARE POLICY\n\n1. INTRODUCTION\nThis policy framework aims to ensure universal access to comprehensive reproductive healthcare services.\n\n2. OBJECTIVES\n- Reduce maternal mortality\n- Increase access to family planning services\n- Improve adolescent reproductive health\n\n3. STRATEGIES\n3.1 Service Delivery\n- Strengthen healthcare infrastructure\n- Train healthcare workers\n- Implement community outreach programs',
        kenya_id,
        'Healthcare',
        'policy'
      );
  END IF;

  -- Insert documents for Uganda
  IF uganda_id IS NOT NULL THEN
    INSERT INTO law_documents (title, content, country_id, category, type)
    VALUES
      (
        'Domestic Violence Act',
        E'THE DOMESTIC VIOLENCE ACT, 2010.\n\nAn Act to provide for the protection and relief of victims of domestic violence; to provide for the punishment of perpetrators of domestic violence; to provide for the procedure and guidelines to be followed by the court in relation to the protection and compensation of victims of domestic violence; to provide for the jurisdiction of court; to provide for the enforcement of orders made by the court; to empower the family and children court to handle cases of domestic violence and for related matters.\n\nPART I—PRELIMINARY\n\n1. Commencement\nThis Act shall come into force on a date appointed by the Minister by statutory instrument.\n\n2. Interpretation\nIn this Act, unless the context otherwise requires—\n"court" means a magistrates court, a family and children court or a local council court;',
        uganda_id,
        'Criminal Law',
        'act'
      ),
      (
        'National Health Policy',
        E'NATIONAL HEALTH POLICY\n\n1. VISION\nA healthy and productive population that contributes to socio-economic growth and national development\n\n2. MISSION\nTo provide the highest possible level of health services to all people in Uganda through delivery of promotive, preventive, curative, palliative and rehabilitative health services at all levels\n\n3. GUIDING PRINCIPLES\n- Universal access to minimum healthcare package\n- Quality and affordable services\n- Partnership and participation',
        uganda_id,
        'Healthcare',
        'policy'
      );
  END IF;

  -- Insert documents for Nigeria
  IF nigeria_id IS NOT NULL THEN
    INSERT INTO law_documents (title, content, country_id, category, type)
    VALUES
      (
        'Violence Against Persons (Prohibition) Act',
        E'VIOLENCE AGAINST PERSONS (PROHIBITION) ACT, 2015\n\nARRANGEMENT OF SECTIONS\n\nPART I—OFFENCES\n\n1. Prohibition of rape\n(1) A person commits the offence of rape if—\n(a) he or she intentionally penetrates the vagina, anus or mouth of another person with any other part of his or her body or anything else;\n(b) the other person does not consent to the penetration; or\n(c) the consent is obtained by force or means of threat or intimidation of any kind.\n\n2. Prohibition of female genital mutilation\n(1) A person who performs female genital mutilation or engages another to carry out such mutilation commits an offence.',
        nigeria_id,
        'Criminal Law',
        'act'
      ),
      (
        'National Gender Policy',
        E'NATIONAL GENDER POLICY\n\n1. PREAMBLE\nThis Policy provides a framework for achieving gender equality and women''s empowerment in Nigeria.\n\n2. POLICY THRUST\n- Promote gender mainstreaming in all sectors\n- Eliminate discriminatory practices\n- Enhance women''s participation in governance\n\n3. IMPLEMENTATION STRATEGIES\n3.1 Legal Framework\n- Review and amend discriminatory laws\n- Strengthen enforcement mechanisms\n\n3.2 Institutional Mechanisms\n- Establish gender focal points\n- Build capacity for gender mainstreaming',
        nigeria_id,
        'Gender Equality',
        'policy'
      );
  END IF;
END $$;