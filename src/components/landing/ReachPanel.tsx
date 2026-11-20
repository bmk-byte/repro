import React from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getCountryCoordinates } from '../../lib/countryCoordinates';
import { GlobeLive, type LiveMarker } from '../ui/cobe-globe-live';

interface ReachCountry {
  name: string;
  code: string | null;
  region: string | null;
}

/**
 * Public "Where we work" panel. Shows only which countries are involved
 * (an approved case or a registered user there), never how many cases or
 * people. Data comes from list_public_reach_countries(), which returns
 * names only, so it refreshes on every visit: a new registration or newly
 * approved case adds its country automatically.
 *
 * Loaded lazily from LandingTabs so the globe library isn't part of the
 * landing page's initial download.
 */
const ReachPanel: React.FC = () => {
  const { t } = useTranslation();
  const [countries, setCountries] = React.useState<ReachCountry[] | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    supabase
      .rpc('list_public_reach_countries')
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Error loading reach countries:', error);
          setFailed(true);
          return;
        }
        setCountries((data as ReachCountry[] | null) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = React.useMemo(
    () =>
      (countries ?? [])
        .map((country): LiveMarker | null => {
          const coords = getCountryCoordinates(country.name);
          if (!coords) return null;
          return {
            id: country.name.toLowerCase().replace(/\s+/g, '-'),
            location: coords,
            country: country.name,
          };
        })
        .filter((marker): marker is LiveMarker => marker !== null),
    [countries]
  );

  if (failed) {
    return <p className="text-center text-sm text-stone-300">{t('landing.reachError')}</p>;
  }

  if (countries === null) {
    return (
      <div className="flex justify-center py-10" role="status" aria-label={t('landing.reachLoading')}>
        <div className="h-48 w-48 animate-pulse rounded-full bg-white/10" />
      </div>
    );
  }

  if (countries.length === 0) {
    return <p className="text-center text-sm text-stone-300">{t('landing.reachEmpty')}</p>;
  }

  return (
    <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
      <div className="mx-auto w-full max-w-sm">
        <GlobeLive markers={markers} speed={0.003} />
      </div>
      <div>
        <p className="mb-3 text-sm font-medium text-stone-200">
          {t('landing.reachCountriesCount', { count: countries.length })}
        </p>
        <ul className="flex flex-wrap gap-2">
          {countries.map((country) => (
            <li
              key={country.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-sm text-white"
            >
              <MapPin className="h-3.5 w-3.5 text-primary-300" aria-hidden="true" />
              {country.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ReachPanel;
