(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const sinPalette = battleModules.sinColors || window.EchoesOfTheCitySinColors || {};
    const SIN_TYPES = sinPalette.SIN_TYPES || ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
    const SIN_COLORS = sinPalette.SIN_COLORS || {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#6eb8e8',
        pride: '#1e3a6e',
        envy: '#9b59b6',
    };

    const LC_MAX_COLUMNS = 12;

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

    const COIN_IMAGE_PATHS = {
        coin: 'assets/skillborders/Coin.png',
        heads: 'assets/skillborders/CoinHeads.png',
        tails: 'assets/skillborders/CoinTails.png',
    };

    function renderLcUnitVitals(unit, options = {}) {
        const {
            escapeHtml = (value) => String(value),
            variant = 'field',
        } = options;
        const maxHp = Math.max(1, Number(unit?.maxHp) || 1);
        const hp = Math.max(0, Number(unit?.hp) || 0);
        const sp = Number.isFinite(unit?.sp) ? unit.sp : 0;
        const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const thresholds = Array.isArray(unit?.staggerThresholds) ? unit.staggerThresholds : [];
        const thresholdIndex = Number.isInteger(unit?.staggerThresholdIndex) ? unit.staggerThresholdIndex : 0;

        const markers = thresholds.map((threshold, index) => {
            const position = Math.max(0, Math.min(100, (Number(threshold) / maxHp) * 100));
            const markerClass = index < thresholdIndex
                ? ' is-spent'
                : index === thresholdIndex
                    ? ' is-next'
                    : '';
            return `<span class="echoes-lc-vitals__threshold-marker${markerClass}" style="left:${position}%;" aria-hidden="true"></span>`;
        }).join('');

        return `
            <div class="echoes-lc-vitals echoes-lc-vitals--${escapeHtml(variant)}">
                <span class="echoes-lc-vitals__hp-value">${escapeHtml(String(hp))}</span>
                <div class="echoes-lc-vitals__hp-bar" aria-label="HP">
                    <span class="echoes-lc-vitals__hp-fill" style="width:${hpPercent}%;"></span>
                    ${markers}
                </div>
                <span class="echoes-lc-vitals__sp-badge" aria-label="Sanity">${escapeHtml(String(sp))}</span>
            </div>
        `;
    }

    function applyPlaybackHitVitals(entry, hitIndex, displayBattle, resolvedBattle, getAttackingSideFn) {
        if (!entry || !displayBattle || !resolvedBattle) {
            return null;
        }
        const hit = Array.isArray(entry.hits) ? entry.hits[hitIndex] : null;
        if (!hit) {
            return null;
        }

        const attackingSide = typeof getAttackingSideFn === 'function'
            ? getAttackingSideFn(entry)
            : (entry.engagementType === 'clash' ? entry.winnerSide : (entry.leftSkillId ? 'left' : 'right'));
        const defenderSlotId = attackingSide === 'left' ? entry.rightSlotId : entry.leftSlotId;
        const attackerSlotId = attackingSide === 'left' ? entry.leftSlotId : entry.rightSlotId;
        const allSlots = [...(displayBattle.playerSlots || []), ...(displayBattle.enemySlots || [])];
        const defenderSlot = allSlots.find((slot) => slot?.id === defenderSlotId);
        const attackerSlot = allSlots.find((slot) => slot?.id === attackerSlotId);
        const findUnit = (battle, unitId) => {
            if (!unitId) {
                return null;
            }
            return [...(battle.playerUnits || []), ...(battle.enemyUnits || [])].find((unit) => unit?.id === unitId) || null;
        };

        const displayDefender = findUnit(displayBattle, defenderSlot?.unitId);
        const resolvedDefender = findUnit(resolvedBattle, defenderSlot?.unitId);
        const displayAttacker = findUnit(displayBattle, attackerSlot?.unitId);
        const resolvedAttacker = findUnit(resolvedBattle, attackerSlot?.unitId);
        const previousHp = displayDefender?.hp ?? 0;

        if (displayDefender && Number.isFinite(hit.targetHp)) {
            displayDefender.hp = hit.targetHp;
        }
        if (displayDefender && resolvedDefender) {
            displayDefender.staggerTurnsRemaining = resolvedDefender.staggerTurnsRemaining;
            displayDefender.staggerLevel = resolvedDefender.staggerLevel;
            displayDefender.staggerThresholdIndex = resolvedDefender.staggerThresholdIndex;
            displayDefender.sp = resolvedDefender.sp;
        }
        if (displayAttacker && resolvedAttacker) {
            displayAttacker.sp = resolvedAttacker.sp;
        }

        return {
            previousHp,
            displayDefender,
            resolvedDefender,
            targetHp: hit.targetHp,
        };
    }

    function didCrossStaggerThreshold(unit, previousHp, nextHp) {
        if (!unit || !Number.isFinite(previousHp) || !Number.isFinite(nextHp)) {
            return false;
        }
        const thresholds = Array.isArray(unit.staggerThresholds) ? unit.staggerThresholds : [];
        return thresholds.some((threshold) => {
            const value = Number(threshold);
            return Number.isFinite(value) && previousHp > value && nextHp <= value;
        });
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
                    ${renderLcUnitVitals(unit, { escapeHtml, variant: 'portrait' })}
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
        return shouldUseLcEngagementPlayback(playback);
    }

    function shouldUseLcEngagementPlayback(playback) {
        return Boolean(playback?.isRunning && playback.entry);
    }

    function getEngagementPlaybackSubtitle(playback, entry) {
        if (playback.phase === 'approach') {
            return 'Closing in';
        }
        if (playback.phase === 'skill-intro') {
            return 'Skill reveal';
        }
        if (playback.phase === 'round-reveal') {
            if (entry?.engagementType === 'clash') {
                return `Clash ${playback.roundIndex + 1}`;
            }
            return `Defense ${playback.roundIndex + 1}`;
        }
        if (playback.phase === 'coin-break') {
            return 'Coin broken';
        }
        if (playback.phase === 'attack-hit') {
            return `Hit ${playback.hitIndex + 1}`;
        }
        return `Resolve ${playback.entryIndex + 1} / ${playback.totalEntries}`;
    }

    function normalizeCoinFlips(flips) {
        if (Array.isArray(flips)) {
            return flips;
        }
        if (typeof flips === 'string' && flips.trim()) {
            return flips
                .trim()
                .split(/\s+/)
                .filter(Boolean)
                .map((token) => token === 'H');
        }
        return [];
    }

    function computeRunningPower(skill, flips, revealedCount, finalPower) {
        if (!skill) {
            return 0;
        }
        const flipList = normalizeCoinFlips(flips);
        let power = skill.basePower || 0;
        const coinPower = skill.coinPower || 0;
        const count = Math.max(0, Math.min(revealedCount, flipList.length));
        for (let index = 0; index < count; index += 1) {
            if (flipList[index]) {
                power += coinPower;
            }
        }
        if (flipList.length > 0 && revealedCount >= flipList.length && Number.isFinite(finalPower)) {
            return finalPower;
        }
        return power;
    }

    function getPlaybackAttackingSide(entry) {
        if (!entry) {
            return null;
        }
        if (entry.engagementType === 'clash') {
            return entry.winnerSide;
        }
        return entry.leftSkillId ? 'left' : 'right';
    }

    function getBillboardFlipsForSide(entry, playback, side) {
        if (!entry || !playback) {
            return [];
        }
        if (playback.phase === 'round-reveal' || playback.phase === 'coin-break') {
            const round = entry.rounds?.[playback.roundIndex];
            if (!round) {
                return [];
            }
            return normalizeCoinFlips(side === 'left' ? round.leftFlips : round.rightFlips);
        }
        if (playback.phase === 'attack-hit') {
            const attackingSide = getPlaybackAttackingSide(entry);
            if (attackingSide !== side) {
                return [];
            }
            return (entry.hits || []).map((hit) => Boolean(hit?.isHeads));
        }
        return [];
    }

    function getBillboardFinalPowerForSide(entry, playback, side) {
        if (!entry || !playback) {
            return null;
        }
        if (playback.phase === 'round-reveal' || playback.phase === 'coin-break') {
            const round = entry.rounds?.[playback.roundIndex];
            if (!round) {
                return null;
            }
            return side === 'left' ? round.leftPower : round.rightPower;
        }
        if (playback.phase === 'attack-hit') {
            const attackingSide = getPlaybackAttackingSide(entry);
            const hit = entry.hits?.[playback.hitIndex];
            if (!hit) {
                return null;
            }
            if (attackingSide === 'left') {
                return side === 'left' ? hit.finalPower : hit.damage;
            }
            return side === 'right' ? hit.finalPower : hit.damage;
        }
        return null;
    }

    function getBillboardRevealedFlipCount(playback, flips) {
        const flipList = normalizeCoinFlips(flips);
        if (!playback || flipList.length === 0) {
            return 0;
        }
        const coinRevealIndex = Number.isFinite(playback.coinRevealIndex) ? playback.coinRevealIndex : -1;
        if (playback.phase === 'round-reveal' || playback.phase === 'attack-hit') {
            if (coinRevealIndex < 0) {
                return 0;
            }
            return Math.min(coinRevealIndex + 1, flipList.length);
        }
        if (playback.phase === 'coin-break') {
            return flipList.length;
        }
        return 0;
    }

    function getBillboardPower(skill, playback, entry, side) {
        if (!skill) {
            return 0;
        }
        const flips = getBillboardFlipsForSide(entry, playback, side);
        const revealedCount = getBillboardRevealedFlipCount(playback, flips);
        const finalPower = getBillboardFinalPowerForSide(entry, playback, side);
        if (flips.length === 0) {
            if (Number.isFinite(finalPower)) {
                return finalPower;
            }
            return skill.basePower || 0;
        }
        return computeRunningPower(skill, flips, revealedCount, finalPower);
    }

    function getBillboardCoinStates(skill, playback, entry, side) {
        if (!skill) {
            return [];
        }
        const totalCoins = skill.coinCount || 0;
        const brokenCoins = side === 'left' ? playback.leftBroken : playback.rightBroken;
        const remainingCoins = Math.max(0, totalCoins - brokenCoins);
        const states = [];
        for (let index = 0; index < totalCoins; index += 1) {
            states.push(index >= remainingCoins ? 'broken' : 'pending');
        }

        const flips = getBillboardFlipsForSide(entry, playback, side);
        const coinRevealIndex = Number.isFinite(playback.coinRevealIndex) ? playback.coinRevealIndex : -1;
        const phase = playback.phase;
        const attackingSide = getPlaybackAttackingSide(entry);
        const isAttackingSide = attackingSide === side;

        if (phase === 'round-reveal' || phase === 'coin-break') {
            for (let index = 0; index < flips.length; index += 1) {
                if (states[index] === 'broken') {
                    continue;
                }
                if (phase === 'coin-break' || coinRevealIndex >= flips.length - 1) {
                    states[index] = flips[index] ? 'heads' : 'tails';
                } else if (coinRevealIndex < 0) {
                    states[index] = 'pending';
                } else if (index > coinRevealIndex) {
                    states[index] = 'pending';
                } else if (index === coinRevealIndex) {
                    states[index] = 'flipping';
                } else {
                    states[index] = flips[index] ? 'heads' : 'tails';
                }
            }
        }

        if (phase === 'attack-hit' && isAttackingSide) {
            for (let index = 0; index < playback.hitIndex; index += 1) {
                if (states[index] !== 'broken') {
                    states[index] = 'spent';
                }
            }
            for (let index = 0; index < flips.length; index += 1) {
                if (states[index] === 'broken') {
                    continue;
                }
                if (index < playback.hitIndex) {
                    states[index] = flips[index] ? 'heads' : 'tails';
                } else if (index === playback.hitIndex) {
                    if (coinRevealIndex < playback.hitIndex) {
                        states[index] = 'pending';
                    } else if (coinRevealIndex === playback.hitIndex) {
                        states[index] = 'flipping';
                    } else {
                        states[index] = flips[index] ? 'heads' : 'tails';
                    }
                }
            }
        }

        return states;
    }

    function renderBillboardCoinTrack(states, resolveAssetUrl) {
        const coinUrl = resolveAssetUrl ? resolveAssetUrl(COIN_IMAGE_PATHS.coin) : COIN_IMAGE_PATHS.coin;
        const headsUrl = resolveAssetUrl ? resolveAssetUrl(COIN_IMAGE_PATHS.heads) : COIN_IMAGE_PATHS.heads;
        const tailsUrl = resolveAssetUrl ? resolveAssetUrl(COIN_IMAGE_PATHS.tails) : COIN_IMAGE_PATHS.tails;

        return states.map((state, index) => {
            if (state === 'broken') {
                return '';
            }
            const stateClass = state === 'flipping' ? 'flipping' : state;
            let imageUrl = coinUrl;
            if (state === 'heads') {
                imageUrl = headsUrl;
            } else if (state === 'tails') {
                imageUrl = tailsUrl;
            }
            return `
                <span
                    class="echoes-battle-panel__playback-coin is-${stateClass}"
                    style="background-image:url('${String(imageUrl).replace(/'/g, '%27')}');"
                    aria-hidden="true"
                ></span>
            `;
        }).join('');
    }

    function renderLcEngagementBillboard(side, skill, skillLabel, position, playback, entry, deps) {
        const { escapeHtml, getBillboardPowerForSide, renderBillboardCoinsForSide } = deps;
        const isEmpty = !skill;
        const sinColor = skill?.sinType ? SIN_COLORS[skill.sinType] || '#888' : '#555';
        const horizontalOffset = side === 'left' ? -4 : 4;
        const left = Math.max(6, Math.min(94, position.x + horizontalOffset));
        const top = Math.max(12, position.y - 30);
        const power = skill ? getBillboardPowerForSide(side, playback, entry, skill) : 0;
        const bumpClass = (
            (playback.phase === 'round-reveal' || playback.phase === 'attack-hit')
            && Number.isFinite(playback.coinRevealIndex)
            && playback.coinRevealIndex >= 0
        ) ? ' is-bump' : '';
        const headerLabel = skillLabel || skill?.name || '—';

        return `
            <div
                class="echoes-lc-engagement-billboard echoes-lc-engagement-billboard--${side}${isEmpty ? ' is-empty' : ''}"
                style="left: ${left}%; top: ${top}%; --echoes-lc-sin-color: ${sinColor};"
            >
                <div class="echoes-lc-engagement-billboard__header">
                    <span class="echoes-lc-engagement-billboard__header-accent" aria-hidden="true"></span>
                    <span class="echoes-lc-engagement-billboard__header-text">${escapeHtml(headerLabel)}</span>
                </div>
                <div class="echoes-lc-engagement-billboard__body">
                    <strong class="echoes-lc-engagement-billboard__power${bumpClass}">${power}</strong>
                    <div class="echoes-lc-engagement-billboard__coins echoes-battle-panel__playback-coins">
                        ${skill ? renderBillboardCoinsForSide(side, playback, entry, skill) : ''}
                    </div>
                </div>
            </div>
        `;
    }

    function renderLcEngagementCenter(leftPosition, rightPosition, barTitle, subtitle, escapeHtml) {
        const centerX = (leftPosition.x + rightPosition.x) / 2;
        const centerY = Math.min(leftPosition.y, rightPosition.y) - 38;
        return `
            <div
                class="echoes-lc-engagement-center"
                style="left: ${centerX}%; top: ${Math.max(8, centerY)}%;"
            >
                <span class="echoes-lc-engagement-center__title">${escapeHtml(barTitle)}</span>
                <small class="echoes-lc-engagement-center__subtitle">${escapeHtml(subtitle)}</small>
            </div>
        `;
    }

    function renderLcEngagementBillboards(battle, uiState, deps) {
        const playback = uiState?.playback;
        if (!playback?.isRunning || !playback.entry) {
            return '';
        }
        const entry = playback.entry;
        const combatSoundsModule = battleModules.combatSounds || window.EchoesOfTheCityCombatSounds || null;
        const {
            escapeHtml,
            getSlotById,
            getUnitById,
            getSkillById,
            leftPosition,
            rightPosition,
            getBillboardPowerForSide,
            renderBillboardCoinsForSide,
        } = deps;

        if (!leftPosition || !rightPosition) {
            return '';
        }

        const leftSlot = getSlotById(battle, entry.leftSlotId);
        const rightSlot = getSlotById(battle, entry.rightSlotId);
        if (!leftSlot || !rightSlot) {
            return '';
        }
        const leftUnit = getUnitById(battle, leftSlot.unitId);
        const rightUnit = getUnitById(battle, rightSlot.unitId);
        const leftSkill = entry.leftSkillId ? getSkillById(leftUnit, entry.leftSkillId) : null;
        const rightSkill = entry.rightSkillId ? getSkillById(rightUnit, entry.rightSkillId) : null;
        const subtitle = getEngagementPlaybackSubtitle(playback, entry);
        const barTitle = combatSoundsModule?.getEngagementBarTitle
            ? combatSoundsModule.getEngagementBarTitle(entry)
            : (entry.engagementType === 'clash' ? 'CLASH' : entry.engagementType === 'one-sided' ? 'ATTACK' : 'DEFENSE');

        const billboardDeps = {
            escapeHtml,
            getBillboardPowerForSide,
            renderBillboardCoinsForSide,
        };

        return `
            ${renderLcEngagementBillboard('left', leftSkill, entry.leftSkillName, leftPosition, playback, entry, billboardDeps)}
            ${renderLcEngagementBillboard('right', rightSkill, entry.rightSkillName, rightPosition, playback, entry, billboardDeps)}
            ${renderLcEngagementCenter(leftPosition, rightPosition, barTitle, subtitle, escapeHtml)}
        `;
    }

    function renderLcEngagementBar(battle, uiState, deps) {
        if (deps?.leftPosition && deps?.rightPosition) {
            return renderLcEngagementBillboards(battle, uiState, deps);
        }
        const playback = uiState?.playback;
        if (!playback?.isRunning || !playback.entry) {
            return '';
        }
        const entry = playback.entry;
        const combatSoundsModule = battleModules.combatSounds || window.EchoesOfTheCityCombatSounds || null;

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
        const subtitle = getEngagementPlaybackSubtitle(playback, entry);
        const showSkillNames = playback.phase === 'skill-intro';
        const roundRevealClass = playback.phase === 'round-reveal' ? ' is-round-reveal' : '';
        const barTitle = combatSoundsModule?.getEngagementBarTitle
            ? combatSoundsModule.getEngagementBarTitle(entry)
            : (entry.engagementType === 'clash' ? 'CLASH' : entry.engagementType === 'one-sided' ? 'ATTACK' : 'DEFENSE');

        return `
            <div class="echoes-lc-engagement-bar echoes-lc-clash-bar${roundRevealClass}">
                <div class="echoes-lc-engagement-bar__side echoes-lc-engagement-bar__side--left">
                    <div class="echoes-lc-engagement-bar__portrait echoes-lc-clash-bar__portrait" style="${leftPortraitStyle}" title="${escapeAttribute(leftUnit?.name || '')}"></div>
                    <strong class="echoes-lc-engagement-bar__power echoes-lc-clash-bar__power">${leftPower}</strong>
                    <div class="echoes-lc-engagement-bar__coins echoes-lc-clash-bar__coins echoes-battle-panel__playback-coins">
                        ${renderPlaybackCoinTrack(leftSkill, 'left', playback, entry)}
                    </div>
                    ${showSkillNames ? `<span class="echoes-lc-engagement-bar__skill echoes-lc-clash-bar__skill">${escapeHtml(entry.leftSkillName || leftSkill?.name || '')}</span>` : ''}
                </div>
                <div class="echoes-lc-engagement-bar__center echoes-lc-clash-bar__center">
                    <span class="echoes-lc-engagement-bar__title echoes-lc-clash-bar__title">${escapeHtml(barTitle)}</span>
                    <small class="echoes-lc-engagement-bar__subtitle echoes-lc-clash-bar__subtitle">${escapeHtml(subtitle)}</small>
                </div>
                <div class="echoes-lc-engagement-bar__side echoes-lc-engagement-bar__side--right">
                    <div class="echoes-lc-engagement-bar__portrait echoes-lc-clash-bar__portrait" style="${rightPortraitStyle}" title="${escapeAttribute(rightUnit?.name || '')}"></div>
                    <strong class="echoes-lc-engagement-bar__power echoes-lc-clash-bar__power">${rightPower}</strong>
                    <div class="echoes-lc-engagement-bar__coins echoes-lc-clash-bar__coins echoes-battle-panel__playback-coins">
                        ${renderPlaybackCoinTrack(rightSkill, 'right', playback, entry)}
                    </div>
                    ${showSkillNames ? `<span class="echoes-lc-engagement-bar__skill echoes-lc-clash-bar__skill">${escapeHtml(entry.rightSkillName || rightSkill?.name || '')}</span>` : ''}
                </div>
            </div>
        `;
    }

    function renderLcClashStage(battle, uiState, deps) {
        return renderLcEngagementBillboards(battle, uiState, deps) || renderLcEngagementBar(battle, uiState, deps);
    }

    const lcCombatUi = {
        LC_MAX_COLUMNS,
        SIN_TYPES,
        SIN_COLORS,
        COIN_IMAGE_PATHS,
        getUnitPortraitUrl,
        renderLcUnitVitals,
        applyPlaybackHitVitals,
        didCrossStaggerThreshold,
        getSinResourceCount,
        sortDashboardSlots,
        renderLcSinResourceRail,
        renderLcDashboard,
        normalizeCoinFlips,
        computeRunningPower,
        getBillboardCoinStates,
        getBillboardPower,
        renderBillboardCoinTrack,
        renderLcEngagementBillboards,
        renderLcEngagementBar,
        renderLcClashStage,
        shouldUseLcClashPlayback,
        shouldUseLcEngagementPlayback,
        getEngagementPlaybackSubtitle,
    };

    battleModules.lcCombatUi = lcCombatUi;
    window.EchoesOfTheCityLcCombatUi = lcCombatUi;
})();
