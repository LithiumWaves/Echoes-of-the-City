(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    battleModules.createDebugBattleRenderer = function createDebugBattleRenderer(options) {
        const { mountElement, resolveAssetUrl } = options;
        const keywordStatusIconPaths = {
            bleed: 'assets/statuseffects/keywordstatus/Bleed.png',
            burn: 'assets/statuseffects/keywordstatus/Burn.png',
            charge: 'assets/statuseffects/keywordstatus/Charge.png',
            poise: 'assets/statuseffects/keywordstatus/Poise.png',
            rupture: 'assets/statuseffects/keywordstatus/Rupture.png',
            sinking: 'assets/statuseffects/keywordstatus/Sinking.png',
            tremor: 'assets/statuseffects/keywordstatus/Tremor.png',
        };
        const countOnlyStatuses = new Set([
            'protection',
            'paralyze',
            'plus_coin_boost',
            'plus_coin_drop',
            'minus_coin_boost',
            'minus_coin_drop',
        ]);

        function getAllUnits(battle) {
            return [...battle.playerUnits, ...battle.enemyUnits];
        }

        function getAllSlots(battle) {
            return [...battle.playerSlots, ...battle.enemySlots];
        }

        function getSlotsForSide(battle, side) {
            return side === 'enemy' ? battle.enemySlots : battle.playerSlots;
        }

        function getUnitById(battle, unitId) {
            return getAllUnits(battle).find((unit) => unit.id === unitId) || null;
        }

        function getSlotById(battle, slotId) {
            return getAllSlots(battle).find((slot) => slot.id === slotId) || null;
        }

        function getSkillById(unit, skillId) {
            return unit.skills.find((skill) => skill.id === skillId) || null;
        }

        function getActivePlayerSlot(battle) {
            return getSlotById(battle, battle.activePlayerSlotId) || battle.playerSlots[0] || null;
        }

        function formatResistanceValue(value) {
            return `x${value.toFixed(2).replace(/\.00$/, '')}`;
        }

        function getPhaseLabel(battle) {
            if (battle.winner === 'player') {
                return 'Victory';
            }
            if (battle.winner === 'enemy') {
                return 'Defeat';
            }
            if (battle.winner === 'draw') {
                return 'Draw';
            }
            if (battle.phase === 'resolved') {
                return 'Turn Resolved';
            }
            return 'Assignment';
        }

        function getSkillPowerLabel(skill) {
            return `Base ${skill.basePower} | Coin ${skill.coinPower >= 0 ? '+' : ''}${skill.coinPower} | ${skill.coinCount} Coins`;
        }

        function getCompactSkillPowerLabel(skill) {
            return `${skill.basePower} ${skill.coinPower >= 0 ? '+' : ''}${skill.coinPower} (${skill.coinCount} Coins)`;
        }

        function escapeAttribute(value) {
            return String(value)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        }

        function getSkillOffenseLevel(unit, skill) {
            return Math.max(1, unit.level + (skill.offenseLevel || 0));
        }

        function getDefenseLevel(unit) {
            return Math.max(1, unit.defenseLevel || unit.level);
        }

        function getStatusLabel(statusId) {
            const labels = {
                bleed: 'Bleed',
                burn: 'Burn',
                protection: 'Protection',
                charge: 'Charge',
                paralyze: 'Paralyze',
                poise: 'Poise',
                plus_coin_boost: 'Plus Coin Boost',
                plus_coin_drop: 'Plus Coin Drop',
                minus_coin_boost: 'Minus Coin Boost',
                minus_coin_drop: 'Minus Coin Drop',
                rupture: 'Rupture',
                sinking: 'Sinking',
                tremor: 'Tremor',
            };

            return labels[statusId] || statusId;
        }

        function getRenderableStatuses(unit) {
            const statuses = Array.isArray(unit.statuses) ? unit.statuses : [];
            return statuses.filter((status) => {
                if (!status?.id) {
                    return false;
                }

                if (countOnlyStatuses.has(status.id)) {
                    return (status.count || 0) > 0;
                }

                return (status.potency || 0) > 0 || (status.count || 0) > 0;
            });
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

        function renderClashRound(presentation, round, index) {
            if (round.result === 'left-speed-break' || round.result === 'right-speed-break') {
                const winnerLabel = round.result === 'left-speed-break' ? presentation.leftUnitName : presentation.rightUnitName;
                return `
                    <div class="echoes-battle-panel__combat-round echoes-battle-panel__combat-round--speed-break">
                        <span class="echoes-battle-panel__combat-round-index">Tie Break</span>
                        <div class="echoes-battle-panel__combat-round-summary">${winnerLabel} breaks the repeated tie with Speed.</div>
                    </div>
                `;
            }

            const resultLabel = round.result === 'tie'
                ? 'Tie'
                : round.result === 'left-win'
                    ? `${presentation.leftUnitName} wins`
                    : `${presentation.rightUnitName} wins`;

            return `
                <div class="echoes-battle-panel__combat-round">
                    <span class="echoes-battle-panel__combat-round-index">Clash ${index + 1}</span>
                    <div class="echoes-battle-panel__combat-round-side echoes-battle-panel__combat-round-side--hero">
                        <div class="echoes-battle-panel__combat-round-power">${round.leftPower}</div>
                        <div class="echoes-battle-panel__combat-round-coins">${renderCoinTrack(round.leftFlips, 'hero')}</div>
                    </div>
                    <div class="echoes-battle-panel__combat-round-versus">${resultLabel}</div>
                    <div class="echoes-battle-panel__combat-round-side echoes-battle-panel__combat-round-side--enemy">
                        <div class="echoes-battle-panel__combat-round-coins">${renderCoinTrack(round.rightFlips, 'enemy')}</div>
                        <div class="echoes-battle-panel__combat-round-power">${round.rightPower}</div>
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

        function renderStatusStrip(unit) {
            const statuses = getRenderableStatuses(unit);
            if (!statuses.length) {
                return `
                    <div class="echoes-battle-panel__combat-statuses echoes-battle-panel__combat-statuses--empty">
                        <span class="echoes-battle-panel__combat-statuses-label">Keywords</span>
                        <span class="echoes-battle-panel__combat-statuses-empty">No active effects</span>
                    </div>
                `;
            }

            const statusMarkup = statuses.map((status) => {
                const statusLabel = getStatusLabel(status.id);
                const iconPath = keywordStatusIconPaths[status.id];
                const iconUrl = iconPath ? resolveAssetUrl(iconPath) : '';
                const valueMarkup = countOnlyStatuses.has(status.id)
                    ? `
                        <span class="echoes-battle-panel__combat-status-value echoes-battle-panel__combat-status-value--count">
                            ${status.count}
                        </span>
                    `
                    : `
                        <span class="echoes-battle-panel__combat-status-value echoes-battle-panel__combat-status-value--potency">
                            ${status.potency || 0}
                        </span>
                        <span class="echoes-battle-panel__combat-status-divider">/</span>
                        <span class="echoes-battle-panel__combat-status-value echoes-battle-panel__combat-status-value--count">
                            ${status.count || 0}
                        </span>
                    `;

                return `
                    <div class="echoes-battle-panel__combat-status" title="${statusLabel}">
                        <div class="echoes-battle-panel__combat-status-icon${iconUrl ? '' : ' is-fallback'}">
                            ${iconUrl
                                ? `<img src="${iconUrl}" alt="${statusLabel}">`
                                : `<span>${statusLabel.slice(0, 2).toUpperCase()}</span>`}
                        </div>
                        <div class="echoes-battle-panel__combat-status-data">
                            <span class="echoes-battle-panel__combat-status-name">${statusLabel}</span>
                            <span class="echoes-battle-panel__combat-status-numbers">${valueMarkup}</span>
                        </div>
                    </div>
                `;
            }).join('');

            return `
                <div class="echoes-battle-panel__combat-statuses">
                    <span class="echoes-battle-panel__combat-statuses-label">Keywords</span>
                    <div class="echoes-battle-panel__combat-status-list">
                        ${statusMarkup}
                    </div>
                </div>
            `;
        }

        function renderBattleUnitCard(battle, unit, slot, side) {
            const hpPercent = (unit.hp / unit.maxHp) * 100;
            const speedRangeLabel = `${unit.speedRange[0]}-${unit.speedRange[1]}`;
            const unitSprite = getUnitCardSprite(unit);
            const assignedSkill = slot?.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const isDropTarget = side === 'enemy' && battle.phase === 'select' && unit.hp > 0;
            const resistanceMarkup = ['slash', 'pierce', 'blunt']
                .map((type) => `
                    <div class="echoes-battle-panel__combat-resistance">
                        <span>${type}</span>
                        <strong>${formatResistanceValue(unit.resistances[type])}</strong>
                    </div>
                `)
                .join('');

            return `
                <section
                    class="echoes-battle-panel__combat-unit echoes-battle-panel__combat-unit--${side}${isDropTarget ? ' echoes-battle-panel__combat-unit--drop-target' : ''}"
                    ${isDropTarget ? `data-drop-target="enemy-slot" data-target-slot-id="${slot.id}"` : ''}
                >
                    <div class="echoes-battle-panel__combat-unit-header">
                        <span class="echoes-battle-panel__combat-unit-label">${side === 'player' ? `Player ${slot.index + 1}` : `Enemy ${slot.index + 1}`}</span>
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
                        <div><span>Speed</span><strong>${slot.speed}</strong></div>
                        <div><span>Range</span><strong>${speedRangeLabel}</strong></div>
                        <div><span>Level</span><strong>${unit.level}</strong></div>
                        <div><span>Def</span><strong>${getDefenseLevel(unit)}</strong></div>
                    </div>
                    <div class="echoes-battle-panel__combat-slot-summary">
                        <div>
                            <span>${side === 'enemy' ? 'Intent' : 'Assigned'}</span>
                            <strong>${assignedSkill?.name || (side === 'enemy' ? 'Auto' : 'Not set')}</strong>
                        </div>
                        <div>
                            <span>${side === 'enemy' ? 'Drag' : 'Target'}</span>
                            <strong>${side === 'enemy'
                                ? 'Drop skill here'
                                : slot.targetSlotId ? getSlotById(battle, slot.targetSlotId)?.index + 1 : '-'}</strong>
                        </div>
                    </div>
                    ${renderStatusStrip(unit)}
                    <div class="echoes-battle-panel__combat-resistances">
                        ${resistanceMarkup}
                    </div>
                </section>
            `;
        }

        function renderTeamColumn(battle, side) {
            const slots = getSlotsForSide(battle, side);
            const cards = slots.map((slot) => {
                const unit = getUnitById(battle, slot.unitId);
                return renderBattleUnitCard(battle, unit, slot, side);
            }).join('');

            return `<div class="echoes-battle-panel__combat-team-column">${cards}</div>`;
        }

        function renderQueuePreview(battle) {
            const queueIds = battle.phase === 'resolved' && battle.resolutionQueue.length
                ? battle.resolutionQueue
                : battle.speedOrder;

            if (!queueIds.length) {
                return '<div class="echoes-battle-panel__combat-queue-empty">Queue unavailable.</div>';
            }

            return queueIds.map((slotId, index) => {
                const slot = getSlotById(battle, slotId);
                const unit = getUnitById(battle, slot.unitId);
                return `
                    <div class="echoes-battle-panel__combat-queue-item">
                        <span>${index + 1}</span>
                        <strong>${unit.name}</strong>
                        <small>${slot.speed} Speed</small>
                    </div>
                `;
            }).join('');
        }

        function renderClashStage(battle) {
            const presentation = battle.clashPresentation;
            const activePlayerSlot = getActivePlayerSlot(battle);
            const targetSlot = activePlayerSlot?.targetSlotId ? getSlotById(battle, activePlayerSlot.targetSlotId) : null;
            const activePlayerUnit = activePlayerSlot ? getUnitById(battle, activePlayerSlot.unitId) : null;
            const targetUnit = targetSlot ? getUnitById(battle, targetSlot.unitId) : null;
            const selectedSkill = activePlayerSlot?.selectedSkillId ? getSkillById(activePlayerUnit, activePlayerSlot.selectedSkillId) : null;
            const enemySkillId = targetSlot?.intentSkillId || targetSlot?.selectedSkillId || null;
            const enemySkill = targetUnit && enemySkillId ? getSkillById(targetUnit, enemySkillId) : null;
            const leftUnit = presentation
                ? (presentation.leftSlotId ? getUnitById(battle, getSlotById(battle, presentation.leftSlotId).unitId) : activePlayerUnit)
                : activePlayerUnit;
            const rightUnit = presentation
                ? (presentation.rightSlotId ? getUnitById(battle, getSlotById(battle, presentation.rightSlotId).unitId) : targetUnit)
                : targetUnit;
            const leftActorImage = leftUnit
                ? getActorSprite(leftUnit, presentation?.leftSkillId || selectedSkill?.id || null, presentation ? 'skill' : selectedSkill ? 'moving' : 'idle')
                : '';
            const rightActorImage = rightUnit
                ? getActorSprite(
                    rightUnit,
                    presentation?.rightSkillId || enemySkill?.id || null,
                    presentation ? (presentation.winnerSide === 'left' ? 'hurt' : 'skill') : 'idle',
                )
                : '';
            const roundMarkup = presentation?.rounds?.length
                ? presentation.rounds.map((round, index) => renderClashRound(presentation, round, index)).join('')
                : '<div class="echoes-battle-panel__combat-round echoes-battle-panel__combat-round--empty">Assign player slots, pick targets, and resolve the turn to run the queue.</div>';

            return `
                <section class="echoes-battle-panel__combat-center">
                    <div class="echoes-battle-panel__combat-stage${presentation ? ' is-resolving' : ''}">
                        <div class="echoes-battle-panel__combat-stage-head">
                            <div class="echoes-battle-panel__combat-stage-skill">
                                <span>${leftUnit?.name || 'Player Slot'}</span>
                                <strong>${presentation ? presentation.leftSkillName : selectedSkill?.name || 'No skill assigned'}</strong>
                                <small>${presentation
                                    ? (presentation.leftSkillId ? getCompactSkillPowerLabel(getSkillById(leftUnit, presentation.leftSkillId)) : 'No clash')
                                    : selectedSkill ? getCompactSkillPowerLabel(selectedSkill) : 'Select a slot, assign a skill, then point it at an enemy slot.'}</small>
                            </div>
                            <div class="echoes-battle-panel__combat-stage-skill echoes-battle-panel__combat-stage-skill--enemy">
                                <span>${rightUnit?.name || 'Enemy Slot'}</span>
                                <strong>${presentation ? presentation.rightSkillName : enemySkill?.name || 'No target selected'}</strong>
                                <small>${presentation
                                    ? (presentation.rightSkillId ? getCompactSkillPowerLabel(getSkillById(rightUnit, presentation.rightSkillId)) : 'No clash')
                                    : enemySkill ? getCompactSkillPowerLabel(enemySkill) : 'Choose an opposing slot to set up a clash.'}</small>
                            </div>
                        </div>

                        <div class="echoes-battle-panel__combat-stage-actors">
                            <div class="echoes-battle-panel__combat-actor echoes-battle-panel__combat-actor--hero${presentation ? ' is-clashing' : ''}">
                                ${leftActorImage ? `<img src="${leftActorImage}" alt="${leftUnit?.name || 'Player'}">` : ''}
                            </div>
                            <div class="echoes-battle-panel__combat-stage-burst">
                                <span>${presentation
                                    ? presentation.engagementType === 'clash'
                                        ? `${presentation.winnerSide === 'left' ? presentation.leftUnitName : presentation.rightUnitName} won the clash`
                                        : `${presentation.winnerSide === 'left' ? presentation.leftUnitName : presentation.rightUnitName} attacked one-sided`
                                    : 'Awaiting resolution'}</span>
                                <strong>${presentation ? `${presentation.totalDamage} total damage` : 'Speed order drives slot resolution'}</strong>
                            </div>
                            <div class="echoes-battle-panel__combat-actor echoes-battle-panel__combat-actor--enemy${presentation ? ' is-clashing' : ''}">
                                ${rightActorImage ? `<img src="${rightActorImage}" alt="${rightUnit?.name || 'Enemy'}">` : ''}
                            </div>
                        </div>

                        <div class="echoes-battle-panel__combat-queue">
                            ${renderQueuePreview(battle)}
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

        function renderPlayerSlotCard(battle, slot, isActive) {
            const unit = getUnitById(battle, slot.unitId);
            const selectedSkill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const targetLabel = slot.targetSlotId
                ? getSlotById(battle, slot.targetSlotId)?.index + 1
                : '-';

            return `
                <button
                    class="echoes-battle-panel__combat-slot-card${isActive ? ' is-active' : ''}${slot.resolved ? ' is-resolved' : ''}"
                    type="button"
                    data-action="select-slot"
                    data-slot-id="${slot.id}"
                    ${battle.phase !== 'select' ? 'disabled' : ''}
                >
                    <div class="echoes-battle-panel__combat-slot-card-head">
                        <span>${unit.name}</span>
                        <strong>Slot ${slot.index + 1}</strong>
                    </div>
                    <div class="echoes-battle-panel__combat-slot-card-body">
                        <span>Speed ${slot.speed}</span>
                        <span>${selectedSkill?.name || 'No skill assigned'}</span>
                        <span>Target ${targetLabel}</span>
                    </div>
                </button>
            `;
        }

        function renderSkillCards(battle, activePlayerSlot) {
            if (!activePlayerSlot) {
                return '<div class="echoes-battle-panel__combat-target-empty">No player slot available.</div>';
            }

            const unit = getUnitById(battle, activePlayerSlot.unitId);
            const sharedBorderPath = unit.id === 'bamboo-hatted-kim'
                ? 'assets/skillborders/Pride1.png'
                : 'assets/skillborders/Wrath1.png';

            return unit.skills.map((skill, index) => {
                const isSelected = activePlayerSlot.selectedSkillId === skill.id;
                const isDisabled = battle.phase !== 'select' || Boolean(battle.winner);
                const borderUrl = resolveAssetUrl(sharedBorderPath);
                const tooltipText = escapeAttribute([
                    skill.name,
                    `${skill.damageType.toUpperCase()} | ${getSkillPowerLabel(skill)}`,
                    `Offense ${getSkillOffenseLevel(unit, skill)}`,
                    skill.description,
                ].join('\n'));

                return `
                    <button
                        class="echoes-battle-panel__combat-skill${isSelected ? ' is-selected' : ''}"
                        type="button"
                        data-action="select-skill"
                        data-slot-id="${activePlayerSlot.id}"
                        data-skill-id="${skill.id}"
                        draggable="${isDisabled ? 'false' : 'true'}"
                        data-drag-skill="true"
                        title="${tooltipText}"
                        aria-label="${tooltipText}"
                        ${isDisabled ? 'disabled' : ''}
                    >
                        <span class="echoes-battle-panel__combat-skill-border" style="background-image: url('${borderUrl}')"></span>
                        <span class="echoes-battle-panel__combat-skill-rank">S${index + 1}</span>
                    </button>
                `;
            }).join('');
        }

        function renderPlanningSection(battle) {
            const activePlayerSlot = getActivePlayerSlot(battle);
            const slotGridMarkup = battle.playerSlots.map((slot) => renderPlayerSlotCard(battle, slot, activePlayerSlot?.id === slot.id)).join('');

            return `
                <section class="echoes-battle-panel__combat-skills">
                    <div class="echoes-battle-panel__combat-section-heading">
                        <span>Skill Slots</span>
                        <strong>${activePlayerSlot ? `Active: Slot ${activePlayerSlot.index + 1}` : 'No player slot available'}</strong>
                    </div>
                    <div class="echoes-battle-panel__combat-slot-grid">
                        ${slotGridMarkup}
                    </div>
                    <div class="echoes-battle-panel__combat-section-heading echoes-battle-panel__combat-section-heading--sub">
                        <span>Assignment</span>
                        <strong>${activePlayerSlot?.selectedSkillId
                            ? `${getSkillById(getUnitById(battle, activePlayerSlot.unitId), activePlayerSlot.selectedSkillId).name} -> Enemy Slot ${getSlotById(battle, activePlayerSlot.targetSlotId)?.index + 1 || '?'}`
                            : 'Pick a border button, then drag it onto an enemy slot'}</strong>
                    </div>
                    <div class="echoes-battle-panel__combat-target-empty">Hover a skill border to inspect it. Drag it onto an enemy slot to assign it.</div>
                    <div class="echoes-battle-panel__combat-skill-grid">
                        ${renderSkillCards(battle, activePlayerSlot)}
                    </div>
                </section>
            `;
        }

        function render(battle) {
            if (!mountElement) {
                return;
            }

            const logMarkup = battle.log
                .slice(-12)
                .reverse()
                .map((entry) => `<li>${entry}</li>`)
                .join('');

            mountElement.innerHTML = `
                <div class="echoes-battle-panel__combat-debug">
                    <div class="echoes-battle-panel__combat-toolbar">
                        <div class="echoes-battle-panel__combat-pills">
                            <span class="echoes-battle-panel__combat-pill">Turn ${battle.turn}</span>
                            <span class="echoes-battle-panel__combat-pill">${getPhaseLabel(battle)}</span>
                            <span class="echoes-battle-panel__combat-pill">Speed-ordered slot prototype</span>
                        </div>
                        <div class="echoes-battle-panel__combat-controls">
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="resolve-turn"
                                ${battle.phase !== 'select' || battle.winner ? 'disabled' : ''}
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
                        ${renderTeamColumn(battle, 'player')}
                        ${renderClashStage(battle)}
                        ${renderTeamColumn(battle, 'enemy')}
                    </div>

                    <div class="echoes-battle-panel__combat-lower">
                        ${renderPlanningSection(battle)}
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

        return {
            render,
        };
    };
})();
