(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createDebugBattleController(options) {
        const { mountElement, clamp, resolveAssetUrl } = options;
        const { debugFightTemplate, createDebugBattleEngine, createDebugBattleRenderer } = battleModules;

        if (!debugFightTemplate || typeof createDebugBattleEngine !== 'function' || typeof createDebugBattleRenderer !== 'function') {
            throw new Error('Battle modules are incomplete.');
        }

        const engine = createDebugBattleEngine({
            clamp,
            debugFightTemplate,
        });
        const renderer = createDebugBattleRenderer({
            mountElement,
            resolveAssetUrl,
        });

        function render() {
            renderer.render(engine.getState());
        }

        function handleClick(event) {
            const actionTarget = event.target.closest('[data-action]');
            if (!actionTarget) {
                return;
            }

            const {
                action,
                skillId,
                slotId,
                targetSlotId,
            } = actionTarget.dataset;
            if (action === 'select-slot' && slotId) {
                engine.selectSlot(slotId);
                render();
                return;
            }

            if (action === 'select-target' && slotId && targetSlotId) {
                engine.selectTarget(targetSlotId, slotId);
                render();
                return;
            }

            if (action === 'select-skill' && skillId) {
                engine.selectSkill(skillId, slotId);
                render();
                return;
            }

            if (action === 'resolve-turn') {
                engine.resolveTurn();
                render();
                return;
            }

            if (action === 'next-turn') {
                engine.advanceTurn();
                render();
                return;
            }

            if (action === 'reset-fight') {
                engine.reset();
                render();
            }
        }

        return {
            handleClick,
            render,
            reset() {
                engine.reset();
                render();
            },
        };
    }

    window.EchoesOfTheCityBattle = {
        createDebugBattleController,
    };
})();
