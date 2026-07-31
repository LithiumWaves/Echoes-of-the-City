(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const EDITOR_LABELS = {
        workshop: 'Workshop',
        collection: 'Collection',
        forge: 'Forge',
        encounterPacks: 'Encounter Packs',
        identityCards: 'Identity Cards',
        statusEffects: 'Status Effects',
        draftCard: 'Draft Card',
        draftPack: 'Draft Pack',
        bindToCollection: 'Bind to Collection',
        trialRun: 'Trial Run',
        publishedSets: 'Published Sets',
        validate: 'Validate',
        export: 'Export',
        uninstall: 'Uninstall',
        advancedBinding: 'Advanced Binding',
        emptyBinder: 'Nothing bound yet — draft something in Forge.',
        emptyCollection: 'No published sets installed.',
    };

    function getForgeSubtitle(tab, entityType) {
        if (tab === 'library') {
            return EDITOR_LABELS.publishedSets;
        }
        if (entityType === 'battle') {
            return EDITOR_LABELS.encounterPacks;
        }
        if (entityType === 'unit') {
            return EDITOR_LABELS.identityCards;
        }
        if (entityType === 'status') {
            return EDITOR_LABELS.statusEffects;
        }
        return EDITOR_LABELS.forge;
    }

    function renderTabButton(tabId, label, activeTab, escapeHtml) {
        const isActive = tabId === activeTab;
        return `
            <button
                class="echoes-editor-workshop__nav-btn${isActive ? ' is-active' : ''}"
                type="button"
                data-action="creator-tab"
                data-tab="${escapeHtml(tabId)}"
            >${escapeHtml(label)}</button>
        `;
    }

    function renderTypeButton(typeId, label, activeType, escapeHtml) {
        const isActive = typeId === activeType;
        return `
            <button
                class="echoes-editor-workshop__type-btn${isActive ? ' is-active' : ''}"
                type="button"
                data-action="creator-type"
                data-type="${escapeHtml(typeId)}"
            >${escapeHtml(label)}</button>
        `;
    }

    function renderPackBinderTile(entry, selected, escapeHtml, escapeAttribute) {
        const id = entry?.id || '';
        const name = entry?.name || entry?.label || id;
        const waves = Array.isArray(entry?.waves) ? entry.waves.length : 0;
        const waveHint = waves > 1 ? `${waves} waves` : waves === 1 ? '1 wave' : 'Single encounter';
        const selectedClass = selected ? ' is-selected' : '';

        return `
            <button
                class="echoes-editor-pack-tile${selectedClass}"
                type="button"
                data-action="creator-select-entity"
                data-entity-type="battle"
                data-entity-id="${escapeAttribute(id)}"
            >
                <span class="echoes-editor-pack-tile__foil" aria-hidden="true"></span>
                <span class="echoes-editor-pack-tile__name">${escapeHtml(name)}</span>
                <span class="echoes-editor-pack-tile__meta">${escapeHtml(waveHint)}</span>
                <code class="echoes-editor-pack-tile__id">${escapeHtml(id)}</code>
            </button>
        `;
    }

    function renderStatusBinderTile(entry, selected, escapeHtml, escapeAttribute) {
        const id = entry?.id || '';
        const label = entry?.label || entry?.name || id;
        const selectedClass = selected ? ' is-selected' : '';

        return `
            <button
                class="echoes-editor-effect-tile${selectedClass}"
                type="button"
                data-action="creator-select-entity"
                data-entity-type="status"
                data-entity-id="${escapeAttribute(id)}"
            >
                <span class="echoes-editor-effect-tile__icon" aria-hidden="true">◎</span>
                <span class="echoes-editor-effect-tile__name">${escapeHtml(label)}</span>
                <code class="echoes-editor-effect-tile__id">${escapeHtml(id)}</code>
            </button>
        `;
    }

    function renderCardBinderTile(unitEntry, unitDef, selected, deps) {
        const teamBuilder = battleModules.teamBuilder || window.EchoesOfTheCityTeamBuilder;
        const {
            escapeHtml,
            escapeAttribute,
            resolveAssetUrl = (value) => value || '',
        } = deps;

        const id = unitEntry?.id || unitDef?.id || '';
        const unitList = unitDef ? [unitDef] : [];
        const selectedClass = selected ? ' is-selected' : '';

        const cardInner = teamBuilder?.renderIdentityCard
            ? teamBuilder.renderIdentityCard(unitDef, unitList, escapeAttribute, escapeHtml, {
                variant: 'binder',
                unitId: id,
                resolveAssetUrl,
            })
            : `
                <article class="echoes-identity-card echoes-identity-card--binder">
                    <div class="echoes-identity-card__footer">
                        <span class="echoes-identity-card__name">${escapeHtml(unitEntry?.name || id)}</span>
                    </div>
                </article>
            `;

        return `
            <button
                class="echoes-editor-card-tile${selectedClass}"
                type="button"
                data-action="creator-select-entity"
                data-entity-type="unit"
                data-entity-id="${escapeAttribute(id)}"
            >
                ${cardInner}
            </button>
        `;
    }

    function renderPublishedSetRow(pack, escapeHtml, escapeAttribute) {
        const version = pack?.version ? ` v${pack.version}` : '';
        return `
            <div class="echoes-editor-published-set">
                <div class="echoes-editor-published-set__info">
                    <strong class="echoes-editor-published-set__name">${escapeHtml(pack?.name || pack?.id || 'Set')}</strong>
                    <code class="echoes-editor-published-set__id">${escapeHtml(pack?.id || '')}${escapeHtml(version)}</code>
                </div>
                <div class="echoes-editor-published-set__actions">
                    <button
                        class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost"
                        type="button"
                        data-action="creator-export-pack"
                        data-pack-id="${escapeAttribute(pack?.id || '')}"
                    >${escapeHtml(EDITOR_LABELS.export)}</button>
                    <button
                        class="echoes-editor-workshop__action echoes-editor-workshop__action--ghost"
                        type="button"
                        data-action="creator-uninstall-pack"
                        data-pack-id="${escapeAttribute(pack?.id || '')}"
                    >${escapeHtml(EDITOR_LABELS.uninstall)}</button>
                </div>
            </div>
        `;
    }

    function renderMessageBanner(message, escapeHtml) {
        if (!message?.text) {
            return '';
        }
        const typeClass = message.type === 'error' ? ' is-error' : ' is-success';
        return `
            <div class="echoes-editor-workshop__message${typeClass}">
                ${escapeHtml(message.text)}
            </div>
        `;
    }

    function renderEditorWorkbenchShell(deps) {
        const {
            escapeHtml,
            tab,
            entityType,
            binderMarkup = '',
            deskMarkup = '',
            message = null,
        } = deps;

        const subtitle = getForgeSubtitle(tab, entityType);
        const typeRail = tab === 'editor'
            ? `
                <div class="echoes-editor-workshop__type-rail">
                    ${renderTypeButton('battle', EDITOR_LABELS.encounterPacks, entityType, escapeHtml)}
                    ${renderTypeButton('unit', EDITOR_LABELS.identityCards, entityType, escapeHtml)}
                    ${renderTypeButton('status', EDITOR_LABELS.statusEffects, entityType, escapeHtml)}
                </div>
            `
            : '';

        const binderEmpty = tab === 'library'
            ? EDITOR_LABELS.emptyCollection
            : EDITOR_LABELS.emptyBinder;

        return `
            <div class="echoes-editor-workshop echoes-creator">
                <header class="echoes-editor-workshop__header">
                    <div class="echoes-editor-workshop__header-frame">
                        <span class="echoes-editor-workshop__gear echoes-editor-workshop__gear--left" aria-hidden="true"></span>
                        <div class="echoes-editor-workshop__header-text">
                            <h2 class="echoes-editor-workshop__title">${escapeHtml(EDITOR_LABELS.workshop)}</h2>
                            <p class="echoes-editor-workshop__subtitle">${escapeHtml(subtitle)}</p>
                        </div>
                        <span class="echoes-editor-workshop__gear echoes-editor-workshop__gear--right" aria-hidden="true"></span>
                    </div>
                </header>
                <nav class="echoes-editor-workshop__nav" aria-label="Workshop mode">
                    ${renderTabButton('library', EDITOR_LABELS.collection, tab, escapeHtml)}
                    ${renderTabButton('editor', EDITOR_LABELS.forge, tab, escapeHtml)}
                </nav>
                ${typeRail}
                <div class="echoes-editor-workshop__body">
                    <aside class="echoes-editor-workshop__binder" aria-label="Binder gallery">
                        <div class="echoes-editor-workshop__binder-inner">
                            ${binderMarkup || `<span class="echoes-editor-workshop__empty">${escapeHtml(binderEmpty)}</span>`}
                        </div>
                    </aside>
                    <section class="echoes-editor-workshop__desk" aria-label="Editor desk">
                        ${deskMarkup}
                        ${renderMessageBanner(message, escapeHtml)}
                    </section>
                </div>
            </div>
        `;
    }

    const editorWorkbench = {
        EDITOR_LABELS,
        getForgeSubtitle,
        renderEditorWorkbenchShell,
        renderPackBinderTile,
        renderCardBinderTile,
        renderStatusBinderTile,
        renderPublishedSetRow,
    };

    battleModules.editorWorkbench = editorWorkbench;
    window.EchoesOfTheCityEditorWorkbench = editorWorkbench;
})();
