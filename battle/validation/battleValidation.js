(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function validateAndNormalizeBattleDefinition(definition) {
        const validator = battleModules.schema?.validateBattleDefinition || battleModules.validateBattleDefinition;
        const formatter = battleModules.schema?.formatBattleDefinitionErrors || battleModules.formatBattleDefinitionErrors;

        if (typeof validator !== 'function') {
            return {
                normalizedDefinition: definition,
                errors: [],
                message: null,
            };
        }

        const result = validator(definition);
        const errors = Array.isArray(result?.errors) ? result.errors : [];
        const message = errors.length
            ? (typeof formatter === 'function' ? formatter(errors) : errors.join('\n'))
            : null;

        return {
            normalizedDefinition: result?.normalizedDefinition || definition,
            errors,
            message,
        };
    }

    function validateUnitDefinition(definition) {
        const validator = battleModules.schema?.validateUnitDefinition || battleModules.validateUnitDefinition;
        const formatter = battleModules.schema?.formatBattleDefinitionErrors || battleModules.formatBattleDefinitionErrors;

        if (typeof validator !== 'function') {
            return {
                normalizedDefinition: definition,
                errors: [],
                message: null,
            };
        }

        const result = validator(definition);
        const errors = Array.isArray(result?.errors) ? result.errors : [];
        const message = errors.length
            ? (typeof formatter === 'function' ? formatter(errors) : errors.join('\n'))
            : null;

        return {
            normalizedDefinition: result?.normalizedDefinition || definition,
            errors,
            message,
        };
    }

    function assertValidBattleDefinition(definition) {
        const { normalizedDefinition, errors, message } = validateAndNormalizeBattleDefinition(definition);
        if (errors.length) {
            throw new Error(message || 'Battle definition is invalid.');
        }

        return normalizedDefinition;
    }

    function assertValidUnitDefinition(definition) {
        const { normalizedDefinition, errors, message } = validateUnitDefinition(definition);
        if (errors.length) {
            throw new Error(message || 'Unit definition is invalid.');
        }

        return normalizedDefinition;
    }

    battleModules.validation = battleModules.validation || {};
    battleModules.validation.validateAndNormalizeBattleDefinition = validateAndNormalizeBattleDefinition;
    battleModules.validation.assertValidBattleDefinition = assertValidBattleDefinition;
    battleModules.validation.validateUnitDefinition = validateUnitDefinition;
    battleModules.validation.assertValidUnitDefinition = assertValidUnitDefinition;

    battleModules.validateAndNormalizeBattleDefinition = validateAndNormalizeBattleDefinition;
    battleModules.assertValidBattleDefinition = assertValidBattleDefinition;
    battleModules.validateUnitDefinition = validateUnitDefinition;
    battleModules.assertValidUnitDefinition = assertValidUnitDefinition;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        validateAndNormalizeBattleDefinition,
        assertValidBattleDefinition,
        validateUnitDefinition,
        assertValidUnitDefinition,
    };
})();
