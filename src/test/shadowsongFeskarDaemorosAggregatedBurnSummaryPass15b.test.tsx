import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput } from '../models/synergy';
import { buildFormationCardPresentation } from '../services/formationCardAnalysis';
import { createEmptyRoster } from '../services/rosterStorage';
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

describe('Shadowsong/Feskar/Daemoros aggregated burn summary pass 15B', () => {
  it('keeps the collapsed Burn summary clean while preserving detailed windows and trace identity', () => {
    const { traces, presentation } = currentPresentation();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(73);
    expect(counts).toMatchObject({ active: 25, potential: 38, inactive: 9, blocked: 1 });
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

    const burnCardText = burnCard.summaryLines.join(' ');
    expect(burnCardText).not.toContain('Known possible overlap windows');
    for (const windowText of overlapWindows) {
      expect(burnCard.details.join(' ')).toContain(windowText);
    }
  });
});
