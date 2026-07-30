import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';

const write = process.argv.includes('--write');
const jsonPath = new URL(
  '../docs/audits/roster-optimizer-v6-real-world-0.22.1.json',
  import.meta.url,
);
const markdownPath = new URL(
  '../docs/audits/roster-optimizer-v6-real-world-0.22.1.md',
  import.meta.url,
);
const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const module = await server.ssrLoadModule('/src/audit/realWorldV6Comparison.ts');
  const report = await module.runRealWorldV6Comparison();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  if (write) {
    await writeFile(jsonPath, json);
    await writeFile(markdownPath, markdown);
  } else {
    const expected = JSON.parse(await readFile(jsonPath, 'utf8'));
    if (expected.deterministicComparisonHash !== report.deterministicComparisonHash) {
      throw new Error(
        `Real-world comparison changed: ${expected.deterministicComparisonHash} -> ` +
        `${report.deterministicComparisonHash}.`,
      );
    }
  }
  console.log(JSON.stringify({
    fixtureDragonCount: report.fixtureDragonCount,
    candidatePoolBuilds: report.candidatePoolBuilds,
    bestOverallTotalRatingGain: report.bestOverallTotalRatingGain,
    deterministicComparisonHash: report.deterministicComparisonHash,
  }));
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const name = (mode) => ({
    'best-overall-first': 'Best Overall First',
    'strongest-first': 'Highest Raw Power First',
    balanced: 'Balance Raw Power Across Armies',
  })[mode];
  const diagnostic = report.caraxesSyrax;
  return `# Optimizer v6 real-world comparison — 0.22.1

- Fixture: minimal deterministic 33-dragon progression snapshot
- Shared candidate-pool builds: ${report.candidatePoolBuilds}
- Candidates: ${report.candidateCount}
- Best Overall differs from Highest Raw Power: ${report.bestOverallDistinctFromHighestRawPower}
- Best Overall total Formation Rating gain: ${report.bestOverallTotalRatingGain}
- Deterministic comparison hash: \`${report.deterministicComparisonHash}\`

## Three-mode summary

| Mode | Average rating | Minimum rating | Total rating | Strongest raw power | Weakest raw power | Total raw power | Spread | Solution | Result |
|---|---:|---:|---:|---:|---:|---:|---:|---|---|
${report.comparisons.map(({ mode, summary, solutionHash, resultHash }) =>
    `| ${name(mode)} | ${summary.averageRating.toFixed(2)} | ${summary.minimumRating} | ` +
    `${summary.totalRating} | ${summary.strongestRawPower} | ${summary.weakestRawPower} | ` +
    `${summary.totalRawPower} | ${summary.powerSpread} | \`${solutionHash}\` | ` +
    `\`${resultHash}\` |`,
  ).join('\n')}

## Selected formations

${report.comparisons.map((comparison) => `### ${name(comparison.mode)}

| Army | Dragons | Arrangement | Raw power | Formation Rating | Overall Score |
|---:|---|---|---:|---:|---:|
${comparison.formations.map((formation) =>
    `| ${formation.rank} | ${formation.dragonIds.join(', ')} | ` +
    `${Object.entries(formation.arrangement).map(([position, dragon]) =>
      `${position}: ${dragon}`).join('; ')} | ${formation.estimatedPower} | ` +
    `${formation.formationRating} | ${formation.overallScore?.toFixed(1) ?? '—'} |`,
  ).join('\n')}`).join('\n\n')}

## Caraxes + Syrax diagnostic

- Earliest step where both are available: ${diagnostic.earliestAvailableStep}
- Best third dragon: ${diagnostic.thirdDragonId}
- Arrangement: ${Object.entries(diagnostic.arrangement).map(([position, dragon]) =>
    `${position}: ${dragon}`).join('; ')}
- Estimated Formation Power: ${diagnostic.estimatedPower}
- Formation Rating: ${diagnostic.formationRating}
- Overall Score: ${diagnostic.overallScore.toFixed(1)} (${diagnostic.overallScoreUnits} units)
- Active relationships: ${diagnostic.activeRelationshipCount}
- Unquantified relationships: ${diagnostic.unquantifiedRelationshipCount}
- Missing or locked mechanics: ${diagnostic.missingOrLockedMechanics.join('; ') || 'None'}
- Selected by Best Overall: ${diagnostic.selectedByBestOverall}
- Exact winning candidate: \`${diagnostic.winningCandidate.stableCandidateKey}\`
- Exact score difference: ${diagnostic.scoreDifference.toFixed(4)} (${diagnostic.scoreDifferenceUnits} units)

The First-Strike and Fire Damage interactions are generated and scored normally; no pair receives special-case treatment.
Overall Score is an explainable planning index, not combat simulation or predicted damage.
`;
}
