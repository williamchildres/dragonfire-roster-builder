import { describe, expect, it } from 'vitest';
import { createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { pass18Analysis, pass18Formation, traceText } from './pass18Helpers';

describe('Pass 18 Skyward Titan projection', () => {
  it('projects the three Bulwark stack modifiers and the third-stack transition attack', () => {
    const { roster, traces, presentation } = pass18Analysis();
    const skyward = traces.filter((trace) => trace.sourceDragonId === 'vhagar' && trace.sourceAbilityId === 'vhagar-skyward-titan');
    expect(skyward).toHaveLength(4);
    expect(skyward.every((trace) => trace.status === 'potential')).toBe(true);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
    expect(JSON.stringify(traces)).not.toMatch(/generic Bulwark/i);

    const strength = skyward.find((trace) => trace.channel === 'stat' && traceText(trace).includes('Strength'));
    expect(strength).toBeDefined();
    expect(strength!.title).toBe('Internal Strength modifier');
    expect(traceText(strength!)).toContain('checks each round with a 30% chance');
    expect(traceText(strength!)).toContain('grant one Bulwark stack');
    expect(traceText(strength!)).toContain('Maximum stacks: 5.');
    expect(traceText(strength!)).toContain('Strength +5% per stack at effective Habit Level 1');
    expect(traceText(strength!)).toContain('maximum theoretical Strength increase +25%');
    expect(traceText(strength!)).toContain('duration until end of combat');
    expect(traceText(strength!)).toContain('Shared stack pool: bulwark.');

    const physical = skyward.find((trace) => trace.damageScope === 'physical');
    expect(physical).toBeDefined();
    expect(physical!.title).toBe('Physical Damage Received Support');
    expect(traceText(physical!)).toContain('Physical Damage Received -2.5% per stack');
    expect(traceText(physical!)).toContain('maximum theoretical reduction -12.5%');
    expect(traceText(physical!)).toContain('Shared stack pool: bulwark.');

    const tactical = skyward.find((trace) => trace.damageScope === 'tactical');
    expect(tactical).toBeDefined();
    expect(tactical!.title).toBe('Tactical Damage Received Support');
    expect(traceText(tactical!)).toContain('Tactical Damage Received -2.5% per stack');
    expect(traceText(tactical!)).toContain('maximum theoretical reduction -12.5%');
    expect(traceText(tactical!)).toContain('Shared stack pool: bulwark.');

    const attack = skyward.find((trace) => trace.matchedOutputCapabilityIds?.includes('vhagar-skyward-titan-skyward-titan-third-stack-damage-output'));
    expect(attack).toBeDefined();
    const attackText = traceText(attack!);
    expect(attack!.title).toBe('Skyward Titan - Physical Damage transition attack');
    expect(attackText).toContain('Output capability ID: vhagar-skyward-titan-skyward-titan-third-stack-damage-output.');
    expect(attackText).toContain('Physical Damage Rate is 100%.');
    expect(attackText).toContain('Target: one enemy in the same lane.');
    expect(attackText).toContain('when the activation grants the third Bulwark stack');
    expect(attackText).toContain('once on that transition');
    expect(attackText).not.toMatch(/while at 3\+|repeated attacks at stacks 4 or 5/i);
    expect(attackText).toContain('target identity, mitigation, and final damage remain unresolved');

    const exportText = JSON.stringify(createSynergyAuditExport(pass18Formation, traces, roster));
    expect(exportText).toContain('vhagar-skyward-titan-skyward-titan-third-stack-damage-output');
    expect(exportText).toContain('Eclipse Cover');
    expect(exportText).toContain('Blazing Onslaught');
    expect(exportText.match(/vhagar-skyward-titan-skyward-titan-third-stack-damage-output/g)?.length ?? 0).toBeGreaterThanOrEqual(3);

    const cardText = JSON.stringify(presentation);
    expect(cardText).not.toMatch(/Internal Strength modifier|Physical Damage Received -2\.5% per stack|Tactical Damage Received -2\.5% per stack/);
  });
});
