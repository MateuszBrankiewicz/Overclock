import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { EventFeedList, VISIBLE_FEED_ENTRIES } from './EventFeed';

describe('EventFeedList', () => {
  it('renders only the latest entries in a polite live region and hides entries > 3 on mobile', () => {
    const entries = Array.from({ length: VISIBLE_FEED_ENTRIES + 2 }, (_, i) => ({
      id: i,
      text: `entry-${i}`,
      tone: 'neutral' as const,
    }));
    const html = renderToString(<EventFeedList entries={entries} label="EVENTS" />);
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('pointer-events-none');
    expect(html).not.toContain('entry-0<');
    expect(html).toContain(`entry-${VISIBLE_FEED_ENTRIES + 1}`);
    expect(html).toContain('hidden sm:block');
  });
});
