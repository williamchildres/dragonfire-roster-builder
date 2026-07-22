import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  DRAGON_POWER_OBSERVATIONS,
  deduplicateDragonPowerObservations,
  deriveEstimatedPowerObservedEnvelopes,
  hashDragonPowerObservations,
} from '../src/power/dragonPowerObservations.ts';
import {
  ESTIMATED_POWER_MODEL_COEFFICIENTS,
  ESTIMATED_POWER_MODEL_FAMILY,
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_OBSERVATION_HASH,
} from '../src/power/generatedDragonPowerModel.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const writeArtifacts = process.argv.includes('--write');
const rarities = ['Legendary', 'Epic', 'Rare'];
const uniqueObservations = deduplicateDragonPowerObservations();
const observationHash = hashDragonPowerObservations();
const observedEnvelopes = deriveEstimatedPowerObservedEnvelopes();
const supportedGrid = { starRankMinimum: 1, starRankMaximum: 10, dragonLevelMinimum: 0, dragonLevelAuditMaximum: 1000 };

const candidateDefinitions = [
  {
    id: 'shared-monotone-power-law',
    description: 'Shared level and Star Rank exponents with one positive coefficient per rarity.',
    logarithmicTarget: true,
    features: (observation) => [
      ...rarityIndicators(observation.rarity),
      Math.log(Math.max(1, observation.dragonLevel)),
      Math.log(observation.starRank),
    ],
  },
  {
    id: 'rarity-specific-monotone-power-laws',
    description: 'Independent positive power-law coefficient and level/Star Rank exponents for each rarity.',
    logarithmicTarget: true,
    features: (observation) => [
      ...rarityIndicators(observation.rarity),
      ...rarityIndicators(observation.rarity).map((value) => value * Math.log(Math.max(1, observation.dragonLevel))),
      ...rarityIndicators(observation.rarity).map((value) => value * Math.log(observation.starRank)),
    ],
  },
  {
    id: ESTIMATED_POWER_MODEL_FAMILY,
    description: 'Rarity intercepts and level slopes plus one shared Star Rank contribution; a monotone empirical envelope and rarity projection guard runtime estimates.',
    logarithmicTarget: false,
    features: additiveFeatures,
  },
];

const candidates = candidateDefinitions.map(evaluateCandidate);
const selectedCandidate = candidates.find((candidate) => candidate.id === ESTIMATED_POWER_MODEL_FAMILY);
if (!selectedCandidate) throw new Error('Selected Estimated Power candidate was not evaluated.');
const fittedCoefficients = coefficientsFromVector(selectedCandidate.coefficients);
assertFrozenCoefficients(fittedCoefficients);
const modelHash = fnv1a64(JSON.stringify({
  modelVersion: ESTIMATED_POWER_MODEL_VERSION,
  modelFamily: ESTIMATED_POWER_MODEL_FAMILY,
  observationHash,
  coefficients: fittedCoefficients,
  lowLevelRule: 'scale-level-20-estimate-by-max(1,level)/20',
  monotoneRule: 'empirical-lower-upper-envelope-then-rare-epic-legendary-projection',
  exactObservationRule: 'return-deduplicated-displayed-power',
  roundingRule: 'nearest-10',
  confidenceRule: 'exact-observation-otherwise-per-rarity-star-and-level-envelope',
  empiricalEnvelopeDerivation: 'derived-from-deduplicated-observations',
  observedEnvelopes,
}));
const gridChecks = auditRuntimeGrid(fittedCoefficients);
const validationChecks = {
  observationOrderReversalMatches:
    hashDragonPowerObservations([...DRAGON_POWER_OBSERVATIONS].reverse()) === observationHash,
  invalidInputCasesRejected: [
    { rarity: 'Rare', starRank: 0, dragonLevel: 20 },
    { rarity: 'Rare', starRank: 11, dragonLevel: 20 },
    { rarity: 'Rare', starRank: 4, dragonLevel: -1 },
    { rarity: 'Rare', starRank: 4, dragonLevel: 20.5 },
  ].every((input) => !isValidProgression(input)),
};
if (!Object.values(validationChecks).every(Boolean)) {
  throw new Error(`Estimated Power validation failed: ${JSON.stringify(validationChecks)}.`);
}
const residuals = uniqueObservations.map((observation) => {
  const fittedPower = rawSelectedEstimate(fittedCoefficients, observation);
  const residual = fittedPower - observation.displayedPower;
  return {
    ...observation,
    fittedPower: round(fittedPower, 4),
    residual: round(residual, 4),
    absoluteError: round(Math.abs(residual), 4),
    percentageError: round(Math.abs(residual) / observation.displayedPower * 100, 6),
    runtimePower: runtimeEstimate(fittedCoefficients, observation),
  };
});
const audit = {
  auditVersion: 'estimated-power-v1',
  generatedAt: 'deterministic',
  modelVersion: ESTIMATED_POWER_MODEL_VERSION,
  modelFamily: ESTIMATED_POWER_MODEL_FAMILY,
  observationHash,
  modelHash,
  rawSampleCount: DRAGON_POWER_OBSERVATIONS.length,
  uniqueObservationCount: uniqueObservations.length,
  duplicateSampleCount: DRAGON_POWER_OBSERVATIONS.length - uniqueObservations.length,
  observations: residuals,
  candidateModels: candidates,
  selectedModel: {
    coefficients: fittedCoefficients,
    formula: 'base(rarity, stars, level>=20) = intercept[rarity] + levelSlope[rarity] * level + sharedStarRankSlope * stars',
    lowLevelExtrapolation: 'For levels 0-19, scale the level-20 base by max(1, level) / 20.',
    runtimeGuardrails: 'Round to 10; clamp within monotone empirical lower/upper bounds; project Rare <= Epic <= Legendary.',
    trainingMetrics: selectedCandidate.trainingMetrics,
    leaveOneOutMetrics: selectedCandidate.leaveOneOutMetrics,
  },
  residualsByRarity: groupedResidualMetrics(residuals, (row) => row.rarity),
  residualsByStarRank: groupedResidualMetrics(residuals, (row) => String(row.starRank)),
  residualsByDragonLevel: groupedResidualMetrics(residuals, (row) => String(row.dragonLevel)),
  supportedProgression: {
    starRanks: '1-10',
    dragonLevels: 'all nonnegative integers; exhaustive audit through 1000 plus monotone construction',
  },
  confidenceContract: {
    roundingRule: 'nearest-10',
    confidenceRule: 'exact-observation-otherwise-per-rarity-star-and-level-envelope',
    empiricalEnvelopeDerivation: 'derived-from-deduplicated-observations',
    observedEnvelopes,
  },
  gridChecks,
  validationChecks,
  confidenceExamples: [
    { rarity: 'Legendary', starRank: 4, dragonLevel: 35 },
    { rarity: 'Legendary', starRank: 5, dragonLevel: 35 },
    { rarity: 'Epic', starRank: 6, dragonLevel: 35 },
    { rarity: 'Epic', starRank: 7, dragonLevel: 35 },
    { rarity: 'Rare', starRank: 4, dragonLevel: 29 },
    { rarity: 'Rare', starRank: 2, dragonLevel: 29 },
    { rarity: 'Rare', starRank: 4, dragonLevel: 30 },
    { rarity: 'Rare', starRank: 4, dragonLevel: 31 },
    { rarity: 'Epic', starRank: 3, dragonLevel: 34 },
  ].map((input) => ({ ...input, ...classifyConfidence(input) })),
};

if (writeArtifacts) {
  await writeGeneratedModel(observationHash, modelHash, fittedCoefficients);
  await writeFile(`${repositoryRoot}/docs/audits/estimated-power-v1.json`, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(`${repositoryRoot}/docs/audits/estimated-power-v1.md`, renderMarkdown(audit));
  console.log(`Estimated Power v1 artifacts written: ${observationHash}, ${modelHash}`);
} else {
  if (ESTIMATED_POWER_OBSERVATION_HASH !== observationHash) {
    throw new Error(`Frozen observation hash ${ESTIMATED_POWER_OBSERVATION_HASH} does not match ${observationHash}. Run with --write.`);
  }
  if (ESTIMATED_POWER_MODEL_HASH !== modelHash) {
    throw new Error(`Frozen model hash ${ESTIMATED_POWER_MODEL_HASH} does not match ${modelHash}. Run with --write.`);
  }
  console.log(`Estimated Power v1 verified: ${observationHash}, ${modelHash}`);
}
console.log(`Training MAPE ${selectedCandidate.trainingMetrics.mapePercent}% (max ${selectedCandidate.trainingMetrics.maximumAbsolutePercentageErrorPercent}%).`);
console.log(`Leave-one-out MAPE ${selectedCandidate.leaveOneOutMetrics.mapePercent}% (max ${selectedCandidate.leaveOneOutMetrics.maximumAbsolutePercentageErrorPercent}%).`);
console.log(`Grid: ${gridChecks.monotonicityViolations} monotonicity violations, ${gridChecks.rarityOrderViolations} rarity-order violations.`);

function evaluateCandidate(definition) {
  const coefficients = fit(definition, uniqueObservations);
  const predictions = uniqueObservations.map((observation) => predict(definition, coefficients, observation));
  const leaveOneOut = uniqueObservations.map((observation, heldOutIndex) => {
    const training = uniqueObservations.filter((_candidate, index) => index !== heldOutIndex);
    const heldOutCoefficients = fit(definition, training);
    return definition.id === ESTIMATED_POWER_MODEL_FAMILY
      ? runtimeEstimate(coefficientsFromVector(heldOutCoefficients), observation, training)
      : predict(definition, heldOutCoefficients, observation);
  });
  const grid = candidateGridChecks(definition, coefficients);
  return {
    id: definition.id,
    description: definition.description,
    parameterCount: coefficients.length,
    coefficients: coefficients.map((value) => round(value, 12)),
    trainingMetrics: errorMetrics(uniqueObservations, predictions),
    leaveOneOutMetrics: errorMetrics(uniqueObservations, leaveOneOut),
    gridChecks: grid,
    selected: definition.id === ESTIMATED_POWER_MODEL_FAMILY,
  };
}

function fit(definition, observations) {
  const matrix = observations.map(definition.features);
  const target = observations.map((observation) => definition.logarithmicTarget
    ? Math.log(observation.displayedPower)
    : observation.displayedPower);
  return solveNormalEquations(matrix, target);
}

function predict(definition, coefficients, observation) {
  const linear = dot(definition.features(observation), coefficients);
  return definition.logarithmicTarget ? Math.exp(linear) : linear;
}

function additiveFeatures(observation) {
  const rarity = rarityIndicators(observation.rarity);
  return [
    ...rarity,
    ...rarity.map((value) => value * observation.dragonLevel),
    observation.starRank,
  ];
}

function coefficientsFromVector(coefficients) {
  return {
    rarityIntercept: Object.fromEntries(rarities.map((rarity, index) => [rarity, coefficients[index]])),
    rarityLevelSlope: Object.fromEntries(rarities.map((rarity, index) => [rarity, coefficients[index + 3]])),
    sharedStarRankSlope: coefficients[6],
    empiricalMinimumDragonLevel: 20,
  };
}

function assertFrozenCoefficients(fitted) {
  for (const rarity of rarities) {
    assertNear(fitted.rarityIntercept[rarity], ESTIMATED_POWER_MODEL_COEFFICIENTS.rarityIntercept[rarity], `intercept ${rarity}`);
    assertNear(fitted.rarityLevelSlope[rarity], ESTIMATED_POWER_MODEL_COEFFICIENTS.rarityLevelSlope[rarity], `level slope ${rarity}`);
  }
  assertNear(fitted.sharedStarRankSlope, ESTIMATED_POWER_MODEL_COEFFICIENTS.sharedStarRankSlope, 'shared Star Rank slope');
}

function rawSelectedEstimate(coefficients, observation) {
  return coefficients.rarityIntercept[observation.rarity]
    + coefficients.rarityLevelSlope[observation.rarity] * observation.dragonLevel
    + coefficients.sharedStarRankSlope * observation.starRank;
}

function runtimeEstimate(coefficients, input, observations = uniqueObservations) {
  const within = (rarity) => {
    const atLevel20 = coefficients.rarityIntercept[rarity]
      + coefficients.rarityLevelSlope[rarity] * 20
      + coefficients.sharedStarRankSlope * input.starRank;
    const modeled = input.dragonLevel < 20
      ? atLevel20 * Math.max(1, input.dragonLevel) / 20
      : coefficients.rarityIntercept[rarity]
        + coefficients.rarityLevelSlope[rarity] * input.dragonLevel
        + coefficients.sharedStarRankSlope * input.starRank;
    const sameRarity = observations.filter((observation) => observation.rarity === rarity);
    const lower = Math.max(10, ...sameRarity
      .filter((observation) => observation.starRank <= input.starRank && observation.dragonLevel <= input.dragonLevel)
      .map((observation) => observation.displayedPower));
    const upperValues = sameRarity
      .filter((observation) => observation.starRank >= input.starRank && observation.dragonLevel >= input.dragonLevel)
      .map((observation) => observation.displayedPower);
    const upper = upperValues.length > 0 ? Math.min(...upperValues) : Number.POSITIVE_INFINITY;
    return Math.round(Math.max(lower, Math.min(modeled, upper)) / 10) * 10;
  };
  const rare = within('Rare');
  const epic = Math.max(within('Epic'), rare);
  const legendary = Math.max(within('Legendary'), epic);
  return input.rarity === 'Legendary' ? legendary : input.rarity === 'Epic' ? epic : rare;
}

function classifyConfidence(input) {
  const exact = uniqueObservations.some((observation) => observation.rarity === input.rarity
    && observation.starRank === input.starRank
    && observation.dragonLevel === input.dragonLevel);
  if (exact) return { confidence: 'observed', basis: 'exact-observation' };
  const envelope = observedEnvelopes[input.rarity];
  const outsideEnvelope = input.starRank < envelope.starRank.minimum
    || input.starRank > envelope.starRank.maximum
    || input.dragonLevel < envelope.dragonLevel.minimum
    || input.dragonLevel > envelope.dragonLevel.maximum;
  return outsideEnvelope
    ? { confidence: 'low', basis: 'extrapolation' }
    : { confidence: 'modeled', basis: 'interpolation' };
}

function auditRuntimeGrid(coefficients) {
  let monotonicityViolations = 0;
  let rarityOrderViolations = 0;
  let invalidEstimateCount = 0;
  let checkedEstimateCount = 0;
  for (const rarity of rarities) {
    for (let starRank = supportedGrid.starRankMinimum; starRank <= supportedGrid.starRankMaximum; starRank += 1) {
      for (let dragonLevel = supportedGrid.dragonLevelMinimum; dragonLevel <= supportedGrid.dragonLevelAuditMaximum; dragonLevel += 1) {
        const current = runtimeEstimate(coefficients, { rarity, starRank, dragonLevel });
        checkedEstimateCount += 1;
        if (!Number.isFinite(current) || current <= 0) invalidEstimateCount += 1;
        if (starRank < supportedGrid.starRankMaximum && runtimeEstimate(coefficients, { rarity, starRank: starRank + 1, dragonLevel }) < current) monotonicityViolations += 1;
        if (dragonLevel < supportedGrid.dragonLevelAuditMaximum && runtimeEstimate(coefficients, { rarity, starRank, dragonLevel: dragonLevel + 1 }) < current) monotonicityViolations += 1;
      }
    }
  }
  for (let starRank = 1; starRank <= 10; starRank += 1) {
    for (let dragonLevel = 0; dragonLevel <= supportedGrid.dragonLevelAuditMaximum; dragonLevel += 1) {
      const legendary = runtimeEstimate(coefficients, { rarity: 'Legendary', starRank, dragonLevel });
      const epic = runtimeEstimate(coefficients, { rarity: 'Epic', starRank, dragonLevel });
      const rare = runtimeEstimate(coefficients, { rarity: 'Rare', starRank, dragonLevel });
      if (legendary < epic || epic < rare) rarityOrderViolations += 1;
    }
  }
  const exactObservationMismatches = uniqueObservations.filter((observation) => runtimeEstimate(coefficients, observation) !== observation.displayedPower).length;
  return {
    ...supportedGrid,
    checkedEstimateCount,
    invalidEstimateCount,
    monotonicityViolations,
    rarityOrderViolations,
    exactObservationMismatches,
    analyticalExtension: 'All level slopes and the low-level scale are nonnegative; empirical bounds and rarity projection are monotone max/min operations, so the checks extend to every nonnegative integer level.',
  };
}

function candidateGridChecks(definition, coefficients) {
  let monotonicityViolations = 0;
  let rarityOrderViolations = 0;
  let invalidEstimateCount = 0;
  const estimate = (rarity, starRank, dragonLevel) => predict(definition, coefficients, { rarity, starRank, dragonLevel, displayedPower: 0 });
  for (const rarity of rarities) {
    for (let starRank = 1; starRank <= 10; starRank += 1) {
      for (let dragonLevel = 1; dragonLevel <= 100; dragonLevel += 1) {
        const current = estimate(rarity, starRank, dragonLevel);
        if (!Number.isFinite(current) || current <= 0) invalidEstimateCount += 1;
        if (starRank < 10 && estimate(rarity, starRank + 1, dragonLevel) < current) monotonicityViolations += 1;
        if (dragonLevel < 100 && estimate(rarity, starRank, dragonLevel + 1) < current) monotonicityViolations += 1;
      }
    }
  }
  for (let starRank = 1; starRank <= 10; starRank += 1) {
    for (let dragonLevel = 1; dragonLevel <= 100; dragonLevel += 1) {
      if (estimate('Legendary', starRank, dragonLevel) < estimate('Epic', starRank, dragonLevel)
        || estimate('Epic', starRank, dragonLevel) < estimate('Rare', starRank, dragonLevel)) rarityOrderViolations += 1;
    }
  }
  return { starRanks: '1-10', dragonLevels: '1-100', monotonicityViolations, rarityOrderViolations, invalidEstimateCount };
}

function errorMetrics(observations, predictions) {
  const errors = predictions.map((prediction, index) => prediction - observations[index].displayedPower);
  const percentageErrors = errors.map((error, index) => Math.abs(error) / observations[index].displayedPower * 100);
  return {
    meanAbsoluteError: round(mean(errors.map(Math.abs)), 4),
    mapePercent: round(mean(percentageErrors), 6),
    medianAbsolutePercentageErrorPercent: round(median(percentageErrors), 6),
    maximumAbsolutePercentageErrorPercent: round(Math.max(...percentageErrors), 6),
    rootMeanSquaredError: round(Math.sqrt(mean(errors.map((error) => error ** 2))), 4),
  };
}

function groupedResidualMetrics(rows, keyFor) {
  return Object.fromEntries([...Map.groupBy(rows, keyFor)].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, group]) => [key, {
    count: group.length,
    meanResidual: round(mean(group.map((row) => row.residual)), 4),
    meanAbsoluteError: round(mean(group.map((row) => row.absoluteError)), 4),
    mapePercent: round(mean(group.map((row) => row.percentageError)), 6),
  }]));
}

function solveNormalEquations(matrix, target) {
  const width = matrix[0].length;
  const augmented = Array.from({ length: width }, (_, row) => Array.from({ length: width + 1 }, (_, column) => column < width
    ? matrix.reduce((total, values) => total + values[row] * values[column], 0)
    : matrix.reduce((total, values, index) => total + values[row] * target[index], 0)));
  for (let pivot = 0; pivot < width; pivot += 1) {
    let best = pivot;
    for (let row = pivot + 1; row < width; row += 1) if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[best][pivot])) best = row;
    [augmented[pivot], augmented[best]] = [augmented[best], augmented[pivot]];
    const divisor = augmented[pivot][pivot];
    if (Math.abs(divisor) < 1e-12) throw new Error('Candidate model design matrix is singular.');
    for (let column = pivot; column <= width; column += 1) augmented[pivot][column] /= divisor;
    for (let row = 0; row < width; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= width; column += 1) augmented[row][column] -= factor * augmented[pivot][column];
    }
  }
  return augmented.map((row) => row[width]);
}

async function writeGeneratedModel(nextObservationHash, nextModelHash, coefficients) {
  const path = `${repositoryRoot}/src/power/generatedDragonPowerModel.ts`;
  let source = await readFile(path, 'utf8');
  source = source
    .replace(/Legendary: -?[\d.]+,/, `Legendary: ${coefficients.rarityIntercept.Legendary},`)
    .replace(/Epic: -?[\d.]+,/, `Epic: ${coefficients.rarityIntercept.Epic},`)
    .replace(/Rare: -?[\d.]+,/, `Rare: ${coefficients.rarityIntercept.Rare},`)
    .replace(/(rarityLevelSlope: \{[\s\S]*?Legendary:) -?[\d.]+,/, `$1 ${coefficients.rarityLevelSlope.Legendary},`)
    .replace(/(rarityLevelSlope: \{[\s\S]*?Epic:) -?[\d.]+,/, `$1 ${coefficients.rarityLevelSlope.Epic},`)
    .replace(/(rarityLevelSlope: \{[\s\S]*?Rare:) -?[\d.]+,/, `$1 ${coefficients.rarityLevelSlope.Rare},`)
    .replace(/sharedStarRankSlope: -?[\d.]+,/, `sharedStarRankSlope: ${coefficients.sharedStarRankSlope},`)
    .replace(/ESTIMATED_POWER_OBSERVATION_HASH = '[^']+'/, `ESTIMATED_POWER_OBSERVATION_HASH = '${nextObservationHash}'`)
    .replace(/ESTIMATED_POWER_MODEL_HASH = '[^']+'/, `ESTIMATED_POWER_MODEL_HASH = '${nextModelHash}'`);
  await writeFile(path, source);
}

function renderMarkdown(auditReport) {
  const selected = auditReport.selectedModel;
  const observationRows = auditReport.observations.map((row) => `| ${row.rarity} | ${row.starRank} | ${row.dragonLevel} | ${row.displayedPower} | ${row.provenance.join(', ')} | ${row.sampleCount} | ${row.fittedPower} | ${row.residual} | ${row.percentageError}% |`).join('\n');
  const candidateRows = auditReport.candidateModels.map((candidate) => `| ${candidate.id} | ${candidate.parameterCount} | ${candidate.trainingMetrics.mapePercent}% | ${candidate.trainingMetrics.maximumAbsolutePercentageErrorPercent}% | ${candidate.leaveOneOutMetrics.mapePercent}% | ${candidate.gridChecks.monotonicityViolations} | ${candidate.gridChecks.rarityOrderViolations} | ${candidate.selected ? 'Selected' : 'Not selected'} |`).join('\n');
  const confidenceRows = auditReport.confidenceExamples.map((example) => `| ${example.rarity} | ${example.starRank} | ${example.dragonLevel} | ${example.confidence} | ${example.basis} |`).join('\n');
  return `# Estimated Dragon Power v1 audit\n\n> Estimated Power is an unofficial empirical approximation based on observed game values. It is separate from Formation Rating and is not combat simulation.\n\n- Model version: \`${auditReport.modelVersion}\`\n- Observation hash: \`${auditReport.observationHash}\`\n- Model hash: \`${auditReport.modelHash}\`\n- Raw samples: ${auditReport.rawSampleCount}\n- Unique fitting combinations: ${auditReport.uniqueObservationCount}\n- Deduplicated samples: ${auditReport.duplicateSampleCount}\n\n## Candidate selection\n\n| Candidate | Parameters | Training MAPE | Training max APE | LOO MAPE | Monotonicity violations | Rarity-order violations | Decision |\n| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |\n${candidateRows}\n\nThe selected family is the simplest candidate meeting the training guardrails after a transparent monotone runtime envelope. The shared power law misses the maximum-error guardrail; independent rarity power laws create rarity-order crossings. The selected model's leave-one-out prediction refits without the held-out unique combination and excludes that combination from the empirical envelope.\n\n## Frozen formula\n\n${selected.formula}\n\n- Low-level rule: ${selected.lowLevelExtrapolation}\n- Runtime guardrails: ${selected.runtimeGuardrails}\n- Coefficients: \`${JSON.stringify(selected.coefficients)}\`\n- Training metrics: \`${JSON.stringify(selected.trainingMetrics)}\`\n- Leave-one-unique-combination-out metrics: \`${JSON.stringify(selected.leaveOneOutMetrics)}\`\n\n## Observations and residuals\n\n| Rarity | Stars | Level | Observed | Provenance | Samples | Base fit | Residual | Absolute % error |\n| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: |\n${observationRows}\n\n## Structural checks\n\n- Checked estimates: ${auditReport.gridChecks.checkedEstimateCount}\n- Invalid/nonpositive estimates: ${auditReport.gridChecks.invalidEstimateCount}\n- Monotonicity violations: ${auditReport.gridChecks.monotonicityViolations}\n- Rarity-order violations: ${auditReport.gridChecks.rarityOrderViolations}\n- Exact-observation mismatches: ${auditReport.gridChecks.exactObservationMismatches}\n- Observation-order reversal: ${auditReport.validationChecks.observationOrderReversalMatches ? 'PASS' : 'FAIL'}\n- Invalid input rejection: ${auditReport.validationChecks.invalidInputCasesRejected ? 'PASS' : 'FAIL'}\n- Extension proof: ${auditReport.gridChecks.analyticalExtension}\n\n## Confidence contract\n\nExact observed rarity/Star Rank/Dragon Level tuples are \`observed\`. Non-exact tuples inside that rarity's deduplicated observed Star Rank and Dragon Level envelope are \`modeled\`; values outside either boundary are low-confidence \`extrapolation\`. Envelopes: \`${JSON.stringify(auditReport.confidenceContract.observedEnvelopes)}\`. Habit Levels, notes, and dragon identity are not model inputs.\n\n| Rarity | Stars | Level | Confidence | Basis |\n| --- | ---: | ---: | --- | --- |\n${confidenceRows}\n`;
}

function rarityIndicators(rarity) { return rarities.map((candidate) => candidate === rarity ? 1 : 0); }
function isValidProgression(input) { return rarities.includes(input.rarity) && Number.isInteger(input.starRank) && input.starRank >= 1 && input.starRank <= 10 && Number.isInteger(input.dragonLevel) && input.dragonLevel >= 0; }
function dot(left, right) { return left.reduce((total, value, index) => total + value * right[index], 0); }
function mean(values) { return values.reduce((total, value) => total + value, 0) / values.length; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2] : mean(sorted.slice(sorted.length / 2 - 1, sorted.length / 2 + 1)); }
function round(value, digits) { return Number(value.toFixed(digits)); }
function assertNear(left, right, label) { if (Math.abs(left - right) > 1e-8) throw new Error(`Frozen ${label} ${right} does not match fitted ${left}.`); }
function fnv1a64(value) { let hash = 0xcbf29ce484222325n; const prime = 0x100000001b3n; for (let index = 0; index < value.length; index += 1) { hash ^= BigInt(value.charCodeAt(index)); hash = BigInt.asUintN(64, hash * prime); } return `fnv1a64:${hash.toString(16).padStart(16, '0')}`; }
