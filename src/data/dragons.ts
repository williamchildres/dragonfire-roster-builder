import type { Dragon } from '../models/dragon';

export const dragons = [
  {
    "id": "syrax",
    "slug": "syrax",
    "name": "Syrax",
    "rarity": "Legendary",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/syrax/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "syrax-blazing-fury",
      "dragonId": "syrax",
      "kind": "command",
      "name": "Blazing Fury",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each Round: 20% chance to increase Fire Damage Dealt by 10% and grant First-Strike to one Ally in any lane for 2 rounds, prioritizing Allies that deal Fire Damage.\n\nRounds 1, 4, 6, and 9: deal Tactical Damage to one enemy within adjacency at a 110% Damage Rate.\n\nAt 6+ Stars:\n\nRounds 2, 5, and 8: apply Recovery to the Ally with the least current troops at a 50% Recovery Rate, enhanced by Intelligence. Resistance applies to the same selected Ally. Resistance has a 40% activation chance at effective Habit Level 1 and lasts 2 rounds.\n\nStar Rank 6 augmentation:\nAt 6 Stars, Strategic Revival augments Blazing Fury with Recovery and Resistance on rounds 2, 5, and 8.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Syrax Blazing Fury screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "syrax-blazing-fury-summary-2026-06-24",
        "syrax-blazing-fury-details-2026-06-24"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "FIRE_DAMAGE_UP",
        "FIRST_STRIKE",
        "ANY_LANE_TARGET"
      ]
    },
    "trait": {
      "id": "syrax-sentinels-wit",
      "dragonId": "syrax",
      "kind": "trait",
      "name": "Sentinel's Wit",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard, increase Syrax Tactical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Syrax Sentinel's Wit screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "syrax-sentinels-wit-2026-06-24"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "INSTINCT_UP",
        "BUFF_INITIATIVE",
        "VANGUARD_REQUIRED",
        "LEFT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "syrax-mindful-synergy",
        "dragonId": "syrax",
        "kind": "habit",
        "name": "Mindful Synergy",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: increase Intelligence and Instinct of 3 Allies in any lane until end of combat, enhanced by Syrax Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Syrax Mindful Synergy screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "syrax-mindful-synergy-2026-06-24"
        ],
        "tags": [
          "BUFF_INTELLIGENCE",
          "BUFF_INSTINCTS",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "syrax-flight-mastery",
        "dragonId": "syrax",
        "kind": "habit",
        "name": "Flight Mastery",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: increase Initiative of 3 Allies and reduce Initiative of 3 Enemies in any lane until end of combat, enhanced by Syrax Instinct.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Syrax Flight Mastery screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "syrax-flight-mastery-2026-06-24"
        ],
        "tags": [
          "BUFF_INITIATIVE",
          "DEBUFF_INITIATIVE"
        ]
      },
      {
        "id": "syrax-strategic-revival",
        "dragonId": "syrax",
        "kind": "habit",
        "name": "Strategic Revival",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Blazing Fury: Rounds 2, 5, 8 recover the Ally with least current troops. Recovery is multiplied by 1.5 if any enemy has Slow. Chance to grant Resistance (-20%) for 2 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Syrax Strategic Revival screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "syrax-strategic-revival-2026-06-24"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "RECOVERY",
          "RESISTANCE"
        ]
      },
      {
        "id": "syrax-tactical-inferno",
        "dragonId": "syrax",
        "kind": "habit",
        "name": "Tactical Inferno",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1: increase Tactical Damage Dealt of one Ally, prioritizing Left Flank, and Fire Damage Dealt of one Ally, prioritizing Right Flank, for 3 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Syrax Tactical Inferno screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "syrax-tactical-inferno-2026-06-24"
        ],
        "tags": [
          "TACTICAL_DAMAGE",
          "FIRE_DAMAGE_UP",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "syrax-mothers-mercy",
        "dragonId": "syrax",
        "kind": "habit",
        "name": "Mother's Mercy",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: chance to cleanse two Negative effects and one Control effect from one Ally in any lane, prioritizing Allies afflicted with Control.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Syrax Mother's Mercy screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "syrax-mothers-mercy-2026-06-24"
        ],
        "tags": [
          "CLEANSE_NEGATIVE",
          "CONTROL"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "positive",
      "Spearmen": "positive",
      "Siege": "negative"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TACTICAL_DAMAGE",
      "FIRE_DAMAGE_UP",
      "FIRST_STRIKE",
      "ANY_LANE_TARGET",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "VANGUARD_REQUIRED",
      "LEFT_FLANK_TARGET",
      "BUFF_INTELLIGENCE",
      "BUFF_INSTINCTS",
      "BUFF_ALLIES",
      "DEBUFF_INITIATIVE",
      "COMMAND_AUGMENTATION",
      "RECOVERY",
      "RESISTANCE",
      "CLEANSE_NEGATIVE",
      "CONTROL"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Syrax main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Syrax Blazing Fury screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Syrax Sentinel's Wit screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Syrax Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Syrax main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "vhagar",
    "slug": "vhagar",
    "name": "Vhagar",
    "rarity": "Legendary",
    "breed": "Warrior",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/vhagar/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "vhagar-fiery-bonds",
      "dragonId": "vhagar",
      "kind": "command",
      "name": "Fiery Bonds",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: 25% chance to afflict Taunt on three enemies in any lane for two rounds, doubled to 50% against Burned targets. Even-numbered rounds: deal Physical Damage to one enemy within adjacency, Damage Rate +120%. Taunt roll scope is not stated.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vhagar Fiery Bonds screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vhagar-fiery-bonds-summary-2026-06-25"
      ],
      "tags": [
        "TAUNT",
        "PHYSICAL_DAMAGE",
        "ADJACENT_TARGET"
      ]
    },
    "trait": {
      "id": "vhagar-warriors-resilience",
      "dragonId": "vhagar",
      "kind": "trait",
      "name": "Warrior's Resilience",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Vhagar Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vhagar Warrior's Resilience screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vhagar-warriors-resilience-2026-06-25"
      ],
      "tags": [
        "DAMAGE_RECEIVED_DOWN",
        "TACTICAL_DAMAGE",
        "LEFT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "vhagar-ancestral-shield",
        "dragonId": "vhagar",
        "kind": "habit",
        "name": "Ancestral Shield",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for three rounds: reduce Physical and Tactical Damage Received. Start of Round 4 until end of combat: increase Recovery Received.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vhagar Ancestral Shield screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vhagar-ancestral-shield-2026-06-25"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "RECOVERY_RECEIVED_UP"
        ]
      },
      {
        "id": "vhagar-battle-leader",
        "dragonId": "vhagar",
        "kind": "habit",
        "name": "Battle Leader",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: select one ally in any lane, preferring Right Flank with fallback, and increase Physical Damage Dealt excluding Basic Attacks.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vhagar Battle Leader screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vhagar-battle-leader-2026-06-25"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP"
        ]
      },
      {
        "id": "vhagar-eclipse-cover",
        "dragonId": "vhagar",
        "kind": "habit",
        "name": "Eclipse Cover",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Rounds 3 through 7 inclusive: one shared ranked activation roll. On success, grant Advantage to the ally with most current troops and Weakened to the enemy with most current troops for two rounds. Prose rounds L1 to 18%; table shows 17.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vhagar Eclipse Cover screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vhagar-eclipse-cover-2026-06-25"
        ],
        "tags": [
          "ADVANTAGE",
          "WEAKENED"
        ]
      },
      {
        "id": "vhagar-blazing-onslaught",
        "dragonId": "vhagar",
        "kind": "habit",
        "name": "Blazing Onslaught",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for three rounds: increase Fire Damage Received on one enemy preferring Left Flank, and Physical Damage Received excluding Basic Attacks on one enemy preferring Right Flank. Effects select independently; distinct targets are not required.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vhagar Blazing Onslaught screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vhagar-blazing-onslaught-2026-06-25"
        ],
        "tags": [
          "FIRE_DAMAGE",
          "PHYSICAL_DAMAGE_UP"
        ]
      },
      {
        "id": "vhagar-skyward-titan",
        "dragonId": "vhagar",
        "kind": "habit",
        "name": "Skyward Titan",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: 30% chance to gain one Bulwark stack, max five, until end of combat. Each stack increases Strength and reduces Physical/Tactical Damage Received. When Vhagar gains the third Bulwark stack, deal Physical Damage to one enemy in the same lane.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vhagar Skyward Titan screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vhagar-skyward-titan-2026-06-25"
        ],
        "tags": [
          "BULWARK",
          "STRENGTH_UP",
          "DAMAGE_RECEIVED_DOWN",
          "PHYSICAL_DAMAGE"
        ]
      }
    ],
    "affinities": {
      "Shieldbearers": "positive",
      "Archers": "positive",
      "Siege": "positive",
      "Cavalry": "unknown",
      "Spearmen": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TAUNT",
      "PHYSICAL_DAMAGE",
      "ADJACENT_TARGET",
      "DAMAGE_RECEIVED_DOWN",
      "TACTICAL_DAMAGE",
      "LEFT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "RECOVERY_RECEIVED_UP",
      "PHYSICAL_DAMAGE_UP",
      "ADVANTAGE",
      "WEAKENED",
      "FIRE_DAMAGE",
      "BULWARK",
      "STRENGTH_UP"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Vhagar Fiery Bonds screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Vhagar Warrior's Resilience screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Vhagar Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Vhagar main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "caraxes",
    "slug": "caraxes",
    "name": "Caraxes",
    "rarity": "Legendary",
    "breed": "Hunter",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/caraxes/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "caraxes-infernal-burst",
      "dragonId": "caraxes",
      "kind": "command",
      "name": "Infernal Burst",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 3, 6, 9: deal Fire Damage to 3 Enemies in any lane (Damage Rate +100%). If Caraxes has First-Strike, damage is multiplied by 1.5 and displayed as +150%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Caraxes Infernal Burst screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "caraxes-infernal-burst-2026-06-24"
      ],
      "tags": [
        "FIRE_DAMAGE",
        "ANY_LANE_TARGET"
      ]
    },
    "trait": {
      "id": "caraxes-hunters-wrath",
      "dragonId": "caraxes",
      "kind": "trait",
      "name": "Hunter's Wrath",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard, increase Caraxes Fire Damage Dealt by 16%. Increase Strength and Initiative of Right Flank ally by +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Caraxes Hunter's Wrath screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "caraxes-hunters-wrath-2026-06-24"
      ],
      "tags": [
        "FIRE_DAMAGE_UP",
        "STRENGTH_UP",
        "BUFF_INITIATIVE",
        "VANGUARD_REQUIRED",
        "RIGHT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "caraxes-battle-dread",
        "dragonId": "caraxes",
        "kind": "habit",
        "name": "Battle Dread",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: reduce Strength and Initiative of 3 Enemies in any lane by -6%, enhanced by Caraxes Intelligence. Progression table shows -6.5% at Level 1.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Caraxes Battle Dread screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "caraxes-battle-dread-2026-06-24"
        ],
        "tags": [
          "DEBUFF_STRENGTH",
          "DEBUFF_INITIATIVE"
        ]
      },
      {
        "id": "caraxes-dragons-flair",
        "dragonId": "caraxes",
        "kind": "habit",
        "name": "Dragon's Flair",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: increase Caraxes Fire Damage Dealt until end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Caraxes Dragon's Flair screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "caraxes-dragons-flair-2026-06-24"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "BUFF_SELF"
        ]
      },
      {
        "id": "caraxes-crippling-inferno",
        "dragonId": "caraxes",
        "kind": "habit",
        "name": "Crippling Inferno",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: chance to apply Slow and Burn to 3 Enemies in any lane. Each effect is checked separately for each target and lasts 2 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Caraxes Crippling Inferno screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "caraxes-crippling-inferno-2026-06-24"
        ],
        "tags": [
          "SLOW",
          "BURN",
          "FIRE_DAMAGE"
        ]
      },
      {
        "id": "caraxes-mass-enfeeble",
        "dragonId": "caraxes",
        "kind": "habit",
        "name": "Mass Enfeeble",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: reduce Physical Damage Dealt, excluding Basic Attacks, of 3 Enemies in any lane by -5%. Progression table shows -5.5% at Level 1.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Caraxes Mass Enfeeble screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "caraxes-mass-enfeeble-2026-06-24"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP",
          "EXCLUDES_BASIC_ATTACKS"
        ]
      },
      {
        "id": "caraxes-blood-wyrm",
        "dragonId": "caraxes",
        "kind": "habit",
        "name": "Blood Wyrm",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Each Round: for each Enemy below 50% maximum Troop Capacity, increase Caraxes Fire Damage Dealt. For each Enemy that retreated during the previous round, apply Recovery to Caraxes, enhanced by Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Caraxes Blood Wyrm screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "caraxes-blood-wyrm-2026-06-24"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "RECOVERY",
          "LOW_HEALTH"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "positive",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "FIRE_DAMAGE",
      "ANY_LANE_TARGET",
      "FIRE_DAMAGE_UP",
      "STRENGTH_UP",
      "BUFF_INITIATIVE",
      "VANGUARD_REQUIRED",
      "RIGHT_FLANK_TARGET",
      "DEBUFF_STRENGTH",
      "DEBUFF_INITIATIVE",
      "BUFF_SELF",
      "SLOW",
      "BURN",
      "PHYSICAL_DAMAGE_UP",
      "EXCLUDES_BASIC_ATTACKS",
      "RECOVERY",
      "LOW_HEALTH"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Caraxes main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Caraxes Infernal Burst screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Caraxes Hunter's Wrath screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Caraxes Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Caraxes main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "seasmoke",
    "slug": "seasmoke",
    "name": "Seasmoke",
    "rarity": "Legendary",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/seasmoke/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "seasmoke-cleansing-wrath",
      "dragonId": "seasmoke",
      "kind": "command",
      "name": "Cleansing Wrath",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each Round: up to three independent 20% Cleanse attempts. Rounds 3, 6, 9: Fire Damage to one enemy in the same lane (Damage Rate: +190%).\n\nStar Rank 6 augmentation:\nAt 6+ Stars, successful Cleanse applies Infectious Wrath and adds scheduled Physical Damage.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Seasmoke Cleansing Wrath summary/glossary screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "seasmoke-cleansing-wrath-summary-2026-06-23",
        "seasmoke-cleansing-wrath-glossary-2026-06-23"
      ],
      "tags": [
        "CLEANSE_POSITIVE",
        "FIRE_DAMAGE",
        "SAME_LANE_TARGET"
      ]
    },
    "trait": {
      "id": "seasmoke-champions-brilliance",
      "dragonId": "seasmoke",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard, increase self Strength, Intelligence, and Instinct by +15. Reduce Damage Received of the Right Flank ally by 8%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Seasmoke Champion's Brilliance screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "seasmoke-champions-brilliance-2026-06-23"
      ],
      "tags": [
        "VANGUARD_REQUIRED",
        "STRENGTH_UP",
        "INSTINCT_UP",
        "DAMAGE_RECEIVED_DOWN"
      ]
    },
    "habits": [
      {
        "id": "seasmoke-clever-maneuver",
        "dragonId": "seasmoke",
        "kind": "habit",
        "name": "Clever Maneuver",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Intelligence and Initiative of the ally with highest Intelligence until end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Seasmoke Clever Maneuver screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "seasmoke-clever-maneuver-2026-06-23"
        ],
        "tags": [
          "BUFF_ALLIES",
          "BUFF_INTELLIGENCE",
          "BUFF_INITIATIVE"
        ]
      },
      {
        "id": "seasmoke-winds-favor",
        "dragonId": "seasmoke",
        "kind": "habit",
        "name": "Wind's Favor",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Initiative of three Allies in any lane until end of combat, enhanced by Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Seasmoke Wind's Favor screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "seasmoke-winds-favor-2026-06-23"
        ],
        "tags": [
          "BUFF_ALLIES",
          "BUFF_INITIATIVE"
        ]
      },
      {
        "id": "seasmoke-infectious-wrath",
        "dragonId": "seasmoke",
        "kind": "habit",
        "name": "Infectious Wrath",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Cleansing Wrath with Infectious Wrath stacks and Panic-conditional Physical Damage.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Seasmoke Infectious Wrath screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "seasmoke-infectious-wrath-2026-06-23"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "INFECTIOUS_WRATH",
          "PHYSICAL_DAMAGE",
          "PANIC"
        ]
      },
      {
        "id": "seasmoke-cunning-ferocity",
        "dragonId": "seasmoke",
        "kind": "habit",
        "name": "Cunning Ferocity",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Intelligence and Fire Damage Dealt of two Allies within adjacency until end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Seasmoke Cunning Ferocity screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "seasmoke-cunning-ferocity-2026-06-23"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "BUFF_ALLIES",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "seasmoke-loyal-bond",
        "dragonId": "seasmoke",
        "kind": "habit",
        "name": "Loyal Bond",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: grant Advantage above 50% Troop Capacity or Resistance below 50% Troop Capacity to 2 other Allies.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Seasmoke Loyal Bond screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "seasmoke-loyal-bond-2026-06-23"
        ],
        "tags": [
          "ADVANTAGE",
          "RESISTANCE",
          "OTHER_ALLIES_TARGET"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Archers": "positive",
      "Siege": "negative",
      "Shieldbearers": "unknown",
      "Spearmen": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "CLEANSE_POSITIVE",
      "FIRE_DAMAGE",
      "SAME_LANE_TARGET",
      "VANGUARD_REQUIRED",
      "STRENGTH_UP",
      "INSTINCT_UP",
      "DAMAGE_RECEIVED_DOWN",
      "BUFF_ALLIES",
      "BUFF_INTELLIGENCE",
      "BUFF_INITIATIVE",
      "COMMAND_AUGMENTATION",
      "INFECTIOUS_WRATH",
      "PHYSICAL_DAMAGE",
      "PANIC",
      "FIRE_DAMAGE_UP",
      "ADJACENT_TARGET",
      "ADVANTAGE",
      "RESISTANCE",
      "OTHER_ALLIES_TARGET"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Seasmoke main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Seasmoke Cleansing Wrath screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Seasmoke Champion's Brilliance screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Seasmoke Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "solstryker",
    "slug": "solstryker",
    "name": "Solstryker",
    "rarity": "Rare",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/solstryker/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-16",
    "notes": "Affinity icons were not text-verified and remain unknown.",
    "command": {
      "id": "solstryker-tactical-onslaught",
      "dragonId": "solstryker",
      "kind": "command",
      "name": "Tactical Onslaught",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Odd-numbered rounds, after each Basic Attack: deal Physical Damage to the same target at a +30% Damage Rate. Physical Damage scales with Solstryker's Strength and is mitigated by target Instinct. Separately, there is a 20% chance to reduce that target's Physical Damage Dealt by -12% for 2 rounds. This typed enemy suppression is not Weakened.\n\nEven-numbered rounds, after each Basic Attack: deal Tactical Damage to 3 enemies in any lane at a +12.5% Damage Rate. Tactical Damage scales with Solstryker's Instinct and is mitigated by target Intelligence. Damage is doubled separately against each target afflicted with Vulnerable; the multiplier is 2x rather than a separate fixed rate.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Solstryker Tactical Onslaught screenshots",
        "capturedAt": "2026-07-16",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": ["solstryker-tactical-onslaught-2026-07-16"],
      "tags": [
        "PHYSICAL_DAMAGE",
        "TACTICAL_DAMAGE",
        "STRENGTH_SCALING",
        "ENHANCED_BY_INSTINCT",
        "DAMAGE_DEALT_DOWN",
        "ENEMY_DEBUFF",
        "VULNERABLE_PAYOFF",
        "ANY_LANE_TARGET"
      ]
    },
    "trait": {
      "id": "solstryker-champions-brilliance",
      "dragonId": "solstryker",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Solstryker is Vanguard: increase Solstryker Strength, Intelligence, and Instinct by +15. Reduce Damage Received of the Right Flank ally by -8%. The stat increases are self-only; the defensive ally effect is detailed but non-scoring.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Solstryker Champion's Brilliance screenshot",
        "capturedAt": "2026-07-16",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": ["solstryker-champions-brilliance-2026-07-16"],
      "tags": ["STRENGTH_UP", "INTELLIGENCE_UP", "INSTINCT_UP", "DAMAGE_RECEIVED_DOWN", "VANGUARD_REQUIRED", "RIGHT_FLANK_TARGET", "BUFF_SELF"]
    },
    "habits": [
      {
        "id": "solstryker-steady-erosion",
        "dragonId": "solstryker",
        "kind": "habit",
        "name": "Steady Erosion",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "At the start of each round, add 1 stack of Steady Erosion to all enemies, up to 10 stacks. Each stack reduces target Strength until the end of combat and is enhanced by Solstryker's Strength. The exact enhancement formula and cleanse/removal behavior are unresolved. Steady Erosion is not Vulnerable, Weakened, or Control.\n\nProgression table (Strength reduction per stack):\nHabit Level 1: -2%\nHabit Level 2: -2.4%\nHabit Level 3: -2.8%\nHabit Level 4: -3.4%\nHabit Level 5: -4%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Solstryker Steady Erosion screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["solstryker-steady-erosion-2026-07-16"],
        "tags": ["STEADY_EROSION", "DEBUFF_STRENGTH", "ENHANCED_BY_STRENGTH", "ENEMY_DEBUFF"]
      },
      {
        "id": "solstryker-energy-drain",
        "dragonId": "solstryker",
        "kind": "habit",
        "name": "Energy Drain",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Round 1: reduce Strength and Initiative of the same 2 enemies within adjacency for 3 rounds, enhanced by Solstryker's Instinct. This is direct enemy stat reduction, not a named status. The exact enhancement formula and stacking/refresh behavior are unresolved.\n\nProgression table (Strength and Initiative):\nHabit Level 1: -15%\nHabit Level 2: -18%\nHabit Level 3: -21%\nHabit Level 4: -25.5%\nHabit Level 5: -30%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Solstryker Energy Drain screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["solstryker-energy-drain-2026-07-16"],
        "tags": ["DEBUFF_STRENGTH", "DEBUFF_INITIATIVE", "ENHANCED_BY_INSTINCT", "ADJACENT_TARGET", "ENEMY_DEBUFF"]
      },
      {
        "id": "solstryker-oppressive-onslaught",
        "dragonId": "solstryker",
        "kind": "habit",
        "name": "Oppressive Onslaught",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: chance to apply Overwhelm to 1 enemy in any lane for 2 rounds. Overwhelm prevents Active Commands and Habits on the target's turn; it satisfies the broad Control family while remaining specifically visible.\n\nProgression table (Overwhelm chance):\nHabit Level 1: 10%\nHabit Level 2: 12%\nHabit Level 3: 14%\nHabit Level 4: 17%\nHabit Level 5: 20%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Solstryker Oppressive Onslaught screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["solstryker-oppressive-onslaught-2026-07-16"],
        "tags": ["OVERWHELM", "CONTROL", "ANY_LANE_TARGET"]
      },
      {
        "id": "solstryker-robust-insight",
        "dragonId": "solstryker",
        "kind": "habit",
        "name": "Robust Insight",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Solstryker Strength and Instinct. Self-only.\n\nProgression table (Strength and Instinct):\nHabit Level 1: +12.5%\nHabit Level 2: +15%\nHabit Level 3: +17.5%\nHabit Level 4: +21.25%\nHabit Level 5: +25%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Solstryker Robust Insight screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["solstryker-robust-insight-2026-07-16"],
        "tags": ["STRENGTH_UP", "INSTINCT_UP", "BUFF_SELF"]
      },
      {
        "id": "solstryker-amplified-drain",
        "dragonId": "solstryker",
        "kind": "habit",
        "name": "Amplified Drain",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Round 4: independently select 2 enemies within adjacency and reduce their Strength and Initiative for 5 rounds, enhanced by Solstryker's Instinct. This is separate from Energy Drain, not a Command augmentation. Its stacking or refresh interaction with other reductions is unresolved.\n\nProgression table (Strength and Initiative):\nHabit Level 1: -15%\nHabit Level 2: -19.5%\nHabit Level 3: -24%\nHabit Level 4: -30%\nHabit Level 5: -37.5%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {"status": "screenshot-verified", "source": "Solstryker Amplified Drain screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["solstryker-amplified-drain-2026-07-16"],
        "tags": ["DEBUFF_STRENGTH", "DEBUFF_INITIATIVE", "ENHANCED_BY_INSTINCT", "ADJACENT_TARGET", "ENEMY_DEBUFF"]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": ["PHYSICAL_DAMAGE", "TACTICAL_DAMAGE", "STRENGTH_SCALING", "ENHANCED_BY_INSTINCT", "DAMAGE_DEALT_DOWN", "VULNERABLE_PAYOFF", "VANGUARD_REQUIRED", "STEADY_EROSION", "DEBUFF_STRENGTH", "DEBUFF_INITIATIVE", "OVERWHELM", "CONTROL", "STRENGTH_UP", "INSTINCT_UP"],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified", "source": "Solstryker Tactical Onslaught screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified", "source": "Solstryker Champion's Brilliance screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified", "source": "Solstryker Habit screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true
      },
      "affinities": {
        "status": "unknown", "source": "Affinity icons were not text-verified", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true
      }
    }
  },
  {
    "id": "crimson",
    "slug": "crimson",
    "name": "Crimson",
    "rarity": "Legendary",
    "breed": "Hunter",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/crimson/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "crimson-bloodscale-terror",
      "dragonId": "crimson",
      "kind": "command",
      "name": "Bloodscale Terror",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds. Rounds 2, 5, and 8: deal Fire Damage to one enemy in any lane at a 140% Damage Rate, scaling with Crimson's Intelligence and mitigated by target Initiative.\n\nAt 10 Stars:\n\nRound 1: 40% chance to Stun one enemy in any lane for 2 rounds. This replaces the ordinary Round 1 Stun chance.\n\nOther odd-numbered rounds: 20% chance to Stun one enemy in any lane for 2 rounds.\n\nEven-numbered rounds: one shared 50% activation roll to reduce Instinct and Initiative of the highest-Instinct enemy by 12% for 2 rounds, enhanced by Crimson's Intelligence.\n\nStar Rank 10 augmentation:\nVermin's Bane augments Bloodscale Terror with a Round 1 replacement and even-numbered round Instinct and Initiative reductions.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Crimson Bloodscale Terror screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "crimson-bloodscale-terror-summary-2026-06-25"
      ],
      "tags": [
        "STUN",
        "FIRE_DAMAGE",
        "ANY_LANE_TARGET",
        "SPECIFIC_ROUNDS"
      ]
    },
    "trait": {
      "id": "crimson-hunters-cunning",
      "dragonId": "crimson",
      "kind": "trait",
      "name": "Hunter's Cunning",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard, Crimson Recovery Received +20%, Crimson Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Crimson Hunter's Cunning screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "crimson-hunters-cunning-2026-06-25"
      ],
      "tags": [
        "RECOVERY_RECEIVED_UP",
        "BUFF_INTELLIGENCE",
        "PHYSICAL_DAMAGE_UP",
        "RIGHT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "crimson-enervate",
        "dragonId": "crimson",
        "kind": "habit",
        "name": "Enervate",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: select one enemy that deals Tactical Damage. Reduce its Tactical Damage Dealt until end of combat. Prose rounds L1 to -13%; table shows -13.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Crimson Enervate screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "crimson-enervate-2026-06-25"
        ],
        "tags": [
          "TACTICAL_DAMAGE"
        ]
      },
      {
        "id": "crimson-dragons-intellect",
        "dragonId": "crimson",
        "kind": "habit",
        "name": "Dragon's Intellect",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: reduce Damage Received and increase Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Crimson Dragon's Intellect screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "crimson-dragons-intellect-2026-06-25"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "BUFF_INTELLIGENCE"
        ]
      },
      {
        "id": "crimson-bloodscale-fury",
        "dragonId": "crimson",
        "kind": "habit",
        "name": "Bloodscale Fury",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: afflict Weakened on one enemy in any lane, preferring a target not already Stunned. Chance is doubled against a target with Taunt. Prose rounds L1 to 18%; table shows 17.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Crimson Bloodscale Fury screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "crimson-bloodscale-fury-2026-06-25"
        ],
        "tags": [
          "WEAKENED",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "crimson-unlikely-hero",
        "dragonId": "crimson",
        "kind": "habit",
        "name": "Unlikely Hero",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of each round: enemies strictly above 75% max Troop Capacity receive increased non-Basic Physical Damage and Fire Damage until end of round; enemies strictly below 25% receive reduced Recovery. Table visually says Damage Dealt, text says Damage Received.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Crimson Unlikely Hero screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "crimson-unlikely-hero-2026-06-25"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP",
          "FIRE_DAMAGE",
          "RECOVERY_RECEIVED_DOWN"
        ]
      },
      {
        "id": "crimson-vermins-bane",
        "dragonId": "crimson",
        "kind": "habit",
        "name": "Vermin's Bane",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Bloodscale Terror: replace Round 1 Stun chance and on even-numbered rounds has 50% chance to reduce Instinct and Initiative of the enemy with highest Instinct for two rounds, enhanced by Crimson's Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Crimson Vermin's Bane screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "crimson-vermins-bane-2026-06-25"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "DEBUFF_INSTINCTS",
          "DEBUFF_INITIATIVE"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "positive",
      "Spearmen": "positive",
      "Siege": "positive"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "STUN",
      "FIRE_DAMAGE",
      "ANY_LANE_TARGET",
      "SPECIFIC_ROUNDS",
      "RECOVERY_RECEIVED_UP",
      "BUFF_INTELLIGENCE",
      "PHYSICAL_DAMAGE_UP",
      "RIGHT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "TACTICAL_DAMAGE",
      "DAMAGE_RECEIVED_DOWN",
      "WEAKENED",
      "RECOVERY_RECEIVED_DOWN",
      "COMMAND_AUGMENTATION",
      "DEBUFF_INSTINCTS",
      "DEBUFF_INITIATIVE"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Crimson Bloodscale Terror screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Crimson Hunter's Cunning screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Crimson Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Crimson main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "kalspire",
    "slug": "kalspire",
    "name": "Kalspire",
    "rarity": "Legendary",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/kalspire/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "kalspire-tactical-strike",
      "dragonId": "kalspire",
      "kind": "command",
      "name": "Tactical Strike",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "After each Basic Attack: deal Tactical Damage to the original Basic Attack target at a 50% Damage Rate, scaling with Kalspire's Instinct and mitigated by target Intelligence.\n\nThen independently attempt Bleed at a 30% chance on the original Basic Attack target and one other enemy within adjacency. Bleed deals periodic Physical Damage at a 20% rate each round for 2 rounds, scaling with Strength and mitigated by target Instinct.\n\nAt 6+ Stars:\n\nAfter each Basic Attack: deal Physical Damage at a 25% rate to one enemy within adjacency that is distinct from the original Basic Attack target, scaling with Strength.\n\nThen independently attempt Panic at a 15% chance on the Physical Damage target and one other distinct enemy within adjacency. Panic deals periodic Tactical Damage at a 20% rate each round for 2 rounds.\n\nStar Rank 6 augmentation:\nAt 6+ Stars, Tactical Assault augments Tactical Strike with Physical Damage and independent Panic checks.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Kalspire Tactical Strike screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "kalspire-tactical-strike-summary-2026-06-25"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "BLEED",
        "ADJACENT_TARGET"
      ]
    },
    "trait": {
      "id": "kalspire-champions-brilliance",
      "dragonId": "kalspire",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Kalspire Strength, Intelligence, and Instinct +15; Right Flank ally Damage Received -8%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Kalspire Champion's Brilliance screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "kalspire-champions-brilliance-2026-06-25"
      ],
      "tags": [
        "STRENGTH_UP",
        "BUFF_INTELLIGENCE",
        "INSTINCT_UP",
        "DAMAGE_RECEIVED_DOWN",
        "RIGHT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "kalspire-robust-insight",
        "dragonId": "kalspire",
        "kind": "habit",
        "name": "Robust Insight",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: increase Kalspire Strength and Instinct.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Kalspire Robust Insight screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "kalspire-robust-insight-2026-06-25"
        ],
        "tags": [
          "STRENGTH_UP",
          "INSTINCT_UP"
        ]
      },
      {
        "id": "kalspire-battle-cunning",
        "dragonId": "kalspire",
        "kind": "habit",
        "name": "Battle Cunning",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: target three enemies in any lane. Reduce Strength and Intelligence, enhanced by Instinct. Prose rounds L1 to -6%; table shows -6.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Kalspire Battle Cunning screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "kalspire-battle-cunning-2026-06-25"
        ],
        "tags": [
          "DEBUFF_STRENGTH",
          "DEBUFF_INTELLIGENCE"
        ]
      },
      {
        "id": "kalspire-tactical-assault",
        "dragonId": "kalspire",
        "kind": "habit",
        "name": "Tactical Assault",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "At 6+ Stars, Tactical Assault augments Tactical Strike: after each Basic Attack, deal Physical Damage to one enemy within adjacency that is not the original Basic Attack target. Then independently attempt Panic on that target and one other distinct adjacent enemy.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Kalspire Tactical Assault screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "kalspire-tactical-assault-2026-06-25"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "PHYSICAL_DAMAGE",
          "PANIC",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "kalspire-dragons-insight",
        "dragonId": "kalspire",
        "kind": "habit",
        "name": "Dragon's Insight",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: reduce Damage Received and increase Instinct.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Kalspire Dragon's Insight screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "kalspire-dragons-insight-2026-06-25"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "INSTINCT_UP"
        ]
      },
      {
        "id": "kalspire-radiant-conqueror",
        "dragonId": "kalspire",
        "kind": "habit",
        "name": "Radiant Conqueror",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for one round: Kalspire Damage Received -50% and Kalspire is afflicted with Stun. Start of Round 2 for five rounds: reduce non-Basic Physical Damage Dealt of enemy with highest Strength and Fire Damage Dealt of enemy with highest Intelligence. The selected enemies may be same or different.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Kalspire Radiant Conqueror screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "kalspire-radiant-conqueror-2026-06-25"
        ],
        "tags": [
          "STUN",
          "CONTROL",
          "PHYSICAL_DAMAGE_UP",
          "FIRE_DAMAGE"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "positive",
      "Siege": "positive",
      "Archers": "unknown",
      "Spearmen": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TACTICAL_DAMAGE",
      "BLEED",
      "ADJACENT_TARGET",
      "STRENGTH_UP",
      "BUFF_INTELLIGENCE",
      "INSTINCT_UP",
      "DAMAGE_RECEIVED_DOWN",
      "RIGHT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "DEBUFF_STRENGTH",
      "DEBUFF_INTELLIGENCE",
      "COMMAND_AUGMENTATION",
      "PHYSICAL_DAMAGE",
      "PANIC",
      "STUN",
      "CONTROL",
      "PHYSICAL_DAMAGE_UP",
      "FIRE_DAMAGE"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Kalspire Tactical Strike screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Kalspire Champion's Brilliance screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Kalspire Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Kalspire main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "malachite",
    "slug": "malachite",
    "name": "Malachite",
    "rarity": "Legendary",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/malachite/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "malachite-wardens-rally",
      "dragonId": "malachite",
      "kind": "command",
      "name": "Warden's Rally",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 2, 4, 7, 9: Deal Tactical Damage to 1 Enemy in the same lane (Damage Rate: +100%).\n\nRounds 3, 6, 9: Apply Recovery to 3 Allies in any lane (Recovery Rate: +70%, enhanced by Instinct).",
      "verification": {
        "status": "screenshot-verified",
        "source": "Warden's Rally summary and glossary screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "malachite-wardens-rally-summary-2026-06-23",
        "malachite-wardens-rally-glossary-2026-06-23"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "RECOVERY",
        "SAME_LANE_TARGET",
        "ANY_LANE_TARGET",
        "ENHANCED_BY_INSTINCT",
        "SCALES_WITH_LEVEL",
        "SPECIFIC_ROUNDS",
        "MULTI_SCHEDULE_COMMAND"
      ]
    },
    "trait": {
      "id": "malachite-sentinels-presence",
      "dragonId": "malachite",
      "kind": "trait",
      "name": "Sentinel's Presence",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard Increase your Recovery Dealt by +15% and Instinct by +25. Increase Fire Damage Dealt by +16% of the Ally deployed in the Left Flank.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Sentinel's Presence screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "malachite-sentinels-presence-2026-06-23"
      ],
      "tags": [
        "RECOVERY_DEALT_UP",
        "INSTINCT_UP",
        "FIRE_DAMAGE_UP",
        "VANGUARD_REQUIRED",
        "LEFT_FLANK_TARGET",
        "BUFF_SELF",
        "BUFF_ALLIES"
      ]
    },
    "habits": [
      {
        "id": "malachite-forests-instinct",
        "dragonId": "malachite",
        "kind": "habit",
        "name": "Forest's Instinct",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: 35% chance to increase the Physical Damage Dealt (excluding Basic Attacks) by +8% and reduce the Tactical Damage Received by -8% of 2 other Allies in any lane for 2 round(s).",
        "verification": {
          "status": "screenshot-verified",
          "source": "Forest's Instinct screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "malachite-forests-instinct-2026-06-23"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP",
          "TACTICAL_DAMAGE_RECEIVED_DOWN",
          "EXCLUDES_BASIC_ATTACKS",
          "OTHER_ALLIES_TARGET",
          "ANY_LANE_TARGET",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "malachite-wise-vigor",
        "dragonId": "malachite",
        "kind": "habit",
        "name": "Wise Vigor",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase your Instinct by +20% and Recovery Dealt by +20% until the end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Wise Vigor screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "malachite-wise-vigor-2026-06-23"
        ],
        "tags": [
          "INSTINCT_UP",
          "RECOVERY_DEALT_UP",
          "BUFF_SELF"
        ]
      },
      {
        "id": "malachite-thunderous-roar",
        "dragonId": "malachite",
        "kind": "habit",
        "name": "Thunderous Roar",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: 10% chance to grant Advantage (+20%) to 2 other Allies in any lane for 2 round(s). Advantage increases the target's Damage Dealt.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Thunderous Roar screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "malachite-thunderous-roar-2026-06-23"
        ],
        "tags": [
          "DAMAGE_DEALT_UP",
          "OTHER_ALLIES_TARGET",
          "ANY_LANE_TARGET",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "malachite-collective-might",
        "dragonId": "malachite",
        "kind": "habit",
        "name": "Collective Might",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Strength by +12.5% (enhanced by Strength) of 3 Allies in any lane until the end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Collective Might screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "malachite-collective-might-2026-06-23"
        ],
        "tags": [
          "STRENGTH_UP",
          "ENHANCED_BY_STRENGTH",
          "ANY_LANE_TARGET",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "malachite-lightning-strike",
        "dragonId": "malachite",
        "kind": "habit",
        "name": "Lightning Strike",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1: 40% chance to grant First-Strike, Double-Strike, and increase Strength by +25% (enhanced by Instinct) of 1 other Ally within adjacency for 3 round(s).",
        "verification": {
          "status": "screenshot-verified",
          "source": "Lightning Strike screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "malachite-lightning-strike-2026-06-23"
        ],
        "tags": [
          "FIRST_STRIKE",
          "DOUBLE_STRIKE",
          "STRENGTH_UP",
          "ENHANCED_BY_INSTINCT",
          "ADJACENT_TARGET",
          "OTHER_ALLIES_TARGET",
          "BUFF_ALLIES"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "positive",
      "Archers": "negative",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TACTICAL_DAMAGE",
      "RECOVERY",
      "SAME_LANE_TARGET",
      "ANY_LANE_TARGET",
      "ENHANCED_BY_INSTINCT",
      "SCALES_WITH_LEVEL",
      "SPECIFIC_ROUNDS",
      "MULTI_SCHEDULE_COMMAND",
      "RECOVERY_DEALT_UP",
      "INSTINCT_UP",
      "FIRE_DAMAGE_UP",
      "VANGUARD_REQUIRED",
      "LEFT_FLANK_TARGET",
      "BUFF_SELF",
      "BUFF_ALLIES",
      "PHYSICAL_DAMAGE_UP",
      "TACTICAL_DAMAGE_RECEIVED_DOWN",
      "EXCLUDES_BASIC_ATTACKS",
      "OTHER_ALLIES_TARGET",
      "DAMAGE_DEALT_UP",
      "STRENGTH_UP",
      "ENHANCED_BY_STRENGTH",
      "FIRST_STRIKE",
      "DOUBLE_STRIKE",
      "ADJACENT_TARGET"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Malachite main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Warden's Rally screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Sentinel's Presence screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Malachite Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "canonicalBaseStats": {
        "status": "unknown",
        "source": "No canonical base-stat source verified",
        "capturedAt": null,
        "gameVersion": null,
        "reviewedManually": true
      },
      "formationInteractions": {
        "status": "partially-screenshot-verified",
        "source": "Army Builder formation screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "venator",
    "slug": "venator",
    "name": "Venator",
    "rarity": "Legendary",
    "breed": "Warrior",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/venator/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "venator-feral-strike",
      "dragonId": "venator",
      "kind": "command",
      "name": "Feral Strike",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "After each Basic Attack: deal two independently targeted Physical Damage instances. Rounds 4, 6, and 8: 30% chance to gain Double-Strike for two rounds. Classified as Command while preserving Attack Modifier presentation.\n\nStar Rank 6 augmentation:\nFeral Precision augments Feral Strike damage and Double-Strike chance.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Venator Feral Strike screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "venator-feral-strike-summary-2026-06-25"
      ],
      "tags": [
        "PHYSICAL_DAMAGE",
        "DOUBLE_STRIKE"
      ]
    },
    "trait": {
      "id": "venator-warriors-zeal",
      "dragonId": "venator",
      "kind": "trait",
      "name": "Warrior's Zeal",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: increase Venator Physical Damage from Commands and Habits by 16%; Left Flank ally Instinct and Initiative +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Venator Warrior's Zeal screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "venator-warriors-zeal-2026-06-25"
      ],
      "tags": [
        "PHYSICAL_DAMAGE_UP",
        "INSTINCT_UP",
        "BUFF_INITIATIVE",
        "LEFT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "venator-hunters-bane",
        "dragonId": "venator",
        "kind": "habit",
        "name": "Hunter's Bane",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: reduce Intelligence of one enemy in any lane, preferring Hunter breed with fallback, enhanced by Venator's Strength. Screenshot states no duration.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Venator Hunter's Bane screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "venator-hunters-bane-2026-06-25"
        ],
        "tags": [
          "DEBUFF_INTELLIGENCE"
        ]
      },
      {
        "id": "venator-dragons-might",
        "dragonId": "venator",
        "kind": "habit",
        "name": "Dragon's Might",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: increase Venator Physical Damage Dealt excluding Basic Attacks.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Venator Dragon's Might screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "venator-dragons-might-2026-06-25"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP"
        ]
      },
      {
        "id": "venator-feral-precision",
        "dragonId": "venator",
        "kind": "habit",
        "name": "Feral Precision",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Feral Strike: add one Physical Damage instance targeting the enemy with least current troops and replace Double-Strike chance on rounds 4, 6, and 8.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Venator Feral Precision screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "venator-feral-precision-2026-06-25"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "PHYSICAL_DAMAGE"
        ]
      },
      {
        "id": "venator-armor-break",
        "dragonId": "venator",
        "kind": "habit",
        "name": "Armor Break",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: increase Physical Damage Received by one opposing enemy. Opposing-position is provisionally normalized to same-lane enemy for formation compatibility.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Venator Armor Break screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "venator-armor-break-2026-06-25"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP"
        ]
      },
      {
        "id": "venator-desperate-ambush",
        "dragonId": "venator",
        "kind": "habit",
        "name": "Desperate Ambush",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round, when Venator is strictly below 50% Troop Capacity: select one enemy, preferring Hunter breed, deal Physical Damage, then attempt Overwhelm on that same selected target for two rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Venator Desperate Ambush screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "venator-desperate-ambush-2026-06-25"
        ],
        "tags": [
          "PHYSICAL_DAMAGE",
          "OVERWHELM",
          "CONTROL"
        ]
      }
    ],
    "affinities": {
      "Spearmen": "positive",
      "Shieldbearers": "positive",
      "Cavalry": "unknown",
      "Archers": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "PHYSICAL_DAMAGE",
      "DOUBLE_STRIKE",
      "PHYSICAL_DAMAGE_UP",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "LEFT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "DEBUFF_INTELLIGENCE",
      "COMMAND_AUGMENTATION",
      "OVERWHELM",
      "CONTROL"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Venator Feral Strike screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Venator Warrior's Zeal screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Venator Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Venator main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "daemoros",
    "slug": "daemoros",
    "name": "Daemoros",
    "rarity": "Epic",
    "breed": "Warrior",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "daemoros-shadowflame",
      "dragonId": "daemoros",
      "kind": "command",
      "name": "Shadowflame",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Odd-numbered rounds: deal Physical Damage to one adjacent enemy, Damage Rate +125%; 20% chance to afflict the same target with Burn for two rounds.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Daemoros Shadowflame screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "daemoros-shadowflame-2026-06-26"
      ],
      "tags": [
        "PHYSICAL_DAMAGE",
        "BURN",
        "ADJACENT_TARGET"
      ]
    },
    "trait": {
      "id": "daemoros-warriors-zeal",
      "dragonId": "daemoros",
      "kind": "trait",
      "name": "Warrior's Zeal",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Daemoros Physical Damage Dealt +16%; Left Flank ally Instinct and Initiative +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Daemoros Warrior's Zeal screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "daemoros-warriors-zeal-2026-06-26"
      ],
      "tags": [
        "PHYSICAL_DAMAGE_UP",
        "INSTINCT_UP",
        "BUFF_INITIATIVE",
        "LEFT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "daemoros-instill-fear",
        "dragonId": "daemoros",
        "kind": "habit",
        "name": "Instill Fear",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: one 25%-50% activation roll targets one enemy in any lane, preferring Right Flank; reduce Intelligence and Instinct by 25% enhanced by Strength and apply Panic for two rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Daemoros Instill Fear screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "daemoros-instill-fear-2026-06-26"
        ],
        "tags": [
          "DEBUFF_INTELLIGENCE",
          "DEBUFF_INSTINCTS",
          "PANIC"
        ]
      },
      {
        "id": "daemoros-powerful-reflexes",
        "dragonId": "daemoros",
        "kind": "habit",
        "name": "Powerful Reflexes",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: increase Daemoros Strength and Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Daemoros Powerful Reflexes screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "daemoros-powerful-reflexes-2026-06-26"
        ],
        "tags": [
          "STRENGTH_UP",
          "BUFF_INITIATIVE"
        ]
      },
      {
        "id": "daemoros-shroud-of-shadows",
        "dragonId": "daemoros",
        "kind": "habit",
        "name": "Shroud of Shadows",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Odd-numbered rounds: 15%-30% chance to afflict one adjacent enemy with Confusion for two rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Daemoros Shroud of Shadows screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "daemoros-shroud-of-shadows-2026-06-26"
        ],
        "tags": [
          "CONFUSION",
          "CONTROL",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "daemoros-darkening-fear",
        "dragonId": "daemoros",
        "kind": "habit",
        "name": "Darkening Fear",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: independently roll Instill Fear-like effects on one enemy in any lane, preferring Left Flank.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Daemoros Darkening Fear screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "daemoros-darkening-fear-2026-06-26"
        ],
        "tags": [
          "DEBUFF_INTELLIGENCE",
          "DEBUFF_INSTINCTS",
          "PANIC"
        ]
      },
      {
        "id": "daemoros-phantoms-veil",
        "dragonId": "daemoros",
        "kind": "habit",
        "name": "Phantom's Veil",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of each round until end of that round: reduce exactly one of Physical, Tactical, or Fire Damage Received. Selection method is not stated.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Daemoros Phantom's Veil screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "daemoros-phantoms-veil-2026-06-26"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN"
        ]
      }
    ],
    "affinities": {
      "Archers": "positive",
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "PHYSICAL_DAMAGE",
      "BURN",
      "ADJACENT_TARGET",
      "PHYSICAL_DAMAGE_UP",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "LEFT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "DEBUFF_INTELLIGENCE",
      "DEBUFF_INSTINCTS",
      "PANIC",
      "STRENGTH_UP",
      "CONFUSION",
      "CONTROL",
      "DAMAGE_RECEIVED_DOWN"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Daemoros main screen screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Daemoros Shadowflame screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Daemoros Warrior's Zeal screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Daemoros Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Daemoros main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "feskar",
    "slug": "feskar",
    "name": "Feskar",
    "rarity": "Epic",
    "breed": "Champion",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-26",
    "notes": null,
    "command": {
      "id": "feskar-calculated-assault",
      "dragonId": "feskar",
      "kind": "command",
      "name": "Calculated Assault",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each Round: 20% chance to reduce Physical Damage Dealt, excluding Basic Attacks, by 12% for the enemy with the highest Strength for 2 rounds.\n\nRounds 2, 4, 7, and 9: Deal Tactical Damage to the enemy with the least troops at a 100% Damage Rate.\n\nAt 6+ Stars:\n\nRounds 3, 5, 8, and 10: Deal Fire Damage to all enemies that deal Physical Damage, excluding Basic Attacks, at a 40% Damage Rate. This damage is increased by 1.5x against targets afflicted with Burn, increasing the Damage Rate to 60%.\n\nStar Rank 6 augmentation:\nEmerald Inferno adds Fire Damage on Rounds 3, 5, 8, and 10.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Feskar Calculated Assault screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "feskar-calculated-assault-2026-06-26"
      ],
      "tags": [
        "PHYSICAL_DAMAGE",
        "TACTICAL_DAMAGE",
        "FIRE_DAMAGE",
        "EXCLUDES_BASIC_ATTACKS",
        "MULTI_SCHEDULE_COMMAND"
      ]
    },
    "trait": {
      "id": "feskar-champions-brilliance",
      "dragonId": "feskar",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Strength, Intelligence, and Instinct +15 for Feskar; Right Flank ally Damage Received -8%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Feskar Champion's Brilliance screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "feskar-champions-brilliance-2026-06-26"
      ],
      "tags": [
        "STRENGTH_UP",
        "BUFF_INTELLIGENCE",
        "INSTINCT_UP",
        "DAMAGE_RECEIVED_DOWN",
        "RIGHT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "feskar-resilient-bond",
        "dragonId": "feskar",
        "kind": "habit",
        "name": "Resilient Bond",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat: grant Feskar and one other adjacent ally one Resilient Bond stack. Later rounds: if that tracked ally retreated in the previous round, grant Feskar one additional stack. Each stack reduces Physical Damage Received from non-Basic Attacks until end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Feskar Resilient Bond screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "feskar-resilient-bond-2026-06-26"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "EXCLUDES_BASIC_ATTACKS"
        ]
      },
      {
        "id": "feskar-insightful-allies",
        "dragonId": "feskar",
        "kind": "habit",
        "name": "Insightful Allies",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat: increase Instinct of 3 Allies in any lane until end of combat, enhanced by Feskar Instinct. Plain Allies includes Feskar.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Feskar Insightful Allies screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "feskar-insightful-allies-2026-06-26"
        ],
        "tags": [
          "INSTINCT_UP",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "feskar-emerald-inferno",
        "dragonId": "feskar",
        "kind": "habit",
        "name": "Emerald Inferno",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Command augmentation for Calculated Assault: Rounds 3, 5, 8, and 10 deal Fire Damage to all enemies that deal Physical Damage excluding Basic Attacks; Burn increases damage by 1.5x per target.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Feskar Emerald Inferno screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "feskar-emerald-inferno-2026-06-26"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "FIRE_DAMAGE"
        ]
      },
      {
        "id": "feskar-quick-witted",
        "dragonId": "feskar",
        "kind": "habit",
        "name": "Quick-Witted",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Feskar Intelligence and Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Feskar Quick-Witted screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "feskar-quick-witted-2026-06-26"
        ],
        "tags": [
          "BUFF_INTELLIGENCE",
          "BUFF_INITIATIVE"
        ]
      },
      {
        "id": "feskar-unyielding-grasp",
        "dragonId": "feskar",
        "kind": "habit",
        "name": "Unyielding Grasp",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: one activation chance to Stagger 1 enemy in any lane, prioritizing Warrior role, for 3 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Feskar Unyielding Grasp screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "feskar-unyielding-grasp-2026-06-26"
        ],
        "tags": [
          "STAGGER",
          "CONTROL"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Siege": "negative",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "PHYSICAL_DAMAGE",
      "TACTICAL_DAMAGE",
      "FIRE_DAMAGE",
      "EXCLUDES_BASIC_ATTACKS",
      "MULTI_SCHEDULE_COMMAND",
      "STRENGTH_UP",
      "BUFF_INTELLIGENCE",
      "INSTINCT_UP",
      "DAMAGE_RECEIVED_DOWN",
      "RIGHT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "BUFF_ALLIES",
      "COMMAND_AUGMENTATION",
      "BUFF_INITIATIVE",
      "STAGGER",
      "CONTROL"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Feskar main screen screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Feskar Calculated Assault screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Feskar Champion's Brilliance screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Feskar Habit screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Feskar main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "rhysarion",
    "slug": "rhysarion",
    "name": "Rhysarion",
    "rarity": "Epic",
    "breed": "Champion",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-26",
    "notes": null,
    "command": {
      "id": "rhysarion-dawnsong",
      "dragonId": "rhysarion",
      "kind": "command",
      "name": "Dawnsong",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 1, 4, and 7: Deal Physical Damage to 2 enemies within adjacency at a 70% Damage Rate.\n\nRounds 2, 5, and 8: Deal Fire Damage to 3 enemies in any lane at a 20% Damage Rate. This damage is increased by 1.5x if the target is afflicted with a Control effect, increasing the Damage Rate to 30%. Control effects include Stun, Stagger, Overwhelm, and Confusion.\n\nAt 6+ Stars:\n\nRounds 2, 5, and 8: Apply Recovery to 2 other Allies in any lane at a 60% Recovery Rate, enhanced by Intelligence.\n\nStar Rank 6 augmentation:\nEchoing Melody adds Recovery to Dawnsong on Rounds 2, 5, and 8.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Rhysarion Dawnsong screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "rhysarion-dawnsong-2026-06-26"
      ],
      "tags": [
        "PHYSICAL_DAMAGE",
        "FIRE_DAMAGE",
        "RECOVERY",
        "CONTROL",
        "MULTI_SCHEDULE_COMMAND"
      ]
    },
    "trait": {
      "id": "rhysarion-champions-vigor",
      "dragonId": "rhysarion",
      "kind": "trait",
      "name": "Champion's Vigor",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Rhysarion Recovery Dealt +15% and Initiative +25; Right Flank ally Damage Dealt +8%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Rhysarion Champion's Vigor screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "rhysarion-champions-vigor-2026-06-26"
      ],
      "tags": [
        "RECOVERY_DEALT_UP",
        "BUFF_INITIATIVE",
        "DAMAGE_DEALT_UP",
        "RIGHT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "rhysarion-ebbing-fury",
        "dragonId": "rhysarion",
        "kind": "habit",
        "name": "Ebbing Fury",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for 3 rounds: reduce Damage Dealt of all enemies and all allies, including Rhysarion. Start of Round 4: apply Recovery to 3 Allies, including Rhysarion.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Rhysarion Ebbing Fury screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "rhysarion-ebbing-fury-2026-06-26"
        ],
        "tags": [
          "DAMAGE_DEALT_UP",
          "RECOVERY"
        ]
      },
      {
        "id": "rhysarion-sharp-resolve",
        "dragonId": "rhysarion",
        "kind": "habit",
        "name": "Sharp Resolve",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Rhysarion Strength and Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Rhysarion Sharp Resolve screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "rhysarion-sharp-resolve-2026-06-26"
        ],
        "tags": [
          "STRENGTH_UP",
          "BUFF_INTELLIGENCE"
        ]
      },
      {
        "id": "rhysarion-echoing-melody",
        "dragonId": "rhysarion",
        "kind": "habit",
        "name": "Echoing Melody",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Command augmentation for Dawnsong: Rounds 2, 5, and 8 apply Recovery to 2 other Allies in any lane, excluding Rhysarion, enhanced by Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Rhysarion Echoing Melody screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "rhysarion-echoing-melody-2026-06-26"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "RECOVERY",
          "OTHER_ALLIES_TARGET"
        ]
      },
      {
        "id": "rhysarion-unbroken-devotion",
        "dragonId": "rhysarion",
        "kind": "habit",
        "name": "Unbroken Devotion",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat: increase Recovery Received of 2 other Allies in any lane until end of combat, excluding Rhysarion.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Rhysarion Unbroken Devotion screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "rhysarion-unbroken-devotion-2026-06-26"
        ],
        "tags": [
          "RECOVERY_RECEIVED_UP",
          "OTHER_ALLIES_TARGET"
        ]
      },
      {
        "id": "rhysarion-inspiring-melody",
        "dragonId": "rhysarion",
        "kind": "habit",
        "name": "Inspiring Melody",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: one activation chance. On success, select 1 other adjacent Ally and apply Initiative +20% enhanced by Rhysarion Intelligence plus Resistance Damage Received -15% for 3 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Rhysarion Inspiring Melody screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "rhysarion-inspiring-melody-2026-06-26"
        ],
        "tags": [
          "BUFF_INITIATIVE",
          "RESISTANCE",
          "DAMAGE_RECEIVED_DOWN",
          "OTHER_ALLIES_TARGET"
        ]
      }
    ],
    "affinities": {
      "Spearmen": "positive",
      "Shieldbearers": "positive",
      "Siege": "positive",
      "Cavalry": "unknown",
      "Archers": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "PHYSICAL_DAMAGE",
      "FIRE_DAMAGE",
      "RECOVERY",
      "CONTROL",
      "MULTI_SCHEDULE_COMMAND",
      "RECOVERY_DEALT_UP",
      "BUFF_INITIATIVE",
      "DAMAGE_DEALT_UP",
      "RIGHT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "STRENGTH_UP",
      "BUFF_INTELLIGENCE",
      "COMMAND_AUGMENTATION",
      "OTHER_ALLIES_TARGET",
      "RECOVERY_RECEIVED_UP",
      "RESISTANCE",
      "DAMAGE_RECEIVED_DOWN"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Rhysarion main screen screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Rhysarion Dawnsong screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Rhysarion Champion's Vigor screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Rhysarion Habit screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Rhysarion main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "shadowsong",
    "slug": "shadowsong",
    "name": "Shadowsong",
    "rarity": "Epic",
    "breed": "Hunter",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-26",
    "notes": null,
    "command": {
      "id": "shadowsong-breath-of-fire",
      "dragonId": "shadowsong",
      "kind": "command",
      "name": "Breath of Fire",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 2, 5, and 8: Deal Fire Damage to 2 enemies within adjacency at a 100% Damage Rate. This damage is increased by 1.5x if the target is afflicted with Panic, increasing the Damage Rate to 150%.\n\nAt 10 Stars:\n\nRounds 2, 5, and 8: Deal Fire Damage to 1 enemy in any lane at a 60% Damage Rate, with a 40% chance to afflict that target with Burn for 2 rounds.\n\nThen deal Fire Damage to a different enemy in any lane at a 30% Damage Rate, with a 20% chance to afflict that target with Burn for 2 rounds.\n\nBurn deals Fire Damage to the target each round.\n\nStar Rank 10 augmentation:\nBlazing Conductor adds two ordered Fire attacks and Burn attempts to Breath of Fire on Rounds 2, 5, and 8.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Shadowsong Breath of Fire screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "shadowsong-breath-of-fire-2026-06-26"
      ],
      "tags": [
        "FIRE_DAMAGE",
        "BURN",
        "PANIC",
        "ADJACENT_TARGET"
      ]
    },
    "trait": {
      "id": "shadowsong-hunters-wrath",
      "dragonId": "shadowsong",
      "kind": "trait",
      "name": "Hunter's Wrath",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Shadowsong Fire Damage Dealt +16%; Right Flank ally Strength and Initiative +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Shadowsong Hunter's Wrath screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "shadowsong-hunters-wrath-2026-06-26"
      ],
      "tags": [
        "FIRE_DAMAGE_UP",
        "STRENGTH_UP",
        "BUFF_INITIATIVE",
        "RIGHT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "shadowsong-ensnare",
        "dragonId": "shadowsong",
        "kind": "habit",
        "name": "Ensnare",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Round 1 for three rounds: reduce Instinct and Initiative of two adjacent enemies, enhanced by Shadowsong Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Shadowsong Ensnare screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "shadowsong-ensnare-2026-06-26"
        ],
        "tags": [
          "DEBUFF_INSTINCTS",
          "DEBUFF_INITIATIVE",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "shadowsong-blazing-onslaught",
        "dragonId": "shadowsong",
        "kind": "habit",
        "name": "Blazing Onslaught",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1: independently select one enemy preferring Left Flank for Fire vulnerability and one enemy preferring Right Flank for non-Basic Physical vulnerability; both last 3 rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Shadowsong Blazing Onslaught screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "shadowsong-blazing-onslaught-2026-06-26"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "PHYSICAL_DAMAGE_UP",
          "EXCLUDES_BASIC_ATTACKS"
        ]
      },
      {
        "id": "shadowsong-scorched-earth",
        "dragonId": "shadowsong",
        "kind": "habit",
        "name": "Scorched Earth",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: consider 2 adjacent enemies and attempt to apply Vulnerable for 2 rounds. Per target, Panic doubles the applicable chance.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Shadowsong Scorched Earth screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "shadowsong-scorched-earth-2026-06-26"
        ],
        "tags": [
          "VULNERABLE",
          "DAMAGE_RECEIVED_UP",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "shadowsong-dragons-intellect",
        "dragonId": "shadowsong",
        "kind": "habit",
        "name": "Dragon's Intellect",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce Shadowsong Damage Received and increase Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Shadowsong Dragon's Intellect screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "shadowsong-dragons-intellect-2026-06-26"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "BUFF_INTELLIGENCE"
        ]
      },
      {
        "id": "shadowsong-blazing-conductor",
        "dragonId": "shadowsong",
        "kind": "habit",
        "name": "Blazing Conductor",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Command augmentation for Breath of Fire: on Rounds 2, 5, and 8 add two ordered any-lane Fire attacks with separate damage progressions and separate Burn chances. Second added target must differ from first added target.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Shadowsong Blazing Conductor screenshot",
          "capturedAt": "2026-06-26",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "shadowsong-blazing-conductor-2026-06-26"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "FIRE_DAMAGE",
          "BURN"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "FIRE_DAMAGE",
      "BURN",
      "PANIC",
      "ADJACENT_TARGET",
      "FIRE_DAMAGE_UP",
      "STRENGTH_UP",
      "BUFF_INITIATIVE",
      "RIGHT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "DEBUFF_INSTINCTS",
      "DEBUFF_INITIATIVE",
      "PHYSICAL_DAMAGE_UP",
      "EXCLUDES_BASIC_ATTACKS",
      "VULNERABLE",
      "DAMAGE_RECEIVED_UP",
      "DAMAGE_RECEIVED_DOWN",
      "BUFF_INTELLIGENCE",
      "COMMAND_AUGMENTATION"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Shadowsong main screen screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Shadowsong Breath of Fire screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Shadowsong Hunter's Wrath screenshot",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Shadowsong Habit screenshots",
        "capturedAt": "2026-06-26",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Shadowsong main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "tashix",
    "slug": "tashix",
    "name": "Tashix",
    "rarity": "Epic",
    "breed": "Hunter",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/tashix/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": "2026-07-03",
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-03",
    "notes": null,
    "command": {
      "id": "tashix-shimmering-mirage",
      "dragonId": "tashix",
      "kind": "command",
      "name": "Shimmering Mirage",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each Round: 50% chance to gain 1 stack of Mirage (Max 10 Stacks).\n\nRounds 3, 6, 9: Deal Fire Damage to 1 Enemy within adjacency (Damage Rate: +200%).\n\nMirage:\nIncrease your Fire Damage Dealt by +2.5% per stack. Max 10 stacks.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Tashix Shimmering Mirage summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "tashix-shimmering-mirage-summary-2026-07-03"
      ],
      "tags": [
        "FIRE_DAMAGE",
        "MIRAGE",
        "ADJACENT_TARGET",
        "INTELLIGENCE_SCALING"
      ]
    },
    "trait": {
      "id": "tashix-hunters-cunning",
      "dragonId": "tashix",
      "kind": "trait",
      "name": "Hunter's Cunning",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard, increase your Recovery Received by +20% and Intelligence by +25. Increase Physical Damage Dealt by +10% of the Ally deployed in the Right Flank.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Tashix Hunter's Cunning screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "tashix-hunters-cunning-2026-07-03"
      ],
      "tags": [
        "RECOVERY_RECEIVED_UP",
        "INTELLIGENCE_UP",
        "PHYSICAL_DAMAGE_UP",
        "VANGUARD_REQUIRED",
        "RIGHT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "tashix-enervate",
        "dragonId": "tashix",
        "kind": "habit",
        "name": "Enervate",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Reduce Tactical Damage Dealt by -10% of 1 Enemy that deals Tactical Damage until the end of combat.\n\nProgression: Habit Level 1: -10.5%; Habit Level 2: -12.6%; Habit Level 3: -14.7%; Habit Level 4: -17.85%; Habit Level 5: -21%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tashix Enervate screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "tashix-enervate-2026-07-03"
        ],
        "tags": [
          "TACTICAL_DAMAGE_DOWN",
          "ENEMY_DEBUFF"
        ]
      },
      {
        "id": "tashix-dragons-cunning",
        "dragonId": "tashix",
        "kind": "habit",
        "name": "Dragon's Cunning",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase your Intelligence by +12% and reduce Instinct by -10% (enhanced by Initiative) of 2 Enemies within adjacency. Each effect lasts until the end of combat.\n\nProgression: Habit Level 1: Intelligence +12%; enemy Instinct -10%; Habit Level 2: Intelligence +14.4%; enemy Instinct -12%; Habit Level 3: Intelligence +16.8%; enemy Instinct -14%; Habit Level 4: Intelligence +20.4%; enemy Instinct -17%; Habit Level 5: Intelligence +24%; enemy Instinct -20%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tashix Dragon's Cunning screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "tashix-dragons-cunning-2026-07-03"
        ],
        "tags": [
          "INTELLIGENCE_UP",
          "DEBUFF_INSTINCTS",
          "INITIATIVE_SCALING",
          "ADJACENT_TARGET",
          "BUFF_SELF"
        ]
      },
      {
        "id": "tashix-cunning-ruse",
        "dragonId": "tashix",
        "kind": "habit",
        "name": "Cunning Ruse",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: 25% chance to gain 1 stack of Mirage (Max 10 Stacks).\n\nEach stack of Mirage increases your Fire Damage Dealt by +2.5% until the end of combat.\n\nEach Round: If you have 4 or more stacks of Mirage, there is a 10% chance to afflict 3 Enemies in any lane with Weakened (-15%) for 2 round(s). This chance is checked separately for each target and is doubled (20%) against targets that deal Tactical Damage.\n\nWeakened reduces the target's Damage Dealt.\n\nProgression: Habit Level 1: Weakened chance 10%; Habit Level 2: 12%; Habit Level 3: 14%; Habit Level 4: 17%; Habit Level 5: 20%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tashix Cunning Ruse screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "tashix-cunning-ruse-2026-07-03"
        ],
        "tags": [
          "MIRAGE",
          "FIRE_DAMAGE_UP",
          "WEAKENED",
          "ANY_LANE_TARGET",
          "BUFF_SELF"
        ]
      },
      {
        "id": "tashix-battle-guile",
        "dragonId": "tashix",
        "kind": "habit",
        "name": "Battle Guile",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Reduce Instinct and Initiative by -5% (enhanced by Initiative) of 3 Enemies in any lane until the end of combat.\n\nProgression: Habit Level 1: -5%; Habit Level 2: -6%; Habit Level 3: -7%; Habit Level 4: -8.85%; Habit Level 5: -10.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tashix Battle Guile screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "tashix-battle-guile-2026-07-03"
        ],
        "tags": [
          "DEBUFF_INSTINCTS",
          "DEBUFF_INITIATIVE",
          "INITIATIVE_SCALING",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "tashix-veiled-ambush",
        "dragonId": "tashix",
        "kind": "habit",
        "name": "Veiled Ambush",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: 25% chance to gain 1 stack of Mirage (Max 10 Stacks).\n\nEach stack of Mirage increases your Fire Damage Dealt by +2.5% until the end of combat.\n\nEach Round: If you have 7 or more stacks of Mirage, deal Fire Damage (Damage Rate: +150%) to the Enemy with the most troops. This effect can only trigger once per combat.\n\nProgression: Habit Level 1: Fire Damage Rate 150%; Habit Level 2: 220%; Habit Level 3: 290%; Habit Level 4: 380%; Habit Level 5: 500%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tashix Veiled Ambush screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "tashix-veiled-ambush-2026-07-03"
        ],
        "tags": [
          "MIRAGE",
          "FIRE_DAMAGE",
          "FIRE_DAMAGE_UP",
          "MOST_TROOPS_TARGET",
          "BUFF_SELF"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "positive",
      "Spearmen": "unknown",
      "Siege": "negative"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "FIRE_DAMAGE",
      "MIRAGE",
      "ADJACENT_TARGET",
      "INTELLIGENCE_SCALING",
      "RECOVERY_RECEIVED_UP",
      "INTELLIGENCE_UP",
      "PHYSICAL_DAMAGE_UP",
      "VANGUARD_REQUIRED",
      "RIGHT_FLANK_TARGET",
      "TACTICAL_DAMAGE_DOWN",
      "ENEMY_DEBUFF",
      "DEBUFF_INSTINCTS",
      "INITIATIVE_SCALING",
      "BUFF_SELF",
      "FIRE_DAMAGE_UP",
      "WEAKENED",
      "ANY_LANE_TARGET",
      "DEBUFF_INITIATIVE",
      "MOST_TROOPS_TARGET"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Tashix main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Tashix Shimmering Mirage summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Tashix Hunter's Cunning screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Tashix Habit screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "screenshot-verified",
        "source": "Tashix main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "vaeldra",
    "slug": "vaeldra",
    "name": "Vaeldra",
    "rarity": "Epic",
    "breed": "Warrior",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-25",
    "notes": null,
    "command": {
      "id": "vaeldra-lure",
      "dragonId": "vaeldra",
      "kind": "command",
      "name": "Lure",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: 25% chance to afflict Taunt on three enemies for two rounds; odd-numbered rounds: deal Physical Damage to two adjacent enemies, Damage Rate +45%. Taunt roll scope is not stated.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vaeldra Lure screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vaeldra-lure-2026-06-26"
      ],
      "tags": [
        "TAUNT",
        "PHYSICAL_DAMAGE",
        "ADJACENT_TARGET"
      ]
    },
    "trait": {
      "id": "vaeldra-warriors-resilience",
      "dragonId": "vaeldra",
      "kind": "trait",
      "name": "Warrior's Resilience",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard: Vaeldra Damage Received -8%; Left Flank ally Tactical Damage Dealt +16%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vaeldra Warrior's Resilience screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vaeldra-warriors-resilience-2026-06-26"
      ],
      "tags": [
        "DAMAGE_RECEIVED_DOWN",
        "TACTICAL_DAMAGE",
        "LEFT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "vaeldra-dragons-valor",
        "dragonId": "vaeldra",
        "kind": "habit",
        "name": "Dragon's Valor",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat until end of combat: reduce Vaeldra Damage Received and increase Strength.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vaeldra Dragon's Valor screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vaeldra-dragons-valor-2026-06-26"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "STRENGTH_UP"
        ]
      },
      {
        "id": "vaeldra-ensnare",
        "dragonId": "vaeldra",
        "kind": "habit",
        "name": "Ensnare",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Round 1 for three rounds: reduce Instinct and Initiative of two adjacent enemies, enhanced by Vaeldra Intelligence.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vaeldra Ensnare screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vaeldra-ensnare-2026-06-26"
        ],
        "tags": [
          "DEBUFF_INSTINCTS",
          "DEBUFF_INITIATIVE",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "vaeldra-tempting-distraction",
        "dragonId": "vaeldra",
        "kind": "habit",
        "name": "Tempting Distraction",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "When Vaeldra successfully afflicts an enemy with Taunt: increase that same target's non-Basic Physical Damage Received and Fire Damage Received for two rounds.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vaeldra Tempting Distraction screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vaeldra-tempting-distraction-2026-06-26"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP",
          "FIRE_DAMAGE"
        ]
      },
      {
        "id": "vaeldra-infernal-force",
        "dragonId": "vaeldra",
        "kind": "habit",
        "name": "Infernal Force",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for three rounds: increase Fire Damage Dealt of one ally preferring Left Flank and non-Basic Physical Damage Dealt of one ally preferring Right Flank. Groups select independently.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vaeldra Infernal Force screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vaeldra-infernal-force-2026-06-26"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "PHYSICAL_DAMAGE_UP"
        ]
      },
      {
        "id": "vaeldra-sirens-call",
        "dragonId": "vaeldra",
        "kind": "habit",
        "name": "Siren's Call",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1: reduce self Physical Damage Received for three rounds. Start of Rounds 1-3: 40%-100% chance to apply Taunt to each non-Taunted enemy or Stagger to each already Taunted enemy until end of round; roll scope is not stated.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vaeldra Siren's Call screenshot",
          "capturedAt": "2026-06-25",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vaeldra-sirens-call-2026-06-26"
        ],
        "tags": [
          "TAUNT",
          "STAGGER",
          "CONTROL",
          "DAMAGE_RECEIVED_DOWN"
        ]
      }
    ],
    "affinities": {
      "Spearmen": "positive",
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TAUNT",
      "PHYSICAL_DAMAGE",
      "ADJACENT_TARGET",
      "DAMAGE_RECEIVED_DOWN",
      "TACTICAL_DAMAGE",
      "LEFT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "STRENGTH_UP",
      "DEBUFF_INSTINCTS",
      "DEBUFF_INITIATIVE",
      "PHYSICAL_DAMAGE_UP",
      "FIRE_DAMAGE",
      "FIRE_DAMAGE_UP",
      "STAGGER",
      "CONTROL"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Vaeldra main screen screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Vaeldra Lure screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Vaeldra Warrior's Resilience screenshot",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Vaeldra Habit screenshots",
        "capturedAt": "2026-06-25",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Vaeldra main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "velar",
    "slug": "velar",
    "name": "Velar",
    "rarity": "Epic",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/velar/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": "2026-07-03",
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-03",
    "notes": null,
    "command": {
      "id": "velar-whirlwind",
      "dragonId": "velar",
      "kind": "command",
      "name": "Whirlwind",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 2, 4, 6, 8: 20% chance to grant 2 other Allies in any lane Advantage (+15%) for 2 round(s).\n\nRounds 3, 5, 7, 9: Deal Tactical Damage to 3 Enemies in any lane (Damage Rate: +45%).\n\nAt 10 Stars:\n\nEach Round: 12% chance to Cleanse 1 instance of Bleed, Panic, or Burn from each Ally. This chance is checked separately per target.\n\nRounds 2, 4, 6, 8: Apply Recovery to 3 Allies in any lane (Recovery Rate: +18%, enhanced by Initiative).",
      "verification": {
        "status": "screenshot-verified",
        "source": "Velar Whirlwind summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "velar-whirlwind-summary-2026-07-03"
      ],
      "tags": [
        "ADVANTAGE",
        "TACTICAL_DAMAGE",
        "ANY_LANE_TARGET",
        "CLEANSE_NEGATIVE",
        "RECOVERY",
        "INITIATIVE_SCALING",
        "COMMAND_AUGMENTATION"
      ]
    },
    "trait": {
      "id": "velar-sentinels-wit",
      "dragonId": "velar",
      "kind": "trait",
      "name": "Sentinel's Wit",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard, increase your Tactical Damage Dealt by +16%. Increase Instinct and Initiative by +20 of the Ally deployed in the Left Flank.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Velar Sentinel's Wit screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "velar-sentinels-wit-2026-07-03"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "INSTINCT_UP",
        "BUFF_INITIATIVE",
        "VANGUARD_REQUIRED",
        "LEFT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "velar-strategic-leader",
        "dragonId": "velar",
        "kind": "habit",
        "name": "Strategic Leader",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Tactical Damage Dealt by +10% of 1 Ally in any lane, prioritizing the Vanguard, until the end of combat.\n\nProgression: Habit Level 1: +10%; Habit Level 2: +12%; Habit Level 3: +14%; Habit Level 4: +17%; Habit Level 5: +20%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Velar Strategic Leader screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "velar-strategic-leader-2026-07-03"
        ],
        "tags": [
          "TACTICAL_DAMAGE",
          "BUFF_ALLIES",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "velar-quick-reflexes",
        "dragonId": "velar",
        "kind": "habit",
        "name": "Quick Reflexes",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase your Instinct and Initiative by +16% until the end of combat.\n\nProgression: Habit Level 1: +16%; Habit Level 2: +19.2%; Habit Level 3: +22.4%; Habit Level 4: +27.2%; Habit Level 5: +32%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Velar Quick Reflexes screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "velar-quick-reflexes-2026-07-03"
        ],
        "tags": [
          "INSTINCT_UP",
          "BUFF_INITIATIVE",
          "BUFF_SELF"
        ]
      },
      {
        "id": "velar-gales-of-power",
        "dragonId": "velar",
        "kind": "habit",
        "name": "Gales of Power",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Rounds 2, 4, 6, 8: 12% chance to grant First-Strike to 3 Allies in any lane and afflict Slow on 3 Enemies in any lane. Each effect is checked separately per target and lasts for 2 round(s).\n\nFirst-Strike causes the target to attack before all other combatants each round.\n\nSlow causes the target to attack after all other combatants each round.\n\nProgression: Habit Level 1: First-Strike chance 12%; Slow chance 12%; Habit Level 2: 14.4%; 14.4%; Habit Level 3: 16.8%; 16.8%; Habit Level 4: 20.4%; 20.4%; Habit Level 5: 24%; 24%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Velar Gales of Power screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "velar-gales-of-power-2026-07-03"
        ],
        "tags": [
          "FIRST_STRIKE",
          "SLOW",
          "ANY_LANE_TARGET",
          "BUFF_ALLIES"
        ]
      },
      {
        "id": "velar-fierce-unity",
        "dragonId": "velar",
        "kind": "habit",
        "name": "Fierce Unity",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Strength and Instinct by +5% (enhanced by Initiative) of 3 Allies in any lane until the end of combat.\n\nProgression: Habit Level 1: +5%; Habit Level 2: +6%; Habit Level 3: +7%; Habit Level 4: +8.5%; Habit Level 5: +10%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Velar Fierce Unity screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "velar-fierce-unity-2026-07-03"
        ],
        "tags": [
          "STRENGTH_UP",
          "INSTINCT_UP",
          "INITIATIVE_SCALING",
          "BUFF_ALLIES",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "velar-breath-of-renewal",
        "dragonId": "velar",
        "kind": "habit",
        "name": "Breath of Renewal",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Whirlwind gains:\n\nEach Round: 12% chance to Cleanse 1 instance of Bleed, Panic, or Burn from each Ally. This chance is checked separately per target.\n\nRounds 2, 4, 6, 8: Apply Recovery to 3 Allies in any lane (Recovery Rate: +18%, enhanced by Initiative).\n\nProgression: Habit Level 1: Cleanse chance 12%; Recovery Rate 18%; Habit Level 2: 16%; 23.4%; Habit Level 3: 19%; 28.8%; Habit Level 4: 24%; 36%; Habit Level 5: 30%; 45%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Velar Breath of Renewal screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "velar-breath-of-renewal-2026-07-03"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "CLEANSE_NEGATIVE",
          "RECOVERY",
          "INITIATIVE_SCALING",
          "ANY_LANE_TARGET"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "positive",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "ADVANTAGE",
      "TACTICAL_DAMAGE",
      "ANY_LANE_TARGET",
      "CLEANSE_NEGATIVE",
      "RECOVERY",
      "INITIATIVE_SCALING",
      "COMMAND_AUGMENTATION",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "VANGUARD_REQUIRED",
      "LEFT_FLANK_TARGET",
      "BUFF_ALLIES",
      "BUFF_SELF",
      "FIRST_STRIKE",
      "SLOW",
      "STRENGTH_UP"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Velar main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Velar Whirlwind summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Velar Sentinel's Wit screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Velar Habit screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "screenshot-verified",
        "source": "Velar main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "zivern",
    "slug": "zivern",
    "name": "Zivern",
    "rarity": "Epic",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/zivern/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": "2026-07-03",
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-03",
    "notes": null,
    "command": {
      "id": "zivern-silent-shade",
      "dragonId": "zivern",
      "kind": "command",
      "name": "Silent Shade",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 1, 4, 6, 9: 40% chance to increase the Tactical Damage Received of 1 Enemy in the same lane by +15% for 2 round(s).\n\nRounds 1, 4, 6, 9: Deal Tactical Damage to 2 Enemies within adjacency (Damage Rate: +75%).",
      "verification": {
        "status": "screenshot-verified",
        "source": "Zivern Silent Shade summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "zivern-silent-shade-summary-2026-07-03"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "TACTICAL_DAMAGE_RECEIVED_UP",
        "SAME_LANE_TARGET",
        "ADJACENT_TARGET",
        "ENHANCED_BY_INSTINCT"
      ]
    },
    "trait": {
      "id": "zivern-sentinels-wit",
      "dragonId": "zivern",
      "kind": "trait",
      "name": "Sentinel's Wit",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard, increase your Tactical Damage Dealt by +16%. Increase Instinct and Initiative by +20 of the Ally deployed in the Left Flank.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Zivern Sentinel's Wit screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "zivern-sentinels-wit-2026-07-03"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "INSTINCT_UP",
        "BUFF_INITIATIVE",
        "VANGUARD_REQUIRED",
        "LEFT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "zivern-battle-mastery",
        "dragonId": "zivern",
        "kind": "habit",
        "name": "Battle Mastery",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Reduce the Strength and Instinct (enhanced by Intelligence) of 3 Enemies by -5% until the end of combat.\n\nProgression: Habit Level 1: -5%; Habit Level 2: -6%; Habit Level 3: -7%; Habit Level 4: -8.85%; Habit Level 5: -10.5%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Zivern Battle Mastery screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "zivern-battle-mastery-2026-07-03"
        ],
        "tags": [
          "DEBUFF_STRENGTH",
          "DEBUFF_INSTINCTS",
          "INTELLIGENCE_SCALING",
          "ENEMY_DEBUFF"
        ]
      },
      {
        "id": "zivern-keen-instinct",
        "dragonId": "zivern",
        "kind": "habit",
        "name": "Keen Instinct",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase your Intelligence and Instinct by +16% until the end of combat.\n\nProgression: Habit Level 1: +16%; Habit Level 2: +19.2%; Habit Level 3: +22.4%; Habit Level 4: +27.2%; Habit Level 5: +32%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Zivern Keen Instinct screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "zivern-keen-instinct-2026-07-03"
        ],
        "tags": [
          "INTELLIGENCE_UP",
          "INSTINCT_UP",
          "BUFF_SELF"
        ]
      },
      {
        "id": "zivern-fearsome-reach",
        "dragonId": "zivern",
        "kind": "habit",
        "name": "Fearsome Reach",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Odd-numbered Rounds: 30% chance to reduce the Instinct (enhanced by Intelligence) by -15% and afflict Panic (Damage Rate: +20%) on 3 Enemies in any lane for 2 round(s).\n\nPanic deals Tactical Damage to the target each round.\n\nProgression: Habit Level 1: Fearsome Reach chance 30%; Habit Level 2: 36%; Habit Level 3: 42%; Habit Level 4: 51%; Habit Level 5: 60%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Zivern Fearsome Reach screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "zivern-fearsome-reach-2026-07-03"
        ],
        "tags": [
          "DEBUFF_INSTINCTS",
          "INTELLIGENCE_SCALING",
          "PANIC",
          "TACTICAL_DAMAGE",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "zivern-steel-shroud",
        "dragonId": "zivern",
        "kind": "habit",
        "name": "Steel Shroud",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Reduce Physical Damage Received, excluding Basic Attacks, and Tactical Damage Received by -3% of 2 other Allies in any lane until the end of combat.\n\nProgression: Habit Level 1: -3.5%; Habit Level 2: -4.2%; Habit Level 3: -4.9%; Habit Level 4: -5.95%; Habit Level 5: -7%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Zivern Steel Shroud screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "zivern-steel-shroud-2026-07-03"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "TACTICAL_DAMAGE_RECEIVED_DOWN",
          "EXCLUDES_BASIC_ATTACKS",
          "OTHER_ALLIES_TARGET",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "zivern-cloak-of-terror",
        "dragonId": "zivern",
        "kind": "habit",
        "name": "Cloak of Terror",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Odd-numbered Rounds: 10% chance to afflict Overwhelm on 2 Enemies within adjacency for 2 round(s). This chance is doubled (20%) if the target is afflicted with Vulnerable.\n\nOverwhelm prevents the target from using Active Commands and Habits on their turn.\n\nProgression: Habit Level 1: Overwhelm chance 10%; Habit Level 2: 13%; Habit Level 3: 16%; Habit Level 4: 20%; Habit Level 5: 25%.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Zivern Cloak of Terror screenshot",
          "capturedAt": "2026-07-03",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "zivern-cloak-of-terror-2026-07-03"
        ],
        "tags": [
          "OVERWHELM",
          "CONTROL",
          "VULNERABLE",
          "ADJACENT_TARGET"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "positive",
      "Spearmen": "unknown",
      "Siege": "positive"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TACTICAL_DAMAGE",
      "TACTICAL_DAMAGE_RECEIVED_UP",
      "SAME_LANE_TARGET",
      "ADJACENT_TARGET",
      "ENHANCED_BY_INSTINCT",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "VANGUARD_REQUIRED",
      "LEFT_FLANK_TARGET",
      "DEBUFF_STRENGTH",
      "DEBUFF_INSTINCTS",
      "INTELLIGENCE_SCALING",
      "ENEMY_DEBUFF",
      "INTELLIGENCE_UP",
      "BUFF_SELF",
      "PANIC",
      "ANY_LANE_TARGET",
      "DAMAGE_RECEIVED_DOWN",
      "TACTICAL_DAMAGE_RECEIVED_DOWN",
      "EXCLUDES_BASIC_ATTACKS",
      "OTHER_ALLIES_TARGET",
      "OVERWHELM",
      "CONTROL",
      "VULNERABLE"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Zivern main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Zivern Silent Shade summary screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Zivern Sentinel's Wit screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Zivern Habit screenshots",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "screenshot-verified",
        "source": "Zivern main screen screenshot",
        "capturedAt": "2026-07-03",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "antares",
    "slug": "antares",
    "name": "Antares",
    "rarity": "Rare",
    "breed": "Hunter",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/antares/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-15",
    "notes": "Affinity icons were not text-verified and remain unknown.",
    "command": {
      "id": "antares-relentless-pursuit",
      "dragonId": "antares",
      "kind": "command",
      "name": "Relentless Pursuit",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: 20% chance to apply Vulnerable to 1 enemy within adjacency for 2 rounds. Vulnerable increases Damage Received by +10%.\n\nRounds 3, 6, and 9: deal Fire Damage to 2 enemies within adjacency at a +65% Damage Rate. Fire Damage is increased by the attacker's Intelligence and mitigated by the target's Initiative.\n\nAt 6+ Stars, Fiery Precision augments Relentless Pursuit. Each round, also deal Fire Damage to 3 enemies in any lane afflicted with Slow. The Damage Rate uses Fiery Precision's current Habit Level: +20% / +24% / +28% / +34% / +40%. This added Slow-conditioned attack is additive to the base Command and is represented once.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Antares Relentless Pursuit screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "antares-relentless-pursuit-2026-07-15"
      ],
      "tags": [
        "VULNERABLE",
        "FIRE_DAMAGE",
        "ADJACENT_TARGET",
        "SPECIFIC_ROUNDS",
        "INTELLIGENCE_SCALING",
        "ANY_LANE_TARGET",
        "COMMAND_AUGMENTATION"
      ]
    },
    "trait": {
      "id": "antares-hunters-wrath",
      "dragonId": "antares",
      "kind": "trait",
      "name": "Hunter's Wrath",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Antares is deployed in Vanguard: increase Antares Fire Damage Dealt by +16%. Increase Strength of the Right Flank ally by +20 and Initiative of the Right Flank ally by +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Antares Hunter's Wrath screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "antares-hunters-wrath-2026-07-15"
      ],
      "tags": [
        "FIRE_DAMAGE_UP",
        "STRENGTH_UP",
        "BUFF_INITIATIVE",
        "VANGUARD_REQUIRED",
        "RIGHT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "antares-blazing-onslaught",
        "dragonId": "antares",
        "kind": "habit",
        "name": "Blazing Onslaught",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for 3 rounds: increase Fire Damage Received of 1 enemy in any lane, prioritizing Left Flank. Separately increase non-Basic-Attack Physical Damage Received of 1 enemy in any lane, prioritizing Right Flank. The target selections are independent; distinctness is not stated, so the same target is allowed but not required. This direct typed Damage Received amplification is not the named Vulnerable status.\n\nProgression table (Fire and non-Basic Physical Damage Received increase):\nHabit Level 1: +11%\nHabit Level 2: +13.2%\nHabit Level 3: +15.4%\nHabit Level 4: +18.7%\nHabit Level 5: +22%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Antares Blazing Onslaught screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "antares-blazing-onslaught-2026-07-15"
        ],
        "tags": [
          "FIRE_DAMAGE_RECEIVED_UP",
          "PHYSICAL_DAMAGE_RECEIVED_UP",
          "EXCLUDES_BASIC_ATTACKS",
          "ANY_LANE_TARGET",
          "LEFT_FLANK_TARGET",
          "RIGHT_FLANK_TARGET",
          "ENEMY_DEBUFF"
        ]
      },
      {
        "id": "antares-dragons-flair",
        "dragonId": "antares",
        "kind": "habit",
        "name": "Dragon's Flair",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Antares Fire Damage Dealt. Self-only.\n\nProgression table:\nHabit Level 1: +8%\nHabit Level 2: +9.6%\nHabit Level 3: +11.2%\nHabit Level 4: +13.6%\nHabit Level 5: +16%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Antares Dragon's Flair screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "antares-dragons-flair-2026-07-15"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "BUFF_SELF"
        ]
      },
      {
        "id": "antares-fiery-precision",
        "dragonId": "antares",
        "kind": "habit",
        "name": "Fiery Precision",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Fiery Precision augments Relentless Pursuit. Each round: deal Fire Damage to 3 enemies in any lane afflicted with Slow. This is additive to the base Command and uses one effective output path.\n\nProgression table (Damage Rate):\nHabit Level 1: +20%\nHabit Level 2: +24%\nHabit Level 3: +28%\nHabit Level 4: +34%\nHabit Level 5: +40%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Antares Fiery Precision screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "antares-fiery-precision-2026-07-15"
        ],
        "tags": [
          "FIRE_DAMAGE",
          "ANY_LANE_TARGET",
          "COMMAND_AUGMENTATION"
        ]
      },
      {
        "id": "antares-dragons-intellect",
        "dragonId": "antares",
        "kind": "habit",
        "name": "Dragon's Intellect",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce Antares Damage Received and increase Antares Intelligence. Self-only.\n\nProgression table (Damage Received; Intelligence):\nHabit Level 1: -4%; +5%\nHabit Level 2: -4.8%; +6%\nHabit Level 3: -5.6%; +7%\nHabit Level 4: -6.8%; +8.5%\nHabit Level 5: -8%; +10%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Antares Dragon's Intellect screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "antares-dragons-intellect-2026-07-15"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "INTELLIGENCE_UP",
          "BUFF_SELF"
        ]
      },
      {
        "id": "antares-redemption",
        "dragonId": "antares",
        "kind": "habit",
        "name": "Redemption",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Antares Intelligence and Initiative. Start of each round: make one activation roll; on success, grant Antares immunity to both Vulnerable and Weakened for 2 rounds. The two immunities share one successful roll, not two independent rolls. The screenshot does not confirm cleansing an already active status, refresh behavior, or stacking behavior. Self-only.\n\nProgression table (Intelligence and Initiative; immunity chance):\nHabit Level 1: +6%; 10%\nHabit Level 2: +7.8%; 13%\nHabit Level 3: +9.6%; 16%\nHabit Level 4: +12%; 20%\nHabit Level 5: +15%; 25%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {
          "status": "screenshot-verified",
          "source": "Antares Redemption screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "antares-redemption-2026-07-15"
        ],
        "tags": [
          "INTELLIGENCE_UP",
          "BUFF_INITIATIVE",
          "IMMUNITY",
          "BUFF_SELF"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "VULNERABLE",
      "FIRE_DAMAGE",
      "ADJACENT_TARGET",
      "SPECIFIC_ROUNDS",
      "INTELLIGENCE_SCALING",
      "ANY_LANE_TARGET",
      "COMMAND_AUGMENTATION",
      "FIRE_DAMAGE_UP",
      "STRENGTH_UP",
      "BUFF_INITIATIVE",
      "VANGUARD_REQUIRED",
      "RIGHT_FLANK_TARGET",
      "FIRE_DAMAGE_RECEIVED_UP",
      "PHYSICAL_DAMAGE_RECEIVED_UP",
      "EXCLUDES_BASIC_ATTACKS",
      "ENEMY_DEBUFF",
      "BUFF_SELF",
      "DAMAGE_RECEIVED_DOWN",
      "INTELLIGENCE_UP",
      "WEAKENED",
      "IMMUNITY"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Antares Relentless Pursuit screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Antares Hunter's Wrath screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Antares Habit screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "unknown",
        "source": "Affinity icons were not text-verified",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "shimmer",
    "slug": "shimmer",
    "name": "Shimmer",
    "rarity": "Rare",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/shimmer/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-16",
    "notes": "Affinity icons were not text-verified and remain unknown.",
    "command": {
      "id": "shimmer-unbreakable-loyalty",
      "dragonId": "shimmer",
      "kind": "command",
      "name": "Unbreakable Loyalty",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: one 30% activation roll. On success, select the other ally with the highest Strength, then increase that same ally's Strength by +18% and Initiative by +9%, both enhanced by Shimmer's Instinct, for 2 rounds. Shimmer is excluded. Equal-highest-Strength tie-breaking and repeated refresh/stacking are unresolved.\n\nRounds 2, 4, 7, and 9: deal Tactical Damage to 2 enemies within adjacency at a +50% Damage Rate. Tactical Damage scales with Shimmer's Instinct and is mitigated by target Intelligence.\n\nAt 6+ Stars, Loyal Shield augments Unbreakable Loyalty on rounds 2, 4, 7, and 9 with Recovery to 2 other allies in any lane. Recovery uses Loyal Shield's current base rate, is enhanced by Shimmer's Instinct, and is doubled separately for each recipient that has Resistance. One recipient's Resistance does not affect the other recipient.",
      "verification": {"status": "screenshot-verified", "source": "Shimmer Unbreakable Loyalty screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "evidenceIds": ["shimmer-unbreakable-loyalty-2026-07-16"],
      "tags": ["BUFF_STRENGTH", "BUFF_INITIATIVE", "HIGHEST_STRENGTH_TARGET", "TACTICAL_DAMAGE", "ENHANCED_BY_INSTINCT", "SPECIFIC_ROUNDS", "ADJACENT_TARGET", "RECOVERY", "RESISTANCE_PAYOFF", "COMMAND_AUGMENTATION", "OTHER_ALLIES_TARGET"]
    },
    "trait": {
      "id": "shimmer-sentinels-presence",
      "dragonId": "shimmer",
      "kind": "trait",
      "name": "Sentinel's Presence",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Shimmer is Vanguard: increase Shimmer Recovery Dealt by +15% and Instinct by +25. Increase Fire Damage Dealt of the Left Flank ally by +16%. Shimmer's Recovery and Instinct increases are self-only.",
      "verification": {"status": "screenshot-verified", "source": "Shimmer Sentinel's Presence screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "evidenceIds": ["shimmer-sentinels-presence-2026-07-16"],
      "tags": ["RECOVERY_DEALT_UP", "INSTINCT_UP", "FIRE_DAMAGE_UP", "VANGUARD_REQUIRED", "LEFT_FLANK_TARGET", "BUFF_SELF"]
    },
    "habits": [
      {
        "id": "shimmer-crushing-force",
        "dragonId": "shimmer",
        "kind": "habit",
        "name": "Crushing Force",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 1 for 3 rounds, make two independent ally selections. Physical branch: increase Physical Damage Dealt from Active Commands and Habits of 1 Ally in any lane, prioritizing Left Flank; Basic Attacks are excluded. Tactical branch: increase Tactical Damage Dealt of 1 Ally in any lane, prioritizing Right Flank. Ally does not exclude Shimmer, distinct targets are not required, and a branch may select Shimmer in the prioritized position. Fallback after a prioritized target becomes unavailable and convergence during fallback are unresolved.\n\nProgression table (both Damage Dealt increases):\nHabit Level 1: +9%\nHabit Level 2: +10.8%\nHabit Level 3: +12.6%\nHabit Level 4: +15.3%\nHabit Level 5: +18%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Shimmer Crushing Force screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["shimmer-crushing-force-2026-07-16"],
        "tags": ["PHYSICAL_DAMAGE_UP", "TACTICAL_DAMAGE_UP", "EXCLUDES_BASIC_ATTACKS", "ANY_LANE_TARGET", "LEFT_FLANK_TARGET", "RIGHT_FLANK_TARGET", "BUFF_ALLIES"]
      },
      {
        "id": "shimmer-dragons-insight",
        "dragonId": "shimmer",
        "kind": "habit",
        "name": "Dragon's Insight",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce Shimmer Damage Received and increase Shimmer Instinct. Self-only.\n\nProgression table (Damage Received; Instinct):\nHabit Level 1: -4%; +5%\nHabit Level 2: -4.8%; +6%\nHabit Level 3: -5.6%; +7%\nHabit Level 4: -6.8%; +8.5%\nHabit Level 5: -8%; +10%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Shimmer Dragon's Insight screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["shimmer-dragons-insight-2026-07-16"],
        "tags": ["DAMAGE_RECEIVED_DOWN", "INSTINCT_UP", "BUFF_SELF"]
      },
      {
        "id": "shimmer-loyal-shield",
        "dragonId": "shimmer",
        "kind": "habit",
        "name": "Loyal Shield",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Unbreakable Loyalty on rounds 2, 4, 7, and 9: apply Recovery to 2 other allies in any lane, enhanced by Shimmer's Instinct. Double the current base rate separately for each recipient with Resistance.\n\nProgression table (base Recovery Rate; doubled with Resistance):\nHabit Level 1: 30%; 60%\nHabit Level 2: 36%; 72%\nHabit Level 3: 42%; 84%\nHabit Level 4: 51%; 102%\nHabit Level 5: 60%; 120%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Shimmer Loyal Shield screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["shimmer-loyal-shield-2026-07-16"],
        "tags": ["COMMAND_AUGMENTATION", "RECOVERY", "RESISTANCE_PAYOFF", "OTHER_ALLIES_TARGET", "ENHANCED_BY_INSTINCT"]
      },
      {
        "id": "shimmer-unbroken-devotion",
        "dragonId": "shimmer",
        "kind": "habit",
        "name": "Unbroken Devotion",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Recovery Received of 2 other allies in any lane. Shimmer is excluded.\n\nProgression table (Recovery Received):\nHabit Level 1: +15%\nHabit Level 2: +18%\nHabit Level 3: +21%\nHabit Level 4: +25.5%\nHabit Level 5: +30%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Shimmer Unbroken Devotion screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["shimmer-unbroken-devotion-2026-07-16"],
        "tags": ["RECOVERY_RECEIVED_UP", "OTHER_ALLIES_TARGET", "BUFF_ALLIES"]
      },
      {
        "id": "shimmer-sneak-attack",
        "dragonId": "shimmer",
        "kind": "habit",
        "name": "Sneak Attack",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: make one activation roll. On success, select the other ally with the highest Strength, increase that same ally's Physical Damage Dealt by +10%, and grant that same ally First-Strike for 2 rounds. First-Strike makes the recipient attack before all other combatants each round. Shimmer is excluded and equal-highest-Strength tie-breaking is unresolved.\n\nProgression table (activation chance):\nHabit Level 1: 14%\nHabit Level 2: 18.2%\nHabit Level 3: 22.4%\nHabit Level 4: 28%\nHabit Level 5: 35%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {"status": "screenshot-verified", "source": "Shimmer Sneak Attack screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["shimmer-sneak-attack-2026-07-16"],
        "tags": ["PHYSICAL_DAMAGE_UP", "FIRST_STRIKE", "HIGHEST_STRENGTH_TARGET", "OTHER_ALLIES_TARGET"]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": ["BUFF_STRENGTH", "BUFF_INITIATIVE", "HIGHEST_STRENGTH_TARGET", "TACTICAL_DAMAGE", "ENHANCED_BY_INSTINCT", "RECOVERY", "RESISTANCE_PAYOFF", "COMMAND_AUGMENTATION", "FIRE_DAMAGE_UP", "VANGUARD_REQUIRED", "PHYSICAL_DAMAGE_UP", "TACTICAL_DAMAGE_UP", "EXCLUDES_BASIC_ATTACKS", "DAMAGE_RECEIVED_DOWN", "RECOVERY_RECEIVED_UP", "FIRST_STRIKE"],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {"status": "screenshot-verified", "source": "Shimmer Unbreakable Loyalty screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "trait": {"status": "screenshot-verified", "source": "Shimmer Sentinel's Presence screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "habits": {"status": "screenshot-verified", "source": "Shimmer Habit screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "affinities": {"status": "unknown", "source": "Affinity icons were not text-verified", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true}
    }
  },
  {
    "id": "jagadrix",
    "slug": "jagadrix",
    "name": "Jagadrix",
    "rarity": "Rare",
    "breed": "Hunter",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/jagadrix/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-16",
    "notes": "Adult life stage was shown. Affinity icon was not text-verified and remains unknown.",
    "command": {
      "id": "jagadrix-cunning-whispers",
      "dragonId": "jagadrix",
      "kind": "command",
      "name": "Cunning Whispers",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: one 30% activation roll targets 1 enemy in the same lane. Reduce that same target's Instinct and Initiative by -15%, both enhanced by Jagadrix's Initiative, for 2 rounds. Same-lane targeting is battlefield-facing. Fallback with no valid same-lane enemy and repeated reduction stacking/refresh are unresolved.\n\nRounds 2, 5, and 8: deal Fire Damage to 1 enemy in the same lane at a +120% Damage Rate. Fire Damage scales with Jagadrix's Intelligence and is mitigated by target Initiative.\n\nAt 10 Stars, Echoes of Deceit augments Cunning Whispers. Round 1: choose the enemy with highest Instinct and reduce its Instinct and Initiative until end of combat, enhanced by Jagadrix's Initiative. This selection is separate from the base each-round activation. Rounds 3, 6, and 9: deal Fire Damage to all enemies that deal Tactical Damage, using Echoes of Deceit's current rate. Damage is doubled separately against each eligible target afflicted with Panic. The multiplier is 2x, and this does not add Tactical Damage to Jagadrix's Damage Profile.",
      "verification": {"status": "screenshot-verified", "source": "Jagadrix Cunning Whispers screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "evidenceIds": ["jagadrix-cunning-whispers-2026-07-16"],
      "tags": ["DEBUFF_INSTINCTS", "DEBUFF_INITIATIVE", "INITIATIVE_SCALING", "SAME_LANE_TARGET", "FIRE_DAMAGE", "INTELLIGENCE_SCALING", "SPECIFIC_ROUNDS", "COMMAND_AUGMENTATION", "PANIC_PAYOFF", "ANY_LANE_TARGET"]
    },
    "trait": {
      "id": "jagadrix-hunters-wrath",
      "dragonId": "jagadrix",
      "kind": "trait",
      "name": "Hunter's Wrath",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Jagadrix is Vanguard: increase Jagadrix Fire Damage Dealt by +16%. Increase Strength and Initiative of the Right Flank ally by +20. Jagadrix's Fire increase is self-only.",
      "verification": {"status": "screenshot-verified", "source": "Jagadrix Hunter's Wrath screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "evidenceIds": ["jagadrix-hunters-wrath-2026-07-16"],
      "tags": ["FIRE_DAMAGE_UP", "STRENGTH_UP", "BUFF_INITIATIVE", "VANGUARD_REQUIRED", "RIGHT_FLANK_TARGET", "BUFF_SELF"]
    },
    "habits": [
      {
        "id": "jagadrix-enervate",
        "dragonId": "jagadrix",
        "kind": "habit",
        "name": "Enervate",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat: target 1 enemy that deals Tactical Damage and reduce that enemy's Tactical Damage Dealt until end of combat. This typed enemy suppression is not Weakened and is not allied Tactical support. Selection among multiple valid enemies is unresolved.\n\nProgression table (Tactical Damage Dealt):\nHabit Level 1: -8%\nHabit Level 2: -9.6%\nHabit Level 3: -11.2%\nHabit Level 4: -13.6%\nHabit Level 5: -16%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Jagadrix Enervate screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["jagadrix-enervate-2026-07-16"],
        "tags": ["TACTICAL_DAMAGE_DOWN", "DAMAGE_DEALT_DOWN", "ENEMY_DEBUFF"]
      },
      {
        "id": "jagadrix-second-wind",
        "dragonId": "jagadrix",
        "kind": "habit",
        "name": "Second Wind",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Round 6, resolve in this order: (1) increase Jagadrix Damage Dealt until end of combat; (2) apply Recovery to Jagadrix; then (3) apply Nullify Recovery to Jagadrix until end of combat. Nullify Recovery prevents receiving later Recovery. The immediate self-Recovery resolves before Nullify Recovery. All effects are self-only and non-scoring. Timing with external Recovery amplification, cleanse/removal/immunity behavior, and already-restored-troop behavior are unresolved.\n\nProgression table (Damage Dealt; Recovery Rate):\nHabit Level 1: +10%; +150%\nHabit Level 2: +12%; +180%\nHabit Level 3: +14%; +210%\nHabit Level 4: +17%; +255%\nHabit Level 5: +20%; +300%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Jagadrix Second Wind screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["jagadrix-second-wind-2026-07-16"],
        "tags": ["DAMAGE_DEALT_UP", "RECOVERY", "NULLIFY_RECOVERY", "BUFF_SELF", "SPECIFIC_ROUNDS"]
      },
      {
        "id": "jagadrix-whispering-sabotage",
        "dragonId": "jagadrix",
        "kind": "habit",
        "name": "Whispering Sabotage",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each round: chance to apply Weakened (-10% Damage Dealt) to 1 enemy in the same lane for 2 rounds. Same-lane targeting is battlefield-facing. Weakened does not satisfy Control.\n\nProgression table (Weakened chance):\nHabit Level 1: 25%\nHabit Level 2: 30%\nHabit Level 3: 35%\nHabit Level 4: 42.5%\nHabit Level 5: 50%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Jagadrix Whispering Sabotage screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["jagadrix-whispering-sabotage-2026-07-16"],
        "tags": ["WEAKENED", "DAMAGE_DEALT_DOWN", "SAME_LANE_TARGET", "ENEMY_DEBUFF"]
      },
      {
        "id": "jagadrix-quick-witted",
        "dragonId": "jagadrix",
        "kind": "habit",
        "name": "Quick-Witted",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: increase Jagadrix Intelligence and Initiative. Self-only.\n\nProgression table (Intelligence and Initiative):\nHabit Level 1: +12.5%\nHabit Level 2: +15%\nHabit Level 3: +17.5%\nHabit Level 4: +21.25%\nHabit Level 5: +25%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {"status": "screenshot-verified", "source": "Jagadrix Quick-Witted screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["jagadrix-quick-witted-2026-07-16"],
        "tags": ["INTELLIGENCE_UP", "BUFF_INITIATIVE", "BUFF_SELF"]
      },
      {
        "id": "jagadrix-echoes-of-deceit",
        "dragonId": "jagadrix",
        "kind": "habit",
        "name": "Echoes of Deceit",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Cunning Whispers. Round 1: independently select the enemy with the highest Instinct and reduce its Instinct and Initiative until end of combat, enhanced by Jagadrix's Initiative. Rounds 3, 6, and 9: deal Fire Damage to all enemies that deal Tactical Damage. Double damage separately against each eligible target with Panic. Equal-highest-Instinct tie-breaking and overlap/stacking with the base Round 1 reductions are unresolved.\n\nProgression table (Instinct and Initiative; Fire Damage Rate):\nHabit Level 1: -6%; +30%\nHabit Level 2: -7.8%; +39%\nHabit Level 3: -9.6%; +48%\nHabit Level 4: -12%; +60%\nHabit Level 5: -15%; +75%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {"status": "screenshot-verified", "source": "Jagadrix Echoes of Deceit screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
        "evidenceIds": ["jagadrix-echoes-of-deceit-2026-07-16"],
        "tags": ["COMMAND_AUGMENTATION", "DEBUFF_INSTINCTS", "DEBUFF_INITIATIVE", "INITIATIVE_SCALING", "FIRE_DAMAGE", "PANIC_PAYOFF", "SPECIFIC_ROUNDS", "ANY_LANE_TARGET"]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": ["DEBUFF_INSTINCTS", "DEBUFF_INITIATIVE", "INITIATIVE_SCALING", "SAME_LANE_TARGET", "FIRE_DAMAGE", "INTELLIGENCE_SCALING", "COMMAND_AUGMENTATION", "PANIC_PAYOFF", "FIRE_DAMAGE_UP", "STRENGTH_UP", "BUFF_INITIATIVE", "VANGUARD_REQUIRED", "TACTICAL_DAMAGE_DOWN", "DAMAGE_DEALT_DOWN", "DAMAGE_DEALT_UP", "RECOVERY", "NULLIFY_RECOVERY", "WEAKENED", "INTELLIGENCE_UP"],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {"status": "screenshot-verified", "source": "Jagadrix Cunning Whispers screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "trait": {"status": "screenshot-verified", "source": "Jagadrix Hunter's Wrath screenshot", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "habits": {"status": "screenshot-verified", "source": "Jagadrix Habit screenshots", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true},
      "affinities": {"status": "unknown", "source": "Affinity icon was not text-verified", "capturedAt": "2026-07-16", "gameVersion": null, "reviewedManually": true}
    }
  },
  {
    "id": "bevlorin",
    "slug": "bevlorin",
    "name": "Bevlorin",
    "rarity": "Rare",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/bevlorin/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "shadowrend",
    "slug": "shadowrend",
    "name": "Shadowrend",
    "rarity": "Rare",
    "breed": "Warrior",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/shadowrend/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "thunderstrike",
    "slug": "thunderstrike",
    "name": "Thunderstrike",
    "rarity": "Rare",
    "breed": "Warrior",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/thunderstrike/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "vesper",
    "slug": "vesper",
    "name": "Vesper",
    "rarity": "Rare",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/vesper/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": false,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "arulix",
    "slug": "arulix",
    "name": "Arulix",
    "rarity": "Rare",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/arulix/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-15",
    "notes": "Affinity icons were not text-verified and remain unknown.",
    "command": {
      "id": "arulix-gleaming-spiral",
      "dragonId": "arulix",
      "kind": "command",
      "name": "Gleaming Spiral",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each round: 25% chance to reduce Fire Damage Dealt by -15% for 1 round for all enemies that deal Fire Damage. This is enemy typed Damage Dealt suppression, not Weakened.\n\nRounds 1, 2, 3, 5, and 8: deal Tactical Damage to all enemies that deal Physical Damage excluding Basic Attacks at a +45% Damage Rate. Tactical Damage is increased by the attacker's Instinct and mitigated by the target's Intelligence. The enemy damage-type condition is battlefield-facing.\n\nAt 6+ Stars, Spiral Surge augments Gleaming Spiral on the same rounds with one Physical Damage output to 2 enemies in any lane. The current Spiral Surge base Damage Rate is +20% / +24% / +28% / +34% / +40% by Habit Level. Round 5 uses 1.5× the current upgraded base rate and Round 8 uses 2× the current upgraded base rate. Physical Damage is increased by the attacker's Strength and mitigated by the target's Instinct. The augmentation is represented once.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Arulix Gleaming Spiral screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "arulix-gleaming-spiral-2026-07-15"
      ],
      "tags": [
        "TACTICAL_DAMAGE",
        "PHYSICAL_DAMAGE",
        "FIRE_DAMAGE_DEALT_DOWN",
        "DAMAGE_DEALT_DOWN",
        "EXCLUDES_BASIC_ATTACKS",
        "SPECIFIC_ROUNDS",
        "ANY_LANE_TARGET",
        "ENHANCED_BY_INSTINCT",
        "STRENGTH_SCALING",
        "COMMAND_AUGMENTATION"
      ]
    },
    "trait": {
      "id": "arulix-champions-brilliance",
      "dragonId": "arulix",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Arulix is deployed in Vanguard: increase Arulix Strength by +15, Intelligence by +15, and Instinct by +15. Reduce Damage Received of the Right Flank ally by -8%. The self stat increases are self-only; the Right Flank reduction is outward defensive support.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Arulix Champion's Brilliance screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "arulix-champions-brilliance-2026-07-15"
      ],
      "tags": [
        "STRENGTH_UP",
        "INTELLIGENCE_UP",
        "INSTINCT_UP",
        "DAMAGE_RECEIVED_DOWN",
        "VANGUARD_REQUIRED",
        "RIGHT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "arulix-hypnotic-helix",
        "dragonId": "arulix",
        "kind": "habit",
        "name": "Hypnotic Helix",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Rounds 1, 3, 6, and 8: chance to apply Overwhelm to 1 enemy in any lane for 2 rounds, prioritizing Fire Damage dealers. Overwhelm prevents Active Commands and Habits on the target's turn.\n\nRounds 2, 4, 7, and 9: chance to apply Stagger to 1 enemy in any lane for 2 rounds, prioritizing Physical Damage dealers. Stagger prevents Attack Modifier Commands and Basic Attacks on the target's turn.\n\nThe prose displays the Habit Level 1 chance rounded to 13%; the progression table gives 12.5%. Both values are retained.\n\nProgression table (Overwhelm/Stagger chance):\nHabit Level 1: 12.5%\nHabit Level 2: 15%\nHabit Level 3: 17.5%\nHabit Level 4: 21.3%\nHabit Level 5: 25%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arulix Hypnotic Helix screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arulix-hypnotic-helix-2026-07-15"
        ],
        "tags": [
          "OVERWHELM",
          "STAGGER",
          "CONTROL",
          "ANY_LANE_TARGET",
          "SPECIFIC_ROUNDS"
        ]
      },
      {
        "id": "arulix-battle-cunning",
        "dragonId": "arulix",
        "kind": "habit",
        "name": "Battle Cunning",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce Strength and Intelligence of the same 3 enemies in any lane. The effect is enhanced by Arulix's Instinct. This is direct enemy stat reduction, not a named status.\n\nProgression table (Strength and Intelligence reduction):\nHabit Level 1: -4%\nHabit Level 2: -4.8%\nHabit Level 3: -5.6%\nHabit Level 4: -6.8%\nHabit Level 5: -8%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arulix Battle Cunning screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arulix-battle-cunning-2026-07-15"
        ],
        "tags": [
          "DEBUFF_STRENGTH",
          "DEBUFF_INTELLIGENCE",
          "ENHANCED_BY_INSTINCT",
          "ANY_LANE_TARGET",
          "ENEMY_DEBUFF"
        ]
      },
      {
        "id": "arulix-spiral-surge",
        "dragonId": "arulix",
        "kind": "habit",
        "name": "Spiral Surge",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Spiral Surge augments Gleaming Spiral. Rounds 1, 2, 3, 5, and 8: deal Physical Damage to 2 enemies in any lane. Round 5 is 1.5× the current upgraded base rate; Round 8 is 2× the current upgraded base rate.\n\nProgression table (base Damage Rate):\nHabit Level 1: +20% (Round 5 +30%; Round 8 +40%)\nHabit Level 2: +24% (Round 5 +36%; Round 8 +48%)\nHabit Level 3: +28% (Round 5 +42%; Round 8 +56%)\nHabit Level 4: +34% (Round 5 +51%; Round 8 +68%)\nHabit Level 5: +40% (Round 5 +60%; Round 8 +80%)\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arulix Spiral Surge screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arulix-spiral-surge-2026-07-15"
        ],
        "tags": [
          "PHYSICAL_DAMAGE",
          "STRENGTH_SCALING",
          "SPECIFIC_ROUNDS",
          "ANY_LANE_TARGET",
          "COMMAND_AUGMENTATION"
        ]
      },
      {
        "id": "arulix-iron-shell",
        "dragonId": "arulix",
        "kind": "habit",
        "name": "Iron Shell",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce non-Basic-Attack Physical Damage Received and Fire Damage Received of the same 2 other allies in any lane. In a three-dragon formation, this targets both other formation members; no adjacency is required. The Physical protection excludes Basic Attacks; the Fire protection has no shown Basic-Attack exclusion.\n\nThe prose displays -2%; the Habit Level 1 table displays -2.5%. Both values are retained.\n\nProgression table (Damage Received reduction):\nHabit Level 1: -2.5%\nHabit Level 2: -3%\nHabit Level 3: -3.5%\nHabit Level 4: -4.25%\nHabit Level 5: -5%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arulix Iron Shell screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arulix-iron-shell-2026-07-15"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_RECEIVED_DOWN",
          "FIRE_DAMAGE_RECEIVED_DOWN",
          "EXCLUDES_BASIC_ATTACKS",
          "OTHER_ALLIES_TARGET",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "arulix-mimicry",
        "dragonId": "arulix",
        "kind": "habit",
        "name": "Mimicry",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "At the start of each round, evaluate two separate conditional branches.\n\nNegative-effect branch: if any ally is afflicted with Weakened or Vulnerable, chance to copy that same effect to 1 enemy in any lane for 2 rounds. The ally must itself be afflicted; merely applying Vulnerable to an enemy does not qualify.\n\nPositive-effect branch: if any enemy is enhanced by Advantage or Resistance, chance to copy that same effect to 1 ally in any lane for 2 rounds.\n\nBoth branches may be eligible in one round. Copied effects are not removed from the original target. Selection priority with multiple valid effects and exact branch resolution order are not stated. Mimicry is conditional and is not an unconditional source of Weakened, Vulnerable, Advantage, or Resistance.\n\nProgression table (Mimicry chance):\nHabit Level 1: 25%\nHabit Level 2: 32.5%\nHabit Level 3: 40%\nHabit Level 4: 50%\nHabit Level 5: 62.5%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arulix Mimicry screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arulix-mimicry-2026-07-15"
        ],
        "tags": [
          "CONDITIONAL_STATUS_COPY",
          "ANY_LANE_TARGET"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "TACTICAL_DAMAGE",
      "PHYSICAL_DAMAGE",
      "DAMAGE_DEALT_DOWN",
      "FIRE_DAMAGE_DEALT_DOWN",
      "EXCLUDES_BASIC_ATTACKS",
      "SPECIFIC_ROUNDS",
      "ANY_LANE_TARGET",
      "ENHANCED_BY_INSTINCT",
      "STRENGTH_SCALING",
      "COMMAND_AUGMENTATION",
      "STRENGTH_UP",
      "INTELLIGENCE_UP",
      "INSTINCT_UP",
      "DAMAGE_RECEIVED_DOWN",
      "VANGUARD_REQUIRED",
      "RIGHT_FLANK_TARGET",
      "OVERWHELM",
      "STAGGER",
      "CONTROL",
      "DEBUFF_STRENGTH",
      "DEBUFF_INTELLIGENCE",
      "ENEMY_DEBUFF",
      "PHYSICAL_DAMAGE_RECEIVED_DOWN",
      "FIRE_DAMAGE_RECEIVED_DOWN",
      "OTHER_ALLIES_TARGET",
      "CONDITIONAL_STATUS_COPY"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Arulix Gleaming Spiral screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Arulix Champion's Brilliance screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Arulix Habit screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "unknown",
        "source": "Affinity icons were not text-verified",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "nyrena",
    "slug": "nyrena",
    "name": "Nyrena",
    "rarity": "Rare",
    "breed": "Champion",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/nyrena/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "dawnseeker",
    "slug": "dawnseeker",
    "name": "Dawnseeker",
    "rarity": "Rare",
    "breed": "Sentinel",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/dawnseeker/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "official-metadata-only",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": null,
    "trait": null,
    "habits": [],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "arrax",
    "slug": "arrax",
    "name": "Arrax",
    "rarity": "Rare",
    "breed": "Warrior",
    "officialProfileUrl": "https://gotdragonfire.com/dragons/arrax/",
    "rosterSourceStatus": "official-website",
    "firstObservedInGame": null,
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-15",
    "notes": "Affinity icons were not text-verified and remain unknown.",
    "command": {
      "id": "arrax-sudden-strike",
      "dragonId": "arrax",
      "kind": "command",
      "name": "Sudden Strike",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 2, 4, 6, and 8: 25% chance to apply Weakened to 1 enemy within adjacency. Double the chance to 50% if the target is afflicted with Bleed. Weakened reduces the target's Damage Dealt by -10%.\n\nRounds 2, 4, 5, 6, and 8: deal Physical Damage to 2 enemies within adjacency at a +40% Damage Rate. Physical Damage is increased by the attacker's Strength and mitigated by the target's Instinct.\n\nThe Weakened target selection and Physical Damage target selection are independent. The screenshot does not state that the Weakened target must overlap a damaged target.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Arrax Sudden Strike screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "arrax-sudden-strike-2026-07-15"
      ],
      "tags": [
        "WEAKENED",
        "BLEED_PAYOFF",
        "PHYSICAL_DAMAGE",
        "ADJACENT_TARGET",
        "SPECIFIC_ROUNDS",
        "STRENGTH_SCALING",
        "DAMAGE_DEALT_DOWN"
      ]
    },
    "trait": {
      "id": "arrax-warriors-resilience",
      "dragonId": "arrax",
      "kind": "trait",
      "name": "Warrior's Resilience",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Dragon Level 16+ while Arrax is deployed in Vanguard: reduce Arrax Damage Received by -8%. Increase Tactical Damage Dealt of the Left Flank ally by +16%. The Damage Received reduction is self-only.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Arrax Warrior's Resilience screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "evidenceIds": [
        "arrax-warriors-resilience-2026-07-15"
      ],
      "tags": [
        "DAMAGE_RECEIVED_DOWN",
        "TACTICAL_DAMAGE_UP",
        "LEFT_FLANK_TARGET",
        "VANGUARD_REQUIRED"
      ]
    },
    "habits": [
      {
        "id": "arrax-headlong-into-danger",
        "dragonId": "arrax",
        "kind": "habit",
        "name": "Headlong into Danger",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 4 for 4 rounds: increase Arrax Strength by +25%, Initiative by +10%, and Physical Damage Dealt by +25%. Also increase Arrax Physical Damage Received and reduce Arrax Instinct. All effects are self-only. The penalties are not Vulnerable or Weakened. At Habit Level 5 the displayed penalties become zero while the positive effects remain.\n\nProgression table (Physical Damage Received; Instinct):\nHabit Level 1: +10%; -40%\nHabit Level 2: +8%; -32%\nHabit Level 3: +6%; -24%\nHabit Level 4: +3%; -12%\nHabit Level 5: 0%; 0%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arrax Headlong into Danger screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arrax-headlong-into-danger-2026-07-15"
        ],
        "tags": [
          "STRENGTH_UP",
          "BUFF_INITIATIVE",
          "PHYSICAL_DAMAGE_UP",
          "PHYSICAL_DAMAGE_RECEIVED_UP",
          "DEBUFF_INSTINCTS",
          "BUFF_SELF"
        ]
      },
      {
        "id": "arrax-stone-bulwark",
        "dragonId": "arrax",
        "kind": "habit",
        "name": "Stone Bulwark",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat until end of combat: reduce Tactical Damage Received and Fire Damage Received of the same 2 other allies in any lane. In a three-dragon formation, this targets both other formation members; no adjacency is required.\n\nThe prose displays -2%; the Habit Level 1 table displays -2.5%. Both values are retained.\n\nProgression table (Tactical and Fire Damage Received):\nHabit Level 1: -2.5%\nHabit Level 2: -3%\nHabit Level 3: -3.5%\nHabit Level 4: -4.25%\nHabit Level 5: -5%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arrax Stone Bulwark screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arrax-stone-bulwark-2026-07-15"
        ],
        "tags": [
          "TACTICAL_DAMAGE_RECEIVED_DOWN",
          "FIRE_DAMAGE_RECEIVED_DOWN",
          "OTHER_ALLIES_TARGET",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "arrax-adaptive-guard",
        "dragonId": "arrax",
        "kind": "habit",
        "name": "Adaptive Guard",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "When leading Archers, at the start of Round 4 reduce Tactical Damage Received of 3 allies in any lane for 4 rounds. When leading Shieldbearers, at the start of Round 4 reduce Fire Damage Received of 3 allies in any lane for 4 rounds. These are separate troop-gated branches. Formation Builder has no selected troop context, so neither branch is treated as active or scored and neither creates a utilization penalty.\n\nProgression table (Damage Received reduction):\nHabit Level 1: -9%\nHabit Level 2: -10.8%\nHabit Level 3: -12.6%\nHabit Level 4: -15.3%\nHabit Level 5: -18%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arrax Adaptive Guard screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arrax-adaptive-guard-2026-07-15"
        ],
        "tags": [
          "TACTICAL_DAMAGE_RECEIVED_DOWN",
          "FIRE_DAMAGE_RECEIVED_DOWN",
          "TROOP_TYPE_CONDITION",
          "BUFF_ALLIES",
          "ANY_LANE_TARGET"
        ]
      },
      {
        "id": "arrax-fire-ward",
        "dragonId": "arrax",
        "kind": "habit",
        "name": "Fire Ward",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of combat: grant Arrax 1 stack of Fire Ward and grant 1 other adjacent ally 1 stack of Fire Ward. Start of each round, if the selected target ally retreated in the previous round, grant Arrax 1 additional stack of Fire Ward. Each stack reduces Fire Damage Received and lasts until end of combat. The maximum stack count is not stated; no cap is inferred. The ally receives the initial stack, while subsequent retreat-triggered stacks are granted to Arrax. Fire Ward is a named beneficial status and is not offensive Fire Damage support.\n\nProgression table (Fire Damage Received per stack):\nHabit Level 1: -5%\nHabit Level 2: -6%\nHabit Level 3: -7%\nHabit Level 4: -8.5%\nHabit Level 5: -10%\n\nPower: 250 / 550 / 900 / 1300 / 1800",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arrax Fire Ward screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arrax-fire-ward-2026-07-15"
        ],
        "tags": [
          "FIRE_WARD",
          "FIRE_DAMAGE_RECEIVED_DOWN",
          "ADJACENT_TARGET",
          "OTHER_ALLIES_TARGET"
        ]
      },
      {
        "id": "arrax-turn-the-line",
        "dragonId": "arrax",
        "kind": "habit",
        "name": "Turn the Line",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Round 4 for 4 rounds: increase Physical Damage Received of 2 enemies within adjacency. This is direct typed Physical Damage Received amplification, not the named Vulnerable status.\n\nProgression table (Physical Damage Received):\nHabit Level 1: +9%\nHabit Level 2: +11.7%\nHabit Level 3: +14.4%\nHabit Level 4: +18%\nHabit Level 5: +22.5%\n\nPower: 250 / 580 / 1000 / 1600 / 2300",
        "verification": {
          "status": "screenshot-verified",
          "source": "Arrax Turn the Line screenshot",
          "capturedAt": "2026-07-15",
          "gameVersion": null,
          "reviewedManually": true
        },
        "evidenceIds": [
          "arrax-turn-the-line-2026-07-15"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_RECEIVED_UP",
          "ADJACENT_TARGET",
          "ENEMY_DEBUFF"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "unknown",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "WEAKENED",
      "BLEED_PAYOFF",
      "PHYSICAL_DAMAGE",
      "ADJACENT_TARGET",
      "SPECIFIC_ROUNDS",
      "STRENGTH_SCALING",
      "DAMAGE_DEALT_DOWN",
      "DAMAGE_RECEIVED_DOWN",
      "TACTICAL_DAMAGE_UP",
      "LEFT_FLANK_TARGET",
      "VANGUARD_REQUIRED",
      "STRENGTH_UP",
      "BUFF_INITIATIVE",
      "PHYSICAL_DAMAGE_UP",
      "PHYSICAL_DAMAGE_RECEIVED_UP",
      "DEBUFF_INSTINCTS",
      "BUFF_SELF",
      "TACTICAL_DAMAGE_RECEIVED_DOWN",
      "FIRE_DAMAGE_RECEIVED_DOWN",
      "OTHER_ALLIES_TARGET",
      "ANY_LANE_TARGET",
      "TROOP_TYPE_CONDITION",
      "BUFF_ALLIES",
      "FIRE_WARD",
      "ENEMY_DEBUFF"
    ],
    "fieldVerification": {
      "identity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "rarity": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "breed": {
        "status": "officially-confirmed",
        "source": "Official public roster page",
        "capturedAt": "2026-06-23",
        "gameVersion": null,
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Arrax Sudden Strike screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Arrax Warrior's Resilience screenshot",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Arrax Habit screenshots",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      },
      "affinities": {
        "status": "unknown",
        "source": "Affinity icons were not text-verified",
        "capturedAt": "2026-07-15",
        "gameVersion": null,
        "reviewedManually": true
      }
    }
  },
  {
    "id": "tessarion",
    "slug": "tessarion",
    "name": "Tessarion",
    "rarity": "Epic",
    "breed": "Champion",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-07-10",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-07-10",
    "notes": null,
    "command": {
      "id": "tessarion-cobalt-flame",
      "dragonId": "tessarion",
      "kind": "command",
      "name": "Cobalt Flame",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Rounds 1, 4, 7: Deal Fire Damage to 1 Enemy in any lane, prioritizes targets that deals Physical Damage, excluding Basic Attacks, Damage Rate: +95%. Additionally, 50% chance to reduce the target's Damage Dealt by -10% for 2 round(s). Double this effect (-20%) if the target deals Physical Damage, excluding Basic Attacks.\n\nRounds 3, 6, 9: Deal Physical Damage to 1 Enemy in the same lane, Damage Rate: +60%.\n\nFire Damage:\nDeal Fire Damage to the target. Fire Damage is increased by the attacker's Intelligence and mitigated by the target's Initiative.\n\nDamage Dealt Modifier:\nModify the target's Damage Dealt by -10%.\n\nPhysical Damage:\nDeal Physical Damage to the target. Physical Damage is increased by the attacker's Strength and mitigated by the target's Instinct.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Tessarion Cobalt Flame screenshots",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "tessarion-cobalt-flame-page-1-2026-07-10",
        "tessarion-cobalt-flame-fire-details-2026-07-10",
        "tessarion-cobalt-flame-physical-details-2026-07-10"
      ],
      "tags": [
        "FIRE_DAMAGE",
        "PHYSICAL_DAMAGE",
        "DAMAGE_DEALT_DOWN",
        "ANY_LANE_TARGET",
        "SAME_LANE_TARGET",
        "INTELLIGENCE_SCALING",
        "STRENGTH_SCALING"
      ]
    },
    "trait": {
      "id": "tessarion-champions-brilliance",
      "dragonId": "tessarion",
      "kind": "trait",
      "name": "Champion's Brilliance",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in the Vanguard, Increase your Strength, Intelligence, and Instinct by +15. Reduce Damage Received by -8% of the Ally deployed in the Right Flank.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Tessarion Champion's Brilliance screenshot",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "tessarion-champions-brilliance-2026-07-10"
      ],
      "tags": [
        "STRENGTH_UP",
        "INTELLIGENCE_UP",
        "INSTINCT_UP",
        "DAMAGE_RECEIVED_DOWN",
        "VANGUARD_REQUIRED",
        "RIGHT_FLANK_TARGET"
      ]
    },
    "habits": [
      {
        "id": "tessarion-sharpened-beauty",
        "dragonId": "tessarion",
        "kind": "habit",
        "name": "Sharpened Beauty",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Each Round: Increase your Physical and Fire Damage Dealt by +8.4% until the end of the round. Double these effects (+16.8%) if you are above 75% Troop Capacity or if you have Advantage.\n\nProgression table:\nHabit Level 1: Physical and Fire Damage Dealt +7%\nHabit Level 2: +8.4%\nHabit Level 3: +9.8%\nHabit Level 4: +11.9%\nHabit Level 5: +14%",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tessarion Sharpened Beauty screenshot",
          "capturedAt": "2026-07-10",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "tessarion-sharpened-beauty-2026-07-10"
        ],
        "tags": [
          "PHYSICAL_DAMAGE_UP",
          "FIRE_DAMAGE_UP",
          "ADVANTAGE",
          "TROOP_CAPACITY_CONDITION",
          "BUFF_SELF"
        ]
      },
      {
        "id": "tessarion-blazing-leader",
        "dragonId": "tessarion",
        "kind": "habit",
        "name": "Blazing Leader",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase the Fire Damage Dealt by +10% of 1 Ally in any lane, prioritizes the Left Flank, until the end of combat.\n\nProgression table:\nHabit Level 1: Fire Damage Dealt +10%\nHabit Level 2: +12%\nHabit Level 3: +14%\nHabit Level 4: +17%\nHabit Level 5: +20%",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tessarion Blazing Leader screenshot",
          "capturedAt": "2026-07-10",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "tessarion-blazing-leader-2026-07-10"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "ANY_LANE_TARGET",
          "LEFT_FLANK_TARGET"
        ]
      },
      {
        "id": "tessarion-molten-armor",
        "dragonId": "tessarion",
        "kind": "habit",
        "name": "Molten Armor",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Odd-numbered Rounds: 25% chance to increase your Fire Damage Dealt by +12% and reduce Physical Damage Received by -12% of 2 other Allies in any lane. If you are afflicted with Panic, also apply the reduced Physical Damage Received effect to yourself. Each effect lasts for 2 round(s).\n\nProgression table:\nHabit Level 1: Molten Armor Chance 25%\nHabit Level 2: 30%\nHabit Level 3: 35%\nHabit Level 4: 42.5%\nHabit Level 5: 50%",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tessarion Molten Armor screenshot",
          "capturedAt": "2026-07-10",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "tessarion-molten-armor-2026-07-10"
        ],
        "tags": [
          "FIRE_DAMAGE_UP",
          "DAMAGE_RECEIVED_DOWN",
          "PANIC",
          "ANY_LANE_TARGET",
          "BUFF_SELF"
        ]
      },
      {
        "id": "tessarion-clever-maneuver",
        "dragonId": "tessarion",
        "kind": "habit",
        "name": "Clever Maneuver",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: Increase Intelligence by +18% and Initiative by +9% of the Ally with the highest Intelligence until the end of combat. Both effects are enhanced by Instinct.\n\nProgression table:\nHabit Level 1: Intelligence +18%; Initiative +9%\nHabit Level 2: Intelligence +21.6%; Initiative +10.8%\nHabit Level 3: Intelligence +25.2%; Initiative +12.6%\nHabit Level 4: Intelligence +30.6%; Initiative +15.3%\nHabit Level 5: Intelligence +36%; Initiative +18%",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tessarion Clever Maneuver screenshot",
          "capturedAt": "2026-07-10",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "tessarion-clever-maneuver-2026-07-10"
        ],
        "tags": [
          "INTELLIGENCE_UP",
          "BUFF_INITIATIVE",
          "ENHANCED_BY_INSTINCT",
          "HIGHEST_INTELLIGENCE_TARGET"
        ]
      },
      {
        "id": "tessarion-the-blue-queen",
        "dragonId": "tessarion",
        "kind": "habit",
        "name": "The Blue Queen",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Odd-numbered Rounds: 40% chance to reduce the Damage Received by -10% and increase the Intelligence, enhanced by Intelligence, by +15% of 1 other Ally in any lane that deals Fire Damage for 2 round(s). If you are above 75% Troop Capacity, double the Damage Received reduction (-20%) and Intelligence increase (+30%).\n\nProgression table:\nHabit Level 1: The Blue Queen Chance 40%\nHabit Level 2: 52%\nHabit Level 3: 64%\nHabit Level 4: 80%\nHabit Level 5: 100%",
        "verification": {
          "status": "screenshot-verified",
          "source": "Tessarion The Blue Queen screenshot",
          "capturedAt": "2026-07-10",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "tessarion-the-blue-queen-2026-07-10"
        ],
        "tags": [
          "INTELLIGENCE_UP",
          "DAMAGE_RECEIVED_DOWN",
          "FIRE_DAMAGE_ALLY_TARGET",
          "TROOP_CAPACITY_CONDITION",
          "ANY_LANE_TARGET"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "unknown",
      "Archers": "unknown",
      "Spearmen": "positive",
      "Siege": "positive"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "FIRE_DAMAGE",
      "PHYSICAL_DAMAGE",
      "DAMAGE_DEALT_DOWN",
      "ANY_LANE_TARGET",
      "SAME_LANE_TARGET",
      "INTELLIGENCE_SCALING",
      "STRENGTH_SCALING",
      "STRENGTH_UP",
      "INTELLIGENCE_UP",
      "INSTINCT_UP",
      "DAMAGE_RECEIVED_DOWN",
      "VANGUARD_REQUIRED",
      "RIGHT_FLANK_TARGET",
      "PHYSICAL_DAMAGE_UP",
      "FIRE_DAMAGE_UP",
      "ADVANTAGE",
      "TROOP_CAPACITY_CONDITION",
      "BUFF_SELF",
      "LEFT_FLANK_TARGET",
      "PANIC",
      "BUFF_INITIATIVE",
      "ENHANCED_BY_INSTINCT",
      "HIGHEST_INTELLIGENCE_TARGET",
      "FIRE_DAMAGE_ALLY_TARGET"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Tessarion main screen screenshot",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Tessarion Cobalt Flame screenshots",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Tessarion Champion's Brilliance screenshot",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Tessarion Habit screenshots",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Tessarion main screen screenshot",
        "capturedAt": "2026-07-10",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "sheepstealer",
    "slug": "sheepstealer",
    "name": "Sheepstealer",
    "rarity": "Legendary",
    "breed": "Hunter",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "sheepstealer-wild-hunt",
      "dragonId": "sheepstealer",
      "kind": "command",
      "name": "Wild Hunt",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "Each Round: if no enemy is currently marked as Prey, 40% chance to apply Prey. Rounds 1, 4, 7, and 10: deal Fire Damage to one enemy, prioritizing Prey. Damage is doubled against Prey.\n\nAt 10 Stars:\n\nEach round while Sheepstealer has a current Prey: deal Fire Damage to Prey at a 24% rate and apply Recovery to Sheepstealer at a 10% rate, enhanced by Dragon Level and Intelligence.\n\nIf the current Prey received Recovery during the previous round, both rates are tripled to 72% Fire Damage and 30% Recovery.\n\nStar Rank 10 augmentation:\nAt 10 Stars, Savage Claim augments Wild Hunt while Sheepstealer has a Prey.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Sheepstealer Wild Hunt summary/glossary screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "sheepstealer-wild-hunt-summary-2026-06-23",
        "sheepstealer-wild-hunt-glossary-2026-06-23",
        "sheepstealer-wild-hunt-recovery-priority-combat-log-2026-06-24"
      ],
      "tags": [
        "FIRE_DAMAGE",
        "PREY",
        "RECOVERY_RECEIVED_DOWN"
      ]
    },
    "trait": {
      "id": "sheepstealer-hunters-cunning",
      "dragonId": "sheepstealer",
      "kind": "trait",
      "name": "Hunter's Cunning",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard, increase self Recovery Received +20%, self Intelligence +25, and Right Flank ally Physical Damage Dealt +10%.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Sheepstealer Hunter's Cunning screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "sheepstealer-hunters-cunning-2026-06-23"
      ],
      "tags": [
        "VANGUARD_REQUIRED",
        "RECOVERY_RECEIVED_UP",
        "FIRE_DAMAGE_UP",
        "PHYSICAL_DAMAGE_UP"
      ]
    },
    "habits": [
      {
        "id": "sheepstealer-stolen-flock",
        "dragonId": "sheepstealer",
        "kind": "habit",
        "name": "Stolen Flock",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "PvE Fire Damage bonus and Stolen Flock stacks from each round or when Prey receives Recovery.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Sheepstealer Stolen Flock screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "sheepstealer-stolen-flock-2026-06-23"
        ],
        "tags": [
          "STOLEN_FLOCK",
          "FIRE_DAMAGE_UP"
        ]
      },
      {
        "id": "sheepstealer-dragons-cunning",
        "dragonId": "sheepstealer",
        "kind": "habit",
        "name": "Dragon's Cunning",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: increase self Intelligence and reduce Instinct of two enemies within adjacency, enhanced by Initiative.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Sheepstealer Dragon's Cunning screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "sheepstealer-dragons-cunning-2026-06-23"
        ],
        "tags": [
          "DEBUFF_INSTINCTS",
          "ADJACENT_TARGET"
        ]
      },
      {
        "id": "sheepstealer-baited-kill",
        "dragonId": "sheepstealer",
        "kind": "habit",
        "name": "Baited Kill",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Each Round: apply Vulnerable to Prey, doubled chance if Prey received Recovery last round; cleanse Sheepstealer if Prey is above 50% Troop Capacity.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Sheepstealer Baited Kill screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "sheepstealer-baited-kill-2026-06-23"
        ],
        "tags": [
          "VULNERABLE",
          "CLEANSE_POSITIVE"
        ]
      },
      {
        "id": "sheepstealer-wary-beast",
        "dragonId": "sheepstealer",
        "kind": "habit",
        "name": "Wary Beast",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Each Round: if Prey is above 50% Troop Capacity gain Evade. Start of Combat reduce Recovery Received of three enemies.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Sheepstealer Wary Beast screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "sheepstealer-wary-beast-2026-06-23"
        ],
        "tags": [
          "EVADE",
          "RECOVERY_RECEIVED_DOWN"
        ]
      },
      {
        "id": "sheepstealer-savage-claim",
        "dragonId": "sheepstealer",
        "kind": "habit",
        "name": "Savage Claim",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Augments Wild Hunt: each round while Sheepstealer has Prey, deal Fire Damage to Prey and apply Recovery to Sheepstealer; triple both if Prey received Recovery previous round.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Sheepstealer Savage Claim screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "sheepstealer-savage-claim-2026-06-23"
        ],
        "tags": [
          "COMMAND_AUGMENTATION",
          "FIRE_DAMAGE",
          "RECOVERY"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Archers": "positive",
      "Shieldbearers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "FIRE_DAMAGE",
      "PREY",
      "RECOVERY_RECEIVED_DOWN",
      "VANGUARD_REQUIRED",
      "RECOVERY_RECEIVED_UP",
      "FIRE_DAMAGE_UP",
      "PHYSICAL_DAMAGE_UP",
      "STOLEN_FLOCK",
      "DEBUFF_INSTINCTS",
      "ADJACENT_TARGET",
      "VULNERABLE",
      "CLEANSE_POSITIVE",
      "EVADE",
      "COMMAND_AUGMENTATION",
      "RECOVERY"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Sheepstealer main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Sheepstealer Wild Hunt screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Sheepstealer Hunter's Cunning screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Sheepstealer Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Sheepstealer main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  },
  {
    "id": "vermax",
    "slug": "vermax",
    "name": "Vermax",
    "rarity": "Epic",
    "breed": "Warrior",
    "officialProfileUrl": null,
    "rosterSourceStatus": "in-game-verified-pending-official-site",
    "firstObservedInGame": "2026-06-22",
    "gameVersion": null,
    "isNew": true,
    "dataStatus": "community-verified",
    "lastVerified": "2026-06-23",
    "notes": null,
    "command": {
      "id": "vermax-spreading-blaze",
      "dragonId": "vermax",
      "kind": "command",
      "name": "Spreading Blaze",
      "abilityClass": "active",
      "unlockStarRank": null,
      "minimumDragonLevel": null,
      "positionRequirement": null,
      "rawDescription": "After each Basic Attack: deal Physical Damage to one enemy in the same lane (Damage Rate +50%). Additionally, 20% chance to grant one Spreading Blaze stack to one ally that deals Tactical Damage. Repeat this chance once if any enemy deals Fire Damage.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vermax Spreading Blaze summary/glossary screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vermax-spreading-blaze-summary-2026-06-23",
        "vermax-spreading-blaze-glossary-2026-06-23"
      ],
      "tags": [
        "PHYSICAL_DAMAGE",
        "SPREADING_BLAZE",
        "TACTICAL_DAMAGE"
      ]
    },
    "trait": {
      "id": "vermax-warriors-zeal",
      "dragonId": "vermax",
      "kind": "trait",
      "name": "Warrior's Zeal",
      "abilityClass": "passive",
      "unlockStarRank": 1,
      "minimumDragonLevel": 16,
      "positionRequirement": "vanguard",
      "rawDescription": "At Level 16+ and deployed in Vanguard, increase Vermax Physical Damage Dealt by 16%. Increase Instinct and Initiative of Left Flank ally by +20.",
      "verification": {
        "status": "screenshot-verified",
        "source": "Vermax Warrior's Zeal screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "evidenceIds": [
        "vermax-warriors-zeal-2026-06-23",
        "vermax-warriors-zeal-basic-attack-combat-log-2026-06-24"
      ],
      "tags": [
        "VANGUARD_REQUIRED",
        "PHYSICAL_DAMAGE_UP",
        "INSTINCT_UP",
        "BUFF_INITIATIVE"
      ]
    },
    "habits": [
      {
        "id": "vermax-trial-by-flame",
        "dragonId": "vermax",
        "kind": "habit",
        "name": "Trial by Flame",
        "abilityClass": "passive",
        "unlockStarRank": 2,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Each Round: reduce Fire Damage Received for allies below strict Troop Capacity thresholds until end of current round.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vermax Trial by Flame screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vermax-trial-by-flame-2026-06-23"
        ],
        "tags": [
          "FIRE_DAMAGE_RECEIVED_DOWN",
          "RESISTANCE",
          "DAMAGE_RECEIVED_DOWN"
        ]
      },
      {
        "id": "vermax-reactive-instincts",
        "dragonId": "vermax",
        "kind": "habit",
        "name": "Reactive Instincts",
        "abilityClass": "passive",
        "unlockStarRank": 4,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: increase Instinct and Initiative of ally with highest Instinct, enhanced by Strength.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vermax Reactive Instincts screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vermax-reactive-instincts-2026-06-23"
        ],
        "tags": [
          "INSTINCT_UP",
          "BUFF_INITIATIVE"
        ]
      },
      {
        "id": "vermax-rallying-flame",
        "dragonId": "vermax",
        "kind": "habit",
        "name": "Rallying Flame",
        "abilityClass": "passive",
        "unlockStarRank": 6,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: gain Rallying Flame and grant Spreading Blaze, repeating once for each enemy that deals Fire Damage.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vermax Rallying Flame screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vermax-rallying-flame-2026-06-23"
        ],
        "tags": [
          "RALLYING_FLAME",
          "SPREADING_BLAZE"
        ]
      },
      {
        "id": "vermax-dragons-valor",
        "dragonId": "vermax",
        "kind": "habit",
        "name": "Dragon's Valor",
        "abilityClass": "passive",
        "unlockStarRank": 8,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Combat: reduce self Damage Received and increase Strength until end of combat.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vermax Dragon's Valor screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vermax-dragons-valor-2026-06-23"
        ],
        "tags": [
          "DAMAGE_RECEIVED_DOWN",
          "STRENGTH_UP"
        ]
      },
      {
        "id": "vermax-unyielding-resolve",
        "dragonId": "vermax",
        "kind": "habit",
        "name": "Unyielding Resolve",
        "abilityClass": "passive",
        "unlockStarRank": 10,
        "minimumDragonLevel": null,
        "positionRequirement": null,
        "rawDescription": "Start of Each Round: chance to grant Advantage +15% for two rounds. If afflicted with Weakend, chance is multiplied by 1.5 and successful activation removes Weakened.",
        "verification": {
          "status": "screenshot-verified",
          "source": "Vermax Unyielding Resolve screenshot",
          "capturedAt": "2026-06-23",
          "gameVersion": "26.6.53509",
          "reviewedManually": true
        },
        "evidenceIds": [
          "vermax-unyielding-resolve-2026-06-23"
        ],
        "tags": [
          "ADVANTAGE",
          "WEAKENED"
        ]
      }
    ],
    "affinities": {
      "Cavalry": "positive",
      "Shieldbearers": "positive",
      "Archers": "unknown",
      "Spearmen": "unknown",
      "Siege": "unknown"
    },
    "stats": {
      "strength": null,
      "intelligence": null,
      "instinct": null,
      "initiative": null
    },
    "tags": [
      "PHYSICAL_DAMAGE",
      "SPREADING_BLAZE",
      "TACTICAL_DAMAGE",
      "VANGUARD_REQUIRED",
      "PHYSICAL_DAMAGE_UP",
      "INSTINCT_UP",
      "BUFF_INITIATIVE",
      "FIRE_DAMAGE_RECEIVED_DOWN",
      "RESISTANCE",
      "DAMAGE_RECEIVED_DOWN",
      "RALLYING_FLAME",
      "STRENGTH_UP",
      "ADVANTAGE",
      "WEAKENED"
    ],
    "fieldVerification": {
      "identity": {
        "status": "screenshot-verified",
        "source": "Vermax main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "command": {
        "status": "screenshot-verified",
        "source": "Vermax Spreading Blaze screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "trait": {
        "status": "screenshot-verified",
        "source": "Vermax Warrior's Zeal screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "habits": {
        "status": "screenshot-verified",
        "source": "Vermax Habit screenshots",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      },
      "affinities": {
        "status": "partially-screenshot-verified",
        "source": "Vermax main screen screenshot",
        "capturedAt": "2026-06-23",
        "gameVersion": "26.6.53509",
        "reviewedManually": true
      }
    }
  }
] satisfies Dragon[];
