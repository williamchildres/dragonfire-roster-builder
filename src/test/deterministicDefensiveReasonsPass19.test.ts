import { describe, expect, it } from 'vitest';
import { pass19Analysis, traceText } from './pass19Helpers';

const championReason = 'Exact final mitigated damage cannot be calculated because incoming damage, modifier-combination behavior, and the final mitigation formula remain unresolved.';
const phantomReasons = {
  physical: 'Exact final Physical Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
  tactical: 'Exact final Tactical Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
  fire: 'Exact final Fire Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
};

describe('Pass 19 deterministic defensive exact-result reasons', () => {
  it("routes Champion's Brilliance right-flank support to formula-only uncertainty", () => {
    const { traces } = pass19Analysis();
    const support = traces.find((trace) =>
      trace.sourceAbilityId === 'seasmoke-champions-brilliance' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.matchedFacts.includes('Source effect ID: seasmoke-right-flank-dr-down.')
    );
    expect(support).toBeDefined();
    expect(support!.status).toBe('active');
    expect(support!.effects.join(' ')).toContain('Damage Received decrease 8%.');
    expect(support!.exactResultUnknownReason).toBe(championReason);
    expect(traceText(support!)).not.toMatch(/activation success|activation chance|support uptime|modifier uptime|refresh behavior|unresolved target identity|unresolved duration/i);
    expect(traceText(support!)).toContain('incoming damage');
    expect(traceText(support!)).toContain('final mitigation formula');
  });

  it("routes Phantom's Veil one-of options to channel-selection uncertainty", () => {
    const { traces } = pass19Analysis();
    const overall = traces.find((trace) =>
      trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
      trace.modifierCapabilityIds?.includes('daemoros-phantoms-veil-phantoms-veil-exclusive-defense-damage-received-received-exclusive-choice-modifier')
    );
    expect(overall).toBeDefined();
    expect(overall!.status).toBe('active');

    for (const [channel, reason] of Object.entries(phantomReasons)) {
      const option = traces.find((trace) =>
        trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
        trace.modifierCapabilityIds?.some((id) => id.includes(`phantoms-veil-${channel}`))
      );
      expect(option).toBeDefined();
      expect(option!.status).toBe('potential');
      expect(option!.effects.join(' ')).toContain('15%');
      expect(option!.effects.join(' ')).toContain('Duration: until end of the current round.');
      expect(option!.exactResultUnknownReason).toBe(reason);
      expect(option!.exactResultUnknownReason).toContain('unresolved selection method');
      expect(traceText(option!)).not.toMatch(/activation success|activation chance|modifier uptime|support uptime|refresh behavior|duration[^.]*unresolved/i);
    }
  });

  it('preserves legitimate activation uncertainty for Loyal Bond and fear suppliers', () => {
    const { traces } = pass19Analysis();
    const loyalBond = traces.filter((trace) => trace.sourceAbilityId === 'seasmoke-loyal-bond');
    expect(loyalBond.some((trace) => /activation success|threshold/i.test(traceText(trace)))).toBe(true);
    const instill = traces.find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear' && trace.ruleId === 'status-condition-enablement');
    const darkening = traces.find((trace) => trace.sourceAbilityId === 'daemoros-darkening-fear' && trace.ruleId === 'status-condition-enablement');
    expect(instill).toBeDefined();
    expect(darkening).toBeDefined();
    expect(traceText(instill!)).toMatch(/activation success|25%/i);
    expect(traceText(darkening!)).toMatch(/activation success|25%/i);
  });
});
