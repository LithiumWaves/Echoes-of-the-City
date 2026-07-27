(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createEffectExecutor(deps) {
        const {
            getStatusPotency,
            getStatus,
            removeStatus,
            applyStatus,
            queueStatusForNextTurn,
            adjustSanity,
            emitEvent,
            invokeHooks,
        } = deps || {};

        function getRuntimeSourceUnit(runtime) {
            return runtime?.sourceUnit || runtime?.unit || null;
        }

        function getRuntimeTargetUnit(runtime) {
            return runtime?.targetUnit || runtime?.opponent || null;
        }

        function getEffectTargetUnit(runtime, target = 'opponent') {
            if (target === 'self') {
                return getRuntimeSourceUnit(runtime);
            }

            if (target === 'opponent') {
                return getRuntimeTargetUnit(runtime);
            }

            return null;
        }

        function getEffectStatusPotency(runtime, effect) {
            if (typeof getStatusPotency !== 'function') {
                return 0;
            }

            const targetUnit = getEffectTargetUnit(runtime, effect.statusSource || 'self');
            if (!targetUnit || !effect.statusId) {
                return 0;
            }

            return getStatusPotency(targetUnit, effect.statusId);
        }

        function applyEffects(targetBattle, effects, runtime) {
            (Array.isArray(effects) ? effects : []).forEach((effect) => {
                const sourceUnit = getRuntimeSourceUnit(runtime);
                const targetUnit = getEffectTargetUnit(runtime, effect.target || 'opponent');
                const context = runtime.attackContext || runtime.defendContext || null;
                const skill = runtime?.skill || null;

                switch (effect.type) {
                case 'applyStatus':
                    if (!targetUnit || !effect.statusId || typeof applyStatus !== 'function') {
                        return;
                    }
                    applyStatus(targetBattle, targetUnit, effect.statusId, {
                        potency: effect.potency,
                        count: effect.count,
                    });
                    if (sourceUnit && typeof invokeHooks === 'function') {
                        invokeHooks(sourceUnit, 'statusInflicted', {
                            battle: targetBattle,
                            unit: sourceUnit,
                            opponent: targetUnit,
                            skill,
                            statusId: effect.statusId,
                        });
                    }
                    if (typeof invokeHooks === 'function') {
                        invokeHooks(targetUnit, 'statusReceived', {
                            battle: targetBattle,
                            unit: targetUnit,
                            opponent: sourceUnit,
                            skill,
                            statusId: effect.statusId,
                        });
                    }
                    return;
                case 'queueStatus':
                    if (!targetUnit || !effect.statusId || typeof queueStatusForNextTurn !== 'function') {
                        return;
                    }
                    queueStatusForNextTurn(targetUnit, effect.statusId, {
                        potency: effect.potency,
                        count: effect.count,
                    });
                    return;
                case 'adjustSanity':
                    if (!targetUnit || typeof adjustSanity !== 'function') {
                        return;
                    }
                    {
                        const sanityChange = adjustSanity(targetUnit, effect.value || 0);
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'sanity_changed', {
                                unitName: targetUnit.name,
                                previousSp: sanityChange.previousSp,
                                nextSp: sanityChange.nextSp,
                                reason: effect.reason || skill.name,
                            });
                        }
                    }
                    return;
                case 'modifyContext':
                    if (!context || !effect.field) {
                        return;
                    }
                    if (effect.operation === 'add') {
                        context[effect.field] = (context[effect.field] || 0) + (effect.value || 0);
                        return;
                    }
                    if (effect.operation === 'addStatusPotencyScaled') {
                        const potency = getEffectStatusPotency(runtime, effect);
                        const magnitude = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, potency * (effect.multiplier || 1))
                            : potency * (effect.multiplier || 1);
                        context[effect.field] = (context[effect.field] || 0) + ((effect.direction === 'subtract' ? -1 : 1) * magnitude);
                        return;
                    }
                    if (effect.operation === 'setToOneMinusStatusPotencyScaled') {
                        const potency = getEffectStatusPotency(runtime, effect);
                        const reduction = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, potency * (effect.multiplier || 0))
                            : potency * (effect.multiplier || 0);
                        context[effect.field] = 1 - reduction;
                    }
                    return;
                case 'modifyCoinMap':
                    if (!context || !effect.field || typeof effect.coinIndex !== 'number') {
                        return;
                    }
                    if (!context[effect.field]) {
                        context[effect.field] = {};
                    }
                    context[effect.field][effect.coinIndex] = (context[effect.field][effect.coinIndex] || 0) + (effect.value || 0);
                    return;
                case 'setFollowUpSkill':
                    if (context && effect.skillId) {
                        context.followUpSkillIdOnClashLose = effect.skillId;
                    }
                    return;
                case 'modifyPhysicalResistance':
                    if (!targetUnit || !effect.damageType) {
                        return;
                    }
                    {
                        const baseResistance = targetUnit.resistances?.physical?.[effect.damageType] || 1;
                        const currentResistance = targetUnit.turnState?.resistanceOverrides?.[effect.damageType] || baseResistance;
                        const nextResistance = effect.operation === 'multiplyCurrent'
                            ? currentResistance * (effect.value || 1)
                            : baseResistance * (effect.value || 1);
                        targetUnit.turnState.resistanceOverrides = {
                            ...(targetUnit.turnState.resistanceOverrides || {}),
                            [effect.damageType]: nextResistance,
                        };
                    }
                    return;
                case 'modifyDefenseLevel':
                    if (!targetUnit) {
                        return;
                    }
                    targetUnit.turnState.defenseLevelModifier = (targetUnit.turnState.defenseLevelModifier || 0) + (effect.value || 0);
                    return;
                case 'consumeStatus':
                    if (!targetUnit || !effect.statusId || typeof getStatus !== 'function' || typeof removeStatus !== 'function') {
                        return;
                    }
                    {
                        const status = getStatus(targetUnit, effect.statusId);
                        if (!status) {
                            return;
                        }
                        removeStatus(targetUnit, effect.statusId);
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'status_expired', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                statusId: effect.statusId,
                            });
                        }
                    }
                    return;
                default:
                    return;
                }
            });
        }

        return {
            applyEffects,
            getEffectStatusPotency,
        };
    }

    function effectMatchesRuntime(effect, runtime, getEffectStatusPotency) {
        if (typeof effect.coinIndex === 'number' && effect.coinIndex !== runtime.coinIndex) {
            return false;
        }

        if (effect.criticalOnly && !runtime.isCritical) {
            return false;
        }

        if (effect.outcome && effect.outcome !== runtime.outcome) {
            return false;
        }

        if (typeof effect.minStatusPotency === 'number' && getEffectStatusPotency(runtime, effect) < effect.minStatusPotency) {
            return false;
        }

        return true;
    }

    function createSkillEffectRunner(deps) {
        const { applyEffects, getEffectStatusPotency } = createEffectExecutor(deps);

        function applySkillEffects(targetBattle, trigger, runtime) {
            const skill = runtime?.skill;
            const effects = Array.isArray(skill?.effects)
                ? skill.effects.filter((effect) => effect?.trigger === trigger && effectMatchesRuntime(effect, runtime, getEffectStatusPotency))
                : [];
            applyEffects(targetBattle, effects, runtime);
        }

        return applySkillEffects;
    }

    function createPassiveEffectRunner(deps) {
        const { applyEffects, getEffectStatusPotency } = createEffectExecutor(deps);

        function applyPassiveEffects(targetBattle, hookName, hookEffects, runtime) {
            const effects = Array.isArray(hookEffects)
                ? hookEffects.filter((effect) => effectMatchesRuntime(effect, runtime, getEffectStatusPotency))
                : [];
            applyEffects(targetBattle, effects, {
                ...runtime,
                hookName,
            });
        }

        return applyPassiveEffects;
    }

    battleModules.createSkillEffectRunner = createSkillEffectRunner;
    battleModules.createPassiveEffectRunner = createPassiveEffectRunner;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createSkillEffectRunner,
        createPassiveEffectRunner,
    };
})();
