import { describe, expect, it } from 'vitest';
import { pass18Analysis, traceText } from './pass18Helpers';

describe('Pass 18 exact-result reason routing', () => {
  it('keeps deterministic Radiant Conqueror self-Stun out of generic uncertainty', () => {
    const { traces } = pass18Analysis();
    const stun = traces.filter((trace) => trace.sourceAbilityId === 'kalspire-radiant-conqueror' && traceText(trace).includes('radiant-conqueror-self-stun'));
    expect(stun).toHaveLength(1);
    expect(stun[0]!.status).toBe('active');
    expect(stun[0]!.recipientDragonId).toBe('kalspire');
    expect(traceText(stun[0]!)).toContain('At Start of Round 1, Radiant Conqueror deterministically applies Stun to Kalspire for 1 round.');
    expect(stun[0]!.exactResultUnknownReason).toBe('The Stun application is deterministic: Kalspire is Stunned for 1 round beginning at Start of Round 1. Downstream combat consequences and any independently verified cleanse interaction are not calculated by this trace.');
    expect(traceText(stun[0]!)).not.toMatch(/activation success|runtime condition|recipient identity|duration.*unresolved|cleanse occurs/i);
  });

  it('routes Unyielding Resolve cleanse uncertainty through shared activation metadata', () => {
    const { traces } = pass18Analysis();
    const cleanse = traces.filter((trace) => trace.sourceAbilityId === 'vermax-unyielding-resolve' && trace.ruleId === 'self-status-removal');
    expect(cleanse).toHaveLength(1);
    expect(cleanse[0]!.status).toBe('potential');
    const text = traceText(cleanse[0]!);
    expect(text).toContain('At the start of each round, Unyielding Resolve has a 20% activation chance at effective Habit Level 1, increasing to 30% while Vermax is Weakened.');
    expect(text).toContain('On a successful shared activation, Vermax gains Advantage and removes the applicable Weakened effect; the cleanse receives no independent roll.');
    expect(cleanse[0]!.exactResultUnknownReason).toBe('Exact self-status removal cannot be determined because whether Vermax is Weakened and whether the shared 20% or 30% activation succeeds remain unresolved; the cleanse has no independent activation roll.');
    expect(text).not.toMatch(/Prey|marked enemy|above-50|50% activation|independent cleanse roll/i);
  });

  it('routes Trial by Flame strict thresholds without activation or duration uncertainty', () => {
    const { traces } = pass18Analysis();
    const trial = traces.filter((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame' && trace.matchKind === 'defensive-ally-support');
    expect(trial).toHaveLength(3);
    const reason = "Exact final mitigation cannot be calculated because each recipient's current Troop Capacity, which strict threshold tiers are satisfied, how simultaneously qualifying tiers combine, and the final mitigation formula remain unresolved.";
    for (const trace of trial) {
      const text = traceText(trace);
      expect(trace.status).toBe('potential');
      expect(text).toContain('Timing: Start of each round.');
      expect(text).toContain('Duration: until end of the current round.');
      expect(text).toContain('caster excluded');
      expect(text).toContain('Kalspire');
      expect(text).toContain('Vhagar');
      expect(trace.exactResultUnknownReason).toBe(reason);
      expect(text).not.toMatch(/activation success|activation chance|modifier uptime|support uptime|refresh behavior|duration[^.]*unresolved/i);
    }
    expect(traceText(trial.find((trace) => /below 75%/i.test(traceText(trace)))!)).toContain('Fire Damage Received decrease 5%');
    expect(traceText(trial.find((trace) => /below 50%/i.test(traceText(trace)))!)).toContain('Resistance, reducing Damage Received by 10%');
    expect(traceText(trial.find((trace) => /below 25%/i.test(traceText(trace)))!)).toContain('Fire Damage Received decrease 15%');
    const boundary = traces.find((trace) => trace.ruleId === 'threshold-boundary-textual-interpretation' && trace.status === 'unknown');
    expect(boundary).toBeDefined();
    expect(traceText(boundary!)).toMatch(/exactly 50%/i);
  });
});
