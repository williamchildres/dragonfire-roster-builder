import { describe, expect, it } from 'vitest';
import { pass19Analysis, traceText } from './pass19Helpers';

const infectiousOutput = 'seasmoke-infectious-wrath-infectious-wrath-physical-damage-rate-output';
const instillStatus = 'daemoros-instill-fear-instill-fear-panic-panic-status-output';
const darkeningStatus = 'daemoros-darkening-fear-darkening-fear-panic-panic-status-output';
const expectedBullets = [
  'Instill Fear checks each round: 25% chance to apply Panic to one enemy in any lane, preferring Right Flank; Panic lasts 2 rounds.',
  'Darkening Fear checks each round independently: 25% chance to apply Panic to one enemy in any lane, preferring Left Flank; Panic lasts 2 rounds.',
  'Against the same otherwise-eligible Panicked enemy, Infectious Wrath Physical Damage Rate increases from 30% to 60% on Rounds 3, 6, and 9; prior-round Panic may carry over, while same-round overlap requires the relevant supplier to resolve first.',
  'Supplier activation success, eligible enemy identity, same-target overlap, and same-round action order remain unresolved.',
];

describe('Pass 19 Panic dependency aggregation', () => {
  it('keeps Instill Fear and Darkening Fear dependency traces separate with typed capabilities', () => {
    const { traces } = pass19Analysis();
    const panic = traces.filter((trace) =>
      trace.matchKind === 'status-condition-enablement' &&
      trace.recipientAbilityId === 'seasmoke-infectious-wrath' &&
      trace.title === 'Panic enables Infectious Wrath'
    );
    expect(panic).toHaveLength(2);
    expect(panic.every((trace) => trace.status === 'potential')).toBe(true);

    const instill = panic.find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear')!;
    const darkening = panic.find((trace) => trace.sourceAbilityId === 'daemoros-darkening-fear')!;
    expect(instill.modifierCapabilityIds).toEqual([instillStatus]);
    expect(instill.matchedOutputCapabilityIds).toEqual([infectiousOutput]);
    expect(darkening.modifierCapabilityIds).toEqual([darkeningStatus]);
    expect(darkening.matchedOutputCapabilityIds).toEqual([infectiousOutput]);
    expect(traceText(instill)).toContain('Shared activation group: instill-fear-each-round-shared-activation.');
    expect(traceText(darkening)).toContain('Shared activation group: darkening-fear-each-round-shared-activation.');
    expect(traceText(instill)).toContain('Selected-target group: instill-fear-target.');
    expect(traceText(darkening)).toContain('Selected-target group: darkening-fear-target.');
    expect(traceText(instill)).toContain('Priority: enemy Right Flank is preferred, not guaranteed.');
    expect(traceText(darkening)).toContain('Priority: enemy Left Flank is preferred, not guaranteed.');
    for (const trace of panic) {
      const text = traceText(trace);
      expect(text).toContain('Base current Physical Damage Rate: 30%.');
      expect(text).toContain('Enhanced current Physical Damage Rate: 60%.');
      expect(text).toContain('Dependent schedule: Rounds 3, 6, and 9.');
      expect(text).toContain('Panic must be active on the same enemy that Infectious Wrath checks for damage output.');
      expect(text).toContain('only if');
      expect(text).toContain('Known possible overlap windows:');
    }
  });

  it('collapses both Panic dependency cards into one concise provider card while retaining details', () => {
    const { presentation } = pass19Analysis();
    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    const cards = daemoros.provides.filter((item) => item.effectTitle === 'Panic enhances Infectious Wrath damage rate');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.sourceName).toBe('Daemoros');
    expect(cards[0]!.recipientName).toBe('Seasmoke');
    expect(cards[0]!.summaryLines).toEqual(expectedBullets);
    expect(cards[0]!.summary).not.toContain('Known possible overlap windows');
    expect(cards[0]!.summary.length).toBeLessThan(650);
    const details = cards[0]!.details.join(' ');
    expect(details).toContain('Instill Fear');
    expect(details).toContain('Darkening Fear');
    expect(details).toContain('Round 3 after a successful Round 2');
    expect(details).toContain('Round 6 after a successful Round 5');
    expect(details).toContain('Round 9 after a successful Round 8');
  });
});
