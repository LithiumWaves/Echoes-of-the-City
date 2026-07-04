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
        const fieldPositions = {
            player: [
                { x: 20, y: 52 },
                { x: 28, y: 77 },
            ],
            enemy: [
                { x: 74, y: 48 },
                { x: 83, y: 73 },
            ],
        };

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
            return unit?.skills?.find((skill) => skill.id === skillId) || null;
        }

        function getActivePlayerSlot(battle) {
            return getSlotById(battle, battle.activePlayerSlotId) || battle.playerSlots[0] || null;
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
                return 'Resolved';
            }
            return 'Planning';
        }

        function getSkillPowerLabel(skill) {
            return `Base ${skill.basePower} | Coin ${skill.coinPower >= 0 ? '+' : ''}${skill.coinPower} | ${skill.coinCount} Coins`;
        }

        function getCompactSkillPowerLabel(skill) {
            return `${skill.basePower} ${skill.coinPower >= 0 ? '+' : ''}${skill.coinPower} (${skill.coinCount})`;
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

        function getUnitFieldSprite(unit) {
            if (unit.hp <= 0 && unit.sprites.hurt) {
                return resolveAssetUrl(unit.sprites.hurt);
            }

            return resolveAssetUrl(unit.sprites.idle);
        }

        function getFieldPosition(side, index) {
            return fieldPositions[side]?.[index] || { x: side === 'player' ? 24 : 78, y: 60 };
        }

        function getSkillSummary(skill) {
            if (!skill) {
                return 'No skill';
            }

            return `${skill.name} | ${getCompactSkillPowerLabel(skill)}`;
        }

        function getUnitTooltip(battle, unit, slot, side) {
            const assignedSkill = slot?.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const intentSkillId = slot?.intentSkillId || slot?.selectedSkillId;
            const intentSkill = intentSkillId ? getSkillById(unit, intentSkillId) : null;
            const statuses = getRenderableStatuses(unit)
                .map((status) => countOnlyStatuses.has(status.id)
                    ? `${getStatusLabel(status.id)} ${status.count}`
                    : `${getStatusLabel(status.id)} ${status.potency || 0}/${status.count || 0}`)
                .join(', ');

            return escapeAttribute([
                unit.name,
                `HP ${unit.hp}/${unit.maxHp} | SP ${unit.sp} | Speed ${slot?.speed || 0}`,
                side === 'enemy'
                    ? `Intent: ${getSkillSummary(intentSkill)}`
                    : `Assigned: ${getSkillSummary(assignedSkill)}`,
                statuses || 'No active statuses',
            ].join('\n'));
        }

        function renderMiniStatuses(unit) {
            const statuses = getRenderableStatuses(unit).slice(0, 4);
            if (!statuses.length) {
                return '';
            }

            return `
                <div class="echoes-battle-panel__field-statuses">
                    ${statuses.map((status) => {
                        const statusLabel = getStatusLabel(status.id);
                        const iconPath = keywordStatusIconPaths[status.id];
                        const iconUrl = iconPath ? resolveAssetUrl(iconPath) : '';
                        const numberLabel = countOnlyStatuses.has(status.id)
                            ? `${status.count}`
                            : `${status.potency || 0}/${status.count || 0}`;

                        return `
                            <span class="echoes-battle-panel__field-status" title="${escapeAttribute(`${statusLabel} ${numberLabel}`)}">
                                <span class="echoes-battle-panel__field-status-icon${iconUrl ? '' : ' is-fallback'}">
                                    ${iconUrl
                                        ? `<img src="${iconUrl}" alt="${statusLabel}">`
                                        : `<span>${statusLabel.slice(0, 2).toUpperCase()}</span>`}
                                </span>
                                <strong>${numberLabel}</strong>
                            </span>
                        `;
                    }).join('')}
                </div>
            `;
        }

        function renderFieldUnit(battle, unit, slot, side, activePlayerSlot) {
            const position = getFieldPosition(side, slot.index);
            const isPlayer = side === 'player';
            const isActive = isPlayer && activePlayerSlot?.id === slot.id;
            const isTargeted = activePlayerSlot?.targetSlotId === slot.id;
            const isDropTarget = !isPlayer && battle.phase === 'select' && unit.hp > 0;
            const tooltip = getUnitTooltip(battle, unit, slot, side);
            const unitSprite = getUnitFieldSprite(unit);
            const assignedSkill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const intentSkill = slot.intentSkillId ? getSkillById(unit, slot.intentSkillId) : assignedSkill;
            const primaryAction = isPlayer ? 'select-slot' : 'select-target';
            const actionAttrs = isPlayer
                ? `data-action="${primaryAction}" data-slot-id="${slot.id}"`
                : `data-action="${primaryAction}" data-target-slot-id="${slot.id}"`;
            const stateLabel = battle.phase === 'resolved'
                ? (intentSkill?.name || assignedSkill?.name || 'No action')
                : isPlayer
                    ? (assignedSkill?.name || 'Choose skill')
                    : (intentSkill?.name || 'Intent hidden');

            return `
                <button
                    class="echoes-battle-panel__field-unit echoes-battle-panel__field-unit--${side}${isActive ? ' is-active' : ''}${isTargeted ? ' is-targeted' : ''}${slot.resolved ? ' is-resolved' : ''}${isDropTarget ? ' echoes-battle-panel__combat-unit--drop-target' : ''}"
                    type="button"
                    style="left: ${position.x}%; top: ${position.y}%;"
                    title="${tooltip}"
                    ${actionAttrs}
                    ${isDropTarget ? 'data-drop-target="enemy-slot"' : ''}
                    ${battle.phase !== 'select' && isPlayer ? 'disabled' : ''}
                >
                    <span class="echoes-battle-panel__field-speed">${slot.speed}</span>
                    <span class="echoes-battle-panel__field-shadow"></span>
                    <span class="echoes-battle-panel__field-ring"></span>
                    <span class="echoes-battle-panel__field-sprite">
                        <img src="${unitSprite}" alt="${unit.name}">
                    </span>
                    <span class="echoes-battle-panel__field-name">${unit.name}</span>
                    <span class="echoes-battle-panel__field-state">${stateLabel}</span>
                    <span class="echoes-battle-panel__field-hp">HP ${unit.hp}/${unit.maxHp}</span>
                    ${renderMiniStatuses(unit)}
                </button>
            `;
        }

        function renderTargetOverlay(battle, activePlayerSlot) {
            const paths = battle.playerSlots
                .filter((slot) => slot.targetSlotId)
                .map((slot) => {
                    const start = getFieldPosition('player', slot.index);
                    const targetSlot = getSlotById(battle, slot.targetSlotId);
                    if (!targetSlot) {
                        return '';
                    }

                    const end = getFieldPosition('enemy', targetSlot.index);
                    const controlX = (start.x + end.x) / 2;
                    const controlY = Math.max(8, Math.min(start.y, end.y) - 18);
                    const isActive = activePlayerSlot?.id === slot.id;
                    return `
                        <path
                            class="echoes-battle-panel__field-path${isActive ? ' is-active' : ''}"
                            d="M ${start.x} ${start.y - 7} Q ${controlX} ${controlY} ${end.x} ${end.y - 8}"
                            vector-effect="non-scaling-stroke"
                        />
                    `;
                })
                .join('');

            if (!paths) {
                return '';
            }

            return `
                <svg class="echoes-battle-panel__field-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <marker id="echoes-field-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L7,3.5 L0,7 z" fill="currentColor"></path>
                        </marker>
                    </defs>
                    ${paths}
                </svg>
            `;
        }

        function renderResolutionCard(battle, activePlayerSlot) {
            const presentation = battle.clashPresentation;

            if (!presentation) {
                const activeUnit = activePlayerSlot ? getUnitById(battle, activePlayerSlot.unitId) : null;
                const selectedSkill = activePlayerSlot?.selectedSkillId ? getSkillById(activeUnit, activePlayerSlot.selectedSkillId) : null;
                const targetSlot = activePlayerSlot?.targetSlotId ? getSlotById(battle, activePlayerSlot.targetSlotId) : null;
                const targetUnit = targetSlot ? getUnitById(battle, targetSlot.unitId) : null;
                return `
                    <div class="echoes-battle-panel__combat-result-card">
                        <span class="echoes-battle-panel__combat-result-label">${getPhaseLabel(battle)}</span>
                        <strong>${selectedSkill ? selectedSkill.name : 'Select a slot and assign a skill'}</strong>
                        <small>${targetUnit ? `Targeting ${targetUnit.name}` : 'Drag a skill border onto an enemy unit, or click an enemy after selecting a skill.'}</small>
                    </div>
                `;
            }

            const winnerName = presentation.winnerSide === 'left' ? presentation.leftUnitName : presentation.rightUnitName;
            const subline = presentation.engagementType === 'clash'
                ? `${presentation.leftSkillName} vs ${presentation.rightSkillName}`
                : `${winnerName} resolved a one-sided attack`;
            return `
                <div class="echoes-battle-panel__combat-result-card is-resolved">
                    <span class="echoes-battle-panel__combat-result-label">${presentation.engagementType === 'clash' ? 'Clash' : 'Attack'}</span>
                    <strong>${winnerName}</strong>
                    <small>${subline}</small>
                    <div class="echoes-battle-panel__combat-result-detail">
                        <span>${presentation.totalDamage} total damage</span>
                        <span>${presentation.rounds?.length || presentation.hits?.length || 0} exchanges</span>
                    </div>
                </div>
            `;
        }

        function renderQueueTrack(battle) {
            const queueIds = battle.phase === 'resolved' && battle.resolutionQueue.length
                ? battle.resolutionQueue
                : battle.speedOrder;

            if (!queueIds.length) {
                return '<div class="echoes-battle-panel__planner-empty">Queue unavailable.</div>';
            }

            return queueIds.map((slotId, index) => {
                const slot = getSlotById(battle, slotId);
                const unit = getUnitById(battle, slot.unitId);
                return `
                    <div class="echoes-battle-panel__queue-chip">
                        <span>${index + 1}</span>
                        <strong>${unit.name}</strong>
                        <small>${slot.speed}</small>
                    </div>
                `;
            }).join('');
        }

        function renderPlayerSlotTabs(battle, activePlayerSlot) {
            return battle.playerSlots.map((slot) => {
                const unit = getUnitById(battle, slot.unitId);
                const selectedSkill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
                return `
                    <button
                        class="echoes-battle-panel__planner-slot${activePlayerSlot?.id === slot.id ? ' is-active' : ''}${slot.resolved ? ' is-resolved' : ''}"
                        type="button"
                        data-action="select-slot"
                        data-slot-id="${slot.id}"
                        ${battle.phase !== 'select' ? 'disabled' : ''}
                    >
                        <span class="echoes-battle-panel__planner-slot-index">${slot.index + 1}</span>
                        <div>
                            <strong>${unit.name}</strong>
                            <small>${selectedSkill?.name || 'No skill assigned'}</small>
                        </div>
                    </button>
                `;
            }).join('');
        }

        function renderSkillCards(battle, activePlayerSlot) {
            if (!activePlayerSlot) {
                return '<div class="echoes-battle-panel__planner-empty">No player slot available.</div>';
            }

            const unit = getUnitById(battle, activePlayerSlot.unitId);
            const sharedBorderPath = unit.id === 'bamboo-hatted-kim'
                ? 'assets/skillborders/Pride1.png'
                : 'assets/skillborders/Wrath1.png';

            return unit.skills
                .filter((skill) => !(unit.id === 'bamboo-hatted-kim' && skill.id === 'to-claim-their-bones'))
                .map((skill, index) => {
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
                            class="echoes-battle-panel__planner-skill${isSelected ? ' is-selected' : ''}"
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
                            <span class="echoes-battle-panel__planner-skill-border" style="background-image: url('${borderUrl}')"></span>
                            <span class="echoes-battle-panel__planner-skill-rank">${index + 1}</span>
                        </button>
                    `;
                })
                .join('');
        }

        function renderBattlefield(battle, activePlayerSlot) {
            const playerMarkup = battle.playerSlots
                .map((slot) => renderFieldUnit(battle, getUnitById(battle, slot.unitId), slot, 'player', activePlayerSlot))
                .join('');
            const enemyMarkup = battle.enemySlots
                .map((slot) => renderFieldUnit(battle, getUnitById(battle, slot.unitId), slot, 'enemy', activePlayerSlot))
                .join('');

            return `
                <section class="echoes-battle-panel__combat-battlefield">
                    <div class="echoes-battle-panel__combat-hud">
                        <div class="echoes-battle-panel__combat-counter-stack">
                            <div class="echoes-battle-panel__combat-counter">
                                <span>Wave</span>
                                <strong>1 / 1</strong>
                            </div>
                            <div class="echoes-battle-panel__combat-counter">
                                <span>Turn</span>
                                <strong>${battle.turn}</strong>
                            </div>
                        </div>
                        <div class="echoes-battle-panel__combat-controls">
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="resolve-turn"
                                ${battle.phase !== 'select' || battle.winner ? 'disabled' : ''}
                            >
                                Resolve
                            </button>
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="next-turn"
                                ${battle.phase !== 'resolved' || battle.winner ? 'disabled' : ''}
                            >
                                Next
                            </button>
                            <button
                                class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost"
                                type="button"
                                data-action="reset-fight"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                    <div class="echoes-battle-panel__combat-stage-area">
                        ${renderTargetOverlay(battle, activePlayerSlot)}
                        ${renderResolutionCard(battle, activePlayerSlot)}
                        ${playerMarkup}
                        ${enemyMarkup}
                    </div>
                </section>
            `;
        }

        function renderPlanner(battle, activePlayerSlot) {
            const activeUnit = activePlayerSlot ? getUnitById(battle, activePlayerSlot.unitId) : null;
            const selectedSkill = activePlayerSlot?.selectedSkillId ? getSkillById(activeUnit, activePlayerSlot.selectedSkillId) : null;
            const targetSlot = activePlayerSlot?.targetSlotId ? getSlotById(battle, activePlayerSlot.targetSlotId) : null;
            const targetUnit = targetSlot ? getUnitById(battle, targetSlot.unitId) : null;
            const logMarkup = battle.log
                .slice(-4)
                .reverse()
                .map((entry) => `<li>${entry}</li>`)
                .join('');

            return `
                <section class="echoes-battle-panel__combat-planner">
                    <div class="echoes-battle-panel__planner-lane echoes-battle-panel__planner-lane--slots">
                        <div class="echoes-battle-panel__planner-heading">
                            <span>Slots</span>
                            <strong>${activePlayerSlot ? `Active Slot ${activePlayerSlot.index + 1}` : 'No slot'}</strong>
                        </div>
                        <div class="echoes-battle-panel__planner-slot-list">
                            ${renderPlayerSlotTabs(battle, activePlayerSlot)}
                        </div>
                    </div>

                    <div class="echoes-battle-panel__planner-lane echoes-battle-panel__planner-lane--skills">
                        <div class="echoes-battle-panel__planner-heading">
                            <span>Assignment</span>
                            <strong>${selectedSkill ? selectedSkill.name : 'Select a skill'}</strong>
                        </div>
                        <div class="echoes-battle-panel__planner-summary">
                            ${targetUnit
                                ? `${activeUnit?.name || 'Slot'} -> ${targetUnit.name}`
                                : 'Drag a skill onto an enemy, or click an enemy after selecting a skill.'}
                        </div>
                        <div class="echoes-battle-panel__planner-skill-row">
                            ${renderSkillCards(battle, activePlayerSlot)}
                        </div>
                    </div>

                    <aside class="echoes-battle-panel__planner-lane echoes-battle-panel__planner-lane--queue">
                        <div class="echoes-battle-panel__planner-heading">
                            <span>Speed Order</span>
                            <strong>${getPhaseLabel(battle)}</strong>
                        </div>
                        <div class="echoes-battle-panel__queue-track">
                            ${renderQueueTrack(battle)}
                        </div>
                        <ol class="echoes-battle-panel__planner-log">
                            ${logMarkup}
                        </ol>
                    </aside>
                </section>
            `;
        }

        function render(battle) {
            if (!mountElement) {
                return;
            }

            const activePlayerSlot = getActivePlayerSlot(battle);
            mountElement.innerHTML = `
                <div class="echoes-battle-panel__combat-limbus">
                    ${renderBattlefield(battle, activePlayerSlot)}
                    ${renderPlanner(battle, activePlayerSlot)}
                </div>
            `;
        }

        return {
            render,
        };
    };
})();
