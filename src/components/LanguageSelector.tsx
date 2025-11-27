/**
 * Language Selector Component
 * Toggle between Spanish and English
 */

import { Languages } from 'lucide-react';
import { useLanguage, type Language } from '../lib/i18n.tsx';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'es', label: 'Español', flag: 'ES' },
    { code: 'en', label: 'English', flag: 'EN' },
  ];

  return (
    <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1a1a1a] rounded-lg p-1 shadow-[0_0_15px_rgba(255, 255, 255,0.15)]">
      <Languages className="w-4 h-4 text-[#ffffff] ml-2" />
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all font-medium text-sm ${
            language === lang.code
              ? 'bg-gradient-to-br from-[#ffffff] to-[#e0e0e0] text-black shadow-[0_0_15px_rgba(255, 255, 255,0.6)] font-bold'
              : 'text-[#ffffff] hover:text-[#ffffff] hover:bg-[#141414] hover:border-[#ffffff]/30'
          }`}
          title={lang.label}
        >
          <span className="text-xs font-bold">{lang.flag}</span>
          <span>{lang.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
}

