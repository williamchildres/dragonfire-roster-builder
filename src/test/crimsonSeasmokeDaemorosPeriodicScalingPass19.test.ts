import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { deriveOutputCapabilities, derivePeriodicDamageDefinitions, deriveStatusOutputCapabilities, periodicDamageOutputCapabilities } from '../services/effectCapabilities';
import { pass19Analysis, traceText } from './pass19Helpers';

const burnOutput = 'periodic-daemoros-shadowflame-shadowflame-burn-burn-output';
const cunningInt = 'seasmoke-cunning-ferocity-cunning-ferocity-intelligence-stat-dealt-modifier';
const cleverInt = 'seasmoke-clever-maneuver-clever-maneuver-intelligence-stat-dealt-modifier';

describe('Pass 19 periodic Intelligence scaling support', () => {
  it('matches Cunning Ferocity and Clever Maneuver Intelligence support to Daemoros periodic Burn', () => {
    const { traces, presentation } = pass19Analysis();
    const crimsonScaling = traces.filter((trace) =>
      trace.ruleId === 'stat-scaling-support' &&
      trace.sourceAbilityId === 'seasmoke-cunning-ferocity' &&
      trace.recipientDragonId === 'crimson' &&
      trace.matchedOutputCapabilityIds?.some((id) => /bloodscale-terror.*fire-damage/i.test(id)) &&
      trace.title === 'Intelligence Scaling Support'
    );
    expect(crimsonScaling).toHaveLength(1);

    const cunning = traces.filter((trace) =>
      trace.ruleId === 'stat-scaling-support' &&
      trace.sourceAbilityId === 'seasmoke-cunning-ferocity' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.matchedOutputCapabilityIds?.includes(burnOutput) &&
      trace.title === 'Intelligence Scaling Support'
    );
    expect(cunning).toHaveLength(1);
    expect(cunning[0]!.status).toBe('active');
    expect(cunning[0]!.modifierCapabilityIds).toEqual([cunningInt]);
    expect(cunning[0]!.matchedOutputCapabilityIds).toContain(burnOutput);
    expect(traceText(cunning[0]!)).toContain('Shadowflame periodic Fire Damage scales with Intelligence.');
    expect(traceText(cunning[0]!)).toMatch(/enhanced by Seasmoke Instinct/i);
    expect(traceText(cunning[0]!)).not.toMatch(/Initiative.*supports|supports.*Initiative/i);

    const clever = traces.filter((trace) =>
      trace.ruleId === 'stat-scaling-support' &&
      trace.sourceAbilityId === 'seasmoke-clever-maneuver' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.matchedOutputCapabilityIds?.includes(burnOutput) &&
      trace.title === 'Intelligence Scaling Support'
    );
    expect(clever).toHaveLength(1);
    expect(clever[0]!.status).toBe('active');
    expect(clever[0]!.modifierCapabilityIds).toEqual([cleverInt]);
    expect(clever[0]!.matchedOutputCapabilityIds).toContain(burnOutput);
    expect(traceText(clever[0]!)).toContain('Shadowflame periodic Fire Damage scales with Intelligence.');
    expect(traceText(clever[0]!)).toContain('Daemoros resolves as the highest Intelligence recipient.');
    expect(traceText(clever[0]!)).not.toMatch(/Initiative.*supports|supports.*Initiative/i);

    const fireSupport = traces.filter((trace) =>
      trace.sourceAbilityId === 'seasmoke-cunning-ferocity' &&
      trace.recipientDragonId === 'daemoros' &&
      trace.matchedOutputCapabilityIds?.includes(burnOutput) &&
      trace.title === 'Fire Damage Support'
    );
    expect(fireSupport).toHaveLength(1);

    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    const scalingOnlyCards = seasmoke.provides.filter((item) =>
      item.effectTitle.includes('Scaling Support') || item.summary.includes('Shadowflame Burn periodic Fire Damage'),
    );
    expect(scalingOnlyCards).toHaveLength(0);
    const cunningCard = seasmoke.provides.find((item) => item.effectTitle === 'Cunning Ferocity - Stat support');
    expect(JSON.stringify(cunningCard)).toContain('Crimson');
    expect(JSON.stringify(cunningCard)).toContain('Daemoros');
  });

  it('keeps Daemoros Burn as one canonical periodic output capability', () => {
    const statusOutputs = deriveStatusOutputCapabilities(dragons);
    const periodic = periodicDamageOutputCapabilities(dragons, derivePeriodicDamageDefinitions(dragons), statusOutputs);
    expect(periodic.filter((output) => output.id === burnOutput)).toHaveLength(1);
    expect([...deriveOutputCapabilities(dragons), ...periodic].filter((output) => output.id === burnOutput)).toHaveLength(1);
  });
});
