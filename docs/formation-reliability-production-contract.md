# Formation Reliability production contract

## Ownership and scope

`src/synergy/reliability` owns Formation Reliability types, pure validation, progression adaptation, probability helpers, the production metadata registry, and the live Formation Rating v3 scoring consumer. The Formation Builder and every optimizer strategy consume v3; Estimated Power, persistence, synchronization, routes, and sharing remain separate.

Recipient targeting is an upstream eligibility contract owned by the synergy evaluator, not a reliability probability. A structured targeting group is resolved once per formation and shared by all sibling signals in that group. Only a uniquely resolved recipient can produce a scored relationship; unresolved priority ties, unresolved fallback ties, and missing capability data remain visible as neutral findings and receive no reliability trace or relationship value.

## Registry organization and coverage

`registry/catalog.ts` derives canonical abilities and current scoring IDs from dragon data and `simpleSynergyProfiles`. `registry/dragons/` contains one reviewable module per dragon, while `registry/index.ts` exports the sorted aggregate components, bindings, ability catalog, scoring IDs, and complete contract input.

The registry covers all 33 dragons and all 234 current scoring signals. Five explicitly non-scoring signals and 33 position claims are identified but excluded from binding coverage. Every component is referenced and every scoring signal has exactly one resolved binding.

The production audit in `src/audit/formationReliabilityRegistryAudit.ts` reconciles registry facts with the historical research inventory. Intentional structural differences - including split independent rolls, explicit Habit sources, round-specific overrides, binding-selected variants, and resolved mixed uses - are reported deterministically. Production does not import or parse the research report at runtime.

## Components and probability sources

A component ID uses `ability-id:component-slug`. `sourceAbilityId` and `sourceAbilityKind` identify its canonical semantic owner and are checked against the derived ability catalog, including unlock floors and evidence ownership.

Habit-dependent probability separately carries `habitAbilityId`. It may match the component owner or identify an augmenting Habit. Validation recursively checks round and variant branches, requires a canonical same-dragon Habit, and requires complete levels 1-5 with no extra keys. Component evidence remains limited to its source ability plus recursively referenced same-dragon probability-source Habits; every external Habit source must contribute canonical evidence.

Direct `habit-level` probability exists only while that Habit is active with a recorded level. `habit-override` resolves:

- locked or inactive Habit: documented base;
- active Habit with level 1-5: corresponding replacement;
- active Habit with a missing level: `null`, never the base or a default level.

`round-specific` entries may be fixed, direct Habit-Level, Habit override, or unknown. This represents Tairax's Gleamstrike replacement on every odd round and Crimson's Vermin's Bane replacement only on Round 1.

## Binding paths, variants, and mixed uses

Ordinary resolved bindings carry alternative `paths`. Events inside one path are jointly required, and components inside one event share activation identity. Variant components require a branch ID on every binding reference.

Resolved-mixed bindings instead carry simultaneous semantic `uses`. Each use has its own alternative paths and may select a documented probability context, but a use ID never selects one use instead of another. This represents every effect improved by the one matched relationship:

- Shadowsong: deterministic Breath of Fire damage and Panic-enhanced Scorched Earth application;
- Shimmer: chance Command buffs, deterministic Tactical Damage, and deterministic Recovery;
- Zivern: deterministic Battle Mastery and chance-based Fearsome Reach.

Vaeldra's composite follow-on uses two explicit alternative joint paths: Lure Taunt plus the deterministic follow-on, or Siren's Call Taunt plus that follow-on. No branch depends on display parsing or dragon-specific scorer logic.

## Validation and CI

`contract` mode validates partial metadata. `full-migration` requires explicit binding classes, complete scoring coverage, canonical component and same-dragon Habit sources, required external-Habit evidence, valid variants, referenced components, and zero unresolved mixed bindings.

`pnpm run validate:reliability-registry` executes the full-migration gate. GitHub CI runs it as a dedicated step without replacing lint, tests, or build. `pnpm run audit:reliability-registry` verifies the committed deterministic registry audit and hash.

The historical research hash remains independent. Formation Rating v3 is the registry's first scoring consumer. It evaluates simultaneous uses independently, keeps one base relationship value, and uses a fully supported use or the strongest quantified lower bound without adding, averaging, or multiplying uses. No v2 evaluator imports the registry.
