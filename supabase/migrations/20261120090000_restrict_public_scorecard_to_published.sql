/*
  # Limit public scorecard reads to published assessments

  1. Problem
    - The original scorecard schema (20261001075948_create_scorecard_schema.sql)
      let anyone, including anonymous visitors, read submissions whose status
      is 'submitted' as well as 'published', plus their indicator scores and
      pillar results. 'submitted' means "sent for review, not yet approved",
      so assessments still under review were readable through the public API.
    - The public analysis pages already filter to 'published' in the client
      (src/scorecard/lib/api.ts), but that is only presentation; the database
      rule is what actually controls access.

  2. Changes
    - Recreate the three public SELECT policies with status = 'published'.
    - Scorecard editors are unaffected: their separate
      "Scorecard editors can view all ..." / "... can manage ..." policies
      still grant them every status, which the editor screen
      (ScorecardPage.tsx -> fetchLatestSubmission) relies on.

  3. Rollback
    - Re-run the three CREATE POLICY statements from the original schema
      migration with status IN ('submitted', 'published').
*/

DROP POLICY IF EXISTS "Anyone can view published scorecard submissions" ON scorecard_submissions;
CREATE POLICY "Anyone can view published scorecard submissions"
  ON scorecard_submissions FOR SELECT
  USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can view scores for published submissions" ON scorecard_indicator_scores;
CREATE POLICY "Anyone can view scores for published submissions"
  ON scorecard_indicator_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scorecard_submissions
      WHERE scorecard_submissions.id = scorecard_indicator_scores.submission_id
      AND scorecard_submissions.status = 'published'
    )
  );

DROP POLICY IF EXISTS "Anyone can view pillar results for published submissions" ON scorecard_pillar_results;
CREATE POLICY "Anyone can view pillar results for published submissions"
  ON scorecard_pillar_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM scorecard_submissions
      WHERE scorecard_submissions.id = scorecard_pillar_results.submission_id
      AND scorecard_submissions.status = 'published'
    )
  );
