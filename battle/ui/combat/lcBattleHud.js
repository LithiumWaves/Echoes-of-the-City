(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const lcChrome = battleModules.lcChrome || window.EchoesOfTheCityLcChrome || null;

    function countLivingUnits(units) {
        return (Array.isArray(units) ? units : []).filter((unit) => Number(unit?.hp) > 0).length;
    }

    function getGobletCounts(battle) {
        const resources = battle?.encounterResources;
        if (!resources || typeof resources !== 'object') {
            return { red: 0, white: 0 };
        }
        const red = Number.isFinite(resources['player:goblet-red']) ? resources['player:goblet-red'] : 0;
        const white = Number.isFinite(resources['player:goblet-white']) ? resources['player:goblet-white'] : 0;
        return { red, white };
    }

    function renderLcBattleTopHud(battle, uiState, deps) {
        const {
            escapeHtml = (value) => String(value),
            escapeAttribute = (value) => String(value),
            resolveAssetUrl = null,
            getResolvedBattle = (state) => state,
        } = deps;

        const resolvedBattle = getResolvedBattle(battle, uiState);
        const livingEnemies = countLivingUnits(battle.enemyUnits);
        const totalEnemies = (battle.enemyUnits || []).length;
        const goblets = getGobletCounts(battle);
        const inspectOpen = Boolean(uiState?.inspect?.isOpen);
        const debugEnabled = Boolean(uiState?.turnDebugEnabled);
        const debugToolsEnabled = uiState?.debugToolsEnabled !== false;
        const playbackActive = Boolean(uiState?.isPlaybackRunning);
        const nextDisabled = resolvedBattle.phase !== 'resolved' || resolvedBattle.winner || playbackActive;

        return `
            <header class="echoes-lc-battle-top-hud">
                ${lcChrome?.renderBackplateLayer({
                    className: 'echoes-lc-battle-top-hud__plate',
                    assetPath: lcChrome.LC_BATTLE_UI_ASSETS.topHudPlate,
                    resolveAssetUrl,
                    escapeAttribute,
                }) || ''}
                <div class="echoes-lc-battle-top-hud__left">
                    ${lcChrome?.renderBrassCounter('ENEMY', `${livingEnemies}`, {
                        escapeHtml,
                        modifier: 'echoes-lc-brass-counter--enemy',
                        subValue: `/ ${totalEnemies}`,
                    }) || `<span>ENEMY ${livingEnemies}/${totalEnemies}</span>`}
                    ${lcChrome?.renderBrassCounter('TURN', String(battle.turn || 1), {
                        escapeHtml,
                        modifier: 'echoes-lc-brass-counter--turn',
                    }) || `<span>TURN ${battle.turn || 1}</span>`}
                    <div class="echoes-lc-battle-top-hud__goblets" aria-label="Goblet resources">
                        <span class="echoes-lc-goblet echoes-lc-goblet--red">${escapeHtml(String(goblets.red))}</span>
                        <span class="echoes-lc-goblet echoes-lc-goblet--white">${escapeHtml(String(goblets.white))}</span>
                    </div>
                </div>
                <div class="echoes-lc-battle-top-hud__center">
                    <span class="echoes-lc-battle-top-hud__wave">WAVE ${escapeHtml(String(battle.wave || 1))} / ${escapeHtml(String(battle.totalWaves || 1))}</span>
                </div>
                <div class="echoes-lc-battle-top-hud__right">
                    <button class="echoes-lc-chrome-button echoes-lc-chrome-button--icon${inspectOpen ? ' is-active' : ''}" type="button" data-action="toggle-inspect" title="Inspect">⚙</button>
                    ${debugToolsEnabled
                        ? `<button class="echoes-lc-chrome-button echoes-lc-chrome-button--icon echoes-lc-chrome-button--max${debugEnabled ? ' is-active' : ''}" type="button" data-action="toggle-turn-debug" title="Turn debug">MAX</button>`
                        : ''}
                    <button class="echoes-lc-chrome-button echoes-lc-chrome-button--mini" type="button" data-action="next-turn" title="Next turn" ${nextDisabled ? 'disabled' : ''}>Next</button>
                    <button class="echoes-lc-chrome-button echoes-lc-chrome-button--mini" type="button" data-action="reset-fight" title="Reset fight">Reset</button>
                    <button class="echoes-lc-chrome-button echoes-lc-chrome-button--icon" type="button" data-action="quit-battle" title="Quit battle">«</button>
                </div>
            </header>
        `;
    }

    function renderLcEnemyHpBar(unit, deps) {
        const {
            escapeHtml = (value) => String(value),
            escapeAttribute = (value) => String(value),
            resolveAssetUrl = null,
        } = deps;
        const maxHp = Math.max(1, Number(unit?.maxHp) || 1);
        const hp = Math.max(0, Number(unit?.hp) || 0);
        const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const barStyle = lcChrome?.resolveAssetStyle(
            lcChrome.LC_BATTLE_UI_ASSETS.enemyHpBarBg,
            resolveAssetUrl,
            escapeAttribute,
        );

        return `
            <div class="echoes-lc-enemy-hp-bar" aria-label="HP ${escapeHtml(String(hp))}">
                <div class="echoes-lc-enemy-hp-bar__frame${barStyle ? ' has-image' : ''}" style="${barStyle}">
                    <span class="echoes-lc-enemy-hp-bar__fill" style="width:${hpPercent}%;"></span>
                </div>
                <span class="echoes-lc-enemy-hp-bar__value">${escapeHtml(String(hp))}</span>
            </div>
        `;
    }

    function renderLcFieldUnitChrome(unit, slot, side, deps) {
        const {
            escapeAttribute = (value) => String(value),
            escapeHtml = (value) => String(value),
            resolveAssetUrl = null,
        } = deps;
        const isEnemy = side === 'enemy';
        const baseStyle = lcChrome?.resolveAssetStyle(
            lcChrome.LC_BATTLE_UI_ASSETS.unitBase,
            resolveAssetUrl,
            escapeAttribute,
        );
        const hexStyle = lcChrome?.resolveAssetStyle(
            lcChrome.LC_BATTLE_UI_ASSETS.speedHexFrame,
            resolveAssetUrl,
            escapeAttribute,
        );

        const speedHex = `
            <span
                class="echoes-lc-field-speed-hex echoes-lc-hex${hexStyle ? ' has-image' : ''}"
                style="${hexStyle}"
                aria-label="Speed ${escapeAttribute(String(slot.speed))}"
            >${escapeHtml(String(slot.speed))}</span>
        `;
        const base = `
            <span class="echoes-lc-field-base${baseStyle ? ' has-image' : ''}" style="${baseStyle}" aria-hidden="true"></span>
        `;
        const enemyHp = isEnemy && unit?.hp > 0
            ? renderLcEnemyHpBar(unit, { escapeHtml, escapeAttribute, resolveAssetUrl })
            : '';

        return `${enemyHp}${speedHex}${base}`;
    }

    const lcBattleHud = {
        renderLcBattleTopHud,
        renderLcEnemyHpBar,
        renderLcFieldUnitChrome,
        countLivingUnits,
    };

    battleModules.lcBattleHud = lcBattleHud;
    window.EchoesOfTheCityLcBattleHud = lcBattleHud;
})();
