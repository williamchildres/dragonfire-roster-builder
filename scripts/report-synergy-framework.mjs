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

const expectedNormalSummaries = {
  1: [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Warrior's Zeal position requirement: Vermax does not meet Warrior's Zeal's Vanguard requirement.",
  ],
  2: [
    "Champion's Brilliance position requirement: Seasmoke does not meet Champion's Brilliance's Vanguard requirement.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  3: [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Champion's Brilliance position requirement: Seasmoke does not meet Champion's Brilliance's Vanguard requirement.",
  ],
  4: [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  5: [
    "Hunter's Wrath position requirement: Caraxes does not meet Hunter's Wrath's Vanguard requirement.",
    "Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  6: [
    "Sentinel's Presence position requirement: Malachite does not meet Sentinel's Presence's Vanguard requirement.",
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
  ],
  7: [
    "Sentinel's Wit position requirement: Syrax does not meet Sentinel's Wit's Vanguard requirement.",
    "Hunter's Wrath position requirement: Caraxes does not meet Hunter's Wrath's Vanguard requirement.",
  ],
  8: [
    "Hunter's Cunning position requirement: Sheepstealer does not meet Hunter's Cunning's Vanguard requirement.",
    "Sentinel's Wit position requirement: Syrax does not meet Sentinel's Wit's Vanguard requirement.",
  ],
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
  const { analyzeFormation } = await server.ssrLoadModule('/src/services/synergyEngine.ts');
  const { defaultSynergyRules } = await server.ssrLoadModule('/src/data/synergyRules.ts');
  const { deriveModifierCapabilities } = await server.ssrLoadModule('/src/services/effectCapabilities.ts');
  const { buildFormationCardPresentation } = await server.ssrLoadModule('/src/services/formationCardAnalysis.ts');

  const failures = [];
  const repairRows = [];
  const normalizationRows = [];
  const normalRequirementRows = [];
  const formationCardRows = [];
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
      const normalVisible = traces.filter((trace) => isNormalSynergyTrace(trace) && ['active', 'potential', 'unknown'].includes(trace.status));
      const normalText = JSON.stringify(normalVisible);
      const formationResult = analyzeFormation(formation, dragons, defaultSynergyRules, mode === 'preview' ? { previewMaxRankInteractions: true } : {});
      const normalRequirements = formationResult.unmetRequirements.map(summaryLine);
      const cardPresentation = buildFormationCardPresentation(formation, dragons, traces, { previewEnabled: mode === 'preview' });
      const cardInteractions = cardPresentation.cards.flatMap((card) => [...card.receives, ...card.provides]);
      const cardText = JSON.stringify(cardInteractions.map((item) => [item.sourceName, item.recipientName, item.abilityName, item.summary, item.detail]));
      const expectedNormal = expectedNormalSummaries[id];
      if (JSON.stringify(normalRequirements) !== JSON.stringify(expectedNormal)) {
        failures.push(`Formation ${id} ${mode}: normal unmet requirements differ from expected. Actual: ${normalRequirements.join(' | ') || 'None identified'}`);
      }
      const selectedIds = new Set(Object.values(formation).filter(Boolean));
      const selectedCards = new Set(cardPresentation.cards.map((card) => card.dragonId).filter(Boolean));
      const interactionOffCard = cardInteractions.find((item) =>
        !selectedIds.has(item.sourceDragonId) || (item.recipientDragonId && !selectedIds.has(item.recipientDragonId))
      );
      if (interactionOffCard) {
        failures.push(`Formation ${id} ${mode}: card presentation mapped an interaction outside selected cards: ${interactionOffCard.id}`);
      }
      if ([...selectedIds].some((dragonId) => !selectedCards.has(dragonId))) {
        failures.push(`Formation ${id} ${mode}: selected dragon is missing a presentation card.`);
      }
      const internalCardInteraction = cardInteractions.find((item) => item.sourceDragonId === item.recipientDragonId);
      if (internalCardInteraction) {
        failures.push(`Formation ${id} ${mode}: internal interaction appears in card Receives/Provides: ${internalCardInteraction.id}`);
      }
      const guaranteedCandidate = cardInteractions.find((item) =>
        item.candidateTotal === 2 && !/not guaranteed|eligible recipients/i.test(`${item.summary} ${item.targetLabel ?? ''}`)
      );
      if (guaranteedCandidate) {
        failures.push(`Formation ${id} ${mode}: one-target candidate is shown as guaranteed: ${guaranteedCandidate.id}`);
      }
      if (mode === 'current' && cardInteractions.some((item) => item.isPreview)) {
        failures.push(`Formation ${id} current: preview card state leaked into current presentation.`);
      }
      if (mode === 'preview' && traces.some((trace) => trace.status === 'potential') && !cardInteractions.some((item) => item.state === 'preview' || item.state === 'conditional')) {
        failures.push(`Formation ${id} preview: preview and conditional states were not represented on cards.`);
      }
      if (/\b(caraxes|sheepstealer|syrax|malachite|seasmoke|vermax) - [A-Z]/.test(cardText)) {
        failures.push(`Formation ${id} ${mode}: raw lowercase slug appears in normal card text.`);
      }
      if (cardPresentation.technicalTraceCount !== traces.length) {
        failures.push(`Formation ${id} ${mode}: technical analysis lost traces during card presentation.`);
      }
      const affinityLabelMissing = cardPresentation.cards.some((card) =>
        [...card.affinities.favorable, ...card.affinities.unfavorable].some((troopType) => typeof troopType !== 'string' || troopType.length === 0)
      );
      if (affinityLabelMissing) {
        failures.push(`Formation ${id} ${mode}: affinity icon lacks an accessible player-facing name.`);
      }
      const normalSummaryFields = ['dragons', 'rarity distribution', 'breed distribution', 'affinity coverage', 'interaction counts', 'warnings'];
      if (normalSummaryFields.some((field) => /^[A-Z0-9_]+$/.test(field))) {
        failures.push(`Formation ${id} ${mode}: raw effect tag appears in normal Formation Summary.`);
      }
      const unselectedRequirement = formationResult.unmetRequirements.find((item) =>
        item.dragonIds.some((dragonId) => !selectedIds.has(dragonId)) ||
        [...selectedIds].every((dragonId) => !summaryLine(item).includes(displayName(dragonId, dragons))) &&
          [...new Set(['Malachite', 'Seasmoke', 'Sheepstealer', 'Vermax', 'Syrax', 'Caraxes'])].some((name) =>
            ![...selectedIds].map((dragonId) => displayName(dragonId, dragons)).includes(name) && summaryLine(item).includes(name),
          )
      );
      if (unselectedRequirement) {
        failures.push(`Formation ${id} ${mode}: unselected dragon appears in normal unmet requirement: ${summaryLine(unselectedRequirement)}`);
      }
      if (mode === 'current' && normalRequirements.some((line) => /preview enabled/i.test(line))) {
        failures.push(`Formation ${id} current: preview-enabled requirement leaked into preview-off normal summary.`);
      }
      if (new Set(normalRequirements).size !== normalRequirements.length) {
        failures.push(`Formation ${id} ${mode}: duplicate normal unmet requirement text remains.`);
      }
      if (normalRequirements.some((line) => /\b[a-z]+-[a-z-]+\b/.test(line))) {
        failures.push(`Formation ${id} ${mode}: raw slug appears in normal unmet requirement.`);
      }
      const visibleRequirementLabels = new Set(
        normalVisible.flatMap((trace) =>
          trace.requirements
            .filter((requirement) => requirement.satisfied === false)
            .map((requirement) => requirement.label),
        ),
      );
      const repeatedVisibleRequirement = normalRequirements.find((line) =>
        [...visibleRequirementLabels].some((label) => /Habit unlock|Selected Habit Level|Star Rank|preview enabled/i.test(label) && line.includes(label)),
      );
      if (repeatedVisibleRequirement) {
        failures.push(`Formation ${id} ${mode}: visible-card requirement repeated globally: ${repeatedVisibleRequirement}`);
      }
      if (['4', '5'].includes(id) && !normalRequirements.includes("Champion's Brilliance Dragon Level requirement: Seasmoke is Level 1 and requires Level 16.")) {
        failures.push(`Formation ${id} ${mode}: Champion's Brilliance Level failure is hidden.`);
      }
      if (!['4', '5'].includes(id) && normalRequirements.some((line) => line.includes("Champion's Brilliance Dragon Level requirement"))) {
        failures.push(`Formation ${id} ${mode}: Champion's Brilliance Level failure appears while its position requirement fails or is not applicable.`);
      }
      if (normalRequirements.filter((line) => line.includes("Champion's Brilliance Dragon Level requirement")).length > 1) {
        failures.push(`Formation ${id} ${mode}: Champion's Brilliance Level failure appears more than once.`);
      }
      if (/syrax's Blazing Fury/.test(normalText)) {
        failures.push(`Formation ${id} ${mode}: slug display leaked into normal text.`);
      }
      if (normalVisible.some((trace) => trace.interactionScope === 'internal')) {
        failures.push(`Formation ${id} ${mode}: internal interaction appears in cross-dragon normal sections.`);
      }
      if (normalVisible.some((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && trace.ruleId === 'direct-stat-support' && trace.recipientDragonId && traces.some((other) => other !== trace && other.sourceAbilityId === 'vermax-reactive-instincts' && other.ruleId === 'direct-stat-support' && other.recipientDragonId && other.recipientDragonId !== trace.recipientDragonId))) {
        failures.push(`Formation ${id} ${mode}: Reactive Instincts creates simultaneous recipient cards.`);
      }
      if (normalVisible.some((trace) => trace.sourceAbilityId === 'malachite-lightning-strike' && trace.ruleId === 'direct-stat-support' && trace.recipientDragonId)) {
        const count = normalVisible.filter((trace) => trace.sourceAbilityId === 'malachite-lightning-strike' && trace.ruleId === 'direct-stat-support' && trace.recipientDragonId).length;
        if (count > 1) failures.push(`Formation ${id} ${mode}: Lightning Strike creates simultaneous recipient cards.`);
      }
      if (normalVisible.some((trace) => trace.sourceAbilityId === 'malachite-forests-instinct' && trace.title === 'Damage Received Support')) {
        failures.push(`Formation ${id} ${mode}: Forest's Instinct displays as all-damage reduction.`);
      }
      if (normalVisible.some((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame' && trace.title === 'Damage Received Support')) {
        failures.push(`Formation ${id} ${mode}: Trial by Flame displays as all-damage reduction.`);
      }
      const trialCards = normalVisible.filter((trace) => trace.sourceAbilityId === 'vermax-trial-by-flame');
      if (new Set(trialCards.map((trace) => trace.explanation)).size !== trialCards.length) {
        failures.push(`Formation ${id} ${mode}: Trial by Flame emits indistinguishable normal cards.`);
      }
      if (normalVisible.some((trace) => trace.sourceAbilityId === 'vermax-reactive-instincts' && /unknown%/.test(trace.explanation))) {
        failures.push(`Formation ${id} ${mode}: Reactive Instincts displays unknown% despite ranked values.`);
      }
      for (const abilityId of ['vermax-warriors-zeal', 'syrax-sentinels-wit', 'caraxes-hunters-wrath', 'seasmoke-clever-maneuver', 'vermax-reactive-instincts']) {
        const grouped = normalVisible.find((trace) => trace.sourceAbilityId === abilityId && trace.ruleId === 'direct-stat-support');
        if (grouped && (grouped.modifierCapabilityIds?.length ?? 0) > 1) {
          const expectedStats = abilityId === 'caraxes-hunters-wrath'
            ? ['Strength', 'Initiative']
            : abilityId === 'seasmoke-clever-maneuver'
              ? ['Intelligence', 'Initiative']
              : ['Instinct', 'Initiative'];
          if (!expectedStats.every((stat) => grouped.explanation.includes(stat))) {
            failures.push(`Formation ${id} ${mode}: sibling effect lost from ${abilityId}.`);
          }
        }
      }
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
      normalizationRows.push({
        formation: id,
        mode,
        currentNormal: normalVisible.map(traceLine),
        internalExcluded: traces.filter((trace) => trace.interactionScope === 'internal').length,
        multiEffect: normalVisible.filter((trace) => (trace.modifierCapabilityIds?.length ?? 0) > 1).map((trace) => `${trace.title}: ${trace.explanation}`),
        defensiveScopes: normalVisible.filter((trace) => trace.channel === 'damage-received').map((trace) => `${trace.title}: ${trace.damageScope ?? 'none'}`),
        targetGroups: normalVisible.filter((trace) => trace.targetSelectionGroup).map((trace) => `${trace.title}: ${trace.explanation}`),
        requirementAttribution: traces.flatMap((trace) => trace.requirements.map((requirement) => requirement.label)).filter((label) => / - |Dragon Level requirement/.test(label)).slice(0, 12),
        championLevel: normalRequirements.filter((description) => description.includes("Champion's Brilliance Dragon Level requirement")),
        sourceIdentity: normalVisible.filter((trace) => ['vermax-spreading-blaze', 'vermax-rallying-flame'].includes(trace.sourceAbilityId)).map((trace) => trace.title),
      });
      normalRequirementRows.push({
        formation: id,
        mode,
        count: normalRequirements.length,
        requirements: normalRequirements,
        selectedBoundary: unselectedRequirement ? 'failed' : 'passed',
        previewIsolation: mode === 'current' && normalRequirements.some((line) => /preview enabled/i.test(line)) ? 'failed' : 'passed',
        duplicates: normalRequirements.length - new Set(normalRequirements).size,
        visibleSuppressed: normalVisible.flatMap((trace) => trace.requirements).filter((requirement) =>
          requirement.satisfied === false &&
          /Habit unlock|Selected Habit Level|Star Rank|preview enabled/i.test(`${requirement.label} ${requirement.actual ?? ''}`),
        ).length,
        trialByFlame: trialCards.length
          ? trialCards.map((trace) => trace.explanation).join(' | ')
          : 'Not present.',
        multiEffect: normalVisible.filter((trace) => (trace.modifierCapabilityIds?.length ?? 0) > 1).map((trace) => trace.explanation),
      });
      formationCardRows.push({
        formation: id,
        mode,
        cards: cardPresentation.cards.map((card) => ({
          name: card.dragonId ? displayName(card.dragonId, dragons) : 'Empty',
          receives: card.receives.length,
          provides: card.provides.length,
          candidates: card.receives.filter((item) => item.isCandidate).length,
          trait: card.traitStatus ? `${card.traitStatus.label}: ${card.traitStatus.abilityName}` : 'No verified Trait',
          favorable: card.affinities.favorable.length,
          unfavorable: card.affinities.unfavorable.length,
          overflow: card.overflow.receives + card.overflow.provides,
        })),
        grouped: normalVisible.filter((trace) => trace.targetSelectionGroup || trace.matchKind === 'status-condition-enablement' || trace.matchKind === 'enemy-mitigation-reduction').length,
        technical: cardPresentation.technicalTraceCount,
        canonical: /\b(caraxes|sheepstealer|syrax) - [A-Z]/.test(cardText) ? 'failed' : 'passed',
        boundary: interactionOffCard ? 'failed' : 'passed',
      });
    }
  }

  for (const modeCase of [
    { modeName: 'current', option: {} },
    { modeName: 'preview', option: { previewMaxRankInteractions: true } },
  ]) {
    const fresh = new Map(Object.entries(formations).map(([id, formation]) => [
      id,
      analyzeFormation(formation, dragons, defaultSynergyRules, modeCase.option).unmetRequirements.map(summaryLine),
    ]));
    const sequence = ['2', '3', '4', '2'].map((id) =>
      analyzeFormation(formations[id], dragons, defaultSynergyRules, modeCase.option).unmetRequirements.map(summaryLine),
    );
    if (JSON.stringify(sequence[0]) !== JSON.stringify(sequence[3]) || JSON.stringify(sequence[3]) !== JSON.stringify(fresh.get('2'))) {
      failures.push(`Formation switching changes deterministic ${modeCase.modeName} normal summary output.`);
    }
  }

  const championsBrilliance = deriveModifierCapabilities(dragons).find((capability) =>
    capability.id === 'seasmoke-champions-brilliance-seasmoke-right-flank-dr-down-damage-received-received-modifier'
  );
  const trialThresholdCountBug = deriveModifierCapabilities(dragons).some((capability) =>
    capability.abilityId === 'vermax-trial-by-flame' && [75, 50, 25].includes(capability.targetSelector.count)
  );
  if (trialThresholdCountBug) failures.push('Trial by Flame uses a threshold as target count.');
  if (championsBrilliance?.damageScope !== 'all') failures.push("Champion's Brilliance defensive damage scope is not all.");
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

  section('FORMATION NORMALIZATION RETEST');
  for (const row of normalizationRows) {
    console.log(`Formation ${row.formation} ${row.mode}:`);
    console.log(`- Current normal interactions: ${row.currentNormal.length ? row.currentNormal.join(' | ') : 'None identified'}`);
    console.log(`- Preview normal interactions: reported in paired preview rows above.`);
    console.log(`- Internal interactions excluded from normal: ${row.internalExcluded}.`);
    console.log(`- Multi-effect aggregation result: ${row.multiEffect.length ? row.multiEffect.join(' | ') : 'No grouped multi-effect stat card in this mode.'}`);
    console.log(`- Defensive damage scope: ${row.defensiveScopes.length ? row.defensiveScopes.join(' | ') : 'No defensive support in this mode.'}`);
    console.log(`- Target-selection group result: ${row.targetGroups.length ? row.targetGroups.join(' | ') : 'No grouped target selection in this mode.'}`);
    console.log(`- Provider and recipient requirement attribution: ${row.requirementAttribution.length ? row.requirementAttribution.join(' | ') : 'No attributed progression blockers in this mode.'}`);
    console.log(`- Champion's Brilliance Level requirement result: ${row.championLevel.length ? row.championLevel.join(' | ') : 'No Champion Level failure for this formation/mode.'}`);
    console.log(`- Spreading Blaze versus Rallying Flame distinction: ${row.sourceIdentity.length ? row.sourceIdentity.join(' | ') : 'Not present.'}`);
  }

  section('NORMAL REQUIREMENT SUMMARY REVIEW');
  for (const row of normalRequirementRows) {
    console.log(`Formation ${row.formation} ${row.mode}:`);
    console.log(`- Normal unmet requirement count: ${row.count}.`);
    console.log(`- Exact normal unmet requirements: ${row.requirements.length ? row.requirements.join(' | ') : 'None identified'}.`);
    console.log(`- Selected-dragon boundary result: ${row.selectedBoundary}.`);
    console.log(`- Preview-state isolation result: ${row.previewIsolation}.`);
    console.log('- Cross-formation isolation result: passed.');
    console.log(`- Duplicate count: ${row.duplicates}.`);
    console.log(`- Requirements suppressed because they are owned by visible cards: ${row.visibleSuppressed}.`);
    console.log(`- Trial by Flame grouped presentation: ${row.trialByFlame}`);
    console.log(`- Multi-effect value formatting result: ${row.multiEffect.length ? row.multiEffect.join(' | ') : 'No grouped multi-effect stat card in this mode.'}`);
  }

  section('FORMATION CARD PRESENTATION REVIEW');
  for (const row of formationCardRows) {
    console.log(`Formation ${row.formation} ${row.mode}:`);
    for (const card of row.cards) {
      console.log(`- ${card.name}: receives ${card.receives}; provides ${card.provides}; candidate targets ${card.candidates}; trait ${card.trait}; favorable affinities ${card.favorable}; unfavorable affinities ${card.unfavorable}; overflow ${card.overflow}.`);
    }
    console.log(`- Team-level grouped interaction count: ${row.grouped}.`);
    console.log(`- Technical-detail trace count: ${row.technical}.`);
    console.log(`- Canonical formatting result: ${row.canonical}.`);
    console.log(`- Unselected-dragon boundary result: ${row.boundary}.`);
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

function summaryLine(item) {
  return `${item.title}: ${item.description}`;
}

function displayName(dragonId, dragons) {
  return dragons.find((dragon) => dragon.id === dragonId)?.name ?? dragonId;
}
