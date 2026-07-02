(() => {
    const DEBUG_FIGHT_TEMPLATE = {
        hero: {
            id: 'vergilius',
            name: 'Vergilius',
            level: 50,
            maxHp: 392,
            sp: 0,
            speedRange: [4, 8],
            defenseLevel: 50,
            resistances: {
                slash: 1,
                pierce: 1,
                blunt: 1,
            },
            sprites: {
                idle: 'assets/debugsprites/Vergilius_Idle_Sprite.png',
                moving: 'assets/debugsprites/Vergilius_Moving_Sprite.png',
                hurt: 'assets/debugsprites/Vergilius_Hurt_Sprite.png',
                guard: 'assets/debugsprites/Vergilius_Guard_Sprite.png',
                evade: 'assets/debugsprites/Vergilius_Evade_Sprite.png',
                skills: {
                    'heated-puncture': 'assets/debugsprites/Vergilius_Skill_1.gif',
                    'scorching-incision': 'assets/debugsprites/Vergilius_Skill_2.gif',
                    'following-the-flow': 'assets/debugsprites/Vergilius_Skill_3.gif',
                },
            },
            skills: [
                {
                    id: 'heated-puncture',
                    name: 'Heated Puncture',
                    basePower: 14,
                    coinPower: 2,
                    coinCount: 3,
                    damageType: 'slash',
                    offenseLevel: 0,
                    borderPath: 'assets/skillborders/Wrath1.png',
                    description: 'Skill 1. A three-coin slash opener for stable clashes.',
                },
                {
                    id: 'scorching-incision',
                    name: 'Scorching Incision',
                    basePower: 15,
                    coinPower: 2,
                    coinCount: 3,
                    damageType: 'slash',
                    offenseLevel: 1,
                    borderPath: 'assets/skillborders/Wrath2.png',
                    description: 'Skill 2. Slightly stronger clash line with the same coin spread.',
                },
                {
                    id: 'following-the-flow',
                    name: 'Following the Flow',
                    basePower: 18,
                    coinPower: 2,
                    coinCount: 3,
                    damageType: 'slash',
                    offenseLevel: 2,
                    borderPath: 'assets/skillborders/Wrath3.png',
                    description: 'Skill 3. Highest base clash option for the current debug duel.',
                },
            ],
        },
        enemy: {
            id: 'ring-nursefather-hong-lu',
            name: 'The Ring Nursefather Hong Lu',
            level: 50,
            maxHp: 428,
            sp: 0,
            speedRange: [3, 7],
            defenseLevel: 50,
            resistances: {
                slash: 1,
                pierce: 1,
                blunt: 1,
            },
            sprites: {
                idle: 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Idle_Animation.gif',
                moving: 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Moving_Sprite.png',
                hurt: 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Hurt_Sprite.png',
                skills: {
                    anatomize: 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_1.gif',
                    'gather-ingredient-blood-bathed-objet': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_2.gif',
                    'tibias-melody': 'assets/debugsprites/The_House_of_Spiders_The_Ring_Nursefather_Hong_Lu_Skill_3.gif',
                },
            },
            skills: [
                {
                    id: 'anatomize',
                    name: 'Anatomize',
                    basePower: 6,
                    coinPower: 6,
                    coinCount: 2,
                    damageType: 'slash',
                    offenseLevel: 0,
                    borderPath: 'assets/skillborders/Envy1.png',
                    description: 'Skill 1. Two heavy-value coins with a much lower base floor.',
                },
                {
                    id: 'gather-ingredient-blood-bathed-objet',
                    name: 'Gather Ingredient Blood-bathed Objet',
                    basePower: 7,
                    coinPower: 7,
                    coinCount: 2,
                    damageType: 'slash',
                    offenseLevel: 1,
                    borderPath: 'assets/skillborders/Envy2.png',
                    description: 'Skill 2. Similar structure, but the coin ceiling rises even harder.',
                },
                {
                    id: 'tibias-melody',
                    name: "Tibia's Melody Anatomization of the Unatomized by the Anatomized",
                    basePower: 10,
                    coinPower: 4,
                    coinCount: 4,
                    damageType: 'slash',
                    offenseLevel: 2,
                    borderPath: 'assets/skillborders/Envy3.png',
                    description: 'Skill 3. Long four-coin clash route for extended back-and-forths.',
                },
            ],
        },
    };

    function createDebugBattleController(options) {
        const { mountElement, clamp, resolveAssetUrl } = options;
        // #region debug-point C:controller-factory-entry
        fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"combat-module-error",runId:"pre-fix",hypothesisId:"C",location:"battle/debugBattle.js:createDebugBattleController",msg:"[DEBUG] Entered debug battle controller factory",data:{hasMountElement:Boolean(mountElement)},ts:Date.now()})}).catch(()=>{});
        // #endregion
        let battle = createDebugBattleState();

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
                hero: createBattleUnit(DEBUG_FIGHT_TEMPLATE.hero),
                enemy: createBattleUnit(DEBUG_FIGHT_TEMPLATE.enemy),
            };

            // #region debug-point D:create-debug-battle-state
            fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"combat-module-error",runId:"pre-fix",hypothesisId:"D",location:"battle/debugBattle.js:createDebugBattleState",msg:"[DEBUG] Created initial battle object before first turn start",data:{turn:nextBattle.turn,hero:nextBattle.hero.name,enemy:nextBattle.enemy.name},ts:Date.now()})}).catch(()=>{});
            // #endregion
            startDebugBattleTurn(nextBattle);
            return nextBattle;
        }

        function pushBattleLog(message) {
            battle.log.push(message);
            if (battle.log.length > 36) {
                battle.log = battle.log.slice(-36);
            }
        }

        function randomInt(min, max) {
            return Math.floor(Math.random() * ((max - min) + 1)) + min;
        }

        function getSkillById(unit, skillId) {
            return unit.skills.find((skill) => skill.id === skillId) || null;
        }

        function pickEnemySkillId() {
            // #region debug-point D:pick-enemy-skill-id-entry
            fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"combat-module-error",runId:"pre-fix",hypothesisId:"D",location:"battle/debugBattle.js:pickEnemySkillId",msg:"[DEBUG] Entered pickEnemySkillId",data:{note:"About to read controller battle state"},ts:Date.now()})}).catch(()=>{});
            // #endregion
            const skillIndex = (battle.turn - 1) % battle.enemy.skills.length;
            return battle.enemy.skills[skillIndex].id;
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

            // #region debug-point D:start-turn-entry
            fetch("http://127.0.0.1:7777/event",{method:"POST",body:JSON.stringify({sessionId:"combat-module-error",runId:"pre-fix",hypothesisId:"D",location:"battle/debugBattle.js:startDebugBattleTurn",msg:"[DEBUG] Starting initial debug battle turn",data:{turn:currentBattle.turn,heroSpeedRange:currentBattle.hero.speedRange,enemySpeedRange:currentBattle.enemy.speedRange},ts:Date.now()})}).catch(()=>{});
            // #endregion
            currentBattle.turn += 1;
            currentBattle.phase = 'select';
            currentBattle.selectedSkillId = null;
            currentBattle.enemySkillId = pickEnemySkillId();
            currentBattle.lastResolution = null;
            currentBattle.clashPresentation = null;
            currentBattle.hero.speed = randomInt(...currentBattle.hero.speedRange);
            currentBattle.enemy.speed = randomInt(...currentBattle.enemy.speedRange);

            const enemySkill = getSkillById(currentBattle.enemy, currentBattle.enemySkillId);
            pushBattleLog(
                `Turn ${currentBattle.turn} starts. ${currentBattle.hero.name} rolls ${currentBattle.hero.speed} Speed, ${currentBattle.enemy.name} rolls ${currentBattle.enemy.speed}.`,
            );
            pushBattleLog(`${currentBattle.enemy.name} prepares ${enemySkill.name}.`);
        }

        function selectDebugSkill(skillId) {
            if (battle.phase !== 'select' || battle.winner) {
                return;
            }

            battle.selectedSkillId = skillId;
            render();
        }

        function resolveDebugTurn() {
            if (battle.phase !== 'select' || !battle.selectedSkillId || battle.winner) {
                return;
            }

            const heroSkill = getSkillById(battle.hero, battle.selectedSkillId);
            const enemySkill = getSkillById(battle.enemy, battle.enemySkillId);
            if (!heroSkill || !enemySkill) {
                return;
            }

            pushBattleLog(`${battle.hero.name} uses ${heroSkill.name}. ${battle.enemy.name} answers with ${enemySkill.name}.`);

            const clash = resolveDebugClash(heroSkill, enemySkill);
            clash.rounds.forEach((round, index) => {
                if (round.result === 'tie') {
                    pushBattleLog(`Clash ${index + 1}: tie at ${round.heroPower} (${formatCoinFlips(round.heroFlips)} vs ${formatCoinFlips(round.enemyFlips)}).`);
                    return;
                }

                if (round.result === 'hero-speed-break' || round.result === 'enemy-speed-break') {
                    const speedWinner = round.result === 'hero-speed-break' ? battle.hero.name : battle.enemy.name;
                    pushBattleLog(`Repeated tie: ${speedWinner} breaks it with the higher Speed value.`);
                    return;
                }

                const roundWinner = round.result === 'hero-win' ? battle.hero.name : battle.enemy.name;
                const roundLoser = round.result === 'hero-win' ? battle.enemy.name : battle.hero.name;
                const winnerPower = round.result === 'hero-win' ? round.heroPower : round.enemyPower;
                const loserPower = round.result === 'hero-win' ? round.enemyPower : round.heroPower;
                pushBattleLog(`Clash ${index + 1}: ${roundWinner} wins ${winnerPower} to ${loserPower}, breaking a Coin from ${roundLoser}.`);
            });

            const clashWinnerUnit = clash.winner === 'hero' ? battle.hero : battle.enemy;
            const clashLoserUnit = clash.winner === 'hero' ? battle.enemy : battle.hero;
            const attackSkill = clash.winner === 'hero' ? heroSkill : enemySkill;
            const remainingCoins = clash.winner === 'hero' ? clash.heroRemainingCoins : clash.enemyRemainingCoins;

            adjustSanity(clashWinnerUnit, 5);
            adjustSanity(clashLoserUnit, -5);
            pushBattleLog(`${clashWinnerUnit.name} wins the clash, gains 5 SP, and attacks one-sided with ${remainingCoins} remaining Coin${remainingCoins === 1 ? '' : 's'}.`);

            const hits = resolveOneSidedAttack(clashWinnerUnit, attackSkill, clashLoserUnit, remainingCoins);
            let totalDamage = 0;

            hits.forEach((hit, index) => {
                totalDamage += hit.damage;
                pushBattleLog(`Hit ${index + 1}: ${hit.isHeads ? 'Heads' : 'Tails'} for Power ${hit.finalPower}, dealing ${hit.damage} ${attackSkill.damageType} damage.`);
            });

            if (clashLoserUnit.hp <= 0) {
                battle.winner = clash.winner;
                battle.phase = 'ended';
                pushBattleLog(`${clashLoserUnit.name} falls. ${clashWinnerUnit.name} wins the debug fight.`);
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

            render();
        }

        function advanceDebugBattleTurn() {
            if (battle.phase !== 'resolved' || battle.winner) {
                return;
            }

            startDebugBattleTurn(battle);
            render();
        }

        function resetDebugBattle() {
            battle = createDebugBattleState();
            render();
        }

        function formatResistanceValue(value) {
            return `x${value.toFixed(2).replace(/\.00$/, '')}`;
        }

        function getPhaseLabel() {
            if (battle.winner === 'hero') {
                return 'Victory';
            }
            if (battle.winner === 'enemy') {
                return 'Defeat';
            }
            if (battle.phase === 'resolved') {
                return 'Turn Resolved';
            }
            return 'Skill Select';
        }

        function getWinnerLabel() {
            if (battle.winner === 'hero') {
                return `${battle.hero.name} wins`;
            }
            if (battle.winner === 'enemy') {
                return `${battle.enemy.name} wins`;
            }
            return 'Focused Debug Fight';
        }

        function getSkillPowerLabel(skill) {
            return `Base ${skill.basePower} | Coin +${skill.coinPower} | ${skill.coinCount} Coins`;
        }

        function getCompactSkillPowerLabel(skill) {
            return `${skill.basePower} +${skill.coinPower} (${skill.coinCount} Coins)`;
        }

        function getUnitCardSprite(unit) {
            if (unit.hp <= 0 && unit.sprites.hurt) {
                return resolveAssetUrl(unit.sprites.hurt);
            }

            return resolveAssetUrl(unit.sprites.idle);
        }

        function getActorSprite(unit, skillId, stateLabel) {
            if (stateLabel === 'moving' && unit.sprites.moving) {
                return resolveAssetUrl(unit.sprites.moving);
            }

            if (stateLabel === 'hurt' && unit.sprites.hurt) {
                return resolveAssetUrl(unit.sprites.hurt);
            }

            if (stateLabel === 'skill' && skillId && unit.sprites.skills[skillId]) {
                return resolveAssetUrl(unit.sprites.skills[skillId]);
            }

            return resolveAssetUrl(unit.sprites.idle);
        }

        function renderCoinTrack(flips, side) {
            return flips.map((isHeads, index) => `
                <span class="echoes-battle-panel__combat-coin echoes-battle-panel__combat-coin--${side} ${isHeads ? 'is-heads' : 'is-tails'}">
                    <span>${index + 1}</span>
                    <strong>${isHeads ? 'Heads' : 'Tails'}</strong>
                </span>
            `).join('');
        }

        function renderClashRound(round, index) {
            if (round.result === 'hero-speed-break' || round.result === 'enemy-speed-break') {
                const winnerLabel = round.result === 'hero-speed-break' ? 'Vergilius' : 'Hong Lu';
                return `
                    <div class="echoes-battle-panel__combat-round echoes-battle-panel__combat-round--speed-break">
                        <span class="echoes-battle-panel__combat-round-index">Tie Break</span>
                        <div class="echoes-battle-panel__combat-round-summary">${winnerLabel} breaks the repeated tie with Speed.</div>
                    </div>
                `;
            }

            const resultLabel = round.result === 'tie'
                ? 'Tie'
                : round.result === 'hero-win'
                    ? 'Vergilius wins'
                    : 'Hong Lu wins';

            return `
                <div class="echoes-battle-panel__combat-round">
                    <span class="echoes-battle-panel__combat-round-index">Clash ${index + 1}</span>
                    <div class="echoes-battle-panel__combat-round-side echoes-battle-panel__combat-round-side--hero">
                        <div class="echoes-battle-panel__combat-round-power">${round.heroPower}</div>
                        <div class="echoes-battle-panel__combat-round-coins">${renderCoinTrack(round.heroFlips, 'hero')}</div>
                    </div>
                    <div class="echoes-battle-panel__combat-round-versus">${resultLabel}</div>
                    <div class="echoes-battle-panel__combat-round-side echoes-battle-panel__combat-round-side--enemy">
                        <div class="echoes-battle-panel__combat-round-coins">${renderCoinTrack(round.enemyFlips, 'enemy')}</div>
                        <div class="echoes-battle-panel__combat-round-power">${round.enemyPower}</div>
                    </div>
                </div>
            `;
        }

        function renderOneSidedHits(presentation) {
            if (!presentation?.hits?.length) {
                return '<div class="echoes-battle-panel__combat-hits-empty">Resolve a turn to populate clash results.</div>';
            }

            return presentation.hits.map((hit, index) => `
                <div class="echoes-battle-panel__combat-hit">
                    <span>Hit ${index + 1}</span>
                    <strong>${hit.isHeads ? 'Heads' : 'Tails'}</strong>
                    <span>Power ${hit.finalPower}</span>
                    <span>${hit.damage} damage</span>
                </div>
            `).join('');
        }

        function renderClashStage(selectedSkill, enemySkill) {
            const presentation = battle.clashPresentation;
            const heroSkillId = presentation?.heroSkillId || selectedSkill?.id || null;
            const enemySkillId = presentation?.enemySkillId || enemySkill?.id || null;
            const heroActorState = presentation ? 'skill' : selectedSkill ? 'moving' : 'idle';
            const heroActorImage = getActorSprite(battle.hero, heroSkillId, heroActorState);
            const enemyActorImage = getActorSprite(
                battle.enemy,
                enemySkillId,
                presentation ? (presentation.clashWinner === 'hero' ? 'hurt' : 'skill') : 'idle',
            );
            const roundMarkup = presentation?.rounds?.length
                ? presentation.rounds.map((round, index) => renderClashRound(round, index)).join('')
                : '<div class="echoes-battle-panel__combat-round echoes-battle-panel__combat-round--empty">Select a Vergilius skill and resolve the turn to run the clash.</div>';

            return `
                <section class="echoes-battle-panel__combat-center">
                    <div class="echoes-battle-panel__combat-stage${presentation ? ' is-resolving' : ''}">
                        <div class="echoes-battle-panel__combat-stage-head">
                            <div class="echoes-battle-panel__combat-stage-skill">
                                <span>Vergilius</span>
                                <strong>${selectedSkill?.name || 'No skill selected'}</strong>
                                <small>${selectedSkill ? getCompactSkillPowerLabel(selectedSkill) : 'Pick one of the three skills below.'}</small>
                            </div>
                            <div class="echoes-battle-panel__combat-stage-skill echoes-battle-panel__combat-stage-skill--enemy">
                                <span>Enemy Intent</span>
                                <strong>${enemySkill?.name || 'Unknown'}</strong>
                                <small>${enemySkill ? getCompactSkillPowerLabel(enemySkill) : ''}</small>
                            </div>
                        </div>

                        <div class="echoes-battle-panel__combat-stage-actors">
                            <div class="echoes-battle-panel__combat-actor echoes-battle-panel__combat-actor--hero${presentation ? ' is-clashing' : ''}">
                                <img src="${heroActorImage}" alt="${battle.hero.name}">
                            </div>
                            <div class="echoes-battle-panel__combat-stage-burst">
                                <span>${presentation ? `${presentation.clashWinner === 'hero' ? 'Vergilius' : 'Hong Lu'} won the clash` : 'Awaiting clash'}</span>
                                <strong>${presentation ? `${presentation.totalDamage} total damage` : 'Focused debug encounter'}</strong>
                            </div>
                            <div class="echoes-battle-panel__combat-actor echoes-battle-panel__combat-actor--enemy${presentation ? ' is-clashing' : ''}">
                                <img src="${enemyActorImage}" alt="${battle.enemy.name}">
                            </div>
                        </div>

                        <div class="echoes-battle-panel__combat-rounds">
                            ${roundMarkup}
                        </div>

                        <div class="echoes-battle-panel__combat-hits">
                            ${renderOneSidedHits(presentation)}
                        </div>
                    </div>
                </section>
            `;
        }

        function renderBattleUnitCard(unit, side) {
            const hpPercent = (unit.hp / unit.maxHp) * 100;
            const speedRangeLabel = `${unit.speedRange[0]}-${unit.speedRange[1]}`;
            const unitSprite = getUnitCardSprite(unit);
            const resistanceMarkup = ['slash', 'pierce', 'blunt']
                .map((type) => `
                    <div class="echoes-battle-panel__combat-resistance">
                        <span>${type}</span>
                        <strong>${formatResistanceValue(unit.resistances[type])}</strong>
                    </div>
                `)
                .join('');

            return `
                <section class="echoes-battle-panel__combat-unit echoes-battle-panel__combat-unit--${side}">
                    <div class="echoes-battle-panel__combat-unit-header">
                        <span class="echoes-battle-panel__combat-unit-label">${side === 'hero' ? 'Hero' : 'Enemy'}</span>
                        <strong>${unit.name}</strong>
                    </div>
                    <div class="echoes-battle-panel__combat-unit-sprite">
                        <img src="${unitSprite}" alt="${unit.name}">
                    </div>
                    <div class="echoes-battle-panel__combat-meter">
                        <div class="echoes-battle-panel__combat-meter-row">
                            <span>HP ${unit.hp} / ${unit.maxHp}</span>
                            <span>SP ${unit.sp}</span>
                        </div>
                        <div class="echoes-battle-panel__combat-meter-bar">
                            <span style="width: ${hpPercent}%"></span>
                        </div>
                    </div>
                    <div class="echoes-battle-panel__combat-stats">
                        <div><span>Speed</span><strong>${unit.speed}</strong></div>
                        <div><span>Range</span><strong>${speedRangeLabel}</strong></div>
                        <div><span>Level</span><strong>${unit.level}</strong></div>
                        <div><span>Def</span><strong>${getDefenseLevel(unit)}</strong></div>
                    </div>
                    <div class="echoes-battle-panel__combat-resistances">
                        ${resistanceMarkup}
                    </div>
                </section>
            `;
        }

        function render() {
            if (!mountElement) {
                return;
            }

            const enemySkill = getSkillById(battle.enemy, battle.enemySkillId);
            const selectedSkill = getSkillById(battle.hero, battle.selectedSkillId);
            const logMarkup = battle.log
                .slice(-10)
                .reverse()
                .map((entry) => `<li>${entry}</li>`)
                .join('');
            const heroSkillMarkup = battle.hero.skills.map((skill) => {
                const isSelected = battle.selectedSkillId === skill.id;
                const isDisabled = battle.phase !== 'select' || Boolean(battle.winner);
                const borderUrl = resolveAssetUrl(skill.borderPath);

                return `
                    <button
                        class="echoes-battle-panel__combat-skill${isSelected ? ' is-selected' : ''}"
                        type="button"
                        data-action="select-skill"
                        data-skill-id="${skill.id}"
                        ${isDisabled ? 'disabled' : ''}
                    >
                        <span class="echoes-battle-panel__combat-skill-border" style="background-image: url('${borderUrl}')"></span>
                        <div class="echoes-battle-panel__combat-skill-header">
                            <strong>${skill.name}</strong>
                            <span>${skill.damageType}</span>
                        </div>
                        <div class="echoes-battle-panel__combat-skill-power">${getSkillPowerLabel(skill)}</div>
                        <div class="echoes-battle-panel__combat-skill-meta">
                            <span>Slash Skill</span>
                            <span>Off ${getSkillOffenseLevel(battle.hero, skill)}</span>
                        </div>
                        <p>${skill.description}</p>
                    </button>
                `;
            }).join('');

            mountElement.innerHTML = `
                <div class="echoes-battle-panel__combat-debug">
                    <div class="echoes-battle-panel__combat-toolbar">
                        <div class="echoes-battle-panel__combat-pills">
                            <span class="echoes-battle-panel__combat-pill">Turn ${battle.turn}</span>
                            <span class="echoes-battle-panel__combat-pill">${getPhaseLabel()}</span>
                            <span class="echoes-battle-panel__combat-pill">Wiki-inspired prototype</span>
                        </div>
                        <div class="echoes-battle-panel__combat-controls">
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="resolve-turn"
                                ${battle.phase !== 'select' || !battle.selectedSkillId || battle.winner ? 'disabled' : ''}
                            >
                                Resolve Turn
                            </button>
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="next-turn"
                                ${battle.phase !== 'resolved' || battle.winner ? 'disabled' : ''}
                            >
                                Next Turn
                            </button>
                            <button
                                class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost"
                                type="button"
                                data-action="reset-fight"
                            >
                                Reset Fight
                            </button>
                        </div>
                    </div>

                    <div class="echoes-battle-panel__combat-arena">
                        ${renderBattleUnitCard(battle.hero, 'hero')}
                        ${renderClashStage(selectedSkill, enemySkill)}
                        ${renderBattleUnitCard(battle.enemy, 'enemy')}
                    </div>

                    <div class="echoes-battle-panel__combat-lower">
                        <section class="echoes-battle-panel__combat-skills">
                            <div class="echoes-battle-panel__combat-section-heading">
                                <span>Hero Skills</span>
                                <strong>${selectedSkill ? `Selected: ${selectedSkill.name}` : 'Select one skill'}</strong>
                            </div>
                            <div class="echoes-battle-panel__combat-skill-grid">
                                ${heroSkillMarkup}
                            </div>
                        </section>

                        <section class="echoes-battle-panel__combat-log">
                            <div class="echoes-battle-panel__combat-section-heading">
                                <span>Battle Log</span>
                                <strong>Latest events</strong>
                            </div>
                            <ol>
                                ${logMarkup}
                            </ol>
                        </section>
                    </div>
                </div>
            `;
        }

        function handleClick(event) {
            const actionTarget = event.target.closest('[data-action]');
            if (!actionTarget) {
                return;
            }

            const { action, skillId } = actionTarget.dataset;
            if (action === 'select-skill' && skillId) {
                selectDebugSkill(skillId);
                return;
            }

            if (action === 'resolve-turn') {
                resolveDebugTurn();
                return;
            }

            if (action === 'next-turn') {
                advanceDebugBattleTurn();
                return;
            }

            if (action === 'reset-fight') {
                resetDebugBattle();
            }
        }

        return {
            handleClick,
            render,
            reset: resetDebugBattle,
        };
    }

    window.EchoesOfTheCityBattle = {
        createDebugBattleController,
    };
})();
