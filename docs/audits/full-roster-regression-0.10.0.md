# Full-roster regression audit — 0.10.0

> Regression baseline after resolving the actionable 0.6.8 full-roster findings. Canonical dragon data, profile semantics, targeting, and rating calibration remain unchanged.

## Executive summary

- Source database: 0.10.0; data schema 13; local roster schema 5.
- Coverage: 31 dragons, 217 abilities, 224 profile signals, 217 audit dispositions.
- Evaluation: 15300 progression states, 26970 ordered formations, 4023 provider/payoff pairs.
- Result: 30 PASS checks, 0 failed checks, 2 classified findings.
- Deterministic full-result hash: `2a4561cdb2aa6d0b9483005f44cc3ee3747d21fb6c4ecb1fe0cc375c1dafbf64`.
- Recorded audit runtime: 13601 ms.

## Per-dragon audit

| Dragon | Rarity | Breed | Abilities | Signals | Dispositions | Evidence refs | Manual reviews | Result |
|---|---:|---|---:|---:|---:|---:|---:|---|
| Syrax (`syrax`) | Legendary | Sentinel | 7 | 10 | 7 | 8 | 1 | PASS |
| Vhagar (`vhagar`) | Legendary | Warrior | 7 | 7 | 7 | 7 | 1 | PASS |
| Caraxes (`caraxes`) | Legendary | Hunter | 7 | 6 | 7 | 7 | 1 | PASS |
| Seasmoke (`seasmoke`) | Legendary | Champion | 7 | 7 | 7 | 8 | 5 | PASS |
| Solstryker (`solstryker`) | Rare | Champion | 7 | 6 | 7 | 7 | 1 | PASS |
| Crimson (`crimson`) | Legendary | Hunter | 7 | 5 | 7 | 7 | 1 | PASS |
| Kalspire (`kalspire`) | Legendary | Champion | 7 | 4 | 7 | 7 | 1 | PASS |
| Malachite (`malachite`) | Legendary | Sentinel | 7 | 8 | 7 | 8 | 5 | PASS |
| Venator (`venator`) | Legendary | Warrior | 7 | 5 | 7 | 7 | 1 | PASS |
| Daemoros (`daemoros`) | Epic | Warrior | 7 | 5 | 7 | 7 | 1 | PASS |
| Feskar (`feskar`) | Epic | Champion | 7 | 5 | 7 | 7 | 1 | PASS |
| Rhysarion (`rhysarion`) | Epic | Champion | 7 | 9 | 7 | 7 | 1 | PASS |
| Shadowsong (`shadowsong`) | Epic | Hunter | 7 | 7 | 7 | 7 | 1 | PASS |
| Tashix (`tashix`) | Epic | Hunter | 7 | 6 | 7 | 7 | 1 | PASS |
| Vaeldra (`vaeldra`) | Epic | Warrior | 7 | 6 | 7 | 7 | 1 | PASS |
| Velar (`velar`) | Epic | Sentinel | 7 | 9 | 7 | 7 | 1 | PASS |
| Zivern (`zivern`) | Epic | Sentinel | 7 | 8 | 7 | 7 | 1 | PASS |
| Antares (`antares`) | Rare | Hunter | 7 | 6 | 7 | 7 | 1 | PASS |
| Shimmer (`shimmer`) | Rare | Sentinel | 7 | 11 | 7 | 7 | 1 | PASS |
| Jagadrix (`jagadrix`) | Rare | Hunter | 7 | 7 | 7 | 7 | 1 | PASS |
| Bevlorin (`bevlorin`) | Rare | Champion | 7 | 10 | 7 | 7 | 1 | PASS |
| Shadowrend (`shadowrend`) | Rare | Warrior | 7 | 14 | 7 | 7 | 1 | PASS |
| Thunderstrike (`thunderstrike`) | Rare | Warrior | 7 | 8 | 7 | 7 | 1 | PASS |
| Vesper (`vesper`) | Rare | Sentinel | 7 | 9 | 7 | 7 | 1 | PASS |
| Arulix (`arulix`) | Rare | Champion | 7 | 5 | 7 | 7 | 1 | PASS |
| Nyrena (`nyrena`) | Rare | Champion | 7 | 11 | 7 | 7 | 1 | PASS |
| Dawnseeker (`dawnseeker`) | Rare | Sentinel | 7 | 12 | 7 | 7 | 1 | PASS |
| Arrax (`arrax`) | Rare | Warrior | 7 | 5 | 7 | 7 | 1 | PASS |
| Tessarion (`tessarion`) | Epic | Champion | 7 | 4 | 7 | 9 | 1 | PASS |
| Sheepstealer (`sheepstealer`) | Legendary | Hunter | 7 | 4 | 7 | 9 | 5 | PASS |
| Vermax (`vermax`) | Epic | Warrior | 7 | 5 | 7 | 9 | 2 | PASS |

## Status and alias matrix

| Specific status | Aliases to | Satisfies Control |
|---|---|---|
| Panic (`status:panic`) | None | No |
| First-Strike (`status:first-strike`) | None | No |
| Burn (`status:burn`) | None | No |
| Slow (`status:slow`) | None | No |
| Taunt (`status:taunt`) | None | No |
| Control (`status:control`) | None | Yes |
| Stun (`status:stun`) | Control | Yes |
| Stagger (`status:stagger`) | Control | Yes |
| Overwhelm (`status:overwhelm`) | Control | Yes |
| Confusion (`status:confusion`) | Control | Yes |
| Vulnerable (`status:vulnerable`) | None | No |
| Weakened (`status:weakened`) | None | No |
| Bleed (`status:bleed`) | None | No |
| Resistance (`status:resistance`) | None | No |
| Advantage (`status:advantage`) | None | No |

Control is satisfied only by Stun, Stagger, Overwhelm, and Confusion (plus Control itself). Specific labels remain distinct; there are no damage-type aliases for periodic statuses. Recovery and Recovery Received are separate tags.

## Recipient selector inventory

| Selector | Signal count | Signal IDs |
|---|---:|---|
| adjacent-group:1:other-only | 2 | `nyrena-deepen-the-breach-fire`, `vesper-saviors-waltz-resistance` |
| adjacent-group:2:self-eligible | 1 | `dawnseeker-radiant-wings-recovery` |
| adjacent:all-eligible-teammates | 5 | `malachite-lightning-strike-first-strike`, `malachite-lightning-strike-strength`, `rhysarion-inspiring-melody-initiative`, `rhysarion-inspiring-melody-resistance`, `seasmoke-cunning-ferocity-fire-intelligence` |
| fixed-position:left-flank | 15 | `arrax-warriors-resilience-left-tactical`, `daemoros-warriors-zeal-left-stats`, `dawnseeker-sentinels-presence-left-fire`, `malachite-sentinels-presence-left-fire`, `shadowrend-warriors-zeal-left-stats`, `shimmer-sentinels-presence-left-fire`, `syrax-sentinels-wit-left-stats`, `thunderstrike-warriors-zeal-left-stats`, `vaeldra-warriors-resilience-left-tactical`, `velar-sentinels-wit-left-stats`, `venator-warriors-zeal-left-stats`, `vermax-warriors-zeal-left-stats`, `vesper-sentinels-wit-left-stats`, `vhagar-warriors-resilience-left-tactical`, `zivern-sentinels-wit-left-stats` |
| fixed-position:right-flank | 10 | `antares-hunters-wrath-right-stats`, `bevlorin-champions-vigor-right-damage`, `caraxes-hunters-wrath-right-stats`, `crimson-hunters-cunning-right-physical`, `jagadrix-hunters-wrath-right-stats`, `nyrena-champions-brilliance-right-defense`, `rhysarion-champions-vigor-right-damage`, `shadowsong-hunters-wrath-right-stats`, `sheepstealer-hunters-cunning-right-physical`, `tashix-hunters-cunning-right-physical` |
| formation:all-eligible-teammates | 177 | `antares-blazing-onslaught-fire-vulnerability`, `antares-blazing-onslaught-non-basic-physical-vulnerability`, `antares-fiery-precision-slow-payoff`, `antares-relentless-pursuit-fire`, `antares-relentless-pursuit-vulnerable`, `arrax-sudden-strike-bleed-payoff`, `arrax-sudden-strike-physical`, `arrax-sudden-strike-weakened`, `arrax-turn-the-line-physical`, `arulix-battle-cunning-instinct-payoff`, `arulix-gleaming-spiral-physical`, `arulix-gleaming-spiral-tactical`, `arulix-hypnotic-helix-overwhelm`, `arulix-hypnotic-helix-stagger`, `bevlorin-natures-reckoning-fire`, `bevlorin-natures-reckoning-intelligence-payoff`, `bevlorin-natures-reckoning-physical`, `bevlorin-natures-reckoning-strength-payoff`, `bevlorin-renewal-recovery`, `caraxes-crippling-inferno-burn`, `caraxes-crippling-inferno-fire`, `caraxes-crippling-inferno-slow`, `caraxes-infernal-burst-fire`, `caraxes-infernal-burst-first-strike-payoff`, `crimson-bloodscale-fury-taunt-payoff`, `crimson-bloodscale-terror-fire`, `crimson-bloodscale-terror-stun`, `crimson-unlikely-hero-vulnerability`, `daemoros-instill-fear-panic`, `daemoros-shadowflame-burn`, `daemoros-shadowflame-physical`, `daemoros-shroud-of-shadows-confusion`, `dawnseeker-first-light-first-strike`, `dawnseeker-first-light-stats`, `dawnseeker-initiative-payoff`, `dawnseeker-instinct-payoff`, `dawnseeker-radiant-wings-tactical`, `dawnseeker-tactical-payoff`, `dawnseeker-unbroken-devotion-recovery-received`, `dawnseeker-winds-favor-initiative`, `feskar-calculated-assault-tactical`, `feskar-emerald-inferno-burn-payoff`, `feskar-emerald-inferno-fire`, `feskar-insightful-allies-instinct`, `feskar-unyielding-grasp-stagger`, `jagadrix-cunning-whispers-fire`, `jagadrix-cunning-whispers-initiative-payoff`, `jagadrix-cunning-whispers-intelligence-payoff`, `jagadrix-echoes-of-deceit-fire`, `jagadrix-echoes-of-deceit-panic-payoff`, `jagadrix-whispering-sabotage-weakened`, `kalspire-tactical-assault-panic`, `kalspire-tactical-assault-physical`, `kalspire-tactical-strike-bleed`, `kalspire-tactical-strike-tactical`, `malachite-collective-might-strength`, `malachite-forests-instinct-physical`, `malachite-thunderous-roar-damage`, `malachite-wardens-rally-recovery`, `malachite-wardens-rally-tactical`, `nyrena-fire-payoff`, `nyrena-initiative-payoff`, `nyrena-instinct-payoff`, `nyrena-intelligence-payoff`, `nyrena-mindful-synergy-stats`, `nyrena-tactical-payoff`, `nyrena-the-long-siege-physical-defense`, `nyrena-undermine-fire`, `nyrena-undermine-tactical`, `rhysarion-dawnsong-control-payoff`, `rhysarion-dawnsong-fire`, `rhysarion-dawnsong-physical`, `rhysarion-ebbing-fury-recovery`, `rhysarion-echoing-melody-recovery`, `rhysarion-unbroken-devotion-recovery`, `seasmoke-cleansing-wrath-fire`, `seasmoke-clever-maneuver-stats`, `seasmoke-infectious-wrath-panic-payoff`, `seasmoke-infectious-wrath-physical`, `seasmoke-loyal-bond-resistance`, `seasmoke-winds-favor-initiative`, `shadowrend-eclipse-fervor-panic`, `shadowrend-eclipse-fervor-physical`, `shadowrend-eclipse-fervor-tactical`, `shadowrend-event-horizon-physical`, `shadowrend-event-horizon-tactical`, `shadowrend-initiative-payoff`, `shadowrend-instinct-payoff`, `shadowrend-midnight-aura-instinct`, `shadowrend-midnight-aura-strength`, `shadowrend-midnight-mastery-physical`, `shadowrend-midnight-mastery-tactical`, `shadowrend-strength-payoff`, `shadowsong-blazing-conductor-burn`, `shadowsong-blazing-onslaught-vulnerability`, `shadowsong-breath-of-fire-fire`, `shadowsong-panic-payoff`, `shadowsong-scorched-earth-vulnerable`, `shadowsong-scorched-earth-vulnerable-status`, `sheepstealer-hunters-cunning-recovery-payoff`, `sheepstealer-wild-hunt-fire`, `shimmer-loyal-shield-recovery`, `shimmer-loyal-shield-resistance-payoff`, `shimmer-unbreakable-loyalty-instinct-payoff`, `shimmer-unbreakable-loyalty-tactical`, `shimmer-unbroken-devotion-recovery`, `solstryker-oppressive-onslaught-overwhelm`, `solstryker-tactical-onslaught-instinct-payoff`, `solstryker-tactical-onslaught-physical`, `solstryker-tactical-onslaught-strength-payoff`, `solstryker-tactical-onslaught-tactical`, `solstryker-tactical-onslaught-vulnerable-payoff`, `syrax-blazing-fury-fire-support`, `syrax-blazing-fury-first-strike`, `syrax-blazing-fury-tactical`, `syrax-flight-mastery-initiative`, `syrax-mindful-synergy-stats`, `syrax-strategic-revival-recovery`, `syrax-strategic-revival-resistance`, `syrax-strategic-revival-slow-payoff`, `syrax-tactical-inferno-damage-support`, `tashix-battle-guile-fire`, `tashix-dragons-cunning-initiative-payoff`, `tashix-dragons-cunning-physical`, `tashix-hunters-cunning-recovery-payoff`, `tashix-shimmering-mirage-fire`, `tessarion-blazing-leader-fire`, `tessarion-clever-maneuver-stats`, `tessarion-cobalt-flame-fire`, `tessarion-cobalt-flame-physical`, `thunderstrike-armor-break-physical`, `thunderstrike-barbed-lash-bleed`, `thunderstrike-barbed-lash-physical`, `thunderstrike-staggering-assault-advantage-payoff`, `thunderstrike-staggering-assault-stagger`, `thunderstrike-strength-payoff`, `thunderstrike-tail-whip-physical`, `vaeldra-infernal-force-damage`, `vaeldra-lure-physical`, `vaeldra-lure-taunt`, `vaeldra-sirens-call-stagger`, `vaeldra-tempting-distraction-vulnerability`, `velar-breath-of-renewal-recovery`, `velar-fierce-unity-initiative-payoff`, `velar-fierce-unity-stats`, `velar-gales-of-power-first-strike`, `velar-gales-of-power-slow`, `velar-strategic-leader-tactical`, `velar-whirlwind-advantage-damage`, `velar-whirlwind-tactical`, `venator-armor-break-physical`, `venator-desperate-ambush-overwhelm`, `venator-feral-precision-physical`, `venator-feral-strike-physical`, `vermax-rallying-flame-tactical`, `vermax-reactive-instincts-stats`, `vermax-spreading-blaze-physical`, `vermax-spreading-blaze-tactical`, `vesper-eventide-strike-slow`, `vesper-eventide-strike-tactical`, `vesper-insightful-allies-instinct`, `vesper-instinct-payoff`, `vesper-midnight-onslaught-confusion`, `vesper-tactical-payoff`, `vhagar-battle-leader-physical`, `vhagar-blazing-onslaught-vulnerability`, `vhagar-fiery-bonds-burn-payoff`, `vhagar-fiery-bonds-physical`, `vhagar-fiery-bonds-taunt`, `vhagar-skyward-titan-physical`, `zivern-battle-mastery-intelligence-payoff`, `zivern-battle-mastery-physical`, `zivern-cloak-of-terror-overwhelm`, `zivern-cloak-of-terror-vulnerable-payoff`, `zivern-fearsome-reach-panic`, `zivern-silent-shade-tactical`, `zivern-silent-shade-tactical-vulnerability` |
| highest-stat:initiative:self-eligible | 1 | `bevlorin-bountiful-gifts-initiative` |
| highest-stat:instinct:self-eligible | 1 | `bevlorin-bountiful-gifts-instinct` |
| highest-stat:intelligence:self-eligible | 1 | `bevlorin-bountiful-gifts-intelligence` |
| highest-stat:strength:other-only | 3 | `shimmer-sneak-attack-first-strike`, `shimmer-sneak-attack-physical`, `shimmer-unbreakable-loyalty-stats` |
| highest-stat:strength:self-eligible | 1 | `bevlorin-bountiful-gifts-strength` |
| position-priority:left-flank:self-eligible | 2 | `dawnseeker-tactical-inferno-tactical`, `shimmer-crushing-force-physical` |
| position-priority:right-flank:self-eligible | 2 | `dawnseeker-tactical-inferno-fire`, `shimmer-crushing-force-tactical` |
| position-priority:vanguard:self-eligible | 1 | `vesper-strategic-leader-tactical` |
| self-only:no-allied-recipient | 1 | `sheepstealer-savage-claim-recovery` |
| unresolved-group:2:self-eligible | 1 | `shadowrend-fueled-by-darkness-advantage` |

## Progression audit

Every signal and position claim was evaluated at Star Ranks 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, Dragon Levels 15 and 16, and all three positions. 9102 states were active and 6198 were inactive. The evaluator was additionally exercised across 15300 progression formations.

## Provider/payoff matrix

The audit evaluated 4023 ordered provider/payoff signal-tag pairs (305 distinct tag pairs); 127 were compatible. Compatible distinct pairs: `damage:fire->damage:fire`, `damage:tactical->damage:tactical`, `effect:recovery->effect:recovery`, `status:advantage->status:advantage`, `status:bleed->status:bleed`, `status:burn->status:burn`, `status:confusion->status:control`, `status:first-strike->status:first-strike`, `status:overwhelm->status:control`, `status:panic->status:panic`, `status:resistance->status:resistance`, `status:slow->status:slow`, `status:stagger->status:control`, `status:stun->status:control`, `status:taunt->status:taunt`, `status:vulnerable->status:vulnerable`.

## Formation and rating sweep

All 26970 ordered formations were evaluated at 10 Stars and Dragon Level 16. Rating range 16–93; mean 52.5461; median 52; P90 70; P95 74; P99 84.

| Tier | Count |
|---|---:|
| Developing | 13773 |
| Excellent | 41 |
| Solid | 7339 |
| Strong | 1241 |
| Weak | 4576 |

### Top 50 formations

| Left / Vanguard / Right | Score | Tier | Relationships | Missing | Conflicts |
|---|---:|---|---:|---:|---:|
| caraxes / feskar / syrax | 93 | Excellent | 10 | 0 | 1 |
| caraxes / shimmer / syrax | 93 | Excellent | 9 | 1 | 1 |
| caraxes / syrax / feskar | 93 | Excellent | 10 | 0 | 1 |
| feskar / caraxes / syrax | 93 | Excellent | 10 | 0 | 1 |
| feskar / syrax / caraxes | 93 | Excellent | 10 | 0 | 1 |
| syrax / caraxes / feskar | 93 | Excellent | 10 | 0 | 1 |
| syrax / caraxes / velar | 93 | Excellent | 13 | 1 | 1 |
| syrax / feskar / caraxes | 93 | Excellent | 10 | 0 | 1 |
| caraxes / malachite / syrax | 92 | Excellent | 9 | 0 | 1 |
| feskar / shadowsong / shadowrend | 92 | Strong | 11 | 3 | 1 |
| feskar / zivern / shadowsong | 92 | Excellent | 9 | 1 | 1 |
| malachite / caraxes / syrax | 92 | Excellent | 9 | 0 | 1 |
| syrax / caraxes / malachite | 92 | Excellent | 9 | 0 | 1 |
| syrax / caraxes / nyrena | 92 | Strong | 14 | 3 | 1 |
| syrax / malachite / caraxes | 92 | Excellent | 9 | 0 | 1 |
| syrax / sheepstealer / velar | 92 | Excellent | 11 | 1 | 1 |
| syrax / vesper / caraxes | 92 | Excellent | 8 | 1 | 1 |
| velar / sheepstealer / syrax | 92 | Excellent | 11 | 1 | 1 |
| caraxes / syrax / vesper | 91 | Excellent | 9 | 1 | 1 |
| caraxes / vesper / syrax | 91 | Excellent | 8 | 1 | 1 |
| crimson / rhysarion / vaeldra | 91 | Excellent | 10 | 0 | 1 |
| seasmoke / shadowsong / shadowrend | 91 | Strong | 13 | 3 | 1 |
| seasmoke / shadowsong / zivern | 91 | Excellent | 11 | 1 | 1 |
| shadowsong / seasmoke / zivern | 91 | Excellent | 11 | 1 | 1 |
| syrax / caraxes / shadowrend | 91 | Strong | 11 | 3 | 1 |
| syrax / caraxes / vesper | 91 | Excellent | 8 | 1 | 1 |
| vaeldra / rhysarion / crimson | 91 | Excellent | 10 | 0 | 1 |
| vesper / caraxes / syrax | 91 | Excellent | 8 | 1 | 1 |
| vesper / syrax / caraxes | 91 | Excellent | 9 | 1 | 1 |
| zivern / seasmoke / shadowsong | 91 | Excellent | 11 | 1 | 1 |
| zivern / shadowsong / seasmoke | 91 | Excellent | 11 | 1 | 1 |
| zivern / shadowsong / tessarion | 91 | Excellent | 11 | 1 | 1 |
| caraxes / sheepstealer / syrax | 90 | Excellent | 7 | 0 | 1 |
| feskar / caraxes / velar | 90 | Excellent | 8 | 1 | 1 |
| shimmer / vesper / syrax | 90 | Excellent | 9 | 2 | 1 |
| syrax / antares / velar | 90 | Excellent | 11 | 1 | 1 |
| syrax / caraxes / arulix | 90 | Excellent | 7 | 1 | 1 |
| syrax / caraxes / dawnseeker | 90 | Excellent | 13 | 2 | 1 |
| syrax / dawnseeker / caraxes | 90 | Excellent | 13 | 2 | 1 |
| syrax / sheepstealer / caraxes | 90 | Excellent | 7 | 0 | 1 |
| syrax / sheepstealer / vesper | 90 | Excellent | 7 | 1 | 1 |
| syrax / shimmer / vesper | 90 | Excellent | 11 | 2 | 1 |
| syrax / zivern / shadowsong | 90 | Excellent | 12 | 2 | 1 |
| vesper / sheepstealer / syrax | 90 | Excellent | 7 | 1 | 1 |
| vesper / shimmer / syrax | 90 | Excellent | 11 | 2 | 1 |
| antares / caraxes / syrax | 89 | Strong | 8 | 0 | 1 |
| antares / shadowsong / zivern | 89 | Strong | 7 | 2 | 1 |
| antares / syrax / caraxes | 89 | Strong | 8 | 0 | 1 |
| antares / syrax / vesper | 89 | Strong | 8 | 1 | 1 |
| antares / vesper / syrax | 89 | Strong | 7 | 1 | 1 |

### Bottom 50 formations

| Left / Vanguard / Right | Score | Tier | Relationships | Missing | Conflicts |
|---|---:|---|---:|---:|---:|
| antares / daemoros / kalspire | 16 | Weak | 0 | 1 | 1 |
| antares / daemoros / shimmer | 16 | Weak | 0 | 3 | 1 |
| antares / daemoros / vermax | 16 | Weak | 0 | 1 | 1 |
| antares / kalspire / daemoros | 16 | Weak | 0 | 1 | 1 |
| antares / kalspire / shimmer | 16 | Weak | 0 | 3 | 1 |
| antares / venator / shimmer | 16 | Weak | 0 | 3 | 1 |
| antares / vermax / daemoros | 16 | Weak | 0 | 1 | 1 |
| arrax / caraxes / sheepstealer | 16 | Weak | 0 | 2 | 1 |
| arrax / caraxes / vesper | 16 | Weak | 0 | 3 | 1 |
| arrax / feskar / jagadrix | 16 | Weak | 0 | 5 | 1 |
| arrax / feskar / sheepstealer | 16 | Weak | 0 | 2 | 1 |
| arrax / jagadrix / caraxes | 16 | Weak | 0 | 5 | 1 |
| arrax / jagadrix / feskar | 16 | Weak | 0 | 5 | 1 |
| arrax / jagadrix / sheepstealer | 16 | Weak | 0 | 4 | 1 |
| arrax / jagadrix / vesper | 16 | Weak | 0 | 5 | 1 |
| arrax / sheepstealer / caraxes | 16 | Weak | 0 | 2 | 1 |
| arrax / sheepstealer / feskar | 16 | Weak | 0 | 2 | 1 |
| arrax / sheepstealer / jagadrix | 16 | Weak | 0 | 4 | 1 |
| arrax / sheepstealer / vesper | 16 | Weak | 0 | 2 | 1 |
| arrax / vesper / caraxes | 16 | Weak | 0 | 3 | 1 |
| arrax / vesper / jagadrix | 16 | Weak | 0 | 5 | 1 |
| arrax / vesper / sheepstealer | 16 | Weak | 0 | 2 | 1 |
| arulix / caraxes / sheepstealer | 16 | Weak | 0 | 2 | 1 |
| arulix / jagadrix / caraxes | 16 | Weak | 0 | 5 | 1 |
| arulix / jagadrix / sheepstealer | 16 | Weak | 0 | 4 | 1 |
| arulix / kalspire / bevlorin | 16 | Weak | 0 | 3 | 1 |
| arulix / kalspire / caraxes | 16 | Weak | 0 | 2 | 1 |
| arulix / kalspire / daemoros | 16 | Weak | 0 | 1 | 1 |
| arulix / kalspire / sheepstealer | 16 | Weak | 0 | 1 | 1 |
| arulix / sheepstealer / caraxes | 16 | Weak | 0 | 2 | 1 |
| arulix / sheepstealer / jagadrix | 16 | Weak | 0 | 4 | 1 |
| arulix / solstryker / bevlorin | 16 | Weak | 0 | 6 | 1 |
| arulix / solstryker / caraxes | 16 | Weak | 0 | 5 | 1 |
| arulix / solstryker / daemoros | 16 | Weak | 0 | 4 | 1 |
| arulix / solstryker / jagadrix | 16 | Weak | 0 | 7 | 1 |
| arulix / solstryker / sheepstealer | 16 | Weak | 0 | 4 | 1 |
| bevlorin / arulix / caraxes | 16 | Weak | 0 | 4 | 1 |
| bevlorin / arulix / daemoros | 16 | Weak | 0 | 3 | 1 |
| bevlorin / arulix / jagadrix | 16 | Weak | 0 | 6 | 1 |
| bevlorin / arulix / kalspire | 16 | Weak | 0 | 3 | 1 |
| bevlorin / arulix / sheepstealer | 16 | Weak | 0 | 3 | 1 |
| bevlorin / arulix / solstryker | 16 | Weak | 0 | 6 | 1 |
| bevlorin / caraxes / sheepstealer | 16 | Weak | 0 | 3 | 1 |
| bevlorin / caraxes / vesper | 16 | Weak | 0 | 4 | 1 |
| bevlorin / daemoros / arulix | 16 | Weak | 0 | 3 | 1 |
| bevlorin / daemoros / caraxes | 16 | Weak | 0 | 3 | 1 |
| bevlorin / daemoros / kalspire | 16 | Weak | 0 | 2 | 1 |
| bevlorin / daemoros / sheepstealer | 16 | Weak | 0 | 2 | 1 |
| bevlorin / daemoros / solstryker | 16 | Weak | 0 | 5 | 1 |
| bevlorin / daemoros / vermax | 16 | Weak | 0 | 2 | 1 |

## Findings

Finding totals by severity: informational 2. By category: unresolved by design 1, unsupported by current simple evaluator 1.

### FRR-F001 — unsupported by current simple evaluator (informational)

- Affected area: Recipient selection
- Ability/profile signal: shadowrend-fueled-by-darkness-advantage
- Current behavior: 1 curated signal(s) use an unresolved group selector and intentionally create no guessed scored relationship.
- Expected behavior: Keep the mechanic visible and non-scoring until canonical wording or data identifies a deterministic recipient.
- Reproduction: Place each listed provider in a full Level 16, 10-Star formation and inspect relationship output for the listed signal.
- Files: `src/synergy/profiles.ts`, `src/synergy/recipientSelectors.ts`
- Focused automated reproduction: Yes
- Controller mechanic confirmation needed: No
- Recommended next action: Retain conservative behavior; add a focused mechanic prompt only if controller evidence resolves the recipient.
- Audit disposition: Not fixed in this audit PR.

### FRR-F002 — unresolved by design (informational)

- Affected area: Highest-stat recipient selection
- Ability/profile signal: shimmer-sneak-attack-first-strike, shimmer-unbreakable-loyalty-stats, shimmer-sneak-attack-physical, bevlorin-bountiful-gifts-strength, bevlorin-bountiful-gifts-intelligence, bevlorin-bountiful-gifts-instinct, bevlorin-bountiful-gifts-initiative
- Current behavior: Canonical combat-stat values are incomplete, so highest-stat recipients remain unresolved and receive neither relationship credit nor Kit Utilization penalties.
- Expected behavior: Resolve only a unique known maximum; ties and missing values must remain uncredited.
- Reproduction: Evaluate the listed signal with canonical progression combatStats; then compare with a synthetic unique maximum and a synthetic tie.
- Files: `src/data/dragons.ts`, `src/synergy/recipientSelectors.ts`, `src/services/formationRating.ts`
- Focused automated reproduction: Yes
- Controller mechanic confirmation needed: No
- Recommended next action: No production change. Populate verified canonical combat stats only through a separately reviewed data task.
- Audit disposition: Not fixed in this audit PR.

## Resolved findings compared with 0.6.8

- FRR-F003: Equivalent active paths still aggregate, while locked and position-inactive alternatives no longer contribute ability IDs or presentation evidence.
- FRR-F004: Details At a glance now uses selected Star Rank and Dragon Level, and future signals are explicitly labeled inactive with their unlock requirement.
- FRR-F005: Scoped reusable Details styles allow headings, technical labels, and chips to shrink and wrap within their own boxes.
- FRR-F006: About now states 31/31 detailed coverage with Legendary 9/9, Epic 10/10, and Rare 12/12.

The 0.6.8 deterministic hash was `2a4561cdb2aa6d0b9483005f44cc3ee3747d21fb6c4ecb1fe0cc375c1dafbf64`; the 0.10.0 hash is `2a4561cdb2aa6d0b9483005f44cc3ee3747d21fb6c4ecb1fe0cc375c1dafbf64`. All 26,970 numeric scores and component totals unchanged: Yes.

## Browser QA

Status: PASS_WITH_PENDING_REAL_200_PERCENT_ZOOM. Audited URL: http://127.0.0.1:4190/ (local 0.9.1 production preview). Fixture: isolated localhost schema-4 Syrax import. Workspace overflow: 0; clipped interactive controls: 0; console errors: 0; console warnings: 0.

Real desktop 200% zoom: PENDING_REAL_BROWSER_ZOOM. Chrome extension keypresses did not change browser zoom. The 720×500 layout-equivalent check had document, workspace, and list scroll widths equal to their client widths.

## Rerun

```powershell
pnpm run audit:full-roster
```

Use `pnpm run audit:full-roster:write` only when intentionally refreshing the committed audit artifacts, then review the complete diff. The normal command verifies the committed deterministic baseline without rewriting it.

Focused `it.todo` markers (2): `FRR-F001`, `FRR-F002`.

## Explicit non-changes

- No formula, weight, threshold, guardrail, placement, or calibration changes.
- No dragon wording, curated profile, targeting, or rating semantics changed.
- Source schema 13, formation share links, formation evaluation, and the rating model remain unchanged; local/cloud roster JSON advanced to schema 5 without SQL changes.
- FRR-F001 and FRR-F002 remain informational and unresolved by design.
