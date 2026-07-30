import { buildFormationSignalChips } from '../app/formationCardPresentation';
import type { Dragon, FormationPosition, OwnedDragon } from '../models/dragon';
import { buildFormationFindings } from '../services/formationFindings';
import type { FormationArrangement } from '../services/formationArrangement';
import {
  buildPlacementComparisonV3,
  compareFormationPlacementsV3,
} from '../services/formationPlacementComparisonV3';
import { rateFormationV3 } from '../services/formationRatingV3';
import { buildFormationRecommendationV3 } from '../services/formationRecommendationV3';
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
import type { EstimatedDragonPower } from '../power/estimatedDragonPower';
import { candidatePowerUnits } from './rosterOptimizerPower';
import { buildSemanticRelationships } from '../synergy/semanticRelationships';
import { reliabilityProgressionFromOwnedDragon } from '../synergy/reliability';
import type {
  DragonSynergyProfile,
  SimpleProgressionByDragonId,
} from '../synergy/types';
import {
  ROSTER_OPTIMIZER_RATING_CONTRACT,
  ROSTER_OPTIMIZER_CONTRACT_VERSION,
  OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
  RosterOptimizerCancelledError,
  type OptimizerFormationCandidate,
  type OptimizerAllocationMode,
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
      const reliabilityProgression = reliabilityProgressionFromOwnedDragon(
        dragon,
        roster[dragon.id],
      );
      return {
        dragonId: dragon.id,
        rarity: dragon.rarity,
        starRank: progression.starRank ?? null,
        dragonLevel: progression.dragonLevel ?? null,
        activeHabitLevels: reliabilityProgression.activeHabitLevels,
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
        Object.entries(dragon.activeHabitLevels ?? {}).sort(([left], [right]) =>
          left.localeCompare(right),
        ),
      ]),
  });
  return stableHash(canonical);
}

export function createRosterOptimizerRequestFingerprint(
  snapshot: OptimizerRosterDragon[],
  allocationMode: OptimizerAllocationMode | RosterOptimizerStrategy,
  formationCount = 10,
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
  return stableHash(JSON.stringify({
    contractVersion: ROSTER_OPTIMIZER_CONTRACT_VERSION,
    ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
    relationshipValueScale: OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE,
    allocationMode,
    formationCount,
    rosterFingerprint: createRosterOptimizerFingerprint(snapshot),
    estimatedPowerVersion: estimatedPowerContract.version,
    estimatedPowerModelHash: estimatedPowerContract.modelHash,
    estimatedPowerObservationHash: estimatedPowerContract.observationHash,
  }));
}

export function generateOptimizerFormationCandidates({
  dragons,
  profiles,
  snapshot,
  estimatesByDragonId,
  shouldCancel,
}: {
  dragons: Dragon[];
  profiles: DragonSynergyProfile[];
  snapshot: OptimizerRosterDragon[];
  estimatesByDragonId?: ReadonlyMap<string, EstimatedDragonPower>;
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
  const reliabilityProgression = Object.fromEntries(
    sortedSnapshot.map((dragon) => [
      dragon.dragonId,
      {
        starRank: dragon.starRank,
        dragonLevel: dragon.dragonLevel,
        activeHabitLevels: dragon.activeHabitLevels ?? {},
      },
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
        const initialComparison = compareFormationPlacementsV3({
          formation: initialArrangement,
          progression,
          reliabilityProgression,
          profiles,
        });
        if (!initialComparison) continue;
        const bestArrangement = initialComparison.best.arrangement;
        const comparison = buildPlacementComparisonV3(
          bestArrangement,
          initialComparison.candidates,
        );
        if (!comparison) continue;
        const rating = rateFormationV3({
          formation: bestArrangement,
          dragons,
          profiles,
          progression,
          reliabilityProgression,
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
        const recommendation = buildFormationRecommendationV3({
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
        const placementScore = rating.placementScore;
        if (placementScore !== 20) {
          throw new Error(
            `Optimizer candidate ${dragonIds.join('/')} did not retain a best placement.`,
          );
        }
        const activeSynergyScore = rating.activeSynergy.score;
        const dragonMask = dragonIds.reduce(
          (mask, dragonId) => mask | (1n << BigInt(indexByDragonId.get(dragonId)!)),
          0n,
        );
        candidates.push({
          ratingContract: ROSTER_OPTIMIZER_RATING_CONTRACT,
          stableCandidateKey: stableCandidateKey(dragonIds, bestArrangement),
          dragonIds,
          dragonMask,
          arrangement: bestArrangement,
          tiedBestArrangements: comparison.tiedBestArrangements,
          rating: rating.score,
          tier: rating.tier,
          activeSynergyScore,
          placementScore,
          adjustedRelationshipValue: rating.adjustedUncappedRelationshipValue,
          adjustedRelationshipValueUnits: optimizerRelationshipValueUnits(
            rating.adjustedUncappedRelationshipValue,
          ),
          activeRelationshipCount: rating.activeRelationshipCount,
          quantifiedRelationshipCount: rating.quantifiedRelationshipCount,
          unquantifiedRelationshipCount: rating.unquantifiedRelationshipCount,
          unquantifiedBasePotential: rating.unquantifiedBasePotential,
          reliabilityCoverage: rating.reliabilityCoverage,
          participatingDragonCount: rating.participatingDragonIds.length,
          relationships: rating.relationships,
          strengths: findings.keyStrengths,
          gaps: findings.keyGaps,
          progressionSnapshot: Object.fromEntries(
            dragonIds.map((dragonId) => [
              dragonId,
              {
                ...(progression[dragonId] ?? {}),
                activeHabitLevels:
                  reliabilityProgression[dragonId]?.activeHabitLevels ?? {},
              },
            ]),
          ),
          estimatedPowerUnits: estimatesByDragonId
            ? candidatePowerUnits({ dragonIds }, estimatesByDragonId)
            : undefined,
        });
      }
    }
  }
  return candidates.sort((left, right) =>
    left.stableCandidateKey.localeCompare(right.stableCandidateKey),
  );
}

export function optimizerRelationshipValueUnits(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError('Optimizer v3 relationship value must be finite and nonnegative.');
  }
  const units = Math.round(value * OPTIMIZER_V3_RELATIONSHIP_VALUE_SCALE);
  if (!Number.isSafeInteger(units)) {
    throw new RangeError('Optimizer v3 relationship units exceed safe-integer bounds.');
  }
  return units;
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
