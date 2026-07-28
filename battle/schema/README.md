# Battle Authoring (Schema)

This engine consumes a `BattleDefinition` object.

## BattleDefinition

Required:
- `id: string`
- `name: string`
- `playerUnits: UnitDefinition[]`
- `enemyUnits: UnitDefinition[]`

Optional:
- `description: string`
- `rules: EncounterRules`

Legacy compatibility:
- `hero` → treated as `playerUnits: [hero]`
- `enemy` → treated as `enemyUnits: [enemy]`

## EncounterRules

Optional:
- `encounterType: "focused" | "unfocused"` (default: `"focused"`)
- `maxTurns: number` (default: `100`)
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
- `borderPath: string`
- `description: string`
- `showInPlanner: boolean` (set `false` for follow-up-only skills)
- `ammo: { statusId: string; countCost?: number; potencyCost?: number; randomCost?: number; cancelIfInsufficient?: boolean }`
- `effects: EffectDefinition[]`

## EffectDefinition

Base fields:
- `trigger: "onSelect" | "onHit" | "onClashWin" | "onClashLose" | "onAttackEnd"`
- `type: string`

Common optional filters:
- `coinIndex?: number`
- `criticalOnly?: boolean`
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
