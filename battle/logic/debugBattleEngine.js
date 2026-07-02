(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createBattleUnit(template) {
        return {
            ...template,
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
            if (targetBattle.events.length > 200) {
                targetBattle.events = targetBattle.events.slice(-200);
            }

            const logLine = eventToLogLine(event);
            if (logLine) {
                pushBattleLog(targetBattle, logLine);
            }

            return event;
        }

        function eventToLogLine(event) {
            const { type, data } = event;
            if (type === 'battle_started') {
                return `Battle started: ${data.heroName} vs ${data.enemyName}.`;
            }
            if (type === 'turn_started') {
                return `Turn ${data.turn} starts.`;
            }
            if (type === 'speed_rolled') {
                return `${data.heroName} rolls ${data.heroSpeed} Speed, ${data.enemyName} rolls ${data.enemySpeed}.`;
            }
            if (type === 'enemy_intent_set') {
                return `${data.enemyName} prepares ${data.skillName}.`;
            }
            if (type === 'skill_selected') {
                return `${data.heroName} selects ${data.skillName}.`;
            }
            if (type === 'skill_used') {
                return `${data.heroName} uses ${data.heroSkillName}. ${data.enemyName} answers with ${data.enemySkillName}.`;
            }
            if (type === 'clash_round') {
                if (data.result === 'tie') {
                    return `Clash ${data.index}: tie at ${data.heroPower} (${data.heroFlips} vs ${data.enemyFlips}).`;
                }
                if (data.result === 'hero-speed-break' || data.result === 'enemy-speed-break') {
                    return `Repeated tie: ${data.speedWinnerName} breaks it with the higher Speed value.`;
                }
                return `Clash ${data.index}: ${data.roundWinnerName} wins ${data.winnerPower} to ${data.loserPower}, breaking a Coin from ${data.roundLoserName}.`;
            }
            if (type === 'clash_won') {
                return `${data.winnerName} wins the clash.`;
            }
            if (type === 'one_sided_start') {
                return `${data.attackerName} attacks one-sided with ${data.remainingCoins} remaining Coin${data.remainingCoins === 1 ? '' : 's'}.`;
            }
            if (type === 'sanity_changed') {
                return `${data.unitName} SP ${data.previousSp} → ${data.nextSp} (${data.reason}).`;
            }
            if (type === 'hit_resolved') {
                return `Hit ${data.index}: ${data.coinFace} for Power ${data.finalPower}, dealing ${data.damage} ${data.damageType} damage.`;
            }
            if (type === 'unit_defeated') {
                return `${data.unitName} falls.`;
            }
            if (type === 'battle_ended') {
                return `${data.winnerName} wins the debug fight.`;
            }

            return null;
        }

        function createDebugBattleState() {
            const nextBattle = {
                turn: 0,
                phase: 'setup',
                winner: null,
                selectedSkillId: null,
                enemySkillId: null,
                lastResolution: null,
                clashPresentation: null,
                log: [],
                events: [],
                hero: createBattleUnit(debugFightTemplate.hero),
                enemy: createBattleUnit(debugFightTemplate.enemy),
            };

            emitEvent(nextBattle, 'battle_started', {
                heroId: nextBattle.hero.id,
                heroName: nextBattle.hero.name,
                enemyId: nextBattle.enemy.id,
                enemyName: nextBattle.enemy.name,
            });
            startDebugBattleTurn(nextBattle);
            return nextBattle;
        }

        function getState() {
            return battle;
        }

        function pushBattleLog(targetBattle, message) {
            targetBattle.log.push(message);
            if (targetBattle.log.length > 36) {
                targetBattle.log = targetBattle.log.slice(-36);
            }
        }

        function randomInt(min, max) {
            return Math.floor(Math.random() * ((max - min) + 1)) + min;
        }

        function getSkillById(unit, skillId) {
            return unit.skills.find((skill) => skill.id === skillId) || null;
        }

        function pickEnemySkillId(currentBattle) {
            const skillIndex = (currentBattle.turn - 1) % currentBattle.enemy.skills.length;
            return currentBattle.enemy.skills[skillIndex].id;
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

        function flipCoins(unit, skill, coinCount) {
            const flips = [];
            let power = skill.basePower;
            const headChance = getCoinHeadChance(unit);

            for (let index = 0; index < coinCount; index += 1) {
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

        function getResistanceMultiplier(unit, damageType) {
            return unit.resistances[damageType] || 1;
        }

        function getDamageModifier(attacker, skill, defender) {
            const levelDifference = getSkillOffenseLevel(attacker, skill) - getDefenseLevel(defender);
            return 1 + (levelDifference / (Math.abs(levelDifference) + 25));
        }

        function calculateHitDamage(attacker, skill, defender, finalPower) {
            const resistance = getResistanceMultiplier(defender, skill.damageType);
            const damageModifier = getDamageModifier(attacker, skill, defender);
            return Math.max(1, Math.round(finalPower * resistance * damageModifier));
        }

        function resolveDebugClash(targetBattle, heroSkill, enemySkill) {
            const heroUnit = targetBattle.hero;
            const enemyUnit = targetBattle.enemy;
            let heroCoins = heroSkill.coinCount;
            let enemyCoins = enemySkill.coinCount;
            let repeatedTieCount = 0;
            const rounds = [];
            let roundIndex = 0;

            while (heroCoins > 0 && enemyCoins > 0) {
                roundIndex += 1;
                const heroCoinsBefore = heroCoins;
                const enemyCoinsBefore = enemyCoins;
                const heroRoll = flipCoins(heroUnit, heroSkill, heroCoins);
                const enemyRoll = flipCoins(enemyUnit, enemySkill, enemyCoins);
                const heroPower = heroRoll.power + getClashLevelBonus(heroUnit, heroSkill, enemyUnit, enemySkill);
                const enemyPower = enemyRoll.power + getClashLevelBonus(enemyUnit, enemySkill, heroUnit, heroSkill);

                if (heroPower === enemyPower) {
                    repeatedTieCount += 1;
                    rounds.push({
                        result: 'tie',
                        heroCoins,
                        enemyCoins,
                        heroPower,
                        enemyPower,
                        heroFlips: heroRoll.flips,
                        enemyFlips: enemyRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'tie',
                        heroPower,
                        enemyPower,
                        heroFlips: formatCoinFlips(heroRoll.flips),
                        enemyFlips: formatCoinFlips(enemyRoll.flips),
                        heroCoinsBefore,
                        enemyCoinsBefore,
                        heroCoinsAfter: heroCoins,
                        enemyCoinsAfter: enemyCoins,
                    });
                    invokeHooks(heroUnit, 'clashRound', { battle: targetBattle, unit: heroUnit, opponent: enemyUnit, heroSkill, enemySkill });
                    invokeHooks(enemyUnit, 'clashRound', { battle: targetBattle, unit: enemyUnit, opponent: heroUnit, heroSkill, enemySkill });

                    if (repeatedTieCount >= 6) {
                        if (heroUnit.speed >= enemyUnit.speed) {
                            enemyCoins -= 1;
                            rounds.push({
                                result: 'hero-speed-break',
                                heroCoins,
                                enemyCoins,
                                heroPower,
                                enemyPower,
                                heroFlips: heroRoll.flips,
                                enemyFlips: enemyRoll.flips,
                            });
                            emitEvent(targetBattle, 'clash_round', {
                                index: roundIndex,
                                result: 'hero-speed-break',
                                speedWinnerName: heroUnit.name,
                                heroPower,
                                enemyPower,
                                heroFlips: formatCoinFlips(heroRoll.flips),
                                enemyFlips: formatCoinFlips(enemyRoll.flips),
                                heroCoinsBefore,
                                enemyCoinsBefore,
                                heroCoinsAfter: heroCoins,
                                enemyCoinsAfter: enemyCoins,
                            });
                        } else {
                            heroCoins -= 1;
                            rounds.push({
                                result: 'enemy-speed-break',
                                heroCoins,
                                enemyCoins,
                                heroPower,
                                enemyPower,
                                heroFlips: heroRoll.flips,
                                enemyFlips: enemyRoll.flips,
                            });
                            emitEvent(targetBattle, 'clash_round', {
                                index: roundIndex,
                                result: 'enemy-speed-break',
                                speedWinnerName: enemyUnit.name,
                                heroPower,
                                enemyPower,
                                heroFlips: formatCoinFlips(heroRoll.flips),
                                enemyFlips: formatCoinFlips(enemyRoll.flips),
                                heroCoinsBefore,
                                enemyCoinsBefore,
                                heroCoinsAfter: heroCoins,
                                enemyCoinsAfter: enemyCoins,
                            });
                        }
                        repeatedTieCount = 0;
                    }

                    continue;
                }

                repeatedTieCount = 0;

                if (heroPower > enemyPower) {
                    enemyCoins -= 1;
                    rounds.push({
                        result: 'hero-win',
                        heroCoins,
                        enemyCoins,
                        heroPower,
                        enemyPower,
                        heroFlips: heroRoll.flips,
                        enemyFlips: enemyRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'hero-win',
                        roundWinnerName: heroUnit.name,
                        roundLoserName: enemyUnit.name,
                        winnerPower: heroPower,
                        loserPower: enemyPower,
                        heroPower,
                        enemyPower,
                        heroFlips: formatCoinFlips(heroRoll.flips),
                        enemyFlips: formatCoinFlips(enemyRoll.flips),
                        heroCoinsBefore,
                        enemyCoinsBefore,
                        heroCoinsAfter: heroCoins,
                        enemyCoinsAfter: enemyCoins,
                    });
                    invokeHooks(heroUnit, 'clashRound', { battle: targetBattle, unit: heroUnit, opponent: enemyUnit, heroSkill, enemySkill });
                    invokeHooks(enemyUnit, 'clashRound', { battle: targetBattle, unit: enemyUnit, opponent: heroUnit, heroSkill, enemySkill });
                } else {
                    heroCoins -= 1;
                    rounds.push({
                        result: 'enemy-win',
                        heroCoins,
                        enemyCoins,
                        heroPower,
                        enemyPower,
                        heroFlips: heroRoll.flips,
                        enemyFlips: enemyRoll.flips,
                    });
                    emitEvent(targetBattle, 'clash_round', {
                        index: roundIndex,
                        result: 'enemy-win',
                        roundWinnerName: enemyUnit.name,
                        roundLoserName: heroUnit.name,
                        winnerPower: enemyPower,
                        loserPower: heroPower,
                        heroPower,
                        enemyPower,
                        heroFlips: formatCoinFlips(heroRoll.flips),
                        enemyFlips: formatCoinFlips(enemyRoll.flips),
                        heroCoinsBefore,
                        enemyCoinsBefore,
                        heroCoinsAfter: heroCoins,
                        enemyCoinsAfter: enemyCoins,
                    });
                    invokeHooks(heroUnit, 'clashRound', { battle: targetBattle, unit: heroUnit, opponent: enemyUnit, heroSkill, enemySkill });
                    invokeHooks(enemyUnit, 'clashRound', { battle: targetBattle, unit: enemyUnit, opponent: heroUnit, heroSkill, enemySkill });
                }
            }

            return {
                rounds,
                winner: heroCoins > 0 ? 'hero' : 'enemy',
                heroRemainingCoins: heroCoins,
                enemyRemainingCoins: enemyCoins,
            };
        }

        function resolveOneSidedAttack(targetBattle, attacker, skill, defender, remainingCoins) {
            const hits = [];

            for (let coinIndex = 0; coinIndex < remainingCoins; coinIndex += 1) {
                const flip = flipCoins(attacker, skill, 1);
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

                if (defender.hp <= 0) {
                    break;
                }
            }

            return hits;
        }

        function startDebugBattleTurn(currentBattle) {
            if (currentBattle.winner) {
                return;
            }

            currentBattle.turn += 1;
            currentBattle.phase = 'select';
            currentBattle.selectedSkillId = null;
            currentBattle.enemySkillId = pickEnemySkillId(currentBattle);
            currentBattle.lastResolution = null;
            currentBattle.clashPresentation = null;
            currentBattle.hero.speed = randomInt(...currentBattle.hero.speedRange);
            currentBattle.enemy.speed = randomInt(...currentBattle.enemy.speedRange);

            const enemySkill = getSkillById(currentBattle.enemy, currentBattle.enemySkillId);
            emitEvent(currentBattle, 'turn_started', {
                turn: currentBattle.turn,
                heroId: currentBattle.hero.id,
                enemyId: currentBattle.enemy.id,
            });
            emitEvent(currentBattle, 'speed_rolled', {
                heroName: currentBattle.hero.name,
                enemyName: currentBattle.enemy.name,
                heroSpeed: currentBattle.hero.speed,
                enemySpeed: currentBattle.enemy.speed,
            });
            emitEvent(currentBattle, 'enemy_intent_set', {
                enemyId: currentBattle.enemy.id,
                enemyName: currentBattle.enemy.name,
                skillId: enemySkill.id,
                skillName: enemySkill.name,
            });
            invokeHooks(currentBattle.hero, 'turnStart', { battle: currentBattle, unit: currentBattle.hero, opponent: currentBattle.enemy });
            invokeHooks(currentBattle.enemy, 'turnStart', { battle: currentBattle, unit: currentBattle.enemy, opponent: currentBattle.hero });
        }

        function selectSkill(skillId) {
            if (battle.phase !== 'select' || battle.winner) {
                return false;
            }

            battle.selectedSkillId = skillId;
            const selectedSkill = getSkillById(battle.hero, skillId);
            if (selectedSkill) {
                emitEvent(battle, 'skill_selected', {
                    heroId: battle.hero.id,
                    heroName: battle.hero.name,
                    skillId: selectedSkill.id,
                    skillName: selectedSkill.name,
                });
                invokeHooks(battle.hero, 'skillSelected', { battle, unit: battle.hero, opponent: battle.enemy, skill: selectedSkill });
            }
            return true;
        }

        function resolveTurn() {
            if (battle.phase !== 'select' || !battle.selectedSkillId || battle.winner) {
                return false;
            }

            const heroSkill = getSkillById(battle.hero, battle.selectedSkillId);
            const enemySkill = getSkillById(battle.enemy, battle.enemySkillId);
            if (!heroSkill || !enemySkill) {
                return false;
            }

            emitEvent(battle, 'skill_used', {
                heroId: battle.hero.id,
                heroName: battle.hero.name,
                enemyId: battle.enemy.id,
                enemyName: battle.enemy.name,
                heroSkillId: heroSkill.id,
                heroSkillName: heroSkill.name,
                enemySkillId: enemySkill.id,
                enemySkillName: enemySkill.name,
            });
            invokeHooks(battle.hero, 'clashStart', { battle, unit: battle.hero, opponent: battle.enemy, skill: heroSkill, opponentSkill: enemySkill });
            invokeHooks(battle.enemy, 'clashStart', { battle, unit: battle.enemy, opponent: battle.hero, skill: enemySkill, opponentSkill: heroSkill });

            const clash = resolveDebugClash(battle, heroSkill, enemySkill);

            const clashWinnerUnit = clash.winner === 'hero' ? battle.hero : battle.enemy;
            const clashLoserUnit = clash.winner === 'hero' ? battle.enemy : battle.hero;
            const attackSkill = clash.winner === 'hero' ? heroSkill : enemySkill;
            const remainingCoins = clash.winner === 'hero' ? clash.heroRemainingCoins : clash.enemyRemainingCoins;

            emitEvent(battle, 'clash_won', {
                winner: clash.winner,
                winnerId: clashWinnerUnit.id,
                winnerName: clashWinnerUnit.name,
                loserId: clashLoserUnit.id,
                loserName: clashLoserUnit.name,
                remainingCoins,
            });
            invokeHooks(clashWinnerUnit, 'clashWin', { battle, unit: clashWinnerUnit, opponent: clashLoserUnit, skill: attackSkill });
            invokeHooks(clashLoserUnit, 'clashLose', { battle, unit: clashLoserUnit, opponent: clashWinnerUnit, skill: attackSkill });

            const winnerSanity = adjustSanity(clashWinnerUnit, 5);
            const loserSanity = adjustSanity(clashLoserUnit, -5);
            emitEvent(battle, 'sanity_changed', {
                unitId: clashWinnerUnit.id,
                unitName: clashWinnerUnit.name,
                previousSp: winnerSanity.previousSp,
                nextSp: winnerSanity.nextSp,
                reason: 'clash win',
            });
            emitEvent(battle, 'sanity_changed', {
                unitId: clashLoserUnit.id,
                unitName: clashLoserUnit.name,
                previousSp: loserSanity.previousSp,
                nextSp: loserSanity.nextSp,
                reason: 'clash loss',
            });

            emitEvent(battle, 'one_sided_start', {
                attackerId: clashWinnerUnit.id,
                attackerName: clashWinnerUnit.name,
                defenderId: clashLoserUnit.id,
                defenderName: clashLoserUnit.name,
                skillId: attackSkill.id,
                skillName: attackSkill.name,
                remainingCoins,
            });
            invokeHooks(clashWinnerUnit, 'oneSidedStart', { battle, unit: clashWinnerUnit, opponent: clashLoserUnit, skill: attackSkill, remainingCoins });

            const hits = resolveOneSidedAttack(battle, clashWinnerUnit, attackSkill, clashLoserUnit, remainingCoins);
            let totalDamage = 0;

            hits.forEach((hit, index) => {
                totalDamage += hit.damage;
            });

            if (clashLoserUnit.hp <= 0) {
                battle.winner = clash.winner;
                battle.phase = 'ended';
                emitEvent(battle, 'unit_defeated', {
                    unitId: clashLoserUnit.id,
                    unitName: clashLoserUnit.name,
                    defeatedById: clashWinnerUnit.id,
                    defeatedByName: clashWinnerUnit.name,
                });
                invokeHooks(clashLoserUnit, 'unitDefeated', { battle, unit: clashLoserUnit, opponent: clashWinnerUnit });
                emitEvent(battle, 'battle_ended', {
                    winner: battle.winner,
                    winnerId: clashWinnerUnit.id,
                    winnerName: clashWinnerUnit.name,
                });
            } else {
                battle.phase = 'resolved';
            }

            battle.lastResolution = {
                clashWinner: clash.winner,
                actingUnitName: clashWinnerUnit.name,
                targetUnitName: clashLoserUnit.name,
                actingSkillName: attackSkill.name,
                totalDamage,
                remainingCoins,
            };
            battle.clashPresentation = {
                heroSkillId: heroSkill.id,
                enemySkillId: enemySkill.id,
                clashWinner: clash.winner,
                rounds: clash.rounds,
                hits,
                totalDamage,
                attackSkillId: attackSkill.id,
            };

            invokeHooks(battle.hero, 'turnEnd', { battle, unit: battle.hero, opponent: battle.enemy });
            invokeHooks(battle.enemy, 'turnEnd', { battle, unit: battle.enemy, opponent: battle.hero });
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

        function addStatus(side, status) {
            const unit = side === 'enemy' ? battle.enemy : battle.hero;
            unit.statuses.push(status);
        }

        function clearStatuses(side) {
            const unit = side === 'enemy' ? battle.enemy : battle.hero;
            unit.statuses = [];
        }

        return {
            getState,
            selectSkill,
            resolveTurn,
            advanceTurn,
            reset,
            addStatus,
            clearStatuses,
        };
    };
})();
