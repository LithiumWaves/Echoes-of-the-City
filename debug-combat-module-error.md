# Debug Session: combat-module-error
- **Status**: [OPEN]
- **Issue**: Combat screen shows "Combat Module Error" after extracting battle logic into a separate script.
- **Debug Server**: Pending startup
- **Log File**: `.dbg/trae-debug-log-combat-module-error.ndjson`

## Reproduction Steps
1. Load the extension in the app.
2. Open the battle panel.
3. Switch to the combat screen from the tray.
4. Observe the "Combat Module Error" message.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | The battle module loads, but `createDebugBattleController()` throws during initialization. | High | Low | Pending |
| B | The battle module loads, but never exposes `window.EchoesOfTheCityBattle`. | Medium | Low | Pending |
| C | The controller is created, but the initial battle-state/render path throws immediately. | High | Low | Pending |
| D | An extracted helper still relies on state that existed only in `index.js`. | Medium | Medium | Pending |
| E | The load path succeeds, but controller delegation never completes because initialization aborts earlier. | Low | Low | Pending |

## Log Evidence
- Pending instrumentation and reproduction.

## Verification Conclusion
- Pending runtime evidence.
