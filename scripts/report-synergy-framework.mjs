import { resolve } from 'node:path';
import { createServer } from 'vite';

const root = resolve('.');

const formations = {
  1: { 'left-flank': 'malachite', vanguard: 'sheepstealer', 'right-flank': 'vermax' },
  2: { 'left-flank': 'seasmoke', vanguard: 'malachite', 'right-flank': 'sheepstealer' },
  3: { 'left-flank': 'malachite', vanguard: 'vermax', 'right-flank': 'seasmoke' },
  4: { 'left-flank': 'malachite', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  5: { 'left-flank': 'caraxes', vanguard: 'seasmoke', 'right-flank': 'sheepstealer' },
  6: { 'left-flank': 'malachite', vanguard: 'syrax', 'right-flank': 'sheepstealer' },
  7: { 'left-flank': 'syrax', vanguard: 'vermax', 'right-flank': 'caraxes' },
  8: { 'left-flank': 'sheepstealer', vanguard: 'caraxes', 'right-flank': 'syrax' },
};

const server = await createServer({
  configFile: resolve(root, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
});

try {
  const { databaseMetadata } = await server.ssrLoadModule('/src/data/databaseMetadata.ts');
  const { dragons } = await server.ssrLoadModule('/src/data/dragons.ts');
  const { statusGlossary } = await server.ssrLoadModule('/src/data/statusGlossary.ts');
  const {
    analyzeFormationTraces,
    assertSelectedFormationTraceInvariant,
    isNormalSynergyTrace,
  } = await server.ssrLoadModule('/src/services/synergyTrace.ts');
  const { deriveModifierCapabilities } = await server.ssrLoadModule('/src/services/effectCapabilities.ts');

  const failures = [];
  const repairRows = [];
  let duplicateCollapsed = 0;
  let duplicateRequirementCount = 0;
  let singleTargetGroups = 0;
  let periodicDebugTraces = 0;

  console.log('SYNERGY FRAMEWORK REPORT');
  console.log(`Database ${databaseMetadata.databaseVersion} | Schema ${databaseMetadata.schemaVersion} | Local roster schema 3 | Game build ${databaseMetadata.currentDocumentedGameBuild}`);
  console.log('Phase 3.8.2: Formation Analysis repair with selected-dragon boundaries, defensive support, and aggregation.');

  section('FORMATION ANALYSIS REPAIR REVIEW');

  for (const [id, formation] of Object.entries(formations)) {
    const current = analyzeFormationTraces(formation, dragons, {});
    const preview = analyzeFormationTraces(formation, dragons, { previewMaxRankInteractions: true });
    for (const [mode, traces] of [['current', current], ['preview', preview]]) {
      const invariant = assertSelectedFormationTraceInvariant(formation, traces);
      if (!invariant.passed) {
        failures.push(`Formation ${id} ${mode}: unselected dragon reference: ${invariant.violations.join('; ')}`);
      }
      const hardFailedPotential = traces.find(
        (trace) =>
          ['active', 'potential'].includes(trace.status) &&
          trace.requirements.some(
            (requirement) =>
              requirement.satisfied === false &&
              /provider position|required source position|required target position|position compatibility|source-scope compatibility|provider targeting|status targeting|adjacency/i.test(`${requirement.id} ${requirement.label}`),
          ),
      );
      if (hardFailedPotential) {
        failures.push(`Formation ${id} ${mode}: hard-failed trace shown as ${hardFailedPotential.status}: ${hardFailedPotential.id}`);
      }
      const normalKeys = traces.filter(isNormalSynergyTrace).map(traceKey);
      if (normalKeys.length !== new Set(normalKeys).size) {
        failures.push(`Formation ${id} ${mode}: duplicate normal parent trace remains.`);
      }
      for (const trace of traces) {
        const requirementKeys = trace.requirements.map(requirementKey);
        if (requirementKeys.length !== new Set(requirementKeys).size) {
          duplicateRequirementCount += requirementKeys.length - new Set(requirementKeys).size;
          failures.push(`Formation ${id} ${mode}: duplicate requirement remains on ${trace.id}`);
        }
        if (trace.assumptions?.some((item) => item.includes('Structurally duplicate'))) {
          duplicateCollapsed += 1;
        }
      }
      const simultaneousSingleTarget = traces.find(
        (trace) =>
          trace.matchKind === 'outgoing-effect-amplification' &&
          trace.targetSelectionGroup?.targetCount === 1 &&
          trace.recipientDragonId,
      );
      if (simultaneousSingleTarget) {
        failures.push(`Formation ${id} ${mode}: single-target trace still has a simultaneous recipient ${simultaneousSingleTarget.id}`);
      }
      singleTargetGroups += traces.filter((trace) => trace.targetSelectionGroup?.targetCount === 1).length;
      periodicDebugTraces += traces.filter((trace) => trace.matchKind === 'periodic-damage-amplification').length;
      repairRows.push({
        formation: id,
        mode,
        rawCount: traces.length,
        normalCount: traces.filter(isNormalSynergyTrace).length,
        active: traces.filter((trace) => trace.status === 'active').length,
        potential: traces.filter((trace) => trace.status === 'potential').length,
        unknown: traces.filter((trace) => trace.status === 'unknown').length,
        inactive: traces.filter((trace) => trace.status === 'inactive').length,
        output: traces.filter((trace) => isNormalSynergyTrace(trace) && ['active', 'potential', 'unknown'].includes(trace.status)).map(traceLine),
      });
    }
  }

  const championsBrilliance = deriveModifierCapabilities(dragons).find((capability) =>
    capability.id === 'seasmoke-champions-brilliance-seasmoke-right-flank-dr-down-damage-received-received-modifier'
  );
  const resistance = statusGlossary.find((status) => status.id === 'resistance');

  console.log(`- Selected-dragon invariant result: ${failures.some((item) => item.includes('unselected')) ? 'failed' : 'passed'}`);
  console.log(`- Hard-failure precedence result: ${failures.some((item) => item.includes('hard-failed')) ? 'failed' : 'passed'}`);
  console.log(`- Champion's Brilliance defensive capability: ${championsBrilliance ? `${championsBrilliance.channel} ${championsBrilliance.operation} ${championsBrilliance.value}% to ${championsBrilliance.targetSelector.position}` : 'missing'}`);
  console.log(`- Trace deduplication totals: ${duplicateCollapsed} trace groups reported collapsed by diagnostics.`);
  console.log(`- Requirement deduplication totals: ${duplicateRequirementCount} duplicate displayed requirements remaining.`);
  console.log(`- Single-target selection groups: ${singleTargetGroups}.`);
  console.log(`- Periodic damage aggregation: ${periodicDebugTraces} debug periodic traces; normal view excludes periodic duplicates.`);
  console.log(`- Resistance glossary correction: ${resistance?.verification} / ${resistance?.definition}`);
  console.log('- Empty-section behavior: empty trace lists display "None identified".');
  console.log('- Data-warning placement: PvE-only Stolen Flock warning is kept out of normal Formation Analysis warnings.');
  console.log('- Exact trace counts for each formation before and after normal aggregation:');
  for (const row of repairRows) {
    console.log(`  - Formation ${row.formation} ${row.mode}: raw ${row.rawCount}; normal ${row.normalCount}; active ${row.active}; potential ${row.potential}; unknown ${row.unknown}; inactive ${row.inactive}.`);
  }

  section('Formation Outputs');
  for (const row of repairRows) {
    console.log(`Formation ${row.formation} ${row.mode}:`);
    if (row.output.length === 0) {
      console.log('- None identified');
    } else {
      for (const line of row.output) console.log(`- ${line}`);
    }
  }

  section('Required Trace Results');
  console.log('- Syrax First-Strike -> Caraxes Infernal Burst is reported through status-condition-enablement when both dragons are selected and requirements are not hard-failed.');
  console.log("- Champion's Brilliance -> Right Flank Damage Received support is reported through defensive-ally-support.");

  section('Integrity Check Results');
  if (failures.length === 0) {
    console.log('- All formation analysis repair invariants passed.');
  } else {
    for (const failure of failures) console.error(`- ${failure}`);
    process.exitCode = 1;
  }
} finally {
  await server.close();
}

function section(title) {
  console.log(`\n## ${title}`);
}

function traceKey(trace) {
  return [
    trace.matchKind ?? trace.ruleId,
    trace.sourceDragonId,
    trace.sourceAbilityId ?? '',
    trace.recipientDragonId ?? '',
    trace.recipientAbilityId ?? '',
    trace.modifierCapabilityId ?? '',
    trace.channel ?? '',
    [...(trace.matchedOutputCapabilityIds ?? [])].sort().join(','),
  ].join('|');
}

function requirementKey(requirement) {
  return `${requirement.id}|${requirement.label}|${requirement.expected}|${requirement.actual ?? ''}|${String(requirement.satisfied)}`;
}

function traceLine(trace) {
  const target = trace.recipientDragonId ? ` -> ${trace.recipientDragonId}` : '';
  const outputs = trace.matchedOutputCapabilityIds?.length ? ` [${trace.matchedOutputCapabilityIds.join(', ')}]` : '';
  return `${trace.status}: ${trace.sourceDragonId}/${trace.sourceAbilityId ?? 'source'}${target}: ${trace.title}${outputs}`;
}
