# Battle Sim Customization Roadmap

This document replaces the earlier phase plan with an updated assessment of the extension and a new roadmap toward a fully customizable Limbus Company-style battle engine.

## Current Assessment

The extension has moved well beyond the original debug prototype. It now has a generic combat launcher, a content registry, schema validation, JSON import/export, first-class status definitions, a dedicated damage formula module, and a broad data-driven hook/effect foundation. The remaining work is less about proving the architecture and more about making it complete, safe, testable, and usable by non-programmers.

### What Is Already in Good Shape

- **Generic launch flow:** battle core scripts and debug-only scripts are loaded separately, and the normal combat flow launches selected registered battles instead of always starting the old debug controller.
- **Content packs:** the repository has a base pack and user pack folders for battles, units, and statuses.
- **Registry coverage:** battles, units, aliases, statuses, and content packs can be registered, listed, imported, and exported.
- **Validation:** battle, unit, skill, passive, status, amount, condition, and hook-block definitions are validated before registration.
- **Status definitions:** statuses are now registered as content, can carry stack models and hooks, and applied status instances receive registered hooks/stack behavior.
- **Hook-driven passives/statuses:** hook blocks support conditions, actions, and `oncePer` limits, with lifecycle hooks for battle, turn, coin, damage, healing, status, attack, defeat, and battle-end events.
- **Damage formula:** damage calculation is isolated in `battle/core/damageFormula.js` and uses explicit static, dynamic, additive, floor, and minimum-damage terms.
- **Effect system breadth:** the effect runner supports many combat actions, including status application/adjustment/consumption, fixed damage, healing, sanity, resources, shields, resistance changes, offense/defense changes, speed changes, retargeting, follow-up skills, Tremor burst, and context/coin-map modifiers.
- **Starter content:** there are several shipped units, battles, and many base status definition modules.
- **Creator-adjacent UI:** the battle selector includes pasted/file JSON import and selected-battle/export-pack download actions.

### What Is Still Holding It Back

- **No true creator UI yet:** users can import/export JSON, but there is no guided editor for units, skills, passives, statuses, battles, or packs.
- **Status conversion is incomplete:** many statuses exist as registry/content definitions, but the engine still has special-case keyword logic that should be steadily replaced by reusable status hooks/actions.
- **Effect DSL is broad but uneven:** several Limbus mechanics can be represented, but missing or partial actions still block faithful recreation of many IDs/E.G.O.s.
- **Formula confidence is limited:** the damage formula is isolated and closer to the target shape, but needs fixtures, regression tests, and calibrated examples against known Limbus cases.
- **No automated test harness:** smoke-test files exist, but there is no clear project-wide command that verifies schemas, shipped content, formula behavior, effect ordering, or import/export round trips.
- **Customization safety needs policy:** trusted JavaScript content is still possible in code-authored packs, while user-imported content should remain data-only and should be explicitly constrained.
- **Battle mechanics are not complete:** focused/unfocused battle basics exist, but a full Limbus-like engine still needs better clash targeting, speed-slot behavior, defense skills, E.G.O/resource systems, sanity/panic details, stagger thresholds, abnormality-style encounters, passives, support passives, and win/failure rule extensibility.
- **Persistence/sharing is shallow:** imported content can be used at runtime, but there is no durable local library, pack manager, conflict-resolution UI, versioning, dependency metadata, or compatibility migration path.

## Updated Goal

Create a fully customizable Limbus Company battle engine where users can build, validate, playtest, save, import, export, and share custom battle content without writing JavaScript, while advanced/trusted authors can still extend the engine through code where appropriate.

The target authorable content types are:

1. Content packs and dependencies.
2. Units/identities and enemies.
3. Skills, defense skills, follow-up skills, and E.G.O.-like skills.
4. Passives and support passives.
5. Status effects and stack/lifecycle behavior.
6. Encounter rules, waves, resources, and scripted battle events.
7. Visual/audio metadata for battle presentation.
8. Test fixtures and validation previews.

## Roadmap

## Phase 1: Stabilize the Custom Content Contract

### Objective

Make the schema, registry, import/export format, and safety rules the stable foundation for all future creator work.

### Tasks

1. Define a versioned content-pack manifest with `id`, `name`, `version`, `engineVersion`, `authors`, `description`, `dependencies`, and feature flags.
2. Document the canonical JSON shapes for packs, battles, units, skills, passives, statuses, effects, conditions, amount expressions, assets, and encounter resources.
3. Separate **data-only user content** from **trusted JavaScript packs** in both validation and UI messaging.
4. Add import conflict handling: overwrite, rename, skip, and dependency-missing errors.
5. Persist imported packs in SillyTavern extension storage instead of only keeping them in memory.
6. Add migration hooks for older content-pack versions.
7. Provide sample minimal and advanced pack files in `battle/content/packs/user/` docs.

### Completion Criteria

- Users can import a pack, reload the client, and still select its battles.
- Exported packs can be imported again without data loss.
- Validation errors point to exact paths in the imported JSON.
- User-imported content cannot execute arbitrary JavaScript.

## Phase 2: Build an Automated Verification Harness

### Objective

Make changes safe before expanding the engine further.

### Tasks

1. Add a lightweight test runner that can execute engine modules in a browser-like or VM environment.
2. Add schema validation tests for every shipped battle, unit, skill, passive, status, and effect.
3. Add import/export round-trip tests for single battles and full packs.
4. Add damage formula fixtures for neutral, resisted, fatal, staggered, critical, protection, fragile, additive, and minimum-floor cases.
5. Add effect runner tests for conditions, once-per scopes, action ordering, target selectors, and lifecycle hooks.
6. Add regression tests for converted keyword statuses.
7. Wire tests into an obvious command documented in the README.

### Completion Criteria

- A single command verifies shipped content and core formula/effect behavior.
- New status/effect work can be covered by fixtures.
- The project has a clear pass/fail signal before releases.

## Phase 3: Finish Data-Driven Statuses

### Objective

Make statuses fully user-authored content and eliminate hard-coded keyword behavior where practical.

### Tasks

1. Audit every status still handled through engine-specific branches.
2. Convert Burn, Bleed, Rupture, Sinking, Poise, Tremor, Charge, Paralyze, Protection, Fragile, Haste, Bind, and common power/resistance statuses into reusable status hook/effect definitions.
3. Add any missing status actions needed by those conversions, such as conditional count decay, damage-after-hit, SP damage, panic-type behavior, Tremor conversion, and stack transfer/conversion.
4. Expand stack models with duration timing, count/potency decay rules, combined caps, unique-group rules, and replacement policies.
5. Add status tags so effects can clear/modify groups like `burn`, `bleed`, `ammo`, `buff`, `debuff`, `fragility`, or `protection`.
6. Show status definitions and hook summaries in the inspect UI.

### Completion Criteria

- Official-style keyword statuses are represented primarily as content definitions.
- A user can create a custom status with stack rules, hooks, icon, tags, and lifecycle behavior through JSON.
- Engine special cases are limited to unavoidable primitive mechanics.

## Phase 4: Complete the Effect, Condition, and Expression DSL

### Objective

Provide enough safe building blocks to recreate most identities, E.G.O.s, enemy gimmicks, and custom mechanics.

### Tasks

1. Add missing damage actions: percent HP damage, bonus damage adders, attack-weight scaling, shield interaction, damage caps, and damage redirection.
2. Add missing status actions: clear, copy, transfer, convert, multiply, split, consume by tag, and apply to random/all/highest/lowest targets.
3. Add coin actions: force heads/tails, reroll, reuse, break, add/remove coins, coin-specific power changes, and conditional coin reuse.
4. Add resource actions: sin resources, ammo families, encounter resources, per-unit resources, spend/gain checks, and UI display metadata.
5. Add control-flow actions: flags, counters, random branches, weighted choices, fail-fast conditions, and loop-prevention limits.
6. Expand conditions for speed comparison, resonance, owned resources, skill tags, target side, wave number, damage type, sin affinity, stagger state, panic state, and previous events.
7. Expand amount expressions with arithmetic, min/max/clamp/floor/ceil, status/resource references, HP/SP references, speed references, and event-field references.
8. Add user-facing previews that explain what a hook block will do.

### Completion Criteria

- Most non-unique Limbus-style effects can be represented without JavaScript.
- Effects remain deterministic, bounded, and validatable.
- Complex content can be inspected and debugged without reading source code.

## Phase 5: Deepen Core Battle Mechanics

### Objective

Move from a playable inspired simulator toward a faithful, customizable Limbus-like battle engine.

### Tasks

1. Refine clash resolution, one-sided attacks, unopposed attacks, redirects, and target-slot locking.
2. Implement richer speed-slot rules, attack weight, multi-target selection, and abnormality-style body-part targeting.
3. Complete attack/guard/evade/counter behavior, including reusable defense skills and defensive clash outcomes.
4. Expand sanity and panic systems with configurable panic types, corrosion-like behavior, SP healing/damage hooks, and E.G.O.-style costs.
5. Add sin resources and resonance/absolute-resonance checks.
6. Add stagger threshold configuration, stagger recovery, stagger damage interactions, and multi-threshold behavior.
7. Add waves, reinforcements, scripted encounter events, turn limits, custom victory/failure conditions, and encounter resources.
8. Calibrate the damage formula with verified fixtures and expose formula breakdowns in the inspect/debug UI.

### Completion Criteria

- Encounters can model focused, unfocused, abnormality, and scripted fights.
- Defense skills, E.G.O.-like skills, resources, sanity, stagger, and targeting are content-configurable.
- Formula and event breakdowns make battle outcomes explainable.

## Phase 6: Build the Creator UI

### Objective

Let non-programmers create and modify battle content safely.

### Tasks

1. Add a content library screen with installed packs, imported packs, validation status, dependencies, and export/delete controls.
2. Add form editors for units, skills, statuses, passives, battles, encounter rules, resources, and assets.
3. Add a block-based hook builder:

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

4. Add validation previews beside each editor section.
5. Add playtest-from-editor launch controls.
6. Add cloning tools for shipped units/statuses/skills as starting templates.
7. Add asset pickers for sprites, status icons, skill borders, sound effects, and music.
8. Add import/export flows that preserve pack metadata and dependencies.

### Completion Criteria

- A non-programmer can create a unit, status, passive, and battle without hand-writing JSON.
- Invalid content is blocked with readable errors.
- Created content can be playtested immediately and exported as a pack.

## Phase 7: Improve Presentation and Debugging Tools

### Objective

Make custom battles understandable, attractive, and easy to debug.

### Tasks

1. Add battle log filtering by unit, status, trigger, damage event, and resource event.
2. Add formula breakdown panels for each hit.
3. Add hook/effect trace output for advanced debugging.
4. Add animation timing metadata for custom skills and defense actions.
5. Add UI support for multiple allies/enemies, body parts, waves, resources, and pack-provided assets.
6. Add a battle replay/export debug bundle for bug reports.
7. Add accessibility controls for reduced motion, readable logs, and contrast.

### Completion Criteria

- Authors can understand why an effect did or did not trigger.
- Players can read battle outcomes without inspecting raw data.
- Custom assets and multi-unit battles are presented cleanly.

## Phase 8: Content Library and Compatibility

### Objective

Prepare the engine for long-term content sharing and maintenance.

### Tasks

1. Add pack dependency resolution and compatibility warnings.
2. Add pack signatures/checksums or at least stable IDs for safe sharing.
3. Add import migration reports when engine schema versions change.
4. Add official sample packs for common archetypes: Burn, Bleed, Rupture, Sinking, Poise, Charge, Tremor, ammo, solo boss, multi-wave fight, and abnormality fight.
5. Add localization-ready labels/descriptions.
6. Add documentation for authors and maintainers.
7. Add a changelog policy for engine/schema changes.

### Completion Criteria

- Shared packs declare their dependencies and expected engine version.
- Older packs can be migrated or rejected with clear reasons.
- Authors have examples for the major archetypes.

## Recommended Implementation Order

1. **Verification harness first:** tests are the highest-leverage next step because the core architecture is already evolving quickly.
2. **Persistent, versioned content packs:** imported custom content should survive reloads before a full creator UI is built.
3. **Finish keyword status conversion:** this proves the hook/effect DSL can replace hard-coded behavior.
4. **Fill DSL gaps discovered by status conversion:** add only the primitives needed by real mechanics, then document them.
5. **Deepen battle mechanics:** targeting, defense skills, sanity, resources, stagger, waves, and scripted encounters.
6. **Creator UI:** build forms and block editing once the data contract is stable.
7. **Presentation/debugging:** formula breakdowns, hook traces, logs, assets, and replay bundles.
8. **Pack ecosystem:** dependencies, migrations, examples, compatibility policy, and sharing guidance.

## Best Immediate Next Step

The best next development task is:

> Add an automated validation and regression test harness for the existing schema, shipped content, damage formula, and hook/effect runner.

The previous roadmap's immediate blocker, first-class status registration with hooks and stack models, is now largely implemented. Testing should come next so the remaining status conversions, DSL additions, and battle-mechanics work can proceed without breaking the customization foundation.
