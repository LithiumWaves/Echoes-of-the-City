(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const battleDefinitions = battleModules.battleDefinitions || (battleModules.battleDefinitions = {});
    const unitDefinitions = battleModules.unitDefinitions || (battleModules.unitDefinitions = {});
    const battleDefinitionAliases = battleModules.battleDefinitionAliases || (battleModules.battleDefinitionAliases = {});
    const unitDefinitionAliases = battleModules.unitDefinitionAliases || (battleModules.unitDefinitionAliases = {});
    const installedContentPacks = battleModules.installedContentPacks || (battleModules.installedContentPacks = {});

    const CONTENT_PACK_STORAGE_KEY = 'echoes-of-the-city:contentPacks:v1';
    const LEGACY_CONTENT_PACK_STORAGE_KEYS = [
        'echoes-of-the-city:contentPacks',
    ];

    function cloneContentValue(value) {
        if (Array.isArray(value)) {
            return value.map((entry) => cloneContentValue(entry));
        }

        if (!value || typeof value !== 'object') {
            return value;
        }

        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                typeof entry === 'function' ? entry : cloneContentValue(entry),
            ]),
        );
    }

    function getBattleDefinitionValidator() {
        return battleModules.validation?.validateAndNormalizeBattleDefinition
            || battleModules.validateAndNormalizeBattleDefinition
            || null;
    }

    function getUnitDefinitionValidator() {
        return battleModules.validation?.validateUnitDefinition
            || battleModules.validateUnitDefinition
            || null;
    }

    function assertContentRegistryReady() {
        if (typeof getBattleDefinitionValidator() !== 'function') {
            throw new Error('Battle content registry requires battle validation to load first.');
        }
        if (typeof getUnitDefinitionValidator() !== 'function') {
            throw new Error('Battle content registry requires unit validation to load first.');
        }
    }

    function registerBattleDefinition(definition, options = {}) {
        assertContentRegistryReady();

        const validator = getBattleDefinitionValidator();
        const resolvedDefinition = resolveBattleDefinitionComposition(definition);
        const { normalizedDefinition, errors, message } = validator(resolvedDefinition);
        if (Array.isArray(errors) && errors.length) {
            throw new Error(message || 'Battle definition is invalid.');
        }

        const registeredDefinition = normalizedDefinition || definition;
        const definitionId = registeredDefinition?.id;
        if (!definitionId || typeof definitionId !== 'string') {
            throw new Error('Registered battle definitions must have an id.');
        }

        const existingDefinition = battleDefinitions[definitionId];
        if (existingDefinition && existingDefinition.id === definitionId && !options.allowOverwrite) {
            throw new Error(`Battle definition "${definitionId}" is already registered.`);
        }

        battleDefinitions[definitionId] = registeredDefinition;

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        battleDefinitionAliases[definitionId] = aliases
            .filter((alias) => typeof alias === 'string' && alias);
        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                const existingAliasDefinition = battleDefinitions[alias];
                if (existingAliasDefinition && existingAliasDefinition.id !== definitionId && !options.allowOverwrite) {
                    throw new Error(`Battle alias "${alias}" is already registered.`);
                }
                battleDefinitions[alias] = registeredDefinition;
            });

        if (options.setAsDefault) {
            battleModules.defaultBattleDefinition = registeredDefinition;
        }

        return registeredDefinition;
    }

    function registerUnitDefinition(definition, options = {}) {
        assertContentRegistryReady();

        const validator = getUnitDefinitionValidator();
        const { normalizedDefinition, errors, message } = validator(definition);
        if (Array.isArray(errors) && errors.length) {
            throw new Error(message || 'Unit definition is invalid.');
        }

        const registeredDefinition = normalizedDefinition || definition;
        const definitionId = registeredDefinition?.id;
        if (!definitionId || typeof definitionId !== 'string') {
            throw new Error('Registered unit definitions must have an id.');
        }

        const existingDefinition = unitDefinitions[definitionId];
        if (existingDefinition && existingDefinition.id === definitionId && !options.allowOverwrite) {
            throw new Error(`Unit definition "${definitionId}" is already registered.`);
        }

        unitDefinitions[definitionId] = registeredDefinition;

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        unitDefinitionAliases[definitionId] = aliases
            .filter((alias) => typeof alias === 'string' && alias);
        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                const existingAliasDefinition = unitDefinitions[alias];
                if (existingAliasDefinition && existingAliasDefinition.id !== definitionId && !options.allowOverwrite) {
                    throw new Error(`Unit alias "${alias}" is already registered.`);
                }
                unitDefinitions[alias] = registeredDefinition;
            });

        return registeredDefinition;
    }

    function unregisterBattleDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return false;
        }

        const existingDefinition = battleDefinitions[definitionId];
        if (!existingDefinition || existingDefinition.id !== definitionId) {
            return false;
        }

        const aliases = battleDefinitionAliases[definitionId] || [];
        delete battleDefinitions[definitionId];
        aliases.forEach((alias) => {
            delete battleDefinitions[alias];
        });
        delete battleDefinitionAliases[definitionId];

        if (battleModules.defaultBattleDefinition?.id === definitionId) {
            battleModules.defaultBattleDefinition = null;
        }

        return true;
    }

    function unregisterUnitDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return false;
        }

        const existingDefinition = unitDefinitions[definitionId];
        if (!existingDefinition || existingDefinition.id !== definitionId) {
            return false;
        }

        const aliases = unitDefinitionAliases[definitionId] || [];
        delete unitDefinitions[definitionId];
        aliases.forEach((alias) => {
            delete unitDefinitions[alias];
        });
        delete unitDefinitionAliases[definitionId];
        return true;
    }

    function getBattleDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return null;
        }

        const definition = battleDefinitions[definitionId] || null;
        return definition ? cloneContentValue(definition) : null;
    }

    function getUnitDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return null;
        }

        const definition = unitDefinitions[definitionId] || null;
        return definition ? cloneContentValue(definition) : null;
    }

    function getDefaultBattleDefinition() {
        return battleModules.defaultBattleDefinition
            ? cloneContentValue(battleModules.defaultBattleDefinition)
            : null;
    }

    function listBattleDefinitions() {
        return Object.entries(battleDefinitions).map(([key, definition]) => ({
            key,
            id: definition?.id || null,
            name: definition?.name || key,
        }));
    }

    function listUnitDefinitions() {
        return Object.entries(unitDefinitions).map(([key, definition]) => ({
            key,
            id: definition?.id || null,
            name: definition?.name || key,
        }));
    }

    function resolveUnitList(definitionIds, pathLabel) {
        if (!Array.isArray(definitionIds) || !definitionIds.length) {
            return null;
        }

        return definitionIds.map((definitionId, index) => {
            if (typeof definitionId !== 'string' || !definitionId) {
                throw new Error(`${pathLabel}[${index}] must be a non-empty unit id string.`);
            }

            const unitDefinition = getUnitDefinition(definitionId);
            if (!unitDefinition) {
                throw new Error(`${pathLabel}[${index}] references unknown unit "${definitionId}".`);
            }

            return unitDefinition;
        });
    }

    function resolveBattleDefinitionComposition(definition) {
        const sourceDefinition = cloneContentValue(definition || {});
        const playerUnitIds = sourceDefinition.playerUnitIds || sourceDefinition.playerUnitsById || null;
        const enemyUnitIds = sourceDefinition.enemyUnitIds || sourceDefinition.enemyUnitsById || null;
        const sourceRules = sourceDefinition.rules && typeof sourceDefinition.rules === 'object' && !Array.isArray(sourceDefinition.rules)
            ? sourceDefinition.rules
            : {};
        const sourceWaves = Array.isArray(sourceRules.waves) ? sourceRules.waves : null;

        const hasWaveIdRefs = sourceWaves?.some((wave) => Array.isArray(wave?.enemyUnitIds) && wave.enemyUnitIds.length);
        const hasTopLevelIds = Boolean(playerUnitIds || enemyUnitIds);

        if (!hasTopLevelIds && !hasWaveIdRefs) {
            return sourceDefinition;
        }

        const resolvedPlayerUnits = resolveUnitList(playerUnitIds, 'battle.playerUnitIds');
        const resolvedEnemyUnits = resolveUnitList(enemyUnitIds, 'battle.enemyUnitIds');

        let resolvedWaves = sourceWaves;
        if (hasWaveIdRefs) {
            resolvedWaves = sourceWaves.map((wave, waveIndex) => {
                if (!wave || typeof wave !== 'object' || Array.isArray(wave)) {
                    return wave;
                }
                const waveEnemyIds = wave.enemyUnitIds || wave.enemyUnitsById || null;
                if (!waveEnemyIds) {
                    return wave;
                }
                const resolvedWaveEnemies = resolveUnitList(
                    waveEnemyIds,
                    `battle.rules.waves[${waveIndex}].enemyUnitIds`,
                );
                const nextWave = { ...wave };
                nextWave.enemyUnits = resolvedWaveEnemies;
                delete nextWave.enemyUnitIds;
                delete nextWave.enemyUnitsById;
                return nextWave;
            });
        }

        const nextDefinition = {
            ...sourceDefinition,
            playerUnits: resolvedPlayerUnits || sourceDefinition.playerUnits,
            enemyUnits: resolvedEnemyUnits || sourceDefinition.enemyUnits,
        };

        if (resolvedWaves) {
            nextDefinition.rules = {
                ...sourceRules,
                waves: resolvedWaves,
            };
            if (!nextDefinition.enemyUnits?.length && Array.isArray(resolvedWaves[0]?.enemyUnits) && resolvedWaves[0].enemyUnits.length) {
                nextDefinition.enemyUnits = resolvedWaves[0].enemyUnits;
            }
        }

        return nextDefinition;
    }

    function normalizeContentPackImport(payload) {
        const source = cloneContentValue(payload);
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('Imported content must be a JSON object.');
        }

        const manifest = source.manifest && typeof source.manifest === 'object' && !Array.isArray(source.manifest)
            ? source.manifest
            : null;
        const looksLikeBattle = Array.isArray(source.playerUnits)
            || Array.isArray(source.enemyUnits)
            || Array.isArray(source.playerUnitIds)
            || Array.isArray(source.enemyUnitIds)
            || Boolean(source.hero || source.enemy);
        const looksLikeUnit = Array.isArray(source.skills) && typeof source.maxHp === 'number';
        const looksLikeStatus = Boolean(source.stackModel || source.hooks || source.countOnly);

        if (Array.isArray(source.battles) || Array.isArray(source.units) || Array.isArray(source.statuses)) {
            return {
                manifest,
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: Array.isArray(source.units) ? source.units : [],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (source.battle && typeof source.battle === 'object') {
            return {
                manifest,
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: Array.isArray(source.units) ? source.units : [],
                battles: [source.battle],
            };
        }

        if (source.unit && typeof source.unit === 'object') {
            return {
                manifest,
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: [source.unit],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (source.status && typeof source.status === 'object') {
            return {
                manifest,
                statuses: [source.status],
                units: Array.isArray(source.units) ? source.units : [],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (looksLikeBattle) {
            return { manifest, statuses: [], units: [], battles: [source] };
        }

        if (looksLikeUnit) {
            return { manifest, statuses: [], units: [source], battles: [] };
        }

        if (looksLikeStatus) {
            return { manifest, statuses: [source], units: [], battles: [] };
        }

        throw new Error('JSON must contain a battle, unit, status, or a content pack with statuses/units/battles arrays.');
    }

    function containsFunction(value) {
        if (typeof value === 'function') {
            return true;
        }
        if (Array.isArray(value)) {
            return value.some((entry) => containsFunction(entry));
        }
        if (!value || typeof value !== 'object') {
            return false;
        }
        return Object.values(value).some((entry) => containsFunction(entry));
    }

    function assertDataOnlyPayload(payload) {
        if (containsFunction(payload)) {
            throw new Error('Imported content must be data-only JSON (no functions).');
        }
    }

    function createDefaultManifest() {
        const nonce = Date.now().toString(36);
        return {
            id: `imported-pack-${nonce}`,
            name: `Imported Pack ${nonce}`,
            version: '0.0.0',
            engineVersion: 'dev',
            authors: [],
            description: 'Imported content pack',
            dependencies: [],
            featureFlags: {},
        };
    }

    function getManifestValidator() {
        return battleModules.schema?.validateContentPackManifest
            || battleModules.validateContentPackManifest
            || null;
    }

    function normalizePackManifest(manifest) {
        const source = manifest && typeof manifest === 'object' && !Array.isArray(manifest)
            ? cloneContentValue(manifest)
            : createDefaultManifest();
        if (!source.dependencies) {
            source.dependencies = [];
        }
        if (!source.featureFlags) {
            source.featureFlags = {};
        }
        if (source.authors == null) {
            source.authors = [];
        }
        return source;
    }

    function validatePackManifest(manifest) {
        const validator = getManifestValidator();
        if (typeof validator !== 'function') {
            return { normalizedDefinition: manifest, errors: [] };
        }
        return validator(manifest);
    }

    function listInstalledContentPacks() {
        return Object.values(installedContentPacks)
            .filter(Boolean)
            .map((entry) => ({
                id: entry.manifest?.id || null,
                name: entry.manifest?.name || entry.manifest?.id || 'Unknown Pack',
                version: entry.manifest?.version || null,
            }))
            .filter((entry) => Boolean(entry.id));
    }

    function exportInstalledContentPack(packId) {
        if (!packId || typeof packId !== 'string') {
            throw new Error('Pack id is required.');
        }
        const pack = installedContentPacks[packId];
        if (!pack || !pack.payload) {
            throw new Error(`Installed pack "${packId}" is not available.`);
        }
        return cloneContentValue(pack.payload);
    }

    function getStorage() {
        if (typeof window === 'undefined') {
            return null;
        }
        return window.localStorage || null;
    }

    function persistInstalledContentPacks() {
        const storage = getStorage();
        if (!storage) {
            return false;
        }
        const payload = {
            schemaVersion: 1,
            packs: Object.values(installedContentPacks)
                .filter((entry) => entry?.manifest?.id && entry.payload)
                .map((entry) => ({
                    manifest: entry.manifest,
                    payload: entry.payload,
                    ids: entry.ids || null,
                })),
        };
        storage.setItem(CONTENT_PACK_STORAGE_KEY, JSON.stringify(payload));
        return true;
    }

    function loadPersistedContentPacks(options = {}) {
        const storage = getStorage();
        if (!storage) {
            return { loaded: 0, errors: [] };
        }

        const raw = storage.getItem(CONTENT_PACK_STORAGE_KEY)
            || LEGACY_CONTENT_PACK_STORAGE_KEYS.map((key) => storage.getItem(key)).find(Boolean)
            || null;
        if (!raw) {
            return { loaded: 0, errors: [] };
        }

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return { loaded: 0, errors: [`Failed to parse stored packs: ${error?.message || error}`] };
        }

        const packs = Array.isArray(parsed?.packs) ? parsed.packs : [];
        const errors = [];
        let loaded = 0;
        const remaining = packs
            .map((entry) => ({
                manifest: entry?.manifest || entry?.payload?.manifest || null,
                payload: entry?.payload || null,
            }))
            .filter((entry) => entry.payload);

        let progressed = true;
        while (remaining.length && progressed) {
            progressed = false;
            for (let index = remaining.length - 1; index >= 0; index -= 1) {
                const entry = remaining[index];
                try {
                    installContentPack(entry.payload, {
                        ...options,
                        allowOverwrite: true,
                        conflictStrategy: 'overwrite',
                        persist: false,
                        source: 'storage',
                    });
                    remaining.splice(index, 1);
                    loaded += 1;
                    progressed = true;
                } catch (error) {
                    const message = error?.message || String(error);
                    if (message.startsWith('Missing pack dependencies:')) {
                        continue;
                    }
                    remaining.splice(index, 1);
                    errors.push(message);
                }
            }
        }

        remaining.forEach((entry) => {
            const manifestId = entry.manifest?.id || entry.payload?.manifest?.id || 'unknown-pack';
            errors.push(`Failed to load ${manifestId}: Missing pack dependencies.`);
        });

        return { loaded, errors };
    }

    function uninstallContentPack(packId, options = {}) {
        if (!packId || typeof packId !== 'string') {
            return false;
        }

        const pack = installedContentPacks[packId];
        if (!pack) {
            return false;
        }

        const unregisterStatusDefinition = battleModules.registry?.unregisterStatusDefinition
            || battleModules.unregisterStatusDefinition;

        const statusIds = Array.isArray(pack?.ids?.statuses) ? pack.ids.statuses : [];
        const unitIds = Array.isArray(pack?.ids?.units) ? pack.ids.units : [];
        const battleIds = Array.isArray(pack?.ids?.battles) ? pack.ids.battles : [];

        battleIds.slice().reverse().forEach((id) => unregisterBattleDefinition(id));
        unitIds.slice().reverse().forEach((id) => unregisterUnitDefinition(id));
        statusIds.slice().reverse().forEach((id) => unregisterStatusDefinition?.(id));

        delete installedContentPacks[packId];
        if (options.persist !== false) {
            persistInstalledContentPacks();
        }
        return true;
    }

    function clearInstalledContentPacks(options = {}) {
        Object.keys(installedContentPacks).forEach((packId) => {
            uninstallContentPack(packId, { persist: false });
        });
        if (options.persist !== false) {
            persistInstalledContentPacks();
        }
        return true;
    }

    function computeConflicts(normalizedPack) {
        const statusDefinitions = battleModules.statusDefinitions || {};
        const conflicts = {
            statuses: [],
            units: [],
            battles: [],
        };

        (normalizedPack.statuses || []).forEach((status) => {
            const id = status?.id;
            if (id && statusDefinitions[id]) {
                conflicts.statuses.push(id);
            }
        });
        (normalizedPack.units || []).forEach((unit) => {
            const id = unit?.id;
            if (id && unitDefinitions[id]) {
                conflicts.units.push(id);
            }
        });
        (normalizedPack.battles || []).forEach((battle) => {
            const id = battle?.id;
            if (id && battleDefinitions[id]) {
                conflicts.battles.push(id);
            }
        });

        conflicts.statuses = [...new Set(conflicts.statuses)];
        conflicts.units = [...new Set(conflicts.units)];
        conflicts.battles = [...new Set(conflicts.battles)];
        return conflicts;
    }

    function normalizeDependencyList(dependencies) {
        const list = Array.isArray(dependencies) ? dependencies : [];
        return list
            .map((entry) => {
                if (typeof entry === 'string') {
                    return { id: entry, version: null };
                }
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    return null;
                }
                return { id: entry.id || null, version: entry.version || null };
            })
            .filter((entry) => entry?.id);
    }

    function findAvailableId(existingLookup, baseId) {
        if (!existingLookup[baseId]) {
            return baseId;
        }
        let counter = 2;
        while (existingLookup[`${baseId}_${counter}`]) {
            counter += 1;
        }
        return `${baseId}_${counter}`;
    }

    function rewriteReferences(value, rewrite, keyHint = null) {
        if (Array.isArray(value)) {
            return value.map((entry) => rewriteReferences(entry, rewrite, keyHint));
        }
        if (!value || typeof value !== 'object') {
            if (typeof value === 'string' && keyHint && rewrite.stringByKeyHint) {
                return rewrite.stringByKeyHint(keyHint, value);
            }
            return value;
        }

        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                rewriteReferences(entry, rewrite, key),
            ]),
        );
    }

    function applyRenameMapsToPack(normalizedPack, renameMaps) {
        const { statusIds, unitIds, battleIds } = renameMaps;
        const stringByKeyHint = (key, value) => {
            if (typeof value !== 'string' || !key) {
                return value;
            }
            if (key === 'statusId' || key.endsWith('StatusId') || key === 'otherStatusId' || key === 'prioritizeStatusId') {
                return statusIds[value] || value;
            }
            if (key === 'unitId' || key.endsWith('UnitId')) {
                return unitIds[value] || value;
            }
            if (key === 'battleId' || key.endsWith('BattleId')) {
                return battleIds[value] || value;
            }
            return value;
        };

        const rewrite = { stringByKeyHint };
        return rewriteReferences(normalizedPack, rewrite);
    }

    function buildRenameMaps(normalizedPack) {
        const statusDefinitions = battleModules.statusDefinitions || {};
        const statusIds = {};
        const unitIds = {};
        const battleIds = {};

        (normalizedPack.statuses || []).forEach((status) => {
            const id = status?.id;
            if (!id) {
                return;
            }
            if (statusDefinitions[id]) {
                const nextId = findAvailableId(statusDefinitions, id);
                statusIds[id] = nextId;
            }
        });
        (normalizedPack.units || []).forEach((unit) => {
            const id = unit?.id;
            if (!id) {
                return;
            }
            if (unitDefinitions[id]) {
                const nextId = findAvailableId(unitDefinitions, id);
                unitIds[id] = nextId;
            }
        });
        (normalizedPack.battles || []).forEach((battle) => {
            const id = battle?.id;
            if (!id) {
                return;
            }
            if (battleDefinitions[id]) {
                const nextId = findAvailableId(battleDefinitions, id);
                battleIds[id] = nextId;
            }
        });

        return { statusIds, unitIds, battleIds };
    }

    function collectStatusIds(value, collected = new Set()) {
        if (Array.isArray(value)) {
            value.forEach((entry) => collectStatusIds(entry, collected));
            return collected;
        }

        if (!value || typeof value !== 'object') {
            return collected;
        }

        Object.entries(value).forEach(([key, entry]) => {
            if (key === 'statusId' && typeof entry === 'string') {
                collected.add(entry);
                return;
            }

            collectStatusIds(entry, collected);
        });

        return collected;
    }

    function importContentPack(payload, options = {}) {
        assertContentRegistryReady();

        const normalizedPack = normalizeContentPackImport(payload);
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
            || battleModules.registerStatusDefinition;
        const unregisterStatusDefinition = battleModules.registry?.unregisterStatusDefinition
            || battleModules.unregisterStatusDefinition;
        const isSupportedStatusId = battleModules.registry?.isSupportedStatusId
            || battleModules.isSupportedStatusId;
        if (typeof registerStatusDefinition !== 'function') {
            throw new Error('Status registry is not available.');
        }

        const registeredIds = {
            statuses: [],
            units: [],
            battles: [],
        };

        try {
            const statusIdsToSeed = (normalizedPack.statuses || [])
                .map((status) => status?.id)
                .filter(Boolean);
            statusIdsToSeed.forEach((statusId) => {
                if (typeof isSupportedStatusId === 'function' && isSupportedStatusId(statusId)) {
                    return;
                }
                registerStatusDefinition({
                    id: statusId,
                    label: statusId,
                    countOnly: true,
                });
            });

            normalizedPack.statuses.forEach((statusDefinition) => {
                const registeredDefinition = registerStatusDefinition(statusDefinition, options);
                registeredIds.statuses.push(registeredDefinition.id);
            });

            normalizedPack.units.forEach((unitDefinition) => {
                const registeredDefinition = registerUnitDefinition(unitDefinition, options);
                registeredIds.units.push(registeredDefinition.id);
            });

            normalizedPack.battles.forEach((battleDefinition) => {
                const registeredDefinition = registerBattleDefinition(battleDefinition, options);
                registeredIds.battles.push(registeredDefinition.id);
            });
        } catch (error) {
            registeredIds.battles.slice().reverse().forEach((definitionId) => unregisterBattleDefinition(definitionId));
            registeredIds.units.slice().reverse().forEach((definitionId) => unregisterUnitDefinition(definitionId));
            registeredIds.statuses.slice().reverse().forEach((definitionId) => unregisterStatusDefinition?.(definitionId));
            throw error;
        }

        return {
            counts: {
                statuses: registeredIds.statuses.length,
                units: registeredIds.units.length,
                battles: registeredIds.battles.length,
            },
            ids: registeredIds,
        };
    }

    function installContentPack(payload, options = {}) {
        assertContentRegistryReady();
        assertDataOnlyPayload(payload);

        const normalizedPack = normalizeContentPackImport(payload);
        const isExplicitPack = Array.isArray(payload?.statuses) || Array.isArray(payload?.units) || Array.isArray(payload?.battles) || Boolean(payload?.manifest);

        const manifest = isExplicitPack
            ? normalizePackManifest(normalizedPack.manifest)
            : null;

        if (manifest) {
            const validation = validatePackManifest(manifest);
            if (Array.isArray(validation?.errors) && validation.errors.length) {
                throw new Error(validation.errors.map((entry) => `manifest: ${entry}`).join('\n'));
            }
        }

        const resolvedManifest = manifest || createDefaultManifest();
        const dependencies = normalizeDependencyList(resolvedManifest.dependencies);
        const missingDependencies = dependencies
            .filter((dep) => !installedContentPacks[dep.id])
            .map((dep) => dep.id);
        if (missingDependencies.length) {
            throw new Error(`Missing pack dependencies: ${missingDependencies.join(', ')}`);
        }

        const conflicts = computeConflicts(normalizedPack);
        const conflictStrategy = options.conflictStrategy || 'error';
        const allowOverwrite = conflictStrategy === 'overwrite' ? true : Boolean(options.allowOverwrite);

        if (
            conflictStrategy === 'error'
            && (conflicts.statuses.length || conflicts.units.length || conflicts.battles.length)
        ) {
            throw new Error([
                'Import conflicts detected:',
                conflicts.statuses.length ? `- statuses: ${conflicts.statuses.join(', ')}` : null,
                conflicts.units.length ? `- units: ${conflicts.units.join(', ')}` : null,
                conflicts.battles.length ? `- battles: ${conflicts.battles.join(', ')}` : null,
            ].filter(Boolean).join('\n'));
        }

        const preparedPack = (() => {
            if (conflictStrategy === 'skip') {
                return {
                    ...normalizedPack,
                    statuses: (normalizedPack.statuses || []).filter((status) => !conflicts.statuses.includes(status?.id)),
                    units: (normalizedPack.units || []).filter((unit) => !conflicts.units.includes(unit?.id)),
                    battles: (normalizedPack.battles || []).filter((battle) => !conflicts.battles.includes(battle?.id)),
                };
            }

            if (conflictStrategy !== 'rename') {
                return normalizedPack;
            }

            const renameMaps = buildRenameMaps(normalizedPack);
            const updated = applyRenameMapsToPack(normalizedPack, renameMaps);
            (updated.statuses || []).forEach((status) => {
                if (status?.id && renameMaps.statusIds[status.id]) {
                    status.id = renameMaps.statusIds[status.id];
                }
            });
            (updated.units || []).forEach((unit) => {
                if (unit?.id && renameMaps.unitIds[unit.id]) {
                    unit.id = renameMaps.unitIds[unit.id];
                }
            });
            (updated.battles || []).forEach((battle) => {
                if (battle?.id && renameMaps.battleIds[battle.id]) {
                    battle.id = renameMaps.battleIds[battle.id];
                }
            });
            return updated;
        })();

        const importOptions = {
            ...options,
            allowOverwrite,
        };

        const result = importContentPack({
            ...preparedPack,
            manifest: resolvedManifest,
        }, importOptions);

        if (isExplicitPack) {
            installedContentPacks[resolvedManifest.id] = {
                manifest: resolvedManifest,
                payload: {
                    manifest: resolvedManifest,
                    statuses: preparedPack.statuses || [],
                    units: preparedPack.units || [],
                    battles: preparedPack.battles || [],
                },
                ids: result?.ids || null,
                installedAt: Date.now(),
                source: options.source || 'import',
            };
            if (options.persist !== false) {
                persistInstalledContentPacks();
            }
        }

        return {
            ...result,
            manifest: resolvedManifest,
            conflicts,
        };
    }

    function exportBattleDefinition(definitionId) {
        const definition = getBattleDefinition(definitionId);
        if (!definition) {
            throw new Error(`Battle definition "${definitionId}" is not available.`);
        }

        return definition;
    }

    function exportBattleContentPack(definitionId) {
        const definition = exportBattleDefinition(definitionId);
        const unitIds = new Set([
            ...(Array.isArray(definition.playerUnitIds) ? definition.playerUnitIds : []),
            ...(Array.isArray(definition.enemyUnitIds) ? definition.enemyUnitIds : []),
            ...(Array.isArray(definition.playerUnits) ? definition.playerUnits.map((unit) => unit?.id).filter(Boolean) : []),
            ...(Array.isArray(definition.enemyUnits) ? definition.enemyUnits.map((unit) => unit?.id).filter(Boolean) : []),
        ]);
        const units = [...unitIds]
            .map((unitId) => getUnitDefinition(unitId))
            .filter(Boolean);
        const statusIds = collectStatusIds({
            battle: definition,
            units,
        });
        const statuses = [...statusIds]
            .map((statusId) => battleModules.registry?.getStatusDefinition?.(statusId) || null)
            .filter(Boolean);

        const manifest = createDefaultManifest();
        manifest.id = `battle-pack-${sanitizeId(definitionId)}`;
        manifest.name = definition.name || definitionId;
        manifest.description = `Auto-exported pack for battle "${definition.name || definitionId}".`;

        return {
            manifest,
            statuses,
            units,
            battles: [definition],
        };
    }

    function sanitizeId(value) {
        return String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9-_]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    battleModules.content = {
        ...(battleModules.content || {}),
        registerUnitDefinition,
        unregisterUnitDefinition,
        getUnitDefinition,
        listUnitDefinitions,
        resolveBattleDefinitionComposition,
        registerBattleDefinition,
        unregisterBattleDefinition,
        getBattleDefinition,
        getDefaultBattleDefinition,
        listBattleDefinitions,
        importContentPack,
        installContentPack,
        exportBattleDefinition,
        exportBattleContentPack,
        listInstalledContentPacks,
        exportInstalledContentPack,
        persistInstalledContentPacks,
        loadPersistedContentPacks,
        uninstallContentPack,
        clearInstalledContentPacks,
    };

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        registerUnitDefinition,
        unregisterUnitDefinition,
        getUnitDefinition,
        listUnitDefinitions,
        resolveBattleDefinitionComposition,
        registerBattleDefinition,
        unregisterBattleDefinition,
        getBattleDefinition,
        getDefaultBattleDefinition,
        listBattleDefinitions,
        importContentPack,
        installContentPack,
        exportBattleDefinition,
        exportBattleContentPack,
        listInstalledContentPacks,
        exportInstalledContentPack,
        persistInstalledContentPacks,
        loadPersistedContentPacks,
        uninstallContentPack,
        clearInstalledContentPacks,
    };
})();
