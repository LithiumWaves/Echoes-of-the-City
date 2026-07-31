(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const LC_MAX_COLUMNS = 12;
    const SIN_COLORS = {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#4a90c4',
        pride: '#9b59b6',
        envy: '#2ecc71',
    };

    function getUnitPortraitUrl(unit, resolveAssetUrl) {
        const sprites = unit?.sprites;
        if (!sprites || typeof sprites !== 'object') {
            return '';
        }
        const splash = sprites.splash;
        const idle = sprites.idle;
        const candidate = splash || idle || '';
        return candidate ? resolveAssetUrl(candidate) : '';
    }

    function renderLcSkillSlot(skill, slot, offerKey, battle, deps) {
        const {
            escapeAttribute,
            resolveAssetUrl,
            isDefenseSkill,
            getSkillPowerLabel,
        } = deps;
        if (!skill) {
            return `
                <div class="echoes-lc-skill-slot echoes-lc-skill-slot--empty" data-offer-slot="${offerKey}">
                    <span class="echoes-lc-skill-slot__placeholder">—</span>
                </div>
            `;
        }
        const isSelected = slot.selectedSkillId === skill.id && slot.selectedOfferSlot === offerKey;
        const isDisabled = battle.phase !== 'select' || Boolean(battle.winner);
        const borderUrl = resolveAssetUrl(skill.borderPath);
        const sinColor = SIN_COLORS[skill.sinType] || '#888';
        const tooltip = escapeAttribute([
            skill.name,
            getSkillPowerLabel(skill),
            skill.description || '',
        ].join('\n'));

        return `
            <button
                class="echoes-lc-skill-slot${isSelected ? ' is-selected' : ''}${isDefenseSkill(skill) ? ' is-defense' : ''}"
                type="button"
                data-action="select-skill"
                data-slot-id="${slot.id}"
                data-skill-id="${skill.id}"
                data-offer-slot="${offerKey}"
                draggable="${isDisabled ? 'false' : 'true'}"
                data-drag-skill="true"
                title="${tooltip}"
                ${isDisabled ? 'disabled' : ''}
                style="--echoes-lc-sin-color:${sinColor};"
            >
                <span class="echoes-lc-skill-slot__border" style="background-image:url('${borderUrl}')"></span>
                <span class="echoes-lc-skill-slot__inner"></span>
            </button>
        `;
    }

    function sortDashboardSlots(battle, slots) {
        const skillDeck = battleModules.skillDeck || window.EchoesOfTheCitySkillDeck;
        const unitsById = {};
        (battle.playerUnits || []).forEach((unit) => {
            if (unit?.id) {
                unitsById[unit.id] = unit;
            }
        });
        if (skillDeck?.sortDashboardSlots) {
            return skillDeck.sortDashboardSlots(slots, unitsById);
        }
        return [...slots].sort((left, right) => {
            if (right.speed !== left.speed) {
                return right.speed - left.speed;
            }
            return left.index - right.index;
        });
    }

    function renderLcColumn(battle, slot, deps) {
        const {
            escapeAttribute,
            escapeHtml,
            resolveAssetUrl,
            getUnitById,
            getSkillById,
            isDefenseSkill,
            getSkillPowerLabel,
        } = deps;
        if (!slot) {
            return `<div class="echoes-lc-column echoes-lc-column--empty"></div>`;
        }
        const unit = getUnitById(battle, slot.unitId);
        if (!unit) {
            return `<div class="echoes-lc-column echoes-lc-column--empty"></div>`;
        }
        const offer = slot.skillOffer || { top: null, bottom: null };
        const topSkill = offer.top ? getSkillById(unit, offer.top) : null;
        const bottomSkill = offer.bottom ? getSkillById(unit, offer.bottom) : null;
        const portraitUrl = getUnitPortraitUrl(unit, resolveAssetUrl);
        const isActive = battle.activePlayerSlotId === slot.id;
        const isResolved = slot.resolved;
        const portraitStyle = portraitUrl ? `background-image:url('${escapeAttribute(portraitUrl)}');` : '';
        const slotLabel = Number.isInteger(slot.skillSlotIndex) && slot.skillSlotIndex > 0
            ? `${escapeHtml(unit.name)} #${slot.skillSlotIndex + 1}`
            : escapeHtml(unit.name);

        return `
            <div class="echoes-lc-column${isActive ? ' is-active' : ''}${isResolved ? ' is-resolved' : ''}${slot.defenseMode ? ' is-defense-mode' : ''}" data-slot-id="${slot.id}">
                <div
                    class="echoes-lc-column__select"
                    data-action="select-slot"
                    data-slot-id="${slot.id}"
                    title="${escapeAttribute('Select column')}"
                ></div>
                <div class="echoes-lc-column__skills">
                    ${renderLcSkillSlot(topSkill, slot, 'top', battle, deps)}
                    ${renderLcSkillSlot(bottomSkill, slot, 'bottom', battle, deps)}
                </div>
                <button
                    class="echoes-lc-portrait"
                    type="button"
                    data-action="toggle-defense-mode"
                    data-slot-id="${slot.id}"
                    title="${escapeAttribute(`${unit.name} — click for defense skill`)}"
                    ${battle.phase !== 'select' ? 'disabled' : ''}
                >
                    <span class="echoes-lc-portrait__speed">${slot.speed}</span>
                    <span class="echoes-lc-portrait__art" style="${portraitStyle}"></span>
                    <span class="echoes-lc-portrait__hp">${unit.hp}</span>
                    <span class="echoes-lc-portrait__sp">${unit.sp}</span>
                    <span class="echoes-lc-portrait__name">${slotLabel}</span>
                </button>
            </div>
        `;
    }

    function renderLcDashboard(battle, uiState, deps) {
        const {
            escapeHtml,
            getPhaseLabel,
            getResolvedBattle,
            renderResolutionFeed,
            renderQueueTrack,
            renderDebugRollControls,
        } = deps;

        const sortedSlots = sortDashboardSlots(battle, battle.playerSlots || []);
        const columns = sortedSlots
            .slice(0, LC_MAX_COLUMNS)
            .map((slot) => renderLcColumn(battle, slot, deps));

        while (columns.length < LC_MAX_COLUMNS) {
            columns.push(`<div class="echoes-lc-column echoes-lc-column--empty"></div>`);
        }

        const resolvedBattle = getResolvedBattle(battle, uiState);
        const debugToolsEnabled = uiState?.debugToolsEnabled !== false;

        return `
            <section class="echoes-battle-panel__combat-planner echoes-lc-dashboard">
                <div class="echoes-lc-dashboard__main">
                    <div class="echoes-lc-dashboard__columns">
                        ${columns.join('')}
                    </div>
                </div>
                <aside class="echoes-lc-dashboard__sidebar">
                    ${uiState?.debugPatchMessage ? `<p class="echoes-lc-dashboard__notice">${escapeHtml(uiState.debugPatchMessage)}</p>` : ''}
                    <div class="echoes-lc-dashboard__phase">
                        <span>Resolution</span>
                        <strong>${uiState?.isPlaybackRunning ? 'Playing Back' : getPhaseLabel(resolvedBattle)}</strong>
                    </div>
                    <div class="echoes-battle-panel__queue-track">
                        ${renderQueueTrack(battle, uiState)}
                    </div>
                    <div class="echoes-battle-panel__resolution-feed">
                        ${renderResolutionFeed(battle, uiState)}
                    </div>
                    ${debugToolsEnabled ? `
                        <details class="echoes-lc-dashboard__debug">
                            <summary>Debug rolls</summary>
                            <div class="echoes-battle-panel__debug-roll-grid">
                                ${renderDebugRollControls(battle, uiState)}
                            </div>
                        </details>
                    ` : ''}
                </aside>
            </section>
        `;
    }

    function renderLcClashStage(battle, uiState, deps) {
        const playback = uiState?.playback;
        if (!playback?.isRunning || !playback.entry) {
            return '';
        }
        const entry = playback.entry;
        if (entry.engagementType !== 'clash') {
            return '';
        }

        const {
            escapeHtml,
            escapeAttribute,
            getSlotById,
            getUnitById,
            getSkillById,
            resolveAssetUrl,
            renderPlaybackCoinTrack,
            getPlaybackValueState,
        } = deps;

        const leftSlot = getSlotById(battle, entry.leftSlotId);
        const rightSlot = getSlotById(battle, entry.rightSlotId);
        if (!leftSlot || !rightSlot) {
            return '';
        }
        const leftUnit = getUnitById(battle, leftSlot.unitId);
        const rightUnit = getUnitById(battle, rightSlot.unitId);
        const leftSkill = entry.leftSkillId ? getSkillById(leftUnit, entry.leftSkillId) : null;
        const rightSkill = entry.rightSkillId ? getSkillById(rightUnit, entry.rightSkillId) : null;
        const valueState = getPlaybackValueState(playback, entry);
        const leftPower = valueState?.leftValue ?? entry.leftDisplayPower ?? 0;
        const rightPower = valueState?.rightValue ?? entry.rightDisplayPower ?? 0;

        return `
            <div class="echoes-lc-clash-stage">
                <div class="echoes-lc-clash-stage__banner echoes-lc-clash-stage__banner--left">
                    <span class="echoes-lc-clash-stage__skill-name">${escapeHtml(entry.leftSkillName || leftSkill?.name || '')}</span>
                    <div class="echoes-lc-clash-stage__coins">
                        ${renderPlaybackCoinTrack(leftSkill, 'left', playback, entry)}
                    </div>
                </div>
                <div class="echoes-lc-clash-stage__center">
                    <div class="echoes-lc-clash-stage__power echoes-lc-clash-stage__power--left">
                        <span class="echoes-lc-clash-stage__power-label">Clash</span>
                        <strong>${leftPower}</strong>
                        ${leftSkill?.damageType ? `<small>${escapeHtml(leftSkill.damageType)}</small>` : ''}
                    </div>
                    <div class="echoes-lc-clash-stage__vs">VS</div>
                    <div class="echoes-lc-clash-stage__power echoes-lc-clash-stage__power--right">
                        <span class="echoes-lc-clash-stage__power-label">Clash</span>
                        <strong>${rightPower}</strong>
                        ${rightSkill?.damageType ? `<small>${escapeHtml(rightSkill.damageType)}</small>` : ''}
                    </div>
                </div>
                <div class="echoes-lc-clash-stage__banner echoes-lc-clash-stage__banner--right">
                    <span class="echoes-lc-clash-stage__skill-name">${escapeHtml(entry.rightSkillName || rightSkill?.name || '')}</span>
                    <div class="echoes-lc-clash-stage__coins">
                        ${renderPlaybackCoinTrack(rightSkill, 'right', playback, entry)}
                    </div>
                </div>
            </div>
        `;
    }

    const lcCombatUi = {
        LC_MAX_COLUMNS,
        SIN_COLORS,
        getUnitPortraitUrl,
        sortDashboardSlots,
        renderLcDashboard,
        renderLcClashStage,
    };

    battleModules.lcCombatUi = lcCombatUi;
    window.EchoesOfTheCityLcCombatUi = lcCombatUi;
})();
