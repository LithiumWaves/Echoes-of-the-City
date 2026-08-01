(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const sinPalette = battleModules.sinColors || window.EchoesOfTheCitySinColors || {};
    const SIN_COLORS = sinPalette.SIN_COLORS || {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#6eb8e8',
        pride: '#1e3a6e',
        envy: '#9b59b6',
    };

    const STATIC_PHASE_LANES = [
        { key: 'onSelect', label: 'Combat Start' },
        { key: 'onUse', label: 'On Use' },
        { key: 'onClashWin', label: 'Clash Win' },
        { key: 'onClashLose', label: 'Clash Lose' },
        { key: 'onAttackEnd', label: 'Attack End' },
    ];

    function groupEffectsForLanes(effects, coinCount) {
        const groups = {
            onSelect: [],
            onUse: [],
            onClashWin: [],
            onClashLose: [],
            onAttackEnd: [],
            onHitAll: [],
            coins: {},
        };
        const maxCoins = Math.max(1, Number(coinCount) || 1);
        for (let coin = 1; coin <= maxCoins; coin += 1) {
            groups.coins[coin] = [];
        }
        (Array.isArray(effects) ? effects : []).forEach((effect, effectIndex) => {
            const trigger = effect?.trigger || 'onHit';
            if (trigger === 'onHit') {
                const coinIndex = Number(effect?.coinIndex);
                if (Number.isInteger(coinIndex) && coinIndex > 0 && groups.coins[coinIndex]) {
                    groups.coins[coinIndex].push({ effect, effectIndex });
                } else {
                    groups.onHitAll.push({ effect, effectIndex });
                }
                return;
            }
            if (groups[trigger]) {
                groups[trigger].push({ effect, effectIndex });
            }
        });
        return groups;
    }

    function renderCoinPips(coinCount, sinType) {
        const count = Math.max(1, Number(coinCount) || 1);
        const color = SIN_COLORS[sinType] || '#888';
        return Array.from({ length: count }, () => `
            <span class="echoes-moveset__coin-pip" style="background:${color};"></span>
        `).join('');
    }

    function renderPhaseLane(laneKey, laneLabel, entries, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, options = {}) {
        const coinIndex = options.coinIndex || null;
        const cards = entries.map(({ effect, effectIndex }) => {
            const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
            return `
                <div class="echoes-moveset__lane-effect">
                    ${creatorUi.renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs, { showFilters: true })}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove</button>
                </div>
            `;
        }).join('');

        const triggerKey = laneKey;
        const detailsLaneKey = coinIndex ? `${skillIndex}-${triggerKey}-coin-${coinIndex}` : `${skillIndex}-${triggerKey}`;

        return `
            <details class="echoes-moveset__lane" data-lane-key="${escapeAttr(detailsLaneKey)}" ${entries.length ? 'open' : ''}>
                <summary class="echoes-moveset__lane-title">${escapeHtml(laneLabel)}</summary>
                <div class="echoes-moveset__lane-body">
                    ${cards || '<span class="echoes-creator__hint">No effects in this phase.</span>'}
                    <button
                        class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost echoes-moveset__lane-add-effect"
                        type="button"
                        data-creator-action="lane-add-effect"
                        data-skill-index="${skillIndex}"
                        data-trigger="${escapeAttr(triggerKey)}"
                        ${coinIndex ? `data-coin-index="${coinIndex}"` : ''}
                        data-lane-key="${escapeAttr(detailsLaneKey)}"
                    >+ Add effect</button>
                </div>
            </details>
        `;
    }

    function renderVariantConditionsSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const conditions = Array.isArray(skill?.variantConditions) ? skill.variantConditions : [];
        const conditionRows = conditions.map((condition, condIndex) => {
            const fieldAttrs = `data-action="creator-skill-variant-condition-field" data-skill-index="${skillIndex}" data-condition-index="${condIndex}"`;
            return `
                <div class="echoes-creator__condition-wrap">
                    ${creatorUi.renderConditionRow(condition, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-skill-variant-remove-condition" data-skill-index="${skillIndex}" data-condition-index="${condIndex}">Remove condition</button>
                </div>
            `;
        }).join('');

        return `
            <details class="echoes-moveset__variant-conditions" ${conditions.length ? 'open' : ''}>
                <summary class="echoes-moveset__section-summary">Variant unlock conditions</summary>
                <div class="echoes-moveset__variant-conditions-body">
                    <p class="echoes-creator__hint">Use this when this skill replaces another in the same slot (e.g. at 12 Reading, show Prod the Weakness). All conditions must pass.</p>
                    ${conditionRows || '<span class="echoes-creator__hint">No conditions yet — base skill stays active without them.</span>'}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-skill-variant-add-condition" data-skill-index="${skillIndex}">+ Add condition</button>
                </div>
            </details>
        `;
    }

    function renderSkillQuickAddBar(skillIndex, creatorUi, escapeAttr, escapeHtml) {
        const presets = Array.isArray(creatorUi?.SKILL_EFFECT_PRESETS) ? creatorUi.SKILL_EFFECT_PRESETS : [];
        const presetOptions = presets.map((preset, index) => `
            <option value="${index}">${escapeHtml(preset.label)}</option>
        `).join('');

        return `
            <div class="echoes-moveset__quick-add">
                <label class="echoes-moveset__quick-add-label">Quick add effect</label>
                <div class="echoes-moveset__quick-add-row">
                    <select data-action="creator-skill-preset-pick" data-skill-index="${skillIndex}">
                        <option value="">— Pick a common pattern —</option>
                        ${presetOptions}
                    </select>
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-add-preset" data-skill-index="${skillIndex}">Add</button>
                </div>
            </div>
        `;
    }

    function renderSkillCard(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const sinType = skill?.sinType || 'wrath';
        const sinColor = SIN_COLORS[sinType] || '#888';
        const coinCount = Math.max(1, Number(skill?.coinCount) || 1);
        const lanes = groupEffectsForLanes(skill?.effects, coinCount);
        const skillTypes = catalog.skillTypes || [];
        const damageTypes = catalog.damageTypes || [];
        const sinTypes = catalog.sinTypes || [];

        const buildSelect = (options, selected, attrs) => {
            return `<select ${attrs}>${creatorUi.buildSelectOptions(options, selected, escapeAttr)}</select>`;
        };

        const staticLanes = STATIC_PHASE_LANES.map((lane) => renderPhaseLane(
            lane.key,
            lane.label,
            lanes[lane.key],
            skillIndex,
            catalog,
            creatorUi,
            escapeAttr,
            escapeHtml,
        )).join('');

        const coinLanes = Object.entries(lanes.coins).map(([coin, entries]) => renderPhaseLane(
            'onHit',
            `Coin ${coin} On Hit`,
            entries,
            skillIndex,
            catalog,
            creatorUi,
            escapeAttr,
            escapeHtml,
            { coinIndex: Number(coin) },
        )).join('');

        const allCoinLane = lanes.onHitAll.length
            ? renderPhaseLane('onHit', 'All Coins On Hit', lanes.onHitAll, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)
            : '';

        const followUpEffect = (Array.isArray(skill?.effects) ? skill.effects : []).find((effect) => effect?.type === 'setFollowUpSkill');
        const hiddenInPlanner = skill?.showInPlanner === false;
        const cannotClash = Boolean(skill?.cannotClash);
        const skipDefenseSkills = Boolean(skill?.skipDefenseSkills);
        const targeting = skill?.targeting || '';
        const skillTags = Array.isArray(skill?.tags) ? skill.tags.join(', ') : '';
        const unbreakableCoins = Array.isArray(skill?.unbreakableCoins) ? skill.unbreakableCoins.join(', ') : '';

        const targetingOptions = [
            { value: '', label: 'Normal (manual / AI pick)' },
            { value: 'indiscriminate', label: 'Indiscriminate (random up to Wt)' },
            { value: 'highestMaxPower', label: 'Highest max power' },
        ];

        return `
            <article class="echoes-moveset__skill-card echoes-moveset__skill-card--lc" style="--echoes-lc-sin-color:${sinColor};">
                <header class="echoes-moveset__skill-header">
                    <div class="echoes-moveset__skill-sin echoes-lc-hex" style="background:${sinColor};">${escapeHtml(String(sinType).charAt(0).toUpperCase())}</div>
                    <div class="echoes-moveset__skill-title-wrap">
                        <input class="echoes-moveset__skill-name" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="name" value="${escapeAttr(String(skill?.name || ''))}" placeholder="Skill name" />
                        <input class="echoes-moveset__skill-id" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="id" value="${escapeAttr(String(skill?.id || ''))}" placeholder="skill-id" />
                    </div>
                    <div class="echoes-moveset__coin-pips" title="Coin count">${renderCoinPips(coinCount, sinType)}</div>
                </header>

                <section class="echoes-moveset__skill-section">
                    <h4 class="echoes-moveset__section-title">Power</h4>
                    <div class="echoes-moveset__skill-stats echoes-moveset__skill-stats--power">
                        <label>Base power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="basePower" inputmode="numeric" value="${escapeAttr(String(skill?.basePower ?? 0))}" /></label>
                        <label>Coin power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinPower" inputmode="numeric" value="${escapeAttr(String(skill?.coinPower ?? 0))}" /></label>
                        <label>Coin count<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinCount" inputmode="numeric" value="${escapeAttr(String(skill?.coinCount ?? 1))}" /></label>
                        <label>Attack weight<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="attackWeight" inputmode="numeric" value="${escapeAttr(String(skill?.attackWeight ?? ''))}" placeholder="1" /></label>
                        <label>Offense level<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="offenseLevel" inputmode="numeric" value="${escapeAttr(String(skill?.offenseLevel ?? ''))}" placeholder="—" /></label>
                    </div>
                </section>

                <section class="echoes-moveset__skill-section">
                    <h4 class="echoes-moveset__section-title">Identity</h4>
                    <div class="echoes-moveset__skill-stats echoes-moveset__skill-stats--identity">
                        <label>Skill type${buildSelect(skillTypes, skill?.skillType || 'attack', `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillType"`)}</label>
                        <label>Damage type${buildSelect(damageTypes, skill?.damageType || 'slash', `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="damageType"`)}</label>
                        <label>Sin affinity${buildSelect(sinTypes, sinType, `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="sinType"`)}</label>
                        <label>Planner slot<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillSlot" value="${escapeAttr(String(skill?.skillSlot || ''))}" placeholder="slot-1 / defense" /></label>
                    </div>
                </section>

                <section class="echoes-moveset__skill-section">
                    <h4 class="echoes-moveset__section-title">Planner &amp; combat</h4>
                    <div class="echoes-moveset__skill-flags">
                        <label class="echoes-creator__checkbox"><input type="checkbox" data-action="creator-unit-skill-toggle" data-index="${skillIndex}" data-field="showInPlanner" ${!hiddenInPlanner ? 'checked' : ''} /> Show in planner</label>
                        <label class="echoes-creator__checkbox"><input type="checkbox" data-action="creator-unit-skill-toggle" data-index="${skillIndex}" data-field="cannotClash" ${cannotClash ? 'checked' : ''} /> Cannot clash</label>
                        <label class="echoes-creator__checkbox"><input type="checkbox" data-action="creator-unit-skill-toggle" data-index="${skillIndex}" data-field="skipDefenseSkills" ${skipDefenseSkills ? 'checked' : ''} /> Skip defense skills</label>
                    </div>
                    <div class="echoes-moveset__skill-stats echoes-moveset__skill-stats--combat">
                        <label>Targeting${buildSelect(targetingOptions, targeting, `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="targeting"`)}</label>
                        <label>Variant priority<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="variantPriority" inputmode="numeric" value="${escapeAttr(String(skill?.variantPriority ?? ''))}" placeholder="0" /></label>
                        <label>Tags<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="tags" value="${escapeAttr(skillTags)}" placeholder="skill-3" /></label>
                        <label>Unbreakable coins<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="unbreakableCoins" value="${escapeAttr(unbreakableCoins)}" placeholder="2, 3" /></label>
                    </div>
                    <div class="echoes-moveset__skill-variant-actions">
                        <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-skill-add-variant" data-index="${skillIndex}">+ Duplicate as variant</button>
                    </div>
                </section>

                ${renderVariantConditionsSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)}
                ${followUpEffect ? `<div class="echoes-moveset__follow-up-note">Follow-up skill: <code>${escapeHtml(String(followUpEffect.skillId || ''))}</code></div>` : ''}

                <section class="echoes-moveset__skill-section">
                    <h4 class="echoes-moveset__section-title">Description</h4>
                    <textarea class="echoes-moveset__skill-desc" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="description" rows="2" placeholder="Player-facing description">${escapeHtml(String(skill?.description || ''))}</textarea>
                </section>

                <section class="echoes-moveset__skill-section echoes-moveset__skill-section--effects">
                    <h4 class="echoes-moveset__section-title">Effects by combat phase</h4>
                    <p class="echoes-creator__hint">Add consume / coin power / status gates with Quick add, or open a phase and customize. Open <strong>When this runs</strong> on any effect for “at X+ status” gates.</p>
                    ${renderSkillQuickAddBar(skillIndex, creatorUi, escapeAttr, escapeHtml)}
                    <div class="echoes-moveset__lanes">
                        ${staticLanes}
                        ${allCoinLane}
                        ${coinLanes}
                    </div>
                </section>

                <footer class="echoes-moveset__skill-footer">
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-remove-skill" data-index="${skillIndex}">Remove skill</button>
                </footer>
            </article>
        `;
    }

    function renderPassiveRequirementBadge(passive, escapeAttr) {
        const requirements = passive?.requirements;
        if (!requirements || typeof requirements !== 'object') {
            return '<span class="echoes-moveset__passive-badge echoes-moveset__passive-badge--owned">Owned</span>';
        }
        if (requirements.owned) {
            return '<span class="echoes-moveset__passive-badge echoes-moveset__passive-badge--owned">Owned</span>';
        }
        const resonance = requirements.resonance;
        if (resonance?.sinType) {
            const minimum = resonance.minimum ?? resonance.value ?? 0;
            return `<span class="echoes-moveset__passive-badge echoes-moveset__passive-badge--resonance">×${minimum} ${escapeAttr(resonance.sinType)} Resonance</span>`;
        }
        return '';
    }

    function renderPassiveCard(passive, passiveIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const requirements = passive?.requirements || {};
        return `
            <article class="echoes-moveset__passive-card">
                <header class="echoes-moveset__passive-header">
                    <span class="echoes-moveset__passive-number">PASSIVE ${passiveIndex + 1}</span>
                    ${renderPassiveRequirementBadge(passive, escapeAttr)}
                </header>
                <input class="echoes-moveset__passive-name" data-action="creator-unit-passive-field" data-index="${passiveIndex}" data-field="name" value="${escapeAttr(String(passive?.name || ''))}" placeholder="Passive name" />
                <input class="echoes-moveset__passive-id" data-action="creator-unit-passive-field" data-index="${passiveIndex}" data-field="id" value="${escapeAttr(String(passive?.id || ''))}" placeholder="passive-id" />
                <div class="echoes-moveset__passive-req-row">
                    <label class="echoes-creator__checkbox"><input type="checkbox" data-action="creator-passive-req" data-index="${passiveIndex}" data-field="owned" ${requirements.owned ? 'checked' : ''} /> Owned passive</label>
                    <label>Resonance sin<select data-action="creator-passive-req" data-index="${passiveIndex}" data-field="resonanceSinType" style="width:100%;">
                        <option value="">—</option>
                        ${(catalog.sinTypes || []).map((sin) => `<option value="${escapeAttr(sin)}" ${requirements.resonance?.sinType === sin ? 'selected' : ''}>${escapeAttr(sin)}</option>`).join('')}
                    </select></label>
                    <label>Min<input data-action="creator-passive-req" data-index="${passiveIndex}" data-field="resonanceMinimum" inputmode="numeric" value="${escapeAttr(String(requirements.resonance?.minimum ?? requirements.resonance?.value ?? ''))}" placeholder="3" /></label>
                </div>
                <textarea data-action="creator-unit-passive-field" data-index="${passiveIndex}" data-field="description" rows="2" placeholder="Description">${escapeHtml(String(passive?.description || ''))}</textarea>
                <div class="echoes-moveset__passive-hooks">
                    ${creatorUi.renderHooksEditor(
                        passive?.hooks || {},
                        catalog,
                        escapeAttr,
                        escapeHtml,
                        `data-creator-scope="unit-passive" data-passive-index="${passiveIndex}"`,
                    )}
                </div>
                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-remove-passive" data-index="${passiveIndex}">Remove passive</button>
            </article>
        `;
    }

    function renderMechanicsPanel(statusList, escapeAttr, escapeHtml) {
        const entries = (statusList || []).map((status) => `
            <details class="echoes-moveset__mechanic-entry">
                <summary><strong>${escapeHtml(status.label || status.name || status.id)}</strong> <code>${escapeHtml(status.id)}</code></summary>
                <p class="echoes-creator__hint">${escapeHtml(String(status.description || 'No description.'))}</p>
            </details>
        `).join('');

        return `
            <section class="echoes-moveset__mechanics">
                <h3 class="echoes-moveset__column-title">Status Effects reference</h3>
                <p class="echoes-creator__hint">Status Effects from your workshop catalog — reference these IDs in skill effects and passives.</p>
                <div class="echoes-moveset__mechanics-list">
                    ${entries || '<span class="echoes-creator__hint">Save statuses to the workshop to list them here.</span>'}
                </div>
            </section>
        `;
    }

    function renderMovesetSheet(unitDraft, catalog, creatorUi, escapeAttr, escapeHtml, options = {}) {
        const passives = Array.isArray(unitDraft?.passives) ? unitDraft.passives : [];
        const statusList = catalog?.statusList || [];
        const skillInspector = battleModules.skillInspector || window.EchoesOfTheCitySkillInspector || {};
        const inspectorHtml = skillInspector.renderSkillInspector?.(
            unitDraft,
            catalog,
            creatorUi,
            escapeAttr,
            escapeHtml,
            { selectedSkillIndex: options.selectedSkillIndex },
        ) || '<p class="echoes-creator__hint">Skill inspector failed to load.</p>';
        const passiveCards = passives.map((passive, index) => renderPassiveCard(passive, index, catalog, creatorUi, escapeAttr, escapeHtml)).join('');

        return `
            <div class="echoes-moveset">
                <div class="echoes-moveset__toolbar echoes-editor-workshop__action-bar">
                    <button class="echoes-editor-workshop__action" type="button" data-action="creator-unit-add-skill">+ Skill card</button>
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-add-passive">+ Passive</button>
                </div>
                <div class="echoes-moveset__body echoes-moveset__body--kit">
                    <div class="echoes-moveset__inspector-column">
                        ${inspectorHtml}
                    </div>
                    <div class="echoes-moveset__side-column">
                        <section class="echoes-moveset__passives">
                            <h3 class="echoes-moveset__column-title">Passives (edit)</h3>
                            ${passiveCards || '<span class="echoes-creator__hint">No passives yet. Kit preview shows passive cards on the right.</span>'}
                        </section>
                        ${renderMechanicsPanel(statusList, escapeAttr, escapeHtml)}
                    </div>
                </div>
            </div>
        `;
    }

    const MovesetSheet = {
        SIN_COLORS,
        groupEffectsForLanes,
        renderMovesetSheet,
        renderSkillCard,
        renderPassiveCard,
        renderMechanicsPanel,
        renderVariantConditionsSection,
    };

    battleModules.movesetSheet = MovesetSheet;
    window.EchoesOfTheCityMovesetSheet = MovesetSheet;
})();
