(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createBattleUnit(template) {
        return {
            ...template,
            hp: template.maxHp,
            sp: template.sp,
            speed: 0,
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
        let battle = createDebugBattleState();

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
                hero: createBattleUnit(debugFightTemplate.hero),
                enemy: createBattleUnit(debugFightTemplate.enemy),
            };

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
            unit.sp = clamp(unit.sp + amount, -45, 45);
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

        function resolveDebugClash(heroSkill, enemySkill) {
            let heroCoins = heroSkill.coinCount;
            let enemyCoins = enemySkill.coinCount;
            let repeatedTieCount = 0;
            const rounds = [];

            while (heroCoins > 0 && enemyCoins > 0) {
                const heroRoll = flipCoins(battle.hero, heroSkill, heroCoins);
                const enemyRoll = flipCoins(battle.enemy, enemySkill, enemyCoins);
                const heroPower = heroRoll.power + getClashLevelBonus(battle.hero, heroSkill, battle.enemy, enemySkill);
                const enemyPower = enemyRoll.power + getClashLevelBonus(battle.enemy, enemySkill, battle.hero, heroSkill);

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

                    if (repeatedTieCount >= 6) {
                        if (battle.hero.speed >= battle.enemy.speed) {
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
                }
            }

            return {
                rounds,
                winner: heroCoins > 0 ? 'hero' : 'enemy',
                heroRemainingCoins: heroCoins,
                enemyRemainingCoins: enemyCoins,
            };
        }

        function resolveOneSidedAttack(attacker, skill, defender, remainingCoins) {
            const hits = [];

            for (let coinIndex = 0; coinIndex < remainingCoins; coinIndex += 1) {
                const flip = flipCoins(attacker, skill, 1);
                const finalPower = flip.power;
                const damage = calculateHitDamage(attacker, skill, defender, finalPower);

                defender.hp = clamp(defender.hp - damage, 0, defender.maxHp);
                hits.push({
                    finalPower,
                    damage,
                    isHeads: flip.flips[0],
                    targetHp: defender.hp,
                });

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
            pushBattleLog(
                currentBattle,
                `Turn ${currentBattle.turn} starts. ${currentBattle.hero.name} rolls ${currentBattle.hero.speed} Speed, ${currentBattle.enemy.name} rolls ${currentBattle.enemy.speed}.`,
            );
            pushBattleLog(currentBattle, `${currentBattle.enemy.name} prepares ${enemySkill.name}.`);
        }

        function selectSkill(skillId) {
            if (battle.phase !== 'select' || battle.winner) {
                return false;
            }

            battle.selectedSkillId = skillId;
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

            pushBattleLog(battle, `${battle.hero.name} uses ${heroSkill.name}. ${battle.enemy.name} answers with ${enemySkill.name}.`);

            const clash = resolveDebugClash(heroSkill, enemySkill);
            clash.rounds.forEach((round, index) => {
                if (round.result === 'tie') {
                    pushBattleLog(battle, `Clash ${index + 1}: tie at ${round.heroPower} (${formatCoinFlips(round.heroFlips)} vs ${formatCoinFlips(round.enemyFlips)}).`);
                    return;
                }

                if (round.result === 'hero-speed-break' || round.result === 'enemy-speed-break') {
                    const speedWinner = round.result === 'hero-speed-break' ? battle.hero.name : battle.enemy.name;
                    pushBattleLog(battle, `Repeated tie: ${speedWinner} breaks it with the higher Speed value.`);
                    return;
                }

                const roundWinner = round.result === 'hero-win' ? battle.hero.name : battle.enemy.name;
                const roundLoser = round.result === 'hero-win' ? battle.enemy.name : battle.hero.name;
                const winnerPower = round.result === 'hero-win' ? round.heroPower : round.enemyPower;
                const loserPower = round.result === 'hero-win' ? round.enemyPower : round.heroPower;
                pushBattleLog(battle, `Clash ${index + 1}: ${roundWinner} wins ${winnerPower} to ${loserPower}, breaking a Coin from ${roundLoser}.`);
            });

            const clashWinnerUnit = clash.winner === 'hero' ? battle.hero : battle.enemy;
            const clashLoserUnit = clash.winner === 'hero' ? battle.enemy : battle.hero;
            const attackSkill = clash.winner === 'hero' ? heroSkill : enemySkill;
            const remainingCoins = clash.winner === 'hero' ? clash.heroRemainingCoins : clash.enemyRemainingCoins;

            adjustSanity(clashWinnerUnit, 5);
            adjustSanity(clashLoserUnit, -5);
            pushBattleLog(battle, `${clashWinnerUnit.name} wins the clash, gains 5 SP, and attacks one-sided with ${remainingCoins} remaining Coin${remainingCoins === 1 ? '' : 's'}.`);

            const hits = resolveOneSidedAttack(clashWinnerUnit, attackSkill, clashLoserUnit, remainingCoins);
            let totalDamage = 0;

            hits.forEach((hit, index) => {
                totalDamage += hit.damage;
                pushBattleLog(battle, `Hit ${index + 1}: ${hit.isHeads ? 'Heads' : 'Tails'} for Power ${hit.finalPower}, dealing ${hit.damage} ${attackSkill.damageType} damage.`);
            });

            if (clashLoserUnit.hp <= 0) {
                battle.winner = clash.winner;
                battle.phase = 'ended';
                pushBattleLog(battle, `${clashLoserUnit.name} falls. ${clashWinnerUnit.name} wins the debug fight.`);
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
            battle = createDebugBattleState();
        }

        return {
            getState,
            selectSkill,
            resolveTurn,
            advanceTurn,
            reset,
        };
    };
})();
