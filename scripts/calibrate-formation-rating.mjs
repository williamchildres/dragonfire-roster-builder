import { performance } from 'node:perf_hooks';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
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
  const sweep = report.formationSweep;
  console.log(JSON.stringify({
    runtimeMs: Math.round(performance.now() - startedAt),
    reliable: report.reliable,
    failedChecks: report.totals.failedChecks,
    rating: sweep.rating,
    scoreFrequency: sweep.scoreFrequency,
    placementScoreDistribution: sweep.placementScoreDistribution,
    meaningfulPlacementRecommendationCount: sweep.meaningfulPlacementRecommendationCount,
    bestOrTiedBestPercentage: sweep.bestOrTiedBestPercentage,
    recommendationSuppressionReasonDistribution: sweep.recommendationSuppressionReasonDistribution,
    relationshipClassDistribution: sweep.relationshipClassDistribution,
    redundancyRankDistribution: sweep.redundancyRankDistribution,
    top10: sweep.top50.slice(0, 10),
    hash: sweep.deterministicFullResultHash,
  }, null, 2));
} finally {
  await server.close();
}
