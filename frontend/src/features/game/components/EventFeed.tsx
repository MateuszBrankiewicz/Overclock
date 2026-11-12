import clsx from 'clsx';

import { useI18n } from '../../../shared/i18n';
import { useUiStore } from '../stores/useUiStore';
import type { FeedEntry, FeedTone } from '../utils/formatFeedEvent';

export const VISIBLE_FEED_ENTRIES = 5;

const TONE_CLASS: Record<FeedTone, string> = {
  neutral: 'border-zinc-500/50 text-zinc-200',
  danger: 'border-red-500/60 text-red-300',
  success: 'border-emerald-500/60 text-emerald-300',
  info: 'border-amber-500/60 text-amber-200',
};

/** Mount once under the top bar of the in-game HUD. */
export function EventFeed() {
  const feed = useUiStore((s) => s.feed);
  const { t } = useI18n();
  return <EventFeedList entries={feed} label={t.feed.title} />;
}

export function EventFeedList({ entries, label }: { entries: FeedEntry[]; label: string }) {
  const visible = entries.slice(-VISIBLE_FEED_ENTRIES);
  return (
    <div
      role="log"
      aria-live="polite"
      aria-label={label}
      data-testid="event-feed"
      className="pointer-events-none fixed left-2 top-14 z-40 flex max-w-[55vw] flex-col gap-1 sm:left-4 sm:top-16 sm:max-w-xs"
    >
      {visible.map((entry, index) => (
        <div
          key={entry.id}
          data-testid="event-feed-entry"
          style={{ opacity: 0.45 + (0.55 * (index + 1)) / visible.length }}
          className={clsx(
            'rounded border-l-2 bg-black/60 px-2 py-0.5 text-[10px] leading-tight backdrop-blur-sm transition-opacity duration-500 sm:text-xs',
            TONE_CLASS[entry.tone]
          )}
        >
          {entry.text}
        </div>
      ))}
    </div>
  );
}
