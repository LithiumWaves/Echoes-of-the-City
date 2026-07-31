(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const DRIVE_LABELS = {
        drive: 'Drive',
        sinners: 'Sinners',
        workshop: 'Workshop',
        beginDrive: 'Begin Drive',
        launchDebug: 'Launch Debug Battle',
        deploy: 'Deploy',
        deployAndStart: 'Deploy & Start',
        back: 'Back',
        generalEncounters: 'General Encounters',
        debugTools: 'Debug Tools',
        advancedImport: 'Import / Export',
        enableDebugTools: 'Enable Debug Tools',
        noEncounters: 'No encounters in this chapter.',
        selectEncounter: 'Select an encounter to preview the route.',
    };

    const DEBUG_CHAPTER_ID = 'debug-tools';
    const GENERAL_CHAPTER_ID = 'general-encounters';

    function buildBattleToPackMap(installedPacks) {
        const map = new Map();
        (Array.isArray(installedPacks) ? installedPacks : []).forEach((pack) => {
            const packId = pack?.id;
            if (!packId) {
                return;
            }
            const battleIds = Array.isArray(pack.battleIds) ? pack.battleIds : [];
            battleIds.forEach((battleId) => {
                if (battleId && !map.has(battleId)) {
                    map.set(battleId, {
                        packId,
                        packName: pack.name || packId,
                    });
                }
            });
        });
        return map;
    }

    function resolveChapterForBattle(battle, battleToPack) {
        if (battle?.isDebug) {
            return {
                chapterId: DEBUG_CHAPTER_ID,
                chapterLabel: DRIVE_LABELS.debugTools,
                chapterOrder: 9999,
            };
        }

        const drive = battle?.drive && typeof battle.drive === 'object' ? battle.drive : null;
        if (drive?.chapterId) {
            return {
                chapterId: drive.chapterId,
                chapterLabel: drive.chapterLabel || drive.chapterId,
                chapterOrder: Number.isFinite(drive.chapterOrder) ? drive.chapterOrder : 0,
            };
        }

        const packInfo = battleToPack.get(battle?.id);
        if (packInfo) {
            return {
                chapterId: `pack-${packInfo.packId}`,
                chapterLabel: packInfo.packName,
                chapterOrder: 100,
            };
        }

        return {
            chapterId: GENERAL_CHAPTER_ID,
            chapterLabel: DRIVE_LABELS.generalEncounters,
            chapterOrder: 50,
        };
    }

    function groupBattlesForDriveMenu(battles, installedPacks) {
        const battleToPack = buildBattleToPackMap(installedPacks);
        const chapterMap = new Map();

        (Array.isArray(battles) ? battles : []).forEach((battle) => {
            if (!battle?.id) {
                return;
            }
            const chapterMeta = resolveChapterForBattle(battle, battleToPack);
            const chapterId = chapterMeta.chapterId;

            if (!chapterMap.has(chapterId)) {
                chapterMap.set(chapterId, {
                    chapterId,
                    chapterLabel: chapterMeta.chapterLabel,
                    chapterOrder: chapterMeta.chapterOrder,
                    encounters: [],
                });
            }

            const drive = battle.drive && typeof battle.drive === 'object' ? battle.drive : {};
            chapterMap.get(chapterId).encounters.push({
                ...battle,
                encounterLabel: drive.encounterLabel || battle.name || battle.id,
                encounterOrder: Number.isFinite(drive.encounterOrder) ? drive.encounterOrder : 0,
                accentColor: drive.accentColor || null,
                bannerImage: drive.bannerImage || null,
            });
        });

        const chapters = Array.from(chapterMap.values())
            .map((chapter) => {
                chapter.encounters.sort((left, right) => {
                    if (left.encounterOrder !== right.encounterOrder) {
                        return left.encounterOrder - right.encounterOrder;
                    }
                    return String(left.name || left.id).localeCompare(String(right.name || right.id));
                });
                return chapter;
            })
            .sort((left, right) => {
                if (left.chapterId === DEBUG_CHAPTER_ID) {
                    return 1;
                }
                if (right.chapterId === DEBUG_CHAPTER_ID) {
                    return -1;
                }
                if (left.chapterOrder !== right.chapterOrder) {
                    return left.chapterOrder - right.chapterOrder;
                }
                return String(left.chapterLabel).localeCompare(String(right.chapterLabel));
            });

        return chapters;
    }

    function findChapterForBattle(chapters, battleId) {
        return (Array.isArray(chapters) ? chapters : []).find((chapter) =>
            chapter.encounters.some((encounter) => encounter.id === battleId),
        ) || null;
    }

    function renderFooterNav(activeTab, escapeHtml) {
        const tabs = [
            { id: 'drive', label: DRIVE_LABELS.drive, action: 'drive-nav-drive' },
            { id: 'sinners', label: DRIVE_LABELS.sinners, action: 'drive-nav-sinners' },
            { id: 'workshop', label: DRIVE_LABELS.workshop, action: 'drive-nav-workshop' },
        ];

        return `
            <nav class="echoes-drive__footer-nav" aria-label="Main navigation">
                ${tabs.map((tab) => `
                    <button
                        class="echoes-drive__footer-tab${tab.id === activeTab ? ' is-active' : ''}"
                        type="button"
                        data-action="${escapeHtml(tab.action)}"
                    >
                        <span class="echoes-drive__footer-tab-label">${escapeHtml(tab.label)}</span>
                    </button>
                `).join('')}
            </nav>
        `;
    }

    function renderDriveShell(deps) {
        const {
            escapeHtml,
            bodyMarkup = '',
            footerMarkup = '',
        } = deps;

        return `
            <div class="echoes-drive">
                <div class="echoes-drive__body">
                    ${bodyMarkup}
                </div>
                <footer class="echoes-drive__footer">
                    ${footerMarkup}
                </footer>
            </div>
        `;
    }

    function renderChapterShortcut(chapter, selectedChapterId, escapeHtml) {
        const isActive = chapter.chapterId === selectedChapterId;
        return `
            <button
                class="echoes-drive__chapter-shortcut${isActive ? ' is-active' : ''}"
                type="button"
                data-action="select-drive-chapter"
                data-chapter-id="${escapeHtml(chapter.chapterId)}"
            >
                <span class="echoes-drive__chapter-shortcut-label">${escapeHtml(chapter.chapterLabel)}</span>
                <span class="echoes-drive__chapter-shortcut-count">${escapeHtml(String(chapter.encounters.length))}</span>
            </button>
        `;
    }

    function renderEncounterBanner(encounter, selectedBattleId, escapeHtml, escapeAttribute) {
        const isSelected = encounter.id === selectedBattleId;
        const accent = encounter.accentColor || '#c73e3e';
        const bannerStyle = encounter.bannerImage
            ? ` style="--echoes-drive-banner-accent:${accent}; background-image: linear-gradient(90deg, rgba(8,6,5,0.88), rgba(8,6,5,0.55)), url('${escapeAttribute(encounter.bannerImage)}');"`
            : ` style="--echoes-drive-banner-accent:${accent};"`;

        return `
            <button
                class="echoes-drive__encounter-banner${isSelected ? ' is-selected' : ''}"
                type="button"
                data-action="select-battle"
                data-battle-id="${escapeAttribute(encounter.id)}"
                ${bannerStyle}
            >
                <span class="echoes-drive__encounter-banner-accent" aria-hidden="true"></span>
                <span class="echoes-drive__encounter-banner-body">
                    <span class="echoes-drive__encounter-banner-title">${escapeHtml(encounter.name || encounter.id)}</span>
                    <span class="echoes-drive__encounter-banner-sub">${escapeHtml(encounter.encounterLabel || encounter.id)}</span>
                </span>
                ${encounter.isDebug ? `<span class="echoes-drive__encounter-banner-tag">Debug</span>` : ''}
            </button>
        `;
    }

    function renderCenterPreview(selectedBattle, escapeHtml, escapeAttribute) {
        if (!selectedBattle) {
            return `
                <div class="echoes-drive__center-radar echoes-drive__center-radar--empty">
                    <div class="echoes-drive__radar-overlay" aria-hidden="true"></div>
                    <p class="echoes-drive__preview-empty">${escapeHtml(DRIVE_LABELS.selectEncounter)}</p>
                </div>
            `;
        }

        const bg = selectedBattle.backgroundImage
            ? escapeAttribute(selectedBattle.backgroundImage)
            : '';
        const previewAttr = bg
            ? ` style="background-image: url('${bg}');"`
            : '';

        return `
            <div class="echoes-drive__center-radar"${previewAttr}>
                <div class="echoes-drive__radar-overlay" aria-hidden="true"></div>
                <div class="echoes-drive__preview-content">
                    <h2 class="echoes-drive__preview-title">${escapeHtml(selectedBattle.name || selectedBattle.id)}</h2>
                    <p class="echoes-drive__preview-desc">${escapeHtml(selectedBattle.description || '')}</p>
                </div>
            </div>
        `;
    }

    function renderDriveSelectScreen(deps) {
        const {
            escapeHtml,
            escapeAttribute,
            chapters = [],
            selectedChapterId,
            selectedBattleId,
            selectedBattle,
            showDebugToolsToggle = false,
            debugToolsEnabled = false,
            advancedMarkup = '',
        } = deps;

        const activeChapter = chapters.find((chapter) => chapter.chapterId === selectedChapterId)
            || chapters[0]
            || null;
        const chapterHeader = activeChapter
            ? `<div class="echoes-drive__chapter-header">${escapeHtml(activeChapter.chapterLabel)}</div>`
            : '';
        const encounterBanners = activeChapter
            ? activeChapter.encounters.map((encounter) =>
                renderEncounterBanner(encounter, selectedBattleId, escapeHtml, escapeAttribute),
            ).join('')
            : `<p class="echoes-drive__rail-empty">${escapeHtml(DRIVE_LABELS.noEncounters)}</p>`;

        const leftRail = chapters.map((chapter) =>
            renderChapterShortcut(chapter, activeChapter?.chapterId || selectedChapterId, escapeHtml),
        ).join('');

        const launchLabel = selectedBattle?.isDebug
            ? DRIVE_LABELS.launchDebug
            : DRIVE_LABELS.beginDrive;

        const bodyMarkup = `
            <div class="echoes-drive__frame">
                <aside class="echoes-drive__left-rail" aria-label="Chapters">
                    <div class="echoes-drive__left-rail-title">${escapeHtml(DRIVE_LABELS.drive)}</div>
                    ${leftRail}
                </aside>
                <div class="echoes-drive__center">
                    ${renderCenterPreview(selectedBattle, escapeHtml, escapeAttribute)}
                    <div class="echoes-drive__action-bar">
                        <button
                            class="echoes-drive__action echoes-drive__action--primary"
                            type="button"
                            data-action="launch-selected-battle"
                            ${selectedBattle ? '' : 'disabled'}
                        >${escapeHtml(launchLabel)}</button>
                        ${showDebugToolsToggle
                            ? `
                                <label class="echoes-drive__debug-toggle">
                                    <input type="checkbox" data-action="toggle-debug-tools" ${debugToolsEnabled ? 'checked' : ''} />
                                    <span>${escapeHtml(DRIVE_LABELS.enableDebugTools)}</span>
                                </label>
                            `
                            : ''}
                    </div>
                    ${advancedMarkup}
                </div>
                <aside class="echoes-drive__right-rail" aria-label="Encounters">
                    ${chapterHeader}
                    <div class="echoes-drive__encounter-list">
                        ${encounterBanners}
                    </div>
                </aside>
            </div>
        `;

        return renderDriveShell({
            escapeHtml,
            bodyMarkup,
            footerMarkup: renderFooterNav('drive', escapeHtml),
        });
    }

    function renderDriveDeployScreen(deps) {
        const {
            escapeHtml,
            escapeAttribute,
            selectedBattle,
            encounterName = '',
            teamName = '',
            capHintMarkup = '',
            deployCardsMarkup = '',
        } = deps;

        const previewBattle = selectedBattle
            ? {
                ...selectedBattle,
                name: encounterName || selectedBattle.name,
            }
            : null;

        const bodyMarkup = `
            <div class="echoes-drive__frame echoes-drive__frame--deploy">
                <div class="echoes-drive__center echoes-drive__center--deploy">
                    <div class="echoes-drive__deploy-header">
                        <span class="echoes-drive__deploy-pill">${escapeHtml(DRIVE_LABELS.deploy)}</span>
                        <span class="echoes-drive__deploy-pill">${escapeHtml(teamName)}</span>
                    </div>
                    ${renderCenterPreview(previewBattle, escapeHtml, escapeAttribute)}
                    ${capHintMarkup}
                    <div class="echoes-drive__deploy-grid echoes-deploy__grid echoes-identity-grid echoes-identity-grid--deploy">
                        ${deployCardsMarkup}
                    </div>
                    <div class="echoes-drive__deploy-actions echoes-deploy__actions">
                        <button class="echoes-drive__action echoes-drive__action--ghost" type="button" data-action="cancel-deployment">${escapeHtml(DRIVE_LABELS.back)}</button>
                        <button class="echoes-drive__action echoes-drive__action--primary" type="button" data-action="confirm-deployment">${escapeHtml(DRIVE_LABELS.deployAndStart)}</button>
                    </div>
                </div>
            </div>
        `;

        return renderDriveShell({
            escapeHtml,
            bodyMarkup,
            footerMarkup: renderFooterNav('drive', escapeHtml),
        });
    }

    const driveMenuApi = {
        DRIVE_LABELS,
        DEBUG_CHAPTER_ID,
        GENERAL_CHAPTER_ID,
        groupBattlesForDriveMenu,
        findChapterForBattle,
        renderDriveShell,
        renderFooterNav,
        renderDriveSelectScreen,
        renderDriveDeployScreen,
    };

    battleModules.driveMenu = driveMenuApi;
    window.EchoesOfTheCityDriveMenu = driveMenuApi;
})();
