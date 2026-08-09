import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';

const rosterPath = required('--roster');
const outputPath = value('--output');
const root = path.resolve(value('--root') ?? process.cwd());
const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  logLevel: 'error',
});

try {
  const [data, profilesModule, storage, candidatesModule, powerModule, solverModule, optimizerModule, placementModule, ratingModule] = await Promise.all([
    server.ssrLoadModule('/src/data/dragons.ts'),
    server.ssrLoadModule('/src/synergy/profiles.ts'),
    server.ssrLoadModule('/src/services/rosterStorage.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerCandidates.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerPower.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerBestOverallSolver.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizer.ts'),
    server.ssrLoadModule('/src/services/formationPlacementComparisonV3.ts'),
    server.ssrLoadModule('/src/services/formationRatingV3.ts'),
  ]);
  const { dragons } = data;
  const { simpleSynergyProfiles } = profilesModule;
  const imported = storage.validateRosterImport(await readFile(rosterPath, 'utf8'), dragons);
  if (!imported.ok || !imported.roster) throw new Error(imported.errors.join('; '));
  const snapshot = candidatesModule.buildOptimizerRosterSnapshot(dragons, imported.roster);
  const estimatesByDragonId = powerModule.buildEstimatedPowerCache(snapshot);
  const candidates = candidatesModule.generateOptimizerFormationCandidates({
    dragons,
    profiles: simpleSynergyProfiles,
    snapshot,
    estimatesByDragonId,
  });
  const globalMaximumPowerUnits = Math.max(...candidates.map(requiredPowerUnits));
  const ranked = rank(candidates, solverModule, globalMaximumPowerUnits);
  const solver = solverModule.solveBestOverallFirst(candidates, 10);
  const result = optimizerModule.buildFlexibleResult({
    allocationMode: 'best-overall-first',
    formationCount: 10,
    solver,
    snapshot,
    estimatesByDragonId,
    rosterFingerprint: candidatesModule.createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: candidatesModule.createRosterOptimizerRequestFingerprint(snapshot, 'best-overall-first', 10),
    candidateCount: candidates.length,
    candidateGenerationMs: 0,
    solverMs: 0,
    totalMs: 0,
  });
  const burnProviders = simpleSynergyProfiles
    .flatMap((profile) => profile.outputs
      .filter((signal) => (signal.tags ?? [signal.tag]).includes('status:burn'))
      .map((signal) => ({ profile, signal })))
    .filter(({ profile, signal }) => activeSignal(signal, imported.roster[profile.dragonId]))
    .sort((left, right) => left.profile.dragonId.localeCompare(right.profile.dragonId));
  const providerCandidates = burnProviders.map(({ profile, signal }) => {
    const pairRanked = ranked.filter(({ candidate }) =>
      candidate.dragonIds.includes('vhagar') && candidate.dragonIds.includes(profile.dragonId));
    const best = pairRanked[0];
    if (!best) throw new Error(`No Vhagar candidate for ${profile.dragonId}.`);
    const progression = Object.fromEntries(best.candidate.dragonIds.map((dragonId) => [
      dragonId,
      {
        starRank: best.candidate.progressionSnapshot[dragonId]?.starRank,
        dragonLevel: best.candidate.progressionSnapshot[dragonId]?.dragonLevel,
      },
    ]));
    const reliabilityProgression = Object.fromEntries(best.candidate.dragonIds.map((dragonId) => [
      dragonId,
      best.candidate.progressionSnapshot[dragonId],
    ]));
    const comparison = placementModule.compareFormationPlacementsV3({
      formation: best.candidate.arrangement,
      progression,
      reliabilityProgression,
      profiles: simpleSynergyProfiles,
    });
    if (!comparison) throw new Error(`No placement comparison for ${best.candidate.stableCandidateKey}.`);
    return {
      providerDragonId: profile.dragonId,
      providerSignalId: signal.id,
      bestThirdDragonId: best.candidate.dragonIds.find((dragonId) =>
        dragonId !== 'vhagar' && dragonId !== profile.dragonId),
      rank: best.rank,
      ...compactCandidate(best.candidate, best.score),
      burnContribution: burnContribution(best.candidate, profile.dragonId),
      allSixArrangements: comparison.candidates.map((placement) => {
        const active = ratingModule.scoreActiveSynergyV3(placement.relationships);
        const rating = active.score + placement.placementScore;
        const score = weightedScore(
          requiredPowerUnits(best.candidate),
          rating,
          globalMaximumPowerUnits,
          60,
          solverModule,
        );
        return {
          arrangement: placement.arrangement,
          rating,
          activeSynergy: active.score,
          placement: placement.placementScore,
          adjustedRelationshipValue: round(placement.adjustedUncappedRelationshipValue),
          activeRelationshipCount: placement.relationships.filter((relationship) => relationship.adjustedMarginalValue > 0).length,
          overallScore: score,
          burnContribution: burnContribution({ relationships: placement.relationships }, profile.dragonId),
          unquantifiedBasePotential: placement.unquantifiedBasePotential,
        };
      }),
    };
  });
  const baseline = ranked.find(({ candidate }) => candidate.stableCandidateKey === solver.selectedCandidates[0]?.stableCandidateKey);
  if (!baseline) throw new Error('Selected Army 1 is missing from ranking.');
  providerCandidates.sort((left, right) => left.rank - right.rank);
  const bestBurnSorted = providerCandidates[0];
  const bestQuantifiedBurn = providerCandidates.find(
    (candidate) => candidate.burnContribution?.quantification.status === 'quantified',
  ) ?? null;
  const magnitudeMultipliers = [1, 1.25, 1.5, 2];
  const magnitudeShadow = bestQuantifiedBurn
    ? magnitudeMultipliers.map((multiplier) =>
        shadowMagnitude(bestQuantifiedBurn, multiplier, globalMaximumPowerUnits, solverModule))
    : [];
  const required = requiredAdditionalRelationshipValue(
    bestBurnSorted,
    baseline.score.overallScore,
    globalMaximumPowerUnits,
    solverModule,
  );
  const quantifiedRequired = bestQuantifiedBurn
    ? requiredAdditionalRelationshipValue(
        bestQuantifiedBurn,
        baseline.score.overallScore,
        globalMaximumPowerUnits,
        solverModule,
      )
    : null;
  const nearbyPowerWeights = [];
  for (let powerWeight = 55; powerWeight <= 65; powerWeight += 1) {
    nearbyPowerWeights.push({
      powerWeight,
      baselineScore: weightedScore(requiredPowerUnits(baseline.candidate), baseline.candidate.rating, globalMaximumPowerUnits, powerWeight, solverModule),
      bestBurnScore: weightedScore(bestBurnSorted.estimatedPower / 10, bestBurnSorted.rating, globalMaximumPowerUnits, powerWeight, solverModule),
      requiredRatingToTie: requiredRatingToTie(
        bestBurnSorted.estimatedPower / 10,
        weightedScore(requiredPowerUnits(baseline.candidate), baseline.candidate.rating, globalMaximumPowerUnits, powerWeight, solverModule),
        globalMaximumPowerUnits,
        powerWeight,
        solverModule,
      ),
    });
  }
  const report = {
    contract: 'vhagar-burn-sensitivity-v1',
    requestFingerprint: result.requestFingerprint,
    solutionHash: result.optimizerSolutionHash,
    resultHash: result.optimizerResultHash,
    candidateIdentity: candidatesModule.stableHash(JSON.stringify(candidates.map((candidate) => [
      candidate.stableCandidateKey,
      candidate.rating,
      candidate.adjustedRelationshipValueUnits,
      candidate.activeRelationshipCount,
      candidate.estimatedPowerUnits,
    ]))),
    selectedArmy1: { rank: baseline.rank, ...compactCandidate(baseline.candidate, baseline.score) },
    activeBurnProviderIds: burnProviders.map(({ profile }) => profile.dragonId),
    providerCandidates,
    bestVhagarBurnCandidate: bestBurnSorted,
    bestQuantifiedVhagarBurnCandidate: bestQuantifiedBurn,
    selectedArmy1Beaten: bestBurnSorted.overallScore > baseline.score.overallScore,
    scoreGap: round(baseline.score.overallScore - bestBurnSorted.overallScore),
    ratingGap: baseline.candidate.rating - bestBurnSorted.rating,
    powerGap: requiredPowerUnits(baseline.candidate) * 10 - bestBurnSorted.estimatedPower,
    requiredAdditionalRelationshipValue: required,
    quantifiedCandidateRequiredAdditionalRelationshipValue: quantifiedRequired,
    fullProviderReliabilityShadow: bestQuantifiedBurn
      ? shadowRelationshipValue(
          bestQuantifiedBurn,
          bestQuantifiedBurn.burnContribution.baseValue,
          globalMaximumPowerUnits,
          solverModule,
        )
      : null,
    relationshipTradeoff: relationshipTradeoff(baseline.candidate, bestBurnSorted),
    magnitudeShadow,
    nearbyPowerWeights,
    top30Army1Candidates: ranked.slice(0, 30).map(({ candidate, score, rank }) => ({
      rank,
      ...compactCandidate(candidate, score),
      burnContributions: candidate.relationships
        .filter((relationship) => relationship.beneficiaryDragonId === 'vhagar' && relationship.semanticTag === 'status:burn')
        .map((relationship) => ({ providerDragonId: relationship.providerDragonId, ...compactRelationship(relationship) })),
    })),
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, serialized, 'utf8');
  process.stdout.write(serialized);
} finally {
  await server.close();
}

function rank(candidates, solverModule, maximumPowerUnits) {
  return candidates
    .map((candidate) => ({ candidate, score: solverModule.bestOverallScoreBreakdown(candidate, maximumPowerUnits) }))
    .sort((left, right) => solverModule.compareBestOverallCandidates(left.candidate, left.score, right.candidate, right.score))
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function compactCandidate(candidate, score) {
  return {
    stableCandidateKey: candidate.stableCandidateKey,
    dragonIds: candidate.dragonIds,
    arrangement: candidate.arrangement,
    estimatedPower: requiredPowerUnits(candidate) * 10,
    rating: candidate.rating,
    activeSynergy: candidate.activeSynergyScore,
    placement: candidate.placementScore,
    adjustedRelationshipValue: candidate.adjustedRelationshipValue,
    activeRelationshipCount: candidate.activeRelationshipCount,
    quantifiedRelationshipCount: candidate.quantifiedRelationshipCount,
    unquantifiedRelationshipCount: candidate.unquantifiedRelationshipCount,
    unquantifiedBasePotential: candidate.unquantifiedBasePotential,
    overallScore: score.overallScore,
    relationships: candidate.relationships.map(compactRelationship),
  };
}

function compactRelationship(relationship) {
  return {
    id: relationship.id,
    relationshipClass: relationship.relationshipClass,
    providerDragonId: relationship.providerDragonId,
    beneficiaryDragonId: relationship.beneficiaryDragonId,
    baseValue: relationship.baseValue,
    adjustedMarginalValue: relationship.adjustedMarginalValue,
    quantification: relationship.quantification,
    componentIds: relationship.componentIds,
    probabilityVariantIds: relationship.probabilityVariantIds,
  };
}

function burnContribution(candidate, providerDragonId) {
  const relationship = candidate.relationships.find((entry) =>
    entry.providerDragonId === providerDragonId && entry.beneficiaryDragonId === 'vhagar' && entry.semanticTag === 'status:burn');
  return relationship ? compactRelationship(relationship) : null;
}

function shadowMagnitude(candidate, multiplier, maximumPowerUnits, solverModule) {
  const contribution = candidate.burnContribution;
  if (!contribution || contribution.quantification.status !== 'quantified') {
    return { multiplier, quantified: false, relationshipValue: 0, rating: candidate.rating, overallScore: candidate.overallScore };
  }
  const relationshipValue = contribution.adjustedMarginalValue * multiplier;
  const extra = relationshipValue - contribution.adjustedMarginalValue;
  const activeSynergy = activeSynergyWithBurnValue(candidate, relationshipValue);
  const rating = activeSynergy + candidate.placement;
  return {
    multiplier,
    quantified: true,
    relationshipValue: round(contribution.adjustedMarginalValue * multiplier),
    additionalRelationshipValue: round(extra),
    rating,
    overallScore: weightedScore(candidate.estimatedPower / 10, rating, maximumPowerUnits, 60, solverModule),
  };
}

function shadowRelationshipValue(candidate, relationshipValue, maximumPowerUnits, solverModule) {
  const activeSynergy = activeSynergyWithBurnValue(candidate, relationshipValue);
  const rating = activeSynergy + candidate.placement;
  return {
    relationshipValue,
    additionalRelationshipValue: round(
      relationshipValue - (candidate.burnContribution?.adjustedMarginalValue ?? 0),
    ),
    activeSynergy,
    rating,
    overallScore: weightedScore(
      candidate.estimatedPower / 10,
      rating,
      maximumPowerUnits,
      60,
      solverModule,
    ),
  };
}

function requiredAdditionalRelationshipValue(candidate, targetScore, maximumPowerUnits, solverModule) {
  let exactTie = null;
  let firstAtOrAbove = null;
  let firstStrictlyAbove = null;
  for (let units = 0; units <= 100_000; units += 1) {
    const extra = units / 1000;
    const current = candidate.burnContribution?.adjustedMarginalValue ?? 0;
    const rating = activeSynergyWithBurnValue(candidate, current + extra) + candidate.placement;
    const score = weightedScore(candidate.estimatedPower / 10, rating, maximumPowerUnits, 60, solverModule);
    const transition = { additionalRelationshipValue: extra, rating, score };
    if (!exactTie && Math.abs(score - targetScore) < 1e-9) exactTie = transition;
    if (!firstAtOrAbove && score >= targetScore) firstAtOrAbove = transition;
    if (score > targetScore) { firstStrictlyAbove = transition; break; }
  }
  if (!firstAtOrAbove) return null;
  const current = candidate.burnContribution?.adjustedMarginalValue ?? 0;
  return {
    exactTie,
    firstAtOrAbove,
    firstStrictlyAbove,
    exactBaseMultiplierAtFirstAtOrAbove: current > 0
      ? round((current + firstAtOrAbove.additionalRelationshipValue) / current)
      : null,
  };
}

function relationshipTradeoff(baselineCandidate, burnCandidate) {
  const baseline = new Map(baselineCandidate.relationships.map((relationship) => [relationship.id, relationship]));
  const burn = new Map(burnCandidate.relationships.map((relationship) => [relationship.id, relationship]));
  const lost = [...baseline.values()]
    .filter((relationship) => !burn.has(relationship.id))
    .map(compactRelationship);
  const gained = [...burn.values()]
    .filter((relationship) => !baseline.has(relationship.id))
    .map(compactRelationship);
  return {
    lost,
    gained,
    lostAdjustedValue: round(lost.reduce((sum, relationship) => sum + relationship.adjustedMarginalValue, 0)),
    gainedAdjustedValue: round(gained.reduce((sum, relationship) => sum + relationship.adjustedMarginalValue, 0)),
  };
}

function activeSynergyWithBurnValue(candidate, burnValue) {
  const targetId = candidate.burnContribution?.id;
  const relationships = candidate.relationships.map((relationship) => ({
    ...relationship,
    adjustedMarginalValue: relationship.id === targetId
      ? burnValue
      : relationship.adjustedMarginalValue,
  }));
  const subtotal = (relationshipClass) => relationships
    .filter((relationship) => relationship.relationshipClass === relationshipClass)
    .reduce((sum, relationship) => sum + Math.max(0, relationship.adjustedMarginalValue), 0);
  const conditional = Math.min(30, subtotal('conditional-payoff'));
  const amplification = Math.min(30, subtotal('output-amplification'));
  const stat = Math.min(15, subtotal('stat-support'));
  const participants = new Set(relationships
    .filter((relationship) => relationship.adjustedMarginalValue > 0)
    .flatMap((relationship) => [relationship.providerDragonId, relationship.beneficiaryDragonId]));
  const bonus = participants.size >= 3 ? 5 : participants.size === 2 ? 2 : 0;
  return Math.round(Math.min(80, conditional + amplification + stat + bonus));
}

function requiredRatingToTie(powerUnits, targetScore, maximumPowerUnits, powerWeight, solverModule) {
  for (let rating = 0; rating <= 100; rating += 1) {
    if (weightedScore(powerUnits, rating, maximumPowerUnits, powerWeight, solverModule) >= targetScore) return rating;
  }
  return null;
}

function weightedScore(powerUnits, rating, maximumPowerUnits, powerWeight, solverModule) {
  const powerIndex = solverModule.roundHalfUpRatio(powerUnits * 10_000, maximumPowerUnits);
  return (powerIndex * powerWeight + rating * 100 * (100 - powerWeight)) / 10_000;
}

function activeSignal(signal, entry) {
  if (!entry?.owned) return false;
  const starRank = entry.starRank ?? 0;
  const dragonLevel = entry.reignLevel ?? 0;
  return starRank >= (signal.unlock?.minimumStarRank ?? 0) && dragonLevel >= (signal.unlock?.minimumDragonLevel ?? 0);
}

function requiredPowerUnits(candidate) {
  if (!Number.isSafeInteger(candidate.estimatedPowerUnits)) throw new Error(`Missing power for ${candidate.stableCandidateKey}.`);
  return candidate.estimatedPowerUnits;
}

function round(value) {
  return Math.round(value * 1e6) / 1e6;
}

function required(name) {
  const result = value(name);
  if (!result) throw new Error(`Missing ${name}.`);
  return result;
}

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
