(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const battleDefinitions = battleModules.battleDefinitions || (battleModules.battleDefinitions = {});
    const unitDefinitions = battleModules.unitDefinitions || (battleModules.unitDefinitions = {});
    const battleDefinitionAliases = battleModules.battleDefinitionAliases || (battleModules.battleDefinitionAliases = {});
    const unitDefinitionAliases = battleModules.unitDefinitionAliases || (battleModules.unitDefinitionAliases = {});

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

        if (!playerUnitIds && !enemyUnitIds) {
            return sourceDefinition;
        }

        const resolvedPlayerUnits = resolveUnitList(playerUnitIds, 'battle.playerUnitIds');
        const resolvedEnemyUnits = resolveUnitList(enemyUnitIds, 'battle.enemyUnitIds');

        return {
            ...sourceDefinition,
            playerUnits: resolvedPlayerUnits || sourceDefinition.playerUnits,
            enemyUnits: resolvedEnemyUnits || sourceDefinition.enemyUnits,
        };
    }

    function normalizeContentPackImport(payload) {
        const source = cloneContentValue(payload);
        if (!source || typeof source !== 'object' || Array.isArray(source)) {
            throw new Error('Imported content must be a JSON object.');
        }

        const looksLikeBattle = Array.isArray(source.playerUnits)
            || Array.isArray(source.enemyUnits)
            || Array.isArray(source.playerUnitIds)
            || Array.isArray(source.enemyUnitIds)
            || Boolean(source.hero || source.enemy);
        const looksLikeUnit = Array.isArray(source.skills) && typeof source.maxHp === 'number';
        const looksLikeStatus = Boolean(source.stackModel || source.hooks || source.countOnly);

        if (Array.isArray(source.battles) || Array.isArray(source.units) || Array.isArray(source.statuses)) {
            return {
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: Array.isArray(source.units) ? source.units : [],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (source.battle && typeof source.battle === 'object') {
            return {
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: Array.isArray(source.units) ? source.units : [],
                battles: [source.battle],
            };
        }

        if (source.unit && typeof source.unit === 'object') {
            return {
                statuses: Array.isArray(source.statuses) ? source.statuses : [],
                units: [source.unit],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (source.status && typeof source.status === 'object') {
            return {
                statuses: [source.status],
                units: Array.isArray(source.units) ? source.units : [],
                battles: Array.isArray(source.battles) ? source.battles : [],
            };
        }

        if (looksLikeBattle) {
            return { statuses: [], units: [], battles: [source] };
        }

        if (looksLikeUnit) {
            return { statuses: [], units: [source], battles: [] };
        }

        if (looksLikeStatus) {
            return { statuses: [source], units: [], battles: [] };
        }

        throw new Error('JSON must contain a battle, unit, status, or a content pack with statuses/units/battles arrays.');
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
        if (typeof registerStatusDefinition !== 'function') {
            throw new Error('Status registry is not available.');
        }

        const registeredIds = {
            statuses: [],
            units: [],
            battles: [],
        };

        try {
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

        return {
            statuses,
            units,
            battles: [definition],
        };
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
        exportBattleDefinition,
        exportBattleContentPack,
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
        exportBattleDefinition,
        exportBattleContentPack,
    };
})();
