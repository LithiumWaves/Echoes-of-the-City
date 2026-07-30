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
            adjustEncounterResource,
            getEncounterResource,
            gainShield,
            clearShield,
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

        function getStatusDefinition(statusId) {
            const registry = battleModules.registry || {};
            return typeof registry.getStatusDefinition === 'function'
                ? registry.getStatusDefinition(statusId)
                : null;
        }

        function statusMatchesTags(statusId, tags, matchMode = 'any') {
            const definition = getStatusDefinition(statusId);
            const definitionTags = Array.isArray(definition?.tags) ? definition.tags : [];
            if (!Array.isArray(tags) || !tags.length) {
                return false;
            }
            const mode = matchMode === 'all' ? 'all' : 'any';
            return mode === 'all'
                ? tags.every((tag) => definitionTags.includes(tag))
                : tags.some((tag) => definitionTags.includes(tag));
        }

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

        function getEffectTargetUnits(targetBattle, runtime, target = 'opponent') {
            const sourceUnit = getRuntimeSourceUnit(runtime);
            const sourceSlot = sourceUnit ? getSlotForUnit(targetBattle, sourceUnit) : null;
            const sourceSide = sourceSlot?.side || sourceUnit?.side || null;
            const pickRandom = (slots) => {
                if (!slots.length) {
                    return null;
                }
                const index = Math.floor(Math.random() * slots.length);
                return slots[Math.max(0, Math.min(slots.length - 1, index))] || null;
            };
            const pickByHp = (slots, mode) => {
                const sorted = [...slots].sort((a, b) => {
                    const unitA = typeof getUnitById === 'function' ? getUnitById(targetBattle, a.unitId) : null;
                    const unitB = typeof getUnitById === 'function' ? getUnitById(targetBattle, b.unitId) : null;
                    const hpA = unitA?.hp || 0;
                    const hpB = unitB?.hp || 0;
                    if (hpA === hpB) {
                        const orderA = Number.isInteger(unitA?.deploymentOrder) ? unitA.deploymentOrder : a.index;
                        const orderB = Number.isInteger(unitB?.deploymentOrder) ? unitB.deploymentOrder : b.index;
                        if (orderA === orderB) {
                            return a.index - b.index;
                        }
                        return orderA - orderB;
                    }
                    return mode === 'highest' ? hpB - hpA : hpA - hpB;
                });
                return sorted[0] || null;
            };
            const getLivingSlots = (side) => {
                if (!side || typeof getSlotsForSide !== 'function') {
                    return [];
                }
                return getSlotsForSide(targetBattle, side)
                    .filter((slot) => (typeof isSlotAlive === 'function' ? isSlotAlive(targetBattle, slot) : true));
            };

            if (target === 'allAllies') {
                if (!sourceSide || typeof getSlotsForSide !== 'function' || typeof getUnitById !== 'function') {
                    return [];
                }
                return getSlotsForSide(targetBattle, sourceSide)
                    .filter((slot) => (typeof isSlotAlive === 'function' ? isSlotAlive(targetBattle, slot) : true))
                    .map((slot) => getUnitById(targetBattle, slot.unitId))
                    .filter(Boolean);
            }

            if (target === 'allOpponents') {
                if (!sourceSide || typeof getOpposingSide !== 'function' || typeof getSlotsForSide !== 'function' || typeof getUnitById !== 'function') {
                    return [];
                }
                const opposingSide = getOpposingSide(sourceSide);
                return getSlotsForSide(targetBattle, opposingSide)
                    .filter((slot) => (typeof isSlotAlive === 'function' ? isSlotAlive(targetBattle, slot) : true))
                    .map((slot) => getUnitById(targetBattle, slot.unitId))
                    .filter(Boolean);
            }

            if (target === 'randomAlly') {
                const selectedSlot = pickRandom(getLivingSlots(sourceSide));
                const unit = selectedSlot && typeof getUnitById === 'function' ? getUnitById(targetBattle, selectedSlot.unitId) : null;
                return unit ? [unit] : [];
            }
            if (target === 'randomOpponent') {
                const opposingSide = sourceSide && typeof getOpposingSide === 'function' ? getOpposingSide(sourceSide) : null;
                const selectedSlot = pickRandom(getLivingSlots(opposingSide));
                const unit = selectedSlot && typeof getUnitById === 'function' ? getUnitById(targetBattle, selectedSlot.unitId) : null;
                return unit ? [unit] : [];
            }
            if (target === 'highestHpAlly' || target === 'lowestHpAlly') {
                const selectedSlot = pickByHp(getLivingSlots(sourceSide), target === 'highestHpAlly' ? 'highest' : 'lowest');
                const unit = selectedSlot && typeof getUnitById === 'function' ? getUnitById(targetBattle, selectedSlot.unitId) : null;
                return unit ? [unit] : [];
            }
            if (target === 'highestHpOpponent' || target === 'lowestHpOpponent') {
                const opposingSide = sourceSide && typeof getOpposingSide === 'function' ? getOpposingSide(sourceSide) : null;
                const selectedSlot = pickByHp(getLivingSlots(opposingSide), target === 'highestHpOpponent' ? 'highest' : 'lowest');
                const unit = selectedSlot && typeof getUnitById === 'function' ? getUnitById(targetBattle, selectedSlot.unitId) : null;
                return unit ? [unit] : [];
            }

            const targetUnit = getEffectTargetUnit(runtime, target);
            return targetUnit ? [targetUnit] : [];
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
            if (typeof amountDefinition === 'number') {
                return amountDefinition;
            }
            if (amountDefinition?.product) {
                const productTerms = Array.isArray(amountDefinition.product)
                    ? amountDefinition.product
                    : [];
                if (!productTerms.length) {
                    return 0;
                }

                return productTerms.reduce((product, term) => product * resolveEffectAmount(runtime, { amount: term }), 1);
            }
            if (amountDefinition?.sum) {
                const terms = Array.isArray(amountDefinition.sum)
                    ? amountDefinition.sum
                    : [];
                if (!terms.length) {
                    return 0;
                }
                return terms.reduce((sum, term) => sum + resolveEffectAmount(runtime, { amount: term }), 0);
            }
            if (amountDefinition?.min) {
                const terms = Array.isArray(amountDefinition.min)
                    ? amountDefinition.min
                    : [];
                if (!terms.length) {
                    return 0;
                }
                return terms.reduce((current, term) => Math.min(current, resolveEffectAmount(runtime, { amount: term })), resolveEffectAmount(runtime, { amount: terms[0] }));
            }
            if (amountDefinition?.max) {
                const terms = Array.isArray(amountDefinition.max)
                    ? amountDefinition.max
                    : [];
                if (!terms.length) {
                    return 0;
                }
                return terms.reduce((current, term) => Math.max(current, resolveEffectAmount(runtime, { amount: term })), resolveEffectAmount(runtime, { amount: terms[0] }));
            }
            if (amountDefinition?.clamp) {
                const clampDefinition = amountDefinition.clamp;
                const value = resolveEffectAmount(runtime, { amount: clampDefinition?.value });
                const minValue = clampDefinition?.min != null ? resolveEffectAmount(runtime, { amount: clampDefinition.min }) : null;
                const maxValue = clampDefinition?.max != null ? resolveEffectAmount(runtime, { amount: clampDefinition.max }) : null;
                const clampedMin = minValue != null ? Math.max(minValue, value) : value;
                return maxValue != null ? Math.min(maxValue, clampedMin) : clampedMin;
            }
            if (amountDefinition?.floor != null) {
                return Math.floor(resolveEffectAmount(runtime, { amount: amountDefinition.floor }));
            }
            if (amountDefinition?.ceil != null) {
                return Math.ceil(resolveEffectAmount(runtime, { amount: amountDefinition.ceil }));
            }
            if (amountDefinition?.abs != null) {
                return Math.abs(resolveEffectAmount(runtime, { amount: amountDefinition.abs }));
            }
            if (amountDefinition?.statusPotency) {
                const statusSource = amountDefinition.statusPotency;
                const targetUnit = getEffectTargetUnit(runtime, statusSource.target || 'self');
                if (!targetUnit || !statusSource.statusId || typeof getStatusPotency !== 'function') {
                    return 0;
                }

                const baseAmount = getStatusPotency(targetUnit, statusSource.statusId);
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.statusCount) {
                const statusSource = amountDefinition.statusCount;
                const targetUnit = getEffectTargetUnit(runtime, statusSource.target || 'self');
                if (!targetUnit || !statusSource.statusId || typeof getStatusCount !== 'function') {
                    return 0;
                }

                const baseAmount = getStatusCount(targetUnit, statusSource.statusId);
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.hp || amountDefinition?.maxHp || amountDefinition?.hpPercent || amountDefinition?.sp || amountDefinition?.speed) {
                const amountKey = amountDefinition.hp
                    ? 'hp'
                    : (amountDefinition.maxHp
                        ? 'maxHp'
                        : (amountDefinition.hpPercent
                            ? 'hpPercent'
                            : (amountDefinition.sp ? 'sp' : 'speed')));
                const source = amountDefinition[amountKey] || {};
                const targetUnit = getEffectTargetUnit(runtime, source.target || 'self');
                if (!targetUnit) {
                    return 0;
                }
                const baseAmount = (() => {
                    if (amountKey === 'hp') {
                        return targetUnit.hp || 0;
                    }
                    if (amountKey === 'maxHp') {
                        return targetUnit.maxHp || 0;
                    }
                    if (amountKey === 'hpPercent') {
                        const maxHp = targetUnit.maxHp || 0;
                        return maxHp > 0 ? (targetUnit.hp || 0) / maxHp : 0;
                    }
                    if (amountKey === 'sp') {
                        return targetUnit.sp || 0;
                    }
                    return targetUnit.speed || 0;
                })();
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.encounterResource) {
                if (!runtime?.battle || !amountDefinition.encounterResource.resourceId || typeof getEncounterResource !== 'function') {
                    return 0;
                }

                const resourceDefinition = amountDefinition.encounterResource;
                const resourceId = resourceDefinition.resourceId;
                const target = resourceDefinition.target || 'self';
                const encounterResources = runtime.battle.encounterResources && typeof runtime.battle.encounterResources === 'object'
                    ? runtime.battle.encounterResources
                    : null;
                const hasEncounterResourceKey = (key) => Boolean(encounterResources && Object.prototype.hasOwnProperty.call(encounterResources, key));
                const resolveSideToken = (sideToken) => {
                    if (!sideToken) {
                        return null;
                    }
                    if (sideToken === 'player' || sideToken === 'enemy') {
                        return sideToken;
                    }
                    const selfSide = runtime?.unit?.side || 'player';
                    const opponentSide = selfSide === 'player' ? 'enemy' : 'player';
                    if (sideToken === 'self') {
                        return selfSide;
                    }
                    if (sideToken === 'opponent') {
                        return opponentSide;
                    }
                    return null;
                };
                const isExplicitKey = typeof resourceId === 'string' && resourceId.includes(':');
                if (target === 'battle') {
                    const resolvedResourceId = (() => {
                        if (isExplicitKey) {
                            return resourceId;
                        }
                        const resolvedSide = resolveSideToken(resourceDefinition.side);
                        return resolvedSide ? `${resolvedSide}:${resourceId}` : resourceId;
                    })();
                    const baseAmount = getEncounterResource(runtime.battle, resolvedResourceId);
                    const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                    return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
                }

                if (isExplicitKey) {
                    const baseAmount = getEncounterResource(runtime.battle, resourceId);
                    const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                    return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
                }
                const unit = getEffectTargetUnit(runtime, target);
                if (unit?.id) {
                    const scopedResourceId = `${unit.id}:${resourceId}`;
                    if (hasEncounterResourceKey(scopedResourceId)) {
                        const scopedValue = getEncounterResource(runtime.battle, scopedResourceId);
                        const scaledAmount = scopedValue * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                        return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
                    }
                }
                const baseAmount = getEncounterResource(runtime.battle, resourceId);
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.skillCoinCount) {
                const skillCoinCount = Math.max(0, runtime?.skill?.coinCount || 0);
                const baseAmount = amountDefinition.inverse
                    ? (skillCoinCount > 0 ? 1 / skillCoinCount : 0)
                    : skillCoinCount;
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.damage) {
                const baseAmount = typeof runtime?.damage === 'number' && Number.isFinite(runtime.damage)
                    ? runtime.damage
                    : 0;
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.unitResource) {
                const resourceSource = amountDefinition.unitResource || {};
                const targetUnit = getEffectTargetUnit(runtime, resourceSource.target || 'self');
                const resourceId = resourceSource.resourceId;
                if (!targetUnit || !resourceId || typeof resourceId !== 'string') {
                    return 0;
                }
                const resources = targetUnit.resources && typeof targetUnit.resources === 'object' && !Array.isArray(targetUnit.resources)
                    ? targetUnit.resources
                    : {};
                const baseAmount = typeof resources[resourceId] === 'number' && Number.isFinite(resources[resourceId])
                    ? resources[resourceId]
                    : 0;
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
            }

            if (amountDefinition?.eventField) {
                const definition = amountDefinition.eventField || {};
                const rawPath = typeof definition === 'string' ? definition : definition.path;
                const defaultValue = typeof definition === 'object' && typeof definition.default === 'number'
                    ? definition.default
                    : 0;
                if (!rawPath || typeof rawPath !== 'string') {
                    return defaultValue;
                }
                const pathParts = rawPath.split('.').filter((part) => part.length);
                const resolved = pathParts.reduce((current, key) => (current && typeof current === 'object' ? current[key] : undefined), runtime);
                const baseAmount = typeof resolved === 'number' && Number.isFinite(resolved) ? resolved : defaultValue;
                const scaledAmount = baseAmount * (typeof amountDefinition.multiplier === 'number' ? amountDefinition.multiplier : 1);
                return scaledAmount + (typeof amountDefinition.offset === 'number' ? amountDefinition.offset : 0);
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

        function clearUnitStatus(targetBattle, unit, statusId, options = {}) {
            if (!unit || !statusId || typeof getStatus !== 'function' || typeof removeStatus !== 'function') {
                return null;
            }

            const mode = options.mode === 'consumed' ? 'consumed' : 'cleared';
            const status = getStatus(unit, statusId);
            if (!status) {
                return null;
            }

            removeStatus(unit, statusId);
            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, mode === 'consumed' ? 'status_consumed' : 'status_expired', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId,
                });
            }
            triggerStatusLifecycleHook(targetBattle, unit, mode === 'consumed' ? 'statusConsumed' : 'statusExpired', statusId, {
                status: { ...status },
            });
            return status;
        }

        function ensureUnitRuntimeState(unit) {
            if (!unit || typeof unit !== 'object') {
                return null;
            }
            if (!unit.runtimeState || typeof unit.runtimeState !== 'object' || Array.isArray(unit.runtimeState)) {
                unit.runtimeState = {};
            }
            if (!unit.runtimeState.flags || typeof unit.runtimeState.flags !== 'object' || Array.isArray(unit.runtimeState.flags)) {
                unit.runtimeState.flags = {};
            }
            if (!unit.runtimeState.counters || typeof unit.runtimeState.counters !== 'object' || Array.isArray(unit.runtimeState.counters)) {
                unit.runtimeState.counters = {};
            }
            return unit.runtimeState;
        }

        function ensureUnitResources(unit) {
            if (!unit || typeof unit !== 'object') {
                return null;
            }
            if (!unit.resources || typeof unit.resources !== 'object' || Array.isArray(unit.resources)) {
                unit.resources = {};
            }
            return unit.resources;
        }

        function ensureBattleRuntimeState(targetBattle) {
            if (!targetBattle || typeof targetBattle !== 'object') {
                return null;
            }
            if (!targetBattle.runtimeState || typeof targetBattle.runtimeState !== 'object' || Array.isArray(targetBattle.runtimeState)) {
                targetBattle.runtimeState = {};
            }
            if (typeof targetBattle.wave !== 'number' || !Number.isFinite(targetBattle.wave)) {
                targetBattle.wave = 1;
            }
            const ensureSideMap = (field) => {
                const runtimeState = targetBattle.runtimeState;
                if (!runtimeState[field] || typeof runtimeState[field] !== 'object' || Array.isArray(runtimeState[field])) {
                    runtimeState[field] = {};
                }
                ['player', 'enemy'].forEach((side) => {
                    if (!runtimeState[field][side] || typeof runtimeState[field][side] !== 'object' || Array.isArray(runtimeState[field][side])) {
                        runtimeState[field][side] = {};
                    }
                });
            };
            ensureSideMap('resonanceBySide');
            ensureSideMap('absoluteResonanceBySide');
            ensureSideMap('resonanceBonusBySide');
            ensureSideMap('absoluteResonanceBonusBySide');
            return targetBattle.runtimeState;
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

        function resolveStatusScalar(runtime, effect, numericField, amountField) {
            if (effect?.[amountField] != null) {
                return resolveEffectAmount(runtime, { amount: effect[amountField] });
            }

            return typeof effect?.[numericField] === 'number'
                ? effect[numericField]
                : 0;
        }

        function clampCombinedStatusValues(status, potency, count, options = {}) {
            const combinedMax = status?.stackModel?.combinedMax;
            if (typeof combinedMax !== 'number' || !Number.isFinite(combinedMax) || combinedMax < 0) {
                return {
                    potency,
                    count,
                };
            }

            let nextPotency = potency;
            let nextCount = count;
            const overflow = Math.max(0, (nextPotency + nextCount) - combinedMax);
            if (overflow <= 0) {
                return {
                    potency: nextPotency,
                    count: nextCount,
                };
            }

            const preferredBucket = options.preferredBucket === 'potency' ? 'potency' : 'count';
            if (preferredBucket === 'potency') {
                nextPotency = Math.max(0, nextPotency - overflow);
                if ((nextPotency + nextCount) > combinedMax) {
                    nextCount = Math.max(0, combinedMax - nextPotency);
                }
            } else {
                nextCount = Math.max(0, nextCount - overflow);
                if ((nextPotency + nextCount) > combinedMax) {
                    nextPotency = Math.max(0, combinedMax - nextCount);
                }
            }

            return {
                potency: nextPotency,
                count: nextCount,
            };
        }

        function adjustUnitStatus(targetBattle, unit, effect, runtime) {
            if (!unit || !effect.statusId || typeof getStatus !== 'function' || typeof removeStatus !== 'function') {
                return;
            }

            const potencyDelta = resolveStatusScalar(runtime, effect, 'potencyDelta', 'potencyAmount');
            const countDelta = resolveStatusScalar(runtime, effect, 'countDelta', 'countAmount');
            const potencyOperation = effect.potencyOperation || 'add';
            const countOperation = effect.countOperation || 'add';
            const existing = getStatus(unit, effect.statusId);

            if (!existing) {
                const initialPotency = potencyOperation === 'set' ? potencyDelta : potencyDelta;
                const initialCount = countOperation === 'set' ? countDelta : countDelta;

                if (initialPotency <= 0 && initialCount <= 0) {
                    return;
                }

                const appliedStatus = applyStatus(targetBattle, unit, effect.statusId, {
                    potency: typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(effect.statusId)
                        ? 0
                        : Math.max(0, Math.round(initialPotency)),
                    count: Math.max(0, Math.floor(initialCount)),
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
                    ? clampStatusValue(
                        Math.round(potencyOperation === 'set' ? potencyDelta : previousPotency + potencyDelta),
                        existing?.stackModel?.potency?.max ?? 99,
                    )
                    : Math.max(0, previousPotency + potencyDelta));
            const nextCount = typeof clampStatusValue === 'function'
                ? clampStatusValue(
                    Math.floor(countOperation === 'set' ? countDelta : previousCount + countDelta),
                    existing?.stackModel?.count?.max ?? 99,
                )
                : Math.max(0, previousCount + countDelta);
            const clampedValues = clampCombinedStatusValues(existing, nextPotency, nextCount, {
                preferredBucket: countDelta > 0 && potencyDelta <= 0 ? 'count' : 'potency',
            });

            existing.potency = clampedValues.potency;
            existing.count = clampedValues.count;
            if (typeof emitEvent === 'function') {
                emitEvent(targetBattle, 'status_changed', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId: effect.statusId,
                    previousPotency,
                    previousCount,
                    nextPotency: existing.potency,
                    nextCount: existing.count,
                });
            }
            triggerStatusLifecycleHook(targetBattle, unit, 'statusChanged', effect.statusId, {
                status: existing,
                previousPotency,
                previousCount,
                nextPotency: existing.potency,
                nextCount: existing.count,
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
            if (effect.selector === 'firstLivingAlly' && typeof getSlotsForSide === 'function') {
                const slots = getSlotsForSide(targetBattle, actingSlot.side)
                    .filter((slot) => slot && slot.id !== actingSlot.id)
                    .filter((slot) => (typeof isSlotAlive === 'function' ? isSlotAlive(targetBattle, slot) : true));
                if (slots.length) {
                    return slots[0].id;
                }
                return actingSlot.id;
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
            const runtimeState = runtime && typeof runtime === 'object' ? runtime : {};
            const effectList = Array.isArray(effects) ? effects : [];
            effectList.forEach((effect) => {
                if (runtimeState.abortEffects) {
                    return;
                }
                const sourceUnit = getRuntimeSourceUnit(runtime);
                const targetUnits = getEffectTargetUnits(targetBattle, runtime, effect.target || 'opponent');
                const targetUnit = targetUnits[0] || null;
                const context = runtime?.healContext
                    ? runtime.healContext
                    : (runtime?.damageContext
                        ? runtime.damageContext
                        : (runtime.defendContext
                            && runtime?.unit
                            && runtime?.targetUnit
                            && runtime.unit.id === runtime.targetUnit.id
                            ? runtime.defendContext
                            : (runtime.attackContext || runtime.defendContext || null)));
                const skill = runtime?.skill || null;

                switch (effect.type) {
                case 'applyStatus':
                    if (!targetUnits.length || !effect.statusId || typeof applyStatus !== 'function') {
                        return;
                    }
                    {
                        const applyingUnit = runtime?.unit || runtime?.sourceUnit || null;
                        const resolvedTargets = (() => {
                            const filtered = effect.excludeSelf && applyingUnit
                                ? targetUnits.filter((entry) => entry.id !== applyingUnit.id)
                                : [...targetUnits];
                            if (effect.prioritizeStatusId && typeof getStatusPotency === 'function') {
                                const statusId = effect.prioritizeStatusId;
                                filtered.sort((left, right) => {
                                    const leftValue = getStatusPotency(left, statusId);
                                    const rightValue = getStatusPotency(right, statusId);
                                    return (effect.prioritizeOrder === 'desc' ? (rightValue - leftValue) : (leftValue - rightValue));
                                });
                            }
                            const maxTargets = effect.maxTargetsAmount != null
                                ? Math.floor(resolveEffectAmount(runtime, { value: 0, amount: effect.maxTargetsAmount }))
                                : (typeof effect.maxTargets === 'number' ? Math.floor(effect.maxTargets) : null);
                            if (typeof maxTargets === 'number' && Number.isFinite(maxTargets)) {
                                if (maxTargets <= 0) {
                                    return [];
                                }
                                return filtered.slice(0, maxTargets);
                            }
                            return filtered;
                        })();

                        const payload = {
                            potency: effect.potencyAmount != null
                                ? Math.round(resolveStatusScalar(runtime, effect, 'potency', 'potencyAmount'))
                                : effect.potency,
                            count: effect.countAmount != null
                                ? Math.floor(resolveStatusScalar(runtime, effect, 'count', 'countAmount'))
                                : effect.count,
                        };

                        resolvedTargets.forEach((resolvedTarget) => {
                            if (!resolvedTarget) {
                                return;
                            }
                            applyStatus(targetBattle, resolvedTarget, effect.statusId, payload);
                            if (sourceUnit && typeof invokeHooks === 'function') {
                                invokeHooks(sourceUnit, 'statusInflicted', {
                                    battle: targetBattle,
                                    unit: sourceUnit,
                                    opponent: resolvedTarget,
                                    skill,
                                    statusId: effect.statusId,
                                });
                            }
                            if (typeof invokeHooks === 'function') {
                                invokeHooks(resolvedTarget, 'statusReceived', {
                                    battle: targetBattle,
                                    unit: resolvedTarget,
                                    opponent: sourceUnit,
                                    skill,
                                    statusId: effect.statusId,
                                });
                            }
                        });
                    }
                    return;
                case 'queueStatus':
                    if (!targetUnits.length || !effect.statusId || typeof queueStatusForNextTurn !== 'function') {
                        return;
                    }
                    {
                        const applyingUnit = runtime?.unit || runtime?.sourceUnit || null;
                        const filteredTargets = effect.excludeSelf && applyingUnit
                            ? targetUnits.filter((entry) => entry.id !== applyingUnit.id)
                            : [...targetUnits];
                        const maxTargets = effect.maxTargetsAmount != null
                            ? Math.floor(resolveEffectAmount(runtime, { value: 0, amount: effect.maxTargetsAmount }))
                            : (typeof effect.maxTargets === 'number' ? Math.floor(effect.maxTargets) : null);
                        const resolvedTargets = typeof maxTargets === 'number' && Number.isFinite(maxTargets)
                            ? filteredTargets.slice(0, Math.max(0, maxTargets))
                            : filteredTargets;
                        const payload = {
                            potency: effect.potencyAmount != null
                                ? Math.round(resolveStatusScalar(runtime, effect, 'potency', 'potencyAmount'))
                                : effect.potency,
                            count: effect.countAmount != null
                                ? Math.floor(resolveStatusScalar(runtime, effect, 'count', 'countAmount'))
                                : effect.count,
                        };
                        resolvedTargets.forEach((resolvedTarget) => {
                            if (!resolvedTarget) {
                                return;
                            }
                            queueStatusForNextTurn(resolvedTarget, effect.statusId, payload);
                        });
                    }
                    return;
                case 'dealFixedDamage':
                    if (!targetUnit || typeof applyFixedDamage !== 'function') {
                        return;
                    }
                    applyFixedDamage(targetBattle, targetUnit, effect.statusId || 'effect', resolveEffectAmount(runtime, effect));
                    return;
                case 'dealHpPercentDamage':
                    if (!targetUnit || typeof applyFixedDamage !== 'function') {
                        return;
                    }
                    {
                        const percent = normalizePercentConditionValue(resolveEffectAmount(runtime, effect));
                        const resolvedPercent = typeof percent === 'number' && Number.isFinite(percent)
                            ? Math.max(0, percent)
                            : 0;
                        const damageAmount = Math.max(0, Math.round((targetUnit.maxHp || 0) * resolvedPercent));
                        applyFixedDamage(targetBattle, targetUnit, effect.statusId || 'effect', damageAmount);
                    }
                    return;
                case 'endBattle':
                    if (!targetBattle || targetBattle.winner) {
                        return;
                    }
                    {
                        const winner = effect.winner === 'player' || effect.winner === 'enemy' || effect.winner === 'draw'
                            ? effect.winner
                            : 'draw';
                        const engineActions = targetBattle.engineActions;
                        if (engineActions && typeof engineActions.endBattle === 'function') {
                            engineActions.endBattle(winner, { reason: effect.reason || skill?.name || null });
                        } else {
                            targetBattle.phase = 'ended';
                            targetBattle.winner = winner;
                            if (typeof emitEvent === 'function') {
                                emitEvent(targetBattle, 'battle_ended', {
                                    winner,
                                    winnerName: winner === 'player' ? 'Player' : (winner === 'enemy' ? 'Enemy' : 'Draw'),
                                    reason: effect.reason || null,
                                });
                            }
                        }
                    }
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
                                reason: effect.reason || skill?.name || effect.statusId || effect.type,
                            });
                        }
                    }
                    return;
                case 'setSanity':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const resolvedValue = Math.round(resolveEffectAmount(runtime, effect));
                        const previousSp = targetUnit.sp;
                        targetUnit.sp = Math.max(-45, Math.min(45, resolvedValue));
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'sanity_changed', {
                                unitName: targetUnit.name,
                                previousSp,
                                nextSp: targetUnit.sp,
                                reason: effect.reason || skill?.name || effect.statusId || effect.type,
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
                        return;
                    }
                    if (effect.operation === 'addSpeedDifferenceScaled') {
                        const sourceUnit = getRuntimeSourceUnit(runtime);
                        const targetUnit = getRuntimeTargetUnit(runtime);
                        if (!sourceUnit || !targetUnit) {
                            return;
                        }
                        const speedDifference = Math.max(0, (sourceUnit.speed || 0) - (targetUnit.speed || 0));
                        if (speedDifference < (effect.minDifference || 0)) {
                            return;
                        }
                        const bonus = typeof effect.cap === 'number'
                            ? Math.min(effect.cap, speedDifference * (effect.multiplier || 0))
                            : speedDifference * (effect.multiplier || 0);
                        context[effect.field] = (context[effect.field] || 0) + bonus;
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
                case 'healHpPercent':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const percent = normalizePercentConditionValue(resolveEffectAmount(runtime, effect));
                        const rawHealAmount = Math.max(0, Math.round((targetUnit.maxHp || 0) * Math.max(0, percent || 0)));
                        const healContext = {
                            healingMultiplier: 1,
                            healingFlatBonus: 0,
                        };
                        if (typeof invokeHooks === 'function') {
                            invokeHooks(targetUnit, 'beforeHeal', {
                                battle: targetBattle,
                                unit: targetUnit,
                                sourceUnit,
                                opponent: sourceUnit,
                                targetUnit,
                                skill,
                                healContext,
                                healAmount: rawHealAmount,
                            });
                            if (sourceUnit && sourceUnit.id !== targetUnit.id) {
                                invokeHooks(sourceUnit, 'beforeHeal', {
                                    battle: targetBattle,
                                    unit: sourceUnit,
                                    sourceUnit,
                                    opponent: targetUnit,
                                    targetUnit,
                                    skill,
                                    healContext,
                                    healAmount: rawHealAmount,
                                });
                            }
                        }
                        const resolvedMultiplier = typeof healContext.healingMultiplier === 'number' && Number.isFinite(healContext.healingMultiplier)
                            ? healContext.healingMultiplier
                            : 1;
                        const resolvedFlat = typeof healContext.healingFlatBonus === 'number' && Number.isFinite(healContext.healingFlatBonus)
                            ? healContext.healingFlatBonus
                            : 0;
                        const healAmount = Math.max(0, Math.round((rawHealAmount * resolvedMultiplier) + resolvedFlat));
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
                        if (typeof invokeHooks === 'function') {
                            invokeHooks(targetUnit, 'afterHeal', {
                                battle: targetBattle,
                                unit: targetUnit,
                                sourceUnit,
                                opponent: sourceUnit,
                                targetUnit,
                                skill,
                                healContext,
                                healAmount,
                                previousHp,
                                nextHp: targetUnit.hp,
                            });
                            if (sourceUnit && sourceUnit.id !== targetUnit.id) {
                                invokeHooks(sourceUnit, 'afterHeal', {
                                    battle: targetBattle,
                                    unit: sourceUnit,
                                    sourceUnit,
                                    opponent: targetUnit,
                                    targetUnit,
                                    skill,
                                    healContext,
                                    healAmount,
                                    previousHp,
                                    nextHp: targetUnit.hp,
                                });
                            }
                        }
                    }
                    return;
                case 'healHp':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const rawHealAmount = Math.max(0, Math.round(resolveEffectAmount(runtime, effect)));
                        const healContext = {
                            healingMultiplier: 1,
                            healingFlatBonus: 0,
                        };
                        if (typeof invokeHooks === 'function') {
                            invokeHooks(targetUnit, 'beforeHeal', {
                                battle: targetBattle,
                                unit: targetUnit,
                                sourceUnit,
                                opponent: sourceUnit,
                                targetUnit,
                                skill,
                                healContext,
                                healAmount: rawHealAmount,
                            });
                            if (sourceUnit && sourceUnit.id !== targetUnit.id) {
                                invokeHooks(sourceUnit, 'beforeHeal', {
                                    battle: targetBattle,
                                    unit: sourceUnit,
                                    sourceUnit,
                                    opponent: targetUnit,
                                    targetUnit,
                                    skill,
                                    healContext,
                                    healAmount: rawHealAmount,
                                });
                            }
                        }
                        const resolvedMultiplier = typeof healContext.healingMultiplier === 'number' && Number.isFinite(healContext.healingMultiplier)
                            ? healContext.healingMultiplier
                            : 1;
                        const resolvedFlat = typeof healContext.healingFlatBonus === 'number' && Number.isFinite(healContext.healingFlatBonus)
                            ? healContext.healingFlatBonus
                            : 0;
                        const healAmount = Math.max(0, Math.round((rawHealAmount * resolvedMultiplier) + resolvedFlat));
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
                        if (typeof invokeHooks === 'function') {
                            invokeHooks(targetUnit, 'afterHeal', {
                                battle: targetBattle,
                                unit: targetUnit,
                                sourceUnit,
                                opponent: sourceUnit,
                                targetUnit,
                                skill,
                                healContext,
                                healAmount,
                                previousHp,
                                nextHp: targetUnit.hp,
                            });
                            if (sourceUnit && sourceUnit.id !== targetUnit.id) {
                                invokeHooks(sourceUnit, 'afterHeal', {
                                    battle: targetBattle,
                                    unit: sourceUnit,
                                    sourceUnit,
                                    opponent: targetUnit,
                                    targetUnit,
                                    skill,
                                    healContext,
                                    healAmount,
                                    previousHp,
                                    nextHp: targetUnit.hp,
                                });
                            }
                        }
                    }
                    return;
                case 'adjustStatus':
                    if (!targetUnit) {
                        return;
                    }
                    adjustUnitStatus(targetBattle, targetUnit, effect, runtime);
                    return;
                case 'clearStatus':
                    if (!effect.statusId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        clearUnitStatus(targetBattle, unit, effect.statusId, { mode: 'cleared' });
                    });
                    return;
                case 'clearStatusesByTag':
                case 'consumeStatusesByTag':
                    if (!Array.isArray(effect.tags) || !effect.tags.length) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const statuses = Array.isArray(unit.statuses) ? [...unit.statuses] : [];
                        statuses.forEach((status) => {
                            if (!status?.id) {
                                return;
                            }
                            if (!statusMatchesTags(status.id, effect.tags, effect.match)) {
                                return;
                            }
                            clearUnitStatus(targetBattle, unit, status.id, { mode: effect.type === 'consumeStatusesByTag' ? 'consumed' : 'cleared' });
                        });
                    });
                    return;
                case 'copyStatus':
                case 'transferStatus':
                    if (!effect.statusId) {
                        return;
                    }
                    {
                        const sourceTarget = effect.sourceTarget || 'self';
                        const sourceUnitForCopy = getEffectTargetUnit(runtime, sourceTarget);
                        if (!sourceUnitForCopy || typeof getStatus !== 'function' || typeof applyStatus !== 'function') {
                            return;
                        }
                        const sourceStatus = getStatus(sourceUnitForCopy, effect.statusId);
                        if (!sourceStatus) {
                            return;
                        }
                        const destinationStatusId = effect.asStatusId || effect.statusId;
                        targetUnits.forEach((unit) => {
                            if (!unit) {
                                return;
                            }
                            if (effect.operation === 'set') {
                                clearUnitStatus(targetBattle, unit, destinationStatusId, { mode: 'cleared' });
                            }
                            applyStatus(targetBattle, unit, destinationStatusId, {
                                potency: typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(destinationStatusId)
                                    ? 0
                                    : (sourceStatus.potency || 0),
                                count: sourceStatus.count || 0,
                            });
                        });
                        if (effect.type === 'transferStatus') {
                            clearUnitStatus(targetBattle, sourceUnitForCopy, effect.statusId, { mode: 'cleared' });
                        }
                    }
                    return;
                case 'convertStatus':
                    if (!targetUnits.length || !effect.fromStatusId || !effect.toStatusId || typeof getStatus !== 'function' || typeof applyStatus !== 'function') {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const fromStatus = getStatus(unit, effect.fromStatusId);
                        if (!fromStatus) {
                            return;
                        }
                        clearUnitStatus(targetBattle, unit, effect.fromStatusId, { mode: 'cleared' });
                        applyStatus(targetBattle, unit, effect.toStatusId, {
                            potency: typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(effect.toStatusId)
                                ? 0
                                : (fromStatus.potency || 0),
                            count: fromStatus.count || 0,
                        });
                    });
                    return;
                case 'multiplyStatus':
                    if (!targetUnits.length || !effect.statusId || typeof getStatus !== 'function') {
                        return;
                    }
                    {
                        const rounding = effect.rounding === 'floor'
                            ? 'floor'
                            : (effect.rounding === 'ceil' ? 'ceil' : 'round');
                        const applyRounding = (value) => {
                            if (rounding === 'floor') {
                                return Math.floor(value);
                            }
                            if (rounding === 'ceil') {
                                return Math.ceil(value);
                            }
                            return Math.round(value);
                        };
                        targetUnits.forEach((unit) => {
                            if (!unit) {
                                return;
                            }
                            const status = getStatus(unit, effect.statusId);
                            if (!status) {
                                return;
                            }
                            const previousPotency = status.potency || 0;
                            const previousCount = status.count || 0;
                            const potencyMultiplier = typeof effect.potencyMultiplier === 'number' ? effect.potencyMultiplier : 1;
                            const countMultiplier = typeof effect.countMultiplier === 'number' ? effect.countMultiplier : 1;
                            const nextPotency = typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(effect.statusId)
                                ? 0
                                : (typeof clampStatusValue === 'function'
                                    ? clampStatusValue(applyRounding(previousPotency * potencyMultiplier), status?.stackModel?.potency?.max ?? 99)
                                    : Math.max(0, applyRounding(previousPotency * potencyMultiplier)));
                            const nextCount = typeof clampStatusValue === 'function'
                                ? clampStatusValue(applyRounding(previousCount * countMultiplier), status?.stackModel?.count?.max ?? 99)
                                : Math.max(0, applyRounding(previousCount * countMultiplier));
                            const clampedValues = clampCombinedStatusValues(status, nextPotency, nextCount);
                            status.potency = clampedValues.potency;
                            status.count = clampedValues.count;
                            if (typeof emitEvent === 'function') {
                                emitEvent(targetBattle, 'status_changed', {
                                    unitId: unit.id,
                                    unitName: unit.name,
                                    statusId: effect.statusId,
                                    previousPotency,
                                    previousCount,
                                    nextPotency: status.potency,
                                    nextCount: status.count,
                                });
                            }
                            triggerStatusLifecycleHook(targetBattle, unit, 'statusChanged', effect.statusId, {
                                status,
                                previousPotency,
                                previousCount,
                                nextPotency: status.potency,
                                nextCount: status.count,
                            });
                            if (shouldExpireStatus(status, effect.statusId)) {
                                clearUnitStatus(targetBattle, unit, effect.statusId, { mode: 'cleared' });
                            }
                        });
                    }
                    return;
                case 'splitStatus':
                    if (!effect.statusId || typeof getStatus !== 'function' || typeof applyStatus !== 'function') {
                        return;
                    }
                    {
                        const sourceTarget = effect.sourceTarget || 'self';
                        const sourceUnitForSplit = getEffectTargetUnit(runtime, sourceTarget);
                        if (!sourceUnitForSplit) {
                            return;
                        }
                        if (!targetUnits.length) {
                            return;
                        }
                        const sourceStatus = getStatus(sourceUnitForSplit, effect.statusId);
                        if (!sourceStatus) {
                            return;
                        }
                        const recipients = [...targetUnits];
                        const totalPotency = sourceStatus.potency || 0;
                        const totalCount = sourceStatus.count || 0;
                        const recipientCount = recipients.length;
                        const basePotency = recipientCount > 0 ? Math.floor(totalPotency / recipientCount) : 0;
                        const potencyRemainder = recipientCount > 0 ? (totalPotency % recipientCount) : 0;
                        const baseCount = recipientCount > 0 ? Math.floor(totalCount / recipientCount) : 0;
                        const countRemainder = recipientCount > 0 ? (totalCount % recipientCount) : 0;
                        clearUnitStatus(targetBattle, sourceUnitForSplit, effect.statusId, { mode: 'cleared' });
                        recipients.forEach((unit, index) => {
                            if (!unit) {
                                return;
                            }
                            const potency = basePotency + (index < potencyRemainder ? 1 : 0);
                            const count = baseCount + (index < countRemainder ? 1 : 0);
                            if (potency <= 0 && count <= 0) {
                                return;
                            }
                            applyStatus(targetBattle, unit, effect.statusId, {
                                potency: typeof isCountOnlyStatus === 'function' && isCountOnlyStatus(effect.statusId)
                                    ? 0
                                    : potency,
                                count,
                            });
                        });
                    }
                    return;
                case 'adjustUnitResource':
                    if (!effect.resourceId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const resources = ensureUnitResources(unit);
                        if (!resources) {
                            return;
                        }
                        const previousValue = typeof resources[effect.resourceId] === 'number' && Number.isFinite(resources[effect.resourceId])
                            ? resources[effect.resourceId]
                            : 0;
                        const delta = resolveEffectAmount(runtime, effect);
                        const nextRaw = effect.operation === 'set'
                            ? delta
                            : previousValue + delta;
                        const min = typeof effect.min === 'number' && Number.isFinite(effect.min) ? effect.min : null;
                        const max = typeof effect.max === 'number' && Number.isFinite(effect.max) ? effect.max : null;
                        const nextClamped = max != null
                            ? Math.min(max, min != null ? Math.max(min, nextRaw) : nextRaw)
                            : (min != null ? Math.max(min, nextRaw) : nextRaw);
                        resources[effect.resourceId] = nextClamped;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_resource_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                resourceId: effect.resourceId,
                                previousValue,
                                nextValue: nextClamped,
                                reason: effect.reason || skill?.name || effect.resourceId,
                            });
                        }
                    });
                    return;
                case 'setFlag':
                    if (!effect.flagId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        const nextValue = effect.value ?? true;
                        runtimeState.flags[effect.flagId] = Boolean(nextValue);
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_flag_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                flagId: effect.flagId,
                                value: runtimeState.flags[effect.flagId],
                            });
                        }
                    });
                    return;
                case 'clearFlag':
                    if (!effect.flagId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        delete runtimeState.flags[effect.flagId];
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_flag_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                flagId: effect.flagId,
                                value: false,
                            });
                        }
                    });
                    return;
                case 'adjustCounter':
                    if (!effect.counterId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        const counters = runtimeState.counters;
                        const previousValue = typeof counters[effect.counterId] === 'number' && Number.isFinite(counters[effect.counterId])
                            ? counters[effect.counterId]
                            : 0;
                        const delta = resolveEffectAmount(runtime, effect);
                        const nextRaw = effect.operation === 'set'
                            ? delta
                            : previousValue + delta;
                        const min = typeof effect.min === 'number' && Number.isFinite(effect.min) ? effect.min : null;
                        const max = typeof effect.max === 'number' && Number.isFinite(effect.max) ? effect.max : null;
                        const nextClamped = max != null
                            ? Math.min(max, min != null ? Math.max(min, nextRaw) : nextRaw)
                            : (min != null ? Math.max(min, nextRaw) : nextRaw);
                        counters[effect.counterId] = nextClamped;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_counter_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                counterId: effect.counterId,
                                previousValue,
                                nextValue: nextClamped,
                            });
                        }
                    });
                    return;
                case 'setPanicState':
                    if (!effect.stateId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        runtimeState.panicStateId = effect.stateId;
                        if (effect.amount != null || effect.value != null) {
                            const nextValue = effect.amount != null
                                ? resolveEffectAmount(runtime, effect)
                                : effect.value;
                            runtimeState.panicValue = typeof nextValue === 'number' && Number.isFinite(nextValue)
                                ? nextValue
                                : 0;
                        } else if (typeof runtimeState.panicValue !== 'number' || !Number.isFinite(runtimeState.panicValue)) {
                            runtimeState.panicValue = 0;
                        }
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_panic_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                panicStateId: runtimeState.panicStateId,
                                panicValue: runtimeState.panicValue,
                            });
                        }
                    });
                    return;
                case 'clearPanicState':
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        delete runtimeState.panicStateId;
                        delete runtimeState.panicValue;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_panic_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                panicStateId: null,
                                panicValue: 0,
                            });
                        }
                    });
                    return;
                case 'adjustPanicValue':
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const runtimeState = ensureUnitRuntimeState(unit);
                        if (!runtimeState) {
                            return;
                        }
                        const previousValue = typeof runtimeState.panicValue === 'number' && Number.isFinite(runtimeState.panicValue)
                            ? runtimeState.panicValue
                            : 0;
                        const delta = resolveEffectAmount(runtime, effect);
                        const nextRaw = effect.operation === 'set'
                            ? delta
                            : previousValue + delta;
                        const min = typeof effect.min === 'number' && Number.isFinite(effect.min) ? effect.min : null;
                        const max = typeof effect.max === 'number' && Number.isFinite(effect.max) ? effect.max : null;
                        const nextClamped = max != null
                            ? Math.min(max, min != null ? Math.max(min, nextRaw) : nextRaw)
                            : (min != null ? Math.max(min, nextRaw) : nextRaw);
                        runtimeState.panicValue = nextClamped;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_panic_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                panicStateId: runtimeState.panicStateId || null,
                                previousValue,
                                panicValue: nextClamped,
                            });
                        }
                    });
                    return;
                case 'adjustCoinCount':
                    if (!context) {
                        return;
                    }
                    {
                        const delta = resolveEffectAmount(runtime, effect);
                        const previousValue = typeof context.coinCountBonus === 'number' && Number.isFinite(context.coinCountBonus)
                            ? context.coinCountBonus
                            : 0;
                        context.coinCountBonus = effect.operation === 'set'
                            ? Math.round(delta)
                            : previousValue + Math.round(delta);
                    }
                    return;
                case 'forceCoinOutcome':
                    if (!context || !effect.coinOutcome) {
                        return;
                    }
                    {
                        if (!context.forcedCoinOutcomeByCoin || typeof context.forcedCoinOutcomeByCoin !== 'object' || Array.isArray(context.forcedCoinOutcomeByCoin)) {
                            context.forcedCoinOutcomeByCoin = {};
                        }
                        const operation = effect.operation || 'set';
                        if (typeof effect.coinIndex === 'number') {
                            if (operation === 'clear') {
                                delete context.forcedCoinOutcomeByCoin[effect.coinIndex];
                            } else {
                                context.forcedCoinOutcomeByCoin[effect.coinIndex] = effect.coinOutcome;
                            }
                        } else if (operation === 'clear') {
                            context.forcedCoinOutcome = null;
                        } else {
                            context.forcedCoinOutcome = effect.coinOutcome;
                        }
                    }
                    return;
                case 'grantCoinReroll':
                    if (!context) {
                        return;
                    }
                    {
                        const delta = Math.max(0, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousValue = typeof context.rerollTailsRemaining === 'number' && Number.isFinite(context.rerollTailsRemaining)
                            ? context.rerollTailsRemaining
                            : 0;
                        context.rerollTailsRemaining = previousValue + delta;
                    }
                    return;
                case 'reuseCoins':
                    if (!context) {
                        return;
                    }
                    {
                        const delta = Math.max(0, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousValue = typeof context.remainingCoinBonus === 'number' && Number.isFinite(context.remainingCoinBonus)
                            ? context.remainingCoinBonus
                            : 0;
                        context.remainingCoinBonus = previousValue + delta;
                    }
                    return;
                case 'breakCoins':
                    if (!context) {
                        return;
                    }
                    {
                        const delta = Math.max(0, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousValue = typeof context.remainingCoinBonus === 'number' && Number.isFinite(context.remainingCoinBonus)
                            ? context.remainingCoinBonus
                            : 0;
                        context.remainingCoinBonus = previousValue - delta;
                    }
                    return;
                case 'setDamageCap':
                    if (!context) {
                        return;
                    }
                    {
                        const operation = effect.operation === 'clear' ? 'clear' : 'set';
                        const resolvedAmount = effect.amount != null ? resolveEffectAmount(runtime, effect) : effect.value;
                        const capValue = typeof resolvedAmount === 'number' && Number.isFinite(resolvedAmount)
                            ? Math.max(0, Math.round(resolvedAmount))
                            : 0;
                        if (typeof effect.coinIndex === 'number') {
                            if (!context.damageCapByCoin || typeof context.damageCapByCoin !== 'object' || Array.isArray(context.damageCapByCoin)) {
                                context.damageCapByCoin = {};
                            }
                            if (operation === 'clear') {
                                delete context.damageCapByCoin[effect.coinIndex];
                            } else {
                                context.damageCapByCoin[effect.coinIndex] = capValue;
                            }
                        } else {
                            context.damageCap = operation === 'clear' ? null : capValue;
                        }
                    }
                    return;
                case 'chooseRandomActions':
                case 'chooseWeightedActions':
                    if (!Array.isArray(effect.branches) || !effect.branches.length) {
                        return;
                    }
                    {
                        const branches = effect.branches.filter((branch) => branch && typeof branch === 'object' && !Array.isArray(branch));
                        if (!branches.length) {
                            return;
                        }
                        const selectedBranch = effect.type === 'chooseWeightedActions'
                            ? (() => {
                                const totalWeight = branches.reduce((sum, branch) => sum + (typeof branch.weight === 'number' && Number.isFinite(branch.weight) ? Math.max(0, branch.weight) : 0), 0);
                                if (totalWeight <= 0) {
                                    return branches[0];
                                }
                                const roll = (Math.random() || 0) * totalWeight;
                                let running = 0;
                                for (const branch of branches) {
                                    running += typeof branch.weight === 'number' && Number.isFinite(branch.weight) ? Math.max(0, branch.weight) : 0;
                                    if (roll <= running) {
                                        return branch;
                                    }
                                }
                                return branches[branches.length - 1];
                            })()
                            : (() => {
                                const index = Math.floor((Math.random() || 0) * branches.length);
                                return branches[Math.max(0, Math.min(branches.length - 1, index))];
                            })();
                        if (selectedBranch && Array.isArray(selectedBranch.actions) && selectedBranch.actions.length) {
                            applyEffects(targetBattle, selectedBranch.actions, runtimeState);
                        }
                    }
                    return;
                case 'abortEffects':
                    runtimeState.abortEffects = true;
                    return;
                case 'modifySpeed':
                    if (!targetUnit) {
                        return;
                    }
                    modifyUnitSpeed(targetBattle, targetUnit, effect, runtime);
                    return;
                case 'gainShield':
                    if (!targetUnit || typeof gainShield !== 'function' || !effect.shieldId) {
                        return;
                    }
                    gainShield(targetBattle, targetUnit, {
                        shieldId: effect.shieldId,
                        amount: resolveEffectAmount(runtime, effect),
                        operation: effect.operation || 'add',
                        stackSize: effect.stackSize,
                        expiresAt: effect.expiresAt,
                        linkedStatusId: effect.linkedStatusId,
                        linkedStatusCountDeltaOnBreak: effect.linkedStatusCountDeltaOnBreak,
                        reason: effect.reason || skill?.name || effect.shieldId,
                    });
                    return;
                case 'clearShield':
                    if (!targetUnit || typeof clearShield !== 'function' || !effect.shieldId) {
                        return;
                    }
                    clearShield(targetBattle, targetUnit, effect.shieldId, {
                        reason: effect.reason || skill?.name || effect.shieldId,
                    });
                    return;
                case 'adjustEncounterResource':
                    if (!effect.resourceId || typeof adjustEncounterResource !== 'function') {
                        return;
                    }
                    {
                        const scope = effect.scope === 'battle' ? 'battle' : 'unit';
                        const scopedUnit = scope === 'unit' ? (sourceUnit || runtime?.unit || null) : null;
                        adjustEncounterResource(
                            targetBattle,
                            effect.resourceId,
                            resolveEffectAmount(runtime, effect),
                            {
                                operation: effect.operation || 'add',
                                min: effect.min,
                                max: effect.max,
                                reason: effect.reason || skill?.name || effect.resourceId,
                                unit: scopedUnit,
                            },
                        );
                    }
                    return;
                case 'spendEncounterResource':
                    if (!effect.resourceId || typeof getEncounterResource !== 'function' || typeof adjustEncounterResource !== 'function') {
                        return;
                    }
                    {
                        const scope = effect.scope === 'battle' ? 'battle' : 'unit';
                        const scopedResourceId = scope === 'unit' && sourceUnit?.id
                            ? `${sourceUnit.id}:${effect.resourceId}`
                            : effect.resourceId;
                        const resolvedAmount = Math.max(0, resolveEffectAmount(runtime, effect));
                        const currentValue = getEncounterResource(targetBattle, scopedResourceId) || 0;
                        if (currentValue < resolvedAmount && effect.cancelIfInsufficient) {
                            if (context) {
                                context.cancelled = true;
                                context.cancelReason = `insufficient ${effect.resourceId}`;
                            }
                            if (typeof emitEvent === 'function' && sourceUnit && skill) {
                                emitEvent(targetBattle, 'skill_cancelled', {
                                    unitName: sourceUnit.name,
                                    skillName: skill.name,
                                    reason: `insufficient ${effect.resourceId}`,
                                });
                            }
                            return;
                        }
                        adjustEncounterResource(targetBattle, effect.resourceId, -resolvedAmount, {
                            operation: 'add',
                            min: 0,
                            reason: effect.reason || skill?.name || effect.resourceId,
                            unit: scope === 'unit' ? (sourceUnit || runtime?.unit || null) : null,
                        });
                    }
                    return;
                case 'spendUnitResource':
                    if (!effect.resourceId) {
                        return;
                    }
                    targetUnits.forEach((unit) => {
                        if (!unit) {
                            return;
                        }
                        const resources = ensureUnitResources(unit);
                        if (!resources) {
                            return;
                        }
                        const resolvedAmount = Math.max(0, resolveEffectAmount(runtime, effect));
                        const currentValue = typeof resources[effect.resourceId] === 'number' && Number.isFinite(resources[effect.resourceId])
                            ? resources[effect.resourceId]
                            : 0;
                        if (currentValue < resolvedAmount && effect.cancelIfInsufficient) {
                            if (context) {
                                context.cancelled = true;
                                context.cancelReason = `insufficient ${effect.resourceId}`;
                            }
                            if (typeof emitEvent === 'function' && sourceUnit && skill) {
                                emitEvent(targetBattle, 'skill_cancelled', {
                                    unitName: sourceUnit.name,
                                    skillName: skill.name,
                                    reason: `insufficient ${effect.resourceId}`,
                                });
                            }
                            return;
                        }
                        const nextValue = Math.max(0, currentValue - resolvedAmount);
                        resources[effect.resourceId] = nextValue;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_resource_changed', {
                                unitId: unit.id,
                                unitName: unit.name,
                                resourceId: effect.resourceId,
                                previousValue: currentValue,
                                nextValue,
                                reason: effect.reason || skill?.name || effect.resourceId,
                            });
                        }
                    });
                    return;
                case 'adjustResonance':
                    if (!effect.sinType) {
                        return;
                    }
                    {
                        const battleRuntimeState = ensureBattleRuntimeState(targetBattle);
                        if (!battleRuntimeState) {
                            return;
                        }
                        const selfSide = runtime?.unit?.side || 'player';
                        const resolvedSide = effect.side === 'enemy' || effect.side === 'player'
                            ? effect.side
                            : (effect.side === 'opponent' && typeof getOpposingSide === 'function'
                                ? getOpposingSide(selfSide)
                                : selfSide);
                        const resonanceBonus = battleRuntimeState.resonanceBonusBySide?.[resolvedSide] || {};
                        const previousValue = typeof resonanceBonus[effect.sinType] === 'number' && Number.isFinite(resonanceBonus[effect.sinType])
                            ? resonanceBonus[effect.sinType]
                            : 0;
                        const delta = resolveEffectAmount(runtime, effect);
                        const nextRaw = effect.operation === 'set'
                            ? delta
                            : previousValue + delta;
                        const min = typeof effect.min === 'number' && Number.isFinite(effect.min) ? effect.min : null;
                        const max = typeof effect.max === 'number' && Number.isFinite(effect.max) ? effect.max : null;
                        const nextClamped = max != null
                            ? Math.min(max, min != null ? Math.max(min, nextRaw) : nextRaw)
                            : (min != null ? Math.max(min, nextRaw) : nextRaw);
                        resonanceBonus[effect.sinType] = nextClamped;
                        battleRuntimeState.resonanceBonusBySide[resolvedSide] = resonanceBonus;

                        const currentResonance = battleRuntimeState.resonanceBySide?.[resolvedSide] || {};
                        const currentValue = typeof currentResonance[effect.sinType] === 'number' && Number.isFinite(currentResonance[effect.sinType])
                            ? currentResonance[effect.sinType]
                            : 0;
                        currentResonance[effect.sinType] = Math.max(0, Math.round(currentValue + (nextClamped - previousValue)));
                        battleRuntimeState.resonanceBySide[resolvedSide] = currentResonance;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'resonance_changed', {
                                side: resolvedSide,
                                sinType: effect.sinType,
                                previousValue,
                                nextValue: nextClamped,
                            });
                        }
                    }
                    return;
                case 'setWave':
                    {
                        const wave = Math.max(1, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousWave = typeof targetBattle.wave === 'number' && Number.isFinite(targetBattle.wave)
                            ? targetBattle.wave
                            : 1;
                        targetBattle.wave = wave;
                        ensureBattleRuntimeState(targetBattle);
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'wave_changed', {
                                previousWave,
                                nextWave: targetBattle.wave,
                            });
                        }
                    }
                    return;
                case 'spawnWave':
                    {
                        const wave = Math.max(1, Math.round(resolveEffectAmount(runtime, effect)));
                        const previousWave = typeof targetBattle.wave === 'number' && Number.isFinite(targetBattle.wave)
                            ? targetBattle.wave
                            : 1;
                        const engineActions = targetBattle.engineActions;
                        const spawned = engineActions && typeof engineActions.spawnWave === 'function'
                            ? engineActions.spawnWave(wave)
                            : false;
                        if (!spawned) {
                            targetBattle.wave = wave;
                            ensureBattleRuntimeState(targetBattle);
                        }
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'wave_changed', {
                                previousWave,
                                nextWave: targetBattle.wave,
                            });
                        }
                    }
                    return;
                case 'advanceWave':
                    {
                        const deltaRaw = resolveEffectAmount(runtime, effect);
                        const delta = Number.isFinite(deltaRaw) ? Math.round(deltaRaw) : 1;
                        const previousWave = typeof targetBattle.wave === 'number' && Number.isFinite(targetBattle.wave)
                            ? targetBattle.wave
                            : 1;
                        const engineActions = targetBattle.engineActions;
                        const advanced = engineActions && typeof engineActions.advanceWave === 'function'
                            ? engineActions.advanceWave(delta)
                            : false;
                        if (!advanced) {
                            targetBattle.wave = Math.max(1, previousWave + delta);
                            ensureBattleRuntimeState(targetBattle);
                        }
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'wave_changed', {
                                previousWave,
                                nextWave: targetBattle.wave,
                            });
                        }
                    }
                    return;
                case 'spawnReinforcement':
                    {
                        const engineActions = targetBattle.engineActions;
                        const side = effect.side === 'player' ? 'player' : 'enemy';
                        if (engineActions && typeof engineActions.spawnReinforcement === 'function') {
                            engineActions.spawnReinforcement(side, effect.unit);
                        }
                    }
                    return;
                case 'retargetSlot':
                    if (!effect.selector) {
                        return;
                    }
                    retargetSlot(targetBattle, runtime, effect);
                    return;
                case 'redirectDamage':
                    if (!context || !effect.selector) {
                        return;
                    }
                    {
                        const actingUnit = runtime?.unit || runtime?.targetUnit || targetUnit || null;
                        const actingSlot = actingUnit ? getSlotForUnit(targetBattle, actingUnit) : null;
                        const resolvedSlotId = resolveRetargetSlotId(targetBattle, actingSlot, runtime, effect);
                        if (resolvedSlotId) {
                            context.redirectDamageToSlotId = resolvedSlotId;
                        }
                    }
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
                case 'reviveUnit':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const previousHp = targetUnit.hp;
                        if ((targetUnit.hp || 0) <= 0) {
                            targetUnit.hp = 1;
                        }
                        if (typeof emitEvent === 'function' && targetUnit.hp !== previousHp) {
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
                case 'recoverStagger':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const previousLevel = targetUnit.staggerLevel || 0;
                        targetUnit.staggerLevel = 0;
                        targetUnit.staggerRecoverTurn = 0;
                        targetUnit.staggerTurnsRemaining = 0;
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_stagger_recovered', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                previousLevel,
                            });
                        }
                    }
                    return;
                case 'staggerUnit':
                    if (!targetUnit) {
                        return;
                    }
                    {
                        const targetSlot = getSlotForUnit(targetBattle, targetUnit);
                        targetUnit.staggerLevel = Math.max(1, targetUnit.staggerLevel || 0);
                        targetUnit.staggerRecoverTurn = Math.max(targetUnit.staggerRecoverTurn || 0, (targetBattle?.turn || 0) + 1);
                        targetUnit.staggerTurnsRemaining = Math.max(targetUnit.staggerTurnsRemaining || 0, 1);
                        if (targetSlot) {
                            targetSlot.speed = 0;
                            targetSlot.targetSlotId = null;
                            targetSlot.resolved = true;
                        }
                        if (typeof emitEvent === 'function') {
                            emitEvent(targetBattle, 'unit_staggered', {
                                unitId: targetUnit.id,
                                unitName: targetUnit.name,
                                staggerLevel: targetUnit.staggerLevel,
                                threshold: null,
                                previousHp: targetUnit.hp,
                                nextHp: targetUnit.hp,
                                sourceUnitId: sourceUnit?.id || null,
                                sourceUnitName: sourceUnit?.name || null,
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

        if (effect.headsOnly && !runtime.isHeads) {
            return false;
        }

        if (effect.tailsOnly && runtime.isHeads) {
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

    function skillHasExpectedTag(skill, expectedValue) {
        const skillTags = Array.isArray(skill?.tags) ? skill.tags : [];
        if (Array.isArray(expectedValue)) {
            return expectedValue.some((tag) => skillTags.includes(tag));
        }

        return skillTags.includes(expectedValue);
    }

    function normalizePercentConditionValue(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return value;
        }

        return value > 1 ? value / 100 : value;
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

    function conditionMatchesRuntime(condition, runtime, getStatus, getEncounterResource) {
        const conditionType = condition?.type;
        const conditionUnit = getHookConditionUnit(runtime, condition?.target || 'self');
        const conditionStatus = conditionUnit && condition?.statusId && typeof getStatus === 'function'
            ? getStatus(conditionUnit, condition.statusId)
            : null;
        const conditionValue = condition?.value;
        const getEncounterResourceValue = () => {
            if (!runtime?.battle || !condition?.resourceId || typeof getEncounterResource !== 'function') {
                return 0;
            }

            if (typeof condition.resourceId === 'string' && condition.resourceId.includes(':')) {
                return getEncounterResource(runtime.battle, condition.resourceId);
            }

            const encounterResources = runtime.battle.encounterResources && typeof runtime.battle.encounterResources === 'object'
                ? runtime.battle.encounterResources
                : null;
            const hasEncounterResourceKey = (key) => Boolean(encounterResources && Object.prototype.hasOwnProperty.call(encounterResources, key));
            if (condition.side) {
                const selfSide = runtime?.unit?.side || 'player';
                const opponentSide = selfSide === 'player' ? 'enemy' : 'player';
                const resolvedSide = condition.side === 'self'
                    ? selfSide
                    : (condition.side === 'opponent' ? opponentSide : condition.side);
                if (resolvedSide !== 'player' && resolvedSide !== 'enemy') {
                    return 0;
                }
                return getEncounterResource(runtime.battle, `${resolvedSide}:${condition.resourceId}`);
            }
            if (conditionUnit?.id) {
                const scopedResourceId = `${conditionUnit.id}:${condition.resourceId}`;
                if (hasEncounterResourceKey(scopedResourceId)) {
                    return getEncounterResource(runtime.battle, scopedResourceId);
                }
            }

            return getEncounterResource(runtime.battle, condition.resourceId);
        };

        switch (conditionType) {
        case 'always':
            return true;
        case 'damageAtLeast':
            return typeof runtime?.damage === 'number' && runtime.damage >= conditionValue;
        case 'damageSourceIs':
            return (runtime?.damageSource || 'skill') === (conditionValue ?? 'skill');
        case 'hasStatus':
            return Boolean(conditionStatus) && ((conditionStatus.count || 0) > 0 || (conditionStatus.potency || 0) > 0);
        case 'statusPotencyAtLeast':
            return (conditionStatus?.potency || 0) >= conditionValue;
        case 'statusPotencyAtOrBelow':
            return (conditionStatus?.potency || 0) <= conditionValue;
        case 'statusCountAtLeast':
            return (conditionStatus?.count || 0) >= conditionValue;
        case 'statusCountAtOrBelow':
            return (conditionStatus?.count || 0) <= conditionValue;
        case 'statusCountGreaterThanStatus':
        {
            if (!condition?.statusId || !condition?.otherStatusId || typeof getStatus !== 'function') {
                return false;
            }
            const leftUnit = getHookConditionUnit(runtime, condition?.target || 'self');
            const rightUnit = getHookConditionUnit(runtime, condition?.otherTarget || condition?.target || 'self');
            const leftCount = getStatus(leftUnit, condition.statusId)?.count || 0;
            const rightCount = getStatus(rightUnit, condition.otherStatusId)?.count || 0;
            return leftCount > (rightCount + (condition.offset || 0));
        }
        case 'encounterResourceAtLeast':
            return getEncounterResourceValue() >= conditionValue;
        case 'encounterResourceAtOrBelow':
            return getEncounterResourceValue() <= conditionValue;
        case 'unitResourceAtLeast':
        case 'unitResourceAtOrBelow':
        {
            const resourceId = condition?.resourceId;
            if (!resourceId || typeof resourceId !== 'string') {
                return false;
            }
            const resources = conditionUnit?.resources && typeof conditionUnit.resources === 'object' && !Array.isArray(conditionUnit.resources)
                ? conditionUnit.resources
                : {};
            const value = typeof resources[resourceId] === 'number' && Number.isFinite(resources[resourceId])
                ? resources[resourceId]
                : 0;
            return conditionType === 'unitResourceAtLeast'
                ? value >= conditionValue
                : value <= conditionValue;
        }
        case 'hasFlag':
        {
            const flagId = condition?.flagId;
            if (!flagId || typeof flagId !== 'string') {
                return false;
            }
            const flags = conditionUnit?.runtimeState?.flags && typeof conditionUnit.runtimeState.flags === 'object'
                ? conditionUnit.runtimeState.flags
                : {};
            const actual = Boolean(flags[flagId]);
            return actual === (conditionValue ?? true);
        }
        case 'counterAtLeast':
        case 'counterAtOrBelow':
        {
            const counterId = condition?.counterId;
            if (!counterId || typeof counterId !== 'string') {
                return false;
            }
            const counters = conditionUnit?.runtimeState?.counters && typeof conditionUnit.runtimeState.counters === 'object'
                ? conditionUnit.runtimeState.counters
                : {};
            const actual = typeof counters[counterId] === 'number' && Number.isFinite(counters[counterId])
                ? counters[counterId]
                : 0;
            return conditionType === 'counterAtLeast'
                ? actual >= conditionValue
                : actual <= conditionValue;
        }
        case 'randomChance':
        {
            const normalized = normalizePercentConditionValue(conditionValue);
            const chance = typeof normalized === 'number' && Number.isFinite(normalized)
                ? Math.max(0, Math.min(1, normalized))
                : 0;
            return (Math.random() || 0) < chance;
        }
        case 'skillIdIs':
            return matchesExpectedValue(runtime?.skill?.id || null, conditionValue);
        case 'skillHasTag':
            return skillHasExpectedTag(runtime?.skill, conditionValue);
        case 'skillType':
            return matchesExpectedValue(runtime?.skill?.skillType || 'attack', conditionValue);
        case 'skillSinType':
            return matchesExpectedValue(runtime?.skill?.sinType || null, conditionValue);
        case 'skillDamageType':
            return matchesExpectedValue(runtime?.skill?.damageType || null, conditionValue);
        case 'skillCoinPowerSign':
        {
            const coinPower = typeof runtime?.skill?.coinPower === 'number' ? runtime.skill.coinPower : 0;
            const sign = coinPower >= 0 ? 'plus' : 'minus';
            return matchesExpectedValue(sign, conditionValue);
        }
        case 'coinIndex':
            return getRuntimeCoinIndex(runtime) === conditionValue;
        case 'criticalHit':
            return Boolean(runtime?.isCritical) === (conditionValue ?? true);
        case 'targetStaggered':
            return isUnitStaggeredForCondition(getHookConditionUnit(runtime, condition?.target || 'opponent')) === (conditionValue ?? true);
        case 'hpAtOrBelow':
            return typeof conditionUnit?.hp === 'number' && conditionUnit.hp <= conditionValue;
        case 'hpAtOrAbove':
            return typeof conditionUnit?.hp === 'number' && conditionUnit.hp >= conditionValue;
        case 'hpPercentAtOrBelow':
            return getUnitHpRatio(conditionUnit) <= normalizePercentConditionValue(conditionValue);
        case 'hpPercentAtOrAbove':
            return getUnitHpRatio(conditionUnit) >= normalizePercentConditionValue(conditionValue);
        case 'spAtOrBelow':
            return typeof conditionUnit?.sp === 'number' && conditionUnit.sp <= conditionValue;
        case 'spAtOrAbove':
            return typeof conditionUnit?.sp === 'number' && conditionUnit.sp >= conditionValue;
        case 'speedAtLeast':
            return typeof conditionUnit?.speed === 'number' && conditionUnit.speed >= conditionValue;
        case 'speedAtOrBelow':
            return typeof conditionUnit?.speed === 'number' && conditionUnit.speed <= conditionValue;
        case 'speedGreaterThan':
        {
            const leftUnit = getHookConditionUnit(runtime, condition?.target || 'self');
            const rightUnit = getHookConditionUnit(runtime, condition?.otherTarget || 'opponent');
            const leftSpeed = leftUnit?.speed || 0;
            const rightSpeed = rightUnit?.speed || 0;
            return leftSpeed > (rightSpeed + (condition.offset || 0));
        }
        case 'eventStatusIdIs':
            return runtime?.statusId === conditionValue;
        case 'unitSideIs':
            return (conditionUnit?.side || null) === conditionValue;
        case 'lastEventTypeIs':
        {
            const events = Array.isArray(runtime?.battle?.events) ? runtime.battle.events : [];
            const lastType = events.length ? events[events.length - 1]?.type : null;
            return matchesExpectedValue(lastType, conditionValue);
        }
        case 'panicStateIs':
        {
            const runtimeState = conditionUnit?.runtimeState && typeof conditionUnit.runtimeState === 'object'
                ? conditionUnit.runtimeState
                : null;
            return Boolean(runtimeState) && runtimeState.panicStateId === conditionValue;
        }
        case 'panicValueAtLeast':
        {
            const runtimeState = conditionUnit?.runtimeState && typeof conditionUnit.runtimeState === 'object'
                ? conditionUnit.runtimeState
                : null;
            const value = typeof runtimeState?.panicValue === 'number' && Number.isFinite(runtimeState.panicValue)
                ? runtimeState.panicValue
                : 0;
            return value >= conditionValue;
        }
        case 'panicValueAtOrBelow':
        {
            const runtimeState = conditionUnit?.runtimeState && typeof conditionUnit.runtimeState === 'object'
                ? conditionUnit.runtimeState
                : null;
            const value = typeof runtimeState?.panicValue === 'number' && Number.isFinite(runtimeState.panicValue)
                ? runtimeState.panicValue
                : 0;
            return value <= conditionValue;
        }
        case 'waveAtLeast':
        {
            const wave = typeof runtime?.battle?.wave === 'number' && Number.isFinite(runtime.battle.wave)
                ? runtime.battle.wave
                : 1;
            return wave >= conditionValue;
        }
        case 'waveAtOrBelow':
        {
            const wave = typeof runtime?.battle?.wave === 'number' && Number.isFinite(runtime.battle.wave)
                ? runtime.battle.wave
                : 1;
            return wave <= conditionValue;
        }
        case 'resonanceAtLeast':
        case 'resonanceAtOrBelow':
        case 'absoluteResonanceAtLeast':
        case 'absoluteResonanceAtOrBelow':
        {
            const selfSide = runtime?.unit?.side || 'player';
            const opponentSide = selfSide === 'player' ? 'enemy' : 'player';
            const resolvedSide = condition.side === 'enemy' || condition.side === 'player'
                ? condition.side
                : (condition.side === 'opponent' ? opponentSide : selfSide);
            const stateRoot = condition.type === 'absoluteResonanceAtLeast' || condition.type === 'absoluteResonanceAtOrBelow'
                ? runtime?.battle?.runtimeState?.absoluteResonanceBySide
                : runtime?.battle?.runtimeState?.resonanceBySide;
            const resonance = stateRoot
                && typeof stateRoot === 'object'
                && !Array.isArray(stateRoot)
                && stateRoot[resolvedSide]
                && typeof stateRoot[resolvedSide] === 'object'
                && !Array.isArray(stateRoot[resolvedSide])
                ? stateRoot[resolvedSide]
                : {};
            const value = typeof resonance?.[condition.sinType] === 'number' && Number.isFinite(resonance[condition.sinType])
                ? resonance[condition.sinType]
                : 0;
            return condition.type === 'resonanceAtLeast' || condition.type === 'absoluteResonanceAtLeast'
                ? value >= conditionValue
                : value <= conditionValue;
        }
        default:
            return false;
        }
    }

    function hookBlockMatchesRuntime(block, runtime, getStatus, getEncounterResource) {
        if (!Array.isArray(block?.conditions) || !block.conditions.length) {
            return true;
        }

        return block.conditions.every((condition) => conditionMatchesRuntime(condition, runtime, getStatus, getEncounterResource));
    }

    function createSkillEffectRunner(deps) {
        const { applyEffects, getEffectStatusPotency } = createEffectExecutor(deps);
        const { getEncounterResource } = deps || {};

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
        const { getStatus, invokeHooks, getEncounterResource } = deps || {};

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
                    if (!hookBlockMatchesRuntime(block, hookRuntime, getStatus, getEncounterResource)) {
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

    function createHookConditionEvaluator(deps = {}) {
        const { getEncounterResource } = deps;

        function getStatus(unit, statusId) {
            if (!unit || !statusId) {
                return null;
            }
            const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
            return statuses.find((entry) => entry?.id === statusId || entry?.statusId === statusId) || null;
        }

        return function evaluateHookConditions(conditions, runtime) {
            if (!Array.isArray(conditions) || !conditions.length) {
                return true;
            }
            return conditions.every((condition) => conditionMatchesRuntime(condition, runtime, getStatus, getEncounterResource));
        };
    }

    battleModules.createSkillEffectRunner = createSkillEffectRunner;
    battleModules.createPassiveEffectRunner = createPassiveEffectRunner;
    battleModules.createHookConditionEvaluator = createHookConditionEvaluator;
    battleModules.effectMatchesRuntime = effectMatchesRuntime;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        createSkillEffectRunner,
        createPassiveEffectRunner,
        createHookConditionEvaluator,
    };
})();
