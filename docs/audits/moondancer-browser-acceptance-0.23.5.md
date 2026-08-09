# Moondancer browser acceptance — 0.23.5

Date: 2026-08-09  
Build: production preview from the committed 0.23.5 source  
Browser: Codex in-app browser controller

## Database and roster

- The overview reported version 0.23.5, 34/34 dragons mapped, 238 abilities reviewed, and 34 curated synergy profiles.
- The catalog displayed Moondancer as Legendary, Warrior, and Verified.
- The detail view displayed the canonical troop affinities: Cavalry neutral, Shieldbearers positive, Archers positive, Spearmen neutral, and Siege negative.
- Crescent Blade, Warrior's Zeal, New Moon, Reactive Instincts, Full Moon, Blood Moon, and Eclipsing Strike were all visible.
- Expanding Verified wording exposed every Habit Level 1–5 progression and the source-backed unresolved notes.
- Moondancer was added locally at the screenshot-backed 2 Stars / Dragon Level 38 for optimizer acceptance. No private roster data was committed.

## Formation Builder

- `Moondancer / Vesper / Caraxes`: Crescent Blade resolved Vesper as the sole other Sentinel. The UI explained that Eventide Strike can perform a qualifying Tactical Damage or Recovery event and preserved the separate 50% Rising Tide roll with the once-per-round cap.
- `Moondancer / Dawnseeker / Caraxes`: Crescent Blade resolved Dawnseeker as the sole other Sentinel. Radiant Wings exposed both Tactical Damage and Recovery as qualifying event paths without duplicate relationship credit.
- `Moondancer / Vesper / Dawnseeker`: Crescent Blade and New Moon retained both Sentinel candidates, awarded neither one-recipient relationship, and reported that no tie rule is verified. The technical traces used `multiple-eligible-breed-candidates`.
- `Moondancer / Shadowrend / Dawnseeker`: the UI explained that Advantage deterministically changes both New Moon and Full Moon Rising Tide progressions from 25/30/35/42.5/50% to 50/60/70/85/100%, reports the percentage-point deltas and 2x multiplier, and explicitly says the resulting activation remains probabilistic. Shadowrend's conditional setup remained unquantified.
- Moondancer was checked outside Vanguard and then moved into Vanguard. Warrior's Zeal changed to the active Vanguard effect at Dragon Level 16+, supporting the Left Flank while retaining its self Physical Damage effect.
- Browser roster state does not expose canonical combat-stat inputs, so Reactive Instincts correctly reported `missing-stat-data`. The unique-highest and tied-highest controller fixtures are covered by focused automated tests rather than invented browser values.
- Rising Tide 4+ and 6+ thresholds remained visible as conditional mechanics; the UI made no guaranteed-uptime claim.

## Optimizer

With all 34 dragons owned, reservation exclusions disabled, 11 armies requested, and Moondancer at 2 Stars / Dragon Level 38:

- Best Overall First completed and placed Moondancer in Army 1.
- Highest Raw Power First completed and placed Moondancer in Army 1.
- Balance Raw Power Across Armies completed and placed Moondancer in Army 1.

Selection in Army 1 is acceptance evidence only, not a locked optimizer expectation.

## Console

No browser console warnings or errors were recorded across the overview, roster/detail, Formation Builder, and optimizer acceptance passes.
