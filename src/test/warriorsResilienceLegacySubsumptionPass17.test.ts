import { describe, expect, it } from 'vitest';
import { pass17Analysis, traceText } from './pass17Helpers';

describe("Warrior's Resilience legacy periodic subsumption pass 17", () => {
  it('keeps one typed Tactical Damage support trace and suppresses redundant legacy periodic traces', () => {
    const { traces } = pass17Analysis();
    const typed = traces.filter((trace) =>
      trace.title === 'Tactical Damage Support' &&
      trace.sourceDragonId === 'vaeldra' &&
      trace.sourceAbilityId === 'vaeldra-warriors-resilience' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.channel === 'tactical-damage'
    );
    expect(typed).toHaveLength(1);
    const trace = typed[0]!;
    expect(trace.status).toBe('inactive');
    expect(trace.modifierCapabilityId).toBe('vaeldra-warriors-resilience-warriors-resilience-left-tactical-tactical-damage-dealt-modifier');
    expect(trace.matchedOutputCapabilityIds).toEqual(expect.arrayContaining([
      'periodic-daemoros-instill-fear-instill-fear-panic-panic-output',
      'periodic-daemoros-darkening-fear-darkening-fear-panic-panic-output',
    ]));
    expect(traceText(trace)).toContain('Source effect ID: warriors-resilience-left-tactical.');
    expect(traceText(trace)).toContain('Provider position requirement is not satisfied');

    expect(traces.filter((candidate) =>
      candidate.matchKind === 'periodic-damage-amplification' &&
      candidate.sourceDragonId === 'vaeldra' &&
      candidate.sourceAbilityId === 'vaeldra-warriors-resilience' &&
      candidate.recipientDragonId === 'daemoros' &&
      /Instill Fear|Darkening Fear|Periodic Damage Support/i.test([candidate.title, candidate.recipientAbilityId].join(' '))
    )).toHaveLength(0);
    expect(traces.filter((candidate) =>
      candidate.title === 'Tactical Damage Support' &&
      candidate.sourceAbilityId === 'vaeldra-warriors-resilience' &&
      candidate.recipientDragonId === 'daemoros'
    )).toHaveLength(1);
  });
});
