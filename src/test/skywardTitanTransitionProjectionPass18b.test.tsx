import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { FORMATION_STORAGE_KEY, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { countByStatus, pass18Analysis, pass18Formation, traceText } from './pass18Helpers';

const outputCapabilityId = 'vhagar-skyward-titan-skyward-titan-third-stack-damage-output';
const exactReason =
  'Exact final damage cannot be calculated because reaching stack 3, activation sequence, target identity, mitigation, and final damage remain unresolved.';
const staleGenericReason =
  'Threshold branch applicability, exact boundary behavior, activation success, modifier uptime, and final formula remain unresolved.';

async function renderPass18Formation() {
  const user = userEvent.setup();
  const { roster } = pass18Analysis();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    format: 'dragonfire-roster-lab-local',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    roster: Object.values(roster),
  }));
  window.localStorage.setItem(FORMATION_STORAGE_KEY, JSON.stringify(pass18Formation));
  render(<App />);
  await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
  return user;
}

describe('Pass 18B Skyward Titan transition projection routing', () => {
  it('keeps the third-stack attack as enemy-side technical analysis without creating a Vhagar support card', async () => {
    const { roster, traces, presentation } = pass18Analysis();
    const counts = countByStatus(traces);
    expect(traces).toHaveLength(57);
    expect(counts.active).toBe(23);
    expect(counts.potential).toBe(23);
    expect(counts.inactive).toBe(9);
    expect(counts.blocked).toBe(1);
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown).toBe(1);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const skyward = traces.filter((trace) => trace.sourceDragonId === 'vhagar' && trace.sourceAbilityId === 'vhagar-skyward-titan');
    expect(skyward).toHaveLength(4);
    const transition = skyward.find((trace) => trace.ruleId === 'stack-transition-output');
    expect(transition).toBeDefined();
    expect(transition!.title).toBe('Skyward Titan - Physical Damage transition attack');
    expect(transition!.matchKind).toBeNull();
    expect(transition!.interactionScope).toBe('enemy-side');
    expect(transition!.recipientDragonId).toBeNull();
    expect(transition!.recipientAbilityId).toBe(outputCapabilityId);
    expect(transition!.matchedOutputCapabilityIds ?? []).toHaveLength(0);
    expect(transition!.matchedFacts).toContain(`Output capability ID: ${outputCapabilityId}.`);
    expect(transition!.exactResultUnknownReason).toBe(exactReason);
    const transitionText = traceText(transition!);
    expect(transitionText.match(new RegExp(exactReason.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1);
    expect(transitionText).not.toContain(staleGenericReason);

    const downstream = traces.filter((trace) =>
      trace.matchedOutputCapabilityIds?.includes(outputCapabilityId) &&
      /Eclipse Cover|Blazing Onslaught/i.test(traceText(trace)),
    );
    expect(downstream.length).toBeGreaterThanOrEqual(2);

    const exportText = JSON.stringify(createSynergyAuditExport(pass18Formation, traces, roster));
    expect(exportText).toContain(outputCapabilityId);
    expect(exportText).toContain('Eclipse Cover');
    expect(exportText).toContain('Blazing Onslaught');
    expect(exportText).toContain(exactReason);
    expect(exportText).not.toContain(staleGenericReason);

    const vhagar = presentation.cards.find((card) => card.dragonId === 'vhagar');
    expect(vhagar).toBeDefined();
    expect(vhagar!.provides).toHaveLength(8);
    const serviceCardText = JSON.stringify(vhagar);
    expect(serviceCardText).not.toContain('Skyward Titan - Physical Damage support');
    expect(serviceCardText).not.toContain('Increases Skyward Titan Physical Damage.');

    await renderPass18Formation();
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    const provides = within(vanguard).getByRole('region', { name: 'Provides' });
    expect(provides).toHaveTextContent('8');
    expect(vanguard.textContent ?? '').not.toContain('Skyward Titan - Physical Damage support');
    expect(vanguard.textContent ?? '').not.toContain('Increases Skyward Titan Physical Damage.');
  });
});
