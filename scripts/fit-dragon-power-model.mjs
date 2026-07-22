import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  buildDragonPowerSupportGraphs,
  DRAGON_POWER_OBSERVATIONS,
  deduplicateDragonPowerObservations,
  deriveEstimatedPowerObservedEnvelopes,
  hashDragonPowerObservations,
  observationTupleKey,
} from '../src/power/dragonPowerObservations.ts';
import {
  ESTIMATED_POWER_COMPLETION_RULE,
  ESTIMATED_POWER_CONFIDENCE_RULE,
  ESTIMATED_POWER_EXACT_OBSERVATION_RULE,
  ESTIMATED_POWER_EXTRAPOLATION_RULE,
  ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
  ESTIMATED_POWER_INTERPOLATION_RULE,
  ESTIMATED_POWER_LEVEL_CURVES,
  ESTIMATED_POWER_MODEL_FAMILY,
  ESTIMATED_POWER_MODEL_HASH,
  ESTIMATED_POWER_MODEL_VERSION,
  ESTIMATED_POWER_MONOTONICITY_RULE,
  ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT,
  ESTIMATED_POWER_OBSERVATION_HASH,
  ESTIMATED_POWER_RARITY_PROJECTION,
  ESTIMATED_POWER_ROUNDING_RULE,
  ESTIMATED_POWER_STAR_CURVES,
  ESTIMATED_POWER_SUPPORT_COMPONENTS,
} from '../src/power/generatedDragonPowerModel.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const writeArtifacts = process.argv.includes('--write');
const rarities = ['Legendary', 'Epic', 'Rare'];
const uniqueObservations = deduplicateDragonPowerObservations();
const observationHash = hashDragonPowerObservations();
const supportGraphs = buildDragonPowerSupportGraphs();
const modelDefinition = buildModelDefinition();
const modelHash = fnv1a64(JSON.stringify(modelDefinition));
const observedEnvelopes = deriveEstimatedPowerObservedEnvelopes();
const supportedGrid = {
  starRankMinimum: 1,
  starRankMaximum: 10,
  dragonLevelMinimum: 0,
  dragonLevelAuditMaximum: 1000,
};

const frozenV1 = {
  version: 'estimated-power-v1',
  family: 'rarity-level-additive-with-shared-star-contribution-and-monotone-envelope',
  observationCount: 31,
  observationHash: 'fnv1a64:57268e00007bfab8',
  modelHash: 'fnv1a64:5bf2cc559f2fd940',
  coefficients: {
    rarityIntercept: {
      Legendary: -5345.526402998704,
      Epic: -3518.798289613967,
      Rare: -8030.898292604834,
    },
    rarityLevelSlope: {
      Legendary: 712.604230387158,
      Epic: 491.403841476919,
      Rare: 395.629654678922,
    },
    sharedStarRankSlope: 2434.713675015537,
    empiricalMinimumDragonLevel: 20,
  },
};

const frozenV1Observations = DRAGON_POWER_OBSERVATIONS.slice(0, frozenV1.observationCount);
const frozenV1Unique = deduplicateDragonPowerObservations(frozenV1Observations);
if (hashDragonPowerObservations(frozenV1Observations) !== frozenV1.observationHash) {
  throw new Error('Frozen Estimated Power v1 observation set no longer matches its historical hash.');
}
const frozenV1Keys = new Set(frozenV1Unique.map(observationTupleKey));
const historicalHoldout = uniqueObservations.filter((observation) => !frozenV1Keys.has(observationTupleKey(observation)));
if (historicalHoldout.length !== 17) {
  throw new Error(`Expected 17 genuinely new v1 holdout combinations, found ${historicalHoldout.length}.`);
}

const linearCoefficients = fitLinearAdditive(uniqueObservations);
const linearPredictions = uniqueObservations.map((observation) => predictLinearAdditive(linearCoefficients, observation));
const linearLooPredictions = uniqueObservations.map((observation, heldOutIndex) => {
  const training = uniqueObservations.filter((_candidate, index) => index !== heldOutIndex);
  return predictLinearAdditive(fitLinearAdditive(training), observation);
});

const fittedCurves = fitAdditiveCurves(uniqueObservations);
assertGeneratedCurves(fittedCurves);
const rawV2Predictions = uniqueObservations.map((observation) => predictAdditiveCurves(fittedCurves, observation));
const leaveOneUniqueCombinationOut = crossValidate(uniqueObservations.map((observation) => [observation]));
const leaveOneLevelAnchorOut = crossValidate(groupBy(uniqueObservations, (row) => `${row.rarity}:${row.dragonLevel}`));
const leaveOneStarAnchorOut = crossValidate(groupBy(uniqueObservations, (row) => `${row.rarity}:${row.starRank}`));
const upgradeEndpoints = uniqueObservations.filter((candidate) => uniqueObservations.some((other) =>
  other !== candidate
    && other.rarity === candidate.rarity
    && (other.starRank === candidate.starRank || other.dragonLevel === candidate.dragonLevel),
));
const leaveOneUpgradeEndpointOut = crossValidate(upgradeEndpoints.map((observation) => [observation]));

const transitionDeltaMetrics = buildTransitionDeltaMetrics(uniqueObservations, rawV2Predictions);
const gridChecks = auditRuntimeGrid();
const numericalGridFingerprint = gridChecks.numericalGridFingerprint;
const reversedModelHash = hashModel([...DRAGON_POWER_OBSERVATIONS].reverse());
const changedObservations = DRAGON_POWER_OBSERVATIONS.map((observation, index) =>
  index === 0 ? { ...observation, displayedPower: observation.displayedPower + 10 } : observation,
);
const validationChecks = {
  observationOrderReversalMatches:
    hashDragonPowerObservations([...DRAGON_POWER_OBSERVATIONS].reverse()) === observationHash,
  modelOrderReversalMatches: reversedModelHash === modelHash,
  observationMutationChangesObservationHash:
    hashDragonPowerObservations(changedObservations) !== observationHash,
  observationMutationChangesModelHash:
    hashModel(changedObservations) !== modelHash,
  invalidInputCasesRejected: [
    { rarity: 'Rare', starRank: 0, dragonLevel: 20 },
    { rarity: 'Rare', starRank: 11, dragonLevel: 20 },
    { rarity: 'Rare', starRank: 4, dragonLevel: -1 },
    { rarity: 'Rare', starRank: 4, dragonLevel: 20.5 },
  ].every((input) => rejectsEstimate(input)),
};
if (!Object.values(validationChecks).every(Boolean)) {
  throw new Error(`Estimated Power validation failed: ${JSON.stringify(validationChecks)}.`);
}
if (Object.values(supportGraphs).some((graph) => graph.maximumAdditiveResidual !== 0)) {
  throw new Error('The observation support graph is not exactly additive.');
}

const residualRows = uniqueObservations.map((observation, index) => {
  const fittedPower = rawV2Predictions[index];
  const residual = fittedPower - observation.displayedPower;
  return {
    ...observation,
    fittedPower: round(fittedPower, 4),
    residual: round(residual, 4),
    absoluteError: round(Math.abs(residual), 4),
    percentageError: round(Math.abs(residual) / observation.displayedPower * 100, 6),
    runtimePower: runtimeGeneratedEstimate(observation),
  };
});

const historicalHoldoutPredictions = historicalHoldout.map((observation) =>
  frozenV1RuntimeEstimate(observation, frozenV1Unique),
);
const candidateModels = [
  {
    id: frozenV1.family,
    label: 'Frozen Estimated Power v1',
    selected: false,
    parameterCount: 7,
    expandedDataMetrics: errorMetrics(uniqueObservations, uniqueObservations.map((row) => frozenV1RuntimeEstimate(row, frozenV1Unique))),
    historicalHoldoutMetrics: errorMetrics(historicalHoldout, historicalHoldoutPredictions),
  },
  {
    id: 'rarity-specific-linear-additive-regression',
    label: 'Rarity-specific linear additive regression',
    selected: false,
    parameterCount: 9,
    coefficients: linearCoefficients.map((value) => round(value, 12)),
    trainingMetrics: errorMetrics(uniqueObservations, linearPredictions),
    leaveOneUniqueCombinationOutMetrics: errorMetrics(uniqueObservations, linearLooPredictions),
  },
  {
    id: ESTIMATED_POWER_MODEL_FAMILY,
    label: 'Rarity-specific monotone additive Star and Level curves',
    selected: true,
    parameterCount: Object.values(ESTIMATED_POWER_STAR_CURVES).flat().length
      + Object.values(ESTIMATED_POWER_LEVEL_CURVES).flat().length,
    trainingMetrics: errorMetrics(uniqueObservations, rawV2Predictions),
    leaveOneUniqueCombinationOutMetrics: leaveOneUniqueCombinationOut,
    leaveOneLevelAnchorOutMetrics: leaveOneLevelAnchorOut,
    leaveOneStarAnchorOutMetrics: leaveOneStarAnchorOut,
    leaveOneUpgradeEndpointOutMetrics: leaveOneUpgradeEndpointOut,
  },
];

const audit = {
  auditVersion: 'estimated-power-v2',
  generatedAt: 'deterministic',
  modelVersion: ESTIMATED_POWER_MODEL_VERSION,
  modelFamily: ESTIMATED_POWER_MODEL_FAMILY,
  observationHash,
  modelHash,
  numericalGridFingerprint,
  rawSampleCount: DRAGON_POWER_OBSERVATIONS.length,
  uniqueObservationCount: uniqueObservations.length,
  duplicateSampleCount: DRAGON_POWER_OBSERVATIONS.length - uniqueObservations.length,
  provenanceSampleCounts: uniqueObservations.filter((row) => row.sampleCount > 1),
  observations: residualRows,
  candidateModels,
  historicalV1Benchmark: {
    ...frozenV1,
    uniqueObservationCount: frozenV1Unique.length,
    genuinelyNewUniqueCombinationCount: historicalHoldout.length,
    holdoutMetrics: errorMetrics(historicalHoldout, historicalHoldoutPredictions),
  },
  supportGraph: supportGraphs,
  additiveChecks: {
    allUniqueObservationsCompatible: true,
    maximumAdditiveResidual: Math.max(...Object.values(supportGraphs).map((graph) => graph.maximumAdditiveResidual)),
    epicStar1To2DirectlyIdentified: false,
    repeatedDifferences: repeatedDifferenceChecks(uniqueObservations),
  },
  selectedModel: {
    starCurves: ESTIMATED_POWER_STAR_CURVES,
    levelCurves: ESTIMATED_POWER_LEVEL_CURVES,
    extrapolationSlopes: ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
    completionRule: ESTIMATED_POWER_COMPLETION_RULE,
    definition: modelDefinition,
    trainingMetrics: errorMetrics(uniqueObservations, rawV2Predictions),
    leaveOneUniqueCombinationOutMetrics: leaveOneUniqueCombinationOut,
    leaveOneLevelAnchorOutMetrics: leaveOneLevelAnchorOut,
    leaveOneStarAnchorOutMetrics: leaveOneStarAnchorOut,
    leaveOneUpgradeEndpointOutMetrics: leaveOneUpgradeEndpointOut,
  },
  residualsByRarity: groupedResidualMetrics(residualRows, (row) => row.rarity),
  residualsByStarRank: groupedResidualMetrics(residualRows, (row) => String(row.starRank)),
  residualsByDragonLevel: groupedResidualMetrics(residualRows, (row) => String(row.dragonLevel)),
  transitionDeltaMetrics,
  observedEnvelopes,
  gridChecks,
  validationChecks,
  confidenceExamples: [
    { rarity: 'Epic', starRank: 1, dragonLevel: 20 },
    { rarity: 'Epic', starRank: 1, dragonLevel: 30 },
    { rarity: 'Epic', starRank: 2, dragonLevel: 21 },
    { rarity: 'Epic', starRank: 5, dragonLevel: 35 },
    { rarity: 'Rare', starRank: 5, dragonLevel: 29 },
    { rarity: 'Rare', starRank: 2, dragonLevel: 29 },
    { rarity: 'Legendary', starRank: 4, dragonLevel: 35 },
    { rarity: 'Legendary', starRank: 5, dragonLevel: 35 },
  ].map((input) => ({ ...input, ...runtimeResult(input) })),
};

if (writeArtifacts) {
  await writeGeneratedIdentities(observationHash, modelHash, numericalGridFingerprint);
  await writeFile(`${repositoryRoot}/docs/audits/estimated-power-v2.json`, `${JSON.stringify(audit, null, 2)}\n`);
  await writeFile(`${repositoryRoot}/docs/audits/estimated-power-v2.md`, renderMarkdown(audit));
  console.log(`Estimated Power v2 artifacts written: ${observationHash}, ${modelHash}, ${numericalGridFingerprint}`);
} else {
  if (ESTIMATED_POWER_OBSERVATION_HASH !== observationHash) {
    throw new Error(`Frozen observation hash ${ESTIMATED_POWER_OBSERVATION_HASH} does not match ${observationHash}. Run with --write.`);
  }
  if (ESTIMATED_POWER_MODEL_HASH !== modelHash) {
    throw new Error(`Frozen model hash ${ESTIMATED_POWER_MODEL_HASH} does not match ${modelHash}. Run with --write.`);
  }
  if (ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT !== numericalGridFingerprint) {
    throw new Error(`Frozen grid fingerprint ${ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT} does not match ${numericalGridFingerprint}. Run with --write.`);
  }
  console.log(`Estimated Power v2 verified: ${observationHash}, ${modelHash}, ${numericalGridFingerprint}`);
}
console.log(`Observations: ${DRAGON_POWER_OBSERVATIONS.length} raw, ${uniqueObservations.length} unique.`);
console.log(`Additive support: Legendary ${supportGraphs.Legendary.components.length}, Epic ${supportGraphs.Epic.components.length}, Rare ${supportGraphs.Rare.components.length} component(s); max residual 0.`);
console.log(`Historical v1 holdout MAPE ${audit.historicalV1Benchmark.holdoutMetrics.mapePercent}% (max ${audit.historicalV1Benchmark.holdoutMetrics.maximumAbsolutePercentageErrorPercent}%).`);
console.log(`V2 LOUO MAPE ${leaveOneUniqueCombinationOut.mapePercent}% (max ${leaveOneUniqueCombinationOut.maximumAbsolutePercentageErrorPercent}%).`);
console.log(`Grid: ${gridChecks.monotonicityViolations} monotonicity violations, ${gridChecks.rarityOrderViolations} rarity-order violations.`);

function buildModelDefinition(observations = DRAGON_POWER_OBSERVATIONS) {
  const graphs = buildDragonPowerSupportGraphs(observations);
  return {
    modelVersion: ESTIMATED_POWER_MODEL_VERSION,
    modelFamily: ESTIMATED_POWER_MODEL_FAMILY,
    observationHash: hashDragonPowerObservations(observations),
    starCurves: ESTIMATED_POWER_STAR_CURVES,
    levelCurves: ESTIMATED_POWER_LEVEL_CURVES,
    componentGauges: Object.fromEntries(Object.entries(graphs).map(([rarity, graph]) => [
      rarity,
      graph.components.map((component) => ({
        id: component.id,
        gauge: component.gauge,
        starRanks: component.starRanks,
        dragonLevels: component.dragonLevels,
      })),
    ])),
    supportComponents: ESTIMATED_POWER_SUPPORT_COMPONENTS,
    completionRule: ESTIMATED_POWER_COMPLETION_RULE,
    interpolationRule: ESTIMATED_POWER_INTERPOLATION_RULE,
    extrapolationRule: ESTIMATED_POWER_EXTRAPOLATION_RULE,
    extrapolationSlopes: ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
    exactObservationRule: ESTIMATED_POWER_EXACT_OBSERVATION_RULE,
    roundingRule: ESTIMATED_POWER_ROUNDING_RULE,
    monotonicityGuard: ESTIMATED_POWER_MONOTONICITY_RULE,
    rarityProjection: ESTIMATED_POWER_RARITY_PROJECTION,
    confidenceSupportRule: ESTIMATED_POWER_CONFIDENCE_RULE,
  };
}

function hashModel(observations) {
  return fnv1a64(JSON.stringify(buildModelDefinition(observations)));
}

function runtimeGeneratedEstimate(input) {
  if (!isValidProgression(input)) throw new RangeError('Invalid Estimated Power progression.');
  const exact = uniqueObservations.find((observation) => observationTupleKey(observation) === observationTupleKey(input));
  return exact?.displayedPower ?? predictAdditiveCurves({
    starCurves: ESTIMATED_POWER_STAR_CURVES,
    levelCurves: ESTIMATED_POWER_LEVEL_CURVES,
    extrapolationSlopes: ESTIMATED_POWER_EXTRAPOLATION_SLOPES,
  }, input);
}

function runtimeResult(input) {
  const exact = uniqueObservations.some((observation) => observationTupleKey(observation) === observationTupleKey(input));
  const insideComponent = ESTIMATED_POWER_SUPPORT_COMPONENTS[input.rarity].some((component) =>
    input.starRank >= component.starRankMinimum
      && input.starRank <= component.starRankMaximum
      && input.dragonLevel >= component.dragonLevelMinimum
      && input.dragonLevel <= component.dragonLevelMaximum,
  );
  return {
    power: runtimeGeneratedEstimate(input),
    confidence: exact ? 'observed' : insideComponent ? 'modeled' : 'low',
    basis: exact ? 'exact-observation' : insideComponent ? 'interpolation' : 'extrapolation',
  };
}

function fitAdditiveCurves(observations) {
  const graphs = buildDragonPowerSupportGraphs(observations);
  const starCurves = {};
  const levelCurves = {};
  const extrapolationSlopes = {};
  for (const rarity of rarities) {
    const graph = graphs[rarity];
    const bridgeSlope = minimumPositiveStarSlope(graph.components)
      ?? ESTIMATED_POWER_EXTRAPOLATION_SLOPES[rarity].starRank;
    const globalMinimumStar = Math.min(...graph.components.flatMap((component) => component.starRanks));
    const starValues = new Map();
    const levelValues = new Map();
    for (const [componentIndex, component] of graph.components.entries()) {
      const minimumStar = component.starRanks[0];
      const localMinimumValue = component.starComponents[String(minimumStar)];
      const targetMinimumValue = componentIndex === 0
        ? 0
        : (minimumStar - globalMinimumStar) * bridgeSlope;
      const offset = targetMinimumValue - localMinimumValue;
      for (const starRank of component.starRanks) {
        starValues.set(starRank, component.starComponents[String(starRank)] + offset);
      }
      for (const dragonLevel of component.dragonLevels) {
        levelValues.set(dragonLevel, component.levelComponents[String(dragonLevel)] - offset);
      }
    }
    starCurves[rarity] = [...starValues].sort(([left], [right]) => left - right).map(([input, value]) => ({ input, value }));
    levelCurves[rarity] = [...levelValues].sort(([left], [right]) => left - right).map(([input, value]) => ({ input, value }));
    extrapolationSlopes[rarity] = {
      starRank: minimumPositiveCurveSlope(starCurves[rarity]) ?? ESTIMATED_POWER_EXTRAPOLATION_SLOPES[rarity].starRank,
      dragonLevel: minimumPositiveCurveSlope(levelCurves[rarity]) ?? ESTIMATED_POWER_EXTRAPOLATION_SLOPES[rarity].dragonLevel,
    };
  }
  return { starCurves, levelCurves, extrapolationSlopes };
}

function predictAdditiveCurves(model, input) {
  const within = (rarity) => {
    const starValue = interpolateCurve(model.starCurves[rarity], input.starRank, model.extrapolationSlopes[rarity].starRank);
    const minimumLevel = model.levelCurves[rarity][0].input;
    if (input.dragonLevel < minimumLevel) {
      const atMinimum = starValue + model.levelCurves[rarity][0].value;
      return roundPower(Math.max(10, atMinimum * Math.max(1, input.dragonLevel) / minimumLevel));
    }
    return roundPower(Math.max(10, starValue + interpolateCurve(
      model.levelCurves[rarity],
      input.dragonLevel,
      model.extrapolationSlopes[rarity].dragonLevel,
    )));
  };
  const rare = within('Rare');
  const epic = Math.max(within('Epic'), rare);
  const legendary = Math.max(within('Legendary'), epic);
  return input.rarity === 'Legendary' ? legendary : input.rarity === 'Epic' ? epic : rare;
}

function interpolateCurve(points, input, extrapolationSlope) {
  const first = points[0];
  const last = points.at(-1);
  if (input <= first.input) return first.value - (first.input - input) * extrapolationSlope;
  if (input >= last.input) return last.value + (input - last.input) * extrapolationSlope;
  const upperIndex = points.findIndex((point) => point.input >= input);
  const lower = points[upperIndex - 1];
  const upper = points[upperIndex];
  const share = (input - lower.input) / (upper.input - lower.input);
  return lower.value + (upper.value - lower.value) * share;
}

function crossValidate(groups) {
  const actual = [];
  const predictions = [];
  for (const heldOut of groups) {
    const heldKeys = new Set(heldOut.map(observationTupleKey));
    const training = uniqueObservations.filter((row) => !heldKeys.has(observationTupleKey(row)));
    const model = fitAdditiveCurves(training);
    for (const observation of heldOut) {
      actual.push(observation);
      predictions.push(predictAdditiveCurves(model, observation));
    }
  }
  return { heldOutPredictionCount: actual.length, ...errorMetrics(actual, predictions) };
}

function fitLinearAdditive(observations) {
  const matrix = observations.map((observation) => rarities.flatMap((rarity) => {
    const indicator = observation.rarity === rarity ? 1 : 0;
    return [indicator, indicator * observation.dragonLevel, indicator * observation.starRank];
  }));
  return solveNormalEquations(matrix, observations.map((observation) => observation.displayedPower));
}

function predictLinearAdditive(coefficients, observation) {
  const rarityIndex = rarities.indexOf(observation.rarity) * 3;
  return coefficients[rarityIndex]
    + coefficients[rarityIndex + 1] * observation.dragonLevel
    + coefficients[rarityIndex + 2] * observation.starRank;
}

function frozenV1RuntimeEstimate(input, observations) {
  const within = (rarity) => {
    const coefficients = frozenV1.coefficients;
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
    return roundPower(Math.max(lower, Math.min(modeled, upper)));
  };
  const exact = observations.find((observation) => observationTupleKey(observation) === observationTupleKey(input));
  if (exact) return exact.displayedPower;
  const rare = within('Rare');
  const epic = Math.max(within('Epic'), rare);
  const legendary = Math.max(within('Legendary'), epic);
  return input.rarity === 'Legendary' ? legendary : input.rarity === 'Epic' ? epic : rare;
}

function auditRuntimeGrid() {
  const powers = [];
  let monotonicityViolations = 0;
  let rarityOrderViolations = 0;
  let invalidEstimateCount = 0;
  for (const rarity of rarities) {
    for (let starRank = 1; starRank <= 10; starRank += 1) {
      for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
        const current = runtimeGeneratedEstimate({ rarity, starRank, dragonLevel });
        powers.push(current);
        if (!Number.isFinite(current) || current <= 0 || current % 10 !== 0) invalidEstimateCount += 1;
        if (starRank < 10 && runtimeGeneratedEstimate({ rarity, starRank: starRank + 1, dragonLevel }) < current) monotonicityViolations += 1;
        if (dragonLevel < 1000 && runtimeGeneratedEstimate({ rarity, starRank, dragonLevel: dragonLevel + 1 }) < current) monotonicityViolations += 1;
      }
    }
  }
  for (let starRank = 1; starRank <= 10; starRank += 1) {
    for (let dragonLevel = 0; dragonLevel <= 1000; dragonLevel += 1) {
      const legendary = runtimeGeneratedEstimate({ rarity: 'Legendary', starRank, dragonLevel });
      const epic = runtimeGeneratedEstimate({ rarity: 'Epic', starRank, dragonLevel });
      const rare = runtimeGeneratedEstimate({ rarity: 'Rare', starRank, dragonLevel });
      if (legendary < epic || epic < rare) rarityOrderViolations += 1;
    }
  }
  return {
    ...supportedGrid,
    checkedEstimateCount: powers.length,
    invalidEstimateCount,
    monotonicityViolations,
    rarityOrderViolations,
    exactObservationMismatches: uniqueObservations.filter((observation) =>
      runtimeGeneratedEstimate(observation) !== observation.displayedPower,
    ).length,
    numericalGridFingerprint: fnv1a64(JSON.stringify(powers)),
  };
}

function repeatedDifferenceChecks(observations) {
  const power = (rarity, starRank, dragonLevel) => observations.find((row) =>
    row.rarity === rarity && row.starRank === starRank && row.dragonLevel === dragonLevel,
  )?.displayedPower;
  const difference = (rarity, leftStar, leftLevel, rightStar, rightLevel) =>
    power(rarity, rightStar, rightLevel) - power(rarity, leftStar, leftLevel);
  return {
    legendaryStar1To2At35: difference('Legendary', 1, 35, 2, 35),
    legendaryStar1To2At36: difference('Legendary', 1, 36, 2, 36),
    legendaryStar1To2At37: difference('Legendary', 1, 37, 2, 37),
    legendaryLevel35To36Star1: difference('Legendary', 1, 35, 1, 36),
    legendaryLevel35To36Star2: difference('Legendary', 2, 35, 2, 36),
    epicStar2To3At31: difference('Epic', 2, 31, 3, 31),
    epicStar2To3At32: difference('Epic', 2, 32, 3, 32),
    epicLevel31To32Star2: difference('Epic', 2, 31, 2, 32),
    epicLevel31To32Star3: difference('Epic', 3, 31, 3, 32),
    epicLevel36To37Star6: difference('Epic', 6, 36, 6, 37),
    rareStar3To4At29: difference('Rare', 3, 29, 4, 29),
    rareStar3To4At30: difference('Rare', 3, 30, 4, 30),
    rareStar3To4At31: difference('Rare', 3, 31, 4, 31),
    rareLevel30To31Star3: difference('Rare', 3, 30, 3, 31),
    rareLevel30To31Star4: difference('Rare', 4, 30, 4, 31),
    rareLevel30To31Star7: difference('Rare', 7, 30, 7, 31),
  };
}

function buildTransitionDeltaMetrics(observations, predictions) {
  const pairs = [];
  for (let left = 0; left < observations.length; left += 1) {
    for (let right = left + 1; right < observations.length; right += 1) {
      const a = observations[left];
      const b = observations[right];
      if (a.rarity !== b.rarity) continue;
      if (a.starRank !== b.starRank && a.dragonLevel !== b.dragonLevel) continue;
      const observedDelta = b.displayedPower - a.displayedPower;
      const predictedDelta = predictions[right] - predictions[left];
      pairs.push({ observedDelta, predictedDelta, error: predictedDelta - observedDelta });
    }
  }
  return {
    transitionCount: pairs.length,
    meanAbsoluteDeltaError: round(mean(pairs.map((pair) => Math.abs(pair.error))), 4),
    maximumAbsoluteDeltaError: round(Math.max(...pairs.map((pair) => Math.abs(pair.error))), 4),
  };
}

function assertGeneratedCurves(fitted) {
  if (JSON.stringify(fitted.starCurves) !== JSON.stringify(ESTIMATED_POWER_STAR_CURVES)
    || JSON.stringify(fitted.levelCurves) !== JSON.stringify(ESTIMATED_POWER_LEVEL_CURVES)
    || JSON.stringify(fitted.extrapolationSlopes) !== JSON.stringify(ESTIMATED_POWER_EXTRAPOLATION_SLOPES)) {
    throw new Error(`Generated curve artifact is stale. Fitted: ${JSON.stringify(fitted)}.`);
  }
}

function minimumPositiveStarSlope(components) {
  const slopes = components.flatMap((component) => component.starRanks.slice(1).map((starRank, index) => {
    const previous = component.starRanks[index];
    return (component.starComponents[String(starRank)] - component.starComponents[String(previous)])
      / (starRank - previous);
  })).filter((value) => value > 0);
  return slopes.length > 0 ? Math.min(...slopes) : undefined;
}

function minimumPositiveCurveSlope(points) {
  const slopes = points.slice(1).map((point, index) =>
    (point.value - points[index].value) / (point.input - points[index].input),
  ).filter((value) => value > 0);
  return slopes.length > 0 ? Math.min(...slopes) : undefined;
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
  return Object.fromEntries(groupBy(rows, keyFor).map((group) => [keyFor(group[0]), {
    count: group.length,
    meanResidual: round(mean(group.map((row) => row.residual)), 4),
    meanAbsoluteError: round(mean(group.map((row) => row.absoluteError)), 4),
    mapePercent: round(mean(group.map((row) => row.percentageError)), 6),
  }]));
}

function groupBy(values, keyFor) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFor(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return [...groups.entries()].sort(([left], [right]) => String(left).localeCompare(String(right))).map(([, group]) => group);
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

async function writeGeneratedIdentities(nextObservationHash, nextModelHash, nextGridFingerprint) {
  const path = `${repositoryRoot}/src/power/generatedDragonPowerModel.ts`;
  let source = await readFile(path, 'utf8');
  source = source
    .replace(/ESTIMATED_POWER_OBSERVATION_HASH = '[^']+'/, `ESTIMATED_POWER_OBSERVATION_HASH = '${nextObservationHash}'`)
    .replace(/ESTIMATED_POWER_MODEL_HASH = '[^']+'/, `ESTIMATED_POWER_MODEL_HASH = '${nextModelHash}'`)
    .replace(/ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT = '[^']+'/, `ESTIMATED_POWER_NUMERICAL_GRID_FINGERPRINT = '${nextGridFingerprint}'`);
  await writeFile(path, source);
}

function renderMarkdown(report) {
  const metrics = (value) => `MAE ${value.meanAbsoluteError}; MAPE ${value.mapePercent}%; max APE ${value.maximumAbsolutePercentageErrorPercent}%; RMSE ${value.rootMeanSquaredError}`;
  const components = rarities.flatMap((rarity) => report.supportGraph[rarity].components.map((component) =>
    `| ${rarity} | ${component.id} | ${component.starRanks.join(', ')} | ${component.dragonLevels.join(', ')} | ${component.edgeCount} | ${component.maximumAbsoluteResidual} | ${component.uniquelyIdentifiableAfterGauge ? 'Yes' : 'No'} |`,
  )).join('\n');
  const observations = report.observations.map((row) =>
    `| ${row.rarity} | ${row.starRank} | ${row.dragonLevel} | ${row.displayedPower} | ${row.provenance.join(', ')} | ${row.sampleCount} | ${row.fittedPower} | ${row.residual} |`,
  ).join('\n');
  return `# Estimated Dragon Power v2 audit

> Estimated Power is an unofficial empirical approximation. It is separate from Formation Rating and is not combat simulation.

- Model version: \`${report.modelVersion}\`
- Observation hash: \`${report.observationHash}\`
- Model hash: \`${report.modelHash}\`
- Numerical grid fingerprint: \`${report.numericalGridFingerprint}\`
- Observations: ${report.rawSampleCount} raw provenance samples; ${report.uniqueObservationCount} unique progression tuples.

## Candidate comparison

- Frozen v1 historical holdout (${report.historicalV1Benchmark.genuinelyNewUniqueCombinationCount} genuinely new tuples): ${metrics(report.historicalV1Benchmark.holdoutMetrics)}.
- Rarity-specific linear additive training: ${metrics(report.candidateModels[1].trainingMetrics)}; leave-one-unique-out: ${metrics(report.candidateModels[1].leaveOneUniqueCombinationOutMetrics)}.
- Selected rarity-specific additive curves training before exact override: ${metrics(report.selectedModel.trainingMetrics)}.
- Selected leave-one-unique-out: ${metrics(report.selectedModel.leaveOneUniqueCombinationOutMetrics)}.
- Selected leave-one-level-anchor-out: ${metrics(report.selectedModel.leaveOneLevelAnchorOutMetrics)}.
- Selected leave-one-Star-anchor-out: ${metrics(report.selectedModel.leaveOneStarAnchorOutMetrics)}.
- Selected leave-one-upgrade-endpoint-out: ${metrics(report.selectedModel.leaveOneUpgradeEndpointOutMetrics)}.

The additive curve family is selected because the support graph demonstrates exact Star-plus-Level structure while the linear candidate smooths away observed plateaus and nonuniform increments. Zero training error is structural fit, not evidence of generalization; the held-out metrics above are reported separately.

## Support graph and identifiability

| Rarity | Component | Stars | Levels | Edges | Max cycle residual | Unique after gauge |
| --- | --- | --- | --- | ---: | ---: | --- |
${components}

Legendary and Rare each form one connected component. Epic Star 1 at Levels 20-21 is disconnected from Epic Stars 2, 3, 4, and 6 at Levels 25-38. Therefore the absolute Epic Star 1 to Star 2 difference is not identified. The Tairax Star 1 Level 20 to Star 2 Level 25 change alters both variables and is not treated as an independent Star or Level rule.

## Frozen model

- Star curves: \`${JSON.stringify(report.selectedModel.starCurves)}\`
- Level curves: \`${JSON.stringify(report.selectedModel.levelCurves)}\`
- Epic bridge: infer +${report.selectedModel.completionRule.epicBridge.inferredStarRankGain} by copying the nearest directly identified adjacent Epic Star increment (Star 2 to 3). This implies +${report.selectedModel.completionRule.epicBridge.impliedLevel21To25Gain} across Levels 21 to 25 and is modeled inference, not an observed game rule.
- Bridge sensitivity: \`${JSON.stringify(report.selectedModel.completionRule.epicBridge.sensitivityAlternatives)}\`.
- Interpolation: deterministic piecewise-linear interpolation between frozen anchors.
- Extrapolation: below Level 20 scale the Level-20 total by \`max(1, level) / 20\`; otherwise use the smallest positive observed per-unit slope for that rarity and axis.
- Exact tuples: return observed Power with \`observed\` confidence.
- Confidence: non-exact tuples inside one connected support component are \`modeled\`; bridges and out-of-range values are \`low\`.
- Rounding and guards: nearest 10, positive monotone curves, then project Legendary >= Epic >= Rare.

## Structural validation

- Maximum additive residual: ${report.additiveChecks.maximumAdditiveResidual}.
- Transition deltas: ${report.transitionDeltaMetrics.transitionCount}; mean absolute error ${report.transitionDeltaMetrics.meanAbsoluteDeltaError}; maximum ${report.transitionDeltaMetrics.maximumAbsoluteDeltaError}.
- Full grid: ${report.gridChecks.checkedEstimateCount} estimates through Level 1000; ${report.gridChecks.invalidEstimateCount} invalid; ${report.gridChecks.monotonicityViolations} monotonicity violations; ${report.gridChecks.rarityOrderViolations} rarity-order violations.
- Exact observation mismatches: ${report.gridChecks.exactObservationMismatches}.
- Observation/model order reversal: ${report.validationChecks.observationOrderReversalMatches && report.validationChecks.modelOrderReversalMatches ? 'PASS' : 'FAIL'}.

## Observations and provenance

| Rarity | Stars | Level | Observed | Provenance | Samples | Raw curve | Residual |
| --- | ---: | ---: | ---: | --- | ---: | ---: | ---: |
${observations}
`;
}

function rejectsEstimate(input) { return !isValidProgression(input); }
function isValidProgression(input) { return rarities.includes(input.rarity) && Number.isInteger(input.starRank) && input.starRank >= 1 && input.starRank <= 10 && Number.isInteger(input.dragonLevel) && input.dragonLevel >= 0; }
function fnv1a64(value) { let hash = 0xcbf29ce484222325n; const prime = 0x100000001b3n; for (let index = 0; index < value.length; index += 1) { hash ^= BigInt(value.charCodeAt(index)); hash = BigInt.asUintN(64, hash * prime); } return `fnv1a64:${hash.toString(16).padStart(16, '0')}`; }
function roundPower(value) { return Math.round(value / 10) * 10; }
function mean(values) { return values.reduce((total, value) => total + value, 0) / values.length; }
function median(values) { const sorted = [...values].sort((a, b) => a - b); return sorted.length % 2 === 1 ? sorted[(sorted.length - 1) / 2] : mean(sorted.slice(sorted.length / 2 - 1, sorted.length / 2 + 1)); }
function round(value, digits) { return Number(value.toFixed(digits)); }
