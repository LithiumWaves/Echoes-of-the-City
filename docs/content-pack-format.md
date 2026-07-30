# Content Pack Format (Data-only JSON)

This document describes the canonical JSON format for importing custom battle content as a **data-only** pack.

Data-only packs:
- Must be plain JSON (no functions).
- Are validated on import.
- Are persisted locally after import.

Trusted JavaScript packs live under `battle/content/packs/user/**` and can run code.

## Top-Level Shape

```json
{
  "manifest": { },
  "statuses": [ ],
  "units": [ ],
  "battles": [ ]
}
```

Any of `statuses`, `units`, or `battles` may be empty, but at least one should be present.

## Manifest

```json
{
  "id": "my-pack",
  "name": "My Pack",
  "version": "1.0.0",
  "engineVersion": "dev",
  "authors": ["You"],
  "description": "What this pack adds",
  "dependencies": ["some-other-pack"],
  "featureFlags": {
    "exampleFlag": true
  }
}
```

- `dependencies` entries can be either a string pack id, or `{ "id": "...", "version": "..." }`.

## Status Definitions

Statuses are validated via the status schema. Minimal example:

```json
{
  "id": "example_might",
  "label": "Example Might",
  "description": "For this turn: Attack skills gain +1 Final Power per Count. Expires at Turn End.",
  "countOnly": true,
  "stackModel": {
    "count": { "enabled": true, "min": 0, "max": 5, "application": "add" },
    "expireWhen": { "countLte": 0 }
  },
  "hooks": {
    "skillSelected": [
      {
        "conditions": [{ "type": "skillType", "value": "attack" }],
        "actions": [
          {
            "type": "modifyContext",
            "target": "self",
            "field": "flatPowerBonus",
            "operation": "addStatusCountScaled",
            "statusId": "example_might",
            "multiplier": 1
          }
        ]
      }
    ],
    "turnEnd": [
      { "actions": [{ "type": "consumeStatus", "target": "self", "statusId": "example_might" }] }
    ]
  }
}
```

## Unit Definitions

Units must include the required combat fields (`id`, `name`, HP, resistances, skills, sprites, etc.). Example:

```json
{
  "id": "example-soldier",
  "name": "Example Soldier",
  "level": 10,
  "maxHp": 120,
  "sp": 0,
  "speedRange": [2, 4],
  "defenseLevel": 10,
  "staggerThresholds": [0.5],
  "resistances": {
    "physical": { "slash": 1, "pierce": 1, "blunt": 1 },
    "sin": { "wrath": 1, "lust": 1, "sloth": 1, "gluttony": 1, "gloom": 1, "pride": 1, "envy": 1 }
  },
  "sprites": {
    "splash": "assets/roster/example-soldier-splash.png",
    "idle": "assets/debugsprites/Vergilius_Idle_Sprite.png",
    "moving": "assets/debugsprites/Vergilius_Moving_Sprite.png",
    "hurt": "assets/debugsprites/Vergilius_Hurt_Sprite.png",
    "guard": "assets/debugsprites/Vergilius_Guard_Sprite.png",
    "evade": "assets/debugsprites/Vergilius_Evade_Sprite.png",
    "skills": { "example-strike": "assets/debugsprites/Vergilius_Skill_1.gif" }
  },
  "skills": [
    {
      "id": "example-strike",
      "name": "Example Strike",
      "skillType": "attack",
      "basePower": 10,
      "coinPower": 2,
      "coinCount": 2,
      "damageType": "slash",
      "sinType": "wrath",
      "effects": [
        { "trigger": "onSelect", "type": "applyStatus", "target": "self", "statusId": "example_might", "count": 2 }
      ]
    }
  ],
  "passives": []
}
```

## Battle Definitions (Composed Packs)

For reusable packs, battles should reference **enemy** units by id using `enemyUnitIds` (player units come from team presets at deploy):

```json
{
  "id": "example-battle",
  "name": "Example Battle",
  "description": "A battle referencing units by id.",
  "enemyUnitIds": ["dongbaek"],
  "rules": {
    "encounterType": "focused",
    "maxTurns": 10,
    "maxPlayerUnits": 3,
    "victoryCondition": "defeat-all-enemies",
    "failureCondition": "all-allies-defeated",
    "enemyAiProfile": { "skill": "first", "target": "firstLiving" }
  }
}
```

## Examples

- `battle/content/packs/user/examples/minimal-pack.json`
- `battle/content/packs/user/examples/advanced-pack.json`
