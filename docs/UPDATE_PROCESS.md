# Update Process

Use this process to keep roster data traceable and the Formation Builder simple.

## Data Updates

1. Record identity, roster source, evidence IDs, capture date, and game build.
2. Add raw Command, Trait, and Habit wording.
3. Record Star Rank unlocks, Dragon Level unlocks, and hard position requirements.
4. Add useful descriptive tags.
5. Update `src/synergy/profiles.ts` only when a high-level player-facing relationship is clear.
6. Update `src/synergy/profileAudit.ts` so every detailed ability has exactly one disposition.
7. Update docs when the contribution workflow or product contract changes.

## Validation

Run:

```powershell
npm run lint
npm run test
npm run build
npm run export:context
npm run validate:context
git diff --check
```

If `npm` is unavailable, use equivalent direct Node entry points and report the exact commands.

## Visual Review

Confirm:

- Dragon Database shows raw ability wording in full.
- Habit Level selectors still save and load.
- Formation Builder cards render selected Command and Trait wording.
- Simple formation analysis still handles setup/payoff, support, missing enablers, future unlocks, adjacency, hard positions, and Vanguard conflicts.
- Share links and roster import/export still work.

## Boundaries

Do not add capability matrices, trace engines, expected interaction reports, unresolved-mechanics exports, detailed execution schemas, pass-number regression suites, or a replacement combat simulator. Future dragon additions should ordinarily be data, simple profile, and audit changes.