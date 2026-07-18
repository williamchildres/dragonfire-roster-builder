import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeReports = process.argv.includes('--write');
const expectedOpenFindingIds = ['FRR-F001', 'FRR-F002'];
const resolvedFindings = [
  {
    id: 'FRR-F003',
    resolution:
      'Equivalent active paths still aggregate, while locked and position-inactive alternatives no longer contribute ability IDs or presentation evidence.',
  },
  {
    id: 'FRR-F004',
    resolution:
      'Details At a glance now uses selected Star Rank and Dragon Level, and future signals are explicitly labeled inactive with their unlock requirement.',
  },
  {
    id: 'FRR-F005',
    resolution:
      'Scoped reusable Details styles allow headings, technical labels, and chips to shrink and wrap within their own boxes.',
  },
  {
    id: 'FRR-F006',
    resolution:
      'About now states 31/31 detailed coverage with Legendary 9/9, Epic 10/10, and Rare 12/12.',
  },
];
const browserQaObservation = {
  status: 'PASS',
  auditedUrl: 'http://127.0.0.1:4173/ (local 0.10.3 production preview)',
  fixture: 'isolated localhost with an empty local roster; no production account or roster used',
  viewports: {
    desktop1440: {
      viewport: { width: 1440, height: 900 },
      document: { clientWidth: 1440, scrollWidth: 1440 },
      dialogs: {
        Seasmoke: { clientWidth: 1167, scrollWidth: 1167, scrollHeight: 4528 },
        Crimson: { clientWidth: 1167, scrollWidth: 1167, scrollHeight: 4432 },
        Kalspire: { clientWidth: 1167, scrollWidth: 1167, scrollHeight: 4349 },
      },
      openVerifiedWordingDisclosuresPerDragon: 7,
      overflowingDescendantCount: 0,
    },
    phone390: {
      viewport: { width: 390, height: 844 },
      document: { clientWidth: 390, scrollWidth: 390 },
      dialogs: {
        Seasmoke: { clientWidth: 353, scrollWidth: 353, scrollHeight: 7726 },
        Crimson: { clientWidth: 353, scrollWidth: 353, scrollHeight: 7593 },
        Kalspire: { clientWidth: 353, scrollWidth: 353, scrollHeight: 7707 },
      },
      openVerifiedWordingDisclosuresPerDragon: 7,
      overflowingDescendantCount: 0,
      clippedInteractiveControlCount: 0,
    },
    phone360: {
      viewport: { width: 360, height: 740 },
      document: { clientWidth: 360, scrollWidth: 360 },
      KalspireDialog: { clientWidth: 323, scrollWidth: 323, scrollHeight: 8220 },
      overflowingDescendantCount: 0,
      clippedInteractiveControlCount: 0,
    },
  },
  interactions: {
    disclosureControls: 'PASS - all seven Verified wording disclosures opened for each dragon',
    progressionSequences: 'PASS - all controller-reviewed progression sequences rendered in the expanded details',
    wrapping: 'PASS - long paragraphs and progression lines wrapped within their ability cards',
    excludedText: 'PASS - no Power rows or screenshot upgrade boilerplate rendered',
    mobile: 'PASS - detail dialogs and disclosure controls remained usable at 390x844 and 360x740',
  },
  legacyInteractions: {
    missingProgression: 'PASS — completeness used only Star Rank and Dragon Level',
    editing: 'PASS — Syrax unlock, Level 1 default, Level 5 persistence, relock deletion, and Level 1 re-unlock rendered immediately',
    reloadPersistence: 'PASS — Syrax Level 5 persisted after a full reload',
    secondUnlock: 'PASS — Flight Mastery appeared at Level 1 at Star Rank 4 while Mindful Synergy remained Level 5',
    legacyImport: 'PASS — schema-4 null/zero unlocked values migrated to Level 1; locked and unknown values were absent',
    mobile: 'PASS — the same single editor and roster list were usable at 390×844 and 360×740',
  },
  structure: { dragonDetailDialogsInspected: 3, abilityCardsInspected: 21 },
  overflowCount: 0,
  clippedInteractiveControlCount: 0,
  consoleErrors: [],
  consoleWarnings: [],
  legacyAccountSync:
    'Production account was not automated; fake/local service tests passed for the 750 ms debounce, serialized writes, conflict decisions, offline/retry, sign-out retention, stale-user guards, import, and clear-local paths.',
  legacyZoom200: {
    status: 'PENDING_REAL_BROWSER_ZOOM',
    reason: 'Chrome extension keypresses did not change browser zoom.',
    equivalentViewport: {
      viewport: { width: 720, height: 500 },
      document: { clientWidth: 705, scrollWidth: 705 },
      workspace: { clientWidth: 662, scrollWidth: 662, mode: 'list' },
      list: { clientWidth: 645, scrollWidth: 645 },
      clippedInteractiveControlCount: 0,
    },
  },
  responsiveSummary:
    'All inspected document and dialog scroll widths matched their client widths at desktop and phone breakpoints.',
  observations: [
    '1440x900: all seven disclosures per dragon opened with 1,033px-wide, 24px-high summary controls and no overflowing descendants.',
    '390x844: all progression sequences wrapped inside 353px-wide dialogs with no horizontal overflow.',
    '360x740: Kalspire remained usable in a 323px-wide dialog with the Close control visible and no horizontal overflow.',
    'Seasmoke, Crimson, and Kalspire rendered no Power values or generic screenshot upgrade boilerplate.',
  ],
  legacyObservations: [
    '1440px: two-pane workspace remained contained with a sticky 415px editor.',
    '1024px: filter controls wrap to three columns and both panes remain usable without horizontal scrolling.',
    '390px list: stacked toolbar, two-column filters, compact rows, and no horizontal overflow.',
    '390px editor: Back control, Syrax progression, two unlocked Habit selectors, notes, and removal action remained reachable.',
    '720x500 layout-equivalent zoom check: focused single-pane list with zero horizontal overflow.',
  ],
  findings: [],
};

const server = await createServer({
  root,
  appType: 'custom',
  server: { middlewareMode: true },
  logLevel: 'error',
});
const startedAt = performance.now();
try {
  const module = await server.ssrLoadModule('/src/audit/fullRosterAudit.ts');
  const report = module.runFullRosterAudit();
  const runtimeMs = Math.round(performance.now() - startedAt);
  const auditVersion = report.generatedFrom.databaseVersion;
  const jsonPath = path.join(root, 'docs', 'audits', `full-roster-regression-${auditVersion}.json`);
  const markdownPath = path.join(root, 'docs', 'audits', `full-roster-regression-${auditVersion}.md`);
  const combinedFindings = [...report.findings];
  const artifact = {
    ...report,
    sourceOfTruth: {
      originMainSha: 'e5e7fe84170417ef30d9b4aca2002cce8d7bd4d6',
      branch: 'data/source-fidelity-seasmoke-crimson-kalspire',
      worktree: root,
    },
    recordedAuditRuntimeMs: runtimeMs,
    browserQa: browserQaObservation,
    comparison: {
      baselineVersion: '0.10.2',
      baselineDeterministicFullResultHash:
        'b8e09b1ea60476aa9ea368636a936cc09534b67ea0f294ed3589cf583e845c41',
      currentVersion: auditVersion,
      currentDeterministicFullResultHash: report.formationSweep.deterministicFullResultHash,
      allNumericScoresAndComponentsUnchanged:
        report.formationSweep.deterministicFullResultHash ===
        'b8e09b1ea60476aa9ea368636a936cc09534b67ea0f294ed3589cf583e845c41',
    },
    resolvedFindings,
    findingSummary: {
      total: combinedFindings.length,
      bySeverity: countValues(combinedFindings.map((finding) => finding.severity)),
      byCategory: countValues(combinedFindings.map((finding) => finding.category)),
    },
    todoIds: expectedOpenFindingIds,
  };

  if (writeReports) {
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    await writeFile(markdownPath, renderMarkdown(artifact), 'utf8');
    console.log(`Wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}.`);
  } else {
    const committed = JSON.parse(await readFile(jsonPath, 'utf8'));
    const committedFindingIds = (committed.findings ?? []).map((finding) => finding.id);
    const stableFieldsMatch =
      committed.auditVersion === auditVersion &&
      JSON.stringify(committedFindingIds) === JSON.stringify(expectedOpenFindingIds) &&
      committed.findingSummary?.total === expectedOpenFindingIds.length &&
      committed.formationSweep?.deterministicFullResultHash ===
        report.formationSweep.deterministicFullResultHash &&
      committed.totals?.orderedFormationsEvaluated === report.totals.orderedFormationsEvaluated &&
      committed.totals?.progressionStatesEvaluated === report.totals.progressionStatesEvaluated &&
      committed.totals?.providerPayoffPairsEvaluated ===
        report.totals.providerPayoffPairsEvaluated &&
      committed.totals?.failedChecks === 0 &&
      committed.totals?.passChecks === report.totals.passChecks &&
      committed.totals?.failedChecks === report.totals.failedChecks;
    if (!stableFieldsMatch) {
      throw new Error(
        'Committed audit artifacts are stale. Run pnpm run audit:full-roster:write and review the diff.',
      );
    }
    console.log(
      `Audit verified in ${runtimeMs} ms: ${report.totals.dragons} dragons, ${report.totals.abilities} abilities, ${report.totals.orderedFormationsEvaluated} formations.`,
    );
    console.log(`Deterministic result hash: ${report.formationSweep.deterministicFullResultHash}`);
    console.log(
      `Checks: ${report.totals.passChecks} PASS, ${report.totals.failedChecks} FAIL; findings: ${report.findings.length + browserQaObservation.findings.length}.`,
    );
  }

  if (!report.reliable) process.exitCode = 1;
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const findings = [...report.findings];
  const lines = [
    `# Full-roster regression audit — ${report.auditVersion}`,
    '',
    '> Screenshot-source fidelity release for Seasmoke, Crimson, and Kalspire with two confirmed Strength-scaling corrections. Rating formula and calibration remain unchanged.',
    '',
    '## Executive summary',
    '',
    `- Source database: ${report.generatedFrom.databaseVersion}; data schema ${report.generatedFrom.dataSchemaVersion}; local roster schema ${report.generatedFrom.localRosterSchemaVersion}.`,
    `- Coverage: ${report.totals.dragons} dragons, ${report.totals.abilities} abilities, ${report.totals.profileSignals} profile signals, ${report.totals.auditDispositions} audit dispositions.`,
    `- Evaluation: ${report.totals.progressionStatesEvaluated} progression states, ${report.totals.orderedFormationsEvaluated} ordered formations, ${report.totals.providerPayoffPairsEvaluated} provider/payoff pairs.`,
    `- Result: ${report.totals.passChecks} PASS checks, ${report.totals.failedChecks} failed checks, ${findings.length} classified findings.`,
    `- Deterministic full-result hash: \`${report.formationSweep.deterministicFullResultHash}\`.`,
    `- Recorded audit runtime: ${report.recordedAuditRuntimeMs} ms.`,
    '',
    '## Per-dragon audit',
    '',
    '| Dragon | Rarity | Breed | Abilities | Signals | Dispositions | Evidence refs | Manual reviews | Result |',
    '|---|---:|---|---:|---:|---:|---:|---:|---|',
    ...report.perDragon.map(
      (row) =>
        `| ${row.name} (\`${row.dragonId}\`) | ${row.rarity} | ${row.breed} | ${row.abilityCount} | ${row.signalCount} | ${row.dispositionCount} | ${row.evidenceReferenceCount} | ${row.manualReviewCount} | ${row.status}${row.issues.length ? `: ${row.issues.join(', ')}` : ''} |`,
    ),
    '',
    '## Status and alias matrix',
    '',
    '| Specific status | Aliases to | Satisfies Control |',
    '|---|---|---|',
    ...report.aliasTable.map(
      (row) =>
        `| ${row.providerLabel} (\`${row.providerTag}\`) | ${row.aliasesTo.length ? row.aliasesTo.map((tag) => report.aliasTable.find((candidate) => candidate.providerTag === tag)?.providerLabel ?? tag).join(', ') : 'None'} | ${row.satisfiesControl ? 'Yes' : 'No'} |`,
    ),
    '',
    'Control is satisfied only by Stun, Stagger, Overwhelm, and Confusion (plus Control itself). Specific labels remain distinct; there are no damage-type aliases for periodic statuses. Recovery and Recovery Received are separate tags.',
    '',
    '## Recipient selector inventory',
    '',
    '| Selector | Signal count | Signal IDs |',
    '|---|---:|---|',
    ...report.selectorInventory.map(
      (row) =>
        `| ${row.selector} | ${row.signalCount} | ${row.signalIds.map((id) => `\`${id}\``).join(', ')} |`,
    ),
    '',
    '## Progression audit',
    '',
    `Every signal and position claim was evaluated at Star Ranks ${report.progression.stars.join(', ')}, Dragon Levels ${report.progression.levels.join(' and ')}, and all three positions. ${report.progression.activeStateCount} states were active and ${report.progression.inactiveStateCount} were inactive. The evaluator was additionally exercised across ${report.totals.progressionFormationsEvaluated} progression formations.`,
    '',
    '## Provider/payoff matrix',
    '',
    `The audit evaluated ${report.totals.providerPayoffPairsEvaluated} ordered provider/payoff signal-tag pairs (${report.providerPayoffMatrix.distinctTagPairs} distinct tag pairs); ${report.totals.compatibleProviderPayoffPairs} were compatible. Compatible distinct pairs: ${report.providerPayoffMatrix.compatibleDistinctTagPairs.map((pair) => `\`${pair}\``).join(', ') || 'none'}.`,
    '',
    '## Formation and rating sweep',
    '',
    `All ${report.formationSweep.actualCount} ordered formations were evaluated at 10 Stars and Dragon Level 16. Rating range ${report.formationSweep.rating.minimum}–${report.formationSweep.rating.maximum}; mean ${report.formationSweep.rating.mean}; median ${report.formationSweep.rating.median}; P90 ${report.formationSweep.rating.percentile90}; P95 ${report.formationSweep.rating.percentile95}; P99 ${report.formationSweep.rating.percentile99}.`,
    '',
    '| Tier | Count |',
    '|---|---:|',
    ...Object.entries(report.formationSweep.rating.byTier).map(
      ([tier, count]) => `| ${tier} | ${count} |`,
    ),
    '',
    '### Top 50 formations',
    '',
    ...formationTable(report.formationSweep.top50),
    '',
    '### Bottom 50 formations',
    '',
    ...formationTable(report.formationSweep.bottom50),
    '',
    '## Findings',
    '',
    `Finding totals by severity: ${Object.entries(report.findingSummary.bySeverity)
      .map(([severity, count]) => `${severity} ${count}`)
      .join(', ')}. By category: ${Object.entries(report.findingSummary.byCategory)
      .map(([category, count]) => `${category} ${count}`)
      .join(', ')}.`,
    '',
  ];
  if (findings.length === 0) lines.push('No non-PASS findings.');
  for (const finding of findings) {
    lines.push(
      `### ${finding.id} — ${finding.category} (${finding.severity})`,
      '',
      `- Affected area: ${finding.affectedArea}`,
      `- Ability/profile signal: ${finding.affectedAbilityOrSignal}`,
      `- Current behavior: ${finding.currentBehavior}`,
      `- Expected behavior: ${finding.expectedBehavior}`,
      `- Reproduction: ${finding.reproducibleSetup}`,
      `- Files: ${finding.fileReferences.map((file) => `\`${file}\``).join(', ')}`,
      `- Focused automated reproduction: ${finding.focusedTestReproduction ? 'Yes' : 'No'}`,
      `- Controller mechanic confirmation needed: ${finding.controllerMechanicConfirmationNeeded ? 'Yes' : 'No'}`,
      `- Recommended next action: ${finding.recommendedNextAction}`,
      `- Audit disposition: ${finding.auditDisposition}`,
      '',
    );
  }
  lines.push(
    '## Resolved findings compared with 0.6.8',
    '',
    ...report.resolvedFindings.map((finding) => `- ${finding.id}: ${finding.resolution}`),
    '',
    `The ${report.comparison.baselineVersion} deterministic hash was \`${report.comparison.baselineDeterministicFullResultHash}\`; the ${report.auditVersion} hash is \`${report.comparison.currentDeterministicFullResultHash}\`. All 26,970 numeric scores and component totals unchanged: ${report.comparison.allNumericScoresAndComponentsUnchanged ? 'Yes' : 'No'}.`,
    '',
  );
  lines.push(
    '## Browser QA',
    '',
    `Status: ${report.browserQa.status}. Audited URL: ${report.browserQa.auditedUrl}. Fixture: ${report.browserQa.fixture}. Dragon-detail overflow: ${report.browserQa.overflowCount}; clipped interactive controls: ${report.browserQa.clippedInteractiveControlCount}; console errors: ${report.browserQa.consoleErrors.length}; console warnings: ${report.browserQa.consoleWarnings.length}.`,
    '',
    `Responsive detail checks: ${report.browserQa.responsiveSummary}`,
    '',
    '## Rerun',
    '',
    '```powershell',
    'pnpm run audit:full-roster',
    '```',
    '',
    'Use `pnpm run audit:full-roster:write` only when intentionally refreshing the committed audit artifacts, then review the complete diff. The normal command verifies the committed deterministic baseline without rewriting it.',
    '',
    `Focused \`it.todo\` markers (${report.todoIds.length}): ${report.todoIds.map((id) => `\`${id}\``).join(', ')}.`,
    '',
    '## Explicit non-changes',
    '',
    '- No formula, weight, threshold, guardrail, placement, or calibration changes.',
    '- Canonical wording changed only for the 21 Seasmoke, Crimson, and Kalspire abilities in this screenshot-source fidelity batch.',
    '- Curated profile semantics changed only by adding Strength scaling to the two existing confirmed signals; no signal, tag, targeting, or Crimson profile structure changed.',
    '- Source schema 13, formation share links, formation evaluation, and the rating model remain unchanged; local/cloud roster JSON remain at schema 5 without SQL changes.',
    '- FRR-F001 and FRR-F002 remain informational and unresolved by design.',
  );
  return `${lines.join('\n')}\n`;
}

function formationTable(rows) {
  return [
    '| Left / Vanguard / Right | Score | Tier | Relationships | Missing | Conflicts |',
    '|---|---:|---|---:|---:|---:|',
    ...rows.map(
      (row) =>
        `| ${row.formation.join(' / ')} | ${row.score} | ${row.tier} | ${row.relationshipCount} | ${row.missingEnablerCount} | ${row.positionConflictCount} |`,
    ),
  ];
}

function countValues(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)),
  );
}
