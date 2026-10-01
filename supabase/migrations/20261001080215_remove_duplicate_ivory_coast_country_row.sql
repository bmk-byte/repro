-- Pre-existing data-quality bug found while mapping AfyaScore's country
-- list onto Repropulse's: two rows existed for the same country, "Ivory
-- Coast" and "Ivory Coast/Côte d'Ivoire". Verified via a live query that
-- zero rows in cases, pending_cases, judgments, pending_judgments,
-- law_documents, or health_indicators referenced either before deleting
-- the duplicate. "Ivory Coast" remains canonical.
DELETE FROM countries WHERE id = '250c2b95-9583-428e-91a2-2011773ba2f0' AND name = 'Ivory Coast/Côte d''Ivoire';
