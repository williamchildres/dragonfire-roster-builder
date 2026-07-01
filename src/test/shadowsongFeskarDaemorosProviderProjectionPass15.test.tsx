import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { dragons } from '../data/dragons';
import type { FormationAnalysisInput } from '../models/synergy';
import { buildFormationCardPresentation, type FormationCardInteraction } from '../services/formationCardAnalysis';
import { createEmptyRoster, ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { analyzeFormationTraces } from '../services/synergyTrace';

const formation = {
  'left-flank': 'shadowsong',
  vanguard: 'feskar',
  'right-flank': 'daemoros',
} as const satisfies FormationAnalysisInput;

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

function interactionText(item: FormationCardInteraction): string {
  return [
    item.effectTitle,
    item.summary,
    ...item.summaryLines,
    item.detail,
    ...item.details,
    ...item.effects,
    ...item.modifierLines,
    item.targetSummary ?? '',
  ].join(' ');
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

describe('Shadowsong/Feskar/Daemoros provider projection pass 15', () => {
  it('uses dependent metric titles and aggregates the two Burn providers on Feskar', () => {
    const { traces, presentation } = currentPresentation();
    const feskar = presentation.cards.find((card) => card.dragonId === 'feskar')!;
    expect(feskar.receives).toHaveLength(6);

    const burnCards = feskar.receives.filter((item) => item.effectTitle === 'Burn enhances Emerald Inferno damage rate');
    expect(burnCards).toHaveLength(1);
    const burnCard = burnCards[0]!;
    const burnText = interactionText(burnCard);
    expect(burnCard.sourceName).toBe('Shadowsong and Daemoros');
    expect(burnCard.sourceName).not.toBe('Team');
    expect((burnCard.sourceName.match(/Shadowsong/g) ?? [])).toHaveLength(1);
    expect((burnCard.sourceName.match(/Daemoros/g) ?? [])).toHaveLength(1);
    expect(burnCard.summaryLines.length).toBeLessThanOrEqual(4);
    expect(burnText).toContain('Blazing Conductor');
    expect(burnText).toContain('Rounds 2, 5, and 8');
    expect(burnText).toContain('40%');
    expect(burnText).toContain('20%');
    expect(burnText).toContain('different second');
    expect(burnText).toContain('Shadowflame');
    expect(burnText).toContain('odd-numbered rounds');
    expect(burnText).toContain('one enemy within adjacency');
    expect(burnText).toContain('40%');
    expect(burnText).toContain('60%');
    expect(burnText).toMatch(/same (?:otherwise-eligible )?(?:Burned )?enemy|same target/i);
    expect(burnText).toMatch(/same-round .*resolves before Emerald Inferno|action order/i);
    expect(burnText).toMatch(/application success|same-target overlap|enemy identity/i);
    expect(burnText).toContain('Round 3 after a successful Round 2 application');
    expect(burnText).toContain('Round 10 after a successful Round 9 application');

    const burnTraces = traces.filter((trace) => trace.title === 'Burn enables Emerald Inferno' && trace.recipientAbilityId === 'feskar-emerald-inferno' && trace.matchKind === 'status-condition-enablement');
    expect(burnTraces).toHaveLength(3);
    expect(burnTraces.map((trace) => trace.id)).toEqual(expect.arrayContaining(burnCard.traceIds));

    const allItems = presentation.cards.flatMap((card) => [...card.receives, ...card.provides]);
    const titles = allItems.map((item) => item.effectTitle);
    expect(titles.some((title) => title.endsWith('Panic enhances Scorched Earth chance'))).toBe(true);
    expect(titles.filter((title) => title === 'Panic enhances Breath of Fire chance')).toHaveLength(0);
    expect(titles.filter((title) => title === 'Burn enhances Emerald Inferno chance')).toHaveLength(0);
    expect(titles.some((title) => title.endsWith('Panic enhances Breath of Fire damage rate'))).toBe(true);
    expect(titles).toContain('Burn enhances Emerald Inferno damage rate');
  });

  it('renders the aggregated Burn card in the production Formation Builder DOM', async () => {
    const user = await renderFormation();
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    const receives = within(vanguard).getByRole('region', { name: 'Receives' });
    await user.click(within(receives).getByRole('button', { name: /show all/i }));
    const burnTitle = within(receives).getByText('Burn enhances Emerald Inferno damage rate');
    const burnCard = burnTitle.closest('.card-interaction-item');
    expect(burnCard).not.toBeNull();
    expect(within(burnCard as HTMLElement).getByText('Shadowsong and Daemoros → Feskar')).toBeInTheDocument();
    expect(burnCard).not.toHaveTextContent('Team → Feskar');
    expect(within(receives).queryAllByText('Burn enhances Emerald Inferno damage rate')).toHaveLength(1);
    expect(within(receives).queryByText('Burn enhances Emerald Inferno chance')).not.toBeInTheDocument();

    const bullets = within(burnCard as HTMLElement).getAllByRole('listitem');
    expect(bullets.length).toBeLessThanOrEqual(4);
    expect(burnCard).toHaveTextContent(/Blazing Conductor/i);
    expect(burnCard).toHaveTextContent(/Shadowflame/i);
    expect(burnCard).toHaveTextContent(/40%.*60%|60%.*40%/i);

    await user.click(within(burnCard as HTMLElement).getByRole('button', { name: /details/i }));
    expect(burnCard).toHaveTextContent('Round 3 after a successful Round 2 application');
    expect(burnCard).toHaveTextContent('Round 10 after a successful Round 9 application');
  });
});
