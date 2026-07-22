import { buildFormationSignalChips } from '../app/formationCardPresentation';
import type { Dragon, FormationPosition, OwnedDragon } from '../models/dragon';
import { buildFormationFindings } from '../services/formationFindings';
import {
  buildPlacementComparison,
  compareFormationPlacements,
  type FormationArrangement,
} from '../services/formationPlacementComparison';
import { rateFormation } from '../services/formationRating';
import { buildFormationRecommendation } from '../services/formationRecommendation';
import {
  currentRosterProgression,
  eligibleRosterDragons,
} from '../services/rosterEligibility';
import { evaluateFormation } from '../synergy/evaluateFormation';
import {
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../power/generatedDragonPowerModel';
import { buildSemanticRelationships, relationshipValue } from '../synergy/semanticRelationships';
import type {
  DragonSynergyProfile,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerRosterDragon,
  type RosterOptimizerStrategy,
} from './rosterOptimizerTypes';

const positions: FormationPosition[] = ['left-flank', 'vanguard', 'right-flank'];

export function buildOptimizerRosterSnapshot(
  dragons: Dragon[],
  roster: Record<string, OwnedDragon>,
): OptimizerRosterDragon[] {
  return eligibleRosterDragons(dragons, roster)
    .map((dragon) => {
      const progression = currentRosterProgression(roster[dragon.id]);
      return {
        dragonId: dragon.id,
        rarity: dragon.rarity,
        starRank: progression.starRank ?? null,
        dragonLevel: progression.dragonLevel ?? null,
      };
    })
    .sort((left, right) => left.dragonId.localeCompare(right.dragonId));
}

export function createRosterOptimizerFingerprint(
  snapshot: OptimizerRosterDragon[],
): string {
  const canonical = JSON.stringify({
    ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
    dragons: [...snapshot]
      .sort((left, right) => left.dragonId.localeCompare(right.dragonId))
      .map((dragon) => [
        dragon.dragonId,
        dragon.rarity,
        dragon.starRank,
        dragon.dragonLevel,
      ]),
  });
  return stableHash(canonical);
}

export function createRosterOptimizerRequestFingerprint(
  snapshot: OptimizerRosterDragon[],
  strategy: RosterOptimizerStrategy,
  estimatedPowerContract: {
    version: string;
    modelHash: string;
    observationHash: string;
  } = {
    version: ESTIMATED_POWER_MODEL_VERSION,
    modelHash: ESTIMATED_POWER_MODEL_HASH,
    observationHash: ESTIMATED_POWER_OBSERVATION_HASH,
  },
): string {
  const powerAwareContract = strategy === 'power-aware-primary-five-backup-five'
    ? {
        estimatedPowerVersion: estimatedPowerContract.version,
        estimatedPowerModelHash: estimatedPowerContract.modelHash,
        estimatedPowerObservationHash: estimatedPowerContract.observationHash,
      }
    : {};
  return stableHash(JSON.stringify({
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
    strategy,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    ...powerAwareContract,
  }));
}

export function generateOptimizerFormationCandidates({
  dragons,
  profiles,
  snapshot,
  shouldCancel,
}: {
  dragons: Dragon[];
  profiles: DragonSynergyProfile[];
  snapshot: OptimizerRosterDragon[];
  shouldCancel?: () => boolean;
}): OptimizerFormationCandidate[] {
  const sortedSnapshot = [...snapshot].sort((left, right) =>
    left.dragonId.localeCompare(right.dragonId),
  );
  const indexByDragonId = new Map(
    sortedSnapshot.map((dragon, index) => [dragon.dragonId, index]),
  );
  const profilesById = new Map(profiles.map((profile) => [profile.dragonId, profile]));
  const dragonNamesById = new Map(dragons.map((dragon) => [dragon.id, dragon.name]));
  const progression: SimpleProgressionByDragonId = Object.fromEntries(
    sortedSnapshot.map((dragon) => [
      dragon.dragonId,
      { starRank: dragon.starRank, dragonLevel: dragon.dragonLevel },
    ]),
  );
  const candidates: OptimizerFormationCandidate[] = [];
  let generated = 0;

  for (let first = 0; first < sortedSnapshot.length - 2; first += 1) {
    for (let second = first + 1; second < sortedSnapshot.length - 1; second += 1) {
      for (let third = second + 1; third < sortedSnapshot.length; third += 1) {
        generated += 1;
        if ((generated & 63) === 0 && shouldCancel?.()) {
          throw new RosterOptimizerCancelledError();
        }
        const dragonIds = [
          sortedSnapshot[first]!.dragonId,
          sortedSnapshot[second]!.dragonId,
          sortedSnapshot[third]!.dragonId,
        ] as [string, string, string];
        const initialArrangement = arrangementOf(dragonIds);
        const initialComparison = compareFormationPlacements({
          formation: initialArrangement,
          progression,
          profiles,
        });
        if (!initialComparison) continue;
        const bestArrangement = initialComparison.best.arrangement;
        const comparison = buildPlacementComparison(
          bestArrangement,
          initialComparison.candidates,
        );
        if (!comparison) continue;
        const relationships = comparison.current.relationships;
        const rating = rateFormation({
          formation: bestArrangement,
          dragons,
          profiles,
          relationships,
          placementComparison: comparison,
        });
        if (rating.score === null) continue;
        const results = evaluateFormation({
          formation: bestArrangement,
          progression,
          profiles,
        }).results;
        const canonicalRelationships = buildSemanticRelationships(results, profiles);
        const signalChipsByDragonId = Object.fromEntries(
          positions.map((position) => {
            const dragonId = bestArrangement[position];
            return [
              dragonId,
              buildFormationSignalChips({
                profile: profilesById.get(dragonId),
                position,
                formation: bestArrangement,
                profiles,
                progression,
              }),
            ];
          }),
        );
        const recommendation = buildFormationRecommendation({
          comparison,
          progression,
          dragonNamesById,
          confidence: rating.confidence.status,
        });
        const findings = buildFormationFindings({
          formation: bestArrangement,
          progression,
          profiles,
          results,
          relationships: canonicalRelationships,
          signalChipsByDragonId,
          recommendation,
          rating,
        });
        const placementScore = rating.breakdown.find(
          (item) => item.label === 'Placement Effectiveness',
        )?.score ?? 0;
        if (placementScore !== 20) {
          throw new Error(
            `Optimizer candidate ${dragonIds.join('/')} did not retain a best placement.`,
          );
        }
        const activeSynergyScore = rating.breakdown.find(
          (item) => item.label === 'Active Synergy',
        )?.score ?? 0;
        const dragonMask = dragonIds.reduce(
          (mask, dragonId) => mask | (1n << BigInt(indexByDragonId.get(dragonId)!)),
          0n,
        );
        candidates.push({
          stableCandidateKey: stableCandidateKey(dragonIds, bestArrangement),
          dragonIds,
          dragonMask,
          arrangement: bestArrangement,
          tiedBestArrangements: comparison.tiedBestArrangements,
          rating: rating.score,
          tier: rating.tier,
          activeSynergyScore,
          placementScore,
          activeRelationshipValue: relationshipValue(canonicalRelationships),
          activeRelationshipCount: rating.activeRelationshipCount,
          participatingDragonCount: rating.participatingDragonCount,
          relationships: canonicalRelationships,
          strengths: findings.keyStrengths,
          gaps: findings.keyGaps,
          progressionSnapshot: Object.fromEntries(
            dragonIds.map((dragonId) => [dragonId, progression[dragonId] ?? {}]),
          ),
        });
      }
    }
  }
  return candidates.sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
}

export function stableCandidateKey(
  dragonIds: [string, string, string],
  arrangement: FormationArrangement,
): string {
  return `${[...dragonIds].sort().join('+')}@${positions
    .map((position) => `${position}:${arrangement[position]}`)
    .join('|')}`;
}

export function stableHash(value: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return `fnv1a64:${hash.toString(16).padStart(16, '0')}`;
}

function arrangementOf(
  dragonIds: [string, string, string],
): FormationArrangement {
  return {
    'left-flank': dragonIds[0],
    vanguard: dragonIds[1],
    'right-flank': dragonIds[2],
  };
}
