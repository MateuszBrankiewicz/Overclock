import { beforeEach, describe, expect, it } from 'vitest';

import { MAX_FEED_ENTRIES, useUiStore } from './useUiStore';

describe('useUiStore feed', () => {
  beforeEach(() => {
    useUiStore.setState({ feed: [] });
  });

  it('caps the feed and keeps the newest entries', () => {
    for (let i = 0; i < MAX_FEED_ENTRIES + 5; i++) {
      useUiStore.getState().pushFeedEntry({ text: `e${i}`, tone: 'neutral' });
    }
    const feed = useUiStore.getState().feed;
    expect(feed).toHaveLength(MAX_FEED_ENTRIES);
    expect(feed[feed.length - 1]?.text).toBe(`e${MAX_FEED_ENTRIES + 4}`);
    expect(new Set(feed.map((f) => f.id)).size).toBe(MAX_FEED_ENTRIES);
  });

  it('clears the feed', () => {
    useUiStore.getState().pushFeedEntry({ text: 'x', tone: 'info' });
    useUiStore.getState().clearFeed();
    expect(useUiStore.getState().feed).toEqual([]);
  });
});
