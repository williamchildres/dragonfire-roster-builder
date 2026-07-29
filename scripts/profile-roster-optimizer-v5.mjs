import { createServer } from 'vite';

const fixturesRequested = values('--fixture', ['mixed']);
const modesRequested = values('--mode', ['strongest-first', 'balanced']);
const countsRequested = values('--count', ['1', '5', '10', '11']).map(Number);
const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const [optimizer, audit, auditV5] = await Promise.all([
    server.ssrLoadModule('/src/optimizer/rosterOptimizer.ts'),
    server.ssrLoadModule('/src/audit/rosterOptimizerAudit.ts'),
    server.ssrLoadModule('/src/audit/rosterOptimizerV5Audit.ts'),
  ]);
  const fixtures = {
    mixed: auditV5.optimizerV5MixedProgressionRoster,
    maxed: audit.maxedRoster,
    'all-one': audit.allOneRoster,
  };
  for (const fixture of fixturesRequested) {
    const rosterFactory = fixtures[fixture];
    if (!rosterFactory) throw new Error(`Unknown fixture ${fixture}.`);
    for (const mode of modesRequested) {
      for (const count of countsRequested) {
        const startedAt = performance.now();
        const result = await optimizer.optimizeCurrentRoster(
          rosterFactory(),
          mode,
          count,
        );
        if (!result.optimal) throw new Error(`${fixture}/${mode}/${count} unavailable.`);
        const profile = result.diagnostics.performanceProfile;
        const maximumVariables = Math.max(
          0,
          ...(profile?.phases.map((phase) => phase.variableCount) ?? []),
        );
        const maximumConstraints = Math.max(
          0,
          ...(profile?.phases.map((phase) => phase.constraintCount) ?? []),
        );
        console.log(JSON.stringify({
          fixture,
          mode,
          count,
          candidateGenerationMs: round(result.diagnostics.candidateGenerationMs),
          solverMs: round(result.diagnostics.solverMs),
          totalMs: round(performance.now() - startedAt),
          solverPasses: result.diagnostics.solverPasses,
          exactSearchNodes: result.diagnostics.nodesVisited,
          modelBuilds: profile?.modelBuilds ?? 0,
          maximumVariables,
          maximumConstraints,
          skippedPhases: profile?.skippedPhases ?? 0,
          certificationPasses: profile?.certificationPasses ?? 0,
          solutionHash: result.optimizerSolutionHash,
          resultHash: result.optimizerResultHash,
        }));
      }
    }
  }
} finally {
  await server.close();
}

function values(name, fallback) {
  const selected = process.argv.flatMap((argument, index) =>
    argument === name && process.argv[index + 1] ? [process.argv[index + 1]] : [],
  );
  return selected.length > 0 ? selected : fallback;
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}
