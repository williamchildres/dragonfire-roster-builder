import { describe, expect, it } from 'vitest';
import { technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { countByStatus, pass19Analysis, traceText } from './pass19Helpers';

describe('Pass 19 Cleansing Wrath positive-effect removal', () => {
  it('projects one enemy-side positive-effect-removal trace and one concise normal card', () => {
    const { traces, presentation } = pass19Analysis();
    const cleanse = traces.filter((trace) => trace.ruleId === 'enemy-positive-effect-removal');
    expect(cleanse).toHaveLength(1);
    const trace = cleanse[0]!;
    const text = traceText(trace);

    expect(trace).toMatchObject({
      sourceDragonId: 'seasmoke',
      sourceAbilityId: 'seasmoke-cleansing-wrath',
      recipientDragonId: null,
      status: 'potential',
      interactionScope: 'enemy-side',
      matchKind: 'status-removal',
      title: 'Cleansing Wrath - Enemy positive-effect removal',
      exactResultUnknownReason: "Exact positive-effect removal cannot be determined because each attempt's success, selected enemy identity, whether that enemy has a removable positive effect, which positive effect is removed, and repeated-target behavior remain unresolved.",
    });
    expect(text).toContain('Source effect ID: cleansing-wrath-cleanse-positive-effect.');
    expect(text).toContain('Schedule ID: cleansing-wrath-cleanse-positive.');
    expect(text).toContain('Timing: Each round.');
    expect(text).toContain('Attempt count: up to 3.');
    expect(text).toContain('Attempt chance: 20%.');
    expect(text).toContain('Attempts are independently rolled.');
    expect(text).toContain('Attempts are independently targeted.');
    expect(text).toContain('Target: 1 Enemy.');
    expect(text).toContain('Lane scope: any-lane.');
    expect(text).toContain('Each successful attempt removes one positive effect from the selected enemy.');
    expect(text).toContain('A removable positive effect is not guaranteed to be present.');
    expect(text).toContain('Repeated-target behavior is unresolved.');
    expect(text).toContain('No distinct-target guarantee is assumed');
    expect(text).toContain('No guaranteed removable positive effect is assumed.');
    expect(text).not.toMatch(/shared roll|three distinct enemies|automatic success/i);

    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    const cards = seasmoke.provides.filter((item) => item.effectTitle === 'Cleansing Wrath - Enemy positive-effect removal');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.summaryLines).toEqual([
      'Each round, Cleansing Wrath makes up to three independent 20% attempts; each attempt targets one enemy in any lane and can remove one positive effect.',
      'Attempt success, enemy identity, removable-effect availability, selected effect, and repeated-target behavior remain unresolved.',
    ]);
    expect(JSON.stringify(cards[0])).not.toMatch(/\[[{]|Known possible overlap windows|matchedFacts/i);
  });

  it('locks the requested final trace counts without exact duplicates', () => {
    const { traces, presentation } = pass19Analysis();
    const counts = countByStatus(traces);
    expect(traces).toHaveLength(79);
    expect(counts.active).toBe(23);
    expect(counts.potential).toBe(44);
    expect(counts.inactive).toBe(10);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown).toBe(1);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    expect(traces.filter((trace) => trace.status === 'blocked' && /multiple Vanguard/i.test(trace.title + trace.explanation))).toHaveLength(1);
    expect(traces.find((trace) => trace.sourceAbilityId === 'seasmoke-champions-brilliance' && trace.ruleId === 'vanguard-trait-requirement')?.status).toBe('active');
    expect(traces.find((trace) => trace.sourceAbilityId === 'crimson-hunters-cunning' && trace.ruleId === 'vanguard-trait-requirement')?.status).toBe('inactive');
    expect(traces.find((trace) => trace.sourceAbilityId === 'daemoros-warriors-zeal' && trace.ruleId === 'vanguard-trait-requirement')?.status).toBe('inactive');

    const crimson = presentation.cards.find((card) => card.dragonId === 'crimson')!;
    const seasmoke = presentation.cards.find((card) => card.dragonId === 'seasmoke')!;
    const daemoros = presentation.cards.find((card) => card.dragonId === 'daemoros')!;
    expect(seasmoke.receives).toHaveLength(7);
    expect(seasmoke.provides).toHaveLength(8);
    expect(daemoros.provides).toHaveLength(12);
    expect(crimson.receives.length + crimson.provides.length).toBeGreaterThan(0);
  });
});
