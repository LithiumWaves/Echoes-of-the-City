(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createEffectExecutor(deps) {
        const {
            getStatusPotency,
            getStatusCount,
            getStatus,
            removeStatus,
            applyStatus,
            applyFixedDamage,
            queueStatusForNextTurn,
            adjustSanity,
            emitEvent,
            invokeHooks,
            isCountOnlyStatus,
            clampStatusValue,
            getAllSlots,
            getSlotById,
            getUnitById,
            getSlotsForSide,
            getFirstLivingSlotId,
            getOpposingSide,
            isSlotAlive,
            refreshRedirectedTargets,
            refreshSpeedOrder,
            ensureActivePlayerSlot,
            burstTremor,
        } = deps || {};

        function getRuntimeSourceUnit(runtime) {
            return runtime?.sourceUnit || runtime?.unit || null;
        }

        function getRuntimeTargetUnit(runtime) {
            return runtime?.targetUnit || runtime?.opponent || null;
        }

        function isHookRuntimeSelfTarget(runtime) {
            return Boolean(runtime?.unit && runtime?.targetUnit && runtime.unit.id === runtime.targetUnit.id);
        }

        function getSlotForUnit(targetBattle, unit) {
            if (!targetBattle || !unit || typeof getAllSlots !== 'function') {
                return null;
            }

            return getAllSlots(targetBattle).find((slot) => slot.unitId === unit.id) || null;
        }

        function getEffectTargetUnit(runtime, target = 'opponent') {
            if (target === 'self') {
                return runtime?.unit || runtime?.sourceUnit || null;
            }

            if (target === 'opponent') {
                if (isHookRuntimeSelfTarget(runtime)) {
                    return runtime?.sourceUnit || runtime?.opponent || null;
                }

                return getRuntimeTargetUnit(runtime);
            }

            return null;
        }

        function getEffectStatusValue(runtime, amountSource, getter) {
            if (!amountSource || typeof getter !== 'function') {
                return 0;
            }

            const targetUnit = getEffectTargetUnit(runtime, amountSource.target || 'self');
            if (!targetUnit || !amountSource.statusId) {
                return 0;
            }

            return getter(targetUnit, amountSource.statusId);
        }

        function getEffectStatusPotency(runtime, effect) {
            return getEffectStatusValue(
                runtime,
                {
                    statusId: effect?.statusId,
                    target: effect?.statusSource || 'self',
                },
                getStatusPotency,
            );
        }

        function getEffectStatusCount(runtime, effect) {
            return getEffectStatusValue(
                runtime,
                {
                    statusId: effect?.statusId,
                    target: effect?.statusSource || 'self',
                },
                getStatusCount,
            );
        }

        function resolveEffectAmount(runtime, effect) {
            if (typeof effect.amount === 'number') {
                return effect.amount;
            }

            const amountDefinition = effect.amount;
            if (amountDefinition?.statusPotency) {
                const statusSource = amountDefinition.statusPotency;
                const targetUnit = getEffectTargetUnit(runtime, statusSource.target || 'self');
                if (!targetUnit || !statusSource.statusId || typeof getStatusPotency !== 'function') {
                    return 0;
                }

                const baseAmount = getStatusPotency(targetUnit, statusSource.statusId);
                return baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
            }

            if (amountDefinition?.statusCount) {
                const statusSource = amountDefinition.statusCount;
                const targetUnit = getEffectTargetUnit(runtime, statusSource.target || 'self');
                if (!targetUnit || !statusSource.statusId || typeof getStatusCount !== 'function') {
                    return 0;
                }

                const baseAmount = getStatusCount(targetUnit, statusSource.statusId);
                return baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
            }

            if (typeof effect.value === 'number') {
                return effect.value;
            }

            return 0;
        }

        function shouldExpireStatus(status, statusId) {
            if (!status) {
                return false;
            }

            const expireWhen = status.stackModel?.expireWhen;
            if (typeof expireWhen?.countLte === 'number' && (status.count || 0) <= expireWhen.countLte) {
                return true;
            }
            if (typeof expireWhen?.potencyLte === 'number' && (status.potency || 0) <= expireWhen.potencyLte) {
                return true;
            }

            return typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(statusId)
                ? (status.count || 0) <= 0
                : (status.count || 0) <= 0 && (status.potency || 0) <= 0;
        }

        function triggerStatusLifecycleHook(targetBattle, unit, hookName, statusId, payload = {}) {
            if (!targetBattle || !unit || !statusId || typeof invokeHooks !== 'function') {
                return;
            }

            invokeHooks(unit, hookName, {
                battle: targetBattle,
                unit,
                statusId,
                status: payload.status || (typeof getStatus === 'function' ? getStatus(unit, statusId) : null),
                ...payload,
            });
        }

        function adjustUnitStatus(targetBattle, unit, effect) {
            if (!unit || !effect.statusId || typeof getStatus !== 'function' || typeof removeStatus !== 'function') {
                return;
            }

            const potencyDelta = typeof effect.potencyDelta === 'number' ? effect.potencyDelta : 0;
            const countDelta = typeof effect.countDelta === 'number' ? effect.countDelta : 0;
            const existing = getStatus(unit, effect.statusId);

            if (!existing) {
                if (potencyDelta <= 0 && countDelta <= 0) {
                    return;
                }

                const appliedStatus = applyStatus(targetBattle, unit, effect.statusId, {
                    potency: potencyDelta,
                    count: countDelta,
                });
                if (appliedStatus) {
                    triggerStatusLifecycleHook(targetBattle, unit, 'statusApplied', effect.statusId, {
                        status: appliedStatus,
                    });
                }
                return;
            }

            const previousPotency = existing.potency || 0;
            const previousCount = existing.count || 0;
            const nextPotency = typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(effect.statusId)
                ? 0
                : (typeof clampStatusValue === 'function'
                    ? clampStatusValue(previousPotency + potencyDelta, 99)
                    : Math.max(0, previousPotency + potencyDelta));
            const nextCount = typeof clampStatusValue === 'function'
                ? clampStatusValue(previousCount + countDelta, effect.statusId === 'protection' ? 10 : 99)
                : Math.max(0, previousCount + countDelta);

            existing.potency = nextPotency;
            existing.count = nextCount;
            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, 'status_changed', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId: effect.statusId,
                    previousPotency,
                    previousCount,
                    nextPotency,
                    nextCount,
                });
            }
            triggerStatusLifecycleHook(targetBattle, unit, 'statusChanged', effect.statusId, {
                status: existing,
                previousPotency,
                previousCount,
                nextPotency,
                nextCount,
            });

            if (shouldExpireStatus(existing, effect.statusId)) {
                const expiredStatus = { ...existing };
                removeStatus(unit, effect.statusId);
                if (typeof emitEvent === 'function') {
                    emitEvent(targetBattle, 'status_expired', {
                        unitId: unit.id,
                        unitName: unit.name,
                        statusId: effect.statusId,
                    });
                }
                triggerStatusLifecycleHook(targetBattle, unit, 'statusExpired', effect.statusId, {
                    status: expiredStatus,
                });
            }
        }

        function modifyResistance(targetBattle, unit, bucket, key, effect) {
            if (!unit || !key) {
                return;
            }

            const baseResistance = unit.resistances?.[bucket]?.[key] || 1;
            const currentResistance = unit.turnState?.[`${bucket}ResistanceOverrides`]?.[key] || baseResistance;
            const nextResistance = effect.operation === 'multiplyCurrent'
                ? currentResistance * (effect.value || 1)
                : baseResistance * (effect.value || 1);

            unit.turnState[`${bucket}ResistanceOverrides`] = {
                ...(unit.turnState[`${bucket}ResistanceOverrides`] || {}),
                [key]: nextResistance,
            };

            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, 'resistance_modified', {
                    unitId: unit.id,
                    unitName: unit.name,
                    bucket,
                    key,
                    value: nextResistance,
                });
            }
        }

        function modifyUnitSpeed(targetBattle, unit, effect, runtime) {
            const slot = getSlotForUnit(targetBattle, unit);
            if (!slot) {
                return;
            }

            const previousSpeed = slot.speed || 0;
            const resolvedValue = Math.round(resolveEffectAmount(runtime, effect));
            const nextSpeed = effect.operation === 'set'
                ? Math.max(0, resolvedValue)
                : Math.max(0, previousSpeed + resolvedValue);

            slot.speed = nextSpeed;
            unit.speed = nextSpeed;

            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, 'speed_modified', {
                    unitId: unit.id,
                    unitName: unit.name,
                    previousSpeed,
                    nextSpeed,
                });
            }

            if (typeof refreshRedirectedTargets === 'function') {
                refreshRedirectedTargets(targetBattle);
            }
            if (typeof refreshSpeedOrder === 'function') {
                refreshSpeedOrder(targetBattle);
            }
            if (typeof ensureActivePlayerSlot === 'function') {
                ensureActivePlayerSlot(targetBattle);
            }
        }

        function modifyUnitLevel(targetBattle, unit, effect, runtime, fieldName, eventName) {
            if (!unit) {
                return;
            }

            const resolvedValue = Math.round(resolveEffectAmount(runtime, effect));
            unit.turnState[fieldName] = (unit.turnState[fieldName] || 0) + resolvedValue;

            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, eventName, {
                    unitId: unit.id,
                    unitName: unit.name,
                    value: unit.turnState[fieldName],
                });
            }
        }

        function getFallbackOpponentSlot(targetBattle, sourceUnit) {
            if (!sourceUnit || typeof getOpposingSide !== 'function' || typeof getFirstLivingSlotId !== 'function' || typeof getSlotById !== 'function') {
                return null;
            }

            const slotId = getFirstLivingSlotId(targetBattle, getOpposingSide(sourceUnit.side));
            return slotId ? getSlotById(targetBattle, slotId) : null;
        }

        function getAffectedSlot(targetBattle, runtime, effect) {
            const sourceUnit = getRuntimeSourceUnit(runtime);
            const targetUnit = getRuntimeTargetUnit(runtime);

            if (effect.target === 'self') {
                return runtime?.slot || getSlotForUnit(targetBattle, sourceUnit);
            }

            if (effect.target === 'opponent') {
                return runtime?.targetSlot
                    || getSlotForUnit(targetBattle, targetUnit)
                    || getFallbackOpponentSlot(targetBattle, sourceUnit);
            }

            return runtime?.slot || getSlotForUnit(targetBattle, sourceUnit);
        }

        function resolveRetargetSlotId(targetBattle, actingSlot, runtime, effect) {
            if (!actingSlot) {
                return null;
            }

            const sourceUnit = getRuntimeSourceUnit(runtime);
            const targetUnit = getRuntimeTargetUnit(runtime);
            const opposingSide = typeof getOpposingSide === 'function' ? getOpposingSide(actingSlot.side) : null;

            if (effect.selector === 'sourceUnit') {
                return getSlotForUnit(targetBattle, sourceUnit)?.id || null;
            }
            if (effect.selector === 'targetUnit') {
                return getSlotForUnit(targetBattle, targetUnit)?.id || null;
            }
            if (effect.selector === 'firstLivingOpponent' && opposingSide && typeof getFirstLivingSlotId === 'function') {
                return getFirstLivingSlotId(targetBattle, opposingSide);
            }
            if (effect.selector === 'firstLivingAlly' && typeof getFirstLivingSlotId === 'function') {
                return getFirstLivingSlotId(targetBattle, actingSlot.side);
            }
            if (effect.selector === 'mirrorOpponent' && opposingSide && typeof getSlotsForSide === 'function') {
                const opposingSlots = getSlotsForSide(targetBattle, opposingSide);
                const mirrored = opposingSlots?.[actingSlot.index];
                if (mirrored && typeof isSlotAlive === 'function' && isSlotAlive(targetBattle, mirrored)) {
                    return mirrored.id;
                }
                return typeof getFirstLivingSlotId === 'function' ? getFirstLivingSlotId(targetBattle, opposingSide) : null;
            }

            return null;
        }

        function retargetSlot(targetBattle, runtime, effect) {
            const affectedSlot = getAffectedSlot(targetBattle, runtime, effect);
            if (!affectedSlot) {
                return;
            }

            const previousTargetSlotId = affectedSlot.targetSlotId || null;
            const nextTargetSlotId = resolveRetargetSlotId(targetBattle, affectedSlot, runtime, effect);
            if (!nextTargetSlotId || previousTargetSlotId === nextTargetSlotId) {
                return;
            }

            affectedSlot.targetSlotId = nextTargetSlotId;
            if (affectedSlot.side === 'enemy') {
                affectedSlot.intentTargetSlotId = nextTargetSlotId;
            }
            if (typeof effect.lockTarget === 'boolean') {
                affectedSlot.manualTargetLock = effect.lockTarget;
            }

            if (typeof emitEvent === 'function') {
                const actingUnit = typeof getUnitById === 'function' ? getUnitById(targetBattle, affectedSlot.unitId) : null;
                const targetUnit = typeof getSlotById === 'function' && typeof getUnitById === 'function'
                    ? getUnitById(targetBattle, getSlotById(targetBattle, nextTargetSlotId)?.unitId)
                    : null;
                emitEvent(targetBattle, 'slot_retargeted', {
                    unitId: actingUnit?.id || affectedSlot.unitId,
                    unitName: actingUnit?.name || 'Unknown',
                    targetUnitName: targetUnit?.name || 'Unknown',
                });
            }

            if (typeof refreshRedirectedTargets === 'function') {
                refreshRedirectedTargets(targetBattle);
            }
            if (typeof refreshSpeedOrder === 'function') {
                refreshSpeedOrder(targetBattle);
            }
        }

        function applyEffects(targetBattle, effects, runtime) {
            (Array.isArray(effects) ? effects : []).forEach((effect) => {
                const sourceUnit = getRuntimeSourceUnit(runtime);
                const targetUnit = getEffectTargetUnit(runtime, effect.target || 'opponent');
                const context = runtime.defendContext
                    && runtime?.unit
                    && runtime?.targetUnit
                    && runtime.unit.id === runtime.targetUnit.id
                    ? runtime.defendContext
                    : (runtime.attackContext || runtime.defendContext || null);
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
                case 'dealFixedDamage':
                    if (!targetUnit || typeof applyFixedDamage !== 'function') {
                        return;
                    }
                    applyFixedDamage(targetBattle, targetUnit, effect.statusId || 'effect', resolveEffectAmount(runtime, effect));
                    return;
                case 'adjustSanity':
                    if (!targetUnit || typeof adjustSanity !== 'function') {
                        return;
                    }
                    {
                        const sanityAmount = resolveEffectAmount(runtime, effect);
                        if (effect.statusId && typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'status_triggered', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                statusId: effect.statusId,
                                damage: Math.abs(sanityAmount),
                                hp: targetUnit.hp,
                            });
                        }
                        const sanityChange = adjustSanity(targetUnit, sanityAmount);
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
                    {
                        const resolvedValue = resolveEffectAmount(runtime, effect);
                        if (effect.operation === 'add') {
                            context[effect.field] = (context[effect.field] || 0) + resolvedValue;
                            return;
                        }
                        if (effect.operation === 'set') {
                            context[effect.field] = effect.amount ? resolvedValue : effect.value;
                            return;
                        }
                    }
                    if (effect.operation === 'addStatusPotencyScaled') {
                        const potency = getEffectStatusPotency(runtime, effect);
                        const magnitude = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, potency * (effect.multiplier || 1))
                            : potency * (effect.multiplier || 1);
                        context[effect.field] = (context[effect.field] || 0) + ((effect.direction === 'subtract' ? -1 : 1) * magnitude);
                        return;
                    }
                    if (effect.operation === 'addStatusCountScaled') {
                        const count = getEffectStatusCount(runtime, effect);
                        const magnitude = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, count * (effect.multiplier || 1))
                            : count * (effect.multiplier || 1);
                        context[effect.field] = (context[effect.field] || 0) + ((effect.direction === 'subtract' ? -1 : 1) * magnitude);
                        return;
                    }
                    if (effect.operation === 'setToOneMinusStatusPotencyScaled') {
                        const potency = getEffectStatusPotency(runtime, effect);
                        const reduction = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, potency * (effect.multiplier || 0))
                            : potency * (effect.multiplier || 0);
                        context[effect.field] = 1 - reduction;
                        return;
                    }
                    if (effect.operation === 'setToOnePlusStatusCountScaled') {
                        const count = getEffectStatusCount(runtime, effect);
                        const bonus = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, count * (effect.multiplier || 0))
                            : count * (effect.multiplier || 0);
                        context[effect.field] = 1 + bonus;
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
                    modifyResistance(targetBattle, targetUnit, 'physical', effect.damageType, effect);
                    return;
                case 'modifySinResistance':
                    if (!targetUnit || !effect.sinType) {
                        return;
                    }
                    modifyResistance(targetBattle, targetUnit, 'sin', effect.sinType, effect);
                    return;
                case 'modifyDefenseLevel':
                    if (!targetUnit) {
                        return;
                    }
                    modifyUnitLevel(targetBattle, targetUnit, effect, runtime, 'defenseLevelModifier', 'defense_level_modified');
                    return;
                case 'modifyOffenseLevel':
                    if (!targetUnit) {
                        return;
                    }
                    modifyUnitLevel(targetBattle, targetUnit, effect, runtime, 'offenseLevelModifier', 'offense_level_modified');
                    return;
                case 'healHp':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const healAmount = Math.max(0, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousHp = targetUnit.hp;
                        targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
                        if (targetUnit.hp !== previousHp && typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'hp_healed', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                previousHp,
                                nextHp: targetUnit.hp,
                                amount: targetUnit.hp - previousHp,
                            });
                        }
                    }
                    return;
                case 'adjustStatus':
                    if (!targetUnit) {
                        return;
                    }
                    adjustUnitStatus(targetBattle, targetUnit, effect);
                    return;
                case 'modifySpeed':
                    if (!targetUnit) {
                        return;
                    }
                    modifyUnitSpeed(targetBattle, targetUnit, effect, runtime);
                    return;
                case 'retargetSlot':
                    if (!effect.selector) {
                        return;
                    }
                    retargetSlot(targetBattle, runtime, effect);
                    return;
                case 'burstTremor':
                    if (!targetUnit || typeof burstTremor !== 'function') {
                        return;
                    }
                    burstTremor(targetBattle, sourceUnit, targetUnit, {
                        ...effect,
                        resolvedAmount: effect.amount != null || typeof effect.value === 'number'
                            ? resolveEffectAmount(runtime, effect)
                            : null,
                    }, runtime);
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
                            emitEvent(targetBattle, 'status_consumed', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                statusId: effect.statusId,
                            });
                        }
                        triggerStatusLifecycleHook(targetBattle, targetUnit, 'statusConsumed', effect.statusId, {
                            status: { ...status },
                        });
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
        if (typeof effect.coinIndex === 'number' && typeof runtime.coinIndex === 'number' && effect.coinIndex !== runtime.coinIndex) {
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

    function isStructuredHookBlock(block) {
        return Boolean(block)
            && typeof block === 'object'
            && !Array.isArray(block)
            && Array.isArray(block.actions);
    }

    function normalizeHookBlocks(hookDefinition) {
        if (isStructuredHookBlock(hookDefinition)) {
            return [hookDefinition];
        }

        if (!Array.isArray(hookDefinition) || !hookDefinition.length) {
            return null;
        }

        return hookDefinition.every((entry) => isStructuredHookBlock(entry))
            ? hookDefinition
            : null;
    }

    function getRuntimeCoinIndex(runtime) {
        if (typeof runtime?.coinIndex === 'number') {
            return runtime.coinIndex;
        }

        if (typeof runtime?.currentCoinIndex === 'number') {
            return runtime.currentCoinIndex;
        }

        return null;
    }

    function getHookConditionUnit(runtime, target = 'self') {
        if (target === 'opponent') {
            return runtime?.targetUnit || runtime?.opponent || null;
        }

        return runtime?.sourceUnit || runtime?.unit || null;
    }

    function getUnitHpRatio(unit) {
        if (!unit || typeof unit.hp !== 'number' || typeof unit.maxHp !== 'number' || unit.maxHp <= 0) {
            return 0;
        }

        return unit.hp / unit.maxHp;
    }

    function isUnitStaggeredForCondition(unit) {
        return Boolean(unit) && (unit.staggerTurnsRemaining || 0) > 0 && (unit.hp || 0) > 0;
    }

    function matchesExpectedValue(actualValue, expectedValue) {
        if (Array.isArray(expectedValue)) {
            return expectedValue.includes(actualValue);
        }

        return actualValue === expectedValue;
    }

    function ensureHookOwnerRuntimeState(hookOwner) {
        if (!hookOwner || typeof hookOwner !== 'object') {
            return null;
        }

        if (!hookOwner.runtimeState || typeof hookOwner.runtimeState !== 'object' || Array.isArray(hookOwner.runtimeState)) {
            hookOwner.runtimeState = {};
        }

        if (!hookOwner.runtimeState.oncePer || typeof hookOwner.runtimeState.oncePer !== 'object' || Array.isArray(hookOwner.runtimeState.oncePer)) {
            hookOwner.runtimeState.oncePer = {
                battle: {},
                turn: {},
                skill: {},
                coin: {},
            };
        }

        return hookOwner.runtimeState.oncePer;
    }

    function buildOncePerKey(scope, hookName, block, runtime, blockIndex) {
        const blockKey = typeof block?.id === 'string' && block.id.length
            ? block.id
            : `${hookName}-${blockIndex}`;
        const turn = runtime?.battle?.turn || 0;
        const sourceUnitId = runtime?.sourceUnit?.id || runtime?.unit?.id || 'none';
        const targetUnitId = runtime?.targetUnit?.id || runtime?.opponent?.id || 'none';
        const skillId = runtime?.skill?.id || 'none';
        const coinIndex = getRuntimeCoinIndex(runtime) || 0;

        switch (scope) {
        case 'battle':
            return `${hookName}:${blockKey}`;
        case 'turn':
            return `${turn}:${hookName}:${blockKey}`;
        case 'skill':
            return `${turn}:${hookName}:${blockKey}:${sourceUnitId}:${targetUnitId}:${skillId}`;
        case 'coin':
            return `${turn}:${hookName}:${blockKey}:${sourceUnitId}:${targetUnitId}:${skillId}:${coinIndex}`;
        default:
            return null;
        }
    }

    function canUseHookBlock(block, hookName, runtime, hookOwner, blockIndex) {
        if (!block?.oncePer) {
            return true;
        }

        const oncePerState = ensureHookOwnerRuntimeState(hookOwner);
        const oncePerKey = buildOncePerKey(block.oncePer, hookName, block, runtime, blockIndex);
        if (!oncePerState || !oncePerKey) {
            return true;
        }

        if (!oncePerState[block.oncePer] || typeof oncePerState[block.oncePer] !== 'object') {
            oncePerState[block.oncePer] = {};
        }

        if (oncePerState[block.oncePer][oncePerKey]) {
            return false;
        }

        oncePerState[block.oncePer][oncePerKey] = true;
        return true;
    }

    function conditionMatchesRuntime(condition, runtime, getStatus) {
        const conditionType = condition?.type;
        const conditionUnit = getHookConditionUnit(runtime, condition?.target || 'self');
        const conditionStatus = conditionUnit && condition?.statusId && typeof getStatus === 'function'
            ? getStatus(conditionUnit, condition.statusId)
            : null;
        const conditionValue = condition?.value;

        switch (conditionType) {
        case 'always':
            return true;
        case 'damageAtLeast':
            return typeof runtime?.damage === 'number' && runtime.damage >= conditionValue;
        case 'hasStatus':
            return Boolean(conditionStatus) && ((conditionStatus.count || 0) > 0 || (conditionStatus.potency || 0) > 0);
        case 'statusPotencyAtLeast':
            return (conditionStatus?.potency || 0) >= conditionValue;
        case 'statusCountAtLeast':
            return (conditionStatus?.count || 0) >= conditionValue;
        case 'skillSinType':
            return matchesExpectedValue(runtime?.skill?.sinType || null, conditionValue);
        case 'skillDamageType':
            return matchesExpectedValue(runtime?.skill?.damageType || null, conditionValue);
        case 'coinIndex':
            return getRuntimeCoinIndex(runtime) === conditionValue;
        case 'criticalHit':
            return Boolean(runtime?.isCritical) === (conditionValue ?? true);
        case 'targetStaggered':
            return isUnitStaggeredForCondition(getHookConditionUnit(runtime, condition?.target || 'opponent')) === (conditionValue ?? true);
        case 'hpPercentAtOrBelow':
            return getUnitHpRatio(conditionUnit) <= conditionValue;
        case 'hpPercentAtOrAbove':
            return getUnitHpRatio(conditionUnit) >= conditionValue;
        case 'spAtOrBelow':
            return typeof conditionUnit?.sp === 'number' && conditionUnit.sp <= conditionValue;
        case 'spAtOrAbove':
            return typeof conditionUnit?.sp === 'number' && conditionUnit.sp >= conditionValue;
        default:
            return false;
        }
    }

    function hookBlockMatchesRuntime(block, runtime, getStatus) {
        if (!Array.isArray(block?.conditions) || !block.conditions.length) {
            return true;
        }

        return block.conditions.every((condition) => conditionMatchesRuntime(condition, runtime, getStatus));
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
        const { getStatus, invokeHooks } = deps || {};

        function applyPassiveEffects(targetBattle, hookName, hookEffects, runtime, options = {}) {
            const hookRuntime = {
                ...runtime,
                hookName,
                statusOwner: options.hookOwnerType === 'status' ? options.hookOwner : null,
            };
            const hookBlocks = normalizeHookBlocks(hookEffects);
            const shouldEmitStatusTriggerLifecycle = options.hookOwnerType === 'status'
                && typeof invokeHooks === 'function'
                && hookRuntime.unit
                && hookName !== 'beforeStatusTrigger'
                && hookName !== 'afterStatusTrigger';

            const emitStatusTriggerLifecycle = (lifecycleHookName) => {
                if (!shouldEmitStatusTriggerLifecycle) {
                    return;
                }

                invokeHooks(hookRuntime.unit, lifecycleHookName, {
                    battle: targetBattle,
                    unit: hookRuntime.unit,
                    sourceUnit: hookRuntime.sourceUnit || hookRuntime.unit,
                    opponent: hookRuntime.opponent || hookRuntime.targetUnit || null,
                    targetUnit: hookRuntime.targetUnit || hookRuntime.opponent || null,
                    statusId: options.hookOwner?.id || null,
                    status: options.hookOwner || null,
                    triggerHookName: hookName,
                });
            };

            if (hookBlocks) {
                hookBlocks.forEach((block, index) => {
                    if (!hookBlockMatchesRuntime(block, hookRuntime, getStatus)) {
                        return;
                    }

                    const actions = Array.isArray(block.actions)
                        ? block.actions.filter((effect) => effectMatchesRuntime(effect, hookRuntime, getEffectStatusPotency))
                        : [];
                    if (!actions.length) {
                        return;
                    }
                    if (!canUseHookBlock(block, hookName, hookRuntime, options.hookOwner, index)) {
                        return;
                    }
                    emitStatusTriggerLifecycle('beforeStatusTrigger');
                    applyEffects(targetBattle, actions, hookRuntime);
                    emitStatusTriggerLifecycle('afterStatusTrigger');
                });
                return;
            }

            const effects = Array.isArray(hookEffects)
                ? hookEffects.filter((effect) => effectMatchesRuntime(effect, hookRuntime, getEffectStatusPotency))
                : [];
            if (effects.length) {
                emitStatusTriggerLifecycle('beforeStatusTrigger');
            }
            applyEffects(targetBattle, effects, hookRuntime);
            if (effects.length) {
                emitStatusTriggerLifecycle('afterStatusTrigger');
            }
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
