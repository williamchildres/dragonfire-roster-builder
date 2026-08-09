import { describe, expect, it } from 'vitest';

import { dragons } from '../data/dragons';

describe('Moondancer source fidelity', () => {
  it('tags New Moon as Initiative-enhanced and never Instinct-enhanced', () => {
    const moondancer = dragons.find(({ id }) => id === 'moondancer')!;
    const newMoon = moondancer.habits.find(({ id }) => id === 'moondancer-new-moon')!;

    expect(newMoon.rawDescription).toContain('enhanced by Initiative');
    expect(newMoon.tags).toContain('INITIATIVE_SCALING');
    expect(newMoon.tags).not.toContain('ENHANCED_BY_INSTINCT');
  });
});
