(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const COUNT_ONLY_STATUS_IDS = new Set([
        'protection',
        'paralyze',
        'plus_coin_boost',
        'plus_coin_drop',
        'minus_coin_boost',
        'minus_coin_drop',
    ]);

    function normalizeStaggerThresholds(templateThresholds, maxHp) {
        if (!Array.isArray(templateThresholds)) {
            return [];
        }

        return templateThresholds
            .map((value) => {
                if (typeof value !== 'number' || !Number.isFinite(value)) {
                    return null;
                }

                if (value > 0 && value <= 1) {
                    return Math.round(maxHp * value);
                }

                return Math.round(value);
            })
            .filter((value) => Number.isFinite(value) && value > 0 && value < maxHp)
            .sort((left, right) => right - left);
    }

    function createBattleUnit(template, side, index) {
        return {
            ...template,
            side,
            index,
            hp: template.maxHp,
            sp: template.sp,
            speed: 0,
            statuses: [],
            passives: [],
            pendingStatuses: [],
            turnState: {},
            resistances: { ...template.resistances },
            staggerThresholds: normalizeStaggerThresholds(template.staggerThresholds, template.maxHp),
            staggerThresholdIndex: 0,
            staggerLevel: 0,
            staggerTurnsRemaining: 0,
            sprites: {
                ...template.sprites,
                skills: { ...template.sprites.skills },
            },
            skills: template.skills.map((skill) => ({ ...skill })),
        };
    }

    function createBattleSlot(unit, side, index) {
        return {
            id: `${side}-slot-${index + 1}`,
            side,
            index,
            unitId: unit.id,
            speed: 0,
            selectedSkillId: null,
            intentSkillId: null,
            intentTargetSlotId: null,
            targetSlotId: null,
            manualTargetLock: false,
            resolved: false,
        };
    }

    function createBattleEngine(options) {
        const {
            clamp,
            battleDefinition = options?.battleDefinition || null,
            peekRollToken = null,
            consumeRollToken = null,
            onTurnStarted = null,
        } = options;
        let nextEventId = 1;
        let battle = createDebugBattleState();

        function safeInvoke(fn, payload) {
            if (typeof fn !== 'function') {
                return;
            }

            try {
                fn(payload);
            } catch (error) {
                return;
            }
        }

        function getAllUnits(targetBattle) {
            return [...targetBattle.playerUnits, ...targetBattle.enemyUnits];
        }

        function getAllSlots(targetBattle) {
            return [...targetBattle.playerSlots, ...targetBattle.enemySlots];
        }

        function getUnitsForSide(targetBattle, side) {
            return side === 'enemy' ? targetBattle.enemyUnits : targetBattle.playerUnits;
        }

        function getSlotsForSide(targetBattle, side) {
            return side === 'enemy' ? targetBattle.enemySlots : targetBattle.playerSlots;
        }

        function getOpposingSide(side) {
            return side === 'enemy' ? 'player' : 'enemy';
        }

        function getUnitById(targetBattle, unitId) {
            return getAllUnits(targetBattle).find((unit) => unit.id === unitId) || null;
        }

        function getSlotById(targetBattle, slotId) {
            return getAllSlots(targetBattle).find((slot) => slot.id === slotId) || null;
        }

        function getSkillById(unit, skillId) {
            return unit?.skills?.find((skill) => skill.id === skillId) || null;
        }

        function isUnitAlive(unit) {
            return Boolean(unit) && unit.hp > 0;
        }

        function isSlotAlive(targetBattle, slot) {
            return isUnitAlive(getUnitById(targetBattle, slot.unitId));
        }

        function isUnitStaggered(unit) {
            return isUnitAlive(unit) && (unit.staggerTurnsRemaining || 0) > 0;
        }

        function isSlotActionable(targetBattle, slot) {
            const unit = getUnitById(targetBattle, slot.unitId);
            return isUnitAlive(unit) && !isUnitStaggered(unit);
        }

        function getNextStaggerThreshold(unit) {
            if (!Array.isArray(unit?.staggerThresholds)) {
                return null;
            }

            return unit.staggerThresholds[unit.staggerThresholdIndex] ?? null;
        }

        function getFirstLivingSlot(targetBattle, side) {
            return getSlotsForSide(targetBattle, side).find((slot) => isSlotAlive(targetBattle, slot)) || null;
        }

        function getFirstLivingSlotId(targetBattle, side) {
            return getFirstLivingSlot(targetBattle, side)?.id || null;
        }

        function getActivePlayerSlot(targetBattle) {
            const activeSlot = getSlotById(targetBattle, targetBattle.activePlayerSlotId);
            if (activeSlot && activeSlot.side === 'player' && isSlotAlive(targetBattle, activeSlot)) {
                return activeSlot;
            }

            return getSlotsForSide(targetBattle, 'player').find((slot) => isSlotActionable(targetBattle, slot))
                || getFirstLivingSlot(targetBattle, 'player');
        }

        function ensureActivePlayerSlot(targetBattle) {
            const activeSlot = getActivePlayerSlot(targetBattle);
            targetBattle.activePlayerSlotId = activeSlot?.id || null;
            return activeSlot;
        }

        function getSlotLabel(slot) {
            return `Slot ${slot.index + 1}`;
        }

        function getSlotTargetLabel(targetBattle, slotId) {
            const slot = getSlotById(targetBattle, slotId);
            if (!slot) {
                return 'No target';
            }

            const unit = getUnitById(targetBattle, slot.unitId);
            return `${unit?.name || 'Unknown'} ${getSlotLabel(slot)}`;
        }

        function invokeHooks(unit, hookName, context) {
            if (!unit) {
                return;
            }

            const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
            statuses.forEach((status) => {
                safeInvoke(status?.hooks?.[hookName], context);
            });

            const passives = Array.isArray(unit.passives) ? unit.passives : [];
            passives.forEach((passive) => {
                safeInvoke(passive?.hooks?.[hookName], context);
            });
        }

        function pushBattleLog(targetBattle, message) {
            targetBattle.log.push(message);
            if (targetBattle.log.length > 64) {
                targetBattle.log = targetBattle.log.slice(-64);
            }
        }

        function isCountOnlyStatus(statusId) {
            return COUNT_ONLY_STATUS_IDS.has(statusId);
        }

        function getStatus(unit, statusId) {
            const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
            return statuses.find((status) => status?.id === statusId) || null;
        }

        function getStatusCount(unit, statusId) {
            return getStatus(unit, statusId)?.count || 0;
        }

        function getStatusPotency(unit, statusId) {
            return getStatus(unit, statusId)?.potency || 0;
        }

        function removeStatus(unit, statusId) {
            unit.statuses = (Array.isArray(unit.statuses) ? unit.statuses : []).filter((status) => status?.id !== statusId);
        }

        function eventToLogLine(event) {
            const { type, data } = event;

            if (type === 'battle_started') {
                return `Battle started: ${data.playerTeamName} vs ${data.enemyTeamName}.`;
            }
            if (type === 'turn_started') {
                return `Turn ${data.turn} starts.`;
            }
            if (type === 'slot_speed_rolled') {
                return `${data.unitName} ${data.slotLabel} rolls ${data.speed} Speed.`;
            }
            if (type === 'enemy_intent_set') {
                return `${data.unitName} ${data.slotLabel} prepares ${data.skillName} targeting ${data.targetLabel}.`;
            }
            if (type === 'skill_selected') {
                return `${data.unitName} ${data.slotLabel} selects ${data.skillName}.`;
            }
            if (type === 'target_selected') {
                return `${data.unitName} ${data.slotLabel} targets ${data.targetLabel}.`;
            }
            if (type === 'resolution_queue_built') {
                return `Resolution queue: ${data.queueLabel}.`;
            }
            if (type === 'engagement_started') {
                if (data.engagementType === 'clash') {
                    return `${data.leftUnitName} clashes with ${data.rightUnitName}.`;
                }
                return `${data.attackerName} attacks ${data.defenderName} one-sided with ${data.skillName}.`;
            }
            if (type === 'clash_round') {
                if (data.result === 'tie') {
                    return `Clash ${data.index}: tie at ${data.leftPower} (${data.leftFlips} vs ${data.rightFlips}).`;
                }
                if (data.result === 'left-speed-break' || data.result === 'right-speed-break') {
                    return `Repeated tie: ${data.speedWinnerName} breaks it with the higher Speed value.`;
                }
                return `Clash ${data.index}: ${data.roundWinnerName} wins ${data.winnerPower} to ${data.loserPower}, breaking a Coin from ${data.roundLoserName}.`;
            }
            if (type === 'clash_won') {
                return `${data.winnerName} wins the clash.`;
            }
            if (type === 'sanity_changed') {
                return `${data.unitName} SP ${data.previousSp} -> ${data.nextSp} (${data.reason}).`;
            }
            if (type === 'hit_resolved') {
                const critLabel = data.isCritical ? ' Critical.' : '';
                return `Hit ${data.index}: ${data.coinFace} for Power ${data.finalPower}, dealing ${data.damage} ${data.damageType} damage.${critLabel}`;
            }
            if (type === 'status_applied') {
                if (isCountOnlyStatus(data.statusId)) {
                    return `${data.unitName} gains ${data.statusId} ${data.count}.`;
                }
                return `${data.unitName} gains ${data.statusId} ${data.potency}/${data.count}.`;
            }
            if (type === 'status_changed') {
                if (isCountOnlyStatus(data.statusId)) {
                    return `${data.unitName} ${data.statusId} ${data.previousCount} -> ${data.nextCount}.`;
                }
                return `${data.unitName} ${data.statusId} ${data.previousPotency}/${data.previousCount} -> ${data.nextPotency}/${data.nextCount}.`;
            }
            if (type === 'status_triggered') {
                if (data.statusId === 'burn' || data.statusId === 'rupture') {
                    return `${data.unitName} takes ${data.damage} fixed damage from ${data.statusId}.`;
                }
                if (data.statusId === 'bleed') {
                    return `${data.unitName} takes ${data.damage} fixed damage from Bleed.`;
                }
                if (data.statusId === 'sinking') {
                    return `${data.unitName} loses ${data.damage} SP from Sinking.`;
                }
                if (data.statusId === 'evade') {
                    return `${data.unitName} evades ${data.attackerName}'s Coin ${data.index} (${data.evadePower} vs ${data.attackPower}).`;
                }
                return `${data.unitName} is affected by ${data.statusId}.`;
            }
            if (type === 'unit_staggered') {
                return `${data.unitName} is staggered at Threshold ${data.threshold} HP.`;
            }
            if (type === 'unit_stagger_recovered') {
                return `${data.unitName} recovers from Stagger.`;
            }
            if (type === 'status_expired') {
                return `${data.unitName} ${data.statusId} expired.`;
            }
            if (type === 'unit_defeated') {
                return `${data.unitName} falls.`;
            }
            if (type === 'battle_ended') {
                if (data.winner === 'draw') {
                    return 'Battle ends in a draw.';
                }
                return `${data.winnerName} wins the debug fight.`;
            }

            return null;
        }

        function emitEvent(targetBattle, type, data) {
            const event = {
                id: nextEventId,
                type,
                turn: targetBattle.turn,
                ts: Date.now(),
                data: data || null,
            };

            nextEventId += 1;
            targetBattle.events.push(event);
            if (targetBattle.events.length > 300) {
                targetBattle.events = targetBattle.events.slice(-300);
            }

            const logLine = eventToLogLine(event);
            if (logLine) {
                pushBattleLog(targetBattle, logLine);
            }

            return event;
        }

        function randomInt(min, max) {
            return Math.floor(Math.random() * ((max - min) + 1)) + min;
        }

        function clampStatusValue(value, max) {
            return clamp(typeof value === 'number' ? value : 0, 0, max);
        }

        function applyStatus(targetBattle, unit, statusId, payload) {
            const potencyDelta = typeof payload?.potency === 'number' ? payload.potency : 0;
            const countDelta = typeof payload?.count === 'number' ? payload.count : 0;
            const maxCount = statusId === 'protection' ? 10 : 99;
            const existing = getStatus(unit, statusId);
            const previousPotency = existing?.potency || 0;
            const previousCount = existing?.count || 0;
            const nextPotency = isCountOnlyStatus(statusId)
                ? 0
                : clampStatusValue(previousPotency + potencyDelta, 99);
            const nextCount = clampStatusValue(previousCount + countDelta, maxCount);

            if (!existing) {
                const status = {
                    id: statusId,
                    potency: nextPotency,
                    count: nextCount,
                };
                unit.statuses.push(status);
                emitEvent(targetBattle, 'status_applied', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId,
                    potency: status.potency,
                    count: status.count,
                });
                return status;
            }

            existing.potency = nextPotency;
            existing.count = nextCount;
            emitEvent(targetBattle, 'status_changed', {
                unitId: unit.id,
                unitName: unit.name,
                statusId,
                previousPotency,
                previousCount,
                nextPotency,
                nextCount,
            });
            return existing;
        }

        function setStatusCount(targetBattle, unit, statusId, nextCount) {
            const existing = getStatus(unit, statusId);
            if (!existing) {
                return;
            }

            const previousCount = existing.count || 0;
            existing.count = clampStatusValue(nextCount, statusId === 'protection' ? 10 : 99);
            emitEvent(targetBattle, 'status_changed', {
                unitId: unit.id,
                unitName: unit.name,
                statusId,
                previousPotency: existing.potency || 0,
                previousCount,
                nextPotency: existing.potency || 0,
                nextCount: existing.count,
            });
            if (existing.count <= 0) {
                removeStatus(unit, statusId);
                emitEvent(targetBattle, 'status_expired', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId,
                });
            }
        }

        function queueStatusForNextTurn(unit, statusId, payload) {
            unit.pendingStatuses.push({
                statusId,
                potency: typeof payload?.potency === 'number' ? payload.potency : 0,
                count: typeof payload?.count === 'number' ? payload.count : 0,
            });
        }

        function processQueuedStatusesAtTurnStart(targetBattle, unit) {
            if (!unit.pendingStatuses.length) {
                return;
            }

            unit.pendingStatuses.forEach((queued) => {
                applyStatus(targetBattle, unit, queued.statusId, queued);
            });
            unit.pendingStatuses = [];
        }

        function adjustSanity(unit, amount) {
            const previousSp = unit.sp;
            unit.sp = clamp(unit.sp + amount, -45, 45);
            return { previousSp, nextSp: unit.sp };
        }

        function peekForcedRollToken(slotId) {
            if (!slotId) {
                return null;
            }

            if (typeof peekRollToken !== 'function') {
                return null;
            }

            const token = peekRollToken(slotId);
            if (typeof token === 'undefined') {
                return null;
            }

            return token;
        }

        function consumeForcedRollToken(slotId) {
            if (!slotId || typeof consumeRollToken !== 'function') {
                return null;
            }

            const token = consumeRollToken(slotId);
            return typeof token === 'undefined' ? null : token;
        }

        function applyFixedDamage(targetBattle, unit, statusId, damage) {
            const appliedDamage = clampStatusValue(damage, 9999);
            if (appliedDamage <= 0) {
                return 0;
            }

            const previousHp = unit.hp;
            unit.hp = clamp(unit.hp - appliedDamage, 0, unit.maxHp);
            emitEvent(targetBattle, 'status_triggered', {
                unitId: unit.id,
                unitName: unit.name,
                statusId,
                damage: appliedDamage,
                hp: unit.hp,
            });
            applyStaggerFromDamage(targetBattle, unit, null, previousHp, unit.hp);
            return appliedDamage;
        }

        function processBurnAtTurnEnd(targetBattle, unit) {
            const burn = getStatus(unit, 'burn');
            if (!burn || burn.count <= 0 || burn.potency <= 0 || unit.hp <= 0) {
                return;
            }

            applyFixedDamage(targetBattle, unit, 'burn', burn.potency);
            setStatusCount(targetBattle, unit, 'burn', burn.count - 1);
        }

        function processPoiseAtTurnEnd(targetBattle, unit) {
            const poise = getStatus(unit, 'poise');
            if (!poise || poise.count <= 0) {
                return;
            }

            setStatusCount(targetBattle, unit, 'poise', poise.count - 1);
        }

        function expireTurnStatuses(targetBattle, unit) {
            ['protection', 'paralyze', 'plus_coin_boost', 'plus_coin_drop', 'minus_coin_boost', 'minus_coin_drop'].forEach((statusId) => {
                if (!getStatus(unit, statusId)) {
                    return;
                }

                removeStatus(unit, statusId);
                emitEvent(targetBattle, 'status_expired', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId,
                });
            });
        }

        function triggerBleedOnCoinRoll(targetBattle, unit) {
            const bleed = getStatus(unit, 'bleed');
            if (!bleed || bleed.count <= 0 || bleed.potency <= 0 || unit.hp <= 0) {
                return;
            }

            applyFixedDamage(targetBattle, unit, 'bleed', bleed.potency);
            setStatusCount(targetBattle, unit, 'bleed', bleed.count - 1);
        }

        function triggerRuptureOnHit(targetBattle, unit) {
            const rupture = getStatus(unit, 'rupture');
            if (!rupture || rupture.count <= 0 || rupture.potency <= 0 || unit.hp <= 0) {
                return;
            }

            applyFixedDamage(targetBattle, unit, 'rupture', rupture.potency);
            setStatusCount(targetBattle, unit, 'rupture', rupture.count - 1);
        }

        function triggerSinkingOnHit(targetBattle, unit) {
            const sinking = getStatus(unit, 'sinking');
            if (!sinking || sinking.count <= 0 || sinking.potency <= 0 || unit.hp <= 0) {
                return;
            }

            const { previousSp, nextSp } = adjustSanity(unit, -sinking.potency);
            emitEvent(targetBattle, 'status_triggered', {
                unitId: unit.id,
                unitName: unit.name,
                statusId: 'sinking',
                damage: sinking.potency,
                hp: unit.hp,
            });
            emitEvent(targetBattle, 'sanity_changed', {
                unitName: unit.name,
                previousSp,
                nextSp,
                reason: 'sinking',
            });
            setStatusCount(targetBattle, unit, 'sinking', sinking.count - 1);
        }

        function spendParalyzeForCoin(targetBattle, unit) {
            const paralyze = getStatus(unit, 'paralyze');
            if (!paralyze || paralyze.count <= 0) {
                return false;
            }

            setStatusCount(targetBattle, unit, 'paralyze', paralyze.count - 1);
            return true;
        }

        function getCoinHeadChance(unit) {
            return clamp(50 + unit.sp, 5, 95);
        }

        function getSkillType(skill) {
            return skill?.skillType || 'attack';
        }

        function isDefenseSkill(skill) {
            return getSkillType(skill) !== 'attack';
        }

        function isEvadeSkill(skill) {
            return getSkillType(skill) === 'evade';
        }

        function isCounterSkill(skill) {
            return getSkillType(skill) === 'counter';
        }

        function isPlusCoinSkill(skill) {
            return (skill.coinPower || 0) >= 0;
        }

        function getEffectiveCoinPower(unit, skill, attackContext) {
            const basePower = typeof skill.coinPower === 'number' ? skill.coinPower : 0;
            const directModifier = attackContext.coinPowerBonus || 0;

            if (isPlusCoinSkill(skill)) {
                return basePower
                    + directModifier
                    + getStatusCount(unit, 'plus_coin_boost')
                    - getStatusCount(unit, 'plus_coin_drop');
            }

            return basePower
                + directModifier
                - getStatusCount(unit, 'minus_coin_boost')
                + getStatusCount(unit, 'minus_coin_drop');
        }

        function rollSingleCoin(targetBattle, unit, skill, attackContext, forcedIsHeads = null) {
            triggerBleedOnCoinRoll(targetBattle, unit);
            if (unit.hp <= 0) {
                return null;
            }

            const forcedZero = spendParalyzeForCoin(targetBattle, unit);
            let isHeads = false;
            if (!forcedZero) {
                if (typeof forcedIsHeads === 'boolean') {
                    isHeads = forcedIsHeads;
                } else {
                    const token = peekForcedRollToken(attackContext.slotId);
                    if (typeof token === 'boolean') {
                        isHeads = consumeForcedRollToken(attackContext.slotId);
                    } else {
                        isHeads = Math.random() * 100 < getCoinHeadChance(unit);
                    }
                }
            }
            const effectiveCoinPower = getEffectiveCoinPower(unit, skill, attackContext);
            let power = skill.basePower + (attackContext.flatPowerBonus || 0);

            if (!forcedZero && isHeads) {
                power += effectiveCoinPower;
            }

            return {
                isHeads,
                forcedZero,
                power,
            };
        }

        function flipCoins(targetBattle, unit, skill, coinCount, attackContext) {
            const flips = [];
            let power = skill.basePower + (attackContext.flatPowerBonus || 0);

            const nextToken = peekForcedRollToken(attackContext.slotId);
            let forcedFlips = null;
            if (nextToken && typeof nextToken === 'object' && (nextToken.type === 'power' || nextToken.type === 'heads')) {
                const directive = consumeForcedRollToken(attackContext.slotId);
                const effectiveCoinPower = getEffectiveCoinPower(unit, skill, attackContext);
                const baseValue = skill.basePower + (attackContext.flatPowerBonus || 0);
                let desiredHeads = 0;

                if (directive.type === 'heads') {
                    desiredHeads = clampStatusValue(directive.value, coinCount);
                } else if (directive.type === 'power') {
                    if (effectiveCoinPower === 0) {
                        desiredHeads = 0;
                    } else {
                        desiredHeads = Math.round((directive.value - baseValue) / effectiveCoinPower);
                        desiredHeads = clampStatusValue(desiredHeads, coinCount);
                    }
                }

                forcedFlips = Array.from({ length: coinCount }, (_, index) => index < desiredHeads);
            }

            for (let index = 0; index < coinCount; index += 1) {
                const roll = rollSingleCoin(targetBattle, unit, skill, attackContext, forcedFlips ? forcedFlips[index] : null);
                if (!roll) {
                    break;
                }

                flips.push(roll.isHeads);
                power = skill.basePower + (attackContext.flatPowerBonus || 0);
                flips.forEach((isHeadsFlip) => {
                    if (isHeadsFlip) {
                        power += getEffectiveCoinPower(unit, skill, attackContext);
                    }
                });
            }

            return { flips, power };
        }

        function formatCoinFlips(flips) {
            return flips.map((isHeads) => (isHeads ? 'H' : 'T')).join(' ');
        }

        function getSkillOffenseLevel(unit, skill) {
            return Math.max(1, unit.level + (skill.offenseLevel || 0));
        }

        function getDefenseLevel(unit) {
            const modifier = unit.turnState?.defenseLevelModifier || 0;
            return Math.max(1, (unit.defenseLevel || unit.level) + modifier);
        }

        function getSkillDefenseLevel(unit, skill) {
            return Math.max(1, getDefenseLevel(unit) + (skill?.offenseLevel || 0));
        }

        function getClashLevelBonus(unit, skill, opponent, opponentSkill) {
            const levelDifference = getSkillOffenseLevel(unit, skill) - getSkillOffenseLevel(opponent, opponentSkill);
            return levelDifference > 0 ? Math.floor(levelDifference / 3) : 0;
        }

        function getDefenseSkillFinalPowerBonus(defender, defenseSkill, attacker, attackSkill) {
            const levelDifference = getSkillDefenseLevel(defender, defenseSkill) - getSkillOffenseLevel(attacker, attackSkill);
            return levelDifference > 0 ? Math.floor(levelDifference / 3) : 0;
        }

        function getResistanceMultiplier(unit, damageType) {
            const dynamic = unit.turnState?.resistanceOverrides?.[damageType];
            const baseResistance = typeof dynamic === 'number'
                ? dynamic
                : (unit.resistances[damageType] || 1);
            return isUnitStaggered(unit) ? Math.max(2, baseResistance) : baseResistance;
        }

        function calculateHitDamage(attacker, skill, defender, finalPower, attackContext, defendContext, isCritical) {
            const resistance = getResistanceMultiplier(defender, skill.damageType);
            const levelDifference = getSkillOffenseLevel(attacker, skill) - getDefenseLevel(defender);
            const levelModifier = 1 + (levelDifference / (Math.abs(levelDifference) + 25));
            const protection = getStatusCount(defender, 'protection');
            const protectionModifier = protection > 0 ? Math.max(0, 1 - (Math.min(protection, 10) * 0.1)) : 1;
            const critDamageMultiplier = isCritical
                ? 1.2 * (1 + (attackContext.extraCritDamageByCoin?.[attackContext.currentCoinIndex] || 0))
                : 1;
            const incomingReduction = defendContext?.damageReductionMultiplier ?? 1;
            const damageMultiplier = attackContext.damageMultiplier || 1;
            const rawDamage = Math.max(1, Math.round(finalPower * resistance * levelModifier * protectionModifier * damageMultiplier * critDamageMultiplier * incomingReduction));
            return rawDamage;
        }

        function applyGenericSkillEffects(targetBattle, trigger, attacker, defender, skill) {
            const effects = Array.isArray(skill?.effects) ? skill.effects : [];
            effects.forEach((effect) => {
                if (effect?.trigger !== trigger) {
                    return;
                }

                if (effect.type === 'applyStatus' && effect.statusId) {
                    applyStatus(targetBattle, defender, effect.statusId, {
                        potency: effect.potency,
                        count: effect.count,
                    });
                    invokeHooks(attacker, 'statusInflicted', { battle: targetBattle, unit: attacker, opponent: defender, skill, statusId: effect.statusId });
                    invokeHooks(defender, 'statusReceived', { battle: targetBattle, unit: defender, opponent: attacker, skill, statusId: effect.statusId });
                }
            });
        }

        function gainPoise(targetBattle, unit, potency, count = 0) {
            applyStatus(targetBattle, unit, 'poise', { potency, count });
        }

        function consumeAllPoise(targetBattle, unit) {
            const poise = getStatus(unit, 'poise');
            if (!poise) {
                return;
            }

            removeStatus(unit, 'poise');
            emitEvent(targetBattle, 'status_expired', {
                unitId: unit.id,
                unitName: unit.name,
                statusId: 'poise',
            });
        }

        function createSkillContext(targetBattle, unit, slot, skill, targetUnit) {
            const context = {
                slotId: slot.id,
                skillId: skill.id,
                skillName: skill.name,
                coinPowerBonus: 0,
                flatPowerBonus: 0,
                clashPowerBonus: 0,
                damageMultiplier: 1,
                damageReductionMultiplier: 1,
                extraCritDamageByCoin: {},
                critFinalPowerBonusByCoin: {},
                followUpSkillIdOnClashLose: null,
                consumePoiseAtAttackEnd: false,
                currentCoinIndex: 0,
            };

            const poisePotency = getStatusPotency(unit, 'poise');

            switch (skill.id) {
            case 'draw-of-the-sword':
                if (poisePotency >= 5) {
                    context.coinPowerBonus += 1;
                }
                gainPoise(targetBattle, unit, 0, 2);
                break;
            case 'acupuncture':
                if (poisePotency >= 7) {
                    context.coinPowerBonus += 1;
                }
                gainPoise(targetBattle, unit, 0, 3);
                context.extraCritDamageByCoin[2] = 0.2;
                context.extraCritDamageByCoin[3] = 0.4;
                break;
            case 'yield-my-flesh':
                context.damageReductionMultiplier = 1 - Math.min(0.8, poisePotency * 0.02);
                context.clashPowerBonus -= Math.min(30, poisePotency);
                context.extraCritDamageByCoin[1] = 1.5;
                context.followUpSkillIdOnClashLose = 'to-claim-their-bones';
                break;
            case 'to-claim-their-bones':
                if (poisePotency >= 10) {
                    context.coinPowerBonus += 1;
                }
                gainPoise(targetBattle, unit, 0, 4);
                context.critFinalPowerBonusByCoin[1] = 2;
                context.critFinalPowerBonusByCoin[2] = 2;
                context.critFinalPowerBonusByCoin[3] = 2;
                context.consumePoiseAtAttackEnd = true;
                break;
            case 'sink-it-all': {
                const sanityChange = adjustSanity(unit, -30);
                emitEvent(targetBattle, 'sanity_changed', {
                    unitName: unit.name,
                    previousSp: sanityChange.previousSp,
                    nextSp: sanityChange.nextSp,
                    reason: 'Sink It All',
                });
                applyStatus(targetBattle, unit, 'sinking', { potency: 5, count: 5 });
                break;
            }
            default:
                break;
            }

            invokeHooks(unit, 'skillSelected', {
                battle: targetBattle,
                unit,
                opposingUnits: getUnitsForSide(targetBattle, getOpposingSide(unit.side)),
                skill,
                targetUnit,
            });

            return context;
        }

        function applyCustomClashOutcome(targetBattle, outcome, unit, opponent, skill) {
            switch (skill.id) {
            case 'draw-of-the-sword':
                if (outcome === 'win') {
                    gainPoise(targetBattle, unit, 3, 0);
                }
                break;
            case 'acupuncture':
                if (outcome === 'win') {
                    gainPoise(targetBattle, unit, 2, 0);
                }
                break;
            case 'yield-my-flesh':
                if (outcome === 'win') {
                    gainPoise(targetBattle, unit, 5, 0);
                }
                break;
            case 'stinging-memories': {
                const sanityChange = adjustSanity(unit, outcome === 'win' ? 8 : -5);
                emitEvent(targetBattle, 'sanity_changed', {
                    unitName: unit.name,
                    previousSp: sanityChange.previousSp,
                    nextSp: sanityChange.nextSp,
                    reason: outcome === 'win' ? 'clash win' : 'clash loss',
                });
                break;
            }
            default:
                break;
            }
        }

        function rollCritical(targetBattle, attacker) {
            const poise = getStatus(attacker, 'poise');
            if (!poise || poise.potency <= 0 || poise.count <= 0) {
                return false;
            }

            const critChance = Math.min(100, poise.potency * 5);
            const isCritical = Math.random() * 100 < critChance;
            if (isCritical) {
                setStatusCount(targetBattle, attacker, 'poise', poise.count - 1);
            }
            return isCritical;
        }

        function applyCustomCoinEffects(targetBattle, attacker, defender, skill, coinIndex, isCritical) {
            switch (skill.id) {
            case 'draw-of-the-sword':
                if (coinIndex === 1) {
                    gainPoise(targetBattle, attacker, 3, 0);
                }
                if (coinIndex === 2) {
                    gainPoise(targetBattle, attacker, 3, 0);
                    applyStatus(targetBattle, defender, 'bleed', { potency: 5, count: 1 });
                }
                if (isCritical) {
                    applyStatus(targetBattle, defender, 'bleed', { potency: 0, count: 2 });
                }
                break;
            case 'acupuncture':
                if (coinIndex === 1) {
                    gainPoise(targetBattle, attacker, 4, 0);
                }
                if (coinIndex === 4) {
                    applyStatus(targetBattle, defender, 'bleed', { potency: 0, count: 3 });
                }
                break;
            case 'yield-my-flesh':
                if (coinIndex === 1 && isCritical) {
                    defender.turnState.resistanceOverrides = {
                        ...(defender.turnState.resistanceOverrides || {}),
                        slash: (defender.resistances.slash || 1) * 1.25,
                    };
                    defender.turnState.defenseLevelModifier = (defender.turnState.defenseLevelModifier || 0) - 4;
                }
                break;
            case 'to-claim-their-bones':
                if (coinIndex === 4) {
                    applyStatus(targetBattle, defender, 'bleed', { potency: 10, count: 3 });
                    queueStatusForNextTurn(defender, 'paralyze', { count: 2 });
                }
                break;
            case 'stinging-memories':
                applyStatus(targetBattle, defender, 'sinking', { potency: 2, count: 1 });
                applyStatus(targetBattle, defender, 'rupture', { potency: 2, count: 1 });
                break;
            case 'aching-heart':
                if (coinIndex === 1) {
                    applyStatus(targetBattle, defender, 'rupture', { potency: 3, count: 1 });
                }
                if (coinIndex === 2) {
                    applyStatus(targetBattle, defender, 'rupture', { potency: 0, count: 3 });
                }
                break;
            case 'sink-it-all': {
                const sanityChange = adjustSanity(defender, -15);
                emitEvent(targetBattle, 'sanity_changed', {
                    unitName: defender.name,
                    previousSp: sanityChange.previousSp,
                    nextSp: sanityChange.nextSp,
                    reason: 'Sink It All',
                });
                applyStatus(targetBattle, defender, 'sinking', { potency: 8, count: 1 });
                break;
            }
            default:
                break;
            }
        }

        function applyAttackEndEffects(targetBattle, attacker, skill, attackContext) {
            if (attackContext.consumePoiseAtAttackEnd) {
                consumeAllPoise(targetBattle, attacker);
            }

            invokeHooks(attacker, 'attackEnd', {
                battle: targetBattle,
                unit: attacker,
                skill,
            });
        }

        function ensureDefenseState(slot) {
            if (!slot.defenseState) {
                slot.defenseState = {
                    activated: false,
                    used: false,
                    broken: false,
                    context: null,
                };
            }

            return slot.defenseState;
        }

        function clearSlotAction(slot) {
            if (!slot) {
                return;
            }

            slot.selectedSkillId = null;
            slot.intentSkillId = null;
            slot.intentTargetSlotId = null;
            slot.targetSlotId = null;
            slot.manualTargetLock = false;
            slot.resolved = true;
            slot.defenseState = {
                activated: false,
                used: false,
                broken: false,
                context: null,
            };
        }

        function applyStaggerFromDamage(targetBattle, unit, sourceUnit, previousHp, nextHp) {
            if (!isUnitAlive(unit)) {
                return false;
            }

            let crossedThreshold = null;
            let crossedCount = 0;
            while (unit.staggerThresholdIndex < unit.staggerThresholds.length) {
                const threshold = getNextStaggerThreshold(unit);
                if (!(previousHp > threshold && nextHp <= threshold)) {
                    break;
                }

                crossedThreshold = threshold;
                crossedCount += 1;
                unit.staggerThresholdIndex += 1;
            }

            if (!crossedCount) {
                return false;
            }

            unit.staggerLevel += crossedCount;
            unit.staggerTurnsRemaining = Math.max(unit.staggerTurnsRemaining || 0, 2);
            const slot = getAllSlots(targetBattle).find((candidate) => candidate.unitId === unit.id) || null;
            clearSlotAction(slot);
            emitEvent(targetBattle, 'unit_staggered', {
                unitId: unit.id,
                unitName: unit.name,
                staggerLevel: unit.staggerLevel,
                threshold: crossedThreshold,
                previousHp,
                nextHp,
                sourceUnitId: sourceUnit?.id || null,
                sourceUnitName: sourceUnit?.name || null,
            });
            return true;
        }

        function progressStaggerTurnState(targetBattle, unit) {
            if (!isUnitStaggered(unit)) {
                return;
            }

            unit.staggerTurnsRemaining = Math.max(0, (unit.staggerTurnsRemaining || 0) - 1);
            if (unit.staggerTurnsRemaining > 0) {
                return;
            }

            const previousLevel = unit.staggerLevel || 0;
            unit.staggerLevel = 0;
            emitEvent(targetBattle, 'unit_stagger_recovered', {
                unitId: unit.id,
                unitName: unit.name,
                previousLevel,
            });
        }

        function markUnitDefeated(targetBattle, unit, defeatedByUnit) {
            if (!unit || targetBattle.defeatedUnitIds.includes(unit.id)) {
                return;
            }

            targetBattle.defeatedUnitIds.push(unit.id);
            emitEvent(targetBattle, 'unit_defeated', {
                unitId: unit.id,
                unitName: unit.name,
                defeatedById: defeatedByUnit?.id || null,
                defeatedByName: defeatedByUnit?.name || null,
            });
            invokeHooks(unit, 'unitDefeated', { battle: targetBattle, unit, opponent: defeatedByUnit || null });
        }

        function finalizeBattleOnDeaths(targetBattle) {
            const livingPlayer = targetBattle.playerUnits.some((unit) => isUnitAlive(unit));
            const livingEnemy = targetBattle.enemyUnits.some((unit) => isUnitAlive(unit));

            getAllUnits(targetBattle)
                .filter((unit) => !isUnitAlive(unit))
                .forEach((unit) => markUnitDefeated(targetBattle, unit, null));

            if (livingPlayer && livingEnemy) {
                return;
            }

            targetBattle.phase = 'ended';

            if (!livingPlayer && !livingEnemy) {
                targetBattle.winner = 'draw';
                emitEvent(targetBattle, 'battle_ended', {
                    winner: 'draw',
                    winnerName: 'Draw',
                });
                return;
            }

            if (livingPlayer) {
                const winnerUnit = targetBattle.playerUnits.find((unit) => isUnitAlive(unit)) || targetBattle.playerUnits[0];
                targetBattle.winner = 'player';
                emitEvent(targetBattle, 'battle_ended', {
                    winner: 'player',
                    winnerId: winnerUnit.id,
                    winnerName: winnerUnit.name,
                });
                return;
            }

            const winnerUnit = targetBattle.enemyUnits.find((unit) => isUnitAlive(unit)) || targetBattle.enemyUnits[0];
            targetBattle.winner = 'enemy';
            emitEvent(targetBattle, 'battle_ended', {
                winner: 'enemy',
                winnerId: winnerUnit.id,
                winnerName: winnerUnit.name,
            });
        }

        function resolveOneSidedAttack(targetBattle, attacker, skill, defender, attackContext, defendContext, remainingCoins) {
            const hits = [];

            for (let coinIndex = 0; coinIndex < remainingCoins; coinIndex += 1) {
                attackContext.currentCoinIndex = coinIndex + 1;
                const roll = rollSingleCoin(targetBattle, attacker, skill, attackContext);
                if (!roll || attacker.hp <= 0 || defender.hp <= 0) {
                    break;
                }

                const isCritical = rollCritical(targetBattle, attacker);
                const finalPower = roll.power + (isCritical ? (attackContext.critFinalPowerBonusByCoin[coinIndex + 1] || 0) : 0);
                const damage = calculateHitDamage(attacker, skill, defender, finalPower, attackContext, defendContext, isCritical);
                const previousHp = defender.hp;

                defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);
                applyStaggerFromDamage(targetBattle, defender, attacker, previousHp, defender.hp);
                triggerRuptureOnHit(targetBattle, defender);
                triggerSinkingOnHit(targetBattle, defender);

                hits.push({
                    finalPower,
                    damage,
                    isHeads: roll.isHeads,
                    isCritical,
                    targetHp: defender.hp,
                });

                emitEvent(targetBattle, 'hit_resolved', {
                    index: coinIndex + 1,
                    attackerId: attacker.id,
                    attackerName: attacker.name,
                    defenderId: defender.id,
                    defenderName: defender.name,
                    skillId: skill.id,
                    skillName: skill.name,
                    coinFace: roll.isHeads ? 'Heads' : 'Tails',
                    finalPower,
                    damage,
                    damageType: skill.damageType,
                    previousHp,
                    nextHp: defender.hp,
                    isCritical,
                });

                invokeHooks(attacker, 'hitDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill, finalPower, damage, isCritical });
                invokeHooks(defender, 'hitTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill, finalPower, damage, isCritical });
                invokeHooks(attacker, 'damageDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill, damage });
                invokeHooks(defender, 'damageTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill, damage });

                applyCustomCoinEffects(targetBattle, attacker, defender, skill, coinIndex + 1, isCritical);
                applyGenericSkillEffects(targetBattle, 'onHit', attacker, defender, skill);

                if (defender.hp <= 0) {
                    break;
                }
            }

            return hits;
        }

        function sortSlotsBySpeed(targetBattle, slots) {
            return [...slots].sort((left, right) => {
                if (right.speed !== left.speed) {
                    return right.speed - left.speed;
                }
                if (left.side !== right.side) {
                    return left.side === 'player' ? -1 : 1;
                }
                return left.index - right.index;
            });
        }

        function buildQueueLabel(targetBattle, queue) {
            return queue
                .map((slot) => {
                    const unit = getUnitById(targetBattle, slot.unitId);
                    return `${unit.name} ${getSlotLabel(slot)} (${slot.speed})`;
                })
                .join(', ');
        }

        function resolveClash(targetBattle, leftSlot, rightSlot, leftUnit, leftSkill, rightUnit, rightSkill, leftContext, rightContext) {
            let leftCoins = leftSkill.coinCount;
            let rightCoins = rightSkill.coinCount;
            let repeatedTieCount = 0;
            let roundIndex = 0;
            const rounds = [];

            while (leftCoins > 0 && rightCoins > 0 && leftUnit.hp > 0 && rightUnit.hp > 0) {
                roundIndex += 1;
                const leftRoll = flipCoins(targetBattle, leftUnit, leftSkill, leftCoins, leftContext);
                const rightRoll = flipCoins(targetBattle, rightUnit, rightSkill, rightCoins, rightContext);
                const leftPower = leftRoll.power + getClashLevelBonus(leftUnit, leftSkill, rightUnit, rightSkill) + leftContext.clashPowerBonus;
                const rightPower = rightRoll.power + getClashLevelBonus(rightUnit, rightSkill, leftUnit, leftSkill) + rightContext.clashPowerBonus;

                if (leftPower === rightPower) {
                    repeatedTieCount += 1;
                    rounds.push({
                        result: 'tie',
                        leftPower,
                        rightPower,
                        leftFlips: leftRoll.flips,
                        rightFlips: rightRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'tie',
                        leftPower,
                        rightPower,
                        leftFlips: formatCoinFlips(leftRoll.flips),
                        rightFlips: formatCoinFlips(rightRoll.flips),
                    });

                    if (repeatedTieCount >= 6) {
                        if (leftSlot.speed >= rightSlot.speed) {
                            rightCoins -= 1;
                            rounds.push({
                                result: 'left-speed-break',
                                leftPower,
                                rightPower,
                                leftFlips: leftRoll.flips,
                                rightFlips: rightRoll.flips,
                            });
                            emitEvent(targetBattle, 'clash_round', {
                                index: roundIndex,
                                result: 'left-speed-break',
                                speedWinnerName: leftUnit.name,
                                leftPower,
                                rightPower,
                                leftFlips: formatCoinFlips(leftRoll.flips),
                                rightFlips: formatCoinFlips(rightRoll.flips),
                            });
                        } else {
                            leftCoins -= 1;
                            rounds.push({
                                result: 'right-speed-break',
                                leftPower,
                                rightPower,
                                leftFlips: leftRoll.flips,
                                rightFlips: rightRoll.flips,
                            });
                            emitEvent(targetBattle, 'clash_round', {
                                index: roundIndex,
                                result: 'right-speed-break',
                                speedWinnerName: rightUnit.name,
                                leftPower,
                                rightPower,
                                leftFlips: formatCoinFlips(leftRoll.flips),
                                rightFlips: formatCoinFlips(rightRoll.flips),
                            });
                        }
                        repeatedTieCount = 0;
                    }
                    continue;
                }

                repeatedTieCount = 0;

                if (leftPower > rightPower) {
                    rightCoins -= 1;
                    rounds.push({
                        result: 'left-win',
                        leftPower,
                        rightPower,
                        leftFlips: leftRoll.flips,
                        rightFlips: rightRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'left-win',
                        roundWinnerName: leftUnit.name,
                        roundLoserName: rightUnit.name,
                        winnerPower: leftPower,
                        loserPower: rightPower,
                        leftPower,
                        rightPower,
                        leftFlips: formatCoinFlips(leftRoll.flips),
                        rightFlips: formatCoinFlips(rightRoll.flips),
                    });
                } else {
                    leftCoins -= 1;
                    rounds.push({
                        result: 'right-win',
                        leftPower,
                        rightPower,
                        leftFlips: leftRoll.flips,
                        rightFlips: rightRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'right-win',
                        roundWinnerName: rightUnit.name,
                        roundLoserName: leftUnit.name,
                        winnerPower: rightPower,
                        loserPower: leftPower,
                        leftPower,
                        rightPower,
                        leftFlips: formatCoinFlips(leftRoll.flips),
                        rightFlips: formatCoinFlips(rightRoll.flips),
                    });
                }
            }

            return {
                rounds,
                winnerSide: leftCoins > 0 ? 'left' : 'right',
                leftRemainingCoins: leftCoins,
                rightRemainingCoins: rightCoins,
            };
        }

        function createClashPresentation(leftSlot, rightSlot, leftUnit, rightUnit, leftSkill, rightSkill, clashResult, hits, totalDamage, winnerSide) {
            const decisiveRound = [...clashResult.rounds].reverse().find((round) => round.result !== 'tie') || clashResult.rounds[clashResult.rounds.length - 1] || null;
            return {
                engagementType: 'clash',
                leftSlotId: leftSlot.id,
                rightSlotId: rightSlot.id,
                leftUnitName: leftUnit.name,
                rightUnitName: rightUnit.name,
                leftSkillId: leftSkill.id,
                rightSkillId: rightSkill.id,
                leftSkillName: leftSkill.name,
                rightSkillName: rightSkill.name,
                winnerSide,
                rounds: clashResult.rounds.map((round) => ({
                    result: round.result,
                    leftPower: round.leftPower,
                    rightPower: round.rightPower,
                    leftFlips: round.leftFlips,
                    rightFlips: round.rightFlips,
                })),
                hits,
                totalDamage,
                leftDisplayPower: decisiveRound?.leftPower || 0,
                rightDisplayPower: decisiveRound?.rightPower || 0,
            };
        }

        function createOneSidedPresentation(attackerSlot, defenderSlot, attacker, defender, skill, hits, totalDamage, options = {}) {
            const openingHit = hits[0] || null;
            const defenderSkill = options.defenderSkill || null;
            const rawRounds = Array.isArray(options.rounds) ? options.rounds : [];
            const rounds = rawRounds.map((round) => ({
                result: round.result,
                leftPower: attackerSlot.side === 'player' ? round.attackPower : round.defendPower,
                rightPower: attackerSlot.side === 'player' ? round.defendPower : round.attackPower,
                leftFlips: attackerSlot.side === 'player' ? round.attackFlips : round.defendFlips,
                rightFlips: attackerSlot.side === 'player' ? round.defendFlips : round.attackFlips,
            }));
            const decisiveRound = rounds[rounds.length - 1] || null;
            return {
                engagementType: 'one-sided',
                leftSlotId: attackerSlot.side === 'player' ? attackerSlot.id : defenderSlot.id,
                rightSlotId: attackerSlot.side === 'player' ? defenderSlot.id : attackerSlot.id,
                leftUnitName: attackerSlot.side === 'player' ? attacker.name : defender.name,
                rightUnitName: attackerSlot.side === 'player' ? defender.name : attacker.name,
                leftSkillId: attackerSlot.side === 'player' ? skill.id : defenderSkill?.id || null,
                rightSkillId: attackerSlot.side === 'enemy' ? skill.id : defenderSkill?.id || null,
                leftSkillName: attackerSlot.side === 'player' ? skill.name : defenderSkill?.name || 'No clash',
                rightSkillName: attackerSlot.side === 'enemy' ? skill.name : defenderSkill?.name || 'No clash',
                winnerSide: attackerSlot.side === 'player' ? 'left' : 'right',
                rounds,
                hits,
                totalDamage,
                leftDisplayPower: decisiveRound
                    ? decisiveRound.leftPower
                    : attackerSlot.side === 'player' ? (openingHit?.finalPower || 0) : 0,
                rightDisplayPower: decisiveRound
                    ? decisiveRound.rightPower
                    : attackerSlot.side === 'enemy' ? (openingHit?.finalPower || 0) : 0,
            };
        }

        function resolveFollowUpSkill(targetBattle, attacker, defender, followUpSkillId) {
            const followUpSkill = getSkillById(attacker, followUpSkillId);
            if (!followUpSkill || !isUnitAlive(attacker) || !isUnitAlive(defender)) {
                return [];
            }

            const slot = getSlotsForSide(targetBattle, attacker.side).find((candidate) => candidate.unitId === attacker.id);
            const context = createSkillContext(targetBattle, attacker, slot, followUpSkill, defender);
            const defenderContext = {
                damageReductionMultiplier: 1,
            };
            const hits = resolveOneSidedAttack(targetBattle, attacker, followUpSkill, defender, context, defenderContext, followUpSkill.coinCount);
            applyAttackEndEffects(targetBattle, attacker, followUpSkill, context);
            return hits;
        }

        function getActiveDefenseSkill(targetBattle, slot, attackerSlot = null) {
            if (!slot?.selectedSkillId) {
                return null;
            }

            if (attackerSlot && slot.targetSlotId && slot.targetSlotId !== attackerSlot.id) {
                return null;
            }

            const unit = getUnitById(targetBattle, slot.unitId);
            const skill = getSkillById(unit, slot.selectedSkillId);
            return isDefenseSkill(skill) ? skill : null;
        }

        function resolveAttackAgainstEvade(targetBattle, attacker, attackSkill, defender, evadeSkill, attackContext, evadeContext) {
            const hits = [];
            let evadedCoinCount = 0;
            let evadeBroken = false;
            const evadePowerBonus = getDefenseSkillFinalPowerBonus(defender, evadeSkill, attacker, attackSkill);
            const rounds = [];

            for (let coinIndex = 0; coinIndex < attackSkill.coinCount; coinIndex += 1) {
                attackContext.currentCoinIndex = coinIndex + 1;
                const roll = rollSingleCoin(targetBattle, attacker, attackSkill, attackContext);
                if (!roll || attacker.hp <= 0 || defender.hp <= 0) {
                    break;
                }

                const isCritical = rollCritical(targetBattle, attacker);
                const finalPower = roll.power + (isCritical ? (attackContext.critFinalPowerBonusByCoin[coinIndex + 1] || 0) : 0);

                if (!evadeBroken) {
                    const evadeRoll = rollSingleCoin(targetBattle, defender, evadeSkill, evadeContext);
                    const evadePower = (evadeRoll?.power || evadeSkill.basePower) + evadePowerBonus;
                    rounds.push({
                        result: evadePower >= finalPower ? 'evade' : 'hit',
                        attackPower: finalPower,
                        defendPower: evadePower,
                        attackFlips: [roll.isHeads],
                        defendFlips: typeof evadeRoll?.isHeads === 'boolean' ? [evadeRoll.isHeads] : [],
                    });

                    if (evadePower >= finalPower) {
                        evadedCoinCount += 1;
                        emitEvent(targetBattle, 'status_triggered', {
                            unitId: defender.id,
                            unitName: defender.name,
                            statusId: 'evade',
                            damage: 0,
                            hp: defender.hp,
                            attackerName: attacker.name,
                            index: coinIndex + 1,
                            attackPower: finalPower,
                            evadePower,
                        });
                        continue;
                    }

                    evadeBroken = true;
                }

                const damage = calculateHitDamage(attacker, attackSkill, defender, finalPower, attackContext, { damageReductionMultiplier: 1 }, isCritical);
                const previousHp = defender.hp;
                defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);
                applyStaggerFromDamage(targetBattle, defender, attacker, previousHp, defender.hp);
                triggerRuptureOnHit(targetBattle, defender);
                triggerSinkingOnHit(targetBattle, defender);

                hits.push({
                    finalPower,
                    damage,
                    isHeads: roll.isHeads,
                    isCritical,
                    targetHp: defender.hp,
                });

                emitEvent(targetBattle, 'hit_resolved', {
                    index: coinIndex + 1,
                    attackerId: attacker.id,
                    attackerName: attacker.name,
                    defenderId: defender.id,
                    defenderName: defender.name,
                    skillId: attackSkill.id,
                    skillName: attackSkill.name,
                    coinFace: roll.isHeads ? 'Heads' : 'Tails',
                    finalPower,
                    damage,
                    damageType: attackSkill.damageType,
                    previousHp,
                    nextHp: defender.hp,
                    isCritical,
                });

                invokeHooks(attacker, 'hitDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill: attackSkill, finalPower, damage, isCritical });
                invokeHooks(defender, 'hitTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill: attackSkill, finalPower, damage, isCritical });
                invokeHooks(attacker, 'damageDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill: attackSkill, damage });
                invokeHooks(defender, 'damageTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill: attackSkill, damage });

                applyCustomCoinEffects(targetBattle, attacker, defender, attackSkill, coinIndex + 1, isCritical);
                applyGenericSkillEffects(targetBattle, 'onHit', attacker, defender, attackSkill);
            }

            return {
                hits,
                evadedCoinCount,
                evadeBroken,
                rounds,
            };
        }

        function resolveCounterDefense(targetBattle, defenderSlot, defender, attackerSlot, attacker) {
            const counterSkill = getActiveDefenseSkill(targetBattle, defenderSlot, attackerSlot);
            if (!isCounterSkill(counterSkill)) {
                return null;
            }

            const defenseState = ensureDefenseState(defenderSlot);
            if (defenseState.used || !isUnitAlive(defender) || !isUnitAlive(attacker)) {
                return null;
            }

            if (!defenseState.context) {
                defenseState.context = createSkillContext(targetBattle, defender, defenderSlot, counterSkill, attacker);
            }
            defenseState.activated = true;
            defenseState.used = true;

            emitEvent(targetBattle, 'engagement_started', {
                engagementType: 'one-sided',
                attackerName: defender.name,
                defenderName: attacker.name,
                skillName: counterSkill.name,
            });

            const hits = resolveOneSidedAttack(
                targetBattle,
                defender,
                counterSkill,
                attacker,
                defenseState.context,
                { damageReductionMultiplier: 1 },
                counterSkill.coinCount,
            );
            applyAttackEndEffects(targetBattle, defender, counterSkill, defenseState.context);
            const totalDamage = hits.reduce((sum, hit) => sum + hit.damage, 0);
            return {
                hits,
                totalDamage,
                skill: counterSkill,
            };
        }

        function resolveClashEngagement(targetBattle, actingSlot, targetSlot) {
            const actingUnit = getUnitById(targetBattle, actingSlot.unitId);
            const targetUnit = getUnitById(targetBattle, targetSlot.unitId);
            const actingSkill = getSkillById(actingUnit, actingSlot.selectedSkillId);
            const targetSkill = getSkillById(targetUnit, targetSlot.selectedSkillId);
            const actingContext = createSkillContext(targetBattle, actingUnit, actingSlot, actingSkill, targetUnit);
            const targetContext = createSkillContext(targetBattle, targetUnit, targetSlot, targetSkill, actingUnit);
            const leftSideIsPlayer = actingSlot.side === 'player';
            const leftSlot = leftSideIsPlayer ? actingSlot : targetSlot;
            const rightSlot = leftSideIsPlayer ? targetSlot : actingSlot;
            const leftUnit = leftSideIsPlayer ? actingUnit : targetUnit;
            const rightUnit = leftSideIsPlayer ? targetUnit : actingUnit;
            const leftSkill = leftSideIsPlayer ? actingSkill : targetSkill;
            const rightSkill = leftSideIsPlayer ? targetSkill : actingSkill;
            const leftContext = leftSideIsPlayer ? actingContext : targetContext;
            const rightContext = leftSideIsPlayer ? targetContext : actingContext;

            emitEvent(targetBattle, 'engagement_started', {
                engagementType: 'clash',
                leftUnitName: leftUnit.name,
                rightUnitName: rightUnit.name,
                leftSkillName: leftSkill.name,
                rightSkillName: rightSkill.name,
            });

            const clashResult = resolveClash(targetBattle, leftSlot, rightSlot, leftUnit, leftSkill, rightUnit, rightSkill, leftContext, rightContext);
            const clashWinnerUnit = clashResult.winnerSide === 'left' ? leftUnit : rightUnit;
            const clashLoserUnit = clashResult.winnerSide === 'left' ? rightUnit : leftUnit;
            const winnerSkill = clashResult.winnerSide === 'left' ? leftSkill : rightSkill;
            const winnerContext = clashResult.winnerSide === 'left' ? leftContext : rightContext;
            const loserSkill = clashResult.winnerSide === 'left' ? rightSkill : leftSkill;
            const loserContext = clashResult.winnerSide === 'left' ? rightContext : leftContext;
            const remainingCoins = clashResult.winnerSide === 'left' ? clashResult.leftRemainingCoins : clashResult.rightRemainingCoins;
            const winnerSlot = clashResult.winnerSide === 'left' ? leftSlot : rightSlot;
            const loserSlot = clashResult.winnerSide === 'left' ? rightSlot : leftSlot;

            emitEvent(targetBattle, 'clash_won', {
                winnerName: clashWinnerUnit.name,
                loserName: clashLoserUnit.name,
                remainingCoins,
            });
            applyCustomClashOutcome(targetBattle, 'win', clashWinnerUnit, clashLoserUnit, winnerSkill);
            applyCustomClashOutcome(targetBattle, 'lose', clashLoserUnit, clashWinnerUnit, loserSkill);

            const winnerSanity = adjustSanity(clashWinnerUnit, 5);
            const loserSanity = adjustSanity(clashLoserUnit, -5);
            emitEvent(targetBattle, 'sanity_changed', {
                unitName: clashWinnerUnit.name,
                previousSp: winnerSanity.previousSp,
                nextSp: winnerSanity.nextSp,
                reason: 'clash win',
            });
            emitEvent(targetBattle, 'sanity_changed', {
                unitName: clashLoserUnit.name,
                previousSp: loserSanity.previousSp,
                nextSp: loserSanity.nextSp,
                reason: 'clash loss',
            });

            const hits = resolveOneSidedAttack(
                targetBattle,
                clashWinnerUnit,
                winnerSkill,
                clashLoserUnit,
                winnerContext,
                clashResult.winnerSide === 'left' ? rightContext : leftContext,
                remainingCoins,
            );
            const totalDamage = hits.reduce((sum, hit) => sum + hit.damage, 0);

            applyAttackEndEffects(targetBattle, clashWinnerUnit, winnerSkill, winnerContext);

            if (!isUnitAlive(clashLoserUnit)) {
                markUnitDefeated(targetBattle, clashLoserUnit, clashWinnerUnit);
            }
            if (!isUnitAlive(clashWinnerUnit)) {
                markUnitDefeated(targetBattle, clashWinnerUnit, clashLoserUnit);
            }

            targetBattle.clashPresentation = createClashPresentation(
                leftSlot,
                rightSlot,
                leftUnit,
                rightUnit,
                leftSkill,
                rightSkill,
                clashResult,
                hits,
                totalDamage,
                clashResult.winnerSide,
            );
            targetBattle.resolutionHistory.push(targetBattle.clashPresentation);
            targetBattle.lastResolution = {
                engagementType: 'clash',
                actingUnitName: clashWinnerUnit.name,
                targetUnitName: clashLoserUnit.name,
                actingSkillName: winnerSkill.name,
                totalDamage,
                remainingCoins,
            };

            if (loserContext.followUpSkillIdOnClashLose && isUnitAlive(clashLoserUnit) && isUnitAlive(clashWinnerUnit)) {
                const followUpSkill = getSkillById(clashLoserUnit, loserContext.followUpSkillIdOnClashLose);
                if (followUpSkill) {
                    emitEvent(targetBattle, 'engagement_started', {
                        engagementType: 'one-sided',
                        attackerName: clashLoserUnit.name,
                        defenderName: clashWinnerUnit.name,
                        skillName: followUpSkill.name,
                    });

                    const followUpHits = resolveFollowUpSkill(targetBattle, clashLoserUnit, clashWinnerUnit, loserContext.followUpSkillIdOnClashLose);
                    const followUpTotalDamage = followUpHits.reduce((sum, hit) => sum + hit.damage, 0);
                    const followUpPresentation = createOneSidedPresentation(
                        loserSlot,
                        winnerSlot,
                        clashLoserUnit,
                        clashWinnerUnit,
                        followUpSkill,
                        followUpHits,
                        followUpTotalDamage,
                    );
                    targetBattle.resolutionHistory.push(followUpPresentation);
                    targetBattle.lastResolution = {
                        engagementType: 'one-sided',
                        actingUnitName: clashLoserUnit.name,
                        targetUnitName: clashWinnerUnit.name,
                        actingSkillName: followUpSkill.name,
                        totalDamage: followUpTotalDamage,
                        remainingCoins: followUpSkill.coinCount,
                    };
                }
            }
        }

        function resolveOneSidedEngagement(targetBattle, actingSlot, targetSlot) {
            const actingUnit = getUnitById(targetBattle, actingSlot.unitId);
            const targetUnit = getUnitById(targetBattle, targetSlot.unitId);
            const actingSkill = getSkillById(actingUnit, actingSlot.selectedSkillId);
            const attackContext = createSkillContext(targetBattle, actingUnit, actingSlot, actingSkill, targetUnit);
            const defendingSkill = getActiveDefenseSkill(targetBattle, targetSlot, actingSlot);
            const defendContext = { damageReductionMultiplier: 1 };
            const defenseState = ensureDefenseState(targetSlot);

            emitEvent(targetBattle, 'engagement_started', {
                engagementType: 'one-sided',
                attackerName: actingUnit.name,
                defenderName: targetUnit.name,
                skillName: actingSkill.name,
            });

            let hits = [];
            let evadeResult = null;
            if (isEvadeSkill(defendingSkill) && !defenseState.broken && isUnitAlive(targetUnit)) {
                if (!defenseState.context) {
                    defenseState.context = createSkillContext(targetBattle, targetUnit, targetSlot, defendingSkill, actingUnit);
                }
                defenseState.activated = true;
                defenseState.used = true;
                evadeResult = resolveAttackAgainstEvade(targetBattle, actingUnit, actingSkill, targetUnit, defendingSkill, attackContext, defenseState.context);
                hits = evadeResult.hits;
                if (evadeResult.evadeBroken) {
                    defenseState.broken = true;
                }
            } else {
                hits = resolveOneSidedAttack(targetBattle, actingUnit, actingSkill, targetUnit, attackContext, defendContext, actingSkill.coinCount);
            }

            applyAttackEndEffects(targetBattle, actingUnit, actingSkill, attackContext);
            const totalDamage = hits.reduce((sum, hit) => sum + hit.damage, 0);

            if (!isUnitAlive(targetUnit)) {
                markUnitDefeated(targetBattle, targetUnit, actingUnit);
            }

            targetBattle.clashPresentation = createOneSidedPresentation(
                actingSlot,
                targetSlot,
                actingUnit,
                targetUnit,
                actingSkill,
                hits,
                totalDamage,
                {
                    defenderSkill: isEvadeSkill(defendingSkill) ? defendingSkill : null,
                    rounds: isEvadeSkill(defendingSkill) ? evadeResult?.rounds || [] : [],
                },
            );
            targetBattle.resolutionHistory.push(targetBattle.clashPresentation);
            targetBattle.lastResolution = {
                engagementType: 'one-sided',
                actingUnitName: actingUnit.name,
                targetUnitName: targetUnit.name,
                actingSkillName: actingSkill.name,
                totalDamage,
                remainingCoins: actingSkill.coinCount,
            };

            const counterResult = resolveCounterDefense(targetBattle, targetSlot, targetUnit, actingSlot, actingUnit);
            if (counterResult) {
                if (!isUnitAlive(actingUnit)) {
                    markUnitDefeated(targetBattle, actingUnit, targetUnit);
                }

                const counterPresentation = createOneSidedPresentation(
                    targetSlot,
                    actingSlot,
                    targetUnit,
                    actingUnit,
                    counterResult.skill,
                    counterResult.hits,
                    counterResult.totalDamage,
                );
                targetBattle.resolutionHistory.push(counterPresentation);
                targetBattle.lastResolution = {
                    engagementType: 'one-sided',
                    actingUnitName: targetUnit.name,
                    targetUnitName: actingUnit.name,
                    actingSkillName: counterResult.skill.name,
                    totalDamage: counterResult.totalDamage,
                    remainingCoins: counterResult.skill.coinCount,
                };
            }
        }

        function getSkillMaxPower(skill) {
            if (!skill) {
                return 0;
            }

            if (isPlusCoinSkill(skill)) {
                return skill.basePower + (skill.coinPower * skill.coinCount);
            }

            return skill.basePower;
        }

        function getAutoTargetSlotId(targetBattle, actingSlot, skill) {
            const opposingSlots = getSlotsForSide(targetBattle, getOpposingSide(actingSlot.side))
                .filter((slot) => isSlotAlive(targetBattle, slot));

            if (!opposingSlots.length) {
                return null;
            }

            if (skill.targeting !== 'highestMaxPower') {
                return null;
            }

            const scoredSlots = opposingSlots.map((slot) => {
                const targetUnit = getUnitById(targetBattle, slot.unitId);
                const skillId = slot.selectedSkillId || slot.intentSkillId || targetUnit.skills[0]?.id;
                return {
                    slotId: slot.id,
                    maxPower: getSkillMaxPower(getSkillById(targetUnit, skillId)),
                    speed: slot.speed,
                };
            });

            scoredSlots.sort((left, right) => {
                if (right.maxPower !== left.maxPower) {
                    return right.maxPower - left.maxPower;
                }
                if (right.speed !== left.speed) {
                    return right.speed - left.speed;
                }
                return left.slotId.localeCompare(right.slotId);
            });

            return scoredSlots[0]?.slotId || opposingSlots[0].id;
        }

        function buildResolutionQueue(targetBattle) {
            const queuedSlots = getAllSlots(targetBattle).filter((slot) => (
                isSlotActionable(targetBattle, slot) &&
                slot.selectedSkillId &&
                slot.targetSlotId
            ));

            const queue = sortSlotsBySpeed(targetBattle, queuedSlots);
            targetBattle.resolutionQueue = queue.map((slot) => slot.id);
            emitEvent(targetBattle, 'resolution_queue_built', {
                queueLabel: buildQueueLabel(targetBattle, queue),
            });
            return queue;
        }

        function hasAllPlayerAssignments(targetBattle) {
            return targetBattle.playerSlots
                .filter((slot) => isSlotActionable(targetBattle, slot))
                .every((slot) => {
                    if (!slot.selectedSkillId) {
                        return false;
                    }

                    return Boolean(slot.targetSlotId);
                });
        }

        function refreshSpeedOrder(targetBattle) {
            const queue = sortSlotsBySpeed(targetBattle, getAllSlots(targetBattle).filter((slot) => isSlotActionable(targetBattle, slot)));
            targetBattle.speedOrder = queue.map((slot) => slot.id);
        }

        function pickEnemySkillId(currentBattle, slot) {
            const enemyUnit = getUnitById(currentBattle, slot.unitId);
            const skillIndex = (currentBattle.turn + slot.index - 1) % enemyUnit.skills.length;
            return enemyUnit.skills[skillIndex].id;
        }

        function pickEnemyTargetSlotId(currentBattle, slot) {
            const mirroredPlayerSlot = currentBattle.playerSlots[slot.index];
            if (mirroredPlayerSlot && isSlotAlive(currentBattle, mirroredPlayerSlot)) {
                return mirroredPlayerSlot.id;
            }

            return getFirstLivingSlotId(currentBattle, 'player');
        }

        function refreshRedirectedTargets(targetBattle) {
            targetBattle.enemySlots.forEach((enemySlot) => {
                if (!isSlotActionable(targetBattle, enemySlot) || !enemySlot.selectedSkillId) {
                    return;
                }

                enemySlot.targetSlotId = enemySlot.intentTargetSlotId || getFirstLivingSlotId(targetBattle, 'player');
            });

            targetBattle.enemySlots.forEach((enemySlot) => {
                if (!isSlotActionable(targetBattle, enemySlot) || !enemySlot.selectedSkillId) {
                    return;
                }

                const redirectingSlots = targetBattle.playerSlots
                    .filter((playerSlot) => {
                        if (!isSlotActionable(targetBattle, playerSlot) || !playerSlot.selectedSkillId || playerSlot.targetSlotId !== enemySlot.id) {
                            return false;
                        }

                        const playerUnit = getUnitById(targetBattle, playerSlot.unitId);
                        const playerSkill = getSkillById(playerUnit, playerSlot.selectedSkillId);
                        if (isDefenseSkill(playerSkill)) {
                            return false;
                        }

                        return enemySlot.intentTargetSlotId === playerSlot.id
                            || playerSlot.speed > enemySlot.speed;
                    })
                    .sort((left, right) => {
                        const leftWasOriginallyTargeted = enemySlot.intentTargetSlotId === left.id;
                        const rightWasOriginallyTargeted = enemySlot.intentTargetSlotId === right.id;
                        if (leftWasOriginallyTargeted !== rightWasOriginallyTargeted) {
                            return leftWasOriginallyTargeted ? -1 : 1;
                        }

                        if (right.speed !== left.speed) {
                            return right.speed - left.speed;
                        }

                        return left.index - right.index;
                    });

                const redirectingSlot = redirectingSlots[0];
                if (redirectingSlot) {
                    enemySlot.targetSlotId = redirectingSlot.id;
                }
            });
        }

        function getPlayerTemplates() {
            if (Array.isArray(battleDefinition.playerUnits) && battleDefinition.playerUnits.length) {
                return battleDefinition.playerUnits;
            }

            return battleDefinition.hero ? [battleDefinition.hero] : [];
        }

        function getEnemyTemplates() {
            if (Array.isArray(battleDefinition.enemyUnits) && battleDefinition.enemyUnits.length) {
                return battleDefinition.enemyUnits;
            }

            return battleDefinition.enemy ? [battleDefinition.enemy] : [];
        }

        function createDebugBattleState() {
            const playerUnits = getPlayerTemplates().map((template, index) => createBattleUnit(template, 'player', index));
            const enemyUnits = getEnemyTemplates().map((template, index) => createBattleUnit(template, 'enemy', index));
            const playerSlots = playerUnits.map((unit, index) => createBattleSlot(unit, 'player', index));
            const enemySlots = enemyUnits.map((unit, index) => createBattleSlot(unit, 'enemy', index));

            const nextBattle = {
                turn: 0,
                phase: 'setup',
                winner: null,
                log: [],
                events: [],
                defeatedUnitIds: [],
                playerUnits,
                enemyUnits,
                playerSlots,
                enemySlots,
                activePlayerSlotId: playerSlots[0]?.id || null,
                speedOrder: [],
                resolutionQueue: [],
                lastResolution: null,
                clashPresentation: null,
                resolutionHistory: [],
            };

            emitEvent(nextBattle, 'battle_started', {
                playerTeamName: playerUnits.map((unit) => unit.name).join(', '),
                enemyTeamName: enemyUnits.map((unit) => unit.name).join(', '),
            });
            startDebugBattleTurn(nextBattle);
            return nextBattle;
        }

        function startDebugBattleTurn(targetBattle) {
            if (targetBattle.winner) {
                return;
            }

            targetBattle.turn += 1;
            targetBattle.phase = 'select';
            targetBattle.lastResolution = null;
            targetBattle.clashPresentation = null;
            targetBattle.resolutionQueue = [];
            targetBattle.resolutionHistory = [];
            if (typeof onTurnStarted === 'function') {
                onTurnStarted(targetBattle);
            }

            emitEvent(targetBattle, 'turn_started', {
                turn: targetBattle.turn,
            });

            getAllUnits(targetBattle).forEach((unit) => {
                unit.turnState = {};
                processQueuedStatusesAtTurnStart(targetBattle, unit);
                progressStaggerTurnState(targetBattle, unit);
            });

            getAllSlots(targetBattle).forEach((slot) => {
                const unit = getUnitById(targetBattle, slot.unitId);
                slot.resolved = false;
                slot.selectedSkillId = null;
                slot.intentSkillId = null;
                slot.intentTargetSlotId = null;
                slot.manualTargetLock = false;
                slot.defenseState = {
                    activated: false,
                    used: false,
                    broken: false,
                    context: null,
                };
                if (isUnitStaggered(unit)) {
                    slot.speed = 0;
                    slot.targetSlotId = null;
                    slot.resolved = true;
                } else {
                    slot.speed = randomInt(...unit.speedRange);
                    slot.targetSlotId = getFirstLivingSlotId(targetBattle, getOpposingSide(slot.side));
                }
                unit.speed = slot.speed;

                emitEvent(targetBattle, 'slot_speed_rolled', {
                    unitName: unit.name,
                    slotLabel: getSlotLabel(slot),
                    speed: slot.speed,
                });
            });

            targetBattle.enemySlots.forEach((slot) => {
                if (!isSlotActionable(targetBattle, slot)) {
                    return;
                }

                const enemyUnit = getUnitById(targetBattle, slot.unitId);
                slot.selectedSkillId = pickEnemySkillId(targetBattle, slot);
                slot.intentSkillId = slot.selectedSkillId;
                const skill = getSkillById(enemyUnit, slot.selectedSkillId);
                slot.intentTargetSlotId = getAutoTargetSlotId(targetBattle, slot, skill) || pickEnemyTargetSlotId(targetBattle, slot);
                slot.targetSlotId = slot.intentTargetSlotId;
                emitEvent(targetBattle, 'enemy_intent_set', {
                    unitName: enemyUnit.name,
                    slotLabel: getSlotLabel(slot),
                    skillName: skill.name,
                    targetLabel: getSlotTargetLabel(targetBattle, slot.targetSlotId),
                });
            });

            refreshRedirectedTargets(targetBattle);

            refreshSpeedOrder(targetBattle);
            ensureActivePlayerSlot(targetBattle);

            getAllUnits(targetBattle).forEach((unit) => {
                const opposingUnits = getUnitsForSide(targetBattle, getOpposingSide(unit.side));
                invokeHooks(unit, 'turnStart', {
                    battle: targetBattle,
                    unit,
                    opposingUnits,
                });
            });
        }

        function getState() {
            return battle;
        }

        function selectSlot(slotId) {
            if (battle.phase !== 'select' || battle.winner) {
                return false;
            }

            const slot = getSlotById(battle, slotId);
            if (!slot || slot.side !== 'player' || !isSlotActionable(battle, slot)) {
                return false;
            }

            battle.activePlayerSlotId = slot.id;
            return true;
        }

        function selectSkill(skillId, slotId = ensureActivePlayerSlot(battle)?.id) {
            if (battle.phase !== 'select' || battle.winner || !slotId) {
                return false;
            }

            const slot = getSlotById(battle, slotId);
            if (!slot || slot.side !== 'player' || !isSlotActionable(battle, slot)) {
                return false;
            }

            const unit = getUnitById(battle, slot.unitId);
            const skill = getSkillById(unit, skillId);
            if (!skill) {
                return false;
            }

            slot.selectedSkillId = skillId;
            slot.manualTargetLock = false;
            slot.targetSlotId = skill.targeting === 'highestMaxPower'
                ? getAutoTargetSlotId(battle, slot, skill)
                : (slot.targetSlotId || getFirstLivingSlotId(battle, 'enemy'));
            slot.defenseState = {
                activated: false,
                used: false,
                broken: false,
                context: null,
            };
            battle.activePlayerSlotId = slot.id;
            refreshRedirectedTargets(battle);

            emitEvent(battle, 'skill_selected', {
                unitName: unit.name,
                slotLabel: getSlotLabel(slot),
                skillName: skill.name,
            });

            return true;
        }

        function selectTarget(targetSlotId, slotId = ensureActivePlayerSlot(battle)?.id) {
            if (battle.phase !== 'select' || battle.winner || !slotId) {
                return false;
            }

            const slot = getSlotById(battle, slotId);
            const targetSlot = getSlotById(battle, targetSlotId);
            if (!slot || slot.side !== 'player' || !isSlotActionable(battle, slot) || !targetSlot || targetSlot.side !== 'enemy' || !isSlotAlive(battle, targetSlot)) {
                return false;
            }

            const unit = getUnitById(battle, slot.unitId);
            slot.targetSlotId = targetSlot.id;
            slot.manualTargetLock = true;

            battle.activePlayerSlotId = slot.id;
            refreshRedirectedTargets(battle);
            emitEvent(battle, 'target_selected', {
                unitName: unit.name,
                slotLabel: getSlotLabel(slot),
                targetLabel: getSlotTargetLabel(battle, slot.targetSlotId),
            });
            return true;
        }

        function normalizeAutoTargets(targetBattle) {
            getAllSlots(targetBattle).forEach((slot) => {
                if (!slot.selectedSkillId || !isSlotActionable(targetBattle, slot)) {
                    return;
                }

                const unit = getUnitById(targetBattle, slot.unitId);
                const skill = getSkillById(unit, slot.selectedSkillId);
                if (skill?.targeting === 'highestMaxPower' && !slot.manualTargetLock) {
                    slot.targetSlotId = getAutoTargetSlotId(targetBattle, slot, skill);
                } else if (!slot.targetSlotId || !isSlotAlive(targetBattle, getSlotById(targetBattle, slot.targetSlotId))) {
                    slot.targetSlotId = getFirstLivingSlotId(targetBattle, getOpposingSide(slot.side));
                }
            });

            refreshRedirectedTargets(targetBattle);
        }

        function resolveTurn() {
            if (battle.phase !== 'select' || battle.winner || !hasAllPlayerAssignments(battle)) {
                return false;
            }

            normalizeAutoTargets(battle);
            const queue = buildResolutionQueue(battle);
            for (const slot of queue) {
                if (battle.winner) {
                    break;
                }

                if (slot.resolved || !isSlotActionable(battle, slot) || !slot.selectedSkillId) {
                    continue;
                }

                const actingUnit = getUnitById(battle, slot.unitId);
                const actingSkill = getSkillById(actingUnit, slot.selectedSkillId);
                if (isDefenseSkill(actingSkill)) {
                    slot.resolved = true;
                    continue;
                }

                if (!slot.targetSlotId) {
                    continue;
                }

                const targetSlot = getSlotById(battle, slot.targetSlotId);
                if (!targetSlot || !isSlotAlive(battle, targetSlot)) {
                    slot.resolved = true;
                    continue;
                }

                const targetUnit = getUnitById(battle, targetSlot.unitId);
                const targetSkill = targetSlot.selectedSkillId ? getSkillById(targetUnit, targetSlot.selectedSkillId) : null;

                const mutualTarget = (
                    !targetSlot.resolved &&
                    targetSlot.targetSlotId === slot.id &&
                    Boolean(targetSlot.selectedSkillId) &&
                    !isDefenseSkill(targetSkill) &&
                    isSlotAlive(battle, targetSlot)
                );

                if (mutualTarget) {
                    resolveClashEngagement(battle, slot, targetSlot);
                    slot.resolved = true;
                    targetSlot.resolved = true;
                } else {
                    resolveOneSidedEngagement(battle, slot, targetSlot);
                    slot.resolved = true;
                }

                finalizeBattleOnDeaths(battle);
            }

            getAllUnits(battle).forEach((unit) => {
                const opposingUnits = getUnitsForSide(battle, getOpposingSide(unit.side));
                invokeHooks(unit, 'turnEnd', {
                    battle,
                    unit,
                    opposingUnits,
                });
            });

            getAllUnits(battle).forEach((unit) => {
                processBurnAtTurnEnd(battle, unit);
            });
            getAllUnits(battle).forEach((unit) => {
                processPoiseAtTurnEnd(battle, unit);
            });
            getAllUnits(battle).forEach((unit) => {
                expireTurnStatuses(battle, unit);
            });

            finalizeBattleOnDeaths(battle);
            if (!battle.winner) {
                battle.phase = 'resolved';
            }

            return true;
        }

        function advanceTurn() {
            if (battle.phase !== 'resolved' || battle.winner) {
                return false;
            }

            startDebugBattleTurn(battle);
            return true;
        }

        function reset() {
            nextEventId = 1;
            battle = createDebugBattleState();
        }

        function addStatus(side, status, unitIndex = 0) {
            const unit = getUnitsForSide(battle, side)[unitIndex];
            if (!unit) {
                return false;
            }

            unit.statuses.push(status);
            return true;
        }

        function clearStatuses(side, unitIndex = null) {
            const units = getUnitsForSide(battle, side);
            if (unitIndex === null) {
                units.forEach((unit) => {
                    unit.statuses = [];
                });
                return true;
            }

            if (!units[unitIndex]) {
                return false;
            }

            units[unitIndex].statuses = [];
            return true;
        }

        return {
            getState,
            selectSlot,
            selectSkill,
            selectTarget,
            resolveTurn,
            advanceTurn,
            reset,
            addStatus,
            clearStatuses,
        };
    }

    battleModules.createBattleEngine = createBattleEngine;
})();
