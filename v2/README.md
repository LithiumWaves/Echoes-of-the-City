# Echoes of the City — v2

A from-scratch rewrite. The old extension (repo root) stays in place until v2
is playable inside SillyTavern; the manifest still points at the old code.

## Layout

```
v2/
  core/          Pure combat simulation (no DOM, seeded, deterministic)
    battle.js      turn flow, clash pairing, clashes, one-sided attacks, stagger, panic
    damage.js      wiki damage formula
    effects.js     hook dispatch + action interpreter (shared by ALL content)
    expr.js        data-only value / condition language
    statuses.js    status stack bookkeeping
    units.js       unit definition -> runtime state
    ai.js          enemy skill/target selection, player auto-plan
    validate.js    path-addressed validation for custom content
    constants.js   sins, damage types, tunable rule numbers
  content/       Built-in content, written in the same format users author
  tests/         node --test suites
```

Run tests: `cd v2 && npm test` (Node 20+).

## Roadmap

1. **Combat core** (done): Speed per slot, deck of 3/2/1 skill copies with 2 choices
   per slot, clash pairing (mutual targets, speed redirects), coin-by-coin clashes,
   heads chance = 50 + SP, one-sided attacks with accumulating coin power, wiki damage
   formula, stagger thresholds / Stagger levels, panic, Sin Resonance and Absolute
   Resonance, E.G.O. resources, Guard / Evade / Counter, Unbreakable coins.
2. **Battle presentation**: Limbus-style screen that plays back the event stream.
3. **Creator**: forms generated from the content format with live validation and a
   "test this skill" sandbox.
4. **SillyTavern integration**: switch the manifest to v2, chat hooks.

## Content format (short version)

A unit:

```js
{
  id: 'bladeFixer', name: 'Blade Fixer', level: 45,
  hp: { base: 72, perLevel: 2.4 },          // or maxHp: 180
  speed: [4, 7], slots: 1,                   // enemies may have several slots
  stagger: [0.6, 0.3],                       // thresholds as % of max HP
  resist: { slash: 1, pierce: 1.5, blunt: 0.75, wrath: 1 },
  skills: [ /* rank 1, 2, 3 attack skills, then defense / E.G.O. */ ],
  passives: [ { name: 'Momentum', hooks: [ ... ] } ],
}
```

A skill: `{ name, sin, damageType, basePower, coinPower, coins: [{}, {unbreakable: true}],
offenseMod, kind: 'attack'|'guard'|'evade'|'counter', hooks: [...] }`.
E.G.O. skills add `egoCost: { wrath: 2 }` and `sanityCost`.

Hooks are either triggers or stat modifiers:

```js
{ on: 'headsHit', do: [{ apply: 'bleed', potency: 2, count: 1 }] }
{ modify: 'clashPower', value: 2, if: { has: 'bleed', of: 'target', min: 3 } }
```

See `core/effects.js` for the trigger, stat and action lists, and `core/expr.js`
for values and conditions. Statuses are defined the same way: see `content/statuses.js`.
