import clsx from 'clsx';
import { motion } from 'motion/react';
import React, { useEffect, useRef } from 'react';

import { useI18n } from '../../../../shared/i18n';
import { PROTOCOL_HEX } from '../../../../shared/theme/protocols';
import type { CardProtocol, PlayerCard } from '../../schemas/gameEvents';
import { resolveSeatCharacter } from '../../utils/characterCatalog';
import {
  DISCHARGE_CHARGE_MS,
  dischargeStrikeDelayMs,
  DRUM_SPINDOWN_MS,
  revealCardFlipAtMs,
} from '../../utils/cinematicTiming';
import { type CardMark, classifyCard } from '../arena3d/hud/cardMarks';
import { RigAvatarSvg } from '../RigAvatarSvg';
import { type ShowdownTone, TONE, useReached } from './showdownTheme';

/** Where the bluff check is: done steps are ticked, the current one glows in the panel tone. */
export const ShowdownStepper: React.FC<{ current: number; tone: ShowdownTone }> = ({
  current,
  tone,
}) => {
  const { t } = useI18n();
  return (
    <ol data-testid="showdown-stepper" className="flex items-center gap-1 sm:gap-1.5">
      {t.verdict.steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo';
        return (
          <li
            key={label}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            className="flex items-center gap-1 sm:gap-1.5"
          >
            {i > 0 && (
              <span
                aria-hidden="true"
                className={clsx('h-px w-2 sm:w-4', state === 'todo' ? 'bg-zinc-700' : 'bg-zinc-400')}
              />
            )}
            <span
              className={clsx(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[9px] font-black leading-none',
                state === 'done' && 'border-zinc-400 bg-zinc-400 text-black',
                state === 'current' && clsx('border-current', TONE[tone].text),
                state === 'todo' && 'border-zinc-700 text-zinc-600'
              )}
            >
              {state === 'done' ? '✓' : i + 1}
            </span>
            <span
              className={clsx(
                'text-[9px] sm:text-[10px] font-black tracking-[0.14em] whitespace-nowrap',
                state === 'current' ? TONE[tone].text : 'hidden md:inline',
                state === 'done' && 'text-zinc-400',
                state === 'todo' && 'text-zinc-600'
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

export interface ShowdownOperator {
  nickname: string;
  isLocal: boolean;
  characterId?: string | null;
  riskLevel: number;
}

export type PlateState = 'neutral' | 'safe' | 'tested';

/** One side of the duel: portrait, name, role and (after the verdict) what happens to them. */
export const OperatorPlate: React.FC<{
  operator: ShowdownOperator;
  role: string;
  state: PlateState;
  tone: ShowdownTone;
  mirrored?: boolean;
}> = ({ operator, role, state, tone, mirrored = false }) => {
  const { t } = useI18n();
  const profile = resolveSeatCharacter(operator.characterId);
  return (
    <div
      data-testid="showdown-plate"
      data-state={state}
      className={clsx(
        'flex min-w-0 flex-1 items-center gap-2 rounded-xl border px-2 py-1.5 transition-colors duration-300',
        mirrored && 'flex-row-reverse text-right',
        state === 'neutral' && 'border-zinc-700/80 bg-zinc-900/60',
        state === 'safe' && 'border-zinc-800 bg-zinc-900/40 opacity-60',
        state === 'tested' && clsx(TONE[tone].soft, 'motion-safe:animate-pulse')
      )}
    >
      <RigAvatarSvg
        profile={profile}
        isSelected={state !== 'safe'}
        sizeClassName="w-9 h-9 sm:w-11 sm:h-11"
      />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="truncate text-sm sm:text-base font-black uppercase tracking-wide text-white">
          {operator.isLocal ? t.verdict.you : operator.nickname}
        </span>
        <span className="truncate text-[9px] sm:text-[10px] font-bold tracking-[0.2em] text-zinc-400">
          {role}
        </span>
        {state !== 'neutral' && (
          <span
            className={clsx(
              'truncate text-[9px] sm:text-[10px] font-black tracking-[0.14em]',
              state === 'tested' ? TONE[tone].text : 'text-emerald-400'
            )}
          >
            {state === 'tested' ? `⚡ ${t.verdict.tagToTest}` : `✓ ${t.verdict.tagSafe}`}
          </span>
        )}
      </div>
    </div>
  );
};

const PROTOCOL_GLYPH: Record<CardProtocol, string> = {
  Alpha: 'A',
  Beta: 'B',
  Gamma: 'G',
  Glitch: '✦',
  Corrupted: '✖',
};

const MARK_STYLE: Record<CardMark, { badge: string; ring: string; glyph: string }> = {
  match: { badge: 'bg-emerald-500 text-black', ring: 'ring-emerald-400', glyph: '✓' },
  wild: { badge: 'bg-fuchsia-500 text-black', ring: 'ring-fuchsia-400', glyph: '★' },
  bluff: { badge: 'bg-red-500 text-white', ring: 'ring-red-500', glyph: '✖' },
};

const ShowdownCard: React.FC<{
  card: PlayerCard;
  index: number;
  declaredProtocol: CardProtocol;
  startedAtMs: number;
}> = ({ card, index, declaredProtocol, startedAtMs }) => {
  const { t } = useI18n();
  const flipped = useReached(revealCardFlipAtMs(index, startedAtMs));
  const mark = classifyCard(card.protocol, declaredProtocol);
  const color = PROTOCOL_HEX[card.protocol] ?? '#a1a1aa';
  const markLabel =
    mark === 'match'
      ? t.controls.legendMatch
      : mark === 'wild'
        ? t.controls.legendWild
        : t.controls.legendBluff;
  return (
    <div
      data-testid="showdown-card"
      data-flipped={flipped ? 'true' : 'false'}
      className="h-[4.5rem] w-12 sm:h-24 sm:w-16 [perspective:600px]"
    >
      <div
        className="relative h-full w-full transition-transform duration-[380ms] ease-out motion-reduce:transition-none [transform-style:preserve-3d]"
        style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
      >
        {/* Encrypted back: scanned until its turn to flip. */}
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg border border-amber-500/60 bg-zinc-900 [backface-visibility:hidden]">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(135deg,transparent_0_5px,rgba(245,158,11,0.35)_5px_6px)]"
          />
          <span className="relative text-xl font-black text-amber-400/80 motion-safe:animate-pulse">
            ?
          </span>
        </div>
        {/* The face only exists once flipped, so the verdict cannot be read early. */}
        {flipped && (
          <div
            className={clsx(
              'absolute inset-0 flex flex-col items-center justify-between rounded-lg border-2 bg-zinc-950 py-1 ring-2 ring-offset-1 ring-offset-black [backface-visibility:hidden] [transform:rotateY(180deg)]',
              MARK_STYLE[mark].ring
            )}
            style={{ borderColor: color, boxShadow: `inset 0 0 18px ${color}55` }}
          >
            <span className="text-[8px] sm:text-[9px] font-black tracking-wider" style={{ color }}>
              {card.protocol.toUpperCase()}
            </span>
            <span className="text-2xl sm:text-3xl font-black leading-none" style={{ color }}>
              {PROTOCOL_GLYPH[card.protocol]}
            </span>
            <span
              className={clsx(
                'rounded px-1 text-[8px] sm:text-[9px] font-black leading-tight tracking-wide',
                MARK_STYLE[mark].badge
              )}
            >
              {MARK_STYLE[mark].glyph} {markLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/** The contested cards, flipped one by one in step with the cards on the 3D table. */
export const ShowdownCards: React.FC<{
  cards: PlayerCard[];
  declaredProtocol: CardProtocol;
  startedAtMs: number;
}> = ({ cards, declaredProtocol, startedAtMs }) => (
  <div className="flex items-center justify-center gap-1.5 sm:gap-2">
    {cards.map((card, i) => (
      <ShowdownCard
        key={card.id}
        card={card}
        index={i}
        declaredProtocol={declaredProtocol}
        startedAtMs={startedAtMs}
      />
    ))}
  </div>
);

/** Six capacitor chambers; the first `risk` ones are live. Lit one by one while charging. */
export const ChamberRow: React.FC<{ risk: number; roll: number | null; charging: boolean }> = ({
  risk,
  roll,
  charging,
}) => (
  <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => {
      const face = i + 1;
      const isLive = face <= risk;
      const isHit = roll === face;
      return (
        <motion.span
          key={face}
          initial={charging ? { opacity: 0.15, scale: 0.6 } : false}
          animate={{ opacity: 1, scale: isHit ? 1.3 : 1 }}
          transition={{ delay: charging ? (i * DISCHARGE_CHARGE_MS) / 6000 : 0, duration: 0.18 }}
          className={clsx(
            'flex h-7 w-7 items-center justify-center rounded-md border text-xs font-black',
            isLive
              ? 'border-red-500 bg-red-950/80 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.7)]'
              : 'border-zinc-600 bg-zinc-900/80 text-zinc-400',
            isHit && 'ring-2 ring-white'
          )}
        >
          {face}
        </motion.span>
      );
    })}
  </div>
);

/** A d6 face that tumbles through numbers and slows down until the strike. */
export const TumblingDie: React.FC<{ startedAtMs: number }> = ({ startedAtMs }) => {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const strikeAt = startedAtMs + dischargeStrikeDelayMs();
    let raf = 0;
    let nextChangeAt = 0;
    let face = 1;
    const tick = () => {
      const now = Date.now();
      if (now >= nextChangeAt && ref.current) {
        face = ((face + Math.floor(Math.random() * 5)) % 6) + 1;
        ref.current.textContent = String(face);
        // Slows from ~16 to ~3 faces per second as the drum spins down.
        const left = Math.min(1, Math.max(0, strikeAt - now) / DRUM_SPINDOWN_MS);
        nextChangeAt = now + 60 + (1 - left) * 280;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [startedAtMs]);
  return (
    <span
      ref={ref}
      className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-amber-400 bg-black text-3xl font-black text-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.6)]"
    >
      ?
    </span>
  );
};
