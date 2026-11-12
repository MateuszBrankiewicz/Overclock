import React, { useEffect, useRef } from 'react';

import { useI18n } from '../../../../../shared/i18n';
import type { CardProtocol } from '../../../schemas/gameEvents';

const EMP_PROTOCOLS = ['Alpha', 'Beta', 'Gamma'] as const satisfies readonly CardProtocol[];

export interface ProtocolPickerPopoverProps {
  currentProtocol: CardProtocol | null;
  onPick: (protocol: CardProtocol) => void;
  onCancel: () => void;
}

/** EMP Flare target picker (ADR 0009). Dismiss with Esc, outside click or Cancel. */
export const ProtocolPickerPopover: React.FC<ProtocolPickerPopoverProps> = ({
  currentProtocol,
  onPick,
  onCancel,
}) => {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (ref.current && e.target instanceof Node && !ref.current.contains(e.target)) {
        onCancel();
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onCancel]);

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t.hud.empPickerTitle}
      data-no-camera-drag
      className="absolute bottom-full mb-2 right-0 w-60 p-3 rounded-xl border border-amber-400 bg-zinc-950/95 shadow-[0_0_24px_rgba(245,158,11,0.5)] text-[10px] text-zinc-300 pointer-events-auto"
    >
      <div className="font-black text-amber-300 tracking-wider">{t.hud.empPickerTitle}</div>
      <p className="mt-1 text-zinc-400">{t.hud.empPickerHint}</p>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {EMP_PROTOCOLS.map((protocol) => (
          <button
            key={protocol}
            type="button"
            onClick={() => onPick(protocol)}
            className="py-1.5 rounded font-bold text-black bg-amber-400 hover:bg-amber-300 cursor-pointer"
          >
            {protocol.toUpperCase()}
            {protocol === currentProtocol && (
              <span className="block text-[8px] font-normal">({t.hud.empPickerCurrent})</span>
            )}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onCancel}
        className="mt-2 w-full py-1 rounded border border-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
      >
        {t.hud.empPickerCancel}
      </button>
    </div>
  );
};
