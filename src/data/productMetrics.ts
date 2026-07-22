import { dragons } from './dragons';
import { simpleSynergyAbilityReviews } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';

const dragonCount = dragons.length;

export const productMetrics = {
  dragonCount,
  detailedDragonCount: dragons.filter((dragon) => Boolean(dragon.command && dragon.trait && dragon.habits.length > 0)).length,
  reviewedAbilityCount: simpleSynergyAbilityReviews.length,
  curatedProfileCount: simpleSynergyProfiles.length,
  curatedScoringSignalCount: simpleSynergyProfiles.reduce(
    (count, profile) => count + profile.outputs.length + profile.supports.length + profile.benefitsFrom.length,
    0,
  ),
  orderedFormationPlacementCount: dragonCount * (dragonCount - 1) * (dragonCount - 2),
  optimizerCandidateCount: dragonCount * (dragonCount - 1) * (dragonCount - 2) / 6,
} as const;
