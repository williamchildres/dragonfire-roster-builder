import { describe, expect, it } from 'vitest';
import { pass17Analysis } from './pass17Helpers';

describe('Daemoros/Rhysarion/Vaeldra Control card pass 17', () => {
  it('projects one four-bullet Control card with Lure prerequisite context', () => {
    const { presentation } = pass17Analysis();
    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    expect(rhysarion.receives).toHaveLength(4);
    const cards = rhysarion.receives.filter((card) => card.effectTitle === 'Control enhances Dawnsong damage rate');
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.sourceName).toBe('Daemoros and Vaeldra');
    expect(card.sourceName).not.toBe('Team');
    expect(card.effectTitle).toBe('Control enhances Dawnsong damage rate');
    expect(card.summaryLines).toEqual([
      'Shroud of Shadows checks odd-numbered rounds: 15% chance to apply Confusion to one enemy within adjacency; Confusion lasts 2 rounds.',
      "Lure checks each round: 25% chance to Taunt 3 enemies in any lane for 2 rounds. Siren's Call checks Rounds 1, 2, and 3 at 40%: already-Taunted enemies receive Stagger until end of the current round, while non-Taunted enemies take the Taunt branch. The branches are mutually exclusive per enemy.",
      "Against the same otherwise-eligible enemy with Control, Dawnsong Fire Damage Rate increases from 20% to 30%; Confusion may carry into later Dawnsong rounds, while Siren's Call Stagger can overlap only Round 2 and must resolve before Dawnsong.",
      'Supplier application success, Lure-to-Siren same-target overlap, eligible enemy identity, roll scope, and same-round action order remain unresolved.',
    ]);
    expect(card.summaryLines).toHaveLength(4);
    expect(card.summary).not.toMatch(/Base current|Enhanced current|Conditional multiplier|1\.5x|source effect ID/i);
    expect(card.details.join(' ')).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
    expect(card.details.join(' ')).toContain("Siren's Call's Stagger branch overlaps Dawnsong only on Round 2");
    expect(card.details.join(' ')).toContain("Prerequisite context: Lure can establish the Taunt required by Siren's Call's Stagger branch.");
    expect(card.details.join(' ')).not.toMatch(/Lure .*direct .*Control supplier|Taunt directly enhances Dawnsong/i);

    expect(card.details.join(' ')).toContain('Round 8 after a successful Round 7 application');
    expect(card.details.join(' ')).toContain("Known possible overlap windows: Round 1 from a successful Round 1 Lure only if Lure resolves before Siren's Call that round");
    expect(card.details.join(' ')).not.toMatch(/Taunt directly enhances Dawnsong/i);
  });
});
