(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const iconPickers = battleModules.iconPickers || window.EchoesOfTheCityIconPickers || {};
    const patterns = battleModules.skillEffectPatterns || window.EchoesOfTheCitySkillEffectPatterns || {};
    const skillPreview = battleModules.skillPreview || window.EchoesOfTheCitySkillPreview || {};
    const movesetSheet = battleModules.movesetSheet || window.EchoesOfTheCityMovesetSheet || {};
    const SIN_COLORS = iconPickers.SIN_COLORS || movesetSheet.SIN_COLORS || {};

    function renderSkillListRail(skills, selectedSkillIndex, escapeAttr, escapeHtml) {
        const entries = skills.map((skill, index) => {
            const sinType = skill?.sinType || 'wrath';
            const sinColor = SIN_COLORS[sinType] || '#888';
            const isActive = index === selectedSkillIndex;
            const label = skill?.plannerLabel || skill?.name || skill?.id || `Skill ${index + 1}`;
            return `
                <button
                    class="echoes-skill-inspector__list-item${isActive ? ' is-active' : ''}"
                    type="button"
                    data-action="creator-skill-select"
                    data-index="${index}"
                    title="${escapeAttr(label)}"
                >
                    <span class="echoes-skill-inspector__list-sin echoes-lc-hex" style="background:${sinColor};">${escapeHtml(String(sinType).charAt(0).toUpperCase())}</span>
                    <span class="echoes-skill-inspector__list-label">${escapeHtml(label)}</span>
                </button>
            `;
        }).join('');

        return `
            <nav class="echoes-skill-inspector__list" aria-label="Skills">
                ${entries || '<span class="echoes-creator__hint">No skills yet.</span>'}
            </nav>
        `;
    }

    function renderPatternOptions(scope, escapeHtml) {
        const list = patterns.listPatterns?.(scope) || [];
        return list.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join('');
    }

    function renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, patternsApi) {
        const { effect, index: effectIndex } = entry;
        const humanLine = patternsApi.describeEffect(effect, catalog);
        const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
        return `
            <div class="echoes-skill-sentence">
                <div class="echoes-skill-sentence__summary">
                    <p class="echoes-skill-sentence__line">${escapeHtml(humanLine)}</p>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove</button>
                </div>
                <details class="echoes-skill-sentence__expert">
                    <summary>Expert JSON fields</summary>
                    <div class="echoes-skill-sentence__expert-body">
                        ${creatorUi.renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs, { showFilters: true })}
                    </div>
                </details>
            </div>
        `;
    }

    function renderOnUseSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const groups = patterns.groupEffectsForDisplay?.(skill?.effects) || { onUse: [], onAttackEnd: [] };
        const onUseRows = groups.onUse.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, patterns)).join('');
        const attackEndRows = groups.onAttackEnd.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, patterns)).join('');

        return `
            <section class="echoes-skill-inspector__sentence-section">
                <header class="echoes-skill-inspector__sentence-header">
                    <h4>On Use</h4>
                    <div class="echoes-skill-inspector__pattern-add">
                        <select data-action="creator-skill-pattern-pick" data-skill-index="${skillIndex}" data-scope="onSelect">
                            <option value="">— Add pattern —</option>
                            ${renderPatternOptions('onSelect', escapeHtml)}
                            ${renderPatternOptions('onAttackEnd', escapeHtml)}
                        </select>
                        <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-add-pattern" data-skill-index="${skillIndex}" data-scope="onSelect">Add</button>
                    </div>
                </header>
                <p class="echoes-creator__hint">Patterns compile to engine <code>effects[]</code>. Slot aggro applies on attack end; bonus may persist until engine clears it each turn.</p>
                <div class="echoes-skill-sentence-list">
                    ${onUseRows || '<span class="echoes-creator__hint">No On Use effects.</span>'}
                </div>
                ${attackEndRows ? `
                    <h5 class="echoes-skill-inspector__subheading">After attack</h5>
                    <div class="echoes-skill-sentence-list">${attackEndRows}</div>
                ` : ''}
            </section>
        `;
    }

    function renderOnHitSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const coinCount = Math.max(1, Number(skill?.coinCount) || 1);
        const groups = patterns.groupEffectsForDisplay?.(skill?.effects) || { byCoin: {} };
        const coinTabs = Array.from({ length: coinCount }, (_, idx) => {
            const coin = idx + 1;
            const entries = groups.byCoin[coin] || [];
            const rows = entries.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, patterns)).join('');
            return `
                <div class="echoes-skill-inspector__coin-panel" data-coin-panel="${coin}">
                    <header class="echoes-skill-inspector__sentence-header">
                        <h5>Coin ${coin} On Hit</h5>
                        <div class="echoes-skill-inspector__pattern-add">
                            <select data-action="creator-skill-pattern-pick" data-skill-index="${skillIndex}" data-scope="onHit" data-coin-index="${coin}">
                                <option value="">— Add pattern —</option>
                                ${renderPatternOptions('onHit', escapeHtml)}
                            </select>
                            <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-add-pattern" data-skill-index="${skillIndex}" data-scope="onHit" data-coin-index="${coin}">Add</button>
                        </div>
                    </header>
                    <p class="echoes-creator__hint">33% branch uses weighted actions — not a literal 1d3 roll.</p>
                    <div class="echoes-skill-sentence-list">
                        ${rows || '<span class="echoes-creator__hint">No on-hit effects for this coin.</span>'}
                    </div>
                </div>
            `;
        }).join('');

        const allCoinEntries = groups.byCoin[0] || [];
        const allCoinRows = allCoinEntries.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml, patterns)).join('');

        return `
            <section class="echoes-skill-inspector__sentence-section">
                <h4>On Hit (per coin)</h4>
                <div class="echoes-skill-inspector__coin-tabs">
                    ${coinTabs}
                </div>
                ${allCoinRows ? `
                    <h5 class="echoes-skill-inspector__subheading">All coins</h5>
                    <div class="echoes-skill-sentence-list">${allCoinRows}</div>
                ` : ''}
            </section>
        `;
    }

    function renderInspectorForm(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const buildSelect = (options, selected, attrs) => {
            return `<select ${attrs}>${creatorUi.buildSelectOptions(options, selected, escapeAttr)}</select>`;
        };

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
            <div class="echoes-skill-inspector__form">
                <section class="echoes-skill-inspector__identity">
                    <h4>Identity</h4>
                    <div class="echoes-skill-inspector__pickers">
                        ${iconPickers.renderSinPicker?.(skill?.sinType || 'wrath', skillIndex, escapeAttr) || ''}
                        ${iconPickers.renderDamagePicker?.(skill?.damageType || 'slash', skillIndex, escapeAttr) || ''}
                        ${iconPickers.renderSkillTypePicker?.(skill?.skillType || 'attack', skillIndex, escapeAttr) || ''}
                    </div>
                </section>

                <section class="echoes-skill-inspector__stats">
                    <h4>Stats</h4>
                    <div class="echoes-skill-inspector__stats-grid">
                        <label>Label<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="plannerLabel" value="${escapeAttr(String(skill?.plannerLabel || ''))}" placeholder="SKILL 1" /></label>
                        <label>Name<input class="echoes-skill-inspector__name" data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="name" value="${escapeAttr(String(skill?.name || ''))}" placeholder="Skill name" /></label>
                        <label>ID<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="id" value="${escapeAttr(String(skill?.id || ''))}" placeholder="skill-id" /></label>
                        <label>Base power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="basePower" inputmode="numeric" value="${escapeAttr(String(skill?.basePower ?? 0))}" /></label>
                        <label>Coin power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinPower" inputmode="numeric" value="${escapeAttr(String(skill?.coinPower ?? 0))}" /></label>
                        <label>Coin count<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinCount" inputmode="numeric" value="${escapeAttr(String(skill?.coinCount ?? 1))}" /></label>
                        <label>Offense level<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="offenseLevel" inputmode="numeric" value="${escapeAttr(String(skill?.offenseLevel ?? ''))}" placeholder="—" /></label>
                        <label>Attack weight<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="attackWeight" inputmode="numeric" value="${escapeAttr(String(skill?.attackWeight ?? ''))}" placeholder="1" /></label>
                        <label>Deck amount<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="deckCount" inputmode="numeric" value="${escapeAttr(String(skill?.deckCount ?? ''))}" placeholder="—" /></label>
                        <label>Planner slot<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillSlot" value="${escapeAttr(String(skill?.skillSlot || ''))}" placeholder="slot-1 / defense" /></label>
                    </div>
                </section>

                <section class="echoes-skill-inspector__description">
                    <header class="echoes-skill-inspector__sentence-header">
                        <h4>Player description</h4>
                        <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-skill-sync-description" data-skill-index="${skillIndex}">Sync from effects</button>
                    </header>
                    <textarea data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="description" rows="4" placeholder="Player-facing description">${escapeHtml(String(skill?.description || ''))}</textarea>
                </section>

                ${renderOnUseSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)}
                ${renderOnHitSection(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)}

                <details class="echoes-skill-inspector__advanced">
                    <summary>Planner &amp; combat options</summary>
                    <div class="echoes-skill-inspector__advanced-body">
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
                        ${movesetSheet.renderVariantConditionsSection?.(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) || ''}
                    </div>
                </details>

                <footer class="echoes-skill-inspector__footer">
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-remove-skill" data-index="${skillIndex}">Remove skill</button>
                </footer>
            </div>
        `;
    }

    function renderSkillInspector(unitDraft, catalog, creatorUi, escapeAttr, escapeHtml, options = {}) {
        const skills = Array.isArray(unitDraft?.skills) ? unitDraft.skills : [];
        let selectedSkillIndex = Number.isInteger(options.selectedSkillIndex) ? options.selectedSkillIndex : 0;
        if (selectedSkillIndex < 0 || selectedSkillIndex >= skills.length) {
            selectedSkillIndex = skills.length ? 0 : -1;
        }

        const skill = selectedSkillIndex >= 0 ? skills[selectedSkillIndex] : null;

        return `
            <div class="echoes-skill-inspector">
                ${renderSkillListRail(skills, selectedSkillIndex, escapeAttr, escapeHtml)}
                <div class="echoes-skill-inspector__center">
                    ${skill
                        ? renderInspectorForm(skill, selectedSkillIndex, catalog, creatorUi, escapeAttr, escapeHtml)
                        : '<p class="echoes-creator__hint">Add a skill card to start authoring.</p>'}
                </div>
                <div class="echoes-skill-inspector__preview-wrap">
                    ${skill
                        ? skillPreview.renderSkillPreview?.(skill, catalog, escapeAttr, escapeHtml) || ''
                        : '<aside class="echoes-skill-preview echoes-skill-preview--empty"><p class="echoes-creator__hint">Preview appears when a skill is selected.</p></aside>'}
                </div>
            </div>
        `;
    }

    const skillInspector = {
        renderSkillInspector,
        renderInspectorForm,
        renderSkillListRail,
    };

    battleModules.skillInspector = skillInspector;
    window.EchoesOfTheCitySkillInspector = skillInspector;
})();
