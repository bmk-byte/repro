/*
  # Backfill countries.code from AfyaScore's country list

  AfyaScore covers 34 countries (ECOWAS/SADC/EAC member states); the other
  ~22 Repropulse countries are left with `code = NULL`. 31 names matched
  Repropulse's existing `countries.name` exactly; 3 needed an explicit
  alias, verified during the scorecard merge:
  - AfyaScore "Cabo Verde" -> Repropulse "Cape Verde"
  - AfyaScore "DR Congo" -> Repropulse "Democratic Republic of the Congo"
    (not "Congo", which is the separate Republic of Congo)
  - AfyaScore "Côte d'Ivoire" -> Repropulse "Ivory Coast" (after removing a
    pre-existing duplicate "Ivory Coast/Côte d'Ivoire" row — confirmed via a
    live query that no table referenced it before deleting it)
*/

UPDATE countries SET code = 'AO' WHERE name = 'Angola';
UPDATE countries SET code = 'BJ' WHERE name = 'Benin';
UPDATE countries SET code = 'BW' WHERE name = 'Botswana';
UPDATE countries SET code = 'BF' WHERE name = 'Burkina Faso';
UPDATE countries SET code = 'BI' WHERE name = 'Burundi';
UPDATE countries SET code = 'CV' WHERE name = 'Cape Verde';
UPDATE countries SET code = 'KM' WHERE name = 'Comoros';
UPDATE countries SET code = 'CI' WHERE name = 'Ivory Coast';
UPDATE countries SET code = 'CD' WHERE name = 'Democratic Republic of the Congo';
UPDATE countries SET code = 'SZ' WHERE name = 'Eswatini';
UPDATE countries SET code = 'GM' WHERE name = 'Gambia';
UPDATE countries SET code = 'GH' WHERE name = 'Ghana';
UPDATE countries SET code = 'GN' WHERE name = 'Guinea';
UPDATE countries SET code = 'GW' WHERE name = 'Guinea-Bissau';
UPDATE countries SET code = 'KE' WHERE name = 'Kenya';
UPDATE countries SET code = 'LS' WHERE name = 'Lesotho';
UPDATE countries SET code = 'LR' WHERE name = 'Liberia';
UPDATE countries SET code = 'MG' WHERE name = 'Madagascar';
UPDATE countries SET code = 'MW' WHERE name = 'Malawi';
UPDATE countries SET code = 'ML' WHERE name = 'Mali';
UPDATE countries SET code = 'MU' WHERE name = 'Mauritius';
UPDATE countries SET code = 'MZ' WHERE name = 'Mozambique';
UPDATE countries SET code = 'NA' WHERE name = 'Namibia';
UPDATE countries SET code = 'NE' WHERE name = 'Niger';
UPDATE countries SET code = 'NG' WHERE name = 'Nigeria';
UPDATE countries SET code = 'RW' WHERE name = 'Rwanda';
UPDATE countries SET code = 'SN' WHERE name = 'Senegal';
UPDATE countries SET code = 'SC' WHERE name = 'Seychelles';
UPDATE countries SET code = 'SL' WHERE name = 'Sierra Leone';
UPDATE countries SET code = 'ZA' WHERE name = 'South Africa';
UPDATE countries SET code = 'TZ' WHERE name = 'Tanzania';
UPDATE countries SET code = 'TG' WHERE name = 'Togo';
UPDATE countries SET code = 'UG' WHERE name = 'Uganda';
UPDATE countries SET code = 'ZM' WHERE name = 'Zambia';
UPDATE countries SET code = 'ZW' WHERE name = 'Zimbabwe';
