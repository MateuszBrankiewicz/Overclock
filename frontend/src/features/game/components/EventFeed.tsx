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

/** Mount once under the top bar of the in-game HUD. Hidden on phone-sized viewports (`.phone-hidden`). */
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
      className="phone-hidden pointer-events-none flex w-full max-w-[min(85vw,18rem)] sm:max-w-xs flex-col gap-1"
    >
      {visible.map((entry, index) => {
        const isOlderThan3 = visible.length > 3 && index < visible.length - 3;
        return (
          <div
            key={entry.id}
            data-testid="event-feed-entry"
            style={{ opacity: 0.45 + (0.55 * (index + 1)) / visible.length }}
            className={clsx(
              'rounded border-l-2 bg-black/75 px-2 py-0.5 text-[11px] leading-tight backdrop-blur-sm transition-opacity duration-500 sm:text-xs',
              isOlderThan3 && 'hidden sm:block',
              TONE_CLASS[entry.tone]
            )}
          >
            {entry.text}
          </div>
        );
      })}
    </div>
  );
}
