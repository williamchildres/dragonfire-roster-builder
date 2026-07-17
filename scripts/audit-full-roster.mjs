import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(root, 'docs', 'audits', 'full-roster-regression-0.6.8.json');
const markdownPath = path.join(root, 'docs', 'audits', 'full-roster-regression-0.6.8.md');
const writeReports = process.argv.includes('--write');
const browserQaObservation = {
  status: 'PASS with classified observations',
  auditedUrl: 'https://dragonfirelab.com',
  desktop: {
    requestedViewport: { width: 1440, height: 1000 },
    viewport: { width: 1440, height: 1000 },
    document: { clientWidth: 1425, clientHeight: 1000, scrollWidth: 1425, scrollHeight: 1504 },
    pageHorizontalOverflow: false,
    selectorDialog: {
      width: 1184,
      height: 849,
      clientWidth: 1182,
      scrollWidth: 1182,
      cardCount: 31,
    },
    detailsDialogMaximum: { width: 1184, height: 900 },
    dialogBeyondViewportCount: 0,
    dialogHorizontalOverflowCount: 0,
    descendantHorizontalOverflowCount: 10,
    clippedChipCount: 0,
  },
  mobile: {
    requestedViewport: { width: 390, height: 844 },
    viewport: { width: 390, height: 844 },
    document: { clientWidth: 375, clientHeight: 844, scrollWidth: 375, scrollHeight: 2320 },
    pageHorizontalOverflow: false,
    selectorDialog: { width: 366, height: 760, clientWidth: 349, scrollWidth: 349, cardCount: 31 },
    detailsDialogSample: {
      dragon: 'Thunderstrike',
      width: 366,
      height: 760,
      clientWidth: 349,
      scrollWidth: 349,
    },
    dialogBeyondViewportCount: 0,
    dialogHorizontalOverflowCount: 0,
    descendantHorizontalOverflowCount: 1,
    clippedChipCount: 0,
    navigationUsable: true,
  },
  uniqueSelectorDragonCount: 31,
  selectorTraversalCount: 31,
  detailDialogsOpened: 70,
  uniqueDetailDialogsOpened: 31,
  detailsStructure: {
    commandPerDragon: 1,
    vanguardTraitPerDragon: 1,
    habitsPerDragon: 5,
    rawWordingControlsPerDragon: 7,
    failures: 0,
  },
  searchResultCountForVesper: 1,
  rareFilterResultCount: 12,
  sentinelFilterResultCount: 7,
  overflowCount: 11,
  clippedChipCount: 0,
  consoleErrors: [],
  consoleWarnings: [],
  navigation: {
    overview: 'PASS',
    myRoster: 'PASS',
    formationBuilder: 'PASS',
    about: 'PASS',
    supportUrl: 'https://buymeacoffee.com/williamchildres',
    deadRoutes: 0,
  },
  shareLink:
    'PASS — #formation=left-flank:caraxes,vanguard:syrax,right-flank:feskar generated and restored after reload.',
  sampledFormationEdges: [
    'Caraxes/Syrax/Feskar: specific First-Strike, Burn, Slow, Fire, and Instinct relationships rendered without duplicate strengths.',
    'Vesper/Rhysarion/Feskar: Vesper Confusion and Feskar Stagger each rendered as one specifically named Control setup path.',
    'Nyrena/Dawnseeker/Antares: typed Fire/Tactical support, priority/position constraints, missing providers, and rating explanations rendered conservatively.',
    'Dawnseeker 9→10 Star and Vesper 9→10 Star Details boundaries sampled.',
  ],
  findings: [
    {
      id: 'FRR-F004',
      severity: 'medium',
      category: 'presentation defect',
      affectedArea: 'Dragon Details — At a glance progression presentation',
      affectedAbilityOrSignal:
        'dawnseeker-first-light-first-strike; vesper-midnight-onslaught-confusion',
      currentBehavior:
        'At 9 Stars, the ability cards correctly show First Light and Midnight Onslaught as Locked preview, but At a glance still lists Dawnseeker First-Strike and Vesper Confusion/Control as unqualified Provides signals.',
      expectedBehavior:
        'Future signals may remain visible as previews, but the At a glance summary must either exclude them or clearly mark their inactive 10-Star unlock state.',
      reproducibleSetup:
        'Open Dawnseeker Details at 9 Stars and compare the locked First Light card with the Provides list; repeat with Vesper Midnight Onslaught at 9 Stars.',
      fileReferences: ['src/app/dragonDetailPresentation.ts', 'src/app/DragonDetailModal.tsx'],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Create a narrow Details-presentation follow-up that makes the At a glance summary progression-aware without changing profiles or evaluator behavior.',
      auditDisposition: 'Not fixed in this audit PR.',
    },
    {
      id: 'FRR-F005',
      severity: 'low',
      category: 'browser-only observation',
      affectedArea: 'Details long-label wrapping',
      affectedAbilityOrSignal:
        'Shadowrend and Thunderstrike Details headings; Thunderstrike technical tag label',
      currentBehavior:
        'No page or dialog overflows its viewport and no chips are clipped, but 10 desktop descendant elements and one sampled mobile descendant report horizontal scrollWidth beyond clientWidth. Thunderstrike heading descendants exceed their desktop containers by 24–25 px; its mobile technical tag text exceeds by 24 px.',
      expectedBehavior:
        'Long names and technical labels should wrap within their own element boxes so the horizontally overflowing element count is zero.',
      reproducibleSetup:
        'At 1440×1000 open Shadowrend and Thunderstrike Details at 10 Stars and compare descendant scrollWidth/clientWidth; at 390×844 inspect Thunderstrike technical tags.',
      fileReferences: ['src/styles/global.css', 'src/app/DragonDetailModal.tsx'],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Add a narrow CSS wrapping fix and viewport regression test in a separate UI PR.',
      auditDisposition: 'Not fixed in this audit PR.',
    },
    {
      id: 'FRR-F006',
      severity: 'low',
      category: 'presentation defect',
      affectedArea: 'About coverage copy',
      affectedAbilityOrSignal: '31/31 roster coverage statement',
      currentBehavior:
        'Overview, README, and selectors state complete 31/31 coverage, while About contains no current 31/31 coverage statement.',
      expectedBehavior:
        'Overview, README, About, and selectors should consistently communicate current 31/31 coverage.',
      reproducibleSetup:
        'Open Overview, About, and the Add Dragon selector, then compare their coverage copy with README.md.',
      fileReferences: ['src/app/App.tsx', 'README.md'],
      focusedTestReproduction: true,
      controllerMechanicConfirmationNeeded: false,
      recommendedNextAction:
        'Add one concise 31/31 coverage sentence to About in a separate presentation-only PR.',
      auditDisposition: 'Not fixed in this audit PR.',
    },
  ],
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
  const combinedFindings = [...report.findings, ...browserQaObservation.findings];
  const artifact = {
    ...report,
    sourceOfTruth: {
      originMainSha: 'a45ec12d4f80f17a6c71b1c20b18261b234e30b5',
      branch: 'audit/full-roster-regression',
      worktree:
        'C:/Users/willi/Documents/CodexProjects/Dragonfire Roster Lab/.worktrees/full-roster-regression',
    },
    recordedAuditRuntimeMs: runtimeMs,
    browserQa: browserQaObservation,
    findingSummary: {
      total: combinedFindings.length,
      bySeverity: countValues(combinedFindings.map((finding) => finding.severity)),
      byCategory: countValues(combinedFindings.map((finding) => finding.category)),
    },
    todoIds: ['FRR-F001', 'FRR-F002', 'FRR-F003', 'FRR-F004', 'FRR-F005', 'FRR-F006'],
  };

  if (writeReports) {
    await mkdir(path.dirname(jsonPath), { recursive: true });
    await writeFile(jsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    await writeFile(markdownPath, renderMarkdown(artifact), 'utf8');
    console.log(`Wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}.`);
  } else {
    const committed = JSON.parse(await readFile(jsonPath, 'utf8'));
    const stableFieldsMatch =
      committed.formationSweep?.deterministicFullResultHash ===
        report.formationSweep.deterministicFullResultHash &&
      committed.totals?.orderedFormationsEvaluated === report.totals.orderedFormationsEvaluated &&
      committed.totals?.progressionStatesEvaluated === report.totals.progressionStatesEvaluated &&
      committed.totals?.providerPayoffPairsEvaluated ===
        report.totals.providerPayoffPairsEvaluated &&
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
  const findings = [...report.findings, ...report.browserQa.findings];
  const lines = [
    '# Full-roster regression audit — 0.6.8',
    '',
    '> Audit-only baseline. No production dragon data, profile mechanics, evaluator behavior, rating logic, targeting behavior, or UI behavior was corrected by this audit.',
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
    '## Browser QA',
    '',
    `Status: ${report.browserQa.status}. Audited URL: ${report.browserQa.auditedUrl}. Selector traversal: ${report.browserQa.selectorTraversalCount}; Details dialogs opened: ${report.browserQa.detailDialogsOpened}; overflow: ${report.browserQa.overflowCount}; clipped chips: ${report.browserQa.clippedChipCount}; console errors: ${report.browserQa.consoleErrors.length}; console warnings: ${report.browserQa.consoleWarnings.length}; share link: ${report.browserQa.shareLink}.`,
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
    '- No dragon wording, curated profile, evaluator, targeting, rating, or UI corrections.',
    '- No schema, import/export, share-link, authentication, payment, hosting, deployment, optimizer, generator, simulator, or version changes.',
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
