# Battle Sim Customization Plan

This document summarizes the current architecture discussion and the proposed roadmap for turning the current debug battle prototype into a fully customizable Limbus Company-style battle simulator.

## Current State

The project already has the beginnings of a generic battle system:

- The battle handler can accept a `battleDefinition`, validate it, and pass it into the engine.
- The engine can build player and enemy teams from `battleDefinition.playerUnits` and `battleDefinition.enemyUnits`, with legacy fallback support for `hero` and `enemy`.
- The content registry can register battle definitions, unit definitions, aliases, and defaults.
- The schema already describes reusable battle, unit, skill, effect, and passive definitions.

However, the app is still debug-first:

- The combat UI currently launches a Debug Battle screen.
- The main app path still calls `createDebugBattleController()`.
- Debug scripts are loaded as part of the normal combat module list.
- The debug fight is registered as the default battle.
- Some engine internals still use debug-oriented names such as `createDebugBattleState()` and `startDebugBattleTurn()`.

In short: the engine is becoming generic, but the app still boots through the debug battle path.

## Goal

Build a system where users can:

1. Create or import custom units.
2. Create custom skills.
3. Create custom passives.
4. Create custom status effects.
5. Create custom battles and encounters.
6. Select and run those battles through the normal combat UI.
7. Share, export, and import creations.
8. Eventually approximate Limbus Company battle mechanics closely enough to feel like a real simulator.

## Phase 1: Separate Debug Battle from the General Battle Engine

### Objective

Make the debug battle just one selectable test encounter, not the default or only combat path.

### Tasks

1. Add a generic battle launch path that calls `createBattleHandler({ battleDefinition })` directly.
2. Add a battle selector that lists registered battle definitions.
3. Stop registering the debug fight as the normal default battle.
4. Split core battle scripts from debug-only scripts.
5. Rename debug-named engine internals:
   - `createDebugBattleState()` -> `createBattleState()`
   - `startDebugBattleTurn()` -> `startBattleTurn()`

### Completion Criteria

- A battle can launch without `createDebugBattleController()`.
- The debug fight is selectable content, not the whole combat mode.
- Debug roll tools are optional or dev-only.
- Engine naming no longer implies the engine is debug-only.

## Phase 2: Make Battle Content Truly Data-Driven

### Objective

Let battles, units, and skills be authored as reusable content rather than hard-coded debug files.

### Tasks

1. Create a predictable content-pack structure, such as:

   ```text
   battle/content/packs/
     base/
       units/
       statuses/
       battles/
     user/
       units/
       statuses/
       battles/
   ```

2. Add JSON import/export support for:
   - units
   - skills
   - passives
   - statuses
   - battles
   - full content packs

3. Add validation before registration.
4. Show user-facing validation errors instead of only throwing initialization errors.

### Completion Criteria

- Users can import a custom JSON battle.
- The app validates custom content before launch.
- Valid custom battles can be launched.
- Invalid content shows readable errors.

## Phase 3: Correct the Damage Formula Toward Real Limbus

### Objective

Replace the current simplified multiplicative damage calculation with a closer Limbus-style formula.

### Reference

The actual Limbus Company damage formula reference discussed in this session is:

- <https://limbuscompany.wiki.gg/wiki/Damage_Formula>

### Current Sim Formula

The current implementation is effectively:

```text
damage = round(
  finalPower
  * physicalResistance
  * sinResistance
  * levelModifier
  * protectionModifier
  * damageMultiplier
  * critDamageMultiplier
  * incomingReduction
)
```

with a minimum damage value of `1`.

The current offense/defense modifier is shaped like:

```text
1 + (offenseLevel - defenseLevel) / (abs(offenseLevel - defenseLevel) + 25)
```

This captures some Limbus-like ideas, but it is not accurate enough for a serious simulator.

### Main Differences from Real Limbus

1. Physical resistance and sin resistance are currently multiplied directly.
2. Offense/defense advantage is currently a standalone multiplier.
3. Critical damage is currently a standalone `1.2x` multiplier.
4. The current formula uses rounding instead of flooring.
5. The current minimum damage floor is only `1`.
6. Additive damage categories are not explicitly represented.
7. Clash/parry round bonuses are not represented in the formula.
8. Observation-level-style modifiers are not represented.

### Target Formula Shape

Move toward an explicit static/dynamic/additive formula structure:

```js
const staticMultiplier =
    physicalResistanceContribution
    + sinResistanceContribution
    + offenseDefenseAdvantage
    + clashRoundBonus
    + criticalContribution
    + observationBonus;

const dynamicMultiplier =
    damageUpDown
    + fragileProtection
    + passiveSkillDamageModifiers;

const scaledDamage =
    coinRoll
    * Math.max(1 + staticMultiplier, 0)
    * (1 + dynamicMultiplier);

const finalDamage = Math.max(
    1,
    Math.floor(Math.max(
        scaledDamage + additiveDamage,
        coinRoll * 0.05,
    )),
);
```

### Tasks

1. Move damage calculation into a dedicated module such as `battle/core/damageFormula.js`.
2. Pass a structured damage context into the formula.
3. Replace direct multiplicative physical/sin resistance stacking.
4. Move offense/defense advantage into the static multiplier bucket.
5. Move critical damage into the static multiplier bucket.
6. Replace `Math.round()` with `Math.floor()`.
7. Add the `max(1, 5% of coin roll)` minimum damage floor.
8. Add explicit additive damage support.
9. Add damage formula hooks for passives and statuses.

### Completion Criteria

- Damage calculation is isolated and testable.
- Formula terms are explicit.
- Existing battles still work.
- Damage output is closer to Limbus.
- Passives and statuses can modify damage without hacky context mutation.

## Phase 4: Make Passives Fully Customizable

### Objective

Allow users to create passives through safe data definitions rather than arbitrary JavaScript.

### Recommended Passive Model

```js
{
  id: 'revenge-breathing',
  name: 'Revenge Breathing',
  description: 'When hit, gain +1 Coin Power next turn. Once per turn.',
  hooks: {
    hitTaken: [
      {
        oncePer: 'turn',
        conditions: [
          { type: 'damageAtLeast', value: 1 }
        ],
        actions: [
          {
            type: 'queueStatus',
            target: 'self',
            statusId: 'plus_coin_boost',
            count: 1
          }
        ]
      }
    ]
  }
}
```

### Tasks

1. Evolve flat effect arrays into trigger blocks with:
   - `conditions`
   - `actions`
   - `oncePer` or trigger limits

2. Add condition evaluation, including examples like:
   - has status
   - status potency/count threshold
   - skill sin type
   - skill damage type
   - HP/SP threshold
   - coin index
   - critical hit
   - target staggered

3. Add once-per controls:
   - once per coin
   - once per skill
   - once per turn
   - once per battle

4. Add safe numeric expressions so effects can scale from statuses, HP, SP, speed, or other values.
5. Keep JavaScript hooks developer-only or trusted-content-only.

### Completion Criteria

- A user can create a passive without writing JavaScript.
- Passives support conditions.
- Passives support trigger limits.
- Passives can modify coins, damage, statuses, targeting, healing, speed, and resources.
- Passives can be validated and previewed.

## Phase 5: Make Status Effects Fully Customizable

### Objective

Make statuses first-class user-authored content with stack rules, hooks, icons, and behavior.

### Current Problem

Statuses are currently mostly fixed registry entries with labels/icons/count-only flags. Runtime status application creates simple status instances with `id`, `potency`, and `count`. Some status behavior, such as Burn, Bleed, Rupture, Sinking, Poise, and Paralyze, is hard-coded in the engine.

The engine already checks status hooks if they exist, but applied statuses do not currently receive hooks from registered status definitions.

### Recommended Status Model

```js
{
  id: 'burn',
  name: 'Burn',
  description: 'At turn end, take fixed damage equal to Potency, then lose 1 Count.',
  iconPath: 'assets/statuseffects/keywordstatus/Burn.png',

  stackModel: {
    potency: {
      enabled: true,
      min: 0,
      max: 99,
      application: 'add'
    },
    count: {
      enabled: true,
      min: 0,
      max: 99,
      application: 'add'
    },
    expireWhen: {
      countLte: 0
    }
  },

  hooks: {
    turnEnd: [
      {
        actions: [
          {
            type: 'dealFixedDamage',
            target: 'self',
            amount: {
              statusPotency: {
                target: 'self',
                statusId: 'burn'
              }
            }
          },
          {
            type: 'adjustStatus',
            target: 'self',
            statusId: 'burn',
            countDelta: -1
          }
        ]
      }
    ]
  }
}
```

### Tasks

1. Add status content registration:
   - `registerStatusDefinition()`
   - `getStatusDefinition()`
   - `listStatusDefinitions()`

2. Make validation aware of custom status definitions.
3. Modify `applyStatus()` so new status instances include registered status hooks and stack models.
4. Convert hard-coded statuses into data-driven status definitions.
5. Add status lifecycle hooks:
   - status applied
   - status changed
   - status expired
   - status consumed
   - before status trigger
   - after status trigger
   - before coin roll
   - after coin roll
   - before damage
   - after damage

### Completion Criteria

- Users can define new statuses with custom stack rules.
- Users can define what statuses do at specific timings.
- Official statuses are implemented through the same system as custom statuses.
- Hard-coded status behavior in the engine is minimized or removed.

## Phase 6: Expand the Effect System

### Objective

Give users enough building blocks to recreate most Limbus-style skills, passives, and statuses.

### Existing Effect Types

The current effect system already supports useful actions such as applying statuses, queueing statuses, adjusting sanity, healing, adjusting statuses, modifying context, modifying coin maps, setting follow-up skills, modifying resistances, modifying defense level, modifying speed, retargeting, and consuming statuses.

### Recommended New Effect Actions

#### Damage Actions

- `dealFixedDamage`
- `dealPercentHpDamage`
- `addAttackAdder`
- `addAttackHpAdder`
- `modifyDamageStatic`
- `modifyDamageDynamic`

#### Status Actions

- `clearStatus`
- `copyStatus`
- `transferStatus`
- `convertStatus`
- `multiplyStatusPotency`
- `multiplyStatusCount`
- `clearStatusesByTag`

#### Coin and Skill Actions

- `addFinalPower`
- `addClashPower`
- `addCoinPower`
- `forceHeads`
- `forceTails`
- `rerollCoin`
- `reuseCoin`
- `breakCoin`

#### Resource Actions

- `gainResource`
- `spendResource`
- `setResource`

#### Control-Flow Actions

- `setFlag`
- `clearFlag`
- `incrementCounter`
- `consumeFlag`

#### Targeting Actions

- `redirectAttack`
- `forceTarget`
- `protectAlly`
- `taunt`

### Completion Criteria

- Most Limbus-like identity and E.G.O. effects can be represented as data.
- Users can create interesting custom content without code.
- The schema can validate all effect blocks.

## Phase 7: Build a User-Facing Creator

### Objective

Make custom content creation accessible to users who do not want to write JSON manually.

### Recommended UI

Use a block-based editor:

```text
WHEN: Hit Dealt
IF:
  - Target has Burn Potency at least 6
  - Coin Index is 2
DO:
  - Apply Burn 2/1 to target
  - Gain Poise 1/1
LIMIT:
  - Once per skill
```

Internally, the editor should save as JSON.

### Editor Sections

1. Unit editor
2. Skill editor
3. Passive editor
4. Status editor
5. Battle editor
6. Content-pack import/export screen

### Completion Criteria

- A non-programmer can create a custom unit.
- A non-programmer can create a custom status.
- A non-programmer can create a custom passive.
- The result can be played immediately.
- The content can be exported and imported.

## Phase 8: Add Tests and Validation Coverage

### Objective

Keep the simulator maintainable as customization grows.

### Test Areas

#### Schema Validation Tests

- battle definitions
- unit definitions
- skill definitions
- passive definitions
- status definitions
- effect definitions
- conditions
- expressions

#### Damage Formula Tests

- neutral damage
- resisted damage
- fatal damage
- offense/defense advantage
- crits
- Protection and Fragile-style modifiers
- additive damage
- minimum damage floor

#### Effect Runner Tests

- condition matching
- target selectors
- once-per limits
- status hook execution
- passive hook execution
- action ordering
- loop prevention

#### Content Tests

- all shipped units validate
- all shipped statuses validate
- all shipped battles validate

### Completion Criteria

- Formula changes are safe.
- Custom content is validated.
- New effect actions are covered.
- Status/passive hooks are predictable.

## Recommended Implementation Order

### Milestone 1: Real Battle Selection

1. Add generic battle start flow.
2. Add battle list/select UI.
3. Make debug battle just one listed battle.
4. Split debug scripts from core scripts.
5. Rename debug-named engine internals.

### Milestone 2: Damage Formula Refactor

1. Move damage calculation into its own module.
2. Implement Limbus-style static/dynamic/additive formula buckets.
3. Switch rounding to floor.
4. Add minimum damage floor.
5. Add formula tests.

### Milestone 3: First-Class Status Definitions

1. Add status definition registry.
2. Add status schema validation.
3. Make `applyStatus()` attach hooks and stack models.
4. Convert Burn into a data-driven status.
5. Convert Bleed, Rupture, Sinking, Poise, and Paralyze.

### Milestone 4: Passive and Status Scripting DSL

1. Add conditions.
2. Add actions.
3. Add once-per rules.
4. Add expression values.
5. Add richer selectors.

### Milestone 5: Creator UI

1. Build JSON import/export first.
2. Add simple form editors.
3. Add block-based effect builder.
4. Add validation previews.
5. Add a battle playtest button.

## Final Recommended Architecture

```text
BattleDefinition
  ├─ playerUnits[]
  ├─ enemyUnits[]
  └─ rules

UnitDefinition
  ├─ stats
  ├─ resistances
  ├─ skills[]
  └─ passives[]

SkillDefinition
  ├─ coin data
  ├─ damage/sin data
  └─ effects[]

PassiveDefinition
  └─ hooks[event] -> TriggerBlock[]

StatusDefinition
  ├─ stackModel
  ├─ icon/label
  └─ hooks[event] -> TriggerBlock[]

TriggerBlock
  ├─ conditions[]
  ├─ actions[]
  └─ limits

Action
  ├─ type
  ├─ target selector
  └─ values / expressions
```

## Best Immediate Next Step

The best next development task is:

> Add first-class `StatusDefinition` registration and make `applyStatus()` attach status hooks from registered definitions.

This is the most important customization unlock because passives are already close to data-driven, while statuses are still mostly hard-coded. Once this exists, Burn can be converted into the first proof-of-concept data-driven status.
