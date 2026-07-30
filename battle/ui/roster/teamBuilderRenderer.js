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

    function getUnitPortraitUrl(unit, resolveAssetUrl = (value) => value || '') {
        if (!unit || typeof unit !== 'object') {
            return '';
        }
        const splash = unit.sprites?.splash;
        if (typeof splash === 'string' && splash.trim()) {
            return resolveAssetUrl(splash.trim());
        }
        const idle = unit.sprites?.idle;
        if (typeof idle === 'string' && idle.trim()) {
            return resolveAssetUrl(idle.trim());
        }
        return '';
    }

    function renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, options = {}) {
        const {
            variant = 'team',
            unitId = unit?.id || '',
            unitIndex = null,
            removable = false,
            selectable = false,
            selected = false,
            resolveAssetUrl = (value) => value || '',
        } = options;

        const definition = unit || getUnitDefinition(unitList, unitId);
        const name = definition?.name || unitId || 'Unknown';
        const level = Number.isFinite(Number(definition?.level)) ? Number(definition.level) : 1;
        const sinType = getPrimarySinType(definition);
        const sinColor = SIN_COLORS[sinType] || '#888';
        const portraitUrl = getUnitPortraitUrl(definition, resolveAssetUrl);
        const sinLabel = String(sinType).charAt(0).toUpperCase();
        const variantClass = variant === 'roster' ? ' echoes-identity-card--roster' : '';
        const selectedClass = selected ? ' is-selected' : '';
        const portraitStyle = portraitUrl
            ? `background-image:url('${escapeAttr(portraitUrl)}');`
            : '';

        const removeButton = removable && Number.isInteger(unitIndex)
            ? `<button class="echoes-identity-card__remove" type="button" data-action="team-remove-unit" data-unit-index="${unitIndex}" title="Remove">×</button>`
            : '';

        const checkbox = selectable
            ? `<input class="echoes-identity-card__checkbox" type="checkbox" data-action="toggle-deploy-unit" data-unit-id="${escapeAttr(unitId)}" ${selected ? 'checked' : ''} aria-label="Deploy ${escapeAttr(name)}" />`
            : '';

        const tagName = selectable ? 'label' : 'article';

        return `
            <${tagName}
                class="echoes-identity-card${variantClass}${selectedClass}"
                data-unit-id="${escapeAttr(unitId)}"
                style="--echoes-identity-sin-color:${sinColor};"
            >
                ${checkbox}
                <div class="echoes-identity-card__art" style="${portraitStyle}"></div>
                <div class="echoes-identity-card__badge" aria-hidden="true">${escapeHtml(sinLabel)}</div>
                <div class="echoes-identity-card__footer">
                    <span class="echoes-identity-card__level">Lv. ${escapeHtml(String(level))}</span>
                    <span class="echoes-identity-card__name">${escapeHtml(name)}</span>
                </div>
                ${removeButton}
            </${tagName}>
        `;
    }

    function renderIdentitySlot(slotIndex, unitList, escapeAttr, escapeHtml, options = {}) {
        const {
            unitId = null,
            unitIndex = null,
            removable = false,
            resolveAssetUrl = (value) => value || '',
        } = options;

        if (unitId) {
            const unit = getUnitDefinition(unitList, unitId);
            return `
                <div class="echoes-identity-slot echoes-identity-slot--filled" data-slot-index="${slotIndex}">
                    ${renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, {
                        variant: 'team',
                        unitId,
                        unitIndex,
                        removable,
                        resolveAssetUrl,
                    })}
                </div>
            `;
        }

        return `
            <button
                class="echoes-identity-slot echoes-identity-slot--empty"
                type="button"
                data-action="team-focus-roster"
                data-slot-index="${slotIndex}"
                aria-label="Empty team slot ${slotIndex + 1}"
            >
                <span class="echoes-identity-slot__plus">+</span>
            </button>
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

        const unitIds = Array.isArray(activePreset.unitIds) ? activePreset.unitIds : [];
        const teamSlots = Array.from({ length: MAX_TEAM_SIZE }, (_, slotIndex) => {
            const unitId = unitIds[slotIndex] || null;
            return renderIdentitySlot(slotIndex, unitList, escapeAttr, escapeHtml, {
                unitId,
                unitIndex: unitId ? slotIndex : null,
                removable: Boolean(unitId),
                resolveAssetUrl,
            });
        }).join('');

        const rosterUnits = (unitList || []).filter((unit) => {
            if (!unit?.id) {
                return false;
            }
            if (unitIds.includes(unit.id)) {
                return false;
            }
            if (!rosterFilter) {
                return true;
            }
            const label = `${unit.name || ''} ${unit.id}`.toLowerCase();
            return label.includes(rosterFilter);
        });

        const rosterCards = rosterUnits.map((unit) => `
            <button
                class="echoes-identity-roster-pick"
                type="button"
                data-action="team-add-unit"
                data-unit-id="${escapeAttr(unit.id)}"
            >
                ${renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, {
                    variant: 'roster',
                    unitId: unit.id,
                    resolveAssetUrl,
                })}
            </button>
        `).join('');

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
                    <span class="echoes-team__count">${unitIds.length} / ${MAX_TEAM_SIZE}</span>
                </header>
                <div class="echoes-team__layout">
                    <nav class="echoes-team__presets" aria-label="Team presets">${presetTabs}</nav>
                    <section class="echoes-team__grid echoes-identity-grid" aria-label="Active team">
                        ${teamSlots}
                    </section>
                    <aside class="echoes-team__roster" aria-label="Unit roster">
                        <input
                            class="echoes-team__roster-search"
                            type="search"
                            data-action="team-roster-filter"
                            placeholder="Search units…"
                            value="${escapeAttr(options.rosterFilter || '')}"
                        />
                        <div class="echoes-team__roster-list echoes-identity-roster-list">
                            ${rosterCards || '<p class="echoes-team__empty">No units available.</p>'}
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
        SIN_COLORS,
        createDefaultTeamPresetsState,
        normalizeTeamPresetsState,
        parseTeamPresetsFromStorage,
        serializeTeamPresetsState,
        getUnitPortraitUrl,
        renderIdentityCard,
        renderIdentitySlot,
        renderTeamBuilder,
    };

    battleModules.teamBuilder = TeamBuilder;
    window.EchoesOfTheCityTeamBuilder = TeamBuilder;
})();
