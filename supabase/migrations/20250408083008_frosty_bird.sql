-- Check if case_stages table exists and create if not
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'case_stages') THEN
    -- Create case_stages table
    CREATE TABLE case_stages (
      id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
      case_id uuid REFERENCES cases(id) ON DELETE CASCADE,
      stage_group text NOT NULL,
      stage_name text NOT NULL,
      status text NOT NULL DEFAULT 'Pending',
      timestamp timestamptz DEFAULT now(),
      notes text,
      documents text[] DEFAULT '{}',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    -- Add status check constraint
    ALTER TABLE case_stages
    ADD CONSTRAINT case_stages_status_check
    CHECK (status IN ('Pending', 'In Progress', 'Completed'));

    -- Add stage_group check constraint
    ALTER TABLE case_stages
    ADD CONSTRAINT case_stages_group_check
    CHECK (stage_group IN (
      'Initial Contact',
      'Investigation & Arrest',
      'Local Mediation',
      'Medical & Counselling',
      'Legal Prosecution',
      'Court Trial',
      'Post-Trial'
    ));

    -- Create indexes
    CREATE INDEX case_stages_case_id_idx ON case_stages(case_id);
    CREATE INDEX case_stages_status_idx ON case_stages(status);
    CREATE INDEX case_stages_group_idx ON case_stages(stage_group);

    -- Enable RLS
    ALTER TABLE case_stages ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop existing policies if they exist and recreate them
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can view case stages" ON case_stages;
  DROP POLICY IF EXISTS "Users can create case stages" ON case_stages;
  DROP POLICY IF EXISTS "Users can update their case stages" ON case_stages;

  -- Create new policies
  CREATE POLICY "Users can view case stages"
    ON case_stages
    FOR SELECT
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    ));

  CREATE POLICY "Users can create case stages"
    ON case_stages
    FOR INSERT
    TO authenticated
    WITH CHECK (EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    ));

  CREATE POLICY "Users can update their case stages"
    ON case_stages
    FOR UPDATE
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM cases
      WHERE id = case_id AND user_id = auth.uid()
    ));
END $$;

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'stage-documents'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('stage-documents', 'stage-documents', true);
  END IF;
END $$;

-- Drop existing storage policies and recreate them
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can read stage documents" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload stage documents" ON storage.objects;

  CREATE POLICY "Users can read stage documents"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'stage-documents');

  CREATE POLICY "Users can upload stage documents"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'stage-documents');
END $$;

-- Create or replace functions and triggers
CREATE OR REPLACE FUNCTION update_case_stage_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_case_stage_timestamp ON case_stages;

-- Create new trigger
CREATE TRIGGER update_case_stage_timestamp
  BEFORE UPDATE ON case_stages
  FOR EACH ROW
  EXECUTE FUNCTION update_case_stage_timestamp();

-- Create or replace initialize_case_stages function
CREATE OR REPLACE FUNCTION initialize_case_stages()
RETURNS trigger AS $$
BEGIN
  IF NEW.case_type = 'rapid-response' THEN
    -- Initial Contact stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Initial Contact', 'Community'),
      (NEW.id, 'Initial Contact', 'CSO'),
      (NEW.id, 'Initial Contact', 'Paralegal'),
      (NEW.id, 'Initial Contact', 'Police');

    -- Investigation & Arrest stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Investigation & Arrest', 'Record Statements'),
      (NEW.id, 'Investigation & Arrest', 'Investigate'),
      (NEW.id, 'Investigation & Arrest', 'Arrest'),
      (NEW.id, 'Investigation & Arrest', 'Police Bond');

    -- Local Mediation stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Local Mediation', 'Inform Local Authority'),
      (NEW.id, 'Local Mediation', 'Mediate'),
      (NEW.id, 'Local Mediation', 'Counsel');

    -- Medical & Counselling stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Medical & Counselling', 'Medical Review'),
      (NEW.id, 'Medical & Counselling', 'Counselling');

    -- Legal Prosecution stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Legal Prosecution', 'DPP Review'),
      (NEW.id, 'Legal Prosecution', 'File Sanction'),
      (NEW.id, 'Legal Prosecution', 'More Investigation'),
      (NEW.id, 'Legal Prosecution', 'Close File');

    -- Court Trial stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Court Trial', 'Plea'),
      (NEW.id, 'Court Trial', 'Bail/Remand'),
      (NEW.id, 'Court Trial', 'Hearing'),
      (NEW.id, 'Court Trial', 'Judgment'),
      (NEW.id, 'Court Trial', 'Sentencing');

    -- Post-Trial stages
    INSERT INTO case_stages (case_id, stage_group, stage_name)
    VALUES
      (NEW.id, 'Post-Trial', 'Appeal Process'),
      (NEW.id, 'Post-Trial', 'Bail Pending Appeal'),
      (NEW.id, 'Post-Trial', 'Fair Hearing'),
      (NEW.id, 'Post-Trial', 'Justice for Victim');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS initialize_case_stages ON cases;

-- Create new trigger
CREATE TRIGGER initialize_case_stages
  AFTER INSERT ON cases
  FOR EACH ROW
  EXECUTE FUNCTION initialize_case_stages();