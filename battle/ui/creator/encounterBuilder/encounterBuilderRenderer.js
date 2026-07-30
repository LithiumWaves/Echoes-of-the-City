(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const ENCOUNTER_TYPES = [
        { value: 'focused', label: 'Focused (1v1 style)' },
        { value: 'unfocused', label: 'Unfocused (multi-target)' },
    ];

    const VICTORY_CONDITIONS = [
        { value: 'defeat-all-enemies', label: 'Defeat all enemies' },
    ];

    const FAILURE_CONDITIONS = [
        { value: 'all-allies-defeated', label: 'All allies defeated' },
    ];

    const ENEMY_AI_SKILLS = [
        { value: 'cycle', label: 'Cycle skills by turn' },
        { value: 'random', label: 'Random skill' },
        { value: 'first', label: 'Always first skill' },
    ];

    const ENEMY_AI_TARGETS = [
        { value: 'mirror', label: 'Mirror player slot' },
        { value: 'firstLiving', label: 'First living ally' },
        { value: 'lowestHp', label: 'Lowest HP ally' },
        { value: 'random', label: 'Random ally' },
    ];

    const SCRIPTED_EVENT_SIDES = [
        { value: '', label: 'Any side' },
        { value: 'player', label: 'Player' },
        { value: 'enemy', label: 'Enemy' },
    ];

    function unitLabel(unitList, unitId) {
        const entry = (unitList || []).find((unit) => unit?.id === unitId);
        return entry?.name || entry?.label || unitId || 'Unknown';
    }

    function renderUnitChip(unitId, unitList, escapeAttr, escapeHtml, options = {}) {
        const { listKind, index, removable = true } = options;
        return `
            <span class="echoes-encounter__unit-chip" data-unit-id="${escapeAttr(unitId)}">
                <span class="echoes-encounter__unit-chip-label">${escapeHtml(unitLabel(unitList, unitId))}</span>
                <code class="echoes-encounter__unit-chip-id">${escapeHtml(unitId)}</code>
                ${removable ? `<button class="echoes-encounter__unit-chip-remove" type="button" data-action="creator-encounter-remove-unit" data-list-kind="${escapeAttr(listKind)}" data-unit-index="${index}" title="Remove">×</button>` : ''}
            </span>
        `;
    }

    function renderUnitPickerRow(listKind, unitIds, unitList, escapeAttr, escapeHtml, options = {}) {
        const { waveIndex = null } = options;
        const chips = (Array.isArray(unitIds) ? unitIds : []).map((unitId, index) => renderUnitChip(unitId, unitList, escapeAttr, escapeHtml, {
            listKind,
            index,
            removable: true,
        })).join('');

        const availableUnits = (unitList || []).filter((unit) => unit?.id && !unitIds.includes(unit.id));
        const pickerOptions = availableUnits.map((unit) => `
            <option value="${escapeAttr(unit.id)}">${escapeHtml(unit.name || unit.label || unit.id)}</option>
        `).join('');

        const waveAttr = waveIndex !== null ? ` data-wave-index="${waveIndex}"` : '';

        return `
            <div class="echoes-encounter__unit-list" data-list-kind="${escapeAttr(listKind)}"${waveAttr}>
                <div class="echoes-encounter__unit-chips">
                    ${chips || '<span class="echoes-creator__hint">No units selected.</span>'}
                </div>
                <div class="echoes-encounter__unit-add-row">
                    <select data-action="creator-encounter-unit-pick" data-list-kind="${escapeAttr(listKind)}"${waveAttr} style="min-width:14rem;">
                        <option value="">— Add unit —</option>
                        ${pickerOptions}
                    </select>
                </div>
            </div>
        `;
    }

    function renderRulesSection(battleDraft, creatorUi, escapeAttr) {
        const rules = battleDraft?.rules && typeof battleDraft.rules === 'object' ? battleDraft.rules : {};
        const aiProfile = rules.enemyAiProfile && typeof rules.enemyAiProfile === 'object' ? rules.enemyAiProfile : {};

        const buildSelect = (options, selected, attrs) => {
            return `<select ${attrs} style="width:100%;">${creatorUi.buildSelectOptions(options, selected, escapeAttr)}</select>`;
        };

        return `
            <section class="echoes-encounter__rules">
                <h3 class="echoes-encounter__section-title">Encounter rules</h3>
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Encounter type</label>
                    ${buildSelect(ENCOUNTER_TYPES, rules.encounterType || 'focused', 'data-action="creator-battle-rules-field" data-field="encounterType"')}
                    <label>Max turns</label>
                    <input data-action="creator-battle-rules-field" data-field="maxTurns" inputmode="numeric" value="${escapeAttr(String(rules.maxTurns ?? 100))}" />
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Victory</label>
                    ${buildSelect(VICTORY_CONDITIONS, rules.victoryCondition || 'defeat-all-enemies', 'data-action="creator-battle-rules-field" data-field="victoryCondition"')}
                    <label>Failure</label>
                    ${buildSelect(FAILURE_CONDITIONS, rules.failureCondition || 'all-allies-defeated', 'data-action="creator-battle-rules-field" data-field="failureCondition"')}
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Enemy AI: skill</label>
                    ${buildSelect(ENEMY_AI_SKILLS, aiProfile.skill || 'cycle', 'data-action="creator-battle-ai-field" data-field="skill"')}
                    <label>Enemy AI: target</label>
                    ${buildSelect(ENEMY_AI_TARGETS, aiProfile.target || 'mirror', 'data-action="creator-battle-ai-field" data-field="target"')}
                </div>
                <p class="echoes-creator__hint">If max turns is reached before victory, the battle ends in defeat.</p>
            </section>
        `;
    }

    function renderWavesSection(battleDraft, unitList, escapeAttr, escapeHtml) {
        const rules = battleDraft?.rules && typeof battleDraft.rules === 'object' ? battleDraft.rules : {};
        const waves = Array.isArray(rules.waves) ? rules.waves : [];
        const multiWave = waves.length > 0;
        const enemyUnitIds = Array.isArray(battleDraft?.enemyUnitIds) ? battleDraft.enemyUnitIds : [];

        const waveCards = waves.map((wave, waveIndex) => {
            const waveEnemyIds = Array.isArray(wave?.enemyUnitIds) ? wave.enemyUnitIds : [];
            const summary = waveEnemyIds.map((id) => unitLabel(unitList, id)).join(', ') || 'Empty wave';
            return `
                <article class="echoes-encounter__wave-card" data-wave-index="${waveIndex}">
                    <header class="echoes-encounter__wave-header">
                        <strong>Wave ${waveIndex + 1}</strong>
                        <span class="echoes-creator__hint">${escapeHtml(summary)}</span>
                        <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-encounter-remove-wave" data-wave-index="${waveIndex}">Remove wave</button>
                    </header>
                    ${renderUnitPickerRow('wave-enemy', waveEnemyIds, unitList, escapeAttr, escapeHtml, { waveIndex })}
                </article>
            `;
        }).join('');

        const singleWaveSection = !multiWave
            ? `
                <section class="echoes-encounter__enemies">
                    <h3 class="echoes-encounter__section-title">Enemy units</h3>
                    ${renderUnitPickerRow('enemy', enemyUnitIds, unitList, escapeAttr, escapeHtml)}
                </section>
            `
            : `
                <section class="echoes-encounter__waves">
                    <h3 class="echoes-encounter__section-title">Enemy waves</h3>
                    <div class="echoes-encounter__wave-list">${waveCards}</div>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-encounter-add-wave">+ Wave</button>
                </section>
            `;

        return `
            <div class="echoes-encounter__wave-mode">
                <label class="echoes-creator__checkbox">
                    <input type="checkbox" data-action="creator-encounter-multi-wave" ${multiWave ? 'checked' : ''} />
                    Multi-wave encounter
                </label>
                ${singleWaveSection}
            </div>
        `;
    }

    function renderScriptedEventsSection(battleDraft, catalog, creatorUi, escapeAttr, escapeHtml, hookTriggers) {
        const rules = battleDraft?.rules && typeof battleDraft.rules === 'object' ? battleDraft.rules : {};
        const events = Array.isArray(rules.scriptedEvents) ? rules.scriptedEvents : [];

        const triggerOptions = (hookTriggers || []).map((entry) => ({
            value: entry.id,
            label: entry.label || entry.id,
        }));

        const eventCards = events.map((event, eventIndex) => {
            const actions = Array.isArray(event?.hook) ? event.hook : [];
            const actionRows = actions.map((action, actionIndex) => {
                const fieldAttrs = `data-creator-scope="scripted-event" data-event-index="${eventIndex}" data-action-index="${actionIndex}" data-action="creator-scripted-event-action-field"`;
                return `
                    <div class="echoes-encounter__scripted-action">
                        ${creatorUi.renderEffectFields(action, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                        <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-scripted-event-remove-action" data-event-index="${eventIndex}" data-action-index="${actionIndex}">Remove action</button>
                    </div>
                `;
            }).join('');

            const triggerValue = event?.trigger || 'battleStart';
            const thresholdField = triggerValue === 'staggerThresholdCrossed'
                ? `
                    <div class="echoes-creator__field-row">
                        <label>Threshold (HP %)</label>
                        <input data-action="creator-scripted-event-field" data-event-index="${eventIndex}" data-field="threshold" inputmode="decimal" value="${escapeAttr(String(event?.threshold ?? ''))}" placeholder="0.75" />
                    </div>
                `
                : '';

            return `
                <article class="echoes-encounter__scripted-event" data-event-index="${eventIndex}">
                    <div class="echoes-creator__field-row echoes-creator__field-row--2">
                        <label>Event ID</label>
                        <input data-action="creator-scripted-event-field" data-event-index="${eventIndex}" data-field="id" value="${escapeAttr(String(event?.id || ''))}" placeholder="evt_battle_start" />
                        <label>Trigger</label>
                        <select data-action="creator-scripted-event-field" data-event-index="${eventIndex}" data-field="trigger" style="width:100%;">
                            ${creatorUi.buildSelectOptions(triggerOptions, triggerValue, escapeAttr)}
                        </select>
                    </div>
                    <div class="echoes-creator__field-row echoes-creator__field-row--2">
                        <label>Side filter</label>
                        <select data-action="creator-scripted-event-field" data-event-index="${eventIndex}" data-field="side" style="width:100%;">
                            ${creatorUi.buildSelectOptions(SCRIPTED_EVENT_SIDES, event?.side || '', escapeAttr)}
                        </select>
                        <label>Unit ID filter</label>
                        <input data-action="creator-scripted-event-field" data-event-index="${eventIndex}" data-field="unitId" value="${escapeAttr(String(event?.unitId || ''))}" placeholder="Optional unit id" />
                    </div>
                    ${thresholdField}
                    <div class="echoes-encounter__scripted-actions">
                        ${actionRows || '<span class="echoes-creator__hint">No actions — add one below.</span>'}
                    </div>
                    <div class="echoes-encounter__scripted-actions-bar">
                        <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-scripted-event-add-action" data-event-index="${eventIndex}">+ Action</button>
                        <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-scripted-event-remove" data-event-index="${eventIndex}">Remove event</button>
                    </div>
                </article>
            `;
        }).join('');

        return `
            <section class="echoes-encounter__scripted">
                <h3 class="echoes-encounter__section-title">Scripted events</h3>
                <p class="echoes-creator__hint">Run effect actions when battle lifecycle hooks fire (battle start, stagger threshold crossed, turn end, etc.).</p>
                <div class="echoes-encounter__scripted-list">
                    ${eventCards || '<span class="echoes-creator__hint">No scripted events.</span>'}
                </div>
                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-scripted-event-add">+ Scripted event</button>
            </section>
        `;
    }

    function renderEncounterBuilder(battleDraft, unitList, catalog, creatorUi, escapeAttr, escapeHtml, options = {}) {
        const hookTriggers = Array.isArray(options.hookTriggers) ? options.hookTriggers : [];

        return `
            <div class="echoes-encounter">
                <p class="echoes-creator__hint">Player units are chosen in Characters (team presets) and deployed when launching a battle.</p>
                <div class="echoes-encounter__header">
                    <h3 class="echoes-encounter__section-title">Encounter info</h3>
                    <div class="echoes-creator__field-row echoes-creator__field-row--2">
                        <label>Encounter ID</label>
                        <input data-action="creator-battle-field" data-field="id" value="${escapeAttr(String(battleDraft?.id || ''))}" placeholder="my-encounter" />
                        <label>Name</label>
                        <input data-action="creator-battle-field" data-field="name" value="${escapeAttr(String(battleDraft?.name || ''))}" placeholder="Encounter name" />
                    </div>
                    <div class="echoes-creator__field-row">
                        <label>Description</label>
                        <textarea data-action="creator-battle-field" data-field="description" rows="2" placeholder="Player-facing description">${escapeHtml(String(battleDraft?.description || ''))}</textarea>
                    </div>
                </div>
                <div class="echoes-encounter__body">
                    <div class="echoes-encounter__column">
                        <h3 class="echoes-encounter__section-title">Enemy setup</h3>
                        <p class="echoes-creator__hint">Units become enemies when placed in enemy slots; side is assigned at battle start.</p>
                        ${renderWavesSection(battleDraft, unitList, escapeAttr, escapeHtml)}
                        ${renderRulesSection(battleDraft, creatorUi, escapeAttr)}
                    </div>
                    <div class="echoes-encounter__column">
                        ${renderScriptedEventsSection(battleDraft, catalog, creatorUi, escapeAttr, escapeHtml, hookTriggers)}
                    </div>
                </div>
            </div>
        `;
    }

    const EncounterBuilder = {
        ENCOUNTER_TYPES,
        VICTORY_CONDITIONS,
        FAILURE_CONDITIONS,
        ENEMY_AI_SKILLS,
        ENEMY_AI_TARGETS,
        renderEncounterBuilder,
    };

    battleModules.encounterBuilder = EncounterBuilder;
    window.EchoesOfTheCityEncounterBuilder = EncounterBuilder;
})();
