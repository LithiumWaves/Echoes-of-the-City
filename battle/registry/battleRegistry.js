(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function cloneRegistryValue(value) {
        if (Array.isArray(value)) {
            return value.map((entry) => cloneRegistryValue(entry));
        }

        if (!value || typeof value !== 'object') {
            return value;
        }

        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                typeof entry === 'function' ? entry : cloneRegistryValue(entry),
            ]),
        );
    }

    const statusDefinitions = {
        bleed: { id: 'bleed', label: 'Bleed', iconPath: 'assets/statuseffects/keywordstatus/Bleed.png' },
        burn: { id: 'burn', label: 'Burn', iconPath: 'assets/statuseffects/keywordstatus/Burn.png' },
        protection: { id: 'protection', label: 'Protection', countOnly: true },
        charge: { id: 'charge', label: 'Charge', iconPath: 'assets/statuseffects/keywordstatus/Charge.png' },
        haste: { id: 'haste', label: 'Haste', countOnly: true },
        bind: { id: 'bind', label: 'Bind', countOnly: true },
        fragile: { id: 'fragile', label: 'Fragile', countOnly: true },
        paralyze: { id: 'paralyze', label: 'Paralyze', countOnly: true },
        poise: { id: 'poise', label: 'Poise', iconPath: 'assets/statuseffects/keywordstatus/Poise.png' },
        plus_coin_boost: { id: 'plus_coin_boost', label: 'Plus Coin Boost', countOnly: true },
        plus_coin_drop: { id: 'plus_coin_drop', label: 'Plus Coin Drop', countOnly: true },
        minus_coin_boost: { id: 'minus_coin_boost', label: 'Minus Coin Boost', countOnly: true },
        minus_coin_drop: { id: 'minus_coin_drop', label: 'Minus Coin Drop', countOnly: true },
        attack_power_up: { id: 'attack_power_up', label: 'Attack Power Up', countOnly: true },
        attack_power_down: { id: 'attack_power_down', label: 'Attack Power Down', countOnly: true },
        offense_level_up: { id: 'offense_level_up', label: 'Offense Level Up', countOnly: true },
        offense_level_down: { id: 'offense_level_down', label: 'Offense Level Down', countOnly: true },
        defense_level_up: { id: 'defense_level_up', label: 'Defense Level Up', countOnly: true },
        defense_level_down: { id: 'defense_level_down', label: 'Defense Level Down', countOnly: true },
        rupture: { id: 'rupture', label: 'Rupture', iconPath: 'assets/statuseffects/keywordstatus/Rupture.png' },
        sinking: { id: 'sinking', label: 'Sinking', iconPath: 'assets/statuseffects/keywordstatus/Sinking.png' },
        tremor: { id: 'tremor', label: 'Tremor', iconPath: 'assets/statuseffects/keywordstatus/Tremor.png' },
    };
    const statusDefinitionAliases = battleModules.statusDefinitionAliases || (battleModules.statusDefinitionAliases = {});

    const affinityLabels = {
        slash: 'Slash',
        pierce: 'Pierce',
        blunt: 'Blunt',
        wrath: 'Wrath',
        lust: 'Lust',
        sloth: 'Sloth',
        gluttony: 'Gluttony',
        gloom: 'Gloom',
        pride: 'Pride',
        envy: 'Envy',
    };

    const triggerLabels = {
        onSelect: 'On Select',
        onHit: 'On Hit',
        onClashWin: 'On Clash Win',
        onClashLose: 'On Clash Lose',
        onAttackEnd: 'On Attack End',
    };

    const passiveHookLabels = {
        battleStart: 'Battle Start',
        turnStart: 'Turn Start',
        beforeCoinRoll: 'Before Coin Roll',
        coinRoll: 'Coin Roll',
        afterCoinRoll: 'After Coin Roll',
        skillSelected: 'Skill Selected',
        statusApplied: 'Status Applied',
        statusChanged: 'Status Changed',
        statusExpired: 'Status Expired',
        statusConsumed: 'Status Consumed',
        beforeStatusTrigger: 'Before Status Trigger',
        afterStatusTrigger: 'After Status Trigger',
        beforeDamage: 'Before Damage',
        afterDamage: 'After Damage',
        hitDealt: 'Hit Dealt',
        hitTaken: 'Hit Taken',
        damageDealt: 'Damage Dealt',
        damageTaken: 'Damage Taken',
        statusInflicted: 'Status Inflicted',
        statusReceived: 'Status Received',
        attackEnd: 'Attack End',
        turnEnd: 'Turn End',
        unitDefeated: 'Unit Defeated',
        battleEnd: 'Battle End',
    };

    const retargetSelectorLabels = {
        sourceUnit: 'the source unit',
        targetUnit: 'the current target',
        firstLivingOpponent: 'the first living opponent',
        firstLivingAlly: 'the first living ally',
        mirrorOpponent: 'the mirrored opponent',
    };

    const effectDefinitions = {
        applyStatus: { id: 'applyStatus', label: 'Apply Status' },
        queueStatus: { id: 'queueStatus', label: 'Queue Status' },
        dealFixedDamage: { id: 'dealFixedDamage', label: 'Deal Fixed Damage' },
        adjustSanity: { id: 'adjustSanity', label: 'Adjust Sanity' },
        healHp: { id: 'healHp', label: 'Heal HP' },
        adjustStatus: { id: 'adjustStatus', label: 'Adjust Status' },
        modifyContext: { id: 'modifyContext', label: 'Modify Context' },
        modifyCoinMap: { id: 'modifyCoinMap', label: 'Modify Coin Map' },
        setFollowUpSkill: { id: 'setFollowUpSkill', label: 'Set Follow-up Skill' },
        modifyPhysicalResistance: { id: 'modifyPhysicalResistance', label: 'Modify Physical Resistance' },
        modifySinResistance: { id: 'modifySinResistance', label: 'Modify Sin Resistance' },
        modifyDefenseLevel: { id: 'modifyDefenseLevel', label: 'Modify Defense Level' },
        modifyOffenseLevel: { id: 'modifyOffenseLevel', label: 'Modify Offense Level' },
        modifySpeed: { id: 'modifySpeed', label: 'Modify Speed' },
        retargetSlot: { id: 'retargetSlot', label: 'Retarget Slot' },
        burstTremor: { id: 'burstTremor', label: 'Burst Tremor' },
        consumeStatus: { id: 'consumeStatus', label: 'Consume Status' },
    };

    function getStatusDefinitionValidator() {
        return battleModules.validation?.validateStatusDefinition
            || battleModules.validateStatusDefinition
            || null;
    }

    function getStatusDefinition(statusId) {
        const definition = statusDefinitions[statusId] || null;
        return definition ? cloneRegistryValue(definition) : null;
    }

    function isSeedStatusDefinition(definition) {
        if (!definition || typeof definition !== 'object') {
            return false;
        }

        return !definition.description
            && !definition.stackModel
            && !definition.hooks;
    }

    function registerStatusDefinition(definition, options = {}) {
        const validator = getStatusDefinitionValidator();
        const { normalizedDefinition, errors, message } = typeof validator === 'function'
            ? validator(definition)
            : { normalizedDefinition: definition, errors: [], message: null };

        if (Array.isArray(errors) && errors.length) {
            throw new Error(message || 'Status definition is invalid.');
        }

        const registeredDefinition = normalizedDefinition || definition;
        const definitionId = registeredDefinition?.id;
        if (!definitionId || typeof definitionId !== 'string') {
            throw new Error('Registered status definitions must have an id.');
        }

        const existingDefinition = statusDefinitions[definitionId];
        if (
            existingDefinition
            && existingDefinition.id === definitionId
            && !options.allowOverwrite
            && !isSeedStatusDefinition(existingDefinition)
        ) {
            throw new Error(`Status definition "${definitionId}" is already registered.`);
        }

        statusDefinitions[definitionId] = cloneRegistryValue(registeredDefinition);

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        statusDefinitionAliases[definitionId] = aliases
            .filter((alias) => typeof alias === 'string' && alias);

        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                const existingAliasDefinition = statusDefinitions[alias];
                if (existingAliasDefinition && existingAliasDefinition.id !== definitionId && !options.allowOverwrite) {
                    throw new Error(`Status alias "${alias}" is already registered.`);
                }
                statusDefinitions[alias] = statusDefinitions[definitionId];
            });

        return getStatusDefinition(definitionId);
    }

    function unregisterStatusDefinition(definitionId) {
        if (!definitionId || typeof definitionId !== 'string') {
            return false;
        }

        const existingDefinition = statusDefinitions[definitionId];
        if (!existingDefinition || existingDefinition.id !== definitionId) {
            return false;
        }

        const aliases = statusDefinitionAliases[definitionId] || [];
        delete statusDefinitions[definitionId];
        aliases.forEach((alias) => {
            delete statusDefinitions[alias];
        });
        delete statusDefinitionAliases[definitionId];
        return true;
    }

    function listStatusDefinitions() {
        return Object.entries(statusDefinitions).map(([key, definition]) => ({
            key,
            id: definition?.id || null,
            label: definition?.label || definition?.name || key,
        }));
    }

    function getStatusLabel(statusId) {
        const definition = getStatusDefinition(statusId);
        return definition?.label || definition?.name || affinityLabels[statusId] || statusId;
    }

    function getStatusIconPath(statusId) {
        return getStatusDefinition(statusId)?.iconPath || null;
    }

    function isCountOnlyStatus(statusId) {
        return Boolean(getStatusDefinition(statusId)?.countOnly);
    }

    function isSupportedStatusId(statusId) {
        return Boolean(getStatusDefinition(statusId));
    }

    function getEffectDefinition(effectType) {
        return effectDefinitions[effectType] || null;
    }

    function isSupportedEffectType(effectType) {
        return Boolean(getEffectDefinition(effectType));
    }

    function getTriggerLabel(trigger) {
        return triggerLabels[trigger] || passiveHookLabels[trigger] || trigger;
    }

    function formatSignedNumber(value) {
        if (typeof value !== 'number') {
            return '0';
        }

        return value >= 0 ? `+${value}` : `${value}`;
    }

    function formatStatusPayload(effect) {
        const statusLabel = getStatusLabel(effect.statusId);
        if (isCountOnlyStatus(effect.statusId)) {
            return `${statusLabel} ${effect.count ?? 0}`;
        }

        return `${statusLabel} ${effect.potency ?? 0}/${effect.count ?? 0}`;
    }

    function formatStatusAdjustment(effect) {
        const parts = [];
        if (typeof effect.potencyDelta === 'number' && !isCountOnlyStatus(effect.statusId)) {
            parts.push(`Potency ${formatSignedNumber(effect.potencyDelta)}`);
        }
        if (typeof effect.countDelta === 'number') {
            parts.push(`Count ${formatSignedNumber(effect.countDelta)}`);
        }
        return `${getStatusLabel(effect.statusId)} ${parts.join(', ')}`.trim();
    }

    function getEffectBodyDescription(effect) {
        switch (effect?.type) {
        case 'applyStatus':
            return `Apply ${formatStatusPayload(effect)} to ${effect.target || 'opponent'}.`;
        case 'queueStatus':
            return `Queue ${formatStatusPayload(effect)} on ${effect.target || 'opponent'} next turn.`;
        case 'dealFixedDamage':
            if (typeof effect.amount === 'number') {
                return `Deal ${effect.amount} fixed damage to ${effect.target || 'opponent'}.`;
            }
            if (effect.amount?.statusPotency?.statusId) {
                return `Deal fixed damage to ${effect.target || 'opponent'} equal to ${getStatusLabel(effect.amount.statusPotency.statusId)} potency.`;
            }
            return `Deal fixed damage to ${effect.target || 'opponent'}.`;
        case 'adjustSanity':
            if (typeof effect.amount === 'number') {
                return `Adjust ${effect.target || 'opponent'} SP by ${formatSignedNumber(effect.amount)}.`;
            }
            if (effect.amount?.statusPotency?.statusId) {
                return `Adjust ${effect.target || 'opponent'} SP by ${getStatusLabel(effect.amount.statusPotency.statusId)} potency.`;
            }
            return `Adjust ${effect.target || 'opponent'} SP by ${formatSignedNumber(effect.value || 0)}.`;
        case 'healHp':
            return `Heal ${effect.target || 'opponent'} for ${effect.value || 0} HP.`;
        case 'adjustStatus':
            return `Adjust ${effect.target || 'opponent'} ${formatStatusAdjustment(effect)}.`;
        case 'modifyContext':
            return effect.operation === 'set'
                ? `Set ${effect.field} to ${String(effect.value)}.`
                : `Modify ${effect.field} via ${effect.operation}.`;
        case 'modifyCoinMap':
            return `Modify ${effect.field} on Coin ${effect.coinIndex} by ${formatSignedNumber(effect.value || 0)}.`;
        case 'setFollowUpSkill':
            return `Set follow-up skill to ${effect.skillId}.`;
        case 'modifyPhysicalResistance':
            return `Modify ${effect.target || 'opponent'} ${getStatusLabel(effect.damageType)} resistance by ${effect.value}x.`;
        case 'modifySinResistance':
            return `Modify ${effect.target || 'opponent'} ${getStatusLabel(effect.sinType)} resistance by ${effect.value}x.`;
        case 'modifyDefenseLevel':
            return `Adjust ${effect.target || 'opponent'} Defense Level by ${formatSignedNumber(effect.value || 0)}.`;
        case 'modifyOffenseLevel':
            return `Adjust ${effect.target || 'opponent'} Offense Level by ${formatSignedNumber(effect.value || 0)}.`;
        case 'modifySpeed':
            return `${effect.operation === 'set' ? 'Set' : 'Adjust'} ${effect.target || 'opponent'} Speed ${effect.operation === 'set' ? 'to' : 'by'} ${effect.value || 0}.`;
        case 'retargetSlot':
            return `Retarget ${effect.target || 'opponent'} to ${retargetSelectorLabels[effect.selector] || effect.selector}.`;
        case 'burstTremor':
            return `Burst Tremor on ${effect.target || 'opponent'}.`;
        case 'consumeStatus':
            return `Consume ${getStatusLabel(effect.statusId)} from ${effect.target || 'opponent'}.`;
        default:
            return getEffectDefinition(effect?.type)?.label || effect?.type || 'Unknown Effect';
        }
    }

    function describeEffect(effect, options = {}) {
        const prefix = options.hookName
            ? `${getTriggerLabel(options.hookName)}: `
            : options.includeTrigger && effect?.trigger
                ? `${getTriggerLabel(effect.trigger)}: `
                : '';
        return `${prefix}${getEffectBodyDescription(effect)}`;
    }

    const registry = {
        statusDefinitions,
        effectDefinitions,
        passiveHookLabels,
        registerStatusDefinition,
        unregisterStatusDefinition,
        listStatusDefinitions,
        getStatusDefinition,
        getStatusLabel,
        getStatusIconPath,
        isCountOnlyStatus,
        isSupportedStatusId,
        getEffectDefinition,
        isSupportedEffectType,
        getTriggerLabel,
        describeEffect,
    };

    battleModules.registry = registry;

    Object.assign(battleModules, registry);

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        battleRegistry: registry,
    };
})();
