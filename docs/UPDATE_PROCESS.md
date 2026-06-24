# Update Process

Use this process to keep roster data traceable.

## Adding A Newly Discovered Dragon

1. Add a new record to `src/data/dragons.ts`.
2. Set unknown combat fields to null, empty arrays, or `unknown`.
3. Add evidence in `src/data/evidence.ts`.
4. Update `databaseMetadata`.
5. Add or update data-integrity tests.

## Changing Rarity Or Breed

1. Record the previous value in the change notes or future history structure.
2. Add the source evidence.
3. Update the active dragon record.
4. Run the data-integrity tests.

## Adding Commands, Traits, Habits, Affinities, Stats, Or Tags

1. Add only sourced values.
2. Preserve raw wording.
3. Attach evidence IDs and field-level verification.
4. Model multiple schedules when timings differ.
5. Keep Habit unlock Star Rank separate from Habit Level progression.
6. Set `dataStatus` to the appropriate verification level.
7. Update synergy rules only when the tags and behavior are verified.
8. Add tests for any new engine behavior.

## Adding Observation Snapshots

1. Store observations outside the canonical dragon record.
2. Mark `canonical: false`.
3. Record Dragon Level, Star Rank, capture date, game version if known, and modifier context.
4. Do not use observation values for generic comparisons or synergy scores.

## Adding Troop Matchup Rules

1. Store matchup rules separately from dragon affinity.
2. Add only the verified attacker and defender rows.
3. Do not infer the complete matrix from one screenshot.

## Recording Balance Changes

1. Preserve the superseded value in documentation or a future historical data file.
2. Add a source with capture date and game version if known.
3. Update active data only after the source is reviewed.

## Official Roster Check

Run `npm run check:roster` to compare the local roster with the ordinary public roster page. The parser intentionally never overwrites local data. Website structure may change, so selector maintenance may be required.
