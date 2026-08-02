import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TroopAffinityRecommendation } from '../app/TroopAffinityRecommendation';
import { DragonDetailsDialog } from '../app/DragonDetailModal';
import { dragons } from '../data/dragons';
import { TROOP_TYPES, type AffinityLevel, type Dragon, type TroopType } from '../models/dragon';

const byId = (id: string) => dragons.find((dragon) => dragon.id === id)!;
const synthetic = (id: string, values: Partial<Record<TroopType, AffinityLevel>>, fallback: AffinityLevel = 'neutral'): Dragon => ({
  ...byId('syrax'),
  id,
  slug: id,
  name: id.toUpperCase(),
  affinities: Object.fromEntries(TROOP_TYPES.map((troopType) => [troopType, values[troopType] ?? fallback])) as Dragon['affinities'],
});

describe('Troop Affinity recommendation presentation', () => {
  it('presents a real full match as +20% per dragon without aggregating the percentage', () => {
    render(<TroopAffinityRecommendation formationDragons={[byId('syrax'), byId('crimson'), byId('antares')]} />);
    expect(screen.getByText(/Full affinity match: all 3 dragons receive the \+20% positive-affinity benefit with Archers/i)).toBeInTheDocument();
    expect(screen.getByText('Full affinity match')).toBeInTheDocument();
    expect(screen.getByText(/Positive affinity coverage is 3 of 3 dragons/i)).toBeInTheDocument();
    expect(screen.queryByText(/\+60%|formation power with affinity|adjusted/i)).not.toBeInTheDocument();
  });

  it('states exact partial coverage and identifies the neutral dragon', () => {
    render(<TroopAffinityRecommendation formationDragons={[byId('seasmoke'), byId('antares'), byId('velar')]} />);
    expect(screen.getByText(/Best shared affinity: 2 of 3 dragons receive \+20% with Archers; Velar is neutral/i)).toBeInTheDocument();
    expect(screen.getByText('Partial affinity match')).toBeInTheDocument();
    expect(screen.getByText(/Positive affinity coverage is 2 of 3 dragons/i)).toBeInTheDocument();
    expect(screen.queryByText(/some other troop affinities are not verified/i)).not.toBeInTheDocument();
  });

  it('qualifies a complete recommendation when unknown data could change the comparison', async () => {
    const user = userEvent.setup();
    render(<TroopAffinityRecommendation formationDragons={[
      synthetic('a', { Cavalry: 'positive', Shieldbearers: 'positive' }, 'negative'),
      synthetic('b', { Cavalry: 'positive', Shieldbearers: 'neutral' }, 'negative'),
      synthetic('c', { Cavalry: 'unknown', Shieldbearers: 'neutral' }, 'negative'),
    ]} />);

    expect(screen.getByText(/Best verified shared affinity: 1 of 3 dragons receive \+20% with Shieldbearers; B and C are neutral/i)).toBeInTheDocument();
    expect(screen.getByText('Partial affinity match')).toBeInTheDocument();
    expect(screen.getByText(/best fully verified nonnegative option.*could change the comparison/i)).toBeInTheDocument();
    const detailsSummary = screen.getByText('Affinity breakdown for all five troop types');
    await user.click(detailsSummary);
    const cavalry = screen.getByText('Cavalry').closest('.troop-affinity-candidate');
    expect(cavalry).not.toBeNull();
    expect(within(cavalry as HTMLElement).getByText('Affinity not verified').nextSibling).toHaveTextContent('C');
  });

  it('keeps a full-positive result while disclosing unrelated unknown data', () => {
    render(<TroopAffinityRecommendation formationDragons={[
      synthetic('a', { Cavalry: 'positive' }),
      synthetic('b', { Cavalry: 'positive' }),
      synthetic('c', { Cavalry: 'positive', Archers: 'unknown' }),
    ]} />);

    expect(screen.getByText(/Full affinity match: all 3 dragons receive the \+20% positive-affinity benefit with Cavalry/i)).toBeInTheDocument();
    expect(screen.getByText('Full affinity match')).toBeInTheDocument();
    expect(screen.getByText(/Some other troop affinities are not verified and could change the comparison/i)).toBeInTheDocument();
  });

  it('shows every tied recommendation and all five accessible category breakdowns', async () => {
    const user = userEvent.setup();
    render(<TroopAffinityRecommendation formationDragons={[byId('caraxes'), byId('syrax'), byId('seasmoke')]} />);
    expect(screen.getByText(/with Cavalry, Archers, and Spearmen/i)).toBeInTheDocument();
    const summary = screen.getByText('Affinity breakdown for all five troop types');
    await user.click(summary);
    expect(summary.closest('details')).toHaveAttribute('open');
    for (const troopType of TROOP_TYPES) expect(screen.getByText(troopType)).toBeInTheDocument();
    expect(screen.getAllByText('+20% positive affinity')).toHaveLength(5);
    expect(screen.getAllByText('No affinity modifier')).toHaveLength(5);
    expect(screen.getAllByText('Negative affinity — reduced stats and siege damage')).toHaveLength(5);
    expect(screen.getAllByText('Affinity not verified')).toHaveLength(5);
  });

  it('warns for incomplete data, verified negative tradeoffs, and recommended Siege', () => {
    const { rerender } = render(<TroopAffinityRecommendation formationDragons={[
      synthetic('a', { Cavalry: 'positive' }, 'negative'),
      synthetic('b', { Cavalry: 'positive' }, 'negative'),
      synthetic('c', { Cavalry: 'unknown' }, 'negative'),
    ]} />);
    expect(screen.getByText('Incomplete affinity data')).toBeInTheDocument();
    expect(screen.getByText('Some troop affinities are not verified, so this recommendation may be incomplete.')).toBeInTheDocument();

    rerender(<TroopAffinityRecommendation formationDragons={[
      synthetic('a', {}, 'negative'),
      synthetic('b', { Cavalry: 'positive' }, 'neutral'),
      synthetic('c', { Cavalry: 'positive' }, 'neutral'),
    ]} />);
    expect(screen.getByText('Affinity tradeoff')).toBeInTheDocument();
    expect(screen.getByText(/no troop type avoids a negative affinity/i)).toBeInTheDocument();

    rerender(<TroopAffinityRecommendation formationDragons={[byId('vhagar'), byId('kalspire'), byId('tairax')]} />);
    expect(screen.getByText(/Siege has the strongest affinity coverage/i)).toBeInTheDocument();
    expect(screen.getByText(/intended for Durability damage and is weak in ordinary troop matchups/i)).toBeInTheDocument();
    expect(screen.getByText(/Enemy troop advantage may change this choice/i)).toBeInTheDocument();
  });

  it('renders a clear incomplete-formation state', () => {
    render(<TroopAffinityRecommendation formationDragons={[byId('syrax'), byId('caraxes')]} />);
    const section = screen.getByRole('heading', { name: 'Troop Affinity' }).closest('section')!;
    expect(within(section).getByText('Add three dragons to receive a troop-affinity recommendation.')).toBeInTheDocument();
  });

  it('explains positive, neutral, negative, and unknown affinity in individual dragon details', () => {
    render(<DragonDetailsDialog dragon={byId('sunfyre')} onClose={() => undefined} onUpdateRoster={() => undefined} />);
    const panel = screen.getByRole('heading', { name: 'Troop Affinities' }).closest('section')!;
    expect(panel).toHaveTextContent('Positive affinity gives this dragon the displayed +20% benefit');
    expect(panel).toHaveTextContent('Formation recommendations consider the canonical affinities of all three dragons');
    expect(panel).toHaveTextContent('+20% positive affinity');
    expect(panel).toHaveTextContent('Affinity not verified');
  });
});
