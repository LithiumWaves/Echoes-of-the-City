(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const TEAM_PRESETS_STORAGE_KEY = 'echoes-of-the-city:team-presets:v1';
    const MAX_TEAM_PRESETS = 8;
    const MAX_TEAM_SIZE = 12;

    const SIN_COLORS = {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#4a90c4',
        pride: '#9b59b6',
        envy: '#2ecc71',
    };

    function createDefaultTeamPresetsState() {
        return {
            activePresetIndex: 0,
            presets: Array.from({ length: MAX_TEAM_PRESETS }, (_, index) => ({
                name: `Teams #${index + 1}`,
                unitIds: index === 0 ? ['vergilius', 'bamboo-hatted-kim'] : [],
            })),
        };
    }

    function normalizeTeamPresetsState(raw) {
        const fallback = createDefaultTeamPresetsState();
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            return fallback;
        }

        const activePresetIndex = Number.isInteger(raw.activePresetIndex)
            ? Math.max(0, Math.min(MAX_TEAM_PRESETS - 1, raw.activePresetIndex))
            : 0;

        const presets = Array.isArray(raw.presets)
            ? raw.presets.slice(0, MAX_TEAM_PRESETS).map((preset, index) => {
                const fallbackPreset = fallback.presets[index] || { name: `Teams #${index + 1}`, unitIds: [] };
                if (!preset || typeof preset !== 'object' || Array.isArray(preset)) {
                    return { ...fallbackPreset };
                }
                const unitIds = Array.isArray(preset.unitIds)
                    ? preset.unitIds.filter((id) => typeof id === 'string' && id).slice(0, MAX_TEAM_SIZE)
                    : [];
                const name = typeof preset.name === 'string' && preset.name.trim()
                    ? preset.name.trim()
                    : fallbackPreset.name;
                return { name, unitIds };
            })
            : fallback.presets.slice();

        while (presets.length < MAX_TEAM_PRESETS) {
            const index = presets.length;
            presets.push({ name: `Teams #${index + 1}`, unitIds: [] });
        }

        return { activePresetIndex, presets };
    }

    function parseTeamPresetsFromStorage(storageValue) {
        if (!storageValue) {
            return createDefaultTeamPresetsState();
        }
        try {
            return normalizeTeamPresetsState(JSON.parse(storageValue));
        } catch {
            return createDefaultTeamPresetsState();
        }
    }

    function serializeTeamPresetsState(state) {
        return JSON.stringify(normalizeTeamPresetsState(state));
    }

    function getUnitDefinition(unitList, unitId) {
        return (unitList || []).find((entry) => entry?.id === unitId) || null;
    }

    function getPrimarySinType(unitDefinition) {
        const skills = Array.isArray(unitDefinition?.skills) ? unitDefinition.skills : [];
        const firstSkill = skills.find((skill) => skill && typeof skill === 'object');
        return firstSkill?.sinType || 'wrath';
    }

    function renderTeamUnitCard(unitId, unitList, escapeAttr, escapeHtml, options = {}) {
        const { removable = false, index = 0 } = options;
        const unit = getUnitDefinition(unitList, unitId);
        const name = unit?.name || unitId;
        const level = Number.isFinite(Number(unit?.level)) ? Number(unit.level) : 1;
        const sinType = getPrimarySinType(unit);
        const sinColor = SIN_COLORS[sinType] || '#888';
        const idleSprite = unit?.sprites?.idle || '';
        const spriteUrl = options.resolveAssetUrl?.(idleSprite) || idleSprite;

        return `
            <article
                class="echoes-team__card"
                data-unit-id="${escapeAttr(unitId)}"
                style="--echoes-team-sin-color:${sinColor};"
            >
                <div class="echoes-team__card-thumb" style="background-image:url('${escapeAttr(spriteUrl)}');"></div>
                <div class="echoes-team__card-body">
                    <strong class="echoes-team__card-name">${escapeHtml(name)}</strong>
                    <span class="echoes-team__card-level">Lv. ${escapeHtml(String(level))}</span>
                </div>
                ${removable
                    ? `<button class="echoes-team__card-remove" type="button" data-action="team-remove-unit" data-unit-index="${index}" title="Remove">×</button>`
                    : ''}
            </article>
        `;
    }

    function renderTeamBuilder(teamState, unitList, escapeAttr, escapeHtml, options = {}) {
        const normalized = normalizeTeamPresetsState(teamState);
        const activeIndex = normalized.activePresetIndex;
        const activePreset = normalized.presets[activeIndex] || { name: '', unitIds: [] };
        const rosterFilter = String(options.rosterFilter || '').trim().toLowerCase();
        const resolveAssetUrl = options.resolveAssetUrl || ((value) => value || '');

        const presetTabs = normalized.presets.map((preset, index) => `
            <button
                class="echoes-team__preset-tab${index === activeIndex ? ' is-active' : ''}"
                type="button"
                data-action="team-select-preset"
                data-preset-index="${index}"
            >
                ${escapeHtml(preset.name || `Teams #${index + 1}`)}
            </button>
        `).join('');

        const teamCards = (activePreset.unitIds || []).map((unitId, index) => renderTeamUnitCard(unitId, unitList, escapeAttr, escapeHtml, {
            removable: true,
            index,
            resolveAssetUrl,
        })).join('');

        const rosterUnits = (unitList || []).filter((unit) => {
            if (!unit?.id) {
                return false;
            }
            if (activePreset.unitIds.includes(unit.id)) {
                return false;
            }
            if (!rosterFilter) {
                return true;
            }
            const label = `${unit.name || ''} ${unit.id}`.toLowerCase();
            return label.includes(rosterFilter);
        });

        const rosterRows = rosterUnits.map((unit) => {
            const sinType = getPrimarySinType(unit);
            const sinColor = SIN_COLORS[sinType] || '#888';
            const idleSprite = unit?.sprites?.idle || '';
            const spriteUrl = resolveAssetUrl(idleSprite);
            return `
                <button
                    class="echoes-team__roster-row"
                    type="button"
                    data-action="team-add-unit"
                    data-unit-id="${escapeAttr(unit.id)}"
                    style="--echoes-team-sin-color:${sinColor};"
                >
                    <span class="echoes-team__roster-thumb" style="background-image:url('${escapeAttr(spriteUrl)}');"></span>
                    <span class="echoes-team__roster-label">${escapeHtml(unit.name || unit.id)}</span>
                    <span class="echoes-team__roster-add">+</span>
                </button>
            `;
        }).join('');

        return `
            <div class="echoes-team">
                <header class="echoes-team__header">
                    <label class="echoes-team__preset-name-label">
                        <span>Preset name</span>
                        <input
                            data-action="team-preset-name"
                            value="${escapeAttr(activePreset.name || '')}"
                            placeholder="Teams #${activeIndex + 1}"
                        />
                    </label>
                    <span class="echoes-team__count">${activePreset.unitIds.length} / ${MAX_TEAM_SIZE}</span>
                </header>
                <div class="echoes-team__layout">
                    <nav class="echoes-team__presets" aria-label="Team presets">${presetTabs}</nav>
                    <section class="echoes-team__grid" aria-label="Active team">
                        ${teamCards || '<p class="echoes-team__empty">Add units from the roster on the right.</p>'}
                    </section>
                    <aside class="echoes-team__roster" aria-label="Unit roster">
                        <input
                            class="echoes-team__roster-search"
                            type="search"
                            data-action="team-roster-filter"
                            placeholder="Search units…"
                            value="${escapeAttr(options.rosterFilter || '')}"
                        />
                        <div class="echoes-team__roster-list">
                            ${rosterRows || '<p class="echoes-team__empty">No units available.</p>'}
                        </div>
                    </aside>
                </div>
            </div>
        `;
    }

    const TeamBuilder = {
        TEAM_PRESETS_STORAGE_KEY,
        MAX_TEAM_PRESETS,
        MAX_TEAM_SIZE,
        createDefaultTeamPresetsState,
        normalizeTeamPresetsState,
        parseTeamPresetsFromStorage,
        serializeTeamPresetsState,
        renderTeamBuilder,
    };

    battleModules.teamBuilder = TeamBuilder;
    window.EchoesOfTheCityTeamBuilder = TeamBuilder;
})();
