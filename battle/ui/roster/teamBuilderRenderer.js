(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const TEAM_PRESETS_STORAGE_KEY = 'echoes-of-the-city:team-presets:v1';
    const MAX_TEAM_PRESETS = 8;
    const MAX_TEAM_SIZE = 12;

    const TEAM_MENU_ASSETS = {
        gridBackground: 'assets/characterstab/teammenubg.png',
        presetButton: 'assets/characterstab/rosterbutton.png',
        cardFrame: 'assets/characterstab/Uptie_4_Frame_000.png',
    };

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
        const binderClass = variant === 'binder' ? ' echoes-identity-card--binder' : '';
        const teamClass = variant === 'team' ? ' echoes-identity-card--team' : '';
        const selectedClass = selected ? ' is-selected' : '';
        const portraitStyle = portraitUrl
            ? `background-image:url('${escapeAttr(portraitUrl)}');`
            : '';

        const frameUrl = variant === 'team' ? resolveAssetUrl(TEAM_MENU_ASSETS.cardFrame) : '';
        const frameVar = frameUrl ? `--echoes-identity-frame-url:url('${escapeAttr(frameUrl)}');` : '';
        const cardStyle = `--echoes-identity-sin-color:${sinColor};${frameVar}`;

        const frameMarkup = variant === 'team'
            ? '<div class="echoes-identity-card__frame" aria-hidden="true"></div>'
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
                class="echoes-identity-card${variantClass}${binderClass}${teamClass}${selectedClass}"
                data-unit-id="${escapeAttr(unitId)}"
                style="${cardStyle}"
            >
                ${checkbox}
                ${frameMarkup}
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
                <div class="echoes-identity-slot echoes-identity-slot--filled echoes-identity-slot--lc" data-slot-index="${slotIndex}">
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
                class="echoes-identity-slot echoes-identity-slot--empty echoes-identity-slot--lc"
                type="button"
                data-action="team-focus-roster"
                data-slot-index="${slotIndex}"
                aria-label="Empty team slot ${slotIndex + 1}"
            >
                <span class="echoes-identity-slot__plus">+</span>
            </button>
        `;
    }

    function renderPresetRail(teamState, escapeAttr, escapeHtml, options = {}) {
        const normalized = normalizeTeamPresetsState(teamState);
        const activeIndex = normalized.activePresetIndex;
        const resolveAssetUrl = options.resolveAssetUrl || ((value) => value || '');

        const presetButtonUrl = resolveAssetUrl(TEAM_MENU_ASSETS.presetButton);
        const presetButtonStyle = presetButtonUrl
            ? `--echoes-team-preset-button-url:url('${escapeAttr(presetButtonUrl)}');`
            : '';

        const presetTabs = normalized.presets.map((preset, index) => `
            <button
                class="echoes-team__preset-tab echoes-team__preset-tab--lc${index === activeIndex ? ' is-active' : ''}"
                type="button"
                data-action="team-select-preset"
                data-preset-index="${index}"
                style="${presetButtonStyle}"
            >
                <span class="echoes-team__preset-tab-label">${escapeHtml(preset.name || `Teams #${index + 1}`)}</span>
            </button>
        `).join('');

        return `
            <nav class="echoes-team__presets echoes-team__presets--lc" aria-label="Team presets">
                ${presetTabs}
            </nav>
        `;
    }

    function renderTeamMain(teamState, unitList, escapeAttr, escapeHtml, options = {}) {
        const normalized = normalizeTeamPresetsState(teamState);
        const activeIndex = normalized.activePresetIndex;
        const activePreset = normalized.presets[activeIndex] || { name: '', unitIds: [] };
        const rosterFilter = String(options.rosterFilter || '').trim().toLowerCase();
        const resolveAssetUrl = options.resolveAssetUrl || ((value) => value || '');

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
            <div class="echoes-team echoes-team--lc">
                <div class="echoes-team__lc-body">
                    <div class="echoes-team__zone-name">
                        <input
                            class="echoes-team__preset-name-input"
                            data-action="team-preset-name"
                            value="${escapeAttr(activePreset.name || '')}"
                            placeholder="Teams #${activeIndex + 1}"
                            aria-label="Team name"
                        />
                    </div>
                    <div class="echoes-team__zone-grid">
                        <section
                            class="echoes-team__grid echoes-identity-grid echoes-identity-grid--lc"
                            aria-label="Active team"
                        >
                            ${teamSlots}
                        </section>
                    </div>
                    <aside class="echoes-team__roster echoes-team__roster--lc" aria-label="Unit roster">
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

    function renderTeamBuilder(teamState, unitList, escapeAttr, escapeHtml, options = {}) {
        return `${renderPresetRail(teamState, escapeAttr, escapeHtml, options)}${renderTeamMain(teamState, unitList, escapeAttr, escapeHtml, options)}`;
    }

    const TeamBuilder = {
        TEAM_PRESETS_STORAGE_KEY,
        MAX_TEAM_PRESETS,
        MAX_TEAM_SIZE,
        TEAM_MENU_ASSETS,
        SIN_COLORS,
        createDefaultTeamPresetsState,
        normalizeTeamPresetsState,
        parseTeamPresetsFromStorage,
        serializeTeamPresetsState,
        getUnitPortraitUrl,
        renderIdentityCard,
        renderIdentitySlot,
        renderPresetRail,
        renderTeamMain,
        renderTeamBuilder,
    };

    battleModules.teamBuilder = TeamBuilder;
    window.EchoesOfTheCityTeamBuilder = TeamBuilder;
})();
