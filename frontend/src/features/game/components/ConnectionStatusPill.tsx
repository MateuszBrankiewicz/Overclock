import clsx from 'clsx';

import { useI18n } from '../../../shared/i18n';
import { type ConnectionStatus, useUiStore } from '../stores/useUiStore';

export function ConnectionStatusPill() {
  const status = useUiStore((s) => s.connectionStatus);
  return <ConnectionStatusBadge status={status} />;
}

export function ConnectionStatusBadge({ status }: { status: ConnectionStatus }) {
  const { t } = useI18n();

  if (status === 'Connected') return null;

  const label =
    status === 'Reconnecting'
      ? t.network.reconnecting
      : status === 'Connecting'
        ? t.network.connecting
        : status === 'Error'
          ? t.network.connectionError
          : t.network.disconnected;
  const amber = status === 'Reconnecting' || status === 'Connecting';

  return (
    <span
      data-testid="connection-pill"
      className={clsx(
        'rounded-full border px-2 py-0.5 text-[11px] font-bold',
        amber ? 'motion-safe:animate-pulse border-amber-500/60 bg-amber-950/70 text-amber-300' : 'border-red-500/60 bg-red-950/70 text-red-300'
      )}
    >
      {label}
    </span>
  );
}
