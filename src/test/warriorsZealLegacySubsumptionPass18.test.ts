import { describe, expect, it } from 'vitest';
import { pass18Analysis, countByStatus, traceText } from './pass18Helpers';

describe("Pass 18 Warrior's Zeal legacy subsumption", () => {
  it('keeps the typed stat support while suppressing only the redundant legacy left-flank support', () => {
    const { traces } = pass18Analysis();
    const allText = JSON.stringify(traces);
    const typed = traces.find((trace) =>
      trace.sourceAbilityId === 'vermax-warriors-zeal' &&
      trace.recipientDragonId === 'kalspire' &&
      trace.channel === 'stat' &&
      trace.modifierCapabilityIds?.includes('vermax-warriors-zeal-warriors-zeal-left-instinct-stat-dealt-modifier') &&
      trace.modifierCapabilityIds?.includes('vermax-warriors-zeal-warriors-zeal-left-initiative-stat-dealt-modifier')
    );
    expect(typed).toBeDefined();
    expect(typed!.status).toBe('inactive');
    expect(traceText(typed!)).toContain('Instinct +20 flat');
    expect(traceText(typed!)).toContain('Initiative +20 flat');
    expect(traceText(typed!)).toContain('Provider position requirement');
    expect(traceText(typed!)).toContain('left-flank');

    expect(traces.some((trace) => trace.title === "Warrior's Zeal Left Flank support")).toBe(false);
    expect(allText).toContain('Instinct Scaling Support');
    expect(allText).toContain("Warrior's Zeal Vanguard requirement");
    expect(traces.some((trace) =>
      trace.sourceAbilityId === 'vermax-warriors-zeal' &&
      trace.recipientDragonId === 'vermax' &&
      trace.channel === 'physical-damage' &&
      trace.status === 'inactive'
    )).toBe(true);

    const counts = countByStatus(traces);
    expect(traces).toHaveLength(62);
    expect(counts.active).toBe(26);
    expect(counts.potential).toBe(23);
    expect(counts.inactive).toBe(11);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown).toBe(1);
    expect(traces.filter((trace) => trace.status === 'blocked' && /multiple Vanguard/i.test(traceText(trace)))).toHaveLength(1);
  });
});
