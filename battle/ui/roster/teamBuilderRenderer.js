(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const TEAM_PRESETS_STORAGE_KEY = 'echoes-of-the-city:team-presets:v1';
    const MAX_TEAM_PRESETS = 8;
    const MAX_TEAM_SIZE = 12;

    const TEAM_MENU_ASSETS = {
        gridBackground: 'assets/characterstab/teammenubg.png',
        presetButton: 'assets/characterstab/rosterbutton.png',
        nameTab: 'assets/characterstab/teamsbutton.png',
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

    const SIN_ORDER = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];

    function createDefaultTeamPresetsState() {
        return {
            activePresetIndex: 0,
            presets: Array.from({ length: MAX_TEAM_PRESETS }, (_, index) => ({
                name: `Teams #${index + 1}`,
                unitIds: index === 0 ? ['vergilius', 'bamboo-hatted-kim'] : [],
            })),
        };
    }

    function normalizeUnitIds(rawUnitIds) {
        const source = Array.isArray(rawUnitIds) ? rawUnitIds : [];
        return Array.from({ length: MAX_TEAM_SIZE }, (_, index) => {
            const id = source[index];
            return typeof id === 'string' && id ? id : null;
        });
    }

    function countFilledTeamSlots(unitIds) {
        return (unitIds || []).filter((id) => id).length;
    }

    function ensureFixedTeamSlots(preset) {
        if (!preset || typeof preset !== 'object') {
            return [];
        }
        preset.unitIds = normalizeUnitIds(preset.unitIds);
        return preset.unitIds;
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
                    return {
                        name: fallbackPreset.name,
                        unitIds: normalizeUnitIds(fallbackPreset.unitIds),
                    };
                }
                const name = typeof preset.name === 'string' && preset.name.trim()
                    ? preset.name.trim()
                    : fallbackPreset.name;
                return { name, unitIds: normalizeUnitIds(preset.unitIds) };
            })
            : fallback.presets.map((preset) => ({
                name: preset.name,
                unitIds: normalizeUnitIds(preset.unitIds),
            }));

        while (presets.length < MAX_TEAM_PRESETS) {
            const index = presets.length;
            presets.push({ name: `Teams #${index + 1}`, unitIds: normalizeUnitIds([]) });
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

    function computeTeamSinCounts(unitIds, unitList) {
        const counts = Object.fromEntries(SIN_ORDER.map((sin) => [sin, 0]));
        (unitIds || []).forEach((unitId) => {
            if (!unitId) {
                return;
            }
            const unit = getUnitDefinition(unitList, unitId);
            const sinType = getPrimarySinType(unit);
            if (counts[sinType] !== undefined) {
                counts[sinType] += 1;
            }
        });
        return counts;
    }

    function renderTeamSinChips(counts, escapeHtml) {
        const chips = SIN_ORDER.map((sinType) => {
            const count = counts[sinType] || 0;
            if (!count) {
                return '';
            }
            const color = SIN_COLORS[sinType] || '#888';
            const label = String(sinType).charAt(0).toUpperCase();
            return `
                <span
                    class="echoes-team__sin-chip"
                    style="--echoes-lc-sin-color:${color}"
                    title="${escapeHtml(sinType)}"
                >
                    <span class="echoes-team__sin-chip__droplet" aria-hidden="true"></span>
                    <span class="echoes-team__sin-chip__label">${escapeHtml(label)}</span>
                    <span class="echoes-team__sin-chip__count">${escapeHtml(String(count))}</span>
                </span>
            `;
        }).join('');

        if (!chips) {
            return '<span class="echoes-team__sin-chips-empty">No identities</span>';
        }

        return chips;
    }

    function moveTeamUnit(preset, fromIndex, toIndex) {
        if (!preset) {
            return false;
        }
        const unitIds = ensureFixedTeamSlots(preset);
        const from = Number(fromIndex);
        const to = Number(toIndex);
        if (!Number.isInteger(from) || !Number.isInteger(to)) {
            return false;
        }
        if (from < 0 || from >= MAX_TEAM_SIZE || to < 0 || to >= MAX_TEAM_SIZE) {
            return false;
        }
        if (from === to || !unitIds[from]) {
            return false;
        }

        const movingId = unitIds[from];
        const targetId = unitIds[to];
        unitIds[to] = movingId;
        unitIds[from] = targetId || null;
        return true;
    }

    function addTeamUnitAtSlot(preset, unitId, slotIndex) {
        if (!preset || !unitId) {
            return false;
        }
        const unitIds = ensureFixedTeamSlots(preset);
        const slot = Number(slotIndex);
        if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_TEAM_SIZE) {
            return false;
        }
        if (unitIds.includes(unitId)) {
            return false;
        }
        if (unitIds[slot]) {
            return false;
        }
        if (countFilledTeamSlots(unitIds) >= MAX_TEAM_SIZE) {
            return false;
        }
        unitIds[slot] = unitId;
        return true;
    }

    function placeTeamUnitInSlot(preset, unitId, slotIndex) {
        if (!preset || !unitId) {
            return false;
        }
        const unitIds = ensureFixedTeamSlots(preset);
        const slot = Number(slotIndex);
        if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_TEAM_SIZE) {
            return false;
        }

        const existingIndex = unitIds.indexOf(unitId);
        const existingAtSlot = unitIds[slot];

        if (existingIndex === slot) {
            return true;
        }

        if (!existingAtSlot) {
            if (existingIndex >= 0) {
                unitIds[existingIndex] = null;
            } else if (countFilledTeamSlots(unitIds) >= MAX_TEAM_SIZE) {
                return false;
            }
            unitIds[slot] = unitId;
            return true;
        }

        if (existingIndex >= 0) {
            unitIds[existingIndex] = existingAtSlot;
            unitIds[slot] = unitId;
            return true;
        }

        unitIds[slot] = unitId;
        return true;
    }

    function renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, options = {}) {
        const {
            variant = 'team',
            unitId = unit?.id || '',
            unitIndex = null,
            slotIndex = null,
            removable = false,
            selectable = false,
            selected = false,
            draggable = false,
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

        const dragAttrs = draggable && variant === 'team' && Number.isInteger(slotIndex)
            ? ` draggable="true" data-drag-team-unit="true" data-slot-index="${slotIndex}"`
            : '';

        const tagName = selectable ? 'label' : 'article';

        return `
            <${tagName}
                class="echoes-identity-card${variantClass}${binderClass}${teamClass}${selectedClass}"
                data-unit-id="${escapeAttr(unitId)}"
                style="${cardStyle}"${dragAttrs}
            >
                ${checkbox}
                ${frameMarkup}
                <div class="echoes-identity-card__art" style="${portraitStyle}"></div>
                <div class="echoes-identity-card__badge echoes-identity-card__badge--droplet" aria-hidden="true">
                    <span class="echoes-identity-card__badge-droplet"></span>
                    <span class="echoes-identity-card__badge-label">${escapeHtml(sinLabel)}</span>
                </div>
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

        const frameUrl = resolveAssetUrl(TEAM_MENU_ASSETS.cardFrame);
        const frameVar = frameUrl ? `--echoes-identity-slot-frame-url:url('${escapeAttr(frameUrl)}');` : '';
        const slotAttrs = `data-drop-target="team-slot" data-slot-index="${slotIndex}"`;

        if (unitId) {
            const unit = getUnitDefinition(unitList, unitId);
            return `
                <div
                    class="echoes-identity-slot echoes-identity-slot--filled echoes-identity-slot--lc"
                    ${slotAttrs}
                >
                    ${renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, {
                        variant: 'team',
                        unitId,
                        unitIndex,
                        slotIndex,
                        removable,
                        draggable: true,
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
                ${slotAttrs}
                aria-label="Empty team slot ${slotIndex + 1}"
                style="${frameVar}"
            >
                <span class="echoes-identity-slot__frame" aria-hidden="true"></span>
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
        const activePreset = normalized.presets[activeIndex] || { name: '', unitIds: normalizeUnitIds([]) };
        const rosterFilter = String(options.rosterFilter || '').trim().toLowerCase();
        const resolveAssetUrl = options.resolveAssetUrl || ((value) => value || '');

        const unitIds = ensureFixedTeamSlots(activePreset);
        const filledCount = countFilledTeamSlots(unitIds);
        const sinCounts = computeTeamSinCounts(unitIds, unitList);
        const sinChipsHtml = renderTeamSinChips(sinCounts, escapeHtml);

        const gridBgUrl = resolveAssetUrl(TEAM_MENU_ASSETS.gridBackground);
        const nameTabUrl = resolveAssetUrl(TEAM_MENU_ASSETS.nameTab);
        const teamStyleParts = [];
        if (gridBgUrl) {
            teamStyleParts.push(`--echoes-team-grid-bg-url:url('${escapeAttr(gridBgUrl)}')`);
        }
        if (nameTabUrl) {
            teamStyleParts.push(`--echoes-team-name-tab-url:url('${escapeAttr(nameTabUrl)}')`);
        }
        const teamStyle = teamStyleParts.length ? teamStyleParts.join(';') : '';

        const teamSlots = Array.from({ length: MAX_TEAM_SIZE }, (_, slotIndex) => {
            const slotUnitId = unitIds[slotIndex] || null;
            return renderIdentitySlot(slotIndex, unitList, escapeAttr, escapeHtml, {
                unitId: slotUnitId,
                unitIndex: slotUnitId ? slotIndex : null,
                removable: Boolean(slotUnitId),
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
                draggable="true"
                data-drag-roster-unit="true"
            >
                ${renderIdentityCard(unit, unitList, escapeAttr, escapeHtml, {
                    variant: 'roster',
                    unitId: unit.id,
                    resolveAssetUrl,
                })}
            </button>
        `).join('');

        const rosterEmptyMarkup = `
            <div class="echoes-team__roster-empty echoes-team__lc-panel">
                <span class="echoes-team__roster-empty__icon" aria-hidden="true">◇</span>
                <p class="echoes-team__roster-empty__title">No identities in roster</p>
                <p class="echoes-team__roster-empty__hint">Available units will appear here for selection.</p>
            </div>
        `;

        return `
            <div class="echoes-team echoes-team--lc" style="${teamStyle}">
                <div class="echoes-team__lc-body">
                    <header class="echoes-team__zone-header">
                        <div class="echoes-team__zone-name">
                            <input
                                class="echoes-team__preset-name-input"
                                data-action="team-preset-name"
                                value="${escapeAttr(activePreset.name || '')}"
                                placeholder="Teams #${activeIndex + 1}"
                                aria-label="Team name"
                            />
                        </div>
                        <div class="echoes-team__team-meta">
                            <span class="echoes-team__team-count">${escapeHtml(String(filledCount))} / ${escapeHtml(String(MAX_TEAM_SIZE))}</span>
                            <div class="echoes-team__sin-chips" aria-label="Team sins">
                                ${sinChipsHtml}
                            </div>
                        </div>
                    </header>
                    <div class="echoes-team__zone-grid echoes-team__lc-vignette">
                        <section
                            class="echoes-team__grid echoes-identity-grid echoes-identity-grid--lc"
                            aria-label="Active team"
                        >
                            ${teamSlots}
                        </section>
                    </div>
                    <aside class="echoes-team__roster echoes-team__roster--lc echoes-team__lc-panel" aria-label="Unit roster">
                        <div class="echoes-team__roster-search-wrap">
                            <label class="echoes-team__roster-search-label" for="echoes-team-roster-search">Roster</label>
                            <input
                                id="echoes-team-roster-search"
                                class="echoes-team__roster-search"
                                type="search"
                                data-action="team-roster-filter"
                                placeholder="Search units…"
                                value="${escapeAttr(options.rosterFilter || '')}"
                            />
                        </div>
                        <div class="echoes-team__roster-list echoes-identity-roster-list">
                            ${rosterCards || rosterEmptyMarkup}
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
        normalizeUnitIds,
        countFilledTeamSlots,
        ensureFixedTeamSlots,
        computeTeamSinCounts,
        renderTeamSinChips,
        moveTeamUnit,
        addTeamUnitAtSlot,
        placeTeamUnitInSlot,
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
