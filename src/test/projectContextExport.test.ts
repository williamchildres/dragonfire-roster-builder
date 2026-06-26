import { describe, expect, it } from 'vitest';
import { dragons } from '../data/dragons';
import { buildProjectContextFiles, populatedDragonIds, validateProjectContextFiles } from '../services/projectContextExport';

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
  it('generates all required files and validates the schemas', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const validation = validateProjectContextFiles(exportSet.files, fixedOptions);

    expect(exportSet.files['project-context/README.md']).toBeDefined();
    expect(exportSet.files['project-context/PROJECT_CONTEXT.md']).toBeDefined();
    expect(exportSet.files['project-context/dragonfire-project-context.json']).toBeDefined();
    expect(exportSet.files['project-context/schemas/project-context.schema.json']).toContain('https://json-schema.org/draft/2020-12/schema');
    expect(validation.errors).toEqual([]);
    expect(validation.passed).toBe(true);
    expect(validation.summary.schemaValidatedFiles).toBeGreaterThanOrEqual(32);
  });

  it('exports exactly one profile for each known dragon', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const dragonFiles = Object.keys(exportSet.files).filter((file) => /^project-context\/dragons\/(?!index\.json$)[^/]+\.json$/.test(file));
    const index = jsonFile<{ count: number; dragons: Array<{ slug: string }> }>(exportSet.files, 'project-context/dragons/index.json');

    expect(dragonFiles).toHaveLength(30);
    expect(index.count).toBe(30);
    expect(index.dragons.map((dragon) => dragon.slug).sort()).toEqual(dragons.map((dragon) => dragon.slug).sort());
  });

  it('keeps populated dragons complete and metadata-only dragons empty', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);

    for (const dragonId of populatedDragonIds) {
      const dragon = dragons.find((item) => item.id === dragonId)!;
      const profile = jsonFile<{
        command: unknown;
        trait: unknown;
        habits: unknown[];
        abilities: unknown[];
        profileCompleteness: string;
      }>(exportSet.files, `project-context/dragons/${dragon.slug}.json`);

      expect(profile.profileCompleteness).toBe('detailed-combat-data');
      expect(profile.command).not.toBeNull();
      expect(profile.trait).not.toBeNull();
      expect(profile.habits.length).toBeGreaterThan(0);
      expect(profile.abilities.length).toBe(2 + dragon.habits.length);
    }

    for (const dragon of dragons.filter((item) => !(populatedDragonIds as readonly string[]).includes(item.id))) {
      const profile = jsonFile<{
        command: unknown;
        trait: unknown;
        habits: unknown[];
        outputCapabilities: unknown[];
        modifierCapabilities: unknown[];
        profileCompleteness: string;
      }>(exportSet.files, `project-context/dragons/${dragon.slug}.json`);

      expect(profile.profileCompleteness).toBe('metadata-only');
      expect(profile.command).toBeNull();
      expect(profile.trait).toBeNull();
      expect(profile.habits).toEqual([]);
      expect(profile.outputCapabilities).toEqual([]);
      expect(profile.modifierCapabilities).toEqual([]);
    }
  });

  it('includes every modular section in the consolidated context', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const context = jsonFile<{
      source: { commit: string };
      dragons: unknown[];
      statusGlossary: unknown[];
      statDefinitions: unknown[];
      formationRules: unknown;
      capabilityFramework: unknown;
      expectedInteractions: unknown[];
      manualReviews: unknown[];
      evidenceSummary: unknown[];
      formationReviewCases: unknown[];
      unresolvedMechanics: unknown[];
    }>(exportSet.files, 'project-context/dragonfire-project-context.json');
    const cases = jsonFile<unknown[]>(exportSet.files, 'project-context/formation-review-cases.json');
    const unresolved = jsonFile<unknown[]>(exportSet.files, 'project-context/unresolved-mechanics.json');

    expect(context.source.commit).toMatch(/^[a-f0-9]{40}$/);
    expect(context.dragons).toHaveLength(30);
    expect(context.statusGlossary.length).toBeGreaterThan(0);
    expect(context.statDefinitions.length).toBeGreaterThan(0);
    expect(context.formationRules).toBeDefined();
    expect(context.capabilityFramework).toBeDefined();
    expect(context.expectedInteractions.length).toBeGreaterThan(0);
    expect(context.manualReviews.length).toBeGreaterThan(0);
    expect(context.evidenceSummary.length).toBeGreaterThan(0);
    expect(context.formationReviewCases).toHaveLength(cases.length);
    expect(context.unresolvedMechanics).toHaveLength(unresolved.length);
  });

  it('exports formation review cases with confirmed Phase 3.8.1 cases and pending repair batches', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const cases = jsonFile<Array<{ caseId: string; reviewStatus: string; currentModeExpectedInteractions: unknown[]; previewModeExpectedInteractions: unknown[] }>>(
      exportSet.files,
      'project-context/formation-review-cases.json',
    );

    expect(cases).toHaveLength(16);
    expect(cases.filter((reviewCase) => reviewCase.caseId.startsWith('phase-3-8-1-')).map((reviewCase) => reviewCase.reviewStatus)).toEqual([
      'confirmed',
      'confirmed',
      'confirmed',
      'confirmed',
    ]);
    expect(cases.filter((reviewCase) => /^batch-[12]-formation-/.test(reviewCase.caseId)).map((reviewCase) => reviewCase.reviewStatus)).toEqual([
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
      'pending',
    ]);
    expect(cases.filter((reviewCase) => /^df-lg-(0[135]|11)$/.test(reviewCase.caseId)).map((reviewCase) => reviewCase.reviewStatus)).toEqual([
      'confirmed',
      'confirmed',
      'confirmed',
      'confirmed',
    ]);
    expect(cases.every((reviewCase) => reviewCase.previewModeExpectedInteractions.length >= reviewCase.currentModeExpectedInteractions.length)).toBe(true);
  });

  it('does not emit local paths, browser storage dumps, or secret-like tokens', () => {
    const exportSet = buildProjectContextFiles(fixedOptions);
    const combined = Object.values(exportSet.files).join('\n');

    expect(combined).not.toMatch(/[A-Za-z]:\\Users\\/);
    expect(combined).not.toMatch(/\/Users\//);
    expect(combined).not.toMatch(/localStorage/i);
    expect(combined).not.toMatch(/github_pat_|ghp_[A-Za-z0-9]/);
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
