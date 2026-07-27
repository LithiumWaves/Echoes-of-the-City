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
        paralyze: { id: 'paralyze', label: 'Paralyze', countOnly: true },
        poise: { id: 'poise', label: 'Poise', iconPath: 'assets/statuseffects/keywordstatus/Poise.png' },
        plus_coin_boost: { id: 'plus_coin_boost', label: 'Plus Coin Boost', countOnly: true },
        plus_coin_drop: { id: 'plus_coin_drop', label: 'Plus Coin Drop', countOnly: true },
        minus_coin_boost: { id: 'minus_coin_boost', label: 'Minus Coin Boost', countOnly: true },
        minus_coin_drop: { id: 'minus_coin_drop', label: 'Minus Coin Drop', countOnly: true },
        rupture: { id: 'rupture', label: 'Rupture', iconPath: 'assets/statuseffects/keywordstatus/Rupture.png' },
        sinking: { id: 'sinking', label: 'Sinking', iconPath: 'assets/statuseffects/keywordstatus/Sinking.png' },
        tremor: { id: 'tremor', label: 'Tremor', iconPath: 'assets/statuseffects/keywordstatus/Tremor.png' },
    };

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
        skillSelected: 'Skill Selected',
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
        modifySpeed: { id: 'modifySpeed', label: 'Modify Speed' },
        retargetSlot: { id: 'retargetSlot', label: 'Retarget Slot' },
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

        statusDefinitions[definitionId] = cloneRegistryValue(registeredDefinition);

        const aliases = Array.isArray(options.aliases) ? options.aliases : [];
        aliases
            .filter((alias) => typeof alias === 'string' && alias)
            .forEach((alias) => {
                statusDefinitions[alias] = statusDefinitions[definitionId];
            });

        return getStatusDefinition(definitionId);
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
            return `Adjust ${effect.target || 'opponent'} SP by ${formatSignedNumber(effect.value || 0)}.`;
        case 'healHp':
            return `Heal ${effect.target || 'opponent'} for ${effect.value || 0} HP.`;
        case 'adjustStatus':
            return `Adjust ${effect.target || 'opponent'} ${formatStatusAdjustment(effect)}.`;
        case 'modifyContext':
            return `Modify ${effect.field} via ${effect.operation}.`;
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
        case 'modifySpeed':
            return `${effect.operation === 'set' ? 'Set' : 'Adjust'} ${effect.target || 'opponent'} Speed ${effect.operation === 'set' ? 'to' : 'by'} ${effect.value || 0}.`;
        case 'retargetSlot':
            return `Retarget ${effect.target || 'opponent'} to ${retargetSelectorLabels[effect.selector] || effect.selector}.`;
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
