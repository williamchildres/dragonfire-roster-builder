import { createServer } from 'vite';

const requestedFixtures = new Set(
  valueArgs('--fixture', ['mixed', 'all-one']),
);
const requestedStrategies = new Set(
  valueArgs('--strategy', [
    'best-ten-overall',
    'primary-five-backup-five',
    'power-aware-primary-five-backup-five',
  ]),
);
const server = await createServer({
  root: process.cwd(),
  appType: 'custom',
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
});

try {
  const [optimizer, audit] = await Promise.all([
    server.ssrLoadModule('/src/optimizer/rosterOptimizer.ts'),
    server.ssrLoadModule('/src/audit/rosterOptimizerAudit.ts'),
  ]);
  const fixtures = [
    ['mixed', audit.mixedProgressionRoster],
    ['maxed', audit.maxedRoster],
    ['all-one', audit.allOneRoster],
  ];
  const strategies = [
    'best-ten-overall',
    'primary-five-backup-five',
    'power-aware-primary-five-backup-five',
  ];

  for (const [fixture, rosterFactory] of fixtures) {
    if (!requestedFixtures.has(fixture)) continue;
    for (const strategy of strategies) {
      if (!requestedStrategies.has(strategy)) continue;
      console.log(`[optimizer-profile] ${fixture}/${strategy}`);
      const startedAt = performance.now();
      const result = await optimizer.optimizeCurrentRoster(rosterFactory(), strategy);
      if (!result.optimal) throw new Error(`${fixture}/${strategy} was unavailable.`);
      const groupedPhases = {};
      for (const phase of result.diagnostics.performanceProfile?.phases ?? []) {
        const entry = groupedPhases[phase.category] ??= {
          milliseconds: 0,
          solverPasses: 0,
          exactSearchNodes: 0,
          maximumVariables: 0,
          maximumConstraints: 0,
        };
        entry.milliseconds += phase.elapsedMs;
        entry.solverPasses += phase.solverPass === 0 ? 0 : 1;
        entry.exactSearchNodes += phase.exactSearchNodes ?? 0;
        entry.maximumVariables = Math.max(
          entry.maximumVariables,
          phase.variableCount,
        );
        entry.maximumConstraints = Math.max(
          entry.maximumConstraints,
          phase.constraintCount,
        );
      }
      Object.values(groupedPhases).forEach((entry) => {
        entry.milliseconds = round(entry.milliseconds);
      });
      console.log(JSON.stringify({
        fixture,
        strategy,
        candidateGenerationMs: round(result.diagnostics.candidateGenerationMs),
        solverMs: round(result.diagnostics.solverMs),
        totalMs: round(performance.now() - startedAt),
        solverPasses: result.diagnostics.solverPasses,
        certificationPasses:
          result.diagnostics.performanceProfile?.certificationPasses ?? 0,
        modelBuilds: result.diagnostics.performanceProfile?.modelBuilds ?? 0,
        modelConstructionMs: round(
          result.diagnostics.performanceProfile?.modelConstructionMs ?? 0,
        ),
        groupedPhases,
        solutionHash: result.optimizerSolutionHash,
        resultHash: result.optimizerResultHash,
      }));
    }
  }
} finally {
  await server.close();
}

function valueArgs(name, fallback) {
  const values = process.argv.flatMap((argument, index) =>
    argument === name && process.argv[index + 1] ? [process.argv[index + 1]] : [],
  );
  return values.length > 0 ? values : fallback;
}

function round(value) {
  return Math.round(value * 1_000) / 1_000;
}
