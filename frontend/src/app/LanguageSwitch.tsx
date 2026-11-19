import { Globe } from 'lucide-react';

import { type Language, useI18n } from '../shared/i18n';

const LANGUAGES: readonly Language[] = ['pl', 'en'];

export function LanguageSwitch() {
  const language = useI18n((s) => s.language);
  const setLanguage = useI18n((s) => s.setLanguage);

  return (
    <div className="flex items-center bg-black/70 border border-zinc-700 rounded p-0.5">
      <Globe className="w-3.5 h-3.5 text-zinc-400 ml-1.5 mr-1" />
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          className={`px-2 py-0.5 rounded text-[11px] font-black transition-colors cursor-pointer ${
            language === lang ? 'bg-emerald-500 text-black' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {lang.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
