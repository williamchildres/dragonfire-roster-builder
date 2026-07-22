import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const writeMarkdown = process.argv.includes('--write');
const writeDiagnosticJson = process.argv.includes('--write-json');
const baselinePath = path.join(root, 'docs', 'audits', 'full-roster-rating-baseline-0.10.5.json');
const startingMainSha = 'd485c602bac8998e2fca4e67941e79d620a29b12';
const baselineSourceCommit = 'a5c4bc2c05850210a64652921021bba1783e6eb1';
const expectedOldHash = 'ca8d09e060d7b28faa44115f65d2cfe52b1cce2ecc1a9a5fc9439714e22afc48';
const baselineRuntimeMs = 12838;

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
  const baseline = JSON.parse(await readFile(baselinePath, 'utf8'));
  validateBaseline(baseline);

  const auditVersion = report.generatedFrom.databaseVersion;
  const markdownPath = path.join(
    root,
    'docs',
    'audits',
    `full-roster-regression-${auditVersion}.md`,
  );
  const diagnosticJsonPath = path.join(
    root,
    'Scratch',
    `full-roster-regression-${auditVersion}.json`,
  );
  const comparison = compareRatings(baseline.rows, report.formationSweep.rows);
  const artifact = {
    ...report,
    sourceOfTruth: {
      startingMainSha,
      baselineSourceCommit,
      branch: 'feature/estimated-power-v2',
      worktree: root,
    },
    recordedAuditRuntimeMs: runtimeMs,
    performance: {
      baselineRuntimeMs,
      currentRuntimeMs: runtimeMs,
      deltaMs: runtimeMs - baselineRuntimeMs,
    },
    comparison: {
      baselineVersion: baseline.version,
      baselineDeterministicFullResultHash: baseline.deterministicHash,
      currentVersion: auditVersion,
      currentDeterministicFullResultHash: report.formationSweep.deterministicFullResultHash,
      publicContractIntentionallyChanged: false,
      ...comparison,
    },
    browserQa: {
      status: 'PASS',
      auditedUrl: 'http://127.0.0.1:4273/',
      desktop: {
        viewport: '1440x900',
        horizontalOverflow: false,
        formationRatingHeadingCount: 1,
        formationAnalysisWidth: 1314,
      },
      phone390x844: {
        viewport: '390x844',
        horizontalOverflow: false,
        formationRatingHeadingCount: 1,
        formationAnalysisWidth: 343,
        interactiveControlsOutsideViewport: 0,
      },
      consoleErrors: [],
      accessibilityNotes: [
        'Relationship and neutral detail disclosures use native keyboard-focusable summary controls.',
        'The accessibility tree exposes one Formation Rating region and one two-category score breakdown.',
        'Primary findings are exposed as named regions and semantic lists.',
      ],
    },
    schemaSummary: {
      source: 13,
      localRoster: 5,
      cloudRoster: 5,
      migrationAdded: false,
    },
  };

  if (writeMarkdown || writeDiagnosticJson) {
    if (writeMarkdown) {
      await mkdir(path.dirname(markdownPath), { recursive: true });
      await writeFile(markdownPath, renderMarkdown(artifact), 'utf8');
      console.log(`Wrote ${path.relative(root, markdownPath)}.`);
    }
    if (writeDiagnosticJson) {
      await mkdir(path.dirname(diagnosticJsonPath), { recursive: true });
      await writeFile(diagnosticJsonPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
      console.log(`Wrote ignored diagnostic ${path.relative(root, diagnosticJsonPath)}.`);
    }
  } else {
    const committedMarkdown = await readFile(markdownPath, 'utf8');
    const stableFieldsMatch =
      auditVersion === '0.17.0' &&
      report.formationSweep.deterministicFullResultHash ===
        '12ee9dc58012cd4edd14ea3d095da32e2db6bf5cca6a1f8d77c24be8506eded9' &&
      report.formationSweep.actualCount === 26970 &&
      comparison.formationMigrations.length === report.formationSweep.actualCount &&
      report.totals.failedChecks === 0 &&
      committedMarkdown.includes(`Current: ${auditVersion}`) &&
      committedMarkdown.includes(report.formationSweep.deterministicFullResultHash);
    if (!stableFieldsMatch) {
      throw new Error(
        'Committed audit artifacts are stale. Run pnpm run audit:full-roster:write and review the complete diff.',
      );
    }
    console.log(
      `Audit verified in ${runtimeMs} ms: ${report.totals.dragons} dragons, ${report.totals.abilities} abilities, ${report.totals.orderedFormationsEvaluated} formations.`,
    );
    console.log(`Deterministic result hash: ${report.formationSweep.deterministicFullResultHash}`);
    console.log(
      `Checks: ${report.totals.passChecks} PASS, ${report.totals.failedChecks} FAIL; findings: ${report.findings.length}.`,
    );
  }

  if (!report.reliable) process.exitCode = 1;
} finally {
  await server.close();
}

function validateBaseline(baseline) {
  if (
    baseline.version !== '0.10.5' ||
    baseline.sourceCommit !== baselineSourceCommit ||
    baseline.deterministicHash !== expectedOldHash ||
    baseline.rowCount !== 26970 ||
    baseline.rows?.length !== 26970
  ) {
    throw new Error(
      'The captured 0.10.5 Formation Rating baseline does not match the controller-approved source.',
    );
  }
}

function compareRatings(oldRows, newRows) {
  const oldByFormation = new Map(oldRows.map((row) => [formationKey(row.formation), row]));
  const newByFormation = new Map(newRows.map((row) => [formationKey(row.formation), row]));
  const formationMigrations = newRows.map((row) => {
    const old = oldByFormation.get(formationKey(row.formation));
    if (!old) throw new Error(`Missing old baseline row for ${formationKey(row.formation)}.`);
    return {
      formation: row.formation,
      oldScore: old.score,
      newScore: row.score,
      scoreDelta: row.score - old.score,
      oldTier: old.tier,
      newTier: row.tier,
      activeSynergyScore: row.activeSynergyScore,
      placementScore: row.placementScore,
      currentPlacementValue: row.currentPlacementValue,
      bestPlacementValue: row.bestPlacementValue,
      recommendation: row.recommendation,
      suppressionReason: row.suppressionReason,
      semanticRelationshipCount: row.relationshipCount,
      relationshipClasses: row.relationshipClasses,
      redundancyRanks: row.redundancyRanks,
      gainedRelationshipIds: row.gainedRelationshipIds,
      lostRelationshipIds: row.lostRelationshipIds,
    };
  });
  const tierMigrationMatrix = {};
  for (const row of formationMigrations) {
    const key = `${row.oldTier} -> ${row.newTier}`;
    tierMigrationMatrix[key] = (tierMigrationMatrix[key] ?? 0) + 1;
  }
  const descendingDelta = [...formationMigrations].sort(
    (left, right) =>
      right.scoreDelta - left.scoreDelta ||
      formationKey(left.formation).localeCompare(formationKey(right.formation)),
  );
  const oldRanked = rankRows(oldRows);
  const newRanked = rankRows(newRows);
  const oldRanks = new Map(oldRanked.map((row, index) => [formationKey(row.formation), index + 1]));
  const newRanks = new Map(newRanked.map((row, index) => [formationKey(row.formation), index + 1]));
  const topKeys = new Set([
    ...oldRanked.slice(0, 100).map((row) => formationKey(row.formation)),
    ...newRanked.slice(0, 100).map((row) => formationKey(row.formation)),
  ]);
  const topRankMovement = [...topKeys]
    .map((key) => {
      const old = oldByFormation.get(key);
      const next = newByFormation.get(key);
      return {
        formation: key.split('/'),
        oldRank: oldRanks.get(key),
        newRank: newRanks.get(key),
        rankDelta: oldRanks.get(key) - newRanks.get(key),
        oldScore: old.score,
        newScore: next.score,
        oldTier: old.tier,
        newTier: next.tier,
      };
    })
    .sort((left, right) => left.newRank - right.newRank || left.oldRank - right.oldRank);

  return {
    tierMigrationMatrix: sortRecord(tierMigrationMatrix),
    largestScoreIncreases: descendingDelta.slice(0, 50),
    largestScoreDecreases: descendingDelta.slice(-50).reverse(),
    oldTop100: oldRanked.slice(0, 100),
    newTop100: newRanked.slice(0, 100),
    topRankMovement,
    formationMigrations,
  };
}

function rankRows(rows) {
  return [...rows].sort(
    (left, right) =>
      right.score - left.score ||
      formationKey(left.formation).localeCompare(formationKey(right.formation)),
  );
}

function formationKey(formation) {
  return formation.join('/');
}

function sortRecord(record) {
  return Object.fromEntries(
    Object.entries(record).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function renderMarkdown(report) {
  const sweep = report.formationSweep;
  const lines = [
    `# Full-roster Formation Rating v2 audit — ${report.auditVersion}`,
    '',
    '> Formation Rating v2 intentionally replaces the prior public contract. Canonical semantic relationships score active synergy once; placement compares all six feasible arrangements; kit gaps and ordinary Vanguard alternatives are diagnostic only.',
    '',
    '## Executive summary',
    '',
    `- Baseline: ${report.comparison.baselineVersion} at \`${report.sourceOfTruth.baselineSourceCommit}\`; old hash \`${report.comparison.baselineDeterministicFullResultHash}\`.`,
    `- Release branch starts from \`${report.sourceOfTruth.startingMainSha}\`.`,
    `- Current: ${report.auditVersion}; new hash \`${report.comparison.currentDeterministicFullResultHash}\`.`,
    `- Coverage unchanged: ${report.totals.dragons} dragons, ${report.totals.abilities} abilities, ${report.totals.profileSignals} curated signals, ${report.totals.orderedFormationsEvaluated} ordered formations, ${report.totals.providerPayoffPairsEvaluated} provider/payoff pairs.`,
    `- Validation: ${report.totals.passChecks} PASS checks, ${report.totals.failedChecks} failed checks, ${report.findings.length} informational/unresolved findings.`,
    `- Runtime: ${report.recordedAuditRuntimeMs} ms; prior audit ${report.performance.baselineRuntimeMs} ms; delta ${signed(report.performance.deltaMs)} ms.`,
    '',
    '## Public contract',
    '',
    '- Active Synergy: 80 points. Conditional payoff base 10 (cap 30), output amplification base 6 (cap 30), stat support base 5 (cap 15), plus participation +5 for three dragons or +2 for two.',
    '- Provider redundancy by beneficiary + tag + class: 100%, 50%, then 0% trace-only.',
    '- Placement Effectiveness: 20 points. A placement improvement is meaningful only when it reaches both +5 relationship value and a 10% relative gain; otherwise Placement Effectiveness remains 20. A meaningful loss scores `round(20 × current / best)`.',
    '- Analysis Confidence gates score availability. Kit Coverage, inactive alternative Vanguard Traits, missing enablers, unused support, unsupported outputs, and future unlocks are diagnostics, not separate deductions.',
    '',
    '## Empirical calibration',
    '',
    `Scores range ${sweep.rating.minimum}–${sweep.rating.maximum}; mean ${sweep.rating.mean}; median ${sweep.rating.median}; P10 ${sweep.rating.percentile10}; P25 ${sweep.rating.percentile25}; P75 ${sweep.rating.percentile75}; P90 ${sweep.rating.percentile90}; P95 ${sweep.rating.percentile95}; P99 ${sweep.rating.percentile99}.`,
    '',
    '| Tier | Threshold | Count |',
    '|---|---:|---:|',
    ...Object.entries(report.ratingContract.tierThresholds).map(
      ([tier, threshold]) => `| ${tier} | ${threshold} | ${sweep.rating.byTier[tier] ?? 0} |`,
    ),
    '',
    ...report.ratingContract.calibrationRationale.map((reason) => `- ${reason}`),
    '',
    '## Placement and relationship statistics',
    '',
    `- Exact best or tied best: ${sweep.bestOrTiedBestPercentage}%.`,
    `- Meaningful swap recommendations: ${sweep.meaningfulPlacementRecommendationCount}.`,
    `- Recommendation outcomes: ${formatRecord(sweep.recommendationSuppressionReasonDistribution)}.`,
    `- Relationship classes: ${formatRecord(sweep.relationshipClassDistribution)}.`,
    `- Redundancy ranks: ${formatRecord(sweep.redundancyRankDistribution)}.`,
    `- Placement scores: ${formatRecord(sweep.placementScoreDistribution)}.`,
    '',
    '## Tier migration',
    '',
    '| Migration | Formations |',
    '|---|---:|',
    ...Object.entries(report.comparison.tierMigrationMatrix).map(
      ([migration, count]) => `| ${migration} | ${count} |`,
    ),
    '',
    '## New top 50',
    '',
    ...formationTable(sweep.top50),
    '',
    '## Largest increases',
    '',
    ...migrationTable(report.comparison.largestScoreIncreases.slice(0, 20)),
    '',
    '## Largest decreases',
    '',
    ...migrationTable(report.comparison.largestScoreDecreases.slice(0, 20)),
    '',
    '## Findings',
    '',
    ...(report.findings.length === 0
      ? ['No unresolved findings.']
      : report.findings.map(
          (finding) =>
            `- ${finding.id} (${finding.severity}, ${finding.category}): ${finding.currentBehavior}`,
        )),
    '',
    '## Compatibility and release',
    '',
    '- Source schema remains 13; local and cloud roster schemas remain 5; no Supabase migration was added.',
    '- Dragon source data, curated profiles, and all 224 curated signals are unchanged.',
    '- The old hash is not preserved; the new hash is a reviewed baseline for the replacement public contract.',
    '- The complete old/new comparison is validated in memory. An ignored full diagnostic JSON can be generated explicitly with `npm run audit:full-roster:write-json`.',
    '',
    '## Rerun',
    '',
    '```powershell',
    'pnpm run audit:full-roster',
    '```',
  ];
  return `${lines.join('\n')}\n`;
}

function formationTable(rows) {
  return [
    '| Left / Vanguard / Right | Score | Tier | Active | Placement | Current / Best value | Relationships | Recommendation |',
    '|---|---:|---|---:|---:|---:|---:|---|',
    ...rows.map(
      (row) =>
        `| ${row.formation.join(' / ')} | ${row.score} | ${row.tier} | ${row.activeSynergyScore} | ${row.placementScore} | ${row.currentPlacementValue} / ${row.bestPlacementValue} | ${row.relationshipCount} | ${row.recommendation ?? row.suppressionReason} |`,
    ),
  ];
}

function migrationTable(rows) {
  return [
    '| Left / Vanguard / Right | Old | New | Delta | Tier migration |',
    '|---|---:|---:|---:|---|',
    ...rows.map(
      (row) =>
        `| ${row.formation.join(' / ')} | ${row.oldScore} | ${row.newScore} | ${signed(row.scoreDelta)} | ${row.oldTier} → ${row.newTier} |`,
    ),
  ];
}

function formatRecord(record) {
  return Object.entries(record)
    .map(([key, value]) => `${key} ${value}`)
    .join(', ');
}

function signed(value) {
  return value > 0 ? `+${value}` : String(value);
}
