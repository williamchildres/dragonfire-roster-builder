# Formation Reliability production contract

## Ownership and scope

`src/synergy/reliability` owns the reusable production contracts and pure utilities for Formation Reliability:

- `types.ts` defines component facts, event-graph bindings, validation modes, and progression input;
- `validation.ts` validates components and bindings and returns stable structured issues;
- `progression.ts` adapts existing roster progression without changing storage;
- `probability.ts` resolves documented probability and provides the approved cumulative formula;
- `index.ts` is the public module boundary.

This infrastructure is intentionally disconnected from Formation Rating v2, relationship construction, placement comparison, optimizer code, and UI rendering. Supplying partial metadata cannot affect current scoring because no current evaluator imports or consumes this module.

## Component identifiers

A component ID uses `ability-id:component-slug`, such as:

- `velar-gales-of-power:first-strike`;
- `velar-gales-of-power:slow`;
- `velar-breath-of-renewal:cleanse`;
- `velar-breath-of-renewal:recovery`.

Both segments use stable kebab-case semantics rather than display text. Validation rejects malformed or duplicate IDs and rejects a component whose ID names a different source ability.

## Signal binding paths

Production uses a separate binding registry rather than a temporary optional `SynergySignal` field. Each binding contains alternative paths. Events within one path are jointly required. Components grouped within one event share activation identity, preventing duplicate credit when one roll supplies several tags.

This structure represents:

- one component through one path/event/component;
- alternatives through several paths;
- chance setup plus chance payoff through two jointly required events;
- several components from one roll through one shared event;
- unresolved mixed behavior through `status: 'unresolved-mixed'` and candidate paths.

## Validation modes

`contract` mode validates every supplied component and binding, including stale references, but does not require every current scoring signal to be present. This is the mode for this infrastructure PR.

`full-migration` mode additionally requires every supplied scoring signal ID to have a resolved binding and every component to be referenced. It rejects unresolved mixed bindings. Tests demonstrate that incomplete coverage fails, but this mode is not enabled against the current 234 production scoring signals yet.

Validation issues contain a stable code, path, and message and are sorted deterministically. The assertion wrapper reports all collected issues rather than stopping at the first one.

## Progression and probability

The standalone progression adapter reads current `OwnedDragon` values and existing Habit unlock rules. It exposes only unlocked Habit IDs. Levels remain 1–5; a missing unlocked level is represented as `null`, never defaulted to 1. The adapter does not mutate storage, gate on ownership, enter Estimated Power, or change current Formation Rating progression.

Fixed and Habit-Level probability can be resolved without scoring. Unknown or context-missing probability resolves to `null`. The cumulative helper computes `1 - (1 - p)^n` after validating `p` and `n`; the caller remains responsible for proving that repeated opportunities and independence are supported.

## Production naming differences

The production contract uses concise semantic names:

- research `single-shared-roll` becomes `shared`;
- research `known-*` inventory classifications become the stable component class `chance`;
- timing after an ability becomes `after-event`, allowing an explicit ability or non-ability event;
- probability branches use `variants`, rather than the research report’s serialization-oriented `multiple`.

The historical research audit remains independent and retains its approved deterministic hash.

## PR B boundary

The next PR must create the curated production component and signal-binding registries, split or resolve the three mixed signals, bind all 234 scoring signals, and enable `full-migration` validation in CI. Only later behavior-changing work may connect complete metadata to Formation Rating v3, placement comparison, optimizer candidates, and explanations.
