import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const rosterPath = value('--roster');
const outputPath = value('--output');
if (!rosterPath) {
  throw new Error('Usage: pnpm node scripts/report-optimizer-sensitivity-v1.mjs --roster <private-roster.json> [--output <report.json>]');
}

const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const [{ dragons }, { simpleSynergyProfiles }, storage, candidatesModule, powerModule, solverModule, optimizerModule] = await Promise.all([
    server.ssrLoadModule('/src/data/dragons.ts'),
    server.ssrLoadModule('/src/synergy/profiles.ts'),
    server.ssrLoadModule('/src/services/rosterStorage.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerCandidates.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerPower.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizerBestOverallSolver.ts'),
    server.ssrLoadModule('/src/optimizer/rosterOptimizer.ts'),
  ]);
  const rosterJson = await readFile(rosterPath, 'utf8');
  const imported = storage.validateRosterImport(rosterJson, dragons);
  if (!imported.ok || !imported.roster) {
    throw new Error(`Private roster import failed: ${imported.errors.join('; ')}`);
  }

  const snapshot = candidatesModule.buildOptimizerRosterSnapshot(dragons, imported.roster);
  const estimatesByDragonId = powerModule.buildEstimatedPowerCache(snapshot);
  const candidates = candidatesModule.generateOptimizerFormationCandidates({
    dragons,
    profiles: simpleSynergyProfiles,
    snapshot,
    estimatesByDragonId,
  });
  const solver = solverModule.solveBestOverallFirst(candidates, 10);
  const result = optimizerModule.buildFlexibleResult({
    allocationMode: 'best-overall-first',
    formationCount: 10,
    solver,
    snapshot,
    estimatesByDragonId,
    rosterFingerprint: candidatesModule.createRosterOptimizerFingerprint(snapshot),
    requestFingerprint: candidatesModule.createRosterOptimizerRequestFingerprint(
      snapshot,
      'best-overall-first',
      10,
    ),
    candidateCount: candidates.length,
    candidateGenerationMs: 0,
    solverMs: 0,
    totalMs: 0,
  });

  const globalMaximumPowerUnits = Math.max(...candidates.map(requiredPowerUnits));
  const armyOne = solver.selectedCandidates[0];
  const armyTwoCandidates = armyOne
    ? rankedCandidates(
        candidates.filter((candidate) => (candidate.dragonMask & armyOne.dragonMask) === 0n),
        solverModule,
      ).slice(0, 25)
    : [];
  const pairCandidates = rankedCandidates(
    candidates.filter((candidate) =>
      candidate.dragonIds.includes('caraxes') && candidate.dragonIds.includes('syrax'),
    ),
    solverModule,
    globalMaximumPowerUnits,
  );
  const semanticCandidate = (candidate) => candidate ? ({
    stableCandidateKey: candidate.stableCandidateKey,
    dragonIds: candidate.dragonIds,
    arrangement: candidate.arrangement,
    tiedBestArrangements: candidate.tiedBestArrangements,
    rating: candidate.rating,
    adjustedRelationshipValue: candidate.adjustedRelationshipValue,
    activeRelationshipCount: candidate.activeRelationshipCount,
    quantifiedRelationshipCount: candidate.quantifiedRelationshipCount,
    unquantifiedRelationshipCount: candidate.unquantifiedRelationshipCount,
    unquantifiedBasePotential: candidate.unquantifiedBasePotential,
    estimatedPower: requiredPowerUnits(candidate) * 10,
    relationships: candidate.relationships.map((relationship) => ({
      id: relationship.id,
      providerSignalId: relationship.selectedProviderSignalId,
      beneficiarySignalId: relationship.selectedBeneficiarySignalId,
      adjustedMarginalValue: relationship.adjustedMarginalValue,
      reliability: relationship.quantification,
    })),
  }) : null;
  const formationByIds = (...ids) => candidates.find((candidate) =>
    ids.every((id) => candidate.dragonIds.includes(id)),
  );
  const semanticFormations = result.formations.map((formation) => ({
    rank: formation.rank,
    stableCandidateKey: formation.stableCandidateKey,
    dragonIds: formation.dragonIds,
    arrangement: formation.arrangement,
    rating: formation.rating,
    adjustedRelationshipValue: formation.adjustedRelationshipValue,
    activeRelationshipCount: formation.activeRelationshipCount,
    estimatedPower: formation.estimatedPower,
    overallScore: formation.bestOverallScore?.overallScore ?? null,
  }));
  const report = {
    sensitivityContract: 'optimizer-sensitivity-pass-v1',
    optimizerContractVersion: result.contractVersion,
    ratingContract: result.ratingContract,
    allocationMode: result.allocationMode,
    formationCount: result.requestedFormationCount,
    eligibleDragonCount: result.eligibleDragonCount,
    candidateCount: candidates.length,
    rosterFingerprint: result.rosterFingerprint,
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
    nonSyraxCandidateIdentity: candidatesModule.stableHash(JSON.stringify(candidates
      .filter((candidate) => !candidate.dragonIds.includes('syrax'))
      .map((candidate) => [
        candidate.stableCandidateKey,
        candidate.rating,
        candidate.adjustedRelationshipValueUnits,
        candidate.activeRelationshipCount,
        candidate.estimatedPowerUnits,
      ]))),
    formations: semanticFormations,
    army1: semanticFormations[0],
    army2: semanticFormations[1],
    collection: result.collection,
    caraxesSyraxSeasmoke: semanticCandidate(formationByIds('caraxes', 'syrax', 'seasmoke')),
    caraxesSyraxVelar: semanticCandidate(formationByIds('caraxes', 'syrax', 'velar')),
    bestCaraxesSyraxCandidate: semanticCandidate(pairCandidates[0]?.candidate),
    caraxesSyraxSplit: !semanticFormations.some((formation) =>
      formation.dragonIds.includes('caraxes') && formation.dragonIds.includes('syrax'),
    ),
    top25Army2Candidates: armyTwoCandidates.map(({ candidate, score }, index) => ({
      rank: index + 1,
      ...semanticCandidate(candidate),
      overallScore: score.overallScore,
      overallScoreUnits: score.overallScoreUnits,
    })),
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, output);
  process.stdout.write(output);
} finally {
  await server.close();
}

function rankedCandidates(candidates, solverModule, suppliedMaximumPowerUnits) {
  const maximumPowerUnits = suppliedMaximumPowerUnits ?? Math.max(...candidates.map(requiredPowerUnits));
  return candidates.map((candidate) => ({
    candidate,
    score: solverModule.bestOverallScoreBreakdown(candidate, maximumPowerUnits),
  })).sort((left, right) => solverModule.compareBestOverallCandidates(
    left.candidate,
    left.score,
    right.candidate,
    right.score,
  ));
}

function requiredPowerUnits(candidate) {
  if (!Number.isSafeInteger(candidate.estimatedPowerUnits)) {
    throw new Error(`Candidate ${candidate.stableCandidateKey} lacks Estimated Power units.`);
  }
  return candidate.estimatedPowerUnits;
}

function value(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
