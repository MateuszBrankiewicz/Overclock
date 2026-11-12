import React from 'react';

import { useI18n } from '../../../../../shared/i18n';

export interface HotkeyCheatSheetProps {
  open: boolean;
  onClose: () => void;
}

/** Small overlay listing the arena keyboard shortcuts (toggled with `?`). */
export const HotkeyCheatSheet: React.FC<HotkeyCheatSheetProps> = ({ open, onClose }) => {
  const { t } = useI18n();
  if (!open) return null;
  const rows: Array<[string, string]> = [
    ['1–9', t.controls.hotkeysCards],
    ['Enter / Space', t.controls.hotkeysTransmit],
    ['T', t.controls.hotkeysTrace],
    ['E', t.controls.hotkeysChip],
    ['Esc', t.controls.hotkeysClear],
    ['?', t.controls.hotkeysHelp],
  ];
  return (
    <div
      data-testid="hotkey-cheatsheet"
      role="dialog"
      aria-label={t.controls.hotkeysTitle}
      className="absolute top-16 right-3 z-40 w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-cyan-700/70 bg-black/90 backdrop-blur-md p-3 text-[11px] text-zinc-200 shadow-[0_0_25px_rgba(6,182,212,0.35)]"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-black tracking-widest text-cyan-300">{t.controls.hotkeysTitle}</span>
        <button
          type="button"
          onClick={onClose}
          className="px-1.5 rounded border border-zinc-700 text-zinc-400 hover:text-white"
        >
          {t.controls.hotkeysClose}
        </button>
      </div>
      <ul className="space-y-1">
        {rows.map(([key, label]) => (
          <li key={key} className="flex items-center gap-2">
            <kbd className="shrink-0 min-w-[2.5rem] text-center px-1.5 py-0.5 rounded border border-zinc-600 bg-zinc-900 font-bold text-emerald-300">
              {key}
            </kbd>
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
