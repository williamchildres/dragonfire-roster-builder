import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import {
  buildProjectContextFiles,
  populatedDragonIds,
  projectContextSizeLimitBytes,
  validateProjectContextFiles,
} from '../services/projectContextExport';
import { metadataOnlyDragonIds } from '../synergy/profileAudit';
import { simpleSynergyProfiles } from '../synergy/profiles';

const fixedOptions = {
  generatedAt: '2026-06-24T00:00:00.000Z',
  branch: 'feature/project-context-export',
  commit: '0123456789abcdef0123456789abcdef01234567',
  testTotals: {
    runner: 'vitest',
    testFileCount: 13,
    testCaseCount: 100,
    lastRunStatus: 'not-run-by-exporter' as const,
  },
};

function jsonFile<T>(files: Record<string, string>, path: string): T {
  return JSON.parse(files[path]!) as T;
}

function stripGeneratedAt(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripGeneratedAt);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => key !== 'generatedAt')
        .map(([key, child]) => [key, stripGeneratedAt(child)]),
    );
  }
  return value;
}

describe('project context export', () => {
  it('generates the current simple-product file set and validates it', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const validation = validateProjectContextFiles(exportSet.files, fixedOptions);

    expect(exportSet.files['project-context/README.md']).toBeDefined();
    expect(exportSet.files['project-context/PROJECT_CONTEXT.md']).toBeDefined();
    expect(exportSet.files['project-context/dragonfire-project-context.json']).toBeDefined();
    expect(exportSet.files['project-context/synergy/simple-profiles.json']).toBeDefined();
    expect(exportSet.files['project-context/synergy/profile-audit.json']).toBeDefined();
    expect(exportSet.files['project-context/schemas/project-context.schema.json']).toContain('https://json-schema.org/draft/2020-12/schema');
    expect(Object.keys(exportSet.files).some((file) => /capability|expected-interaction|formation-review|unresolved/i.test(file))).toBe(false);
    expect(validation.errors).toEqual([]);
    expect(validation.passed).toBe(true);
    expect(validation.summary.schemaValidatedFiles).toBe(32);
  });

  it('exports exactly one profile for each known dragon', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const dragonFiles = Object.keys(exportSet.files).filter((file) => /^project-context\/dragons\/(?!index\.json$)[^/]+\.json$/.test(file));
    const index = jsonFile<{ count: number; dragons: Array<{ slug: string }> }>(exportSet.files, 'project-context/dragons/index.json');

    expect(dragonFiles).toHaveLength(31);
    expect(index.count).toBe(31);
    expect(index.dragons.map((dragon) => dragon.slug).sort()).toEqual(dragons.map((dragon) => dragon.slug).sort());
  });

  it('keeps detailed dragons complete and metadata-only dragons unmapped', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);

    for (const dragonId of populatedDragonIds) {
      const dragon = dragons.find((item) => item.id === dragonId)!;
      const profile = jsonFile<{
        abilities: Array<{ id: string; kind: string; rawDescription: string }>;
        profileCompleteness: string;
        simpleProfileStatus: string;
      }>(exportSet.files, `project-context/dragons/${dragon.slug}.json`);

      expect(profile.profileCompleteness).toBe('detailed-abilities');
      expect(profile.simpleProfileStatus).toBe('curated');
      expect(profile.abilities.some((ability) => ability.kind === 'command')).toBe(true);
      expect(profile.abilities.some((ability) => ability.kind === 'trait')).toBe(true);
      expect(profile.abilities.filter((ability) => ability.kind === 'habit').length).toBe(dragon.habits.length);
      expect(profile.abilities.every((ability) => ability.id && ability.rawDescription.trim().length > 0)).toBe(true);
    }

    for (const dragonId of metadataOnlyDragonIds) {
      const dragon = dragons.find((item) => item.id === dragonId)!;
      const profile = jsonFile<{ abilities: unknown[]; profileCompleteness: string; simpleProfileStatus: string }>(
        exportSet.files,
        `project-context/dragons/${dragon.slug}.json`,
      );

      expect(profile.profileCompleteness).toBe('metadata-only');
      expect(profile.simpleProfileStatus).toBe('metadata-only-unmapped');
      expect(profile.abilities).toEqual([]);
    }
  });

  it('includes simple profiles, audit dispositions, and formation adjacency in the consolidated context', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const context = jsonFile<{
      source: { commit: string };
      dragons: unknown[];
      simpleSynergy: { profiles: unknown[]; profileAudit: { reviewedAbilityCount: number } };
      formationRules: {
        adjacency: Record<string, string[]>;
        placementComparison: {
          meaningfulImprovementWhen: string;
          candidateScoring: string;
          fullCreditWhen: string[];
          recommendationSuppressionReasons: string[];
        };
      };
      statusGlossary: unknown[];
      statDefinitions: unknown[];
      manualReviews: unknown[];
      evidenceSummary: unknown[];
    }>(exportSet.files, 'project-context/dragonfire-project-context.json');

    expect(context.source.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(context.dragons).toHaveLength(31);
    expect(context.simpleSynergy.profiles).toHaveLength(simpleSynergyProfiles.length);
    expect(context.simpleSynergy.profileAudit.reviewedAbilityCount).toBeGreaterThan(0);
    expect(context.formationRules.adjacency['left-flank']).toEqual(['vanguard']);
    expect(context.formationRules.adjacency.vanguard).toEqual(['left-flank', 'right-flank']);
    expect(context.formationRules.placementComparison).toMatchObject({
      meaningfulImprovementWhen: 'delta >= 5 && relativeDelta >= 0.10',
      candidateScoring: 'Each candidate is scored as though it were the current arrangement.',
      fullCreditWhen: [
        'best',
        'tied-best',
        'best-value-zero',
        'improvement-does-not-reach-both-meaningful-thresholds',
      ],
      recommendationSuppressionReasons: [
        'current-best',
        'tied-best',
        'below-meaningful-threshold',
        'incomplete-formation',
        'insufficient-confidence',
      ],
    });
    expect(context.statusGlossary.length).toBeGreaterThan(0);
    expect(context.statDefinitions.length).toBeGreaterThan(0);
    expect(context.manualReviews.length).toBeGreaterThan(0);
    expect(context.evidenceSummary.length).toBeGreaterThan(0);
  });

  it('does not emit local paths, browser storage dumps, secret-like tokens, or legacy framework payloads', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const combined = Object.values(exportSet.files).join('\n');

    expect(combined).not.toMatch(/[A-Za-z]:\\Users\\/);
    expect(combined).not.toMatch(/\/Users\//);
    expect(combined).not.toMatch(/localStorage/i);
    expect(combined).not.toMatch(/github_pat_|ghp_[A-Za-z0-9]|sk-[A-Za-z0-9]{20,}/);
  });

  it('stays below the committed context size limit', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);

    expect(exportSet.summary.totalBytes).toBeLessThan(projectContextSizeLimitBytes);
  });

  it('is deterministic for controlled inputs and only generatedAt changes when requested', () => {
    const first = buildProjectContextFiles(fixedOptions);
    const second = buildProjectContextFiles(fixedOptions);
    const changedTimestamp = buildProjectContextFiles({
      ...fixedOptions,
      generatedAt: '2026-06-24T00:00:01.000Z',
    });

    expect(second.files).toEqual(first.files);
    expect(stripGeneratedAt(jsonFile(first.files, 'project-context/dragonfire-project-context.json'))).toEqual(
      stripGeneratedAt(jsonFile(changedTimestamp.files, 'project-context/dragonfire-project-context.json')),
    );
  });
});
