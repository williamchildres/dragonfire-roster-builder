# Dragonfire Project Context Export

This directory is generated from the current typed repository source. Do not manually edit the JSON files; change the TypeScript source data and regenerate instead.

## Files

- `dragonfire-project-context.json`: consolidated machine-readable context with source metadata, roster summary, all dragon profiles, formation rules, capability framework, reviews, evidence, review cases, and unresolved mechanics.
- `project-state.json`: current versions, branch/commit, counts, architecture summary, phases, and next-phase plan.
- `formation-review-cases.json`: completed Phase 3.8.1 cases plus pending Batch 1 and Batch 2 formation repair review cases.
- `unresolved-mechanics.json`: stable unresolved mechanic records.
- `dragons/index.json` and `dragons/*.json`: one profile per known dragon.
- `synergy/*.json`: capability framework, formation rules, and expected interaction traces.
- `glossary/*.json`: status and stat glossary exports.
- `reviews/*.json`: manual-review and evidence summaries.
- `schemas/*.schema.json`: JSON Schema Draft 2020-12 schemas for the main export shapes.

## Upload Guidance

The smallest useful external knowledge-project upload set is:

1. `dragonfire-project-context.json`
2. `schemas/project-context.schema.json`
3. `README.md`

Upload the modular files too when the target system benefits from smaller files or per-dragon retrieval.

## Regeneration

Run `npm run export:context`. For reproducible test output, pass `-- --generated-at <ISO timestamp>`.

## Validation

Run `npm run validate:context` after generation. The validator checks schema conformance, dragon counts, source references, version agreement, metadata-only dragon constraints, modular/consolidated agreement, Trial by Flame threshold targeting, and private-path or token leakage.

## Formation Normalization

Data schema 9 exports defensive damage scope, threshold conditions separate from target count, highest-stat and one-adjacent target selectors, grouped modifier capability IDs, requirement ownership, source-ability identity, and interaction scope. Normal unmet requirements are presentation summaries only: they are pure per-formation/per-preview results, hide blockers owned by visible cards, dedupe by semantic identity, and apply hard-failure precedence. Internal same-dragon traces and suppressed normal blockers remain exported for audit even when normal Formation Analysis excludes them from cross-dragon synergy sections.

## Formation Card Presentation

Version 0.5.5 adds a UI-only card presentation layer. It maps normal traces into per-position Receives, Provides, Trait status, affinity chips, candidate-target labels, preview labels, and overflow counts. Raw/debug traces, requirements, evidence IDs, internal interactions, and expected formation-review cases remain exported for audit.

## Authority

The authoritative source remains the typed source data under `src/data`, `src/models`, and `src/services`. Generated JSON exists so external systems can understand the project without reading TypeScript.
