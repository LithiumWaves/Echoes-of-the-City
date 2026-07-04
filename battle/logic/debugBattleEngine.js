(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

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
            resistances: { ...template.resistances },
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
            targetSlotId: null,
            resolved: false,
        };
    }

    battleModules.createDebugBattleEngine = function createDebugBattleEngine(options) {
        const { clamp, debugFightTemplate } = options;
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
            return unit.skills.find((skill) => skill.id === skillId) || null;
        }

        function isUnitAlive(unit) {
            return Boolean(unit) && unit.hp > 0;
        }

        function isSlotAlive(targetBattle, slot) {
            return isUnitAlive(getUnitById(targetBattle, slot.unitId));
        }

        function getFirstLivingSlot(targetBattle, side) {
            return getSlotsForSide(targetBattle, side).find((slot) => isSlotAlive(targetBattle, slot)) || null;
        }

        function getFirstLivingSlotId(targetBattle, side) {
            return getFirstLivingSlot(targetBattle, side)?.id || null;
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

        function getActivePlayerSlot(targetBattle) {
            const activeSlot = getSlotById(targetBattle, targetBattle.activePlayerSlotId);
            if (activeSlot && activeSlot.side === 'player' && isSlotAlive(targetBattle, activeSlot)) {
                return activeSlot;
            }

            return getFirstLivingSlot(targetBattle, 'player');
        }

        function ensureActivePlayerSlot(targetBattle) {
            const activeSlot = getActivePlayerSlot(targetBattle);
            targetBattle.activePlayerSlotId = activeSlot?.id || null;
            return activeSlot;
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
                return `Hit ${data.index}: ${data.coinFace} for Power ${data.finalPower}, dealing ${data.damage} ${data.damageType} damage.`;
            }
            if (type === 'status_applied') {
                if (data.statusId === 'protection') {
                    return `${data.unitName} gains Protection ${data.count}.`;
                }
                return `${data.unitName} gains ${data.statusId} ${data.potency}/${data.count}.`;
            }
            if (type === 'status_changed') {
                if (data.statusId === 'protection') {
                    return `${data.unitName} Protection ${data.previousCount} -> ${data.nextCount}.`;
                }
                return `${data.unitName} ${data.statusId} ${data.previousPotency}/${data.previousCount} -> ${data.nextPotency}/${data.nextCount}.`;
            }
            if (type === 'status_triggered') {
                if (data.statusId === 'burn') {
                    return `${data.unitName} takes ${data.damage} fixed damage from Burn.`;
                }
                if (data.statusId === 'bleed') {
                    return `${data.unitName} takes ${data.damage} fixed damage from Bleed.`;
                }
                return `${data.unitName} takes ${data.damage} fixed damage from ${data.statusId}.`;
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

        function getStatus(unit, statusId) {
            const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
            return statuses.find((status) => status?.id === statusId) || null;
        }

        function removeStatus(unit, statusId) {
            unit.statuses = (Array.isArray(unit.statuses) ? unit.statuses : []).filter((status) => status?.id !== statusId);
        }

        function applyStatus(targetBattle, unit, statusId, payload) {
            const potencyDelta = typeof payload?.potency === 'number' ? payload.potency : 0;
            const countDelta = typeof payload?.count === 'number' ? payload.count : 0;

            if (statusId === 'protection') {
                const existing = getStatus(unit, statusId);
                const previousCount = existing?.count || 0;
                const nextCount = clampStatusValue(previousCount + countDelta, 10);
                if (!existing) {
                    const status = { id: 'protection', count: nextCount, potency: 0, expiresAtTurn: targetBattle.turn };
                    unit.statuses.push(status);
                    emitEvent(targetBattle, 'status_applied', {
                        unitId: unit.id,
                        unitName: unit.name,
                        statusId: 'protection',
                        count: status.count,
                    });
                    return status;
                }

                existing.count = nextCount;
                existing.expiresAtTurn = targetBattle.turn;
                emitEvent(targetBattle, 'status_changed', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId: 'protection',
                    previousCount,
                    nextCount,
                });
                return existing;
            }

            const maxPotency = 99;
            const maxCount = 99;
            const existing = getStatus(unit, statusId);
            const previousPotency = existing?.potency || 0;
            const previousCount = existing?.count || 0;
            const nextPotency = clampStatusValue(previousPotency + potencyDelta, maxPotency);
            const nextCount = clampStatusValue(previousCount + countDelta, maxCount);

            if (!existing) {
                const status = { id: statusId, potency: nextPotency, count: nextCount };
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

        function applyFixedDamage(targetBattle, unit, statusId, damage) {
            const appliedDamage = clampStatusValue(damage, 9999);
            if (appliedDamage <= 0) {
                return 0;
            }

            unit.hp = clamp(unit.hp - appliedDamage, 0, unit.maxHp);
            emitEvent(targetBattle, 'status_triggered', {
                unitId: unit.id,
                unitName: unit.name,
                statusId,
                damage: appliedDamage,
                hp: unit.hp,
            });
            return appliedDamage;
        }

        function applySkillEffects(targetBattle, trigger, attacker, defender, skill) {
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

        function processBurnAtTurnEnd(targetBattle, unit) {
            const burn = getStatus(unit, 'burn');
            if (!burn || burn.count <= 0 || burn.potency <= 0 || unit.hp <= 0) {
                return;
            }

            const previousCount = burn.count;
            applyFixedDamage(targetBattle, unit, 'burn', burn.potency);
            burn.count = clampStatusValue(burn.count - 1, 99);
            emitEvent(targetBattle, 'status_changed', {
                unitId: unit.id,
                unitName: unit.name,
                statusId: 'burn',
                previousPotency: burn.potency,
                previousCount,
                nextPotency: burn.potency,
                nextCount: burn.count,
            });
            if (burn.count <= 0) {
                removeStatus(unit, 'burn');
                emitEvent(targetBattle, 'status_expired', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId: 'burn',
                });
            }
        }

        function expireProtectionAtTurnEnd(targetBattle, unit) {
            const protection = getStatus(unit, 'protection');
            if (!protection || protection.count <= 0) {
                return;
            }

            removeStatus(unit, 'protection');
            emitEvent(targetBattle, 'status_expired', {
                unitId: unit.id,
                unitName: unit.name,
                statusId: 'protection',
            });
        }

        function triggerBleedOnCoinRoll(targetBattle, unit) {
            const bleed = getStatus(unit, 'bleed');
            if (!bleed || bleed.count <= 0 || bleed.potency <= 0 || unit.hp <= 0) {
                return;
            }

            const previousCount = bleed.count;
            applyFixedDamage(targetBattle, unit, 'bleed', bleed.potency);
            bleed.count = clampStatusValue(bleed.count - 1, 99);
            emitEvent(targetBattle, 'status_changed', {
                unitId: unit.id,
                unitName: unit.name,
                statusId: 'bleed',
                previousPotency: bleed.potency,
                previousCount,
                nextPotency: bleed.potency,
                nextCount: bleed.count,
            });
            if (bleed.count <= 0) {
                removeStatus(unit, 'bleed');
                emitEvent(targetBattle, 'status_expired', {
                    unitId: unit.id,
                    unitName: unit.name,
                    statusId: 'bleed',
                });
            }
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

        function processEndOfTurnStatuses(targetBattle) {
            getAllUnits(targetBattle).forEach((unit) => {
                processBurnAtTurnEnd(targetBattle, unit);
            });
            getAllUnits(targetBattle).forEach((unit) => {
                expireProtectionAtTurnEnd(targetBattle, unit);
            });
            finalizeBattleOnDeaths(targetBattle);
        }

        function getCoinHeadChance(unit) {
            return clamp(50 + unit.sp, 5, 95);
        }

        function getSkillOffenseLevel(unit, skill) {
            return Math.max(1, unit.level + (skill.offenseLevel || 0));
        }

        function getDefenseLevel(unit) {
            return Math.max(1, unit.defenseLevel || unit.level);
        }

        function getClashLevelBonus(unit, skill, opponent, opponentSkill) {
            const levelDifference = getSkillOffenseLevel(unit, skill) - getSkillOffenseLevel(opponent, opponentSkill);
            return levelDifference > 0 ? Math.floor(levelDifference / 3) : 0;
        }

        function getResistanceMultiplier(unit, damageType) {
            return unit.resistances[damageType] || 1;
        }

        function calculateHitDamage(attacker, skill, defender, finalPower) {
            const resistance = getResistanceMultiplier(defender, skill.damageType);
            const levelDifference = getSkillOffenseLevel(attacker, skill) - getDefenseLevel(defender);
            const damageModifier = 1 + (levelDifference / (Math.abs(levelDifference) + 25));
            const rawDamage = Math.max(1, Math.round(finalPower * resistance * damageModifier));
            const protection = getStatus(defender, 'protection');
            if (protection?.count > 0) {
                const reduction = clampStatusValue(protection.count, 10) * 0.1;
                return Math.max(0, Math.round(rawDamage * (1 - reduction)));
            }
            return rawDamage;
        }

        function flipCoins(targetBattle, unit, skill, coinCount) {
            const flips = [];
            let power = skill.basePower;
            const headChance = getCoinHeadChance(unit);

            for (let index = 0; index < coinCount; index += 1) {
                triggerBleedOnCoinRoll(targetBattle, unit);
                if (unit.hp <= 0) {
                    break;
                }

                const isHeads = Math.random() * 100 < headChance;
                flips.push(isHeads);
                if (isHeads) {
                    power += skill.coinPower;
                }
            }

            return { flips, power };
        }

        function formatCoinFlips(flips) {
            return flips.map((isHeads) => (isHeads ? 'H' : 'T')).join(' ');
        }

        function adjustSanity(unit, amount) {
            const previousSp = unit.sp;
            unit.sp = clamp(unit.sp + amount, -45, 45);
            return { previousSp, nextSp: unit.sp };
        }

        function pickEnemySkillId(currentBattle, slot) {
            const enemyUnit = getUnitById(currentBattle, slot.unitId);
            const skillIndex = (currentBattle.turn + slot.index - 1) % enemyUnit.skills.length;
            return enemyUnit.skills[skillIndex].id;
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

        function getViewSides(playerSideUnit, enemySideUnit, leftSlot, rightSlot) {
            if (leftSlot.side === 'player') {
                return {
                    leftUnit: playerSideUnit,
                    rightUnit: enemySideUnit,
                    leftSlot,
                    rightSlot,
                };
            }

            return {
                leftUnit: enemySideUnit,
                rightUnit: playerSideUnit,
                leftSlot: rightSlot,
                rightSlot: leftSlot,
            };
        }

        function resolveClash(targetBattle, leftSlot, rightSlot, leftUnit, leftSkill, rightUnit, rightSkill) {
            let leftCoins = leftSkill.coinCount;
            let rightCoins = rightSkill.coinCount;
            let repeatedTieCount = 0;
            let roundIndex = 0;
            const rounds = [];

            while (leftCoins > 0 && rightCoins > 0) {
                roundIndex += 1;
                const leftCoinsBefore = leftCoins;
                const rightCoinsBefore = rightCoins;
                const leftRoll = flipCoins(targetBattle, leftUnit, leftSkill, leftCoins);
                const rightRoll = flipCoins(targetBattle, rightUnit, rightSkill, rightCoins);
                const leftPower = leftRoll.power + getClashLevelBonus(leftUnit, leftSkill, rightUnit, rightSkill);
                const rightPower = rightRoll.power + getClashLevelBonus(rightUnit, rightSkill, leftUnit, leftSkill);

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
                                leftCoinsBefore,
                                rightCoinsBefore,
                                leftCoinsAfter: leftCoins,
                                rightCoinsAfter: rightCoins,
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
                                leftCoinsBefore,
                                rightCoinsBefore,
                                leftCoinsAfter: leftCoins,
                                rightCoinsAfter: rightCoins,
                            });
                        }
                        repeatedTieCount = 0;
                    }

                    invokeHooks(leftUnit, 'clashRound', { battle: targetBattle, unit: leftUnit, opponent: rightUnit, skill: leftSkill, opponentSkill: rightSkill });
                    invokeHooks(rightUnit, 'clashRound', { battle: targetBattle, unit: rightUnit, opponent: leftUnit, skill: rightSkill, opponentSkill: leftSkill });
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
                        leftCoinsBefore,
                        rightCoinsBefore,
                        leftCoinsAfter: leftCoins,
                        rightCoinsAfter: rightCoins,
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
                        leftCoinsBefore,
                        rightCoinsBefore,
                        leftCoinsAfter: leftCoins,
                        rightCoinsAfter: rightCoins,
                    });
                }

                invokeHooks(leftUnit, 'clashRound', { battle: targetBattle, unit: leftUnit, opponent: rightUnit, skill: leftSkill, opponentSkill: rightSkill });
                invokeHooks(rightUnit, 'clashRound', { battle: targetBattle, unit: rightUnit, opponent: leftUnit, skill: rightSkill, opponentSkill: leftSkill });
            }

            return {
                rounds,
                winnerSide: leftCoins > 0 ? 'left' : 'right',
                leftRemainingCoins: leftCoins,
                rightRemainingCoins: rightCoins,
            };
        }

        function resolveOneSidedAttack(targetBattle, attacker, skill, defender, remainingCoins) {
            const hits = [];

            for (let coinIndex = 0; coinIndex < remainingCoins; coinIndex += 1) {
                const flip = flipCoins(targetBattle, attacker, skill, 1);
                const finalPower = flip.power;
                const damage = calculateHitDamage(attacker, skill, defender, finalPower);
                const previousHp = defender.hp;

                defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);
                hits.push({
                    finalPower,
                    damage,
                    isHeads: flip.flips[0],
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
                    coinFace: flip.flips[0] ? 'Heads' : 'Tails',
                    finalPower,
                    damage,
                    damageType: skill.damageType,
                    previousHp,
                    nextHp: defender.hp,
                });
                invokeHooks(attacker, 'hitDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill, finalPower, damage });
                invokeHooks(defender, 'hitTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill, finalPower, damage });
                invokeHooks(attacker, 'damageDealt', { battle: targetBattle, unit: attacker, opponent: defender, skill, damage });
                invokeHooks(defender, 'damageTaken', { battle: targetBattle, unit: defender, opponent: attacker, skill, damage });
                applySkillEffects(targetBattle, 'onHit', attacker, defender, skill);

                if (defender.hp <= 0) {
                    break;
                }
            }

            return hits;
        }

        function createClashPresentation(battleState, leftSlot, rightSlot, leftUnit, rightUnit, leftSkill, rightSkill, clashResult, hits, totalDamage, winnerSide) {
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
            };
        }

        function createOneSidedPresentation(attackerSlot, defenderSlot, attacker, defender, skill, hits, totalDamage) {
            return {
                engagementType: 'one-sided',
                leftSlotId: attackerSlot.side === 'player' ? attackerSlot.id : defenderSlot.id,
                rightSlotId: attackerSlot.side === 'player' ? defenderSlot.id : attackerSlot.id,
                leftUnitName: attackerSlot.side === 'player' ? attacker.name : defender.name,
                rightUnitName: attackerSlot.side === 'player' ? defender.name : attacker.name,
                leftSkillId: attackerSlot.side === 'player' ? skill.id : null,
                rightSkillId: attackerSlot.side === 'enemy' ? skill.id : null,
                leftSkillName: attackerSlot.side === 'player' ? skill.name : 'No clash',
                rightSkillName: attackerSlot.side === 'enemy' ? skill.name : 'No clash',
                winnerSide: attackerSlot.side === 'player' ? 'left' : 'right',
                rounds: [],
                hits,
                totalDamage,
            };
        }

        function resolveClashEngagement(targetBattle, actingSlot, targetSlot) {
            const actingUnit = getUnitById(targetBattle, actingSlot.unitId);
            const targetUnit = getUnitById(targetBattle, targetSlot.unitId);
            const actingSkill = getSkillById(actingUnit, actingSlot.selectedSkillId);
            const targetSkill = getSkillById(targetUnit, targetSlot.selectedSkillId);
            const leftSideIsPlayer = actingSlot.side === 'player';
            const leftSlot = leftSideIsPlayer ? actingSlot : targetSlot;
            const rightSlot = leftSideIsPlayer ? targetSlot : actingSlot;
            const leftUnit = leftSideIsPlayer ? actingUnit : targetUnit;
            const rightUnit = leftSideIsPlayer ? targetUnit : actingUnit;
            const leftSkill = leftSideIsPlayer ? actingSkill : targetSkill;
            const rightSkill = leftSideIsPlayer ? targetSkill : actingSkill;

            emitEvent(targetBattle, 'engagement_started', {
                engagementType: 'clash',
                leftUnitName: leftUnit.name,
                rightUnitName: rightUnit.name,
                leftSkillName: leftSkill.name,
                rightSkillName: rightSkill.name,
            });

            invokeHooks(leftUnit, 'clashStart', { battle: targetBattle, unit: leftUnit, opponent: rightUnit, skill: leftSkill, opponentSkill: rightSkill });
            invokeHooks(rightUnit, 'clashStart', { battle: targetBattle, unit: rightUnit, opponent: leftUnit, skill: rightSkill, opponentSkill: leftSkill });

            const clashResult = resolveClash(targetBattle, leftSlot, rightSlot, leftUnit, leftSkill, rightUnit, rightSkill);
            const clashWinnerUnit = clashResult.winnerSide === 'left' ? leftUnit : rightUnit;
            const clashLoserUnit = clashResult.winnerSide === 'left' ? rightUnit : leftUnit;
            const attackSkill = clashResult.winnerSide === 'left' ? leftSkill : rightSkill;
            const remainingCoins = clashResult.winnerSide === 'left' ? clashResult.leftRemainingCoins : clashResult.rightRemainingCoins;

            emitEvent(targetBattle, 'clash_won', {
                winnerName: clashWinnerUnit.name,
                loserName: clashLoserUnit.name,
                remainingCoins,
            });
            invokeHooks(clashWinnerUnit, 'clashWin', { battle: targetBattle, unit: clashWinnerUnit, opponent: clashLoserUnit, skill: attackSkill });
            invokeHooks(clashLoserUnit, 'clashLose', { battle: targetBattle, unit: clashLoserUnit, opponent: clashWinnerUnit, skill: attackSkill });

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

            const hits = resolveOneSidedAttack(targetBattle, clashWinnerUnit, attackSkill, clashLoserUnit, remainingCoins);
            const totalDamage = hits.reduce((sum, hit) => sum + hit.damage, 0);
            if (!isUnitAlive(clashLoserUnit)) {
                markUnitDefeated(targetBattle, clashLoserUnit, clashWinnerUnit);
            }

            const winnerSide = clashResult.winnerSide;
            targetBattle.clashPresentation = createClashPresentation(
                targetBattle,
                leftSlot,
                rightSlot,
                leftUnit,
                rightUnit,
                leftSkill,
                rightSkill,
                clashResult,
                hits,
                totalDamage,
                winnerSide,
            );
            targetBattle.lastResolution = {
                engagementType: 'clash',
                actingUnitName: clashWinnerUnit.name,
                targetUnitName: clashLoserUnit.name,
                actingSkillName: attackSkill.name,
                totalDamage,
                remainingCoins,
            };
        }

        function resolveOneSidedEngagement(targetBattle, actingSlot, targetSlot) {
            const actingUnit = getUnitById(targetBattle, actingSlot.unitId);
            const targetUnit = getUnitById(targetBattle, targetSlot.unitId);
            const actingSkill = getSkillById(actingUnit, actingSlot.selectedSkillId);

            emitEvent(targetBattle, 'engagement_started', {
                engagementType: 'one-sided',
                attackerName: actingUnit.name,
                defenderName: targetUnit.name,
                skillName: actingSkill.name,
            });
            invokeHooks(actingUnit, 'oneSidedStart', { battle: targetBattle, unit: actingUnit, opponent: targetUnit, skill: actingSkill, remainingCoins: actingSkill.coinCount });

            const hits = resolveOneSidedAttack(targetBattle, actingUnit, actingSkill, targetUnit, actingSkill.coinCount);
            const totalDamage = hits.reduce((sum, hit) => sum + hit.damage, 0);
            if (!isUnitAlive(targetUnit)) {
                markUnitDefeated(targetBattle, targetUnit, actingUnit);
            }

            targetBattle.clashPresentation = createOneSidedPresentation(actingSlot, targetSlot, actingUnit, targetUnit, actingSkill, hits, totalDamage);
            targetBattle.lastResolution = {
                engagementType: 'one-sided',
                actingUnitName: actingUnit.name,
                targetUnitName: targetUnit.name,
                actingSkillName: actingSkill.name,
                totalDamage,
                remainingCoins: actingSkill.coinCount,
            };
        }

        function buildResolutionQueue(targetBattle) {
            const queuedSlots = getAllSlots(targetBattle).filter((slot) => (
                isSlotAlive(targetBattle, slot) &&
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
                .filter((slot) => isSlotAlive(targetBattle, slot))
                .every((slot) => Boolean(slot.selectedSkillId && slot.targetSlotId));
        }

        function refreshSpeedOrder(targetBattle) {
            const queue = sortSlotsBySpeed(targetBattle, getAllSlots(targetBattle).filter((slot) => isSlotAlive(targetBattle, slot)));
            targetBattle.speedOrder = queue.map((slot) => slot.id);
        }

        function createDebugBattleState() {
            const playerUnits = [createBattleUnit(debugFightTemplate.hero, 'player', 0)];
            const enemyUnits = [createBattleUnit(debugFightTemplate.enemy, 'enemy', 0)];
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

            emitEvent(targetBattle, 'turn_started', {
                turn: targetBattle.turn,
            });

            getAllSlots(targetBattle).forEach((slot) => {
                const unit = getUnitById(targetBattle, slot.unitId);
                slot.resolved = false;
                slot.selectedSkillId = null;
                slot.intentSkillId = null;
                slot.speed = randomInt(...unit.speedRange);
                slot.targetSlotId = getFirstLivingSlotId(targetBattle, getOpposingSide(slot.side));
                unit.speed = slot.speed;

                emitEvent(targetBattle, 'slot_speed_rolled', {
                    unitName: unit.name,
                    slotLabel: getSlotLabel(slot),
                    speed: slot.speed,
                });
            });

            targetBattle.enemySlots.forEach((slot) => {
                if (!isSlotAlive(targetBattle, slot)) {
                    return;
                }

                const enemyUnit = getUnitById(targetBattle, slot.unitId);
                slot.selectedSkillId = pickEnemySkillId(targetBattle, slot);
                slot.intentSkillId = slot.selectedSkillId;
                slot.targetSlotId = getFirstLivingSlotId(targetBattle, 'player');
                const skill = getSkillById(enemyUnit, slot.selectedSkillId);
                emitEvent(targetBattle, 'enemy_intent_set', {
                    unitName: enemyUnit.name,
                    slotLabel: getSlotLabel(slot),
                    skillName: skill.name,
                    targetLabel: getSlotTargetLabel(targetBattle, slot.targetSlotId),
                });
            });

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
            if (!slot || slot.side !== 'player' || !isSlotAlive(battle, slot)) {
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
            if (!slot || slot.side !== 'player' || !isSlotAlive(battle, slot)) {
                return false;
            }

            const unit = getUnitById(battle, slot.unitId);
            const skill = getSkillById(unit, skillId);
            if (!skill) {
                return false;
            }

            slot.selectedSkillId = skillId;
            if (!slot.targetSlotId) {
                slot.targetSlotId = getFirstLivingSlotId(battle, 'enemy');
            }
            battle.activePlayerSlotId = slot.id;

            emitEvent(battle, 'skill_selected', {
                unitName: unit.name,
                slotLabel: getSlotLabel(slot),
                skillName: skill.name,
            });
            invokeHooks(unit, 'skillSelected', {
                battle,
                unit,
                opposingUnits: battle.enemyUnits,
                skill,
            });
            return true;
        }

        function selectTarget(targetSlotId, slotId = ensureActivePlayerSlot(battle)?.id) {
            if (battle.phase !== 'select' || battle.winner || !slotId) {
                return false;
            }

            const slot = getSlotById(battle, slotId);
            const targetSlot = getSlotById(battle, targetSlotId);
            if (!slot || slot.side !== 'player' || !targetSlot || targetSlot.side !== 'enemy' || !isSlotAlive(battle, targetSlot)) {
                return false;
            }

            slot.targetSlotId = targetSlot.id;
            battle.activePlayerSlotId = slot.id;
            const unit = getUnitById(battle, slot.unitId);
            emitEvent(battle, 'target_selected', {
                unitName: unit.name,
                slotLabel: getSlotLabel(slot),
                targetLabel: getSlotTargetLabel(battle, targetSlot.id),
            });
            return true;
        }

        function resolveTurn() {
            if (battle.phase !== 'select' || battle.winner || !hasAllPlayerAssignments(battle)) {
                return false;
            }

            const queue = buildResolutionQueue(battle);
            for (const slot of queue) {
                if (battle.winner) {
                    break;
                }

                if (slot.resolved || !isSlotAlive(battle, slot) || !slot.selectedSkillId || !slot.targetSlotId) {
                    continue;
                }

                const targetSlot = getSlotById(battle, slot.targetSlotId);
                if (!targetSlot || !isSlotAlive(battle, targetSlot)) {
                    slot.resolved = true;
                    continue;
                }

                const mutualTarget = (
                    !targetSlot.resolved &&
                    targetSlot.targetSlotId === slot.id &&
                    Boolean(targetSlot.selectedSkillId) &&
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

            processEndOfTurnStatuses(battle);
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
    };
})();
