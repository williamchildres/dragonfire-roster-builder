import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RosterOptimizer } from '../app/RosterOptimizer';
import { dragons } from '../data/dragons';
import {
  buildOptimizerRosterSnapshot,
  createRosterOptimizerFingerprint,
} from '../optimizer/rosterOptimizerCandidates';
import type { RosterOptimizerRunner } from '../optimizer/rosterOptimizerClient';
import type {
  OptimizedFormation,
  RarityCountRecord,
  RosterOptimizationResult,
  RosterOptimizerResponse,
} from '../optimizer/rosterOptimizerTypes';
import type { FormationArrangement } from '../services/formationPlacementComparison';
import { createEmptyRoster } from '../services/rosterStorage';

describe('Roster Optimizer workspace', () => {
  it('explains the shortfall and routes back to My Roster below 30 eligible dragons', async () => {
    const onOpenRoster = vi.fn();
    renderOptimizer({ roster: ownedRoster(29), onOpenRoster });
    expect(screen.getByText(/more eligible dragons to build 10 complete formations/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Find My Best 10 Formations' })).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: /go to my roster/i }));
    expect(onOpenRoster).toHaveBeenCalledOnce();
  });

  it('shows responsive running and cancellation states without a fake percentage', async () => {
    const cancel = vi.fn();
    const runner: RosterOptimizerRunner = {
      run: vi.fn(() => new Promise<RosterOptimizerResponse>(() => undefined)),
      cancel,
      dispose: vi.fn(),
    };
    renderOptimizer({ roster: ownedRoster(30), runner });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    expect(screen.getAllByText(/finding the exact best complete allocation/i)).toHaveLength(2);
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }));
    expect(cancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument();
  });

  it('renders ten unique result cards, a neutral unused Rare, summary, and technical disclosure', async () => {
    const roster = ownedRoster(31);
    const result = makeResult(roster, 'arulix');
    const runner = resolvedRunner(result);
    renderOptimizer({ roster, runner });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    expect(await screen.findByRole('heading', { name: 'Exact optimal result' })).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(10);
    expect(screen.getByText(/not used in this optimal rarity-prioritized/i)).toBeInTheDocument();
    expect(screen.getByText(/Arulix/).closest('li')).toHaveTextContent(/Rare/);
    expect(screen.getByText('Proven optimal')).toBeInTheDocument();
    expect(screen.getByText('4,495')).toBeInTheDocument();
    const displayedDragonNames = screen.getAllByRole('article').flatMap((card) =>
      within(card).getAllByRole('definition').map((node) => node.querySelector('strong')?.textContent),
    );
    expect(new Set(displayedDragonNames).size).toBe(30);
  });

  it('opens the exact arrangement in Formation Builder', async () => {
    const roster = ownedRoster(30);
    const result = makeResult(roster);
    const onOpenFormation = vi.fn();
    renderOptimizer({ roster, runner: resolvedRunner(result), onOpenFormation });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    const firstCard = (await screen.findAllByRole('article'))[0]!;
    await userEvent.setup().click(within(firstCard).getByRole('button', { name: /open in formation builder/i }));
    expect(onOpenFormation).toHaveBeenCalledWith(result.formations[0]!.arrangement);
  });

  it('marks ownership, Star Rank, and Dragon Level changes stale but ignores Habit Level changes', async () => {
    const roster = ownedRoster(30);
    const result = makeResult(roster);
    const view = renderOptimizer({ roster, runner: resolvedRunner(result) });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    await screen.findByRole('heading', { name: 'Exact optimal result' });

    const habitOnly = structuredClone(roster);
    const firstId = result.usedDragonIds[0]!;
    habitOnly[firstId]!.habitLevels = { arbitrary: 5 };
    view.rerender(component(habitOnly, resolvedRunner(result)));
    expect(screen.queryByText(/ranking-relevant progression changed/i)).not.toBeInTheDocument();

    const changedStar = structuredClone(habitOnly);
    changedStar[firstId]!.starRank = 9;
    view.rerender(component(changedStar, resolvedRunner(result)));
    expect(screen.getByText(/ranking-relevant progression changed/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /open in formation builder/i })[0]).toBeDisabled();
  });

  it('announces worker failures and allows a rerun', async () => {
    const runner: RosterOptimizerRunner = {
      run: vi.fn().mockRejectedValueOnce(new Error('Worker failed.')).mockResolvedValueOnce(makeResult(ownedRoster(30))),
      cancel: vi.fn(),
      dispose: vi.fn(),
    };
    renderOptimizer({ roster: ownedRoster(30), runner });
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Worker failed.');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Find My Best 10 Formations' }));
    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(10));
  });
});

function renderOptimizer({
  roster,
  runner = resolvedRunner(makeResult(roster)),
  onOpenFormation = vi.fn(),
  onOpenRoster = vi.fn(),
}: {
  roster: ReturnType<typeof ownedRoster>;
  runner?: RosterOptimizerRunner;
  onOpenFormation?: (arrangement: FormationArrangement) => void;
  onOpenRoster?: () => void;
}) {
  return render(
    <RosterOptimizer
      allDragons={dragons}
      roster={roster}
      runner={runner}
      onOpenFormation={onOpenFormation}
      onOpenRoster={onOpenRoster}
    />,
  );
}

function component(roster: ReturnType<typeof ownedRoster>, runner: RosterOptimizerRunner) {
  return (
    <RosterOptimizer
      allDragons={dragons}
      roster={roster}
      runner={runner}
      onOpenFormation={vi.fn()}
      onOpenRoster={vi.fn()}
    />
  );
}

function ownedRoster(count: number) {
  const roster = createEmptyRoster(dragons);
  dragons.slice(0, count).forEach((dragon) => {
    roster[dragon.id] = {
      ...roster[dragon.id]!,
      owned: true,
      starRank: 10,
      reignLevel: 16,
    };
  });
  return roster;
}

function resolvedRunner(result: RosterOptimizationResult): RosterOptimizerRunner {
  return {
    run: vi.fn().mockResolvedValue(result),
    cancel: vi.fn(),
    dispose: vi.fn(),
  };
}

function makeResult(
  roster: ReturnType<typeof ownedRoster>,
  unusedDragonId?: string,
): RosterOptimizationResult {
  const snapshot = buildOptimizerRosterSnapshot(dragons, roster);
  const selected = snapshot
    .filter((dragon) => dragon.dragonId !== unusedDragonId)
    .slice(0, 30);
  const formations: OptimizedFormation[] = Array.from({ length: 10 }, (_, index) => {
    const trio = selected.slice(index * 3, index * 3 + 3);
    const dragonIds = trio.map((dragon) => dragon.dragonId) as [string, string, string];
    const arrangement = { 'left-flank': dragonIds[0], vanguard: dragonIds[1], 'right-flank': dragonIds[2] };
    return {
      rank: index + 1,
      stableCandidateKey: dragonIds.join('+'),
      dragonIds,
      arrangement,
      tiedBestArrangements: [arrangement],
      rating: 80 - index,
      tier: 'Strong',
      activeSynergyScore: 60 - index,
      placementScore: 20,
      activeRelationshipValue: 20 - index,
      activeRelationshipCount: 3,
      participatingDragonCount: 3,
      relationships: [],
      strengths: [],
      gaps: [],
      progressionSnapshot: Object.fromEntries(trio.map((dragon) => [dragon.dragonId, { starRank: dragon.starRank, dragonLevel: dragon.dragonLevel }])),
    };
  });
  const usedDragonIds = selected.map((dragon) => dragon.dragonId).sort();
  const unusedDragonIds = snapshot.map((dragon) => dragon.dragonId).filter((id) => !usedDragonIds.includes(id));
  const usedRarityCounts = countRarities(selected.map((dragon) => dragon.rarity));
  const unusedRarityCounts = countRarities(snapshot.filter((dragon) => unusedDragonIds.includes(dragon.dragonId)).map((dragon) => dragon.rarity));
  const ratings = formations.map((formation) => formation.rating).sort((a, b) => a - b);
  return {
    contractVersion: 1,
    optimal: true,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    formations,
    usedDragonIds,
    unusedDragonIds,
    usedRarityCounts,
    unusedRarityCounts,
    objective: {
      rarityPriority: {
        legendaryCount: usedRarityCounts.Legendary,
        epicCount: usedRarityCounts.Epic,
        rareCount: usedRarityCounts.Rare,
      },
      totalRating: ratings.reduce((total, rating) => total + rating, 0),
      minimumRating: ratings[0]!,
      ascendingRatingVector: ratings,
      totalRelationshipValue: 155,
      totalActiveRelationships: 30,
      stableSolutionKey: formations.map((formation) => formation.stableCandidateKey).join('||'),
    },
    averageRating: ratings.reduce((total, rating) => total + rating, 0) / 10,
    minimumRating: ratings[0]!,
    tierDistribution: { Excellent: 1, Strong: 9, Solid: 0, Developing: 0, Weak: 0, Incomplete: 0 },
    diagnostics: {
      optimal: true,
      eligibleDragonCount: snapshot.length,
      candidateCount: snapshot.length === 31 ? 4495 : 4060,
      selectedFormationCount: 10,
      nodesVisited: 13,
      branchesPruned: 0,
      cacheEntries: 0,
      solverPasses: 15,
      candidateGenerationMs: 2500,
      solverMs: 4500,
      totalMs: 7000,
    },
    optimizerResultHash: 'fnv1a64:test-result',
  };
}

function countRarities(rarities: string[]): RarityCountRecord {
  const counts: RarityCountRecord = { Legendary: 0, Epic: 0, Rare: 0 };
  rarities.forEach((rarity) => { counts[rarity as keyof RarityCountRecord] += 1; });
  return counts;
}
