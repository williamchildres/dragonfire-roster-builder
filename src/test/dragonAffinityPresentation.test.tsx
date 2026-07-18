import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DragonAffinityIcons } from '../app/SimpleFormationCard';
import { dragons } from '../data/dragons';
import { TROOP_TYPES, type Dragon } from '../models/dragon';

function renderAffinities(dragonId: string) {
  const dragon = dragons.find((candidate) => candidate.id === dragonId)!;
  render(<DragonAffinityIcons dragonName={dragon.name} affinities={dragon.affinities} />);
}

describe('Formation Builder affinity presentation', () => {
  it.each([
    ['antares', ['Favorable affinity: Archers'], ['Unfavorable affinity: Siege']],
    ['arrax', ['Favorable affinity: Shieldbearers', 'Favorable affinity: Archers'], []],
    ['arulix', ['Favorable affinity: Cavalry'], []],
    ['dawnseeker', ['Favorable affinity: Spearmen'], ['Unfavorable affinity: Siege']],
    ['nyrena', ['Favorable affinity: Shieldbearers', 'Favorable affinity: Siege'], []],
    ['vesper', ['Favorable affinity: Shieldbearers'], ['Unfavorable affinity: Siege']],
  ])('%s renders only its canonical favorable and unfavorable affinity icons', (dragonId, favorable, unfavorable) => {
    renderAffinities(dragonId);

    for (const label of favorable) expect(screen.getByLabelText(label)).toBeInTheDocument();
    for (const label of unfavorable) expect(screen.getByLabelText(label)).toBeInTheDocument();
    expect(screen.queryByText('Affinities not verified.')).not.toBeInTheDocument();
  });

  it('does not render icons for neutral affinities', () => {
    renderAffinities('antares');

    for (const troopType of ['Cavalry', 'Shieldbearers', 'Spearmen']) {
      expect(screen.queryByLabelText(new RegExp(`affinity: ${troopType}`, 'i'))).not.toBeInTheDocument();
    }
    expect(screen.queryByLabelText(/Neutral affinity/i)).not.toBeInTheDocument();
  });

  it('retains the fully unknown fallback for synthetic records', () => {
    const affinities: Dragon['affinities'] = Object.fromEntries(
      TROOP_TYPES.map((troopType) => [troopType, 'unknown']),
    ) as Dragon['affinities'];
    render(<DragonAffinityIcons dragonName="Synthetic" affinities={affinities} />);

    expect(screen.getByText('Affinities not verified.')).toBeInTheDocument();
    expect(screen.getByLabelText('Synthetic affinities')).toBeInTheDocument();
  });
});
