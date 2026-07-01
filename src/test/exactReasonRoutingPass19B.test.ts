import { describe, expect, it } from 'vitest';
import { technicalAnalysisTraceIdentity, traceStatusReason } from '../services/synergyTrace';
import { countByStatus, pass19Analysis, traceText } from './pass19Helpers';

const statReason = 'Exact final stat value cannot be calculated because modifier-combination behavior, stacking order, and the final stat formula remain unresolved.';
const damageDealtReason = 'Exact final amplified damage cannot be calculated because modifier-combination behavior and the final damage formula remain unresolved.';
const recoveryReceivedReason = 'Exact final Recovery Received value cannot be calculated because modifier-combination behavior and the final received-effect formula remain unresolved.';
const mitigationReason = 'Exact final mitigated damage cannot be calculated because incoming damage, modifier-combination behavior, and the final mitigation formula remain unresolved.';
const cleanseReason = "Exact positive-effect removal cannot be determined because each attempt's success, selected enemy identity, whether that enemy has a removable positive effect, which positive effect is removed, and repeated-target behavior remain unresolved.";
const panicReason = 'Exact Panic prerequisite enablement cannot be calculated because supplier Panic application success, selected enemy identity, same-target overlap, whether Panic remains active on the scheduled round, same-round action order, and the final enhanced branch outcome remain unresolved.';

const forbiddenMitigationText = /incoming damage|mitigated damage|mitigation formula/i;

function traceBySourceEffect(sourceEffectId: string) {
  const matches = pass19Analysis().traces.filter((trace) =>
    trace.matchedFacts.includes(`Source effect ID: ${sourceEffectId}.`),
  );
  expect(matches, sourceEffectId).toHaveLength(1);
  return matches[0]!;
}

describe('Pass 19B exact reason routing', () => {
  it('routes deterministic non-defensive internal modifiers to typed exact reasons', () => {
    const statEffects = [
      ['seasmoke-strength-flat', 'active', 'seasmoke-champions-brilliance-seasmoke-strength-flat-stat-dealt-modifier'],
      ['seasmoke-intelligence-flat', 'active', 'seasmoke-champions-brilliance-seasmoke-intelligence-flat-stat-dealt-modifier'],
      ['seasmoke-instinct-flat', 'active', 'seasmoke-champions-brilliance-seasmoke-instinct-flat-stat-dealt-modifier'],
      ['hunters-cunning-intelligence', 'inactive', 'crimson-hunters-cunning-hunters-cunning-intelligence-stat-dealt-modifier'],
      ['dragons-intellect-intelligence', 'active', 'crimson-dragons-intellect-dragons-intellect-intelligence-stat-dealt-modifier'],
      ['powerful-reflexes-strength', 'active', 'daemoros-powerful-reflexes-powerful-reflexes-strength-stat-dealt-modifier'],
      ['powerful-reflexes-initiative', 'active', 'daemoros-powerful-reflexes-powerful-reflexes-initiative-stat-dealt-modifier'],
    ] as const;

    for (const [sourceEffectId, status, capabilityId] of statEffects) {
      const trace = traceBySourceEffect(sourceEffectId);
      expect(trace.status).toBe(status);
      expect(trace.modifierCapabilityIds).toEqual([capabilityId]);
      expect(trace.exactResultUnknownReason).toBe(statReason);
      expect(traceText(trace)).toContain('final stat formula');
      expect(traceText(trace)).toContain('modifier-combination behavior');
      expect(traceText(trace)).not.toMatch(forbiddenMitigationText);
      expect(traceText(trace)).not.toMatch(/activation success|unresolved duration/i);
    }

    const recovery = traceBySourceEffect('hunters-cunning-recovery');
    expect(recovery.status).toBe('inactive');
    expect(recovery.modifierCapabilityIds).toEqual(['crimson-hunters-cunning-hunters-cunning-recovery-recovery-received-modifier']);
    expect(recovery.exactResultUnknownReason).toBe(recoveryReceivedReason);
    expect(traceText(recovery)).not.toMatch(forbiddenMitigationText);
    expect(traceText(recovery)).not.toMatch(/activation success|unresolved duration/i);

    const damage = traceBySourceEffect('warriors-zeal-physical');
    expect(damage.status).toBe('inactive');
    expect(damage.modifierCapabilityIds).toEqual(['daemoros-warriors-zeal-warriors-zeal-physical-physical-damage-dealt-modifier']);
    expect(damage.exactResultUnknownReason).toBe(damageDealtReason);
    expect(traceText(damage)).not.toMatch(forbiddenMitigationText);
    expect(traceText(damage)).not.toMatch(/activation success|unresolved duration/i);
  });

  it('preserves genuine defensive exact reasons', () => {
    const { traces } = pass19Analysis();
    const championSupport = traces.find((trace) =>
      trace.sourceAbilityId === 'seasmoke-champions-brilliance' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.matchedFacts.includes('Source effect ID: seasmoke-right-flank-dr-down.'),
    );
    expect(championSupport?.exactResultUnknownReason).toBe(mitigationReason);

    const dragonsIntellectDr = traceBySourceEffect('dragons-intellect-damage-received');
    expect(dragonsIntellectDr.exactResultUnknownReason).toBe(mitigationReason);

    const phantomOverall = traces.find((trace) =>
      trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
      trace.modifierCapabilityIds?.includes('daemoros-phantoms-veil-phantoms-veil-exclusive-defense-damage-received-received-exclusive-choice-modifier'),
    );
    expect(phantomOverall?.exactResultUnknownReason).toBe(mitigationReason);

    const optionReasons = {
      physical: 'Exact final Physical Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
      tactical: 'Exact final Tactical Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
      fire: 'Exact final Fire Damage Received mitigation cannot be calculated because whether that defensive channel is selected for the round, the unresolved selection method, incoming damage, combination behavior, and the final mitigation formula remain unresolved.',
    };
    for (const [channel, reason] of Object.entries(optionReasons)) {
      const option = traces.find((trace) =>
        trace.sourceAbilityId === 'daemoros-phantoms-veil' &&
        trace.modifierCapabilityIds?.some((id) => id.includes(`phantoms-veil-${channel}`)),
      );
      expect(option?.exactResultUnknownReason).toBe(reason);
      expect(option?.exactResultUnknownReason).not.toContain('final stat value');
    }
  });

  it('keeps Cleansing Wrath as positive-effect removal without status uptime text', () => {
    const { traces, presentation } = pass19Analysis();
    const cleanse = traces.filter((trace) => trace.ruleId === 'enemy-positive-effect-removal');
    expect(cleanse).toHaveLength(1);
    const trace = cleanse[0]!;
    const text = traceText(trace);

    expect(trace.status).toBe('potential');
    expect(trace.interactionScope).toBe('enemy-side');
    expect(trace.exactResultUnknownReason).toBe(cleanseReason);
    expect(traceStatusReason(trace)).toBe(cleanseReason);
    expect(text).toContain('Attempt count: up to 3.');
    expect(text).toContain('Attempt chance: 20%.');
    expect(text).toContain('Attempts are independently rolled.');
    expect(text).toContain('Attempts are independently targeted.');
    expect(text).toContain('Target: 1 Enemy.');
    expect(text).toContain('Each successful attempt removes one positive effect from the selected enemy.');
    expect(text).toMatch(/Attempt success|each attempt's success/i);
    expect(text).toContain('selected enemy identity');
    expect(text).toContain('removable positive effect');
    expect(text).toContain('which positive effect is removed');
    expect(text).toContain('repeated-target behavior');
    expect(text).not.toMatch(/resulting status uptime|status uptime|applies a status|mitigation/i);

    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    expect(seasmoke.provides.filter((item) => item.effectTitle === 'Cleansing Wrath - Enemy positive-effect removal')).toHaveLength(1);
  });

  it('keeps Panic prerequisite traces separate while removing dependent activation and roll-scope claims', () => {
    const { traces, presentation } = pass19Analysis();
    const panic = traces.filter((trace) =>
      trace.matchKind === 'status-condition-enablement' &&
      trace.recipientAbilityId === 'seasmoke-infectious-wrath' &&
      trace.title === 'Panic enables Infectious Wrath',
    );
    expect(panic).toHaveLength(2);

    for (const trace of panic) {
      const text = traceText(trace);
      expect(trace.exactResultUnknownReason).toBe(panicReason);
      expect(traceStatusReason(trace)).toBe(panicReason);
      expect(trace.modifierCapabilityIds).toHaveLength(1);
      expect(trace.matchedOutputCapabilityIds).toEqual(['seasmoke-infectious-wrath-infectious-wrath-physical-damage-rate-output']);
      expect(text).toContain('Shared activation group:');
      expect(text).toContain('Selected-target group:');
      expect(text).toContain('Known possible overlap windows:');
      expect(text).toContain('supplier Panic application success');
      expect(text).toContain('selected enemy identity');
      expect(text).toContain('same-target overlap');
      expect(text).toContain('whether Panic remains active on the scheduled round');
      expect(text).toContain('same-round action order');
      expect(text).toContain('final enhanced branch outcome');
      expect(text).not.toMatch(/dependent activation success|roll scope|independent Infectious Wrath activation roll/i);
      expect(text).not.toContain('Panic changes target eligibility');
    }

    const instill = panic.find((trace) => trace.sourceAbilityId === 'daemoros-instill-fear')!;
    const darkening = panic.find((trace) => trace.sourceAbilityId === 'daemoros-darkening-fear')!;
    expect(traceText(instill)).toContain('Shared activation group: instill-fear-each-round-shared-activation.');
    expect(traceText(instill)).toContain('Selected-target group: instill-fear-target.');
    expect(traceText(darkening)).toContain('Shared activation group: darkening-fear-each-round-shared-activation.');
    expect(traceText(darkening)).toContain('Selected-target group: darkening-fear-target.');

    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    const cards = daemoros.provides.filter((item) => item.effectTitle === 'Panic enhances Infectious Wrath damage rate');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.summaryLines).toHaveLength(4);
    expect(cards[0]!.summaryLines).toEqual([
      'Instill Fear checks each round: 25% chance to apply Panic to one enemy in any lane, preferring Right Flank; Panic lasts 2 rounds.',
      'Darkening Fear checks each round independently: 25% chance to apply Panic to one enemy in any lane, preferring Left Flank; Panic lasts 2 rounds.',
      'Against the same otherwise-eligible Panicked enemy, Infectious Wrath Physical Damage Rate increases from 30% to 60% on Rounds 3, 6, and 9; prior-round Panic may carry over, while same-round overlap requires the relevant supplier to resolve first.',
      'Supplier activation success, eligible enemy identity, same-target overlap, and same-round action order remain unresolved.',
    ]);
  });

  it('preserves Pass 19 trace and card counts', () => {
    const { traces, presentation } = pass19Analysis();
    const counts = countByStatus(traces);
    expect(traces).toHaveLength(73);
    expect(counts.active).toBe(22);
    expect(counts.potential).toBe(40);
    expect(counts.inactive).toBe(9);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown).toBe(1);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const crimson = presentation.cards.find((card) => card.dragonId === 'crimson')!;
    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    expect(crimson.receives).toHaveLength(5);
    expect(crimson.provides).toHaveLength(9);
    expect(seasmoke.receives).toHaveLength(7);
    expect(seasmoke.provides).toHaveLength(8);
    expect(daemoros.receives).toHaveLength(10);
    expect(daemoros.provides).toHaveLength(12);
  });
});
