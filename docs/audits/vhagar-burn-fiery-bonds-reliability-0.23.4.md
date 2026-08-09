# Vhagar Burn / Fiery Bonds reliability audit — 0.23.4

## Conclusion

The investigation hypothesis is confirmed. Fiery Bonds performs two different jobs:

- its Taunt output is a chance event: 25% against an ordinary target and 50% against a Burn-afflicted target;
- Burn deterministically selects the enhanced probability branch, changing the Taunt chance from 25% to 50%.

The old `vhagar-fiery-bonds-burn-payoff` binding pointed at the 50% Taunt chance component. A chance-based Burn provider therefore appeared to require two distinct chance events, and the unresolved joint-chance contract assigned the relationship zero numeric value. The corrected binding points at a conditional-deterministic probability-uplift component. A quantified provider's supported Burn opportunity now drives relationship reliability; the subsequent Taunt roll remains Vhagar output evidence and is not multiplied into setup/payoff reliability.

No optimizer weight, forced pairing preference, custom weight, uptime assumption, or special-case comparator was added.

## Verified Vhagar model

| Concern | Component | Reliability |
|---|---|---|
| Ordinary Taunt output | `vhagar-fiery-bonds:taunt`, `ordinary-target` | 0.25 chance |
| Burn-afflicted Taunt output | `vhagar-fiery-bonds:taunt`, `burn-afflicted-target` | 0.50 chance |
| Burn payoff | `vhagar-fiery-bonds:burn-taunt-probability-uplift` | condition-proven deterministic modifier |

The structured uplift evidence is `probability-uplift`, baseline `0.25`, conditioned `0.50`, absolute delta `0.25`, and relative multiplier `2`. This evidence is explainable metadata only; it does not multiply the generic conditional-payoff base value of 10.

## Burn-provider discovery

The canonical profiles expose exactly five current formation Burn providers. This list was discovered from profile signals rather than supplied as a scoring allow-list.

| Provider | Ability / unlock | Timing | Chance, targets, duration | Opportunity / roll scope | Current private progression | Binding | Vhagar relationship after correction |
|---|---|---|---|---|---|---|---|
| Daemoros | Shadowflame command / base | Rounds 1, 3, 5, 7, 9 | 20%; 1 target; 2 rounds | guaranteed at least one; shared | active | `daemoros-shadowflame-burn` → `daemoros-shadowflame:burn` | quantified at 0.20; value 2 from base 10 |
| Tairax | Burning Ward command / base | Rounds 2, 5, 8 | 50%; 1 target; 2 rounds | conditional on reaching Round 2; shared | active | `tairax-burning-ward-burn` → `tairax-burning-ward:burn` | unquantified; no battle-length probability invented |
| Sunfyre | Golden Wrath command / base | Rounds 1, 4, 7, 10, only below 50% Troop Capacity | 50%; up to 2 targets; 2 rounds | conditional on the below-50% state; per target | active | `sunfyre-golden-wrath-burn` → `sunfyre-golden-wrath:burn` | unquantified; no probability assigned to reaching the state |
| Caraxes | Crippling Inferno habit / Star Rank 6 | Each round | Habit 1–5: 10/12/14/17/20%; 3 targets; 2 rounds | guaranteed at least one; per target and effect | locked at Star Rank 2 | `caraxes-crippling-inferno-burn` → `caraxes-crippling-inferno:burn` | inactive at current progression; no early credit |
| Shadowsong | Blazing Conductor habit / Star Rank 10 | Rounds 2, 5, 8 | first target 40/52/64/80/100%; second distinct target 20/26/32/40/50%; 2 rounds | conditional on reaching Round 2; per target | locked at Star Rank 3 | two probability-context paths → `shadowsong-blazing-conductor:two-burn-attempts` | inactive at current progression; no early credit |

Unresolved provider questions remain explicit: cross-round independence, valid-target availability, Sunfyre's below-50% state, battle length beyond Round 1, and Shadowsong's two-variant signal shape. None receives an uptime floor.

## Conditional-mechanic comparison audit

The targeted comparison reviewed profiles in which one status or condition changes a later mechanic.

| Class | Current examples | Finding |
|---|---|---|
| 1. Condition deterministically modifies a later mechanic | Vhagar Burn→Taunt chance; Crimson Weakened→Bloodscale Fury chance; Zivern Vulnerable→Cloak of Terror chance; Arrax Bleed→Sudden Strike chance; Feskar Burn→damage rate; Caraxes First-Strike→damage; Syrax Slow→recovery; Seasmoke Panic→damage; Rhysarion Control→damage | Once the condition is true, the documented branch or modifier applies deterministically. The later output may still be probabilistic. |
| 2. Provider creates an opportunity but beneficiary performs a separate chance event | Tairax Gift of Fire: Burn creates the eligibility state, followed by a separate Resistance chance; Thunderstrike Advantage: Stagger must activate before its duration change matters | Preserve both events when the relationship being valued actually requires the beneficiary event. |
| 3. Two independent required chance events | Chance setup plus a distinct chance payoff whose success itself is the valued result | Continue to use the unresolved joint-chance contract unless the game evidence supplies dependence or a valid joint model. |
| 4. Unresolved | Shadowsong Scorched Earth secondary Panic branch and other ambiguous multi-effect wording | No production reliability change without stronger evidence. |

Only Vhagar's incorrect production binding is changed here. The analogous profiles remain documented comparison evidence; they are not silently remapped in this release.

## Placement delta

The deterministic release comparison covers all 32,736 ordered placements:

- changed placements: 870;
- numerically changed placements: 366;
- changed placements containing Vhagar: 870;
- changed placements without Vhagar: 0.

The 870 semantic changes are every arrangement containing Vhagar and one of the five canonical Burn providers. Numeric changes occur where the provider is quantified at the audited progression; the remaining cases retain zero numeric value but now expose the correct conditional-uplift trace.

Release placement manifest: `formationRatingV3ReleaseDeltas.0.23.3-to-0.23.4.json` (`sha256:cb804b96d4f34037e8c9706205aab00926b45c45f699f84a228a356dd58f9efa`).

## Contract decision

The release remains optimizer contract 6, `formation-rating-v3`, Estimated Power v2, Saved Formation schema 2, the existing reservation contracts, and `troop-affinity-recommendation-v1`. The correction changes current rating evidence and identities, not the serialized optimizer or Saved Formation API contract, so Formation Rating v4 is not warranted.
