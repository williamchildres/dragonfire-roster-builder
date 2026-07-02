import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { createSynergyAuditExport, technicalAnalysisTraceIdentity } from '../services/synergyTrace';
import { pass17Analysis, pass17Formation, pass17Roster, traceText } from './pass17Helpers';

const sourceCapabilityId = 'vaeldra-lure-lure-taunt-taunt-status-output';
const dependentCapabilityId = 'vaeldra-sirens-call-sirens-call-stagger-stagger-status-output';

function occurrences(text: string, value: string): number {
  return text.split(value).length - 1;
}

async function renderExpandedControlCard() {
  const user = userEvent.setup();
  const roster = pass17Roster();
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
  await user.selectOptions(selectors[2]!, 'vaeldra');
  const vanguard = screen.getByRole('article', { name: 'Vanguard' });
  const receives = within(vanguard).getByRole('region', { name: 'Receives' });
  await user.click(within(receives).getByRole('button', { name: /show all/i }));
  const card = within(receives).getByText('Control enhances Dawnsong damage rate').closest('.card-interaction-item') as HTMLElement;
  await user.click(within(card).getByRole('button', { name: /details/i }));
  return card;
}

describe('Daemoros/Rhysarion/Vaeldra prerequisite projection pass 17B', () => {
  it('projects the dependent branch selector and capability identities on the prerequisite trace', () => {
    const { roster, traces, presentation } = pass17Analysis();
    const prerequisiteMatches = traces.filter((trace) => trace.title === "Taunt enables Siren's Call Stagger branch");
    expect(prerequisiteMatches).toHaveLength(1);
    const prerequisite = prerequisiteMatches[0]!;
    expect(prerequisite).toMatchObject({
      status: 'potential',
      sourceDragonId: 'vaeldra',
      sourceAbilityId: 'vaeldra-lure',
      recipientDragonId: 'vaeldra',
      recipientAbilityId: 'vaeldra-sirens-call',
      interactionScope: 'internal',
    });
    expect(prerequisite.targetSelectorSummary).toBe('enemy; any-lane; all-matching-condition; all qualifying already-Taunted enemies in any lane, up to 3; caster eligibility unknown');
    expect(prerequisite.targetSelectorSummary).not.toContain('any; 3 targets');
    expect(prerequisite.modifierCapabilityIds).toEqual([sourceCapabilityId]);
    expect(prerequisite.matchedOutputCapabilityIds).toEqual([dependentCapabilityId]);

    const exportText = JSON.stringify(createSynergyAuditExport(pass17Formation, traces, roster));
    expect(occurrences(exportText, sourceCapabilityId)).toBeGreaterThanOrEqual(1);
    expect(prerequisite.modifierCapabilityIds).toEqual([sourceCapabilityId]);
    expect(prerequisite.matchedOutputCapabilityIds).toEqual([dependentCapabilityId]);

    const text = traceText(prerequisite);
    expect(text).toContain('Lure has a 25% chance each round to apply Taunt to 3 enemies in any lane for 2 rounds.');
    expect(text).toContain("Siren's Call checks Rounds 1, 2, and 3 at 40%.");
    expect(text).toContain('an already-Taunted target takes the Stagger branch');
    expect(text).toContain('a non-Taunted target takes the Taunt branch');
    expect(text).toContain('exactly one branch applies per enemy');
    expect(text).toContain('mutually exclusive per enemy');
    expect(text).toContain('The dependent branch supplies Stagger');
    expect(text).toContain('Stagger is Control; Taunt is not Control');
    expect(text).toContain("Stagger branch does not trigger Tempting Distraction");
    expect(text).toContain('same enemy');
    expect(text).toContain('Prior-round Taunt may carry into a later');
    expect(text).toContain('same-round enablement requires Lure to resolve first');
    for (const windowText of [
      "Round 1 from a successful Round 1 Lure only if Lure resolves before Siren's Call that round",
      'Round 2 after a successful Round 1 Lure',
      "Round 2 from a successful Round 2 Lure only if Lure resolves before Siren's Call that round",
      'Round 3 after a successful Round 2 Lure',
      "Round 3 from a successful Round 3 Lure only if Lure resolves before Siren's Call that round",
    ]) {
      expect(text).toContain(windowText);
    }
    expect(text).not.toMatch(/Taunt is a verified member of Control|Conditional Stagger: Taunt Supplied status/i);

    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    expect(rhysarion.receives).toHaveLength(4);
    expect(rhysarion.receives.filter((card) => card.traceIds.includes(prerequisite.id))).toHaveLength(0);
  });

  it('renders one clean prerequisite block in expanded Details without changing collapsed controls', async () => {
    const { traces, presentation } = pass17Analysis();
    const counts = traces.reduce<Record<string, number>>((acc, trace) => {
      acc[trace.status] = (acc[trace.status] ?? 0) + 1;
      return acc;
    }, {});
    expect(traces).toHaveLength(77);
    expect(counts).toMatchObject({ active: 31, potential: 36, inactive: 9, blocked: 1 });
    expect(counts['not-applicable'] ?? 0).toBe(0);
    expect(counts.unknown ?? 0).toBe(0);
    expect(new Set(traces.map(technicalAnalysisTraceIdentity)).size).toBe(traces.length);

    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    const controlCard = rhysarion.receives.find((card) => card.effectTitle === 'Control enhances Dawnsong damage rate')!;
    expect(controlCard.sourceName).toBe('Daemoros and Vaeldra');
    expect(controlCard.summaryLines).toHaveLength(4);
    expect(controlCard.summaryLines).toEqual([
      'Shroud of Shadows checks odd-numbered rounds: 15% chance to apply Confusion to one enemy within adjacency; Confusion lasts 2 rounds.',
      "Lure checks each round: 25% chance to Taunt 3 enemies in any lane for 2 rounds. Siren's Call checks Rounds 1, 2, and 3 at 40%: already-Taunted enemies receive Stagger until end of the current round, while non-Taunted enemies take the Taunt branch. The branches are mutually exclusive per enemy.",
      "Against the same otherwise-eligible enemy with Control, Dawnsong Fire Damage Rate increases from 20% to 30%; Confusion may carry into later Dawnsong rounds, while Siren's Call Stagger can overlap only Round 2 and must resolve before Dawnsong.",
      'Supplier application success, Lure-to-Siren same-target overlap, eligible enemy identity, roll scope, and same-round action order remain unresolved.',
    ]);

    const card = await renderExpandedControlCard();
    const domText = card.textContent ?? '';
    expect(domText).toContain('Daemoros and Vaeldra → Rhysarion');
    expect(domText).toContain("Siren's Call's Stagger branch overlaps Dawnsong only on Round 2");
    expect(occurrences(domText, "Prerequisite context: Lure can establish the Taunt required by Siren's Call's Stagger branch.")).toBe(1);
    expect(occurrences(domText, sourceCapabilityId)).toBe(1);
    expect(occurrences(domText, dependentCapabilityId)).toBe(1);
    expect(occurrences(domText, 'Lure schedule: Each round.')).toBe(1);
    expect(occurrences(domText, "Siren's Call schedule: Round 1, 2, and 3.")).toBe(1);
    expect(occurrences(domText, 'Taunt duration: 2 rounds.')).toBe(1);
    expect(occurrences(domText, "Lure and Siren's Call must affect the same enemy.")).toBe(1);
    expect(occurrences(domText, 'Prerequisite uncertainty:')).toBe(1);
    for (const windowText of [
      "Round 1 from a successful Round 1 Lure only if Lure resolves before Siren's Call that round",
      'Round 2 after a successful Round 1 Lure',
      "Round 2 from a successful Round 2 Lure only if Lure resolves before Siren's Call that round",
      'Round 3 after a successful Round 2 Lure',
      "Round 3 from a successful Round 3 Lure only if Lure resolves before Siren's Call that round",
    ]) {
      expect(occurrences(domText, windowText)).toBe(1);
    }
    expect(domText).not.toMatch(/Conditional Stagger: Taunt Supplied status|Taunt Supplied status: Taunt Status application chance/i);
    expect(occurrences(domText, "Known possible overlap windows: Round 1 from a successful Round 1 Lure")).toBe(1);
    expect(occurrences(domText, 'Supplier schedule: Each round.')).toBe(0);
    expect(occurrences(domText, 'Dependent schedule: Rounds 1, 2, and 3.')).toBe(0);

    expect(traces.filter((trace) => trace.title === 'Confusion enables Dawnsong')).toHaveLength(1);
    expect(traces.filter((trace) => trace.title === 'Stagger enables Dawnsong')).toHaveLength(1);
    expect(traces.filter((trace) => /Lure enables Dawnsong|Taunt enables Dawnsong/i.test(trace.title))).toHaveLength(0);
    const resilience = traces.find((trace) =>
      trace.title === 'Tactical Damage Support' &&
      trace.sourceAbilityId === 'vaeldra-warriors-resilience' &&
      trace.recipientDragonId === 'daemoros'
    )!;
    expect(resilience.matchedOutputCapabilityIds).toEqual(expect.arrayContaining([
      'periodic-daemoros-instill-fear-instill-fear-panic-panic-output',
      'periodic-daemoros-darkening-fear-darkening-fear-panic-panic-output',
    ]));
    expect(traces.filter((trace) => trace.matchKind === 'periodic-damage-amplification' && trace.sourceAbilityId === 'vaeldra-warriors-resilience')).toHaveLength(0);
    expect(traces.filter((trace) => traceText(trace).match(/successful Stagger|Stagger triggers/i))).toHaveLength(0);
  });
});
