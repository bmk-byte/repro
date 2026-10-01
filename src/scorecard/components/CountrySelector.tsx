import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import type { ScorecardCountry as Country } from '../types/database';

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: Country | null;
  onSelectCountry: (country: Country) => void;
  onAddCountry?: () => void;
}

export function CountrySelector({
  countries,
  selectedCountry,
  onSelectCountry,
  onAddCountry,
}: CountrySelectorProps) {
  const { t } = useTranslation('scorecard');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCountries = countries.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.country-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="relative country-selector">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-96 px-4 py-3 bg-white border border-gray-300 rounded-lg shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all flex items-center justify-between"
      >
        <span className="text-gray-900 font-medium">
          {selectedCountry ? selectedCountry.name : t('countrySelector.placeholder')}
        </span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full md:w-96 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-hidden">
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder={t('countrySelector.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {filteredCountries.map((country) => (
              <button
                key={country.id}
                onClick={() => {
                  onSelectCountry(country);
                  setIsOpen(false);
                  setSearchQuery('');
                }}
                className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedCountry?.id === country.id ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                }`}
              >
                <div className="font-medium">{country.name}</div>
                <div className="text-sm text-gray-500">{country.region}</div>
              </button>
            ))}

            {filteredCountries.length === 0 && (
              <div className="px-4 py-8 text-center text-gray-500">
                {t('countrySelector.noCountriesFound')}
              </div>
            )}
          </div>

          {onAddCountry && (
            <div className="border-t border-gray-200">
              <button
                onClick={() => {
                  onAddCountry();
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 text-left text-primary-600 hover:bg-primary-50 font-medium transition-colors"
              >
                {t('countrySelector.addCustomCountry')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
