import { db } from '@/lib/db';


// LRU-style bounded cache: max 200 entries, evict oldest on overflow
const CACHE_MAX = 200;
const cache = new Map();
function cacheSet(key, value) {
  if (cache.size >= CACHE_MAX) {
    cache.delete(cache.keys().next().value); // evict oldest
  }
  cache.set(key, value);
}

export const LANG_MAP = {
  af: 'Afrikaans', sq: 'Albanian', am: 'Amharic', ar: 'Arabic', hy: 'Armenian',
  az: 'Azerbaijani', eu: 'Basque', be: 'Belarusian', bn: 'Bengali', bs: 'Bosnian',
  bg: 'Bulgarian', ca: 'Catalan', ceb: 'Cebuano', ny: 'Chichewa', zh: 'Chinese',
  co: 'Corsican', hr: 'Croatian', cs: 'Czech', da: 'Danish', nl: 'Dutch',
  en: 'English', eo: 'Esperanto', et: 'Estonian', tl: 'Filipino', fi: 'Finnish',
  fr: 'French', fy: 'Frisian', gl: 'Galician', ka: 'Georgian', de: 'German',
  el: 'Greek', gu: 'Gujarati', ht: 'Haitian Creole', ha: 'Hausa', haw: 'Hawaiian',
  he: 'Hebrew', hi: 'Hindi', hmn: 'Hmong', hu: 'Hungarian', is: 'Icelandic',
  ig: 'Igbo', id: 'Indonesian', ga: 'Irish', it: 'Italian', ja: 'Japanese',
  jv: 'Javanese', kn: 'Kannada', kk: 'Kazakh', km: 'Khmer', rw: 'Kinyarwanda',
  ko: 'Korean', ku: 'Kurdish', ky: 'Kyrgyz', lo: 'Lao', la: 'Latin',
  lv: 'Latvian', lt: 'Lithuanian', lb: 'Luxembourgish', mk: 'Macedonian', mg: 'Malagasy',
  ms: 'Malay', ml: 'Malayalam', mt: 'Maltese', mi: 'Maori', mr: 'Marathi',
  mn: 'Mongolian', my: 'Myanmar (Burmese)', ne: 'Nepali', no: 'Norwegian', or: 'Odia',
  ps: 'Pashto', fa: 'Persian', pl: 'Polish', pt: 'Portuguese', pa: 'Punjabi',
  ro: 'Romanian', ru: 'Russian', sm: 'Samoan', gd: 'Scots Gaelic', sr: 'Serbian',
  st: 'Sesotho', sn: 'Shona', sd: 'Sindhi', si: 'Sinhala', sk: 'Slovak',
  sl: 'Slovenian', so: 'Somali', es: 'Spanish', su: 'Sundanese', sw: 'Swahili',
  sv: 'Swedish', tg: 'Tajik', ta: 'Tamil', tt: 'Tatar', te: 'Telugu',
  th: 'Thai', tr: 'Turkish', tk: 'Turkmen', uk: 'Ukrainian', ur: 'Urdu',
  ug: 'Uyghur', uz: 'Uzbek', vi: 'Vietnamese', cy: 'Welsh', xh: 'Xhosa',
  yi: 'Yiddish', yo: 'Yoruba', zu: 'Zulu',
};

/**
 * Detects language and translates in a single LLM call.
 * Returns { translatedText, detectedLang }
 */
export async function detectAndTranslate(text, targetLangCode) {
  if (!text?.trim()) return { translatedText: text, detectedLang: 'en' };

  const cacheKey = `${targetLangCode}:${text.trim()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const result = await db.integrations.Core.InvokeLLM({
    model: 'gemini_3_flash',
    prompt: `Detect the ISO 639-1 language code of this text and translate it to language code "${targetLangCode}".
If the text is already in "${targetLangCode}", set translation to the exact same text.
Respond with a valid JSON object only — no markdown, no extra text:
{"detected": "<iso639-1 code>", "translation": "<translated text>"}

Text: ${JSON.stringify(text)}`,
    response_json_schema: {
      type: 'object',
      properties: {
        detected: { type: 'string' },
        translation: { type: 'string' }
      }
    }
  });

  const detectedLang = result?.detected || 'en';
  // If source already matches target, skip storing a duplicate translation
  const translatedText = (detectedLang === targetLangCode)
    ? text
    : (result?.translation || text);

  const payload = { translatedText, detectedLang };
  cacheSet(cacheKey, payload);
  return payload;
}

// Kept for backward compatibility with VoiceRecorder
export async function detectLanguage(text) {
  const { detectedLang } = await detectAndTranslate(text, 'en');
  return detectedLang;
}

export async function translateText(text, targetLang) {
  const { translatedText } = await detectAndTranslate(text, targetLang);
  return translatedText;
}