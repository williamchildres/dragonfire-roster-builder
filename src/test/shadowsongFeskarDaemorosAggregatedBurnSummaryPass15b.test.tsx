import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'daemoros',
} as const satisfies FormationAnalysisInput;

const overlapWindows = [
  'Round 3 after a successful Round 2 application',
  'Round 10 after a successful Round 9 application',
] as const;

function pass15Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['shadowsong', 'feskar', 'daemoros']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function currentPresentation() {
  const roster = pass15Roster();
  const traces = analyzeFormationTraces(formation, dragons, {
    roster,
    dragonLevels: { shadowsong: 26, feskar: 26, daemoros: 26 },
  });
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster, previewEnabled: false });
  return { traces, presentation };
}

async function renderFormation() {
  const user = userEvent.setup();
  const roster = pass15Roster();
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    format: 'dragonfire-roster-lab-local',
    schemaVersion: ROSTER_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    roster: Object.values(roster),
  }));
  render(<App />);
  await user.click(screen.getAllByRole('button', { name: /formation builder/i })[0]!);
  await user.click(screen.getByLabelText(/include unowned dragons/i));
  const selectors = screen.getAllByLabelText('Dragon');
  await user.selectOptions(selectors[0]!, 'shadowsong');
  await user.selectOptions(selectors[1]!, 'feskar');
  await user.selectOptions(selectors[2]!, 'daemoros');
  return user;
}

function countOccurrences(text: string, fragment: string): number {
  return (text.match(new RegExp(fragment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;
}

describe('Shadowsong/Feskar/Daemoros aggregated burn summary pass 15B', () => {
  it('keeps the collapsed Burn summary clean while preserving detailed windows and trace identity', async () => {
    const { traces, presentation } = currentPresentation();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(67);
    expect(counts).toMatchObject({ active: 23, potential: 36, inactive: 7, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const feskar = presentation.cards.find((card) => card.dragonId === 'feskar')!;
    expect(feskar.receives).toHaveLength(6);

    const burnCards = feskar.receives.filter((item) => item.effectTitle === 'Burn enhances Emerald Inferno damage rate');
    expect(burnCards).toHaveLength(1);
    const burnCard = burnCards[0]!;
    const burnTraceIds = traces.filter((trace) => trace.title === 'Burn enables Emerald Inferno' && trace.recipientAbilityId === 'feskar-emerald-inferno');
    expect(burnTraceIds).toHaveLength(3);
    const burnBySource = new Map(burnTraceIds.map((trace) => [trace.sourceDragonId, trace] as const));
    expect(burnCard.sourceName).toBe('Shadowsong and Daemoros');
    expect(burnCard.sourceName).not.toBe('Team');
    expect(burnCard.summaryLines).toHaveLength(4);
    expect(burnCard.summaryLines).toEqual([
      'Blazing Conductor attempts Burn on Rounds 2, 5, and 8: 40% on the first added target and 20% on a different second target; Burn lasts 2 rounds.',
      'Shadowflame attempts Burn on odd-numbered rounds: 20% chance on one enemy within adjacency; Burn lasts 2 rounds.',
      'Against the same otherwise-eligible Burned enemy, Emerald Inferno Fire Damage Rate increases from 40% to 60%; prior-round Burn may carry over, and same-round overlap requires the relevant supplier to resolve before Emerald Inferno.',
      'Supplier application success, eligible enemy identity, same-target overlap, and same-round action order remain unresolved.',
    ]);

    expect(burnCard.traceIds.sort()).toEqual(burnTraceIds.map((trace) => trace.id).sort());
    expect(burnBySource.get('shadowsong')?.targetSelectorSummary).toContain('enemy; any-lane; all-matching-condition');
    expect(burnBySource.get('daemoros')?.targetSelectorSummary).toContain('enemy; any-lane; all-matching-condition');

    const exportText = JSON.stringify(createSynergyAuditExport(formation, traces, pass15Roster()));
    for (const windowText of overlapWindows) {
      expect(exportText).toContain(windowText);
    }
    expect(exportText).toContain('blazing-conductor-first-burn');
    expect(exportText).toContain('blazing-conductor-second-burn');
    expect(exportText).toContain('blazing-conductor-first-fire');
    expect(exportText).toContain('blazing-conductor-second-fire');

    const user = await renderFormation();
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    expect(within(vanguard).getByRole('region', { name: 'Receives' })).toHaveTextContent('6');
    const receives = within(vanguard).getByRole('region', { name: 'Receives' });
    await user.click(within(receives).getByRole('button', { name: /show all/i }));

    const burnTitle = within(receives).getByText('Burn enhances Emerald Inferno damage rate');
    const burnCardDom = burnTitle.closest('.card-interaction-item');
    expect(burnCardDom).not.toBeNull();
    const burnCardText = burnCardDom!.textContent ?? '';

    expect(within(receives).queryAllByText('Burn enhances Emerald Inferno damage rate')).toHaveLength(1);
    expect(within(receives).queryByText('Burn enhances Emerald Inferno chance')).not.toBeInTheDocument();
    expect(within(burnCardDom as HTMLElement).getByText('Shadowsong and Daemoros → Feskar')).toBeInTheDocument();
    expect(burnCardDom).not.toHaveTextContent('Team → Feskar');

    const bullets = within(burnCardDom as HTMLElement).getAllByRole('listitem').map((item) => item.textContent?.trim() ?? '');
    expect(bullets).toHaveLength(4);
    expect(bullets).toEqual(burnCard.summaryLines);
    expect(bullets[0]).toContain('Blazing Conductor attempts Burn on Rounds 2, 5, and 8');
    expect(bullets[0]).toContain('40% on the first added target');
    expect(bullets[0]).toContain('20% on a different second target');
    expect(bullets[1]).toContain('Shadowflame attempts Burn on odd-numbered rounds');
    expect(bullets[1]).toContain('20% chance on one enemy within adjacency');
    expect(bullets[2]).toContain('same otherwise-eligible Burned enemy');
    expect(bullets[2]).toContain('40% to 60%');
    expect(bullets[2]).toContain('prior-round Burn may carry over');
    expect(bullets[2]).toContain('same-round overlap requires the relevant supplier to resolve before Emerald Inferno');
    expect(bullets[3]).toContain('Supplier application success');
    expect(bullets[3]).toContain('eligible enemy identity');
    expect(bullets[3]).toContain('same-target overlap');
    expect(bullets[3]).toContain('same-round action order');

    expect(burnCardText).not.toContain('Enhanced current Fire Damage Rate');
    expect(burnCardText).not.toContain('Base current Fire Damage Rate');
    expect(burnCardText).not.toContain('Conditional multiplier');
    expect(burnCardText).not.toContain('Conditional multiplier: 1');
    expect(burnCardText).not.toMatch(/40%[^<\n]*Enhanced current Fire Damage Rate[^<\n]*60%/i);
    expect(countOccurrences(burnCardText, '60%')).toBe(1);
    expect(countOccurrences(burnCardText, '40%')).toBe(2);

    await user.click(within(burnCardDom as HTMLElement).getByRole('button', { name: /details/i }));
    const expandedText = burnCardDom!.textContent ?? '';
    for (const windowText of overlapWindows) {
      expect(expandedText).toContain(windowText);
    }
    expect(expandedText).toContain('Known possible overlap windows');
  });
});
