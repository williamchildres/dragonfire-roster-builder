import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput, SynergyTrace } from '../models/synergy';
import { buildFormationCardPresentation, type FormationCardInteraction } from '../services/formationCardAnalysis';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { analyzeFormationTraces, technicalAnalysisTraceIdentity } from '../services/synergyTrace';

const formation = {
  'left-flank': 'daemoros',
  vanguard: 'rhysarion',
  'right-flank': 'shadowsong',
} as const satisfies FormationAnalysisInput;

const scheduleCases = [
  {
    sourceAbilityId: 'daemoros-shroud-of-shadows',
    recipientAbilityId: 'rhysarion-dawnsong',
    supplier: 'Shroud of Shadows',
    dependent: 'Dawnsong',
    bullets: [
      '15% chance on odd-numbered rounds to apply Confusion to one enemy within adjacency for 2 rounds.',
      'Against the same enemy while it has Control, Dawnsong Fire Damage increases from 20% to 30%.',
      'The status can carry into later Dawnsong rounds; the shared Round 5 window requires Shroud of Shadows to resolve first.',
      'Application success, enemy identity, same-target overlap, action order remain unresolved.',
    ],
    windows: [
      'Round 2 after a successful Round 1 application',
      'Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round',
      'Round 8 after a successful Round 7 application',
    ],
  },
  {
    sourceAbilityId: 'daemoros-instill-fear',
    recipientAbilityId: 'shadowsong-breath-of-fire',
    supplier: 'Instill Fear',
    dependent: 'Breath of Fire',
    bullets: [
      '25% chance each round to apply Panic to one enemy in any lane for 2 rounds.',
      'Against the same enemy while it has Panic, Breath of Fire Fire Damage increases from 100% to 150%.',
      'Prior-round Panic can carry into scheduled Breath of Fire rounds; same-round Panic requires Instill Fear to resolve first.',
      'Application success, enemy identity, same-target overlap, action order remain unresolved.',
    ],
    windows: [
      'Round 2 after a successful Round 1 application',
      'Round 5 after a successful Round 4 application',
      'Round 8 after a successful Round 7 application',
    ],
  },
  {
    sourceAbilityId: 'daemoros-darkening-fear',
    recipientAbilityId: 'shadowsong-breath-of-fire',
    supplier: 'Darkening Fear',
    dependent: 'Breath of Fire',
    bullets: [
      '25% chance each round to apply Panic to one enemy in any lane for 2 rounds.',
      'Against the same enemy while it has Panic, Breath of Fire Fire Damage increases from 100% to 150%.',
      'Prior-round Panic can carry into scheduled Breath of Fire rounds; same-round Panic requires Darkening Fear to resolve first.',
      'Application success, enemy identity, same-target overlap, action order remain unresolved.',
    ],
    windows: [
      'Round 2 after a successful Round 1 application',
      'Round 5 after a successful Round 4 application',
      'Round 8 after a successful Round 7 application',
    ],
  },
  {
    sourceAbilityId: 'daemoros-instill-fear',
    recipientAbilityId: 'shadowsong-scorched-earth',
    supplier: 'Instill Fear',
    dependent: 'Scorched Earth',
    bullets: [
      '25% chance each round to apply Panic to one enemy in any lane for 2 rounds.',
      "Against that same enemy, Panic 2x increases Scorched Earth's Vulnerable chance from 10% to 20%.",
      'Previous-round Panic can carry into later checks; same-round Panic requires Instill Fear to resolve first.',
      'Application success, same-target overlap, action order, roll scope remain unresolved.',
    ],
    windows: [
      'Instill Fear and Scorched Earth both check each round',
      'A Panic applied during the current round can enhance Scorched Earth only if Instill Fear resolves first',
    ],
  },
  {
    sourceAbilityId: 'daemoros-darkening-fear',
    recipientAbilityId: 'shadowsong-scorched-earth',
    supplier: 'Darkening Fear',
    dependent: 'Scorched Earth',
    bullets: [
      '25% chance each round to apply Panic to one enemy in any lane for 2 rounds.',
      "Against that same enemy, Panic 2x increases Scorched Earth's Vulnerable chance from 10% to 20%.",
      'Previous-round Panic can carry into later checks; same-round Panic requires Darkening Fear to resolve first.',
      'Application success, same-target overlap, action order, roll scope remain unresolved.',
    ],
    windows: [
      'Darkening Fear and Scorched Earth both check each round',
      'A Panic applied during the current round can enhance Scorched Earth only if Darkening Fear resolves first',
    ],
  },
] as const;

function pass13Roster() {
  const roster = createEmptyRoster(dragons);
  for (const dragonId of ['daemoros', 'rhysarion', 'shadowsong']) {
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
    roster: pass13Roster(),
    dragonLevels: { daemoros: 26, rhysarion: 26, shadowsong: 26 },
  });
}

function traceText(trace: SynergyTrace): string {
  return [
    trace.title,
    trace.explanation,
    ...trace.matchedFacts,
    ...trace.effects,
    ...trace.assumptions,
    ...trace.unresolvedQuestions,
    trace.exactResultUnknownReason ?? '',
  ].join(' ');
}

function scheduleTrace(traces: SynergyTrace[], sourceAbilityId: string, recipientAbilityId: string): SynergyTrace {
  const trace = traces.find((item) =>
    item.matchKind === 'status-condition-enablement' &&
    item.sourceAbilityId === sourceAbilityId &&
    item.recipientAbilityId === recipientAbilityId
  );
  expect(trace).toBeDefined();
  return trace!;
}

function interactionByTrace(items: FormationCardInteraction[], traceId: string): FormationCardInteraction {
  const item = items.find((candidate) => candidate.traceId === traceId);
  expect(item).toBeDefined();
  return item!;
}

function allCardText(item: FormationCardInteraction): string {
  return [item.summary, ...item.summaryLines, item.detail, ...item.details, ...item.effects].join(' ');
}

function countOccurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

describe('scheduled dependency card contract pass 13', () => {
  it('keeps pass-13 formation trace counts and identities stable', () => {
    const traces = currentTraces();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});

    expect(traces).toHaveLength(73);
    expect(counts).toMatchObject({
      active: 30,
      potential: 34,
      inactive: 8,
      blocked: 1,
    });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);
  });

  it('projects concise collapsed summaries while retaining detailed overlap windows', () => {
    const traces = currentTraces();
    const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster: pass13Roster(), previewEnabled: false });

    for (const testCase of scheduleCases) {
      const trace = scheduleTrace(traces, testCase.sourceAbilityId, testCase.recipientAbilityId);
      expect(trace.status).toBe('potential');

      const providerCard = presentation.cards.find((card) => card.dragonId === trace.sourceDragonId)!;
      const recipientCard = presentation.cards.find((card) => card.dragonId === trace.recipientDragonId)!;
      const provides = interactionByTrace(providerCard.provides, trace.id);
      const receives = interactionByTrace(recipientCard.receives, trace.id);

      expect(provides.state).toBe('conditional');
      expect(receives.state).toBe('conditional');
      expect(provides.summaryLines).toEqual(testCase.bullets);
      expect(receives.summaryLines).toEqual(testCase.bullets);
      expect(provides.summaryLines).toHaveLength(4);
      expect(receives.summaryLines).toHaveLength(4);

      for (const collapsed of [provides.summary, receives.summary]) {
        expect(collapsed).toContain(testCase.bullets[0]);
        expect(collapsed).toContain(testCase.bullets[1]);
        expect(collapsed).toMatch(/same enemy|that same enemy|same-target/i);
        expect(collapsed).toMatch(/carry into|Prior-round|Previous-round/i);
        expect(collapsed).toMatch(/requires .* to resolve first/i);
        expect(collapsed).toMatch(/remain unresolved/i);
        expect(collapsed).not.toContain('Known possible overlap windows');
        expect(collapsed).not.toContain('Round 2 after a successful Round 1 application');
        expect(collapsed).not.toContain('Round 5 after a successful Round 4 application');
        expect(collapsed).not.toContain('Round 8 after a successful Round 7 application');
      }

      const cardText = allCardText(provides);
      for (const windowText of testCase.windows) {
        expect(cardText).toContain(windowText);
        expect(traceText(trace)).toContain(windowText);
      }
    }
  });

  it('uses typed enhancement stats for direct and derived enemy reduction cards', () => {
    const traces = currentTraces();
    const presentation = buildFormationCardPresentation(formation, dragons, traces, { roster: pass13Roster(), previewEnabled: false });
    const items = presentation.cards.flatMap((card) => [...card.provides, ...card.receives]);
    const textForAbility = (abilityName: string) => items
      .filter((item) => item.abilityName === abilityName)
      .map(allCardText)
      .join(' ');

    for (const abilityName of ['Instill Fear', 'Darkening Fear']) {
      const text = textForAbility(abilityName);
      expect(text).toContain("Base Enemy Intelligence -25% on 1 enemy target; final reduction scales with Daemoros's Strength and remains unresolved.");
      expect(text).toContain("Base Enemy Instinct -25% on 1 enemy target; final reduction scales with Daemoros's Strength and remains unresolved.");
      expect(text).toContain('Base Enemy Instinct -25%');
      expect(text).toContain('Shadowflame');
      expect(text).toContain('Dawnsong');
      expect(text).not.toContain(`${abilityName} applies a base Enemy Intelligence reduction of 25% to one enemy. The final reduction scales with Daemoros's Initiative`);
      expect(text).not.toContain(`${abilityName} applies a base Enemy Instinct reduction of 25% to one enemy. The final reduction scales with Daemoros's Initiative`);
      expect(text).toContain('Priority:');
      expect(text).toContain('Duration: 2 rounds.');
      expect(text).toContain('final reduction scales with Daemoros\'s Strength and remains unresolved');
    }

    const ensnareText = textForAbility('Ensnare');
    expect(ensnareText).toContain("Base Enemy Instinct -18% on 2 adjacent enemy targets; final reduction scales with Shadowsong's Intelligence and remains unresolved.");
    expect(ensnareText).toContain("Base Enemy Initiative -18% on 2 adjacent enemy targets; final reduction scales with Shadowsong's Intelligence and remains unresolved.");
    expect(ensnareText).toContain('Shadowflame');
    expect(ensnareText).toContain('Dawnsong');
    expect(ensnareText).toContain('Breath of Fire');
    expect(ensnareText).not.toContain("final reduction scales with Shadowsong's Initiative and remains unresolved");
    expect(ensnareText).toContain('Timing: Start of Round 1.');
    expect(ensnareText).toContain('Duration: 3 rounds.');
    expect(ensnareText).toContain('final reduction scales with Shadowsong\'s Intelligence and remains unresolved');
  });

  it("keeps Dragon's Cunning on Initiative and avoids target fact duplication", () => {
    const sheepFormation = {
      'left-flank': 'seasmoke',
      vanguard: 'malachite',
      'right-flank': 'sheepstealer',
    } as const satisfies FormationAnalysisInput;
    const roster = createEmptyRoster(dragons);
    for (const [dragonId, level] of Object.entries({ seasmoke: 27, malachite: 26, sheepstealer: 26 })) {
      const entry = roster[dragonId]!;
      entry.owned = true;
      entry.collection.state = 'hatched';
      entry.starRank = 10;
      entry.reignLevel = level;
    }
    const traces = analyzeFormationTraces(sheepFormation, dragons, {
      roster,
      dragonLevels: { seasmoke: 27, malachite: 26, sheepstealer: 26 },
    });
    const presentation = buildFormationCardPresentation(sheepFormation, dragons, traces, { roster, previewEnabled: false });
    const dragonCunningCards = presentation.cards.flatMap((card) => [...card.provides, ...card.receives])
      .filter((item) => item.abilityName === "Dragon's Cunning");
    expect(dragonCunningCards.some((item) => item.summary.includes("final reduction scales with Sheepstealer's Initiative and remains unresolved"))).toBe(true);
    expect(dragonCunningCards.every((item) => countOccurrences(item.summary, '2 adjacent enemy targets') <= 1)).toBe(true);
    expect(dragonCunningCards.every((item) => !/final reduction scales with Sheepstealer's (Strength|Intelligence|Instinct)/.test(item.summary))).toBe(true);
  });

  it('renders the collapsed Formation Builder card without round-by-round schedule enumeration', async () => {
    const user = userEvent.setup();
    const roster = pass13Roster();
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
    await user.selectOptions(selectors[0]!, 'daemoros');
    await user.selectOptions(selectors[1]!, 'rhysarion');
    await user.selectOptions(selectors[2]!, 'shadowsong');

    const rhysarion = screen.getByRole('article', { name: 'Vanguard' });
    const receives = within(rhysarion).getByRole('region', { name: 'Receives' });
    const expand = within(receives).queryByRole('button', { name: /show all/i });
    if (expand) {
      await user.click(expand);
    }
    const item = within(receives).getByText(/Against the same enemy while it has Control, Dawnsong Fire Damage increases from 20% to 30%/i)
      .closest('.card-interaction-item');
    expect(item).not.toBeNull();
    const collapsedText = item!.textContent ?? '';
    expect(collapsedText).toContain('15% chance on odd-numbered rounds to apply Confusion to one enemy within adjacency for 2 rounds.');
    expect(collapsedText).toContain('shared Round 5 window requires Shroud of Shadows to resolve first.');
    expect(collapsedText).not.toContain('Known possible overlap windows');
    expect(collapsedText).not.toContain('Round 2 after a successful Round 1 application');
    expect(collapsedText).not.toContain('Round 8 after a successful Round 7 application');
  });
});
