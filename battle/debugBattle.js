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
        let dragAssignment = null;

        function clearDropTargetState() {
            if (!mountElement) {
                return;
            }

            mountElement
                .querySelectorAll('.echoes-battle-panel__combat-unit--drop-target.is-drop-hover')
                .forEach((element) => element.classList.remove('is-drop-hover'));
            mountElement.classList.remove('is-dragging-skill');
        }

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

        function handleDragStart(event) {
            const skillElement = event.target.closest('[data-drag-skill="true"]');
            if (!skillElement || skillElement.hasAttribute('disabled')) {
                return;
            }

            dragAssignment = {
                slotId: skillElement.dataset.slotId,
                skillId: skillElement.dataset.skillId,
            };
            mountElement?.classList.add('is-dragging-skill');
            skillElement.classList.add('is-dragging');
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', JSON.stringify(dragAssignment));
            }
        }

        function handleDragOver(event) {
            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            dropTarget.classList.add('is-drop-hover');
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'move';
            }
        }

        function handleDragEnter(event) {
            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            dropTarget.classList.add('is-drop-hover');
        }

        function handleDragLeave(event) {
            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget) {
                return;
            }

            const relatedTarget = event.relatedTarget;
            if (relatedTarget && dropTarget.contains(relatedTarget)) {
                return;
            }

            dropTarget.classList.remove('is-drop-hover');
        }

        function handleDrop(event) {
            const dropTarget = event.target.closest('[data-drop-target="enemy-slot"]');
            if (!dropTarget || !dragAssignment) {
                return;
            }

            event.preventDefault();
            const { slotId, skillId } = dragAssignment;
            const destinationSlotId = dropTarget.dataset.targetSlotId;
            clearDropTargetState();
            dragAssignment = null;

            if (!slotId || !skillId || !destinationSlotId) {
                return;
            }

            engine.selectSlot(slotId);
            engine.selectSkill(skillId, slotId);
            engine.selectTarget(destinationSlotId, slotId);
            render();
        }

        function handleDragEnd() {
            clearDropTargetState();
            dragAssignment = null;
            mountElement
                ?.querySelectorAll('.echoes-battle-panel__combat-skill.is-dragging')
                .forEach((element) => element.classList.remove('is-dragging'));
        }

        return {
            handleClick,
            handleDragStart,
            handleDragOver,
            handleDragEnter,
            handleDragLeave,
            handleDrop,
            handleDragEnd,
            render,
            reset() {
                dragAssignment = null;
                clearDropTargetState();
                engine.reset();
                render();
            },
        };
    }

    window.EchoesOfTheCityBattle = {
        createDebugBattleController,
    };
})();
