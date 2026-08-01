(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const iconPickers = battleModules.iconPickers || window.EchoesOfTheCityIconPickers || {};
    const patterns = battleModules.skillEffectPatterns || window.EchoesOfTheCitySkillEffectPatterns || {};
    const skillPreview = battleModules.skillPreview || window.EchoesOfTheCitySkillPreview || {};
    const movesetSheet = battleModules.movesetSheet || window.EchoesOfTheCityMovesetSheet || {};

    const FRAME_LABELS = [
        { id: 'SKILL 1', label: 'Skill 1' },
        { id: 'SKILL 2', label: 'Skill 2' },
        { id: 'SKILL 3', label: 'Skill 3' },
        { id: 'DEFENSE', label: 'Defense' },
    ];

    function renderAccordion(title, bodyHtml, open = true) {
        return `
            <details class="echoes-skill-creator__section" ${open ? 'open' : ''}>
                <summary class="echoes-skill-creator__section-summary">${title}</summary>
                <div class="echoes-skill-creator__section-body">${bodyHtml}</div>
            </details>
        `;
    }

    function renderSkillSelect(skills, selectedSkillIndex, escapeAttr, escapeHtml) {
        const options = skills.map((skill, index) => {
            const label = skill?.plannerLabel || skill?.name || skill?.id || `Skill ${index + 1}`;
            return `<option value="${index}" ${index === selectedSkillIndex ? 'selected' : ''}>${escapeHtml(label)} — ${escapeHtml(skill?.name || skill?.id || '')}</option>`;
        }).join('');
        return `
            <label class="echoes-skill-creator__field">
                <span>Change skill</span>
                <select data-action="creator-skill-select-change">
                    ${options || '<option value="">No skills</option>'}
                </select>
            </label>
        `;
    }

    function renderFramePicker(selected, skillIndex, escapeAttr) {
        return `
            <div class="echoes-skill-picker echoes-skill-picker--frame" role="group" aria-label="Skill frame label">
                ${FRAME_LABELS.map((entry) => {
                    const isActive = (selected || '') === entry.id;
                    return `
                        <button
                            class="echoes-skill-picker__tile echoes-skill-picker__tile--frame${isActive ? ' is-active' : ''}"
                            type="button"
                            data-action="creator-skill-picker"
                            data-index="${skillIndex}"
                            data-picker="plannerLabel"
                            data-value="${escapeAttr(entry.id)}"
                        >${escapeAttr(entry.label)}</button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderPatternOptions(scope, escapeHtml) {
        const list = patterns.listPatterns?.(scope) || [];
        return list.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.label)}</option>`).join('');
    }

    function renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const { effect, index: effectIndex } = entry;
        const humanLine = patterns.describeEffect?.(effect, catalog) || effect?.type || 'Effect';
        const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
        return `
            <div class="echoes-skill-sentence">
                <div class="echoes-skill-sentence__summary">
                    <p class="echoes-skill-sentence__line">${escapeHtml(humanLine)}</p>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove</button>
                </div>
                <details class="echoes-skill-sentence__expert">
                    <summary>Advanced fields</summary>
                    <div class="echoes-skill-sentence__expert-body">
                        ${creatorUi.renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs, { showFilters: true })}
                    </div>
                </details>
            </div>
        `;
    }

    function renderCombatMechanics(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml) {
        const groups = patterns.groupEffectsForDisplay?.(skill?.effects) || { onUse: [], onAttackEnd: [], byCoin: {} };
        const onUseRows = groups.onUse.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)).join('');
        const attackEndRows = groups.onAttackEnd.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)).join('');
        const coinCount = Math.max(1, Number(skill?.coinCount) || 1);

        const coinPanels = Array.from({ length: coinCount }, (_, idx) => {
            const coin = idx + 1;
            const entries = groups.byCoin[coin] || [];
            const rows = entries.map((entry) => renderSentenceRow(entry, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml)).join('');
            return `
                <div class="echoes-skill-inspector__coin-panel">
                    <header class="echoes-skill-inspector__sentence-header">
                        <h5>Coin ${coin} On Hit</h5>
                        <div class="echoes-skill-inspector__pattern-add">
                            <select data-action="creator-skill-pattern-pick" data-skill-index="${skillIndex}" data-scope="onHit" data-coin-index="${coin}">
                                <option value="">— Add combat line —</option>
                                ${renderPatternOptions('onHit', escapeHtml)}
                            </select>
                            <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-add-pattern" data-skill-index="${skillIndex}" data-scope="onHit" data-coin-index="${coin}">Add</button>
                        </div>
                    </header>
                    <p class="echoes-creator__hint">33% branch uses weighted actions — not a literal 1d3 roll.</p>
                    <div class="echoes-skill-sentence-list">${rows || '<span class="echoes-creator__hint">No on-hit combat lines for this coin.</span>'}</div>
                </div>
            `;
        }).join('');

        return `
            <div class="echoes-skill-creator__combat">
                <p class="echoes-creator__hint">These lines fill <code>effects[]</code> for the battle engine. Tags style the preview; use <strong>Wire combat from description</strong> to compile mechanics, then correct rows here.</p>
                <section class="echoes-skill-inspector__sentence-section">
                    <header class="echoes-skill-inspector__sentence-header">
                        <h4>On Use</h4>
                        <div class="echoes-skill-inspector__pattern-add">
                            <select data-action="creator-skill-pattern-pick" data-skill-index="${skillIndex}" data-scope="onSelect">
                                <option value="">— Add combat line —</option>
                                ${renderPatternOptions('onSelect', escapeHtml)}
                                ${renderPatternOptions('onAttackEnd', escapeHtml)}
                            </select>
                            <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-add-pattern" data-skill-index="${skillIndex}" data-scope="onSelect">Add</button>
                        </div>
                    </header>
                    <p class="echoes-creator__hint">Slot aggro applies on attack end; bonus may persist until the engine clears it each turn.</p>
                    <div class="echoes-skill-sentence-list">${onUseRows || '<span class="echoes-creator__hint">No On Use combat lines.</span>'}</div>
                    ${attackEndRows ? `
                        <h5 class="echoes-skill-inspector__subheading">After attack</h5>
                        <div class="echoes-skill-sentence-list">${attackEndRows}</div>
                    ` : ''}
                </section>
                <section class="echoes-skill-inspector__sentence-section">
                    <h4>On Hit (per coin)</h4>
                    <div class="echoes-skill-inspector__coin-tabs">${coinPanels}</div>
                </section>
            </div>
        `;
    }

    function renderCreatorForm(skill, skillIndex, skills, catalog, creatorUi, escapeAttr, escapeHtml, unitDraft) {
        const buildSelect = (options, selected, attrs) => {
            return `<select ${attrs}>${creatorUi.buildSelectOptions(options, selected, escapeAttr)}</select>`;
        };
        const hiddenInPlanner = skill?.showInPlanner === false;
        const cannotClash = Boolean(skill?.cannotClash);
        const skipDefenseSkills = Boolean(skill?.skipDefenseSkills);
        const targeting = skill?.targeting || '';
        const skillTags = Array.isArray(skill?.tags) ? skill.tags.join(', ') : '';
        const unbreakableCoins = Array.isArray(skill?.unbreakableCoins) ? skill.unbreakableCoins.join(', ') : '';
        const skillId = skill?.id || '';
        const skillSprite = unitDraft?.sprites?.skills?.[skillId] || '';
        const targetingOptions = [
            { value: '', label: 'Normal (manual / AI pick)' },
            { value: 'indiscriminate', label: 'Indiscriminate (random up to Wt)' },
            { value: 'highestMaxPower', label: 'Highest max power' },
        ];

        const changeSkillBody = `
            ${renderSkillSelect(skills, skillIndex, escapeAttr, escapeHtml)}
            <div class="echoes-skill-creator__field-block">
                <span class="echoes-skill-creator__field-label">Skill type</span>
                ${iconPickers.renderSkillTypePicker?.(skill?.skillType || 'attack', skillIndex, escapeAttr) || ''}
            </div>
        `;

        const affinityBody = `
            <div class="echoes-skill-creator__field-block">
                <span class="echoes-skill-creator__field-label">Damage type</span>
                ${iconPickers.renderDamagePicker?.(skill?.damageType || 'slash', skillIndex, escapeAttr) || ''}
            </div>
            <div class="echoes-skill-creator__field-block">
                <span class="echoes-skill-creator__field-label">Sin affinity</span>
                ${iconPickers.renderSinPicker?.(skill?.sinType || 'wrath', skillIndex, escapeAttr) || ''}
            </div>
            <div class="echoes-skill-creator__field-block">
                <span class="echoes-skill-creator__field-label">Skill frame</span>
                ${renderFramePicker(skill?.plannerLabel || '', skillIndex, escapeAttr)}
            </div>
        `;

        const statsBody = `
            <div class="echoes-skill-inspector__stats-grid">
                <label>Base power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="basePower" inputmode="numeric" value="${escapeAttr(String(skill?.basePower ?? 0))}" /></label>
                <label>Coin power<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinPower" inputmode="numeric" value="${escapeAttr(String(skill?.coinPower ?? 0))}" /></label>
                <label>Coin number<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="coinCount" inputmode="numeric" value="${escapeAttr(String(skill?.coinCount ?? 1))}" /></label>
                <label>Offense level<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="offenseLevel" inputmode="numeric" value="${escapeAttr(String(skill?.offenseLevel ?? ''))}" placeholder="—" /></label>
                <label>Atk weight<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="attackWeight" inputmode="numeric" value="${escapeAttr(String(skill?.attackWeight ?? ''))}" placeholder="1" /></label>
                <label>Amt<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="deckCount" inputmode="numeric" value="${escapeAttr(String(skill?.deckCount ?? ''))}" placeholder="—" /></label>
            </div>
        `;

        const infoBody = `
            <div class="echoes-skill-creator__upload-row">
                <label class="echoes-skill-creator__upload">
                    <span>Upload skill img</span>
                    <input type="file" accept="image/*" data-action="creator-upload-skill-sprite" data-skill-id="${escapeAttr(skillId)}" />
                </label>
                ${skillSprite ? `<button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-clear-skill-sprite" data-skill-id="${escapeAttr(skillId)}">Clear image</button>` : ''}
            </div>
            <div class="echoes-skill-inspector__stats-grid">
                <label>Skill label<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="plannerLabel" value="${escapeAttr(String(skill?.plannerLabel || ''))}" placeholder="SKILL 1" /></label>
                <label>Skill name<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="name" value="${escapeAttr(String(skill?.name || ''))}" placeholder="Skill name" /></label>
                <label>Skill ID<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="id" value="${escapeAttr(String(skill?.id || ''))}" placeholder="skill-id" /></label>
                <label>Planner slot<input data-action="creator-unit-skill-field" data-index="${skillIndex}" data-field="skillSlot" value="${escapeAttr(String(skill?.skillSlot || ''))}" placeholder="slot-1 / defense" /></label>
            </div>
            <p class="echoes-creator__hint">Use tags like <code>[On_Use]</code>, <code>[On_Hit]</code>, <code>[coin_1]</code>, <code>[rupture]</code> for the card preview. Then click <strong>Wire combat from description</strong> to compile those lines into editable Combat mechanics (you can still correct anything afterward).</p>
            <label class="echoes-skill-creator__field echoes-skill-creator__field--block">
                <span>Skill description</span>
                <textarea
                    class="echoes-skill-creator__description"
                    data-action="creator-unit-skill-field"
                    data-index="${skillIndex}"
                    data-field="description"
                    rows="12"
                    placeholder="[On_Use] Clash Power +1 for every 5 [concealed_exoskeleton] on self (max 2)&#10;[On_Hit] Inflict 1 [tremor]"
                >${escapeHtml(String(skill?.description || ''))}</textarea>
            </label>
            <div class="echoes-skill-creator__desc-actions">
                <button class="echoes-editor-workshop__action echoes-editor-workshop__action--accent" type="button" data-action="creator-skill-wire-from-description" data-skill-index="${skillIndex}">Wire combat from description</button>
                <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-skill-sync-description" data-skill-index="${skillIndex}">Insert effect summary into description</button>
            </div>
        `;

        const optionsBody = `
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
        `;

        return `
            <div class="echoes-skill-creator">
                <h3 class="echoes-skill-creator__title">Skill creator</h3>
                ${renderAccordion('Change skill', changeSkillBody, true)}
                ${renderAccordion('Skill Affinity and Type', affinityBody, true)}
                ${renderAccordion('Skill Stats', statsBody, true)}
                ${renderAccordion('Skill Info', infoBody, true)}
                ${renderAccordion('Combat mechanics (engine)', renderCombatMechanics(skill, skillIndex, catalog, creatorUi, escapeAttr, escapeHtml), false)}
                ${renderAccordion('Planner &amp; options', optionsBody, false)}
                <footer class="echoes-skill-inspector__footer">
                    <button class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost" type="button" data-action="creator-unit-remove-skill" data-index="${skillIndex}">Delete the skill</button>
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
            <div class="echoes-skill-inspector echoes-skill-inspector--kit">
                <div class="echoes-skill-inspector__center">
                    ${skill
                        ? renderCreatorForm(skill, selectedSkillIndex, skills, catalog, creatorUi, escapeAttr, escapeHtml, unitDraft)
                        : '<p class="echoes-creator__hint">Add a skill card to start authoring.</p>'}
                </div>
                <div class="echoes-skill-inspector__preview-wrap">
                    ${skillPreview.renderKitStrip?.(unitDraft, catalog, escapeAttr, escapeHtml, { selectedSkillIndex })
                        || '<aside class="echoes-kit-strip echoes-kit-strip--empty"><p class="echoes-creator__hint">Kit preview loads with the skill builder.</p></aside>'}
                </div>
            </div>
        `;
    }

    const skillInspector = {
        renderSkillInspector,
        renderCreatorForm,
        renderCombatMechanics,
    };

    battleModules.skillInspector = skillInspector;
    window.EchoesOfTheCitySkillInspector = skillInspector;
})();
