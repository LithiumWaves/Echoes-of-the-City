(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const battleDefinitions = battleModules.battleDefinitions || (battleModules.battleDefinitions = {});

    function getBattleDefinitionValidator() {
        return battleModules.validation?.validateAndNormalizeBattleDefinition
            || battleModules.validateAndNormalizeBattleDefinition
            || null;
    }

    function assertContentRegistryReady() {
        if (typeof getBattleDefinitionValidator() !== 'function') {
            throw new Error('Battle content registry requires battle validation to load first.');
        }
    }

    function registerBattleDefinition(definition, options = {}) {
        assertContentRegistryReady();

        const validator = getBattleDefinitionValidator();
        const { normalizedDefinition, errors, message } = validator(definition);
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

    function getBattleDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return null;
        }

        return battleDefinitions[definitionId] || null;
    }

    function listBattleDefinitions() {
        return Object.entries(battleDefinitions).map(([key, definition]) => ({
            key,
            id: definition?.id || null,
            name: definition?.name || key,
        }));
    }

    battleModules.content = {
        ...(battleModules.content || {}),
        registerBattleDefinition,
        getBattleDefinition,
        listBattleDefinitions,
    };

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        registerBattleDefinition,
        getBattleDefinition,
        listBattleDefinitions,
    };
})();
