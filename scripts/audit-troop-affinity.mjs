import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = path.join(root, 'docs', 'audits', 'troop-affinity-recommendation-0.23.2.json');
const markdownPath = path.join(root, 'docs', 'audits', 'troop-affinity-recommendation-0.23.2.md');
const write = process.argv.includes('--write');
const server = await createServer({ root, appType: 'custom', server: { middlewareMode: true }, logLevel: 'error' });

try {
  const module = await server.ssrLoadModule('/src/audit/troopAffinityRecommendationAudit.ts');
  const report = module.runTroopAffinityRecommendationAudit();
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderMarkdown(report);
  if (write) {
    await writeFile(jsonPath, json, 'utf8');
    await writeFile(markdownPath, markdown, 'utf8');
    console.log(`Wrote ${path.relative(root, jsonPath)} and ${path.relative(root, markdownPath)}.`);
  } else {
    for (const [artifactPath, expected] of [[jsonPath, json], [markdownPath, markdown]]) {
      const committed = await readFile(artifactPath, 'utf8');
      if (committed.replaceAll('\r\n', '\n') !== expected) {
        throw new Error(`Troop-affinity audit artifact is stale: ${path.relative(root, artifactPath)}.`);
      }
    }
  }
  if (report.failures.length > 0) throw new Error(`Troop-affinity audit has ${report.failures.length} failures: ${report.failures.join(' ')}`);
  if (report.identity !== module.EXPECTED_TROOP_AFFINITY_RECOMMENDATION_AUDIT_IDENTITY) {
    throw new Error(`Troop-affinity identity changed: expected ${module.EXPECTED_TROOP_AFFINITY_RECOMMENDATION_AUDIT_IDENTITY}, received ${report.identity}`);
  }
  console.log(`Troop-affinity recommendation verified: ${report.identity}`);
  console.log(`${report.dragonCount} dragons, ${report.formationFixtures} fixtures, ${report.positionInvarianceChecks} position-invariance checks, ${report.failures.length} failures.`);
} finally {
  await server.close();
}

function renderMarkdown(report) {
  const lines = [
    '# Troop Affinity Recommendation v1 audit',
    '',
    `- Version: \`${report.version}\``,
    `- Deterministic identity: \`${report.identity}\``,
    `- Canonical troop order: ${report.canonicalTroopOrder.join(', ')}`,
    `- Canonical dragon affinity records: ${report.dragonCount}`,
    `- Formation fixtures: ${report.formationFixtures}`,
    `- Full-positive fixtures: ${report.fullPositiveFixtures}`,
    `- Partial fixtures: ${report.partialFixtures}`,
    `- Tie fixtures: ${report.tieFixtures}`,
    `- Negative-tradeoff fixtures: ${report.negativeTradeoffFixtures}`,
    `- Unknown-data fixtures: ${report.unknownDataFixtures}`,
    `- Siege objective-specific fixtures: ${report.siegeFixtures}`,
    `- Position-invariance checks: ${report.positionInvarianceChecks}`,
    `- Failures: ${report.failures.length}`,
    '',
    '## Representative fixtures',
    '',
    '| Fixture | Dragons | Kind | Recommended troop types | Positive coverage |',
    '| --- | --- | --- | --- | --- |',
    ...report.fixtures.map((fixture) => `| ${fixture.name} | ${fixture.dragonIds.join(', ')} | ${fixture.kind} | ${fixture.recommendedTroopTypes.join(', ')} | ${fixture.positiveCoverage} of 3 |`),
    '',
    'The identity covers the domain version, canonical troop ordering, candidate classifications, ranking hierarchy, tie and incomplete-data behavior, Siege classification, representative fixture outputs, and every canonical dragon affinity record. Cosmetic or localized UI wording is excluded.',
    '',
  ];
  return `${lines.join('\n')}`;
}
