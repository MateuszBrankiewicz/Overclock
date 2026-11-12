import { describe, expect, it } from 'vitest';

import { translations, useI18n } from './useI18n';

describe('useI18n Hook & Store', () => {
  it('defaults to Polish language (pl)', () => {
    const { language, t } = useI18n.getState();
    expect(language).toBe('pl');
    expect(t.common.gameRules).toBe('Zasady gry');
    expect(t.lobby.createTable).toContain('STWÓRZ');
  });

  it('can switch to English (en)', () => {
    useI18n.getState().setLanguage('en');
    const { language, t } = useI18n.getState();
    expect(language).toBe('en');
    expect(t.common.gameRules).toBe('Game Rules');
    expect(t.lobby.createTable).toBe('CREATE TABLE');
  });

  it('can switch back to Polish (pl)', () => {
    useI18n.getState().setLanguage('pl');
    const { language, t } = useI18n.getState();
    expect(language).toBe('pl');
    expect(t.common.operatingTable).toBe('STÓŁ ROZGRYWKI');
  });

  it('has identical keys for both language dictionaries', () => {
    const plKeys = Object.keys(translations.pl) as (keyof typeof translations.pl)[];
    const enKeys = Object.keys(translations.en) as (keyof typeof translations.en)[];
    expect(plKeys.sort()).toEqual(enKeys.sort());

    for (const section of plKeys) {
      const plSectionKeys = Object.keys(translations.pl[section]).sort();
      const enSectionKeys = Object.keys(translations.en[section]).sort();
      expect(plSectionKeys).toEqual(enSectionKeys);
    }
  });
});
