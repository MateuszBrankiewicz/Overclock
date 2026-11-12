import { AlertTriangle, BookOpen, Cpu, Flame, Layers, Radio, ShieldAlert, ShieldCheck, Sparkles, Timer, X, Zap } from 'lucide-react';
import React from 'react';

import { useI18n } from '../../../shared/i18n';

export interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GameRulesModal: React.FC<GameRulesModalProps> = ({ isOpen, onClose }) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto font-mono select-none"
    >
      <div className="relative w-full max-w-2xl bg-zinc-950 border-2 border-emerald-500/80 rounded-xl shadow-[0_0_50px_rgba(16,185,129,0.3)] p-6 space-y-5 text-zinc-300 my-8">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 id="rules-modal-title" className="text-base font-extrabold text-emerald-300 tracking-wider">
              {t.rules.modalTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed border-l-2 border-emerald-500 pl-3">
          {t.rules.shortSummary}
        </p>

        <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
          {/* 1. Cel */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <h3 className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              {t.rules.coreGoalTitle}
            </h3>
            <p className="text-zinc-300 leading-relaxed">{t.rules.coreGoalText}</p>
          </div>

          {/* 2. Protokół */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <h3 className="font-bold text-amber-400 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-amber-400" />
              {t.rules.step1Title}
            </h3>
            <p className="text-zinc-300 leading-relaxed">{t.rules.step1Text}</p>
          </div>

          {/* 3. Blef */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <h3 className="font-bold text-cyan-400 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-cyan-400" />
              {t.rules.step2Title}
            </h3>
            <p className="text-zinc-300 leading-relaxed">{t.rules.step2Text}</p>
          </div>

          {/* 4. Sprawdzenie */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <h3 className="font-bold text-red-400 flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-red-400" />
              {t.rules.step3Title}
            </h3>
            <p className="text-zinc-300 leading-relaxed">{t.rules.step3Text}</p>
          </div>

          {/* 5. Przeciążenie */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded p-3">
            <h3 className="font-bold text-amber-500 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-500" />
              {t.rules.step4Title}
            </h3>
            <p className="text-zinc-300 leading-relaxed">{t.rules.step4Text}</p>
          </div>

          {/* 6. Karty Specjalne w Talii */}
          <div className="bg-zinc-900/80 border border-fuchsia-900/60 rounded-lg p-3 space-y-3">
            <h3 className="font-extrabold text-fuchsia-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <Layers className="w-4 h-4 text-fuchsia-400" />
              {t.rules.specialCardsTitle}
            </h3>
            <p className="text-[11px] text-zinc-400">{t.rules.specialCardsDesc}</p>

            <div className="grid grid-cols-1 gap-2.5">
              {/* GLITCH */}
              <div className="p-2.5 rounded bg-purple-950/40 border border-fuchsia-500/70 space-y-1 shadow-[0_0_12px_rgba(217,70,239,0.15)]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-fuchsia-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                    {t.rules.glitchCardTitle}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-fuchsia-500 text-black">
                    WILD
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t.rules.glitchCardDesc}
                </p>
              </div>

              {/* CORRUPTED */}
              <div className="p-2.5 rounded bg-red-950/30 border border-red-700/70 space-y-1 shadow-[0_0_12px_rgba(239,68,68,0.15)]">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    {t.rules.corruptedCardTitle}
                  </span>
                  <span className="text-[10px] font-black px-1.5 py-0.2 rounded bg-red-600 text-black">
                    BLUFF ONLY
                  </span>
                </div>
                <p className="text-zinc-300 text-[11px] leading-relaxed">
                  {t.rules.corruptedCardDesc}
                </p>
              </div>

              {/* STANDARD PACKETS */}
              <div className="p-2 rounded bg-zinc-950/60 border border-zinc-800 space-y-1">
                <span className="font-bold text-zinc-300 text-[11px] block">
                  {t.rules.standardCardsTitle}
                </span>
                <p className="text-zinc-400 text-[11px]">
                  {t.rules.standardCardsDesc}
                </p>
              </div>
            </div>
          </div>

          {/* 7. Chipy Akcji (Moduły Exploit) */}
          <div className="bg-zinc-900/80 border border-cyan-900/60 rounded-lg p-3 space-y-3">
            <h3 className="font-extrabold text-cyan-300 flex items-center gap-1.5 border-b border-zinc-800 pb-1.5">
              <Cpu className="w-4 h-4 text-cyan-400" />
              {t.rules.chipsTitle}
            </h3>
            <p className="text-[11px] text-zinc-400">{t.rules.chipsSubtitle}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-2 rounded bg-cyan-950/30 border border-cyan-500/40">
                <span className="font-bold text-cyan-300 flex items-center gap-1 text-[11px]">
                  <Radio className="w-3.5 h-3.5 text-cyan-400" />
                  SN74-SNIFF (SNIFFER)
                </span>
                <p className="text-zinc-300 text-[10px] mt-1 leading-relaxed">
                  {t.rules.snifferChipDesc}
                </p>
              </div>

              <div className="p-2 rounded bg-amber-950/30 border border-amber-500/40">
                <span className="font-bold text-amber-300 flex items-center gap-1 text-[11px]">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  SN74-FLARE (EMP)
                </span>
                <p className="text-zinc-300 text-[10px] mt-1 leading-relaxed">
                  {t.rules.empChipDesc}
                </p>
              </div>

              <div className="p-2 rounded bg-red-950/30 border border-red-500/40">
                <span className="font-bold text-red-300 flex items-center gap-1 text-[11px]">
                  <Timer className="w-3.5 h-3.5 text-red-400" />
                  SN74-INJ (OVERCLOCK)
                </span>
                <p className="text-zinc-300 text-[10px] mt-1 leading-relaxed">
                  {t.rules.overclockChipDesc}
                </p>
              </div>

              <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/40">
                <span className="font-bold text-emerald-300 flex items-center gap-1 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  SN74-GND (UZIEMIENIE)
                </span>
                <p className="text-zinc-300 text-[10px] mt-1 leading-relaxed">
                  {t.rules.groundChipDesc}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded text-xs transition-colors cursor-pointer"
          >
            {t.rules.close}
          </button>
        </div>
      </div>
    </div>
  );
};
