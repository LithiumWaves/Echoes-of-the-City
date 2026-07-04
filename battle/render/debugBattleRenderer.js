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

        function getSkillPowerLabel(skill) {
            return `Base ${skill.basePower} | Coin +${skill.coinPower} | ${skill.coinCount} Coins`;
        }

        function getCompactSkillPowerLabel(skill) {
            return `${skill.basePower} +${skill.coinPower} (${skill.coinCount} Coins)`;
        }

        function getSkillById(unit, skillId) {
            return unit.skills.find((skill) => skill.id === skillId) || null;
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
                poise: 'Poise',
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

                if (status.id === 'protection') {
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

        function renderClashStage(battle, selectedSkill, enemySkill) {
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
                const valueMarkup = status.id === 'protection'
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
                    ${renderStatusStrip(unit)}
                    <div class="echoes-battle-panel__combat-resistances">
                        ${resistanceMarkup}
                    </div>
                </section>
            `;
        }

        function render(battle) {
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
                        ${renderClashStage(battle, selectedSkill, enemySkill)}
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

        return {
            render,
        };
    };
})();
