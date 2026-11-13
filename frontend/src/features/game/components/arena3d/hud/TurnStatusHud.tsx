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
          className="absolute top-1/3 left-1/2 -translate-x-1/2 z-40 px-4 py-2 sm:px-8 sm:py-3 rounded-xl border-2 border-emerald-300 bg-emerald-950/90 text-emerald-200 text-lg sm:text-3xl font-black tracking-[0.18em] sm:tracking-[0.3em] whitespace-nowrap max-w-[92vw] shadow-[0_0_40px_rgba(16,185,129,0.8)] pointer-events-none"
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
