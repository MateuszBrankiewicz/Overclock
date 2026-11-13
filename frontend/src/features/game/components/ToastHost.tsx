import { X } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import { HudPanel, type HudPanelTone } from '../../../shared/ui';
import { type Toast, useUiStore } from '../stores/useUiStore';

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);
  return <ToastList toasts={toasts} onDismiss={dismissToast} />;
}

const TOAST_TONE: Record<Toast['kind'], HudPanelTone> = {
  error: 'danger',
  info: 'warning',
  success: 'accent',
};

export function ToastList({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-4"
    >
      {toasts.map((toast) => (
        <HudPanel
          key={toast.id}
          data-testid="toast"
          tone={TOAST_TONE[toast.kind]}
          cornerBrackets={false}
          className="pointer-events-auto flex max-w-sm items-start gap-3 px-3 py-2 text-xs"
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            aria-label={t.network.dismiss}
            onClick={() => onDismiss(toast.id)}
            className="cursor-pointer opacity-70 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </HudPanel>
      ))}
    </div>
  );
}
