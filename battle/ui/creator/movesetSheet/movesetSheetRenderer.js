(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const SIN_COLORS = {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#4a90c4',
        pride: '#9b59b6',
        envy: '#2ecc71',
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
        const variantPriority = Number(skill?.variantPriority);
        const showSection = conditions.length > 0
            || (Number.isFinite(variantPriority) && variantPriority > 0);

        if (!showSection) {
            return '';
        }

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
            <details class="echoes-moveset__variant-conditions" open>
                <summary class="echoes-moveset__lane-title">Variant activation (all conditions must pass)</summary>
                <div class="echoes-moveset__variant-conditions-body">
                    ${conditionRows || '<span class="echoes-creator__hint">No conditions — this variant is inactive until you add one.</span>'}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-skill-variant-add-condition" data-skill-index="${skillIndex}">+ Add condition</button>
                </div>
            </details>
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
            return `<select ${attrs} style="width:100%;">${creatorUi.buildSelectOptions(options, selected, escapeAttr)}</select>`;
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

        return `
            <article class="echoes-moveset__skill-card echoes-moveset__skill-card--lc" style="--echoes-lc-sin-color:${sinColor};">
                <header class="echoes-moveset__skill-header">
                    <div class="echoes-moveset__skill-sin echoes-lc-hex" style="background:${sinColor};">${escapeHtml(String(sinType).charAt(0).toUpperCase())}</div>
                    <div class="echoes-moveset__skill-title-wrap">
                        <input class="echoes-moveset__skill-name" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="name" value="${escapeAttr(String(skill?.name || ''))}" placeholder="Skill name" />
                        <input class="echoes-moveset__skill-id" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="id" value="${escapeAttr(String(skill?.id || ''))}" placeholder="skill-id" />
                    </div>
                    <div class="echoes-moveset__coin-pips">${renderCoinPips(coinCount, sinType)}</div>
                </header>
                <div class="echoes-moveset__skill-stats">
                    <label>Base<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="basePower" inputmode="numeric" value="${escapeAttr(String(skill?.basePower ?? 0))}" /></label>
                    <label>Coin<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinPower" inputmode="numeric" value="${escapeAttr(String(skill?.coinPower ?? 0))}" /></label>
                    <label>Coins<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinCount" inputmode="numeric" value="${escapeAttr(String(skill?.coinCount ?? 1))}" /></label>
                    <label>Wt<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="attackWeight" inputmode="numeric" value="${escapeAttr(String(skill?.attackWeight ?? ''))}" placeholder="1" /></label>
                    <label>Off<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="offenseLevel" inputmode="numeric" value="${escapeAttr(String(skill?.offenseLevel ?? ''))}" placeholder="—" /></label>
                </div>
                <div class="echoes-moveset__skill-meta echoes-moveset__skill-stats">
                    <label>Type</label>${buildSelect(skillTypes, skill?.skillType || 'attack', `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillType"`)}
                    <label>Dmg</label>${buildSelect(damageTypes, skill?.damageType || 'slash', `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="damageType"`)}
                    <label>Sin</label>${buildSelect(sinTypes, sinType, `data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="sinType"`)}
                </div>
                <div class="echoes-moveset__skill-variant-row">
                    <label>Slot<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillSlot" value="${escapeAttr(String(skill?.skillSlot || ''))}" placeholder="slot-1" /></label>
                    <label>Variant prio<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="variantPriority" inputmode="numeric" value="${escapeAttr(String(skill?.variantPriority ?? ''))}" placeholder="0" /></label>
                    <label class="echoes-creator__checkbox"><input type="checkbox" data-action="creator-unit-skill-toggle" data-index="${skillIndex}" data-field="showInPlanner" ${!hiddenInPlanner ? 'checked' : ''} /> Show in planner</label>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-skill-add-variant" data-index="${skillIndex}">+ Variant</button>
                </div>
                ${renderVariantConditionsSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)}
                ${followUpEffect ? `<div class="echoes-creator__hint">Follow-up: ${escapeHtml(String(followUpEffect.skillId || ''))}</div>` : ''}
                <textarea class="echoes-moveset__skill-desc" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="description" rows="2" placeholder="Player-facing description">${escapeHtml(String(skill?.description || ''))}</textarea>
                <div class="echoes-moveset__lanes">
                    ${staticLanes}
                    ${allCoinLane}
                    ${coinLanes}
                </div>
                <footer class="echoes-moveset__skill-footer">
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-remove-skill" data-index="${skillIndex}">Remove skill</button>
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

    function renderMovesetSheet(unitDraft, catalog, creatorUi, escapeAttr, escapeHtml) {
        const skills = Array.isArray(unitDraft?.skills) ? unitDraft.skills : [];
        const passives = Array.isArray(unitDraft?.passives) ? unitDraft.passives : [];
        const statusList = catalog?.statusList || [];

        const skillCards = skills.map((skill, index) => renderSkillCard(skill, index, catalog, creatorUi, escapeAttr, escapeHtml)).join('');
        const passiveCards = passives.map((passive, index) => renderPassiveCard(passive, index, catalog, creatorUi, escapeAttr, escapeHtml)).join('');

        return `
            <div class="echoes-moveset">
                <div class="echoes-moveset__toolbar echoes-editor-workshop__action-bar">
                    <button class="echoes-editor-workshop__action" type="button" data-action="creator-unit-add-skill">+ Skill card</button>
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-add-passive">+ Passive</button>
                </div>
                <div class="echoes-moveset__body">
                    <div class="echoes-moveset__skills-column">
                        <h3 class="echoes-moveset__column-title">Skills</h3>
                        <div class="echoes-moveset__skills-row">
                            ${skillCards || '<span class="echoes-creator__hint">Add a skill to start building your moveset.</span>'}
                        </div>
                    </div>
                    <div class="echoes-moveset__side-column">
                        <section class="echoes-moveset__passives">
                            <h3 class="echoes-moveset__column-title">Passives</h3>
                            ${passiveCards || '<span class="echoes-creator__hint">No passives yet.</span>'}
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
