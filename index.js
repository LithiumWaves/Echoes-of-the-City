(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const ROOT_ID = `${EXTENSION_ID}-root`;
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const BUTTON_MARGIN = 0;
    const PANEL_MARGIN = 8;
    const PANEL_GAP = 24;
    const DRAG_THRESHOLD = 6;
    const PANEL_ASPECT_RATIO = 1640 / 4120;
    const ASSET_RELATIVE_PATHS = {
        hover: 'audio/battlewindow/hovermechanical.wav',
        click: 'audio/battlewindow/buttonclick.wav',
        theme: 'audio/battlewindow/maintheme.wav',
        heavyPanel: 'audio/battlewindow/heavypanel.wav',
    };

    const state = {
        isOpen: false,
        activeScreen: 'main-menu',
        debugBattle: null,
        audioEnabled: false,
        audioUnlocked: false,
        audioUnlockPromise: null,
        draggingPointerId: null,
        isDragging: false,
        suppressClick: false,
        dragStartPointer: { x: 0, y: 0 },
        dragStartButton: { x: 0, y: 0 },
        buttonPosition: { x: 0, y: 0 },
        extensionBaseUrl: null,
    };

    const elements = {
        root: null,
        button: null,
        panel: null,
        backdrop: null,
        closeButton: null,
        fullscreenButton: null,
        screen: null,
        mainMenu: null,
        characterSelect: null,
        combatScreen: null,
        combatContent: null,
        combatTrayButton: null,
        characterTrayButton: null,
    };

    const hoverAudio = new Audio();
    const clickAudio = new Audio();
    const themeAudio = new Audio();
    const heavyPanelAudio = new Audio();
    const audioContext = typeof window.AudioContext === 'function'
        ? new window.AudioContext()
        : typeof window.webkitAudioContext === 'function'
            ? new window.webkitAudioContext()
            : null;
    const audioBuffers = new Map();
    const DEBUG_FIGHT_TEMPLATE = {
        hero: {
            id: 'debug-sinner',
            name: 'Debug Sinner',
            level: 34,
            maxHp: 172,
            sp: 0,
            speedRange: [3, 7],
            defenseLevel: 34,
            resistances: {
                slash: 1,
                pierce: 0.75,
                blunt: 1.25,
            },
            skills: [
                {
                    id: 'frontal-assault',
                    name: 'Frontal Assault',
                    basePower: 4,
                    coinPower: 3,
                    coinCount: 2,
                    damageType: 'slash',
                    sinAffinity: 'wrath',
                    offenseLevel: 2,
                    description: 'Balanced opener with reliable clash power.',
                },
                {
                    id: 'piercing-line',
                    name: 'Piercing Line',
                    basePower: 3,
                    coinPower: 4,
                    coinCount: 2,
                    damageType: 'pierce',
                    sinAffinity: 'gloom',
                    offenseLevel: 1,
                    description: 'Spikier clash roll that punishes weak pierce resistance.',
                },
                {
                    id: 'crushing-verdict',
                    name: 'Crushing Verdict',
                    basePower: 6,
                    coinPower: 2,
                    coinCount: 3,
                    damageType: 'blunt',
                    sinAffinity: 'pride',
                    offenseLevel: 0,
                    description: 'Heavy three-coin skill for strong one-sided follow-up.',
                },
            ],
        },
        enemy: {
            id: 'training-drone',
            name: 'Training Drone',
            level: 32,
            maxHp: 196,
            sp: 0,
            speedRange: [2, 6],
            defenseLevel: 31,
            resistances: {
                slash: 1.5,
                pierce: 1,
                blunt: 0.75,
            },
            skills: [
                {
                    id: 'saw-sweep',
                    name: 'Saw Sweep',
                    basePower: 4,
                    coinPower: 2,
                    coinCount: 2,
                    damageType: 'slash',
                    sinAffinity: 'wrath',
                    offenseLevel: 1,
                    description: 'Standard slash pattern used for early clash checks.',
                },
                {
                    id: 'nail-launcher',
                    name: 'Nail Launcher',
                    basePower: 3,
                    coinPower: 3,
                    coinCount: 2,
                    damageType: 'pierce',
                    sinAffinity: 'envy',
                    offenseLevel: 2,
                    description: 'Fast pierce burst with higher ceiling.',
                },
                {
                    id: 'impact-ram',
                    name: 'Impact Ram',
                    basePower: 5,
                    coinPower: 2,
                    coinCount: 3,
                    damageType: 'blunt',
                    sinAffinity: 'sloth',
                    offenseLevel: 0,
                    description: 'Slow, heavy blunt skill for longer clashes.',
                },
            ],
        },
    };

    function createBattleUnit(template) {
        return {
            ...template,
            hp: template.maxHp,
            sp: template.sp,
            speed: 0,
            resistances: { ...template.resistances },
            skills: template.skills.map((skill) => ({ ...skill })),
        };
    }

    function createDebugBattleState() {
        const battle = {
            turn: 0,
            phase: 'setup',
            winner: null,
            selectedSkillId: null,
            enemySkillId: null,
            lastResolution: null,
            log: [],
            hero: createBattleUnit(DEBUG_FIGHT_TEMPLATE.hero),
            enemy: createBattleUnit(DEBUG_FIGHT_TEMPLATE.enemy),
        };

        startDebugBattleTurn(battle);
        return battle;
    }

    function getDebugBattle() {
        if (!state.debugBattle) {
            state.debugBattle = createDebugBattleState();
        }

        return state.debugBattle;
    }

    function pushBattleLog(battle, message) {
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

    function pickEnemySkillId(battle) {
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

    function resolveDebugClash(battle, heroSkill, enemySkill) {
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

    function startDebugBattleTurn(battle) {
        if (battle.winner) {
            return;
        }

        battle.turn += 1;
        battle.phase = 'select';
        battle.selectedSkillId = null;
        battle.enemySkillId = pickEnemySkillId(battle);
        battle.lastResolution = null;
        battle.hero.speed = randomInt(...battle.hero.speedRange);
        battle.enemy.speed = randomInt(...battle.enemy.speedRange);

        const enemySkill = getSkillById(battle.enemy, battle.enemySkillId);
        pushBattleLog(
            battle,
            `Turn ${battle.turn} starts. ${battle.hero.name} rolls ${battle.hero.speed} Speed, ${battle.enemy.name} rolls ${battle.enemy.speed}.`,
        );
        pushBattleLog(battle, `${battle.enemy.name} prepares ${enemySkill.name}.`);
    }

    function selectDebugSkill(skillId) {
        const battle = getDebugBattle();
        if (battle.phase !== 'select' || battle.winner) {
            return;
        }

        battle.selectedSkillId = skillId;
        renderCombatScreen();
    }

    function resolveDebugTurn() {
        const battle = getDebugBattle();
        if (battle.phase !== 'select' || !battle.selectedSkillId || battle.winner) {
            return;
        }

        const heroSkill = getSkillById(battle.hero, battle.selectedSkillId);
        const enemySkill = getSkillById(battle.enemy, battle.enemySkillId);
        if (!heroSkill || !enemySkill) {
            return;
        }

        pushBattleLog(
            battle,
            `${battle.hero.name} uses ${heroSkill.name}. ${battle.enemy.name} answers with ${enemySkill.name}.`,
        );

        const clash = resolveDebugClash(battle, heroSkill, enemySkill);
        clash.rounds.forEach((round, index) => {
            if (round.result === 'tie') {
                pushBattleLog(
                    battle,
                    `Clash ${index + 1}: tie at ${round.heroPower} (${formatCoinFlips(round.heroFlips)} vs ${formatCoinFlips(round.enemyFlips)}).`,
                );
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
            pushBattleLog(
                battle,
                `Clash ${index + 1}: ${roundWinner} wins ${winnerPower} to ${loserPower}, breaking a Coin from ${roundLoser}.`,
            );
        });

        const clashWinnerUnit = clash.winner === 'hero' ? battle.hero : battle.enemy;
        const clashLoserUnit = clash.winner === 'hero' ? battle.enemy : battle.hero;
        const attackSkill = clash.winner === 'hero' ? heroSkill : enemySkill;
        const remainingCoins = clash.winner === 'hero' ? clash.heroRemainingCoins : clash.enemyRemainingCoins;

        adjustSanity(clashWinnerUnit, 5);
        adjustSanity(clashLoserUnit, -5);
        pushBattleLog(
            battle,
            `${clashWinnerUnit.name} wins the clash, gains 5 SP, and attacks one-sided with ${remainingCoins} remaining Coin${remainingCoins === 1 ? '' : 's'}.`,
        );

        const hits = resolveOneSidedAttack(clashWinnerUnit, attackSkill, clashLoserUnit, remainingCoins);
        let totalDamage = 0;

        hits.forEach((hit, index) => {
            totalDamage += hit.damage;
            pushBattleLog(
                battle,
                `Hit ${index + 1}: ${hit.isHeads ? 'Heads' : 'Tails'} for Power ${hit.finalPower}, dealing ${hit.damage} ${attackSkill.damageType} damage.`,
            );
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

        renderCombatScreen();
    }

    function advanceDebugBattleTurn() {
        const battle = getDebugBattle();
        if (battle.phase !== 'resolved' || battle.winner) {
            return;
        }

        startDebugBattleTurn(battle);
        renderCombatScreen();
    }

    function resetDebugBattle() {
        state.debugBattle = createDebugBattleState();
        renderCombatScreen();
    }

    function formatResistanceValue(value) {
        return `x${value.toFixed(2).replace(/\.00$/, '')}`;
    }

    function getPhaseLabel(battle) {
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

    function getWinnerLabel(battle) {
        if (battle.winner === 'hero') {
            return `${battle.hero.name} wins`;
        }
        if (battle.winner === 'enemy') {
            return `${battle.enemy.name} wins`;
        }
        return 'Focused Debug Fight';
    }

    function getSkillPowerLabel(skill) {
        return `${skill.basePower} + ${skill.coinPower} x ${skill.coinCount}`;
    }

    function renderBattleUnitCard(unit, side) {
        const hpPercent = (unit.hp / unit.maxHp) * 100;
        const speedRangeLabel = `${unit.speedRange[0]}-${unit.speedRange[1]}`;
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

    function renderCombatScreen() {
        if (!elements.combatContent) {
            return;
        }

        const battle = getDebugBattle();
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

            return `
                <button
                    class="echoes-battle-panel__combat-skill${isSelected ? ' is-selected' : ''}"
                    type="button"
                    data-action="select-skill"
                    data-skill-id="${skill.id}"
                    ${isDisabled ? 'disabled' : ''}
                >
                    <div class="echoes-battle-panel__combat-skill-header">
                        <strong>${skill.name}</strong>
                        <span>${skill.damageType}</span>
                    </div>
                    <div class="echoes-battle-panel__combat-skill-power">${getSkillPowerLabel(skill)}</div>
                    <div class="echoes-battle-panel__combat-skill-meta">
                        <span>${skill.sinAffinity}</span>
                        <span>Off ${getSkillOffenseLevel(battle.hero, skill)}</span>
                    </div>
                    <p>${skill.description}</p>
                </button>
            `;
        }).join('');

        elements.combatContent.innerHTML = `
            <div class="echoes-battle-panel__combat-debug">
                <div class="echoes-battle-panel__combat-toolbar">
                    <div class="echoes-battle-panel__combat-pills">
                        <span class="echoes-battle-panel__combat-pill">Turn ${battle.turn}</span>
                        <span class="echoes-battle-panel__combat-pill">${getPhaseLabel(battle)}</span>
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
                    <section class="echoes-battle-panel__combat-center">
                        <div class="echoes-battle-panel__combat-intent">
                            <span>Enemy Intent</span>
                            <strong>${enemySkill?.name || 'Unknown'}</strong>
                            <small>${enemySkill ? getSkillPowerLabel(enemySkill) : ''}</small>
                        </div>
                        <div class="echoes-battle-panel__combat-summary">
                            <span>${getWinnerLabel(battle)}</span>
                            <strong>${selectedSkill ? selectedSkill.name : 'Choose a hero skill to begin.'}</strong>
                            <small>
                                ${battle.lastResolution
                                    ? `${battle.lastResolution.actingUnitName} used ${battle.lastResolution.actingSkillName} for ${battle.lastResolution.totalDamage} total damage.`
                                    : 'Flow: Speed roll -> Clash until one side loses all Coins -> winner attacks with remaining Coins.'}
                            </small>
                        </div>
                    </section>
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

    function handleCombatContentClick(event) {
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

    function configureAudio(audio, volume) {
        audio.preload = 'auto';
        audio.volume = volume;
    }

    function removeAudioUnlockListeners() {
        document.removeEventListener('pointerdown', handleAudioUnlockGesture, true);
        document.removeEventListener('keydown', handleAudioUnlockGesture, true);
        document.removeEventListener('touchstart', handleAudioUnlockGesture, true);
        document.removeEventListener('click', handleAudioUnlockGesture, true);
    }

    function getBackgroundImageUrl(value) {
        const match = /url\((['"]?)(.*?)\1\)/.exec(value || '');
        return match?.[2] || null;
    }

    function detectExtensionBaseUrl() {
        const currentScriptSource = document.currentScript?.src;
        if (currentScriptSource) {
            return new URL('./', currentScriptSource).href;
        }

        const scriptMatch = Array.from(document.querySelectorAll('script[src]'))
            .map((script) => script.src)
            .find((src) => src.includes('Echoes-of-the-City') && src.endsWith('/index.js'));

        if (scriptMatch) {
            return new URL('./', scriptMatch).href;
        }

        const stylesheetMatch = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'))
            .map((link) => link.href)
            .find((href) => href.includes('Echoes-of-the-City') && href.endsWith('/style.css'));

        if (stylesheetMatch) {
            return new URL('./', stylesheetMatch).href;
        }

        if (elements.button) {
            const backgroundImage = getComputedStyle(elements.button).backgroundImage;
            const backgroundUrl = getBackgroundImageUrl(backgroundImage);
            if (backgroundUrl) {
                return new URL('../../', backgroundUrl).href;
            }
        }

        return new URL('./', window.location.href).href;
    }

    function resolveExtensionUrl(relativePath) {
        if (!state.extensionBaseUrl) {
            state.extensionBaseUrl = detectExtensionBaseUrl();
        }

        return new URL(relativePath, state.extensionBaseUrl).href;
    }

    function syncAssetUrls() {
        state.extensionBaseUrl = detectExtensionBaseUrl();

        const hoverUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.hover);
        const clickUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.click);
        const themeUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.theme);
        const heavyPanelUrl = resolveExtensionUrl(ASSET_RELATIVE_PATHS.heavyPanel);

        hoverAudio.src = hoverUrl;
        clickAudio.src = clickUrl;
        themeAudio.src = themeUrl;
        heavyPanelAudio.src = heavyPanelUrl;
    }

    function startThemeAudio() {
        if (!themeAudio.src || !state.audioUnlocked) {
            return;
        }

        try {
            const playPromise = themeAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: theme audio playback skipped.`, error);
        }
    }

    function stopThemeAudio() {
        try {
            themeAudio.pause();
            themeAudio.currentTime = 0;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: theme audio stop skipped.`, error);
        }
    }

    function playHeavyPanelAudio() {
        if (!heavyPanelAudio.src || !state.audioUnlocked) {
            return;
        }

        try {
            heavyPanelAudio.currentTime = 0;
            const playPromise = heavyPanelAudio.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: heavy panel audio playback skipped.`, error);
        }
    }

    async function primeAudioElement(audio) {
        if (!audio?.src) {
            return;
        }

        try {
            audio.muted = true;
            audio.currentTime = 0;
            const playPromise = audio.play();
            if (playPromise && typeof playPromise.then === 'function') {
                await playPromise;
            }
            audio.pause();
            audio.currentTime = 0;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio priming skipped.`, error);
        } finally {
            audio.muted = false;
        }
    }

    async function resumeAudioContext() {
        if (!audioContext) {
            state.audioEnabled = true;
            return true;
        }

        try {
            if (audioContext.state !== 'running') {
                await audioContext.resume();
            }

            state.audioEnabled = audioContext.state === 'running';
            return state.audioEnabled;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio context resume skipped.`, error);
            return false;
        }
    }

    async function unlockAudioPlayback() {
        if (state.audioUnlocked) {
            return true;
        }

        if (state.audioUnlockPromise) {
            return state.audioUnlockPromise;
        }

        state.audioUnlockPromise = (async () => {
            await resumeAudioContext();
            await Promise.all([
                primeAudioElement(hoverAudio),
                primeAudioElement(clickAudio),
                primeAudioElement(themeAudio),
                primeAudioElement(heavyPanelAudio),
            ]);

            state.audioUnlocked = true;
            removeAudioUnlockListeners();

            if (state.isOpen) {
                startThemeAudio();
            }

            return true;
        })().finally(() => {
            state.audioUnlockPromise = null;
        });

        return state.audioUnlockPromise;
    }

    function handleAudioUnlockGesture() {
        void unlockAudioPlayback();
    }

    async function loadAudioBuffer(name, path) {
        if (!audioContext) {
            return;
        }

        try {
            const response = await fetch(path);
            const arrayBuffer = await response.arrayBuffer();
            const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
            audioBuffers.set(name, decodedBuffer);
        } catch (error) {
            console.debug(`${EXTENSION_ID}: audio buffer load skipped.`, error);
        }
    }

    function playHtmlAudio(audio) {
        try {
            const audioInstance = audio.cloneNode();
            audioInstance.volume = audio.volume;
            audioInstance.preload = 'auto';
            const playPromise = audioInstance.play();

            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        } catch (error) {
            console.debug(`${EXTENSION_ID}: html audio playback skipped.`, error);
        }
    }

    function playBufferedAudio(name, volume) {
        if (!audioContext || audioContext.state !== 'running') {
            return false;
        }

        const buffer = audioBuffers.get(name);
        if (!buffer) {
            return false;
        }

        try {
            const source = audioContext.createBufferSource();
            const gain = audioContext.createGain();
            source.buffer = buffer;
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(audioContext.destination);
            source.start(0);
            return true;
        } catch (error) {
            console.debug(`${EXTENSION_ID}: buffered audio playback skipped.`, error);
            return false;
        }
    }

    function playSound(name, options = {}) {
        const { requireAudioEnabled = false } = options;

        if (requireAudioEnabled && !state.audioEnabled) {
            return;
        }

        if (name === 'hover') {
            if (!playBufferedAudio('hover', hoverAudio.volume)) {
                playHtmlAudio(hoverAudio);
            }
            return;
        }

        if (!playBufferedAudio('click', clickAudio.volume)) {
            playHtmlAudio(clickAudio);
        }
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getPanelWidth() {
        if (window.innerWidth <= 900) {
            return Math.max(320, window.innerWidth - 24);
        }

        if (window.innerWidth <= 1200) {
            return Math.min(window.innerWidth * 0.78, 980);
        }

        return Math.min(window.innerWidth * 0.72, 1100);
    }

    function getButtonRect() {
        if (!elements.button) {
            return { width: 0, height: 0 };
        }

        return {
            width: elements.button.offsetWidth,
            height: elements.button.offsetHeight,
        };
    }

    function updateLayoutPosition() {
        if (!elements.root || !elements.button) {
            return;
        }

        const buttonRect = getButtonRect();
        const buttonWidth = buttonRect.width;
        const buttonHeight = buttonRect.height;
        const maxX = Math.max(BUTTON_MARGIN, window.innerWidth - buttonWidth - BUTTON_MARGIN);
        const maxY = Math.max(BUTTON_MARGIN, window.innerHeight - buttonHeight - BUTTON_MARGIN);

        state.buttonPosition.x = clamp(state.buttonPosition.x, BUTTON_MARGIN, maxX);
        state.buttonPosition.y = clamp(state.buttonPosition.y, BUTTON_MARGIN, maxY);

        const panelWidth = getPanelWidth();
        const panelHeight = panelWidth * PANEL_ASPECT_RATIO;

        let panelLeft;
        let panelTop;

        if (window.innerWidth <= 900) {
            panelLeft = clamp(
                state.buttonPosition.x + (buttonWidth / 2) - (panelWidth / 2),
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN),
            );
            panelTop = clamp(
                state.buttonPosition.y - panelHeight - PANEL_GAP,
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN),
            );
        } else {
            panelLeft = clamp(
                state.buttonPosition.x - panelWidth - PANEL_GAP,
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerWidth - panelWidth - PANEL_MARGIN),
            );
            panelTop = clamp(
                state.buttonPosition.y + (buttonHeight / 2) - (panelHeight / 2),
                PANEL_MARGIN,
                Math.max(PANEL_MARGIN, window.innerHeight - panelHeight - PANEL_MARGIN),
            );
        }

        elements.root.style.setProperty('--echoes-button-left', `${state.buttonPosition.x}px`);
        elements.root.style.setProperty('--echoes-button-top', `${state.buttonPosition.y}px`);
        elements.root.style.setProperty('--echoes-panel-left', `${panelLeft}px`);
        elements.root.style.setProperty('--echoes-panel-top', `${panelTop}px`);
        elements.root.style.setProperty('--echoes-panel-width', `${panelWidth}px`);
    }

    function initializeButtonPosition() {
        if (!elements.button) {
            return;
        }

        const buttonRect = getButtonRect();
        state.buttonPosition = {
            x: window.innerWidth - buttonRect.width - BUTTON_MARGIN,
            y: (window.innerHeight - buttonRect.height) / 2,
        };

        updateLayoutPosition();
    }

    function syncPanelState() {
        if (!elements.root || !elements.button || !elements.panel) {
            return;
        }

        const isCharacterSelectOpen = state.activeScreen === 'character-select';
        const isCombatScreenOpen = state.activeScreen === 'combat';

        elements.root.classList.toggle('is-open', state.isOpen);
        elements.root.classList.toggle('is-character-select', isCharacterSelectOpen);
        elements.root.classList.toggle('is-combat-screen', isCombatScreenOpen);
        elements.button.setAttribute('aria-expanded', String(state.isOpen));
        elements.panel.setAttribute('aria-hidden', String(!state.isOpen));
        elements.mainMenu?.setAttribute('aria-hidden', String(state.activeScreen !== 'main-menu'));
        elements.characterSelect?.setAttribute('aria-hidden', String(!isCharacterSelectOpen));
        elements.combatScreen?.setAttribute('aria-hidden', String(!isCombatScreenOpen));
        elements.characterTrayButton?.setAttribute('aria-pressed', String(isCharacterSelectOpen));
        elements.combatTrayButton?.setAttribute('aria-pressed', String(isCombatScreenOpen));
    }

    function syncThemePlayback() {
        if (state.isOpen) {
            startThemeAudio();
            return;
        }

        stopThemeAudio();
    }

    function openBattlePanel() {
        if (state.isOpen) {
            return;
        }

        state.isOpen = true;
        syncPanelState();
        playHeavyPanelAudio();
        syncThemePlayback();
    }

    function closeBattlePanel() {
        if (!state.isOpen) {
            return;
        }

        state.isOpen = false;
        syncPanelState();
        syncThemePlayback();
    }

    function toggleBattlePanel() {
        if (state.isOpen) {
            closeBattlePanel();
            return;
        }

        openBattlePanel();
    }

    function handleLauncherHover() {
        if (state.isDragging) {
            return;
        }

        playSound('hover', { requireAudioEnabled: true });
    }

    async function handleLauncherClick() {
        if (state.suppressClick) {
            state.suppressClick = false;
            return;
        }

        await unlockAudioPlayback();
        playSound('click');
        toggleBattlePanel();
    }

    async function handleCloseClick() {
        await unlockAudioPlayback();
        playSound('click');
        closeBattlePanel();
    }

    function handleKeydown(event) {
        if (event.key === 'Escape' && state.isOpen) {
            closeBattlePanel();
        }
    }

    async function handleLauncherPointerDown(event) {
        if (!elements.button || event.button !== 0) {
            return;
        }

        await unlockAudioPlayback();

        state.draggingPointerId = event.pointerId;
        state.isDragging = false;
        state.dragStartPointer = { x: event.clientX, y: event.clientY };
        state.dragStartButton = { ...state.buttonPosition };
        elements.button.setPointerCapture(event.pointerId);
        elements.button.classList.add('is-dragging');
    }

    function handleLauncherPointerMove(event) {
        if (state.draggingPointerId !== event.pointerId) {
            return;
        }

        const deltaX = event.clientX - state.dragStartPointer.x;
        const deltaY = event.clientY - state.dragStartPointer.y;

        if (!state.isDragging && Math.hypot(deltaX, deltaY) >= DRAG_THRESHOLD) {
            state.isDragging = true;
            state.suppressClick = true;
        }

        if (!state.isDragging) {
            return;
        }

        state.buttonPosition = {
            x: state.dragStartButton.x + deltaX,
            y: state.dragStartButton.y + deltaY,
        };

        updateLayoutPosition();
    }

    function stopLauncherDrag(event) {
        if (!elements.button || state.draggingPointerId !== event.pointerId) {
            return;
        }

        if (elements.button.hasPointerCapture(event.pointerId)) {
            elements.button.releasePointerCapture(event.pointerId);
        }

        elements.button.classList.remove('is-dragging');
        state.draggingPointerId = null;
        window.setTimeout(() => {
            state.isDragging = false;
        }, 0);
    }

    function handleResize() {
        updateLayoutPosition();
    }

    async function handleCharacterTrayButtonClick() {
        await unlockAudioPlayback();

        if (state.activeScreen === 'character-select') {
            return;
        }

        playSound('click');

        if (!elements.characterTrayButton) {
            return;
        }

        state.activeScreen = 'character-select';
        syncPanelState();
    }

    async function handleCombatTrayButtonClick() {
        await unlockAudioPlayback();

        if (state.activeScreen === 'combat') {
            return;
        }

        playSound('click');

        if (!elements.combatTrayButton) {
            return;
        }

        state.activeScreen = 'combat';
        syncPanelState();
        renderCombatScreen();
    }

    function handleTrayButtonHover(event) {
        if (event.currentTarget?.getAttribute('aria-pressed') === 'true') {
            return;
        }

        playSound('hover', { requireAudioEnabled: true });
    }

    async function toggleScreenFullscreen() {
        if (!elements.screen) {
            return;
        }

        try {
            if (document.fullscreenElement === elements.screen) {
                await document.exitFullscreen();
                return;
            }

            await elements.screen.requestFullscreen();
        } catch (error) {
            console.debug(`${EXTENSION_ID}: fullscreen toggle skipped.`, error);
        }
    }

    function preloadAudio() {
        themeAudio.load();
        void Promise.all([
            loadAudioBuffer('hover', resolveExtensionUrl(ASSET_RELATIVE_PATHS.hover)),
            loadAudioBuffer('click', resolveExtensionUrl(ASSET_RELATIVE_PATHS.click)),
        ]);
    }

    function createBattleInterface() {
        if (!document.body || document.getElementById(ROOT_ID)) {
            return;
        }

        const root = document.createElement('div');
        root.id = ROOT_ID;
        root.className = 'echoes-battle-ui';
        root.innerHTML = `
            <button
                id="${BUTTON_ID}"
                class="echoes-battle-launcher"
                type="button"
                aria-label="Toggle battle panel"
                aria-controls="${EXTENSION_ID}-battle-panel"
                aria-expanded="false"
                title="Toggle battle panel"
            >
                <span class="echoes-battle-launcher__glow" aria-hidden="true"></span>
                <span class="echoes-sr-only">Toggle battle panel</span>
            </button>

            <div class="echoes-battle-backdrop" aria-hidden="true"></div>

            <section
                id="${EXTENSION_ID}-battle-panel"
                class="echoes-battle-panel"
                aria-hidden="true"
            >
                <button
                    class="echoes-battle-panel__fullscreen"
                    type="button"
                    aria-label="Fullscreen battle screen"
                    title="Fullscreen battle screen"
                >
                    Full
                </button>
                <button
                    class="echoes-battle-panel__close"
                    type="button"
                    aria-label="Close battle panel"
                    title="Close battle panel"
                >
                    x
                </button>

                <div class="echoes-battle-panel__window" aria-hidden="true">
                    <div class="echoes-battle-panel__screen">
                        <div class="echoes-battle-panel__main-menu">
                            <div class="echoes-battle-panel__content"></div>
                        </div>
                        <div class="echoes-battle-panel__character-select" aria-hidden="true">
                            <div class="echoes-battle-panel__character-layout">
                                <div class="echoes-battle-panel__roster-menu"></div>
                                <div class="echoes-battle-panel__character-screen">
                                    <div class="echoes-battle-panel__no-character"></div>
                                </div>
                            </div>
                        </div>
                        <div class="echoes-battle-panel__combat-screen" aria-hidden="true">
                            <div class="echoes-battle-panel__combat-content"></div>
                        </div>
                        <div class="echoes-battle-panel__tray" aria-hidden="true">
                            <button
                                class="echoes-battle-panel__tray-button echoes-battle-panel__tray-button--combat"
                                type="button"
                                aria-label="Open combat screen"
                                aria-pressed="false"
                                title="Open combat screen"
                            >
                                <span
                                    class="echoes-battle-panel__tray-icon echoes-battle-panel__tray-icon--combat"
                                    aria-hidden="true"
                                ></span>
                            </button>
                            <button
                                class="echoes-battle-panel__tray-button echoes-battle-panel__tray-button--characters"
                                type="button"
                                aria-label="Open character select"
                                aria-pressed="false"
                                title="Open character select"
                            >
                                <span class="echoes-battle-panel__tray-icon" aria-hidden="true"></span>
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        `;

        document.body.appendChild(root);

        elements.root = root;
        elements.button = root.querySelector(`#${BUTTON_ID}`);
        elements.panel = root.querySelector('.echoes-battle-panel');
        elements.backdrop = root.querySelector('.echoes-battle-backdrop');
        elements.closeButton = root.querySelector('.echoes-battle-panel__close');
        elements.fullscreenButton = root.querySelector('.echoes-battle-panel__fullscreen');
        elements.screen = root.querySelector('.echoes-battle-panel__screen');
        elements.mainMenu = root.querySelector('.echoes-battle-panel__main-menu');
        elements.characterSelect = root.querySelector('.echoes-battle-panel__character-select');
        elements.combatScreen = root.querySelector('.echoes-battle-panel__combat-screen');
        elements.combatContent = root.querySelector('.echoes-battle-panel__combat-content');
        elements.combatTrayButton = root.querySelector('.echoes-battle-panel__tray-button--combat');
        elements.characterTrayButton = root.querySelector('.echoes-battle-panel__tray-button--characters');

        syncAssetUrls();
        elements.button.addEventListener('mouseenter', handleLauncherHover);
        elements.button.addEventListener('pointerdown', handleLauncherPointerDown);
        elements.button.addEventListener('pointermove', handleLauncherPointerMove);
        elements.button.addEventListener('pointerup', stopLauncherDrag);
        elements.button.addEventListener('pointercancel', stopLauncherDrag);
        elements.button.addEventListener('click', handleLauncherClick);
        elements.backdrop.addEventListener('click', closeBattlePanel);
        elements.closeButton.addEventListener('click', handleCloseClick);
        elements.fullscreenButton.addEventListener('click', toggleScreenFullscreen);
        elements.combatTrayButton.addEventListener('mouseenter', handleTrayButtonHover);
        elements.combatTrayButton.addEventListener('click', handleCombatTrayButtonClick);
        elements.combatContent.addEventListener('click', handleCombatContentClick);
        elements.characterTrayButton.addEventListener('mouseenter', handleTrayButtonHover);
        elements.characterTrayButton.addEventListener('click', handleCharacterTrayButtonClick);
        document.addEventListener('keydown', handleKeydown);
        window.addEventListener('resize', handleResize);

        initializeButtonPosition();
    }

    function initialize() {
        configureAudio(hoverAudio, 0.55);
        configureAudio(clickAudio, 0.7);
        configureAudio(themeAudio, 0.42);
        configureAudio(heavyPanelAudio, 0.8);
        themeAudio.loop = true;
        document.addEventListener('pointerdown', handleAudioUnlockGesture, true);
        document.addEventListener('keydown', handleAudioUnlockGesture, true);
        document.addEventListener('touchstart', handleAudioUnlockGesture, true);
        document.addEventListener('click', handleAudioUnlockGesture, true);
        createBattleInterface();
        state.debugBattle = createDebugBattleState();
        renderCombatScreen();
        preloadAudio();
        syncPanelState();

        window.EchoesOfTheCity = {
            openBattlePanel,
            closeBattlePanel,
            toggleBattlePanel,
            resetDebugBattle,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
