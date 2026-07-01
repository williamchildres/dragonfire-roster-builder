import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation, type FormationCardInteraction } from '../services/formationCardAnalysis';
import { analyzeFormationTraces, createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'vaeldra',
} as const satisfies FormationAnalysisInput;

const overlapWindows = [
  'Round 3 after a successful Round 2 application',
  'Round 5 from a successful Round 5 application only if Blazing Conductor resolves before Emerald Inferno that round',
  'Round 8 from a successful Round 8 application only if Blazing Conductor resolves before Emerald Inferno that round',
] as const;

function pass14Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['shadowsong', 'feskar', 'vaeldra']) {
    const entry = roster[dragonId]!;
    entry.owned = true;
    entry.collection.state = 'hatched';
    entry.starRank = 10;
    entry.reignLevel = 26;
  }
  return roster;
}

function currentTraces(): SynergyTrace[] {
  return analyzeFormationTraces(formation, dragons, {
    roster: pass14Roster(),
    dragonLevels: { shadowsong: 26, feskar: 26, vaeldra: 26 },
  });
}

function traceText(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    trace.targetSelectorSummary ?? '',
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
  ].join(' ');
}

function cardText(item: FormationCardInteraction): string {
  return [item.summary, ...item.summaryLines, item.detail, ...item.details, ...item.effects, item.targetSummary ?? ''].join(' ');
}

function allItems() {
  const traces = currentTraces();
  const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster: pass14Roster(), previewEnabled: false });
  const items = presentation.cards.flatMap((card) => [...card.receives, ...card.provides]);
  return { traces, presentation, items };
}

function findItem(items: FormationCardInteraction[], predicate: (item: FormationCardInteraction) => boolean): FormationCardInteraction {
  const item = items.find(predicate);
  expect(item).toBeDefined();
  return item!;
}

function expectNoWindowText(text: string) {
  expect(text).not.toContain('Known possible overlap windows');
  for (const windowText of overlapWindows) {
    expect(text).not.toContain(windowText);
  }
}

async function renderFormation() {
  const user = userEvent.setup();
  const roster = pass14Roster();
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
  await user.selectOptions(selectors[2]!, 'vaeldra');
  return user;
}

describe('Shadowsong/Feskar/Vaeldra final projection pass 14B', () => {
  it('keeps final Technical Analysis counts and identities stable', () => {
    const traces = currentTraces();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(55);
    expect(counts).toMatchObject({ active: 26, potential: 21, inactive: 7, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });

  it('projects Burn enabling Emerald Inferno through final cards while retaining detailed windows', () => {
    const { traces, items } = allItems();
    const burnTraces = traces.filter((trace) => trace.title === 'Burn enables Emerald Inferno' && trace.recipientAbilityId === 'feskar-emerald-inferno' && trace.matchKind === 'status-condition-enablement');
    expect(burnTraces).toHaveLength(2);
    const burnTrace = burnTraces[0]!;
    const burnCards = items.filter((item) => item.traceIds.includes(burnTrace.id));

    expect(burnTrace.status).toBe('potential');
    expect(burnTrace.targetSelectorSummary).toContain('enemy; any-lane; all-matching-condition');
    expect(burnTrace.targetSelectorSummary).toContain('all qualifying enemies in any lane, up to 3');
    expect(traceText(burnTrace)).toContain('Target eligibility remains independently required');
    expect(traceText(burnTrace)).toContain('Burn does not alter normal Emerald Inferno target eligibility.');
    expect(traceText(burnTrace)).toContain('Burn on one enemy does not enable Emerald Inferno against a different enemy.');
    expect(burnCards).toHaveLength(2);

    for (const card of burnCards) {
      expect(card.state).toBe('conditional');
      expect(card.summaryLines).toEqual(expect.arrayContaining([
        'Blazing Conductor attempts Burn on Rounds 2, 5, and 8: 40% on the first added target and 20% on a different second target; Burn lasts 2 rounds.',
        'Against the same eligible Burned enemy, Emerald Inferno Fire Damage increases from 40% to 60%.',
        'Prior-round Burn can carry into Emerald Inferno; same-round overlap requires Blazing Conductor to resolve first.',
        'Application success, eligible enemy identity, same-target overlap, action order remain unresolved.',
      ]));
      expectNoWindowText(card.summaryLines.join(' '));
      expect(card.targetSummary).toBe('Targets all qualifying enemies in any lane, up to 3. Requires non-Basic Physical Damage output capability. Actual qualifying count and enemy identities remain unresolved.');
      for (const windowText of overlapWindows) {
        expect(cardText(card)).toContain(windowText);
      }
    }

    const exportText = JSON.stringify(createSynergyAuditExport(formation, traces, pass14Roster()));
    for (const windowText of overlapWindows) {
      expect(traceText(burnTrace)).toContain(windowText);
      expect(exportText).toContain(windowText);
    }
  });

  it('projects standalone periodic Burn as one compact card while preserving both traces', () => {
    const { traces, items } = allItems();
    const periodicTraces = traces.filter((trace) => trace.sourceAbilityId === 'shadowsong-blazing-conductor' && trace.matchKind === 'periodic-status-damage');
    expect(periodicTraces).toHaveLength(2);
    expect(periodicTraces[0]!.matchedFacts.join(' ')).toContain('Source effect ID: blazing-conductor-first-burn.');
    expect(periodicTraces[1]!.matchedFacts.join(' ')).toContain('Source effect ID: blazing-conductor-second-burn.');
    expect(periodicTraces[0]!.matchedFacts.join(' ')).toContain('References source effect blazing-conductor-first-fire.');
    expect(periodicTraces[1]!.matchedFacts.join(' ')).toContain('References source effect blazing-conductor-second-fire.');
    expect(periodicTraces[1]!.matchedFacts.join(' ')).toContain('Second added target must differ from the first added target.');

    const periodicCards = items.filter((item) => item.effectTitle === 'Blazing Conductor - Burn periodic damage');
    expect(periodicCards).toHaveLength(1);
    expect(periodicCards[0]!.summaryLines).toEqual([
      'On Rounds 2, 5, and 8, Blazing Conductor can apply Burn to two added targets: 40% on the first and 20% on a different second target.',
      'Burn deals periodic Fire Damage each round for 2 rounds; its Damage Rate is not stated.',
      'Application success, first-tick timing, refresh or stack behavior, mitigation, and final damage remain unresolved.',
    ]);
    expect(periodicCards[0]!.traceIds.sort()).toEqual(periodicTraces.map((trace) => trace.id).sort());
    expect(cardText(periodicCards[0]!)).not.toContain('Exact final periodic damage cannot be calculated because');
  });

  it('projects Resilient Bond initial, selected-ally, and retreat paths distinctly', () => {
    const { traces, items } = allItems();
    const selfTrace = traces.find((trace) => trace.id.includes('resilient-bond-self-stack'))!;
    const selectedTrace = traces.find((trace) => trace.id.includes('resilient-bond-adjacent-stack'))!;
    const retreatTrace = traces.find((trace) => trace.id.includes('resilient-bond-self-retreat-stack'))!;
    expect(selfTrace.status).toBe('active');
    expect(selectedTrace.status).toBe('active');
    expect(retreatTrace.status).toBe('potential');
    expect(traceText(selectedTrace)).toContain('Shared selected-target group: resilient-bond-tracked-ally.');
    expect(traceText(selectedTrace)).toContain('Caster excluded from this target selection.');

    const selfCard = findItem(items, (item) => item.traceIds.includes(selfTrace.id));
    const selectedProvider = findItem(items, (item) => item.traceIds.includes(selectedTrace.id) && item.recipientDragonId === null);
    const shadowRecipient = findItem(items, (item) => item.traceIds.includes(selectedTrace.id) && item.recipientName === 'Shadowsong');
    const vaeldraRecipient = findItem(items, (item) => item.traceIds.includes(selectedTrace.id) && item.recipientName === 'Vaeldra');
    const retreatCard = findItem(items, (item) => item.traceIds.includes(retreatTrace.id));

    expect(selfCard.state).toBe('active');
    expect(selfCard.summaryLines).toEqual([
      'At Start of Combat, Feskar gains 1 Resilient Bond stack, reducing non-Basic Physical Damage Received by 6.5% until end of combat.',
      'Maximum stack count and final mitigation formula remain unresolved.',
    ]);
    expect(cardText(selfCard)).not.toMatch(/activation succeeds|activation success|support uptime/i);

    expect(selectedProvider.state).toBe('active');
    expect(selectedProvider.summaryLines).toEqual([
      'At Start of Combat, one of Shadowsong and Vaeldra is selected and gains 1 Resilient Bond stack.',
      'The selected ally identity, maximum stack count, and final mitigation formula remain unresolved.',
    ]);
    expect(cardText(selectedProvider)).not.toMatch(/activation succeeds|initial.*uptime/i);

    for (const recipientCard of [shadowRecipient, vaeldraRecipient]) {
      expect(recipientCard.state).toBe('conditional');
      expect(recipientCard.summaryLines.join(' ')).toContain('At Start of Combat, one of Shadowsong and Vaeldra is selected to gain 1 Resilient Bond stack.');
      expect(recipientCard.summaryLines.join(' ')).toContain('non-Basic Physical Damage Received by 6.5% until end of combat');
      expect(recipientCard.summaryLines.join(' ')).toContain('no activation roll occurs');
    }

    expect(retreatCard.state).toBe('conditional');
    expect(retreatCard.summaryLines).toEqual([
      'If the ally selected at Start of Combat retreated during the previous round, Feskar gains 1 additional Resilient Bond stack.',
      'The resulting stack lasts until end of combat; tracked ally identity, retreat occurrence, maximum stack count, and final mitigation formula remain unresolved.',
    ]);
    expect(selfCard.id).not.toBe(retreatCard.id);
    expect(selfCard.traceIds).not.toEqual(retreatCard.traceIds);
  });

  it('projects Calculated Assault with timing, chance, target, scope, amount, and duration', () => {
    const { traces, items } = allItems();
    const trace = traces.find((item) => item.sourceAbilityId === 'feskar-calculated-assault' && item.matchKind === 'enemy-damage-dealt-reduction')!;
    const card = findItem(items, (item) => item.traceIds.includes(trace.id));

    expect(trace.status).toBe('potential');
    expect(trace.targetSelectorSummary).toContain('highest-stat');
    expect(trace.targetSelectorSummary).toContain('selection stat strength');
    expect(card.state).toBe('conditional');
    expect(card.summaryLines).toEqual([
      "Each round, 20% chance to reduce the highest-Strength enemy's non-Basic Physical Damage Dealt by 12% for 2 rounds. Enemy identity and highest-Strength tie resolution remain unresolved.",
    ]);
    for (const required of ['Each round', '20%', 'highest-Strength enemy', 'non-Basic Physical Damage Dealt', '12%', '2 rounds']) {
      expect(card.summary).toContain(required);
    }
    expect(card.summary).not.toContain('Targets 1 enemy target');
  });

  it('renders compact collapsed cards and retained expanded details in React', async () => {
    const user = await renderFormation();
    const left = screen.getByRole('article', { name: 'Left Flank' });
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });

    for (const article of [left, vanguard]) {
      for (const section of ['Receives', 'Provides']) {
        const region = within(article).queryByRole('region', { name: section });
        const button = region ? within(region).queryByRole('button', { name: /show all/i }) : null;
        if (button) {
          await user.click(button);
        }
      }
    }

    const burnItem = within(vanguard).getAllByText(/Against the same eligible Burned enemy/i)[0]!.closest('.card-interaction-item');
    expect(burnItem).not.toBeNull();
    const collapsedBurn = burnItem!.textContent ?? '';
    expect(collapsedBurn).toContain('Blazing Conductor attempts Burn on Rounds 2, 5, and 8');
    expect(collapsedBurn).toContain('Prior-round Burn can carry into Emerald Inferno');
    expectNoWindowText(collapsedBurn);
    await user.click(within(burnItem as HTMLElement).getByRole('button', { name: /details/i }));
    const expandedBurn = burnItem!.textContent ?? '';
    for (const windowText of overlapWindows) {
      expect(expandedBurn).toContain(windowText);
    }

    const periodicItem = within(left).getByText(/Burn deals periodic Fire Damage each round for 2 rounds/i).closest('.card-interaction-item');
    expect(periodicItem).not.toBeNull();
    expect(periodicItem!.textContent).toContain('40% on the first and 20% on a different second target');

    const calculatedItem = within(vanguard)
      .getByText(/Enemy identity and highest-Strength tie resolution remain unresolved/i)
      .closest('.card-interaction-item');
    expect(calculatedItem).not.toBeNull();
  });
});
