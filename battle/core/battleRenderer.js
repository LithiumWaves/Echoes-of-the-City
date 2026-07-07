(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function createBattleRenderer(options) {
        const { mountElement, resolveAssetUrl } = options;
        const staggerOverlayPath = 'assets/statuseffects/states/stagger/stagger.png';
        const physicalDamageTypes = ['slash', 'pierce', 'blunt'];
        const sinTypes = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
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
                { x: 20, y: 56 },
                { x: 28, y: 80 },
            ],
            enemy: [
                { x: 74, y: 52 },
                { x: 83, y: 76 },
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

        function getResolvedBattle(battle, uiState) {
            return uiState?.resolvedBattle || battle;
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

        function getSkillType(skill) {
            return skill?.skillType || 'attack';
        }

        function isDefenseSkill(skill) {
            return getSkillType(skill) !== 'attack';
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
                slash: 'Slash',
                pierce: 'Pierce',
                blunt: 'Blunt',
                wrath: 'Wrath',
                lust: 'Lust',
                sloth: 'Sloth',
                gluttony: 'Gluttony',
                gloom: 'Gloom',
                pride: 'Pride',
                envy: 'Envy',
            };

            return labels[statusId] || statusId;
        }

        function getResistanceDescriptor(value) {
            if (value <= 0.5) {
                return 'Ineffective';
            }
            if (value < 1) {
                return 'Endure';
            }
            if (value >= 2) {
                return 'Fatal';
            }
            if (value > 1) {
                return 'Weak';
            }
            return 'Normal';
        }

        function formatResistanceEntry(label, value) {
            return `${label} ${value}x ${getResistanceDescriptor(value)}`;
        }

        function getResistanceBucket(unit, bucket) {
            return unit?.resistances?.[bucket] || {};
        }

        function getResistanceSummary(unit, keys, bucket) {
            const source = getResistanceBucket(unit, bucket);
            return keys
                .map((key) => formatResistanceEntry(getStatusLabel(key), source[key] ?? 1))
                .join(' | ');
        }

        function getStaggerThresholdSummary(unit) {
            const thresholds = Array.isArray(unit?.staggerThresholds) ? unit.staggerThresholds : [];
            if (!thresholds.length) {
                return 'None';
            }

            return thresholds.map((threshold, index) => {
                const prefix = index < (unit.staggerThresholdIndex || 0)
                    ? 'x'
                    : index === (unit.staggerThresholdIndex || 0)
                        ? '>'
                        : '-';
                return `${prefix}${threshold}`;
            }).join(' ');
        }

        function renderStaggerThresholdTrack(unit) {
            const thresholds = Array.isArray(unit?.staggerThresholds) ? unit.staggerThresholds : [];
            if (!thresholds.length) {
                return '';
            }

            return `
                <span class="echoes-battle-panel__field-thresholds">
                    ${thresholds.map((threshold, index) => {
                        const className = index < (unit.staggerThresholdIndex || 0)
                            ? ' is-spent'
                            : index === (unit.staggerThresholdIndex || 0)
                                ? ' is-next'
                                : '';
                        return `<span class="echoes-battle-panel__field-threshold${className}">${threshold}</span>`;
                    }).join('')}
                </span>
            `;
        }

        function getSkillDamageProfileLabel(skill) {
            if (!skill) {
                return 'No skill';
            }

            if (isDefenseSkill(skill)) {
                return `${getSkillType(skill).toUpperCase()} | ${skill.sinType ? getStatusLabel(skill.sinType) : 'No Sin'}`;
            }

            return `${getStatusLabel(skill.damageType)} | ${skill.sinType ? getStatusLabel(skill.sinType) : 'No Sin'}`;
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

        function isUnitStaggered(unit) {
            return unit.hp > 0 && (unit.staggerTurnsRemaining || 0) > 0;
        }

        function getNextStaggerThreshold(unit) {
            if (!Array.isArray(unit?.staggerThresholds)) {
                return null;
            }

            return unit.staggerThresholds[unit.staggerThresholdIndex] ?? null;
        }

        function getUnitFieldSprite(unit, slot) {
            if ((unit.hp <= 0 || isUnitStaggered(unit)) && unit.sprites.hurt) {
                return resolveAssetUrl(unit.sprites.hurt);
            }

            const selectedSkill = slot?.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            if (getSkillType(selectedSkill) === 'evade' && unit.sprites.evade) {
                return resolveAssetUrl(unit.sprites.evade);
            }
            if (getSkillType(selectedSkill) === 'guard' && unit.sprites.guard) {
                return resolveAssetUrl(unit.sprites.guard);
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

            return `${skill.name}${isDefenseSkill(skill) ? ' [Defense]' : ''} | ${getCompactSkillPowerLabel(skill)}`;
        }

        function getSlotTargetSummary(battle, slot) {
            const targetSlot = slot?.targetSlotId ? getSlotById(battle, slot.targetSlotId) : null;
            if (!targetSlot) {
                return 'No target';
            }

            const targetUnit = getUnitById(battle, targetSlot.unitId);
            return `${targetUnit?.name || 'Unknown'} ${targetSlot.index + 1}`;
        }

        function getUnitTooltip(battle, unit, slot, side) {
            const assignedSkill = slot?.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const intentSkillId = slot?.intentSkillId || slot?.selectedSkillId;
            const intentSkill = intentSkillId ? getSkillById(unit, intentSkillId) : null;
            const nextStaggerThreshold = getNextStaggerThreshold(unit);
            const statuses = getRenderableStatuses(unit)
                .map((status) => countOnlyStatuses.has(status.id)
                    ? `${getStatusLabel(status.id)} ${status.count}`
                    : `${getStatusLabel(status.id)} ${status.potency || 0}/${status.count || 0}`)
                .join(', ');

            return escapeAttribute([
                unit.name,
                `HP ${unit.hp}/${unit.maxHp} | SP ${unit.sp} | Speed ${slot?.speed || 0}`,
                isUnitStaggered(unit)
                    ? `Staggered | Level ${unit.staggerLevel || 1} | Recovery in ${unit.staggerTurnsRemaining} turn(s)`
                    : `Next Stagger: ${nextStaggerThreshold ?? 'None'}`,
                `Stagger Thresholds: ${getStaggerThresholdSummary(unit)}`,
                `Physical Res: ${getResistanceSummary(unit, physicalDamageTypes, 'physical')}`,
                `Sin Res: ${getResistanceSummary(unit, sinTypes, 'sin')}`,
                side === 'enemy'
                    ? `Intent: ${getSkillSummary(intentSkill)} -> ${getSlotTargetSummary(battle, slot)}`
                    : `Assigned: ${getSkillSummary(assignedSkill)} -> ${getSlotTargetSummary(battle, slot)}`,
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
            return renderFieldUnitWithUiState(battle, unit, slot, side, activePlayerSlot, {});
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

        function getPlaybackRoleClasses(slotId, uiState) {
            const playback = uiState?.playback;
            if (!playback?.isRunning || !playback.entry) {
                return '';
            }

            const { entry, phase } = playback;
            const isLeft = entry.leftSlotId === slotId;
            const isRight = entry.rightSlotId === slotId;
            if (!isLeft && !isRight) {
                return '';
            }

            const attackingSide = getPlaybackAttackingSide(entry);
            let classes = ' is-playback-focus';

            if (phase === 'approach' || phase === 'skill-intro' || phase === 'round-reveal' || phase === 'coin-break') {
                classes += isLeft ? ' is-playback-engaged-left' : ' is-playback-engaged-right';
                return classes;
            }

            if (phase === 'attack-hit' || phase === 'entry-end') {
                if (isLeft) {
                    classes += attackingSide === 'left' ? ' is-playback-attack-left' : ' is-playback-recoil-left';
                } else if (isRight) {
                    classes += attackingSide === 'right' ? ' is-playback-attack-right' : ' is-playback-recoil-right';
                }
            }

            return classes;
        }

        function renderFieldUnitWithUiState(battle, unit, slot, side, activePlayerSlot, uiState) {
            const position = getFieldPosition(side, slot.index);
            const isPlayer = side === 'player';
            const isActive = isPlayer && activePlayerSlot?.id === slot.id;
            const isTargeted = activePlayerSlot?.targetSlotId === slot.id;
            const isDropTarget = !isPlayer && battle.phase === 'select' && unit.hp > 0;
            const tooltip = getUnitTooltip(battle, unit, slot, side);
            const unitSprite = getUnitFieldSprite(unit, slot);
            const assignedSkill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
            const intentSkill = slot.intentSkillId ? getSkillById(unit, slot.intentSkillId) : assignedSkill;
            const primaryAction = isPlayer ? 'select-slot' : 'select-target';
            const actionAttrs = isPlayer
                ? `data-action="${primaryAction}" data-slot-id="${slot.id}"`
                : `data-action="${primaryAction}" data-target-slot-id="${slot.id}"`;
            const stateLabel = battle.phase === 'resolved'
                ? (intentSkill?.name || assignedSkill?.name || 'No action')
                : isUnitStaggered(unit)
                    ? `Staggered ${unit.staggerLevel > 1 ? `+${unit.staggerLevel - 1}` : ''}`.trim()
                : isPlayer
                    ? (assignedSkill ? (isDefenseSkill(assignedSkill) ? `${assignedSkill.name} Ready` : assignedSkill.name) : 'Choose skill')
                    : (intentSkill?.name || 'No intent');
            const targetLabel = isPlayer && !assignedSkill
                ? 'No target'
                : getSlotTargetSummary(battle, slot);
            const playbackClasses = getPlaybackRoleClasses(slot.id, uiState);
            const isStaggered = isUnitStaggered(unit);
            const staggerOverlayUrl = isStaggered ? resolveAssetUrl(staggerOverlayPath) : '';

            return `
                <button
                    class="echoes-battle-panel__field-unit echoes-battle-panel__field-unit--${side}${isActive ? ' is-active' : ''}${isTargeted ? ' is-targeted' : ''}${slot.resolved ? ' is-resolved' : ''}${isStaggered ? ' is-staggered' : ''}${isDropTarget ? ' echoes-battle-panel__combat-unit--drop-target' : ''}${playbackClasses}"
                    type="button"
                    style="left: ${position.x}%; top: ${position.y}%;"
                    title="${tooltip}"
                    ${actionAttrs}
                    ${isDropTarget ? 'data-drop-target="enemy-slot"' : ''}
                    ${(battle.phase !== 'select' && isPlayer) || uiState?.isPlaybackRunning ? 'disabled' : ''}
                >
                    <span class="echoes-battle-panel__field-speed">${slot.speed}</span>
                    <span class="echoes-battle-panel__field-shadow"></span>
                    <span class="echoes-battle-panel__field-ring"></span>
                    <span class="echoes-battle-panel__field-sprite">
                        <img src="${unitSprite}" alt="${unit.name}">
                        ${staggerOverlayUrl
                            ? `<img class="echoes-battle-panel__field-stagger-overlay" src="${staggerOverlayUrl}" alt="Staggered">`
                            : ''}
                    </span>
                    <span class="echoes-battle-panel__field-name">${unit.name}</span>
                    <span class="echoes-battle-panel__field-state">${stateLabel}</span>
                    <span class="echoes-battle-panel__field-target">${targetLabel}</span>
                    <span class="echoes-battle-panel__field-vitals">
                        <span class="echoes-battle-panel__field-hp">HP ${unit.hp}/${unit.maxHp}</span>
                        <span class="echoes-battle-panel__field-sp">SP ${unit.sp}</span>
                    </span>
                    ${renderStaggerThresholdTrack(unit)}
                    ${renderMiniStatuses(unit)}
                </button>
            `;
        }

        function renderTargetOverlay(battle, activePlayerSlot) {
            return renderTargetOverlayWithUiState(battle, activePlayerSlot, {});
        }

        function renderTargetOverlayWithUiState(battle, activePlayerSlot, uiState) {
            const playback = uiState?.playback;
            if (playback?.isRunning && playback.entry) {
                const startSlot = getSlotById(battle, playback.entry.leftSlotId);
                const endSlot = getSlotById(battle, playback.entry.rightSlotId);
                if (!startSlot || !endSlot) {
                    return '';
                }

                const start = getFieldPosition(startSlot.side, startSlot.index);
                const end = getFieldPosition(endSlot.side, endSlot.index);
                const controlX = (start.x + end.x) / 2;
                const controlY = Math.max(8, Math.min(start.y, end.y) - 18);
                return `
                    <svg class="echoes-battle-panel__field-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                        <defs>
                            <marker id="echoes-field-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="strokeWidth">
                                <path d="M0,0 L7,3.5 L0,7 z" fill="currentColor"></path>
                            </marker>
                        </defs>
                        <path
                            class="echoes-battle-panel__field-path is-active"
                            d="M ${start.x} ${start.y - 7} Q ${controlX} ${controlY} ${end.x} ${end.y - 8}"
                            vector-effect="non-scaling-stroke"
                        />
                    </svg>
                `;
            }

            const clashPairKeys = new Set();
            const clashPaths = battle.playerSlots
                .filter((playerSlot) => {
                    const enemySlot = playerSlot.targetSlotId ? getSlotById(battle, playerSlot.targetSlotId) : null;
                    return enemySlot
                        && enemySlot.side === 'enemy'
                        && enemySlot.targetSlotId === playerSlot.id
                        && Boolean(playerSlot.selectedSkillId)
                        && Boolean(enemySlot.selectedSkillId);
                })
                .map((playerSlot) => {
                    const enemySlot = getSlotById(battle, playerSlot.targetSlotId);
                    const pairKey = [playerSlot.id, enemySlot.id].sort().join(':');
                    if (clashPairKeys.has(pairKey)) {
                        return '';
                    }

                    clashPairKeys.add(pairKey);
                    const start = getFieldPosition('player', playerSlot.index);
                    const end = getFieldPosition('enemy', enemySlot.index);
                    const controlX = (start.x + end.x) / 2;
                    const controlY = Math.max(8, Math.min(start.y, end.y) - 18);
                    const isActive = activePlayerSlot?.id === playerSlot.id;
                    return `
                        <path
                            class="echoes-battle-panel__field-path echoes-battle-panel__field-path--clash${isActive ? ' is-active' : ''}"
                            d="M ${start.x} ${start.y - 7} Q ${controlX} ${controlY} ${end.x} ${end.y - 8}"
                            vector-effect="non-scaling-stroke"
                        />
                    `;
                })
                .join('');

            const playerPaths = battle.playerSlots
                .filter((slot) => slot.targetSlotId)
                .map((slot) => {
                    const targetSlot = getSlotById(battle, slot.targetSlotId);
                    if (!targetSlot) {
                        return '';
                    }

                    const pairKey = [slot.id, targetSlot.id].sort().join(':');
                    if (clashPairKeys.has(pairKey)) {
                        return '';
                    }

                    const start = getFieldPosition('player', slot.index);
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

            const enemyPaths = battle.enemySlots
                .filter((slot) => slot.targetSlotId)
                .map((slot) => {
                    const targetSlot = getSlotById(battle, slot.targetSlotId);
                    if (!targetSlot) {
                        return '';
                    }

                    const pairKey = [slot.id, targetSlot.id].sort().join(':');
                    if (clashPairKeys.has(pairKey)) {
                        return '';
                    }

                    const start = getFieldPosition('enemy', slot.index);
                    const end = getFieldPosition('player', targetSlot.index);
                    const controlX = (start.x + end.x) / 2;
                    const controlY = Math.max(10, Math.min(start.y, end.y) - 10);
                    return `
                        <path
                            class="echoes-battle-panel__field-path echoes-battle-panel__field-path--enemy"
                            d="M ${start.x} ${start.y - 7} Q ${controlX} ${controlY} ${end.x} ${end.y - 8}"
                            vector-effect="non-scaling-stroke"
                        />
                    `;
                })
                .join('');

            if (!clashPaths && !playerPaths && !enemyPaths) {
                return '';
            }

            return `
                <svg class="echoes-battle-panel__field-overlay" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <defs>
                        <marker id="echoes-field-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto" markerUnits="strokeWidth">
                            <path d="M0,0 L7,3.5 L0,7 z" fill="currentColor"></path>
                        </marker>
                    </defs>
                    ${clashPaths}
                    ${enemyPaths}
                    ${playerPaths}
                </svg>
            `;
        }

        function renderResolutionBadges(battle, uiState) {
            if (uiState?.isPlaybackRunning) {
                return '';
            }

            const presentation = battle.clashPresentation;
            if (!presentation || battle.phase !== 'resolved') {
                return '';
            }

            const leftSlot = getSlotById(battle, presentation.leftSlotId);
            const rightSlot = getSlotById(battle, presentation.rightSlotId);
            if (!leftSlot || !rightSlot) {
                return '';
            }

            const leftPosition = getFieldPosition(leftSlot.side, leftSlot.index);
            const rightPosition = getFieldPosition(rightSlot.side, rightSlot.index);
            const leftWinner = presentation.winnerSide === 'left';
            const rightWinner = presentation.winnerSide === 'right';

            return `
                <div class="echoes-battle-panel__resolution-badge echoes-battle-panel__resolution-badge--left${leftWinner ? ' is-winner' : ''}" style="left: ${leftPosition.x - 3}%; top: ${leftPosition.y - 24}%;">
                    <strong>${presentation.leftDisplayPower || 0}</strong>
                    <span>${presentation.leftUnitName}</span>
                </div>
                <div class="echoes-battle-panel__resolution-badge echoes-battle-panel__resolution-badge--right${rightWinner ? ' is-winner' : ''}" style="left: ${rightPosition.x + 3}%; top: ${rightPosition.y - 24}%;">
                    <strong>${presentation.rightDisplayPower || 0}</strong>
                    <span>${presentation.rightUnitName}</span>
                </div>
            `;
        }

        function renderPlaybackCoinTrack(skill, side, playback, entry) {
            if (!skill) {
                return '';
            }

            const totalCoins = skill.coinCount;
            const brokenCoins = side === 'left' ? playback.leftBroken : playback.rightBroken;
            const remainingCoins = Math.max(0, totalCoins - brokenCoins);
            const states = [];
            for (let index = 0; index < totalCoins; index += 1) {
                if (index >= remainingCoins) {
                    states.push('broken');
                } else {
                    states.push('pending');
                }
            }

            const currentRound = entry.rounds?.[playback.roundIndex] || null;
            const normalizeFlips = (flips) => {
                if (Array.isArray(flips)) {
                    return flips;
                }
                if (typeof flips === 'string') {
                    return flips
                        .split(/\s+/)
                        .filter(Boolean)
                        .map((token) => token === 'H');
                }
                return [];
            };
            if (playback.phase === 'round-reveal' || playback.phase === 'coin-break') {
                const flips = normalizeFlips(side === 'left' ? currentRound?.leftFlips : currentRound?.rightFlips);
                for (let index = 0; index < flips.length; index += 1) {
                    states[index] = flips[index] ? 'heads' : 'tails';
                }
            }

            const attackingSide = getPlaybackAttackingSide(entry);
            const isAttackingSide = attackingSide === side;
            if (playback.phase === 'attack-hit' && isAttackingSide) {
                for (let index = 0; index < playback.hitIndex; index += 1) {
                    if (states[index] !== 'broken') {
                        states[index] = 'spent';
                    }
                }

                const currentHit = entry.hits?.[playback.hitIndex];
                if (currentHit && states[playback.hitIndex] !== 'broken') {
                    states[playback.hitIndex] = currentHit.isHeads ? 'heads' : 'tails';
                }
            }

            return states.map((state, index) => `
                <span class="echoes-battle-panel__playback-coin is-${state}">
                    <strong>${index + 1}</strong>
                </span>
            `).join('');
        }

        function getPlaybackValueState(playback, entry) {
            if (!playback?.isRunning || !entry) {
                return null;
            }

            if ((playback.phase === 'round-reveal' || playback.phase === 'coin-break') && entry.rounds?.length) {
                const currentRound = entry.rounds?.[playback.roundIndex];
                if (!currentRound) {
                    return null;
                }

                return {
                    leftValue: currentRound.leftPower,
                    rightValue: currentRound.rightPower,
                    leftLabel: entry.engagementType === 'clash' ? 'Clash Power' : 'Final Power',
                    rightLabel: entry.engagementType === 'clash' ? 'Clash Power' : 'Final Power',
                };
            }

            if (playback.phase === 'attack-hit') {
                const currentHit = entry.hits?.[playback.hitIndex];
                const attackingSide = getPlaybackAttackingSide(entry);
                if (!currentHit) {
                    return null;
                }

                return {
                    leftValue: attackingSide === 'left' ? currentHit.finalPower : currentHit.damage,
                    rightValue: attackingSide === 'right' ? currentHit.finalPower : currentHit.damage,
                    leftLabel: attackingSide === 'left' ? 'Final Power' : 'Damage',
                    rightLabel: attackingSide === 'right' ? 'Final Power' : 'Damage',
                };
            }

            return null;
        }

        function renderPlaybackValueBadges(leftPosition, rightPosition, playback, entry) {
            const valueState = getPlaybackValueState(playback, entry);
            if (!valueState) {
                return '';
            }

            return `
                <div class="echoes-battle-panel__playback-value-badge echoes-battle-panel__playback-value-badge--left" style="left: ${leftPosition.x - 4}%; top: ${leftPosition.y - 23}%;">
                    <span>${valueState.leftLabel}</span>
                    <strong>${valueState.leftValue}</strong>
                </div>
                <div class="echoes-battle-panel__playback-value-badge echoes-battle-panel__playback-value-badge--right" style="left: ${rightPosition.x + 4}%; top: ${rightPosition.y - 23}%;">
                    <span>${valueState.rightLabel}</span>
                    <strong>${valueState.rightValue}</strong>
                </div>
            `;
        }

        function renderPlaybackOverlay(battle, uiState) {
            const playback = uiState?.playback;
            const resolvedBattle = getResolvedBattle(battle, uiState);
            if (!playback?.isRunning || !playback.entry) {
                return '';
            }

            const entry = playback.entry;
            const leftSlot = getSlotById(resolvedBattle, entry.leftSlotId);
            const rightSlot = getSlotById(resolvedBattle, entry.rightSlotId);
            if (!leftSlot || !rightSlot) {
                return '';
            }

            const leftUnit = getUnitById(resolvedBattle, leftSlot.unitId);
            const rightUnit = getUnitById(resolvedBattle, rightSlot.unitId);
            const leftSkill = entry.leftSkillId ? getSkillById(leftUnit, entry.leftSkillId) : null;
            const rightSkill = entry.rightSkillId ? getSkillById(rightUnit, entry.rightSkillId) : null;
            const leftPosition = getFieldPosition(leftSlot.side, leftSlot.index);
            const rightPosition = getFieldPosition(rightSlot.side, rightSlot.index);
            const statusLabel = playback.phase === 'approach'
                ? 'Closing In'
                : playback.phase === 'skill-intro'
                    ? 'Skill Reveal'
                    : playback.phase === 'round-reveal'
                        ? `${entry.engagementType === 'clash' ? 'Clash' : 'Defense'} ${playback.roundIndex + 1}`
                        : playback.phase === 'coin-break'
                            ? 'Coin Broken'
                            : playback.phase === 'attack-hit'
                                ? `Attack ${playback.hitIndex + 1}`
                                : 'Resolution';

            return `
                <div class="echoes-battle-panel__playback-overlay">
                    <div class="echoes-battle-panel__playback-banner">
                        <span>Resolving ${playback.entryIndex + 1} / ${playback.totalEntries}</span>
                        <strong>${statusLabel}</strong>
                    </div>
                    ${renderPlaybackValueBadges(leftPosition, rightPosition, playback, entry)}
                    <div class="echoes-battle-panel__playback-panel echoes-battle-panel__playback-panel--left" style="left: ${Math.max(6, leftPosition.x - 8)}%; top: ${Math.max(14, leftPosition.y - 28)}%;">
                        <span>${leftUnit?.name || 'Left Unit'}</span>
                        <strong>${leftSkill?.name || 'No Clash'}</strong>
                        <small>${leftSkill ? `Base ${leftSkill.basePower} | Coin ${leftSkill.coinPower >= 0 ? '+' : ''}${leftSkill.coinPower}` : 'No clash skill'}</small>
                        <div class="echoes-battle-panel__playback-coins">
                            ${renderPlaybackCoinTrack(leftSkill, 'left', playback, entry)}
                        </div>
                    </div>
                    <div class="echoes-battle-panel__playback-panel echoes-battle-panel__playback-panel--right" style="left: ${Math.min(94, rightPosition.x + 8)}%; top: ${Math.max(14, rightPosition.y - 28)}%;">
                        <span>${rightUnit?.name || 'Right Unit'}</span>
                        <strong>${rightSkill?.name || 'No Clash'}</strong>
                        <small>${rightSkill ? `Base ${rightSkill.basePower} | Coin ${rightSkill.coinPower >= 0 ? '+' : ''}${rightSkill.coinPower}` : 'No clash skill'}</small>
                        <div class="echoes-battle-panel__playback-coins">
                            ${renderPlaybackCoinTrack(rightSkill, 'right', playback, entry)}
                        </div>
                    </div>
                </div>
            `;
        }

        function renderResolutionCard(battle, activePlayerSlot, uiState) {
            const playback = uiState?.playback;
            if (playback?.isRunning && playback.entry) {
                const entry = playback.entry;
                return `
                    <div class="echoes-battle-panel__combat-result-card is-resolved is-playback">
                        <span class="echoes-battle-panel__combat-result-label">${entry.engagementType === 'clash' ? 'Clash Playback' : 'Attack Playback'}</span>
                        <strong>${entry.leftUnitName} vs ${entry.rightUnitName}</strong>
                        <small>${entry.engagementType === 'clash' || entry.rightSkillId
                            ? `${entry.leftSkillName} vs ${entry.rightSkillName}`
                            : `${entry.leftSkillId ? entry.leftSkillName : entry.rightSkillName}`}</small>
                    </div>
                `;
            }

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
                : presentation.rightSkillId
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

        function renderResolutionFeed(battle, uiState) {
            const resolvedBattle = getResolvedBattle(battle, uiState);
            const history = Array.isArray(resolvedBattle.resolutionHistory) ? resolvedBattle.resolutionHistory : [];
            if (!history.length) {
                return '<div class="echoes-battle-panel__planner-empty">Resolve the turn to see every clash and attack in order.</div>';
            }

            return history.map((entry, index) => {
                const actorNames = `${entry.leftUnitName} vs ${entry.rightUnitName}`;
                const detail = entry.engagementType === 'clash'
                    ? `${entry.leftSkillName} vs ${entry.rightSkillName}`
                    : entry.rightSkillId
                        ? `${entry.leftSkillName} vs ${entry.rightSkillName}`
                    : entry.leftSkillId
                        ? `${entry.leftUnitName} used ${entry.leftSkillName}`
                        : `${entry.rightUnitName} used ${entry.rightSkillName}`;
                const exchangeCount = entry.engagementType === 'clash'
                    ? `${entry.rounds.length} clash rounds`
                    : `${entry.hits.length} hit${entry.hits.length === 1 ? '' : 's'}`;

                return `
                    <div class="echoes-battle-panel__resolution-feed-card">
                        <span class="echoes-battle-panel__resolution-feed-index">${index + 1}</span>
                        <div class="echoes-battle-panel__resolution-feed-main">
                            <strong>${actorNames}</strong>
                            <small>${detail}</small>
                        </div>
                        <div class="echoes-battle-panel__resolution-feed-side">
                            <span>${entry.engagementType === 'clash' ? 'Clash' : 'Attack'}</span>
                            <strong>${entry.totalDamage}</strong>
                            <small>${exchangeCount}</small>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function renderQueueTrack(battle, uiState) {
            const resolvedBattle = getResolvedBattle(battle, uiState);
            const queueIds = resolvedBattle.phase === 'resolved' && resolvedBattle.resolutionQueue.length
                ? resolvedBattle.resolutionQueue
                : resolvedBattle.speedOrder;

            if (!queueIds.length) {
                return '<div class="echoes-battle-panel__planner-empty">Queue unavailable.</div>';
            }

            return queueIds.map((slotId, index) => {
                const slot = getSlotById(resolvedBattle, slotId);
                const unit = getUnitById(resolvedBattle, slot.unitId);
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
                    const isDefense = isDefenseSkill(skill);
                    const borderUrl = resolveAssetUrl(sharedBorderPath);
                    const tooltipText = escapeAttribute([
                        skill.name,
                        `${getSkillDamageProfileLabel(skill)} | ${getSkillPowerLabel(skill)}`,
                        `${isDefense ? 'Defense' : 'Offense'} ${getSkillOffenseLevel(unit, skill)}`,
                        skill.description,
                    ].join('\n'));

                    return `
                        <button
                            class="echoes-battle-panel__planner-skill${isSelected ? ' is-selected' : ''}${isDefense ? ' is-defense' : ''}"
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
                            <span class="echoes-battle-panel__planner-skill-rank">${isDefense ? skill.name.charAt(0) : index + 1}</span>
                        </button>
                    `;
                })
                .join('');
        }

        function renderDebugRollControls(battle, uiState) {
            const slots = [...battle.playerSlots, ...battle.enemySlots];
            const debugRollState = uiState?.debugRollState || {};
            const scripts = debugRollState.forcedRollScripts || {};
            const indices = debugRollState.activeForcedCoinIndices || {};

            const formatToken = (token) => {
                if (typeof token === 'boolean') {
                    return token ? 'H' : 'T';
                }
                if (token?.type === 'power') {
                    return `P${token.value}`;
                }
                if (token?.type === 'heads') {
                    return `K${token.value}`;
                }
                return '-';
            };

            return slots.map((slot) => {
                const unit = getUnitById(battle, slot.unitId);
                const skill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
                const forcedInput = escapeAttribute(debugRollState.forcedCoinInputs?.[slot.id] || '');
                const script = Array.isArray(scripts[slot.id]) ? scripts[slot.id] : [];
                const activeIndex = indices[slot.id] || 0;
                const remaining = Math.max(0, script.length - activeIndex);
                const nextToken = script[activeIndex];
                const helperLabel = skill
                    ? `${skill.name} | ${getCompactSkillPowerLabel(skill)}`
                    : 'No skill selected yet';

                return `
                    <label class="echoes-battle-panel__debug-roll-card">
                        <span class="echoes-battle-panel__debug-roll-head">
                            <strong>${unit.name}</strong>
                            <small>${slot.side === 'player' ? 'Ally' : 'Enemy'} Slot ${slot.index + 1}</small>
                        </span>
                        <span class="echoes-battle-panel__debug-roll-skill">${helperLabel}</span>
                        <span class="echoes-battle-panel__debug-roll-meta">
                            <small>Next: ${formatToken(nextToken)}</small>
                            <small>Remaining: ${remaining}</small>
                            <button
                                class="echoes-battle-panel__debug-roll-clear"
                                type="button"
                                data-action="debug-roll-clear"
                                data-slot-id="${slot.id}"
                                ${battle.phase !== 'select' ? 'disabled' : ''}
                            >
                                Clear
                            </button>
                        </span>
                        <input
                            class="echoes-battle-panel__debug-roll-input"
                            type="text"
                            value="${forcedInput}"
                            placeholder="P20 K2 H T"
                            data-action="debug-roll-sequence"
                            data-slot-id="${slot.id}"
                            spellcheck="false"
                            ${battle.phase !== 'select' ? 'disabled' : ''}
                        />
                    </label>
                `;
            }).join('');
        }

        function renderTurnDebugOverlay(battle, activePlayerSlot, uiState) {
            if (!uiState?.turnDebugEnabled) {
                return '';
            }

            const resolvedBattle = getResolvedBattle(battle, uiState);
            const allSlots = [...resolvedBattle.playerSlots, ...resolvedBattle.enemySlots];
            const rows = allSlots.map((slot) => {
                const unit = getUnitById(resolvedBattle, slot.unitId);
                const skill = slot.selectedSkillId ? getSkillById(unit, slot.selectedSkillId) : null;
                const targetSlot = slot.targetSlotId ? getSlotById(resolvedBattle, slot.targetSlotId) : null;
                const targetUnit = targetSlot ? getUnitById(resolvedBattle, targetSlot.unitId) : null;
                const isRedirected = slot.side === 'enemy' && slot.intentTargetSlotId && slot.targetSlotId && slot.intentTargetSlotId !== slot.targetSlotId;
                const isActive = activePlayerSlot?.id === slot.id;

                return `
                    <div class="echoes-battle-panel__turn-debug-row${isActive ? ' is-active' : ''}">
                        <span>${slot.side === 'player' ? 'Ally' : 'Enemy'} ${slot.index + 1}</span>
                        <span>${unit?.name || 'Unknown'}</span>
                        <span>SPD ${slot.speed}</span>
                        <span>${skill?.name || '-'}</span>
                        <span>${targetUnit ? `${targetUnit.name} ${targetSlot.index + 1}` : '-'}</span>
                        <span>${isRedirected ? 'Redirected' : ''}</span>
                    </div>
                `;
            }).join('');

            const history = Array.isArray(resolvedBattle.resolutionHistory) ? resolvedBattle.resolutionHistory : [];
            const entries = history.length
                ? history.map((entry, index) => {
                    const label = entry.engagementType === 'clash'
                        ? `${entry.leftUnitName} vs ${entry.rightUnitName} | ${entry.leftSkillName} vs ${entry.rightSkillName}`
                        : entry.leftSkillId
                            ? `${entry.leftUnitName} -> ${entry.rightUnitName} | ${entry.leftSkillName}`
                            : `${entry.rightUnitName} -> ${entry.leftUnitName} | ${entry.rightSkillName}`;
                    return `<div class="echoes-battle-panel__turn-debug-entry"><span>${index + 1}</span><span>${label}</span></div>`;
                }).join('')
                : '<div class="echoes-battle-panel__turn-debug-empty">Resolve to populate resolutionHistory.</div>';

            return `
                <aside class="echoes-battle-panel__turn-debug">
                    <div class="echoes-battle-panel__turn-debug-title">
                        <strong>Turn Debug</strong>
                        <small>State + resolutionHistory</small>
                    </div>
                    <div class="echoes-battle-panel__turn-debug-grid">
                        ${rows}
                    </div>
                    <div class="echoes-battle-panel__turn-debug-history">
                        ${entries}
                    </div>
                </aside>
            `;
        }

        function renderBattlefield(battle, activePlayerSlot, uiState) {
            const debugToolsEnabled = uiState?.debugToolsEnabled !== false;
            const playerMarkup = battle.playerSlots
                .map((slot) => renderFieldUnitWithUiState(battle, getUnitById(battle, slot.unitId), slot, 'player', activePlayerSlot, uiState))
                .join('');
            const enemyMarkup = battle.enemySlots
                .map((slot) => renderFieldUnitWithUiState(battle, getUnitById(battle, slot.unitId), slot, 'enemy', activePlayerSlot, uiState))
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
                            ${debugToolsEnabled
                                ? `
                                    <button
                                        class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost${uiState?.turnDebugEnabled ? ' is-active' : ''}"
                                        type="button"
                                        data-action="toggle-turn-debug"
                                    >
                                        Debug
                                    </button>
                                `
                                : ''}
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="resolve-turn"
                                ${battle.phase !== 'select' || battle.winner || uiState?.isPlaybackRunning ? 'disabled' : ''}
                            >
                                ${uiState?.isPlaybackRunning ? 'Resolving...' : 'Resolve'}
                            </button>
                            <button
                                class="echoes-battle-panel__combat-button"
                                type="button"
                                data-action="next-turn"
                                ${getResolvedBattle(battle, uiState).phase !== 'resolved' || getResolvedBattle(battle, uiState).winner || uiState?.isPlaybackRunning ? 'disabled' : ''}
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
                        ${renderTargetOverlayWithUiState(battle, activePlayerSlot, uiState)}
                        ${renderResolutionCard(getResolvedBattle(battle, uiState), activePlayerSlot, uiState)}
                        ${renderPlaybackOverlay(battle, uiState)}
                        ${renderResolutionBadges(getResolvedBattle(battle, uiState), uiState)}
                        ${renderTurnDebugOverlay(battle, activePlayerSlot, uiState)}
                        ${playerMarkup}
                        ${enemyMarkup}
                    </div>
                </section>
            `;
        }

        function renderPlanner(battle, activePlayerSlot, uiState) {
            const debugToolsEnabled = uiState?.debugToolsEnabled !== false;
            const activeUnit = activePlayerSlot ? getUnitById(battle, activePlayerSlot.unitId) : null;
            const selectedSkill = activePlayerSlot?.selectedSkillId ? getSkillById(activeUnit, activePlayerSlot.selectedSkillId) : null;
            const targetSlot = activePlayerSlot?.targetSlotId ? getSlotById(battle, activePlayerSlot.targetSlotId) : null;
            const targetUnit = targetSlot ? getUnitById(battle, targetSlot.unitId) : null;
            const resolvedBattle = getResolvedBattle(battle, uiState);
            const logMarkup = resolvedBattle.log
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
                            ${selectedSkill && isDefenseSkill(selectedSkill)
                                ? targetUnit
                                    ? `${activeUnit?.name || 'Slot'} will use ${selectedSkill.name} against ${targetUnit.name}.`
                                    : `Drag ${selectedSkill.name} onto an enemy, or click an enemy after selecting it.`
                                : targetUnit
                                ? `${activeUnit?.name || 'Slot'} -> ${targetUnit.name}`
                                : 'Drag a skill onto an enemy, or click an enemy after selecting a skill.'}
                        </div>
                        <div class="echoes-battle-panel__planner-skill-row">
                            ${renderSkillCards(battle, activePlayerSlot)}
                        </div>
                        ${debugToolsEnabled
                            ? `
                                <div class="echoes-battle-panel__planner-debug">
                                    <div class="echoes-battle-panel__planner-heading">
                                        <span>Debug Rolls</span>
                                        <strong>H/T or final value</strong>
                                        <button
                                            class="echoes-battle-panel__planner-debug-clearall"
                                            type="button"
                                            data-action="debug-roll-clear-all"
                                            ${battle.phase !== 'select' ? 'disabled' : ''}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                    <div class="echoes-battle-panel__planner-debug-note">
                                        Script examples: <strong>H T H</strong> (coin faces), <strong>P20</strong> or <strong>20</strong> (force next roll power), <strong>K2</strong> (force 2 heads on next roll).
                                    </div>
                                    <div class="echoes-battle-panel__debug-roll-grid">
                                        ${renderDebugRollControls(battle, uiState)}
                                    </div>
                                </div>
                            `
                            : ''}
                    </div>

                    <aside class="echoes-battle-panel__planner-lane echoes-battle-panel__planner-lane--queue">
                        <div class="echoes-battle-panel__planner-heading">
                            <span>Resolution</span>
                            <strong>${uiState?.isPlaybackRunning ? 'Playing Back' : getPhaseLabel(resolvedBattle)}</strong>
                        </div>
                        <div class="echoes-battle-panel__queue-track">
                            ${renderQueueTrack(battle, uiState)}
                        </div>
                        <div class="echoes-battle-panel__resolution-feed">
                            ${renderResolutionFeed(battle, uiState)}
                        </div>
                        <ol class="echoes-battle-panel__planner-log">
                            ${logMarkup}
                        </ol>
                    </aside>
                </section>
            `;
        }

        function render(battle, uiState = {}) {
            if (!mountElement) {
                return;
            }

            const activePlayerSlot = getActivePlayerSlot(battle);
            mountElement.innerHTML = `
                <div class="echoes-battle-panel__combat-limbus">
                    ${renderBattlefield(battle, activePlayerSlot, uiState)}
                    <div
                        class="echoes-battle-panel__combat-resize-handle"
                        data-resize-handle="battlefield"
                        role="separator"
                        aria-orientation="horizontal"
                        aria-label="Resize battlefield"
                        tabindex="0"
                    >
                        <span></span>
                    </div>
                    ${renderPlanner(battle, activePlayerSlot, uiState)}
                </div>
            `;
        }

        return {
            render,
        };
    }

    battleModules.createBattleRenderer = createBattleRenderer;
})();
