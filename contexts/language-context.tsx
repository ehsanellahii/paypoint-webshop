'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { Language, translations, Translations } from '@/lib/i18n';
import { storage } from '@/lib/utils';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'app-language';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const savedLang = storage.get<Language>(STORAGE_KEY, 'de');
    return savedLang === 'en' || savedLang === 'de' ? savedLang : 'de';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    storage.set(STORAGE_KEY, lang);
  };

  const value: LanguageContextType = {
    language,
    setLanguage,
    t: translations[language],
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
