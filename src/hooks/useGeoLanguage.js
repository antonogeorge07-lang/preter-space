import { useState, useEffect } from 'react';
import { LANG_MAP } from '@/lib/translation';

// Country code -> ISO 639-1 language code
const COUNTRY_LANG = {
  US: 'en', GB: 'en', AU: 'en', CA: 'en', NZ: 'en', IE: 'en',
  MX: 'es', ES: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es',
  FR: 'fr', BE: 'fr', CH: 'fr', CD: 'fr', CI: 'fr',
  DE: 'de', AT: 'de',
  JP: 'ja',
  CN: 'zh', TW: 'zh', HK: 'zh', SG: 'zh',
  BR: 'pt', PT: 'pt',
  SA: 'ar', EG: 'ar', AE: 'ar', IQ: 'ar', MA: 'ar', DZ: 'ar', JO: 'ar',
  IN: 'hi',
  RU: 'ru', BY: 'ru', KZ: 'ru',
  KR: 'ko',
  IT: 'it',
  NL: 'nl',
  PL: 'pl',
  TR: 'tr',
  SE: 'sv',
  NO: 'no',
  DK: 'da',
  FI: 'fi',
  UA: 'uk',
  GR: 'el',
  CZ: 'cs',
  RO: 'ro',
  HU: 'hu',
  TH: 'th',
  VN: 'vi',
  ID: 'id',
  MY: 'ms',
  PH: 'tl',
  PK: 'ur',
  BD: 'bn',
  NG: 'ha',
  ZA: 'af',
  KE: 'sw',
  ET: 'am',
  IR: 'fa',
  IL: 'he',
  PL: 'pl',
  SK: 'sk',
  HR: 'hr',
  RS: 'sr',
  BG: 'bg',
};

export function useGeoLanguage() {
  const [suggestedLang, setSuggestedLang] = useState(null); // { code, name, country }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (cancelled) return;
        const countryCode = data?.country_code;
        const langCode = COUNTRY_LANG[countryCode];
        if (langCode && LANG_MAP[langCode]) {
          setSuggestedLang({ code: langCode, name: LANG_MAP[langCode], country: data?.country_name });
        }
      } catch {
        // silently fail — suggestion is optional
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    detect();
    return () => { cancelled = true; };
  }, []);

  return { suggestedLang, loading };
}