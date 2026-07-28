# Formation Reliability production contract

## Ownership and scope

`src/synergy/reliability` owns reusable Formation Reliability types, pure validation, roster-progression adaptation, and probability helpers. It remains disconnected from Formation Rating v2, relationship construction, six-placement comparison, optimizer behavior, Estimated Power, persistence, and UI. Partial metadata therefore cannot change production scoring.

## Components and probability sources

A component ID uses `ability-id:component-slug`. `sourceAbilityId` is the semantic owner of that component and must match the ability segment of its ID.

Habit-dependent probability separately carries `habitAbilityId`. The two IDs may be the same for a Habit’s own effect, or different when a Habit augments a Command. Validation requires a well-formed Habit ID and complete levels 1–5 with no extra keys. When a canonical ability catalog is supplied, validation also requires the ID to exist and identify a Habit.

Direct `habit-level` probability exists only while that Habit is active and has a recorded level. `habit-override` records both a base probability and the replacing Habit progression:

- locked or inactive Habit: resolve the base;
- active Habit with level 1–5: resolve that level’s replacement;
- active Habit with a missing level: resolve `null`, never the base or Level 1.

Ownership is not a progression gate, and the adapter makes no persistence changes.

## Round-specific replacement

`round-specific` maps supported rounds to structured probability expressions. Each entry may be fixed, direct Habit-Level, Habit override, or explicitly unknown. An unsupported round or missing round context resolves to `null`.

This represents Tairax Burning Ward as a 25% Gleamstrike override on each odd round, while Crimson Bloodscale Terror uses a Vermin’s Bane override only on Round 1 and fixed 20% entries on later odd rounds. The same structure supports Feral Precision replacing Feral Strike’s chance only on rounds 4, 6, and 8. No resolver parses prose or contains dragon-specific branches.

## Signal bindings and variants

Bindings contain alternative paths; events in one path are jointly required. Components grouped in one event retain shared activation identity.

Every event carries typed component references. A reference to a variant probability must select `probabilityVariantId`; validation rejects missing or stale selections, selections on non-variant probabilities, and duplicate branch definitions. Different signal bindings may select different documented variants of the same component.

The component resolver accepts that binding reference and validates it against the component before resolving. Probability branch choice is therefore part of the binding contract, not a free-form scorer argument, and no branch is selected by value.

## Validation modes

`contract` mode validates supplied metadata without requiring all current scoring signals. `full-migration` additionally requires complete signal coverage, referenced components, and no unresolved mixed bindings. Issues have stable codes, paths, and messages and are sorted deterministically.

The cumulative helper computes `1 - (1 - p)^n` only after validating `p` and `n`; callers must still establish opportunity count and independence. The historical research audit remains independent and retains its approved hash.

The follow-up registry migration must populate all 234 scoring signals and enable full-migration validation. Only later behavior-changing work may connect complete metadata to a new Formation Rating version.
