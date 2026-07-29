import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { OptimizerRelationshipDetail } from '../app/RosterOptimizer';
import { dragons } from '../data/dragons';
import type { OwnedDragon } from '../models/dragon';
import { rateFormationV3 } from '../services/formationRatingV3';
import { simpleSynergyProfiles } from '../synergy/profiles';
import {
  reliabilityProgressionFromOwnedDragon,
  type ReliabilityProgressionByDragonId,
} from '../synergy/reliability';
import type {
  SimpleFormation,
  SimpleProgressionByDragonId,
} from '../synergy/types';

const dragonsById = new Map(dragons.map((dragon) => [dragon.id, dragon]));

describe('relationship reliability rendering', () => {
  it('renders canonical selected labels and every retained candidate', async () => {
    const relationship = relationshipFixture();
    render(
      <OptimizerRelationshipDetail
        relationship={relationship}
        dragonsById={dragonsById}
      />,
    );
    const selected = relationship.candidateTraces.find(
      (trace) => trace.candidate.id === relationship.selectedCandidateId,
    )!;
    const selectedLabels = screen.getAllByText(/Selected signals:/)[0]!;
    expect(selectedLabels).toHaveTextContent('Instill Fear');
    expect(selectedLabels).toHaveTextContent('Breath of Fire');
    expect(screen.getByText(/Use probabilities are not added or averaged/))
      .toBeInTheDocument();

    const retainedSummary = screen.getByText(
      `Retained alternatives (${relationship.candidateTraces.length})`,
    );
    await userEvent.setup().click(retainedSummary);
    const list = within(retainedSummary.closest('details')!).getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(
      relationship.candidateTraces.length,
    );
    expect(list).toHaveTextContent('Selected');
    expect(list).toHaveTextContent('adjusted value');

    for (const rawSignal of screen.getAllByText(
      new RegExp(selected.provider.signalId),
    )) {
      expect(rawSignal.closest('details')?.querySelector('summary'))
        .toHaveTextContent('Technical trace');
    }
  });
});

function relationshipFixture() {
  const formation: SimpleFormation = {
    'left-flank': 'daemoros',
    vanguard: 'shadowsong',
    'right-flank': 'caraxes',
  };
  const dragonIds = ['daemoros', 'shadowsong', 'caraxes'] as const;
  const progression: SimpleProgressionByDragonId = Object.fromEntries(
    dragonIds.map((dragonId) => [
      dragonId,
      { starRank: 10, dragonLevel: 16 },
    ]),
  );
  const reliabilityProgression: ReliabilityProgressionByDragonId = Object.fromEntries(
    dragonIds.map((dragonId) => {
      const dragon = dragonsById.get(dragonId)!;
      const owned: OwnedDragon = {
        dragonId,
        owned: true,
        starRank: 10,
        reignLevel: 16,
        notes: '',
        habitLevels: Object.fromEntries(dragon.habits.map((habit) => [habit.id, 5])),
      };
      return [dragonId, reliabilityProgressionFromOwnedDragon(dragon, owned)];
    }),
  );
  const relationship = rateFormationV3({
    formation,
    dragons,
    profiles: simpleSynergyProfiles,
    progression,
    reliabilityProgression,
  }).relationships.find(
    (relationship) =>
      relationship.providerDragonId === 'daemoros' &&
      relationship.beneficiaryDragonId === 'shadowsong' &&
      relationship.semanticTag === 'status:panic',
  )!;
  const selected = relationship.candidateTraces[0]!;
  return {
    ...relationship,
    candidateTraces: [
      selected,
      {
        ...structuredClone(selected),
        candidate: {
          ...structuredClone(selected.candidate),
          id: `${selected.candidate.id}:retained`,
        },
        selectionReason:
          'Retained as an evaluated alternative; deterministic ordering selected another candidate.',
      },
    ],
  };
}
