# Battle Authoring (Schema)

The engine consumes two related shapes:

- **Encounter definitions** (authored in Creator / content packs): enemies, rules, and scripted events. Player party is **not** authored on encounters.
- **Runtime battle definitions** (built at deploy): encounter + deployed player units, validated with full `validateBattleDefinition`.

## EncounterDefinition (authored)

Required:
- `id: string`
- `name: string`
- `enemyUnits: UnitDefinition[]` **or** `enemyUnitIds` / wave `enemyUnitIds` resolvable to units

Optional:
- `description: string`
- `rules: EncounterRules`

Player units are chosen in the Characters screen (team presets) and merged at launch via `buildRuntimeBattleDefinition(encounter, playerUnitIds)`.

## BattleDefinition (runtime)

Required:
- `id: string`
- `name: string`
- `playerUnits: UnitDefinition[]` (at least one at runtime)
- `enemyUnits: UnitDefinition[]`

Legacy compatibility:
- `hero` → treated as `playerUnits: [hero]`
- `enemy` → treated as `enemyUnits: [enemy]`

## EncounterRules

Optional:
- `encounterType: "focused" | "unfocused"` (default: `"focused"`)
- `maxTurns: number` (default: `100`)
- `maxPlayerUnits: number` (optional deploy cap for player party subset)
- `victoryCondition: string` (default: `"defeat-all-enemies"`)
- `failureCondition: string` (default: `"all-allies-defeated"`)
- `enemyAiProfile: string | { skill?: string; target?: string }`
  - `skill`: `"cycle" | "random" | "first"`
  - `target`: `"mirror" | "firstLiving" | "lowestHp" | "random"`

## UnitDefinition

Required:
- `id: string`
- `name: string`
- `maxHp: number`
- `speedRange: [number, number]`
- `sprites: { idle: string; moving?: string; hurt?: string; guard?: string; evade?: string; skills?: Record<string,string> }`
- `skills: SkillDefinition[]`

Optional:
- `level: number`
- `sp: number`
- `defenseLevel: number`
- `staggerThresholds: number[]`
- `resistances: Resistances`
- `passives: PassiveDefinition[]`

## Resistances

- `resistances.physical.slash|pierce|blunt` → multiplier (default: `1`)
- `resistances.sin.wrath|lust|sloth|gluttony|gloom|pride|envy` → multiplier (default: `1`)

## SkillDefinition

Required:
- `id: string`
- `name: string`
- `basePower: number`
- `coinPower: number`
- `coinCount: number`

Optional:
- `skillType: "attack" | "guard" | "evade" | "counter"` (default: `"attack"`)
- `damageType: "slash" | "pierce" | "blunt"`
- `sinType: "wrath" | "lust" | "sloth" | "gluttony" | "gloom" | "pride" | "envy"`
- `offenseLevel: number`
- `attackWeight: number` (multi-target weight; default `1`)
- `borderPath: string`
- `description: string`
- `showInPlanner: boolean` (set `false` for follow-up-only skills)
- `skillSlot: string` (planner groups variants into one slot)
- `variantPriority: number` (higher priority wins when multiple variants match)
- `variantConditions: HookCondition[]` (all must pass for this variant to be active in planner)
- `ammo: { statusId: string; countCost?: number; potencyCost?: number; randomCost?: number; cancelIfInsufficient?: boolean }`
- `effects: EffectDefinition[]`

### Skill effect phases (Creator moveset sheet)

Group flat `effects[]` by `trigger` when authoring:

| Trigger | When it runs |
|---------|----------------|
| `onSelect` | Combat start / skill selected (before coins) |
| `onUse` | Skill is committed (grants sin resource + runs effects) |
| `onClashWin` / `onClashLose` | After clash resolution |
| `onHit` + `coinIndex: N` | When coin N hits |
| `onAttackEnd` | After attack finishes |

Optional per-effect filters: `coinIndex`, `criticalOnly`, `headsOnly`, `tailsOnly`, `outcome`, `minStatusPotency`.

## EffectDefinition

Base fields:
- `trigger: "onSelect" | "onUse" | "onHit" | "onClashWin" | "onClashLose" | "onAttackEnd"`
- `type: string`

Common optional filters:
- `coinIndex?: number`
- `criticalOnly?: boolean`
- `headsOnly?: boolean`
- `tailsOnly?: boolean`
- `minStatusPotency?: number` (uses `statusId` + `statusSource`)
- `statusSource?: "self" | "opponent"`
- `outcome?: "win" | "lose"`
- `target?: "self" | "opponent"`

Supported `type` values (current):
- `applyStatus`
- `queueStatus`
- `adjustSanity`
- `healHp`
- `adjustStatus`
- `modifyContext`
- `modifyCoinMap`
- `setFollowUpSkill`
- `modifyPhysicalResistance`
- `modifySinResistance`
- `modifyDefenseLevel`
- `modifyOffenseLevel`
- `modifySpeed`
- `gainShield`
- `clearShield`
- `retargetSlot`
- `burstTremor`
- `consumeStatus`
- `adjustEncounterResource`

Selected effect notes:
- most numeric effect bodies can now use either:
  - `value: number`
  - `amount: number | { statusPotency: { statusId, target? }, multiplier? } | { statusCount: { statusId, target? }, multiplier? }`
  - `amount` also supports `{ product: [AmountDefinition, AmountDefinition, ...] }` for status-scaling formulas
- `healHp`
  - `value: number`
- `adjustStatus`
  - `statusId: string`
  - `potencyDelta?: number`
  - `countDelta?: number`
- `modifyContext`
  - `operation: "add" | "set" | "addStatusPotencyScaled" | "addStatusCountScaled" | "setToOneMinusStatusPotencyScaled" | "setToOnePlusStatusCountScaled" | "addSpeedDifferenceScaled"`
  - `addSpeedDifferenceScaled` uses `(source speed - target speed) * multiplier`, optionally gated by `minDifference` and capped by `cap`
- `modifyOffenseLevel`
  - `value?: number`
  - `amount?: AmountDefinition`
- `modifyPhysicalResistance`
  - `damageType: "slash" | "pierce" | "blunt"`
  - `value: number`
  - `operation?: "multiplyBase" | "multiplyCurrent"`
- `modifySinResistance`
  - `sinType: "wrath" | "lust" | "sloth" | "gluttony" | "gloom" | "pride" | "envy"`
  - `value: number`
  - `operation?: "multiplyBase" | "multiplyCurrent"`
- `modifySpeed`
  - `value?: number`
  - `amount?: AmountDefinition`
  - `operation?: "add" | "set"`
- `gainShield`
  - `shieldId: string`
  - `value?: number`
  - `amount?: AmountDefinition`
  - `operation?: "add" | "set"`
  - `stackSize?: number`
  - `expiresAt?: "turnStart" | "turnEnd"`
  - `linkedStatusId?: string`
  - `linkedStatusCountDeltaOnBreak?: number`
- `clearShield`
  - `shieldId: string`
- `adjustEncounterResource`
  - `resourceId: string`
  - `value?: number`
  - `amount?: AmountDefinition`
  - `operation?: "add" | "set"`
  - `min?: number`
  - `max?: number`

Supported hook condition additions:
- `statusPotencyAtOrBelow`
- `statusCountAtOrBelow`
- `encounterResourceAtLeast`
- `encounterResourceAtOrBelow`
- `skillType`
- `eventStatusIdIs`
- `burstTremor`
  - defaults to the target's current `tremor` potency when no `value`/`amount` is provided
- `retargetSlot`
  - `selector: "sourceUnit" | "targetUnit" | "firstLivingOpponent" | "firstLivingAlly" | "mirrorOpponent"`
  - `lockTarget?: boolean`

## PassiveDefinition

Required:
- `id: string`
- `name: string`

Optional:
- `description: string`
- `requirements?: { owned?: boolean; resonance?: { sinType: string; minimum?: number } }` (resonance gates hook invocation)
- `hooks: Record<PassiveHookName, EffectDefinition[] | HookBlock | HookBlock[] | Function>`

Supported passive hook names (current):
- `battleStart`
- `turnStart`
- `beforeCoinRoll`
- `skillSelected`
- `statusApplied`
- `statusChanged`
- `statusExpired`
- `statusConsumed`
- `beforeStatusTrigger`
- `afterStatusTrigger`
- `beforeDamage`
- `afterDamage`
- `coinRoll`
- `afterCoinRoll`
- `hitDealt`
- `hitTaken`
- `damageDealt`
- `damageTaken`
- `statusInflicted`
- `statusReceived`
- `attackEnd`
- `turnEnd`
- `unitDefeated`
- `staggerThresholdCrossed` (scripted events may filter with optional `threshold` HP fraction, e.g. `0.75`)
- `staggerRecovered`
- `battleEnd`

Notes:
- Passive hook effect arrays use the same effect shape as skills, but the hook key replaces `trigger`.
- Hook blocks let authors group `conditions`, `actions`, and `oncePer` controls:

```js
{
  oncePer: 'turn',
  conditions: [
    { type: 'damageAtLeast', value: 1 }
  ],
  actions: [
    { type: 'adjustSanity', target: 'self', value: 5 }
  ]
}
```

- Supported hook condition types:
  - `always`
  - `damageAtLeast`
  - `hasStatus`
  - `statusPotencyAtLeast`
  - `statusCountAtLeast`
- `encounterResourceAtLeast`
- `encounterResourceAtOrBelow`
  - `skillSinType`
  - `skillDamageType`
  - `coinIndex`
  - `criticalHit`
  - `targetStaggered`
  - `hpPercentAtOrBelow`
  - `hpPercentAtOrAbove`
  - `spAtOrBelow`
  - `spAtOrAbove`
- Supported `oncePer` scopes:
  - `battle`
  - `turn`
  - `skill`
  - `coin`
- Example authoring patterns now used in shipped content:
  - `skillSelected` + `statusCountAtLeast` to reward self-buffs applied during `onSelect`
  - `skillSelected` + `spAtOrBelow` for low-SP conditionals
  - `hitDealt` + `damageAtLeast` for damage-triggered follow-up effects
  - `turnStart` + `hpPercentAtOrBelow` for low-HP survival passives
- Function hooks still work for JS-authored content, but data-driven hook effect arrays are the preferred authoring path.
