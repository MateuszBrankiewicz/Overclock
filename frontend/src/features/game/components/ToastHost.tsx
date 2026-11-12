import clsx from 'clsx';
import { X } from 'lucide-react';

import { useI18n } from '../../../shared/i18n';
import { type Toast, useUiStore } from '../stores/useUiStore';

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);
  return <ToastList toasts={toasts} onDismiss={dismissToast} />;
}

export function ToastList({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  const { t } = useI18n();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:pr-4"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          data-testid="toast"
          className={clsx(
            'pointer-events-auto flex max-w-sm items-start gap-3 rounded border px-3 py-2 text-xs shadow-lg backdrop-blur-md',
            toast.kind === 'error' && 'border-red-500/60 bg-red-950/90 text-red-200',
            toast.kind === 'info' && 'border-amber-500/60 bg-zinc-900/90 text-amber-200',
            toast.kind === 'success' && 'border-emerald-500/60 bg-emerald-950/90 text-emerald-200'
          )}
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
        </div>
      ))}
    </div>
  );
}
