# Debug Session: combat-module-error
- **Status**: [OPEN]
- **Issue**: Combat screen shows "Combat Module Error" after extracting battle logic into a separate script.
- **Debug Server**: `http://127.0.0.1:7777/event`
- **Log File**: `.dbg/trae-debug-log-combat-module-error.ndjson`

## Reproduction Steps
1. Load the extension in the app.
2. Open the battle panel.
3. Switch to the combat screen from the tray.
4. Observe the "Combat Module Error" message.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The battle module loads, but `createDebugBattleController()` throws during initialization. | High | Low | Rejected |
| B | The battle module loads, but never exposes `window.EchoesOfTheCityBattle`. | Medium | Low | Rejected |
| C | The controller is created, but the initial battle-state/render path throws immediately. | High | Low | Confirmed |
| D | An extracted helper still relies on state that existed only in `index.js`. | Medium | Medium | Confirmed |
| E | The load path succeeds, but controller delegation never completes because initialization aborts earlier. | Low | Low | Confirmed as downstream effect |

## Log Evidence
- `pre-fix`: module fetch and eval succeed, and the controller factory is entered.
- `pre-fix`: `Cannot access 'battle' before initialization` is thrown from `pickEnemySkillId`.
- `post-fix change 1`: `pickEnemySkillId` now reads from the current battle object passed into turn start.
- `post-fix change 2`: startup logging now writes to the current battle object instead of the outer `battle` binding during first-state construction.

## Verification Conclusion
- Root cause chain so far: extracted startup helpers were still touching the outer controller-scoped `battle` binding during initial construction.
- First confirmed failure was fixed in `pickEnemySkillId`.
- Second confirmed startup dependency was fixed in `pushBattleLog`.
- Waiting on a fresh runtime reproduction to confirm the combat screen now initializes successfully or to capture the next failing step.
