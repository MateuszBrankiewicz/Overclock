import { create } from "zustand";

import { en } from "./locales/en";
import { pl } from "./locales/pl";
import type { Language, Translations } from "./types";

export type { Language, Translations };

export const translations: Record<Language, Translations> = { pl, en };

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const getInitialLanguage = (): Language => {
  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const saved = localStorage.getItem("overclock_lang") as Language | null;
    if (saved === "pl" || saved === "en") {
      return saved;
    }
    // Default to Polish as requested by user
    return "pl";
  }
  return "pl";
};

export const useI18n = create<I18nStore>((set) => {
  const initialLang = getInitialLanguage();
  return {
    language: initialLang,
    setLanguage: (language: Language) => {
      if (
        typeof window !== "undefined" &&
        typeof localStorage !== "undefined"
      ) {
        localStorage.setItem("overclock_lang", language);
      }
      set({ language, t: translations[language] });
    },
    t: translations[initialLang],
  };
});
