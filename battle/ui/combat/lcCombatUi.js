(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const LC_MAX_COLUMNS = 12;
    const SIN_TYPES = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
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

    function getSinResourceCount(battle, sinType) {
        const resources = battle?.encounterResources;
        if (!resources || typeof resources !== 'object') {
            return 0;
        }
        const scoped = resources[`player:${sinType}`];
        if (Number.isFinite(scoped)) {
            return scoped;
        }
        const direct = resources[sinType];
        return Number.isFinite(direct) ? direct : 0;
    }

    function renderLcSinResourceRail(battle, escapeHtml) {
        const entries = SIN_TYPES.map((sinType) => {
            const count = getSinResourceCount(battle, sinType);
            const color = SIN_COLORS[sinType] || '#888';
            return `
                <div class="echoes-lc-sin-rail__entry" style="--echoes-lc-sin-color:${color}">
                    <span class="echoes-lc-sin-rail__droplet" aria-hidden="true"></span>
                    <span class="echoes-lc-sin-rail__count">${escapeHtml(String(count))}</span>
                </div>
            `;
        }).join('');

        return `
            <aside class="echoes-lc-sin-rail echoes-lc-sin-rail--field" aria-label="Sin resources">
                ${entries}
            </aside>
        `;
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
                <div class="echoes-lc-skill-slot echoes-lc-skill-slot--empty echoes-lc-hex" data-offer-slot="${offerKey}">
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
                class="echoes-lc-skill-slot echoes-lc-hex${isSelected ? ' is-selected' : ''}${isDefenseSkill(skill) ? ' is-defense' : ''}"
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

    function getSelectedSkillSinColor(slot, battle, deps) {
        const { getUnitById, getSkillById } = deps;
        if (!slot?.selectedSkillId || !slot.selectedOfferSlot) {
            return null;
        }
        const unit = getUnitById(battle, slot.unitId);
        if (!unit) {
            return null;
        }
        const skill = getSkillById(unit, slot.selectedSkillId);
        if (!skill?.sinType) {
            return null;
        }
        return SIN_COLORS[skill.sinType] || null;
    }

    function renderSinChainSvg(slots, battle, deps) {
        if (!slots.length) {
            return '';
        }
        const paths = [];
        for (let index = 0; index < slots.length - 1; index += 1) {
            const leftSlot = slots[index];
            const rightSlot = slots[index + 1];
            const leftColor = getSelectedSkillSinColor(leftSlot, battle, deps);
            const rightColor = getSelectedSkillSinColor(rightSlot, battle, deps);
            if (!leftColor || !rightColor) {
                continue;
            }
            const leftX = ((index + 0.5) / LC_MAX_COLUMNS) * 100;
            const rightX = ((index + 1.5) / LC_MAX_COLUMNS) * 100;
            const midY = 50;
            paths.push(`
                <path
                    class="echoes-lc-sin-chain__segment"
                    d="M ${leftX} ${midY} L ${rightX} ${midY}"
                    style="--echoes-lc-sin-color-left:${leftColor};--echoes-lc-sin-color-right:${rightColor};"
                ></path>
            `);
        }
        if (!paths.length) {
            return '';
        }
        return `
            <svg class="echoes-lc-sin-chain" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                ${paths.join('')}
            </svg>
        `;
    }

    function renderLcGridCell(battle, slot, offerKey, deps) {
        const {
            escapeAttribute,
            getUnitById,
            getSkillById,
        } = deps;
        if (!slot) {
            return `<div class="echoes-lc-grid-cell echoes-lc-grid-cell--empty"></div>`;
        }
        const unit = getUnitById(battle, slot.unitId);
        if (!unit) {
            return `<div class="echoes-lc-grid-cell echoes-lc-grid-cell--empty"></div>`;
        }
        const offer = slot.skillOffer || { top: null, bottom: null };
        const skillId = offerKey === 'top' ? offer.top : offer.bottom;
        const skill = skillId ? getSkillById(unit, skillId) : null;
        const isActive = battle.activePlayerSlotId === slot.id;
        const isResolved = slot.resolved;

        return `
            <div
                class="echoes-lc-grid-cell${isActive ? ' is-active' : ''}${isResolved ? ' is-resolved' : ''}${slot.defenseMode ? ' is-defense-mode' : ''}"
                data-slot-id="${slot.id}"
            >
                <div
                    class="echoes-lc-column__select"
                    data-action="select-slot"
                    data-slot-id="${slot.id}"
                    title="${escapeAttribute('Select column')}"
                ></div>
                ${renderLcSkillSlot(skill, slot, offerKey, battle, deps)}
            </div>
        `;
    }

    function renderLcPortraitCell(battle, slot, deps) {
        const {
            escapeAttribute,
            escapeHtml,
            resolveAssetUrl,
            getUnitById,
        } = deps;
        if (!slot) {
            return `<div class="echoes-lc-portrait-cell echoes-lc-portrait-cell--empty"></div>`;
        }
        const unit = getUnitById(battle, slot.unitId);
        if (!unit) {
            return `<div class="echoes-lc-portrait-cell echoes-lc-portrait-cell--empty"></div>`;
        }
        const portraitUrl = getUnitPortraitUrl(unit, resolveAssetUrl);
        const isActive = battle.activePlayerSlotId === slot.id;
        const isResolved = slot.resolved;
        const portraitStyle = portraitUrl ? `background-image:url('${escapeAttribute(portraitUrl)}');` : '';
        const slotLabel = Number.isInteger(slot.skillSlotIndex) && slot.skillSlotIndex > 0
            ? `${escapeHtml(unit.name)} #${slot.skillSlotIndex + 1}`
            : escapeHtml(unit.name);

        return `
            <div
                class="echoes-lc-portrait-cell${isActive ? ' is-active' : ''}${isResolved ? ' is-resolved' : ''}${slot.defenseMode ? ' is-defense-mode' : ''}"
                data-slot-id="${slot.id}"
            >
                <button
                    class="echoes-lc-portrait echoes-lc-hex"
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

    function padSlotArray(slots, maxColumns) {
        const padded = slots.slice(0, maxColumns);
        while (padded.length < maxColumns) {
            padded.push(null);
        }
        return padded;
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
        const displaySlots = padSlotArray(sortedSlots, LC_MAX_COLUMNS);
        const activeSlots = sortedSlots.slice(0, LC_MAX_COLUMNS);

        const topRow = displaySlots.map((slot) => renderLcGridCell(battle, slot, 'top', deps)).join('');
        const bottomRow = displaySlots.map((slot) => renderLcGridCell(battle, slot, 'bottom', deps)).join('');
        const portraitRow = displaySlots.map((slot) => renderLcPortraitCell(battle, slot, deps)).join('');
        const sinChain = renderSinChainSvg(activeSlots, battle, deps);

        const resolvedBattle = getResolvedBattle(battle, uiState);
        const debugToolsEnabled = uiState?.debugToolsEnabled !== false;

        return `
            <section class="echoes-battle-panel__combat-planner echoes-lc-dashboard">
                <div class="echoes-lc-dashboard__main">
                    <div class="echoes-lc-stage-frame">
                        <div class="echoes-lc-stage-frame__gear echoes-lc-stage-frame__gear--left" aria-hidden="true"></div>
                        <div class="echoes-lc-stage-grid">
                            <div class="echoes-lc-skill-rows">
                                <div class="echoes-lc-skill-row echoes-lc-skill-row--top">
                                    ${topRow}
                                </div>
                                ${sinChain}
                                <div class="echoes-lc-skill-row echoes-lc-skill-row--bottom">
                                    ${bottomRow}
                                </div>
                            </div>
                            <div class="echoes-lc-portrait-row">
                                ${portraitRow}
                            </div>
                        </div>
                        <div class="echoes-lc-stage-frame__gear echoes-lc-stage-frame__gear--right" aria-hidden="true"></div>
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

    function shouldUseLcClashPlayback(playback) {
        return Boolean(
            playback?.isRunning
            && playback.entry?.engagementType === 'clash',
        );
    }

    function getClashPlaybackSubtitle(playback) {
        if (playback.phase === 'approach') {
            return 'Closing in';
        }
        if (playback.phase === 'skill-intro') {
            return 'Skill reveal';
        }
        if (playback.phase === 'round-reveal') {
            return `Clash ${playback.roundIndex + 1}`;
        }
        if (playback.phase === 'coin-break') {
            return 'Coin broken';
        }
        if (playback.phase === 'attack-hit') {
            return `Hit ${playback.hitIndex + 1}`;
        }
        return `Resolve ${playback.entryIndex + 1} / ${playback.totalEntries}`;
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
        const leftPortraitUrl = getUnitPortraitUrl(leftUnit, resolveAssetUrl);
        const rightPortraitUrl = getUnitPortraitUrl(rightUnit, resolveAssetUrl);
        const leftPortraitStyle = leftPortraitUrl
            ? `background-image:url('${escapeAttribute(leftPortraitUrl)}');`
            : '';
        const rightPortraitStyle = rightPortraitUrl
            ? `background-image:url('${escapeAttribute(rightPortraitUrl)}');`
            : '';
        const subtitle = getClashPlaybackSubtitle(playback);
        const showSkillNames = playback.phase === 'skill-intro';
        const roundRevealClass = playback.phase === 'round-reveal' ? ' is-round-reveal' : '';

        return `
            <div class="echoes-lc-clash-bar${roundRevealClass}">
                <div class="echoes-lc-clash-bar__side echoes-lc-clash-bar__side--left">
                    <div class="echoes-lc-clash-bar__portrait" style="${leftPortraitStyle}" title="${escapeAttribute(leftUnit?.name || '')}"></div>
                    <strong class="echoes-lc-clash-bar__power">${leftPower}</strong>
                    <div class="echoes-lc-clash-bar__coins echoes-battle-panel__playback-coins">
                        ${renderPlaybackCoinTrack(leftSkill, 'left', playback, entry)}
                    </div>
                    ${showSkillNames ? `<span class="echoes-lc-clash-bar__skill">${escapeHtml(entry.leftSkillName || leftSkill?.name || '')}</span>` : ''}
                </div>
                <div class="echoes-lc-clash-bar__center">
                    <span class="echoes-lc-clash-bar__title">CLASH</span>
                    <small class="echoes-lc-clash-bar__subtitle">${escapeHtml(subtitle)}</small>
                </div>
                <div class="echoes-lc-clash-bar__side echoes-lc-clash-bar__side--right">
                    <div class="echoes-lc-clash-bar__portrait" style="${rightPortraitStyle}" title="${escapeAttribute(rightUnit?.name || '')}"></div>
                    <strong class="echoes-lc-clash-bar__power">${rightPower}</strong>
                    <div class="echoes-lc-clash-bar__coins echoes-battle-panel__playback-coins">
                        ${renderPlaybackCoinTrack(rightSkill, 'right', playback, entry)}
                    </div>
                    ${showSkillNames ? `<span class="echoes-lc-clash-bar__skill">${escapeHtml(entry.rightSkillName || rightSkill?.name || '')}</span>` : ''}
                </div>
            </div>
        `;
    }

    const lcCombatUi = {
        LC_MAX_COLUMNS,
        SIN_TYPES,
        SIN_COLORS,
        getUnitPortraitUrl,
        getSinResourceCount,
        sortDashboardSlots,
        renderLcSinResourceRail,
        renderLcDashboard,
        renderLcClashStage,
        shouldUseLcClashPlayback,
    };

    battleModules.lcCombatUi = lcCombatUi;
    window.EchoesOfTheCityLcCombatUi = lcCombatUi;
})();
