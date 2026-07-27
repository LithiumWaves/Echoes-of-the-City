(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const battleDefinitions = battleModules.battleDefinitions || (battleModules.battleDefinitions = {});
    const unitDefinitions = battleModules.unitDefinitions || (battleModules.unitDefinitions = {});

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

        battleDefinitions[definitionId] = registeredDefinition;

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                battleDefinitions[alias] = registeredDefinition;
            });

        if (options.setAsDefault || !battleModules.defaultBattleDefinition) {
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

        unitDefinitions[definitionId] = registeredDefinition;

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                unitDefinitions[alias] = registeredDefinition;
            });

        return registeredDefinition;
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

    battleModules.content = {
        ...(battleModules.content || {}),
        registerUnitDefinition,
        getUnitDefinition,
        listUnitDefinitions,
        resolveBattleDefinitionComposition,
        registerBattleDefinition,
        getBattleDefinition,
        listBattleDefinitions,
    };

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        registerUnitDefinition,
        getUnitDefinition,
        listUnitDefinitions,
        resolveBattleDefinitionComposition,
        registerBattleDefinition,
        getBattleDefinition,
        listBattleDefinitions,
    };
})();
