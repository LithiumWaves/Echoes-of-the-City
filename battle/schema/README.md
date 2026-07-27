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
- `skillType: "attack" | "evade" | "counter"` (default: `"attack"`)
- `damageType: "slash" | "pierce" | "blunt"`
- `sinType: "wrath" | "lust" | "sloth" | "gluttony" | "gloom" | "pride" | "envy"`
- `offenseLevel: number`
- `borderPath: string`
- `description: string`
- `showInPlanner: boolean` (set `false` for follow-up-only skills)
- `effects: EffectDefinition[]`

## EffectDefinition

Base fields:
- `trigger: "onSelect" | "onHit" | "onClashWin" | "onClashLose" | "onAttackEnd"`
- `type: string`

Common optional filters:
- `coinIndex?: number`
- `criticalOnly?: boolean`
- `minStatusPotency?: number` (uses `statusId` + `statusSource`)
- `target?: "self" | "opponent"`

Supported `type` values (current):
- `applyStatus`
- `queueStatus`
- `adjustSanity`
- `modifyContext`
- `modifyCoinMap`
- `setFollowUpSkill`
- `modifyPhysicalResistance`
- `modifyDefenseLevel`
- `consumeStatus`

## PassiveDefinition

Required:
- `id: string`
- `name: string`

Optional:
- `description: string`
- `hooks: Record<string, Function>`

