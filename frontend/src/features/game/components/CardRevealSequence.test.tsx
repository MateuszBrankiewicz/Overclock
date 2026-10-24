import { describe, expect, it } from 'vitest';

import { CardRevealSequence } from './CardRevealSequence';

describe('CardRevealSequence Component (TASK-1.5)', () => {
  it('is exported as a React functional component', () => {
    expect(CardRevealSequence).toBeDefined();
    expect(typeof CardRevealSequence).toBe('function');
  });
});

