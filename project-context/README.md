# Dragonfire Project Context Export

This directory is generated from the current typed repository source. Do not manually edit the JSON files; change the TypeScript source data and regenerate instead.

## Files

- `dragonfire-project-context.json`: consolidated machine-readable context with source metadata, roster summary, all dragon profiles, formation rules, capability framework, reviews, evidence, review cases, and unresolved mechanics.
- `project-state.json`: current versions, branch/commit, counts, architecture summary, phases, and next-phase plan.
- `formation-review-cases.json`: completed Phase 3.8.1 cases plus the pending next review batch.
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

Run `npm run validate:context` after generation. The validator checks schema conformance, dragon counts, source references, version agreement, metadata-only dragon constraints, modular/consolidated agreement, and private-path or token leakage.

## Authority

The authoritative source remains the typed source data under `src/data`, `src/models`, and `src/services`. Generated JSON exists so external systems can understand the project without reading TypeScript.
