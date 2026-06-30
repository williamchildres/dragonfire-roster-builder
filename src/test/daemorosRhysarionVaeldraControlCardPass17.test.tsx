import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from '../app/App';
import { ROSTER_SCHEMA_VERSION, STORAGE_KEY } from '../services/rosterStorage';
import { pass17Analysis, pass17Roster } from './pass17Helpers';

async function renderPass17Formation() {
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
  return user;
}

describe('Daemoros/Rhysarion/Vaeldra Control card pass 17', () => {
  it('projects one four-bullet Control card with Lure prerequisite context', async () => {
    const { presentation } = pass17Analysis();
    const rhysarion = presentation.cards.find((card) => card.dragonId === 'rhysarion')!;
    expect(rhysarion.receives).toHaveLength(4);
    const cards = rhysarion.receives.filter((card) => card.effectTitle === 'Control enhances Dawnsong damage rate');
    expect(cards).toHaveLength(1);
    const card = cards[0]!;
    expect(card.sourceName).toBe('Daemoros and Vaeldra');
    expect(card.sourceName).not.toBe('Team');
    expect(card.effectTitle).toBe('Control enhances Dawnsong damage rate');
    expect(card.summaryLines).toEqual([
      'Shroud of Shadows checks odd-numbered rounds: 15% chance to apply Confusion to one enemy within adjacency; Confusion lasts 2 rounds.',
      "Lure checks each round: 25% chance to Taunt 3 enemies in any lane for 2 rounds. Siren's Call checks Rounds 1, 2, and 3 at 40%: already-Taunted enemies receive Stagger until end of the current round, while non-Taunted enemies take the Taunt branch. The branches are mutually exclusive per enemy.",
      "Against the same otherwise-eligible enemy with Control, Dawnsong Fire Damage Rate increases from 20% to 30%; Confusion may carry into later Dawnsong rounds, while Siren's Call Stagger can overlap only Round 2 and must resolve before Dawnsong.",
      'Supplier application success, Lure-to-Siren same-target overlap, eligible enemy identity, roll scope, and same-round action order remain unresolved.',
    ]);
    expect(card.summaryLines).toHaveLength(4);
    expect(card.summary).not.toMatch(/Base current|Enhanced current|Conditional multiplier|1\.5x|source effect ID/i);
    expect(card.details.join(' ')).toContain('Round 5 from a successful Round 5 application only if Shroud of Shadows resolves before Dawnsong that round');
    expect(card.details.join(' ')).toContain("Siren's Call's Stagger branch overlaps Dawnsong only on Round 2");
    expect(card.details.join(' ')).toContain("Prerequisite context: Lure can establish the Taunt required by Siren's Call's Stagger branch.");
    expect(card.details.join(' ')).not.toMatch(/Lure .*direct .*Control supplier|Taunt directly enhances Dawnsong/i);

    const user = await renderPass17Formation();
    const vanguard = screen.getByRole('article', { name: 'Vanguard' });
    const receives = within(vanguard).getByRole('region', { name: 'Receives' });
    expect(receives).toHaveTextContent('4');
    await user.click(within(receives).getByRole('button', { name: /show all/i }));
    const title = within(receives).getByText('Control enhances Dawnsong damage rate');
    const domCard = title.closest('.card-interaction-item') as HTMLElement;
    expect(domCard).not.toBeNull();
    expect(within(domCard).getByText('Daemoros and Vaeldra → Rhysarion')).toBeInTheDocument();
    const bullets = within(domCard).getAllByRole('listitem').map((item) => item.textContent?.trim() ?? '');
    expect(bullets).toEqual(card.summaryLines);
    expect(bullets).toHaveLength(4);
    expect(domCard.textContent ?? '').not.toMatch(/Team → Rhysarion|Base current|Enhanced current|Conditional multiplier|1\.5x/i);
    await user.click(within(domCard).getByRole('button', { name: /details/i }));
    const expanded = domCard.textContent ?? '';
    expect(expanded).toContain('Round 8 after a successful Round 7 application');
    expect(expanded).toContain('Schedule overlap: Round 2 only.');
    expect(expanded).toContain("Known possible overlap windows: Round 1 from a successful Round 1 Lure only if Lure resolves before Siren's Call that round");
    expect(expanded).not.toMatch(/Taunt directly enhances Dawnsong/i);
  });
});
