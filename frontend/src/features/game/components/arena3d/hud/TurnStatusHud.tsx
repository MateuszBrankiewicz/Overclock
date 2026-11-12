import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { useI18n } from '../../../../../shared/i18n';
import { useYourTurnBanner } from '../../../hooks/useYourTurnBanner';

export interface YourTurnBannerViewProps {
  visible: boolean;
}

export const YourTurnBannerView: React.FC<YourTurnBannerViewProps> = ({ visible }) => {
  const { t } = useI18n();
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="your-turn"
          data-testid="your-turn-banner"
          initial={{ x: '-120%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '120%', opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 px-8 py-3 rounded-xl border-2 border-emerald-300 bg-emerald-950/90 text-emerald-200 text-2xl sm:text-3xl font-black tracking-[0.3em] shadow-[0_0_40px_rgba(16,185,129,0.8)] pointer-events-none"
        >
          ▶ {t.hud.yourTurnBanner}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export interface YourTurnBannerProps {
  isMyTurn: boolean;
}

export const YourTurnBanner: React.FC<YourTurnBannerProps> = ({ isMyTurn }) => {
  const visible = useYourTurnBanner(isMyTurn);
  return <YourTurnBannerView visible={visible} />;
};

export interface ActiveTurnLabelProps {
  isMyTurn: boolean;
  activePlayerNickname?: string | null;
}

/** Names who is acting when it is an opponent's turn. */
export const ActiveTurnLabel: React.FC<ActiveTurnLabelProps> = ({
  isMyTurn,
  activePlayerNickname,
}) => {
  const { t } = useI18n();
  if (isMyTurn || !activePlayerNickname) return null;
  return (
    <div
      data-testid="active-turn-label"
      className="px-2.5 py-1 rounded-lg border border-amber-500/70 bg-black/85 text-[10px] font-bold tracking-wider text-amber-300"
    >
      {t.hud.opponentTurnBanner}: <strong className="text-amber-200">{activePlayerNickname}</strong>
    </div>
  );
};
