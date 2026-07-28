(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registry = battleModules.registry || {};

    const PHYSICAL_DAMAGE_TYPES = new Set(['slash', 'pierce', 'blunt']);
    const SIN_TYPES = new Set(['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy']);
    const SKILL_TYPES = new Set(['attack', 'guard', 'evade', 'counter']);
    const EFFECT_TRIGGERS = new Set(['onSelect', 'onHit', 'onClashWin', 'onClashLose', 'onAttackEnd']);
    const EFFECT_TYPES = new Set(Object.keys(registry.effectDefinitions || {}));
    const CONTEXT_FIELDS = new Set([
        'coinPowerBonus',
        'flatPowerBonus',
        'clashPowerBonus',
        'damageMultiplier',
        'damageReductionMultiplier',
        'criticalBonus',
        'staticDamageBonus',
        'dynamicDamageBonus',
        'clashRoundBonus',
        'observationBonus',
        'additiveDamage',
        'forceCoinZero',
    ]);
    const COIN_MAP_FIELDS = new Set([
        'criticalBonusByCoin',
        'staticDamageBonusByCoin',
        'dynamicDamageBonusByCoin',
        'clashRoundBonusByCoin',
        'observationBonusByCoin',
        'additiveDamageByCoin',
        'extraCritDamageByCoin',
        'critFinalPowerBonusByCoin',
    ]);
    const ENEMY_AI_SKILLS = new Set(['cycle', 'random', 'first']);
    const ENEMY_AI_TARGETS = new Set(['mirror', 'firstLiving', 'lowestHp', 'random']);
    const PASSIVE_HOOKS = new Set(Object.keys(registry.passiveHookLabels || {}));
    const RETARGET_SELECTORS = new Set([
        'sourceUnit',
        'targetUnit',
        'firstLivingOpponent',
        'firstLivingAlly',
        'mirrorOpponent',
    ]);
    const HOOK_BLOCK_ONCE_PER = new Set(['battle', 'turn', 'skill', 'coin']);
    const HOOK_CONDITION_TYPES = new Set([
        'always',
        'damageAtLeast',
        'hasStatus',
        'statusPotencyAtLeast',
        'statusPotencyAtOrBelow',
        'statusCountAtLeast',
        'statusCountAtOrBelow',
        'encounterResourceAtLeast',
        'encounterResourceAtOrBelow',
        'skillType',
        'skillSinType',
        'skillDamageType',
        'coinIndex',
        'criticalHit',
        'targetStaggered',
        'hpPercentAtOrBelow',
        'hpPercentAtOrAbove',
        'spAtOrBelow',
        'spAtOrAbove',
        'eventStatusIdIs',
    ]);

    function cloneDefinition(definition) {
        if (Array.isArray(definition)) {
            return definition.map((value) => cloneDefinition(value));
        }

        if (!definition || typeof definition !== 'object') {
            return definition;
        }

        return Object.fromEntries(
            Object.entries(definition).map(([key, value]) => [
                key,
                typeof value === 'function' ? value : cloneDefinition(value),
            ]),
        );
    }

    function normalizeBattleDefinition(definition) {
        const source = cloneDefinition(definition || {});
        const normalized = {
            id: source.id || 'custom-battle',
            name: source.name || 'Custom Battle',
            playerUnits: Array.isArray(source.playerUnits)
                ? source.playerUnits
                : (source.hero ? [source.hero] : []),
            enemyUnits: Array.isArray(source.enemyUnits)
                ? source.enemyUnits
                : (source.enemy ? [source.enemy] : []),
            rules: {
                encounterType: source.rules?.encounterType || 'focused',
                maxTurns: source.rules?.maxTurns || 100,
                victoryCondition: source.rules?.victoryCondition || 'defeat-all-enemies',
                failureCondition: source.rules?.failureCondition || 'all-allies-defeated',
                enemyAiProfile: source.rules?.enemyAiProfile || source.enemyAiProfile || null,
            },
        };

        if (source.description) {
            normalized.description = source.description;
        }

        return normalized;
    }

    function pushError(errors, path, message) {
        errors.push(`${path}: ${message}`);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function validateAmountDefinition(errors, amount, path) {
        if (isFiniteNumber(amount)) {
            return;
        }

        if (!amount || typeof amount !== 'object' || Array.isArray(amount)) {
            pushError(errors, path, 'must be a number or amount definition object.');
            return;
        }

        if (amount.statusPotency || amount.statusCount) {
            const amountKey = amount.statusPotency ? 'statusPotency' : 'statusCount';
            const amountSource = amount[amountKey];
            if (typeof amountSource !== 'object' || Array.isArray(amountSource)) {
                pushError(errors, `${path}.${amountKey}`, 'must be an object.');
                return;
            }
            if (!amountSource.statusId || typeof amountSource.statusId !== 'string') {
                pushError(errors, `${path}.${amountKey}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(amountSource.statusId)) {
                pushError(errors, `${path}.${amountKey}.statusId`, 'must reference a supported status id.');
            }
            if (amountSource.target != null && !['self', 'opponent'].includes(amountSource.target)) {
                pushError(errors, `${path}.${amountKey}.target`, 'must be "self" or "opponent" when provided.');
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.product) {
            if (!Array.isArray(amount.product) || amount.product.length < 2) {
                pushError(errors, `${path}.product`, 'must be an array with at least two amount definitions.');
                return;
            }

            amount.product.forEach((entry, index) => {
                validateAmountDefinition(errors, entry, `${path}.product[${index}]`);
            });
            return;
        }

        pushError(errors, path, 'must contain a supported amount definition.');
    }

    function validateResistanceBucket(errors, unitPath, bucket, source, allowedKeys) {
        if (source == null) {
            return;
        }

        if (typeof source !== 'object' || Array.isArray(source)) {
            pushError(errors, `${unitPath}.resistances.${bucket}`, 'must be an object.');
            return;
        }

        Object.entries(source).forEach(([key, value]) => {
            if (!allowedKeys.has(key)) {
                pushError(errors, `${unitPath}.resistances.${bucket}.${key}`, 'is not a supported resistance key.');
                return;
            }

            if (!isFiniteNumber(value) || value <= 0) {
                pushError(errors, `${unitPath}.resistances.${bucket}.${key}`, 'must be a positive number.');
            }
        });
    }

    function isHookBlockDefinition(definition) {
        return Boolean(definition)
            && typeof definition === 'object'
            && !Array.isArray(definition)
            && Array.isArray(definition.actions);
    }

    function normalizeHookBlocks(hookDefinition) {
        if (isHookBlockDefinition(hookDefinition)) {
            return [hookDefinition];
        }

        if (!Array.isArray(hookDefinition) || !hookDefinition.length) {
            return null;
        }

        return hookDefinition.every((entry) => isHookBlockDefinition(entry))
            ? hookDefinition
            : null;
    }

    function validateHookCondition(errors, condition, path) {
        if (!condition || typeof condition !== 'object' || Array.isArray(condition)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (!HOOK_CONDITION_TYPES.has(condition.type)) {
            pushError(errors, `${path}.type`, 'is missing or unsupported.');
            return;
        }

        if (condition.target != null && !['self', 'opponent'].includes(condition.target)) {
            pushError(errors, `${path}.target`, 'must be "self" or "opponent" when provided.');
        }

        switch (condition.type) {
        case 'always':
            break;
        case 'encounterResourceAtLeast':
        case 'encounterResourceAtOrBelow':
            if (!condition.resourceId || typeof condition.resourceId !== 'string') {
                pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
            }
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'criticalHit':
            if (condition.value != null && typeof condition.value !== 'boolean') {
                pushError(errors, `${path}.value`, 'must be a boolean when provided.');
            }
            break;
        case 'skillSinType':
            if (typeof condition.value === 'string') {
                if (!SIN_TYPES.has(condition.value)) {
                    pushError(errors, `${path}.value`, 'must be a supported Sin affinity.');
                }
            } else if (Array.isArray(condition.value)) {
                condition.value.forEach((entry, index) => {
                    if (typeof entry !== 'string' || !SIN_TYPES.has(entry)) {
                        pushError(errors, `${path}.value[${index}]`, 'must be a supported Sin affinity.');
                    }
                });
            } else {
                pushError(errors, `${path}.value`, 'must be a supported Sin affinity or array of affinities.');
            }
            break;
        case 'skillDamageType':
            if (typeof condition.value === 'string') {
                if (!PHYSICAL_DAMAGE_TYPES.has(condition.value)) {
                    pushError(errors, `${path}.value`, 'must be slash, pierce, or blunt.');
                }
            } else if (Array.isArray(condition.value)) {
                condition.value.forEach((entry, index) => {
                    if (typeof entry !== 'string' || !PHYSICAL_DAMAGE_TYPES.has(entry)) {
                        pushError(errors, `${path}.value[${index}]`, 'must be slash, pierce, or blunt.');
                    }
                });
            } else {
                pushError(errors, `${path}.value`, 'must be a supported damage type or array of damage types.');
            }
            break;
        case 'hasStatus':
            if (!condition.statusId || typeof condition.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            break;
        case 'statusPotencyAtLeast':
        case 'statusPotencyAtOrBelow':
        case 'statusCountAtLeast':
        case 'statusCountAtOrBelow':
            if (!condition.statusId || typeof condition.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (!isFiniteNumber(condition.value) || condition.value < 0) {
                pushError(errors, `${path}.value`, 'must be a non-negative number.');
            }
            break;
        case 'skillType':
            if (
                !condition.value
                || !(
                    typeof condition.value === 'string'
                    || (Array.isArray(condition.value) && condition.value.every((entry) => typeof entry === 'string' && entry))
                )
            ) {
                pushError(errors, `${path}.value`, 'must be a skill type string or array of skill type strings.');
            }
            break;
        case 'eventStatusIdIs':
            if (!condition.value || typeof condition.value !== 'string') {
                pushError(errors, `${path}.value`, 'must be a supported status id.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a supported status id.');
            }
            break;
        case 'coinIndex':
            if (!Number.isInteger(condition.value) || condition.value <= 0) {
                pushError(errors, `${path}.value`, 'must be a positive integer.');
            }
            break;
        case 'damageAtLeast':
        case 'hpPercentAtOrBelow':
        case 'hpPercentAtOrAbove':
        case 'spAtOrBelow':
        case 'spAtOrAbove':
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'targetStaggered':
            if (condition.value != null && typeof condition.value !== 'boolean') {
                pushError(errors, `${path}.value`, 'must be a boolean when provided.');
            }
            break;
        default:
            break;
        }
    }

    function validateHookBlock(errors, unitSkillIds, block, path) {
        if (!block || typeof block !== 'object' || Array.isArray(block)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (block.id != null && typeof block.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a string when provided.');
        }

        if (block.oncePer != null && !HOOK_BLOCK_ONCE_PER.has(block.oncePer)) {
            pushError(errors, `${path}.oncePer`, 'must be battle, turn, skill, or coin when provided.');
        }

        if (block.conditions != null) {
            if (!Array.isArray(block.conditions)) {
                pushError(errors, `${path}.conditions`, 'must be an array when provided.');
            } else {
                block.conditions.forEach((condition, index) => {
                    validateHookCondition(errors, condition, `${path}.conditions[${index}]`);
                });
            }
        }

        if (!Array.isArray(block.actions) || !block.actions.length) {
            pushError(errors, `${path}.actions`, 'must be a non-empty array of effect definitions.');
            return;
        }

        block.actions.forEach((effect, index) => {
            validateEffect(errors, unitSkillIds, effect, `${path}.actions[${index}]`, { requireTrigger: false });
        });
    }

    function validateHookDefinition(errors, unitSkillIds, hookDefinition, path, options = {}) {
        const { allowFunction = false } = options;

        if (typeof hookDefinition === 'function') {
            if (!allowFunction) {
                pushError(errors, path, 'must be a hook block or an array of effect definitions.');
            }
            return;
        }

        const hookBlocks = normalizeHookBlocks(hookDefinition);
        if (hookBlocks) {
            hookBlocks.forEach((block, index) => {
                validateHookBlock(errors, unitSkillIds, block, `${path}[${index}]`);
            });
            return;
        }

        if (!Array.isArray(hookDefinition)) {
            pushError(errors, path, allowFunction
                ? 'must be a function, hook block, or an array of effect definitions.'
                : 'must be a hook block or an array of effect definitions.');
            return;
        }

        hookDefinition.forEach((effect, index) => {
            validateEffect(errors, unitSkillIds, effect, `${path}[${index}]`, { requireTrigger: false });
        });
    }

    function validateEffect(errors, unitSkillIds, effect, path, options = {}) {
        const { requireTrigger = true } = options;
        if (!effect || typeof effect !== 'object' || Array.isArray(effect)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (requireTrigger && !EFFECT_TRIGGERS.has(effect.trigger)) {
            pushError(errors, `${path}.trigger`, 'is missing or unsupported.');
        }

        if (!EFFECT_TYPES.has(effect.type)) {
            pushError(errors, `${path}.type`, 'is missing or unsupported.');
            return;
        }

        if (effect.target != null && !['self', 'opponent'].includes(effect.target)) {
            pushError(errors, `${path}.target`, 'must be "self" or "opponent".');
        }

        if (effect.coinIndex != null && (!Number.isInteger(effect.coinIndex) || effect.coinIndex <= 0)) {
            pushError(errors, `${path}.coinIndex`, 'must be a positive integer.');
        }

        if (effect.criticalOnly != null && typeof effect.criticalOnly !== 'boolean') {
            pushError(errors, `${path}.criticalOnly`, 'must be a boolean when provided.');
        }

        if (effect.minStatusPotency != null && (!isFiniteNumber(effect.minStatusPotency) || effect.minStatusPotency < 0)) {
            pushError(errors, `${path}.minStatusPotency`, 'must be a non-negative number when provided.');
        }

        if (effect.statusSource != null && !['self', 'opponent'].includes(effect.statusSource)) {
            pushError(errors, `${path}.statusSource`, 'must be "self" or "opponent" when provided.');
        }

        if (effect.outcome != null && !['win', 'lose'].includes(effect.outcome)) {
            pushError(errors, `${path}.outcome`, 'must be "win" or "lose" when provided.');
        }

        switch (effect.type) {
        case 'applyStatus':
        case 'queueStatus':
        case 'consumeStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if ((effect.type === 'applyStatus' || effect.type === 'queueStatus') && effect.potencyAmount != null) {
                validateAmountDefinition(errors, effect.potencyAmount, `${path}.potencyAmount`);
            }
            if ((effect.type === 'applyStatus' || effect.type === 'queueStatus') && effect.countAmount != null) {
                validateAmountDefinition(errors, effect.countAmount, `${path}.countAmount`);
            }
            break;
        case 'dealFixedDamage':
            validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            if (effect.statusId != null && typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a string when provided.');
            } else if (typeof effect.statusId === 'string' && typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id when provided.');
            }
            break;
        case 'adjustSanity':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.statusId != null && typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a string when provided.');
            } else if (typeof effect.statusId === 'string' && typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id when provided.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            break;
        case 'healHp':
        case 'modifyDefenseLevel':
        case 'modifyOffenseLevel':
        case 'modifySpeed':
        case 'gainShield':
        case 'clearShield':
        case 'burstTremor':
        case 'adjustEncounterResource':
            if (effect.type !== 'clearShield' && effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (effect.type !== 'clearShield' && !isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            if (effect.type === 'modifySpeed' && effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            if (effect.type === 'gainShield') {
                if (!effect.shieldId || typeof effect.shieldId !== 'string') {
                    pushError(errors, `${path}.shieldId`, 'must be a non-empty string.');
                }
                if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                    pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
                }
                if (effect.stackSize != null && (!isFiniteNumber(effect.stackSize) || effect.stackSize <= 0)) {
                    pushError(errors, `${path}.stackSize`, 'must be a positive number when provided.');
                }
                if (effect.expiresAt != null && !['turnStart', 'turnEnd'].includes(effect.expiresAt)) {
                    pushError(errors, `${path}.expiresAt`, 'must be "turnStart" or "turnEnd" when provided.');
                }
                if (effect.linkedStatusId != null && (typeof effect.linkedStatusId !== 'string' || !registry.isSupportedStatusId(effect.linkedStatusId))) {
                    pushError(errors, `${path}.linkedStatusId`, 'must reference a supported status id when provided.');
                }
                if (effect.linkedStatusCountDeltaOnBreak != null && !isFiniteNumber(effect.linkedStatusCountDeltaOnBreak)) {
                    pushError(errors, `${path}.linkedStatusCountDeltaOnBreak`, 'must be a number when provided.');
                }
            }
            if (effect.type === 'clearShield') {
                if (!effect.shieldId || typeof effect.shieldId !== 'string') {
                    pushError(errors, `${path}.shieldId`, 'must be a non-empty string.');
                }
            }
            if (effect.type === 'adjustEncounterResource') {
                if (!effect.resourceId || typeof effect.resourceId !== 'string') {
                    pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
                }
                if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                    pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
                }
                if (effect.min != null && (!isFiniteNumber(effect.min) || effect.min < 0)) {
                    pushError(errors, `${path}.min`, 'must be a non-negative number when provided.');
                }
                if (effect.max != null && (!isFiniteNumber(effect.max) || effect.max < 0)) {
                    pushError(errors, `${path}.max`, 'must be a non-negative number when provided.');
                }
            }
            break;
        case 'adjustStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (effect.potencyDelta != null && !isFiniteNumber(effect.potencyDelta)) {
                pushError(errors, `${path}.potencyDelta`, 'must be a number when provided.');
            }
            if (effect.countDelta != null && !isFiniteNumber(effect.countDelta)) {
                pushError(errors, `${path}.countDelta`, 'must be a number when provided.');
            }
            if (effect.potencyAmount != null) {
                validateAmountDefinition(errors, effect.potencyAmount, `${path}.potencyAmount`);
            }
            if (effect.countAmount != null) {
                validateAmountDefinition(errors, effect.countAmount, `${path}.countAmount`);
            }
            if (effect.potencyOperation != null && !['add', 'set'].includes(effect.potencyOperation)) {
                pushError(errors, `${path}.potencyOperation`, 'must be omitted, "add", or "set".');
            }
            if (effect.countOperation != null && !['add', 'set'].includes(effect.countOperation)) {
                pushError(errors, `${path}.countOperation`, 'must be omitted, "add", or "set".');
            }
            if (
                effect.potencyDelta == null
                && effect.countDelta == null
                && effect.potencyAmount == null
                && effect.countAmount == null
            ) {
                pushError(errors, `${path}`, 'must provide potencyDelta, countDelta, potencyAmount, countAmount, or a combination.');
            }
            break;
        case 'modifyContext':
            if (!CONTEXT_FIELDS.has(effect.field)) {
                pushError(errors, `${path}.field`, 'is missing or unsupported for context modification.');
            }
            if (!effect.operation || typeof effect.operation !== 'string') {
                pushError(errors, `${path}.operation`, 'must be provided.');
            }
            if (!['add', 'set', 'addStatusPotencyScaled', 'addStatusCountScaled', 'setToOneMinusStatusPotencyScaled', 'setToOnePlusStatusCountScaled', 'addSpeedDifferenceScaled'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'is not a supported context operation.');
            }
            if (effect.operation === 'add' && effect.amount == null && !isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number for add operations.');
            }
            if (effect.operation === 'add' && effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            }
            if (effect.operation === 'set' && typeof effect.value === 'undefined' && effect.amount == null) {
                pushError(errors, `${path}.value`, 'must be provided for set operations.');
            }
            if (effect.operation === 'set' && effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            }
            if (effect.operation === 'addStatusPotencyScaled' || effect.operation === 'setToOneMinusStatusPotencyScaled') {
                if (!effect.statusId || typeof effect.statusId !== 'string') {
                    pushError(errors, `${path}.statusId`, 'must be a non-empty string for status-scaled context operations.');
                }
                if (!isFiniteNumber(effect.multiplier)) {
                    pushError(errors, `${path}.multiplier`, 'must be a number for status-scaled context operations.');
                }
                if (effect.cap != null && (!isFiniteNumber(effect.cap) || effect.cap <= 0)) {
                    pushError(errors, `${path}.cap`, 'must be a positive number when provided.');
                }
            }
            if (effect.operation === 'addStatusCountScaled' || effect.operation === 'setToOnePlusStatusCountScaled') {
                if (!effect.statusId || typeof effect.statusId !== 'string') {
                    pushError(errors, `${path}.statusId`, 'must be a non-empty string for status-scaled context operations.');
                }
                if (!isFiniteNumber(effect.multiplier)) {
                    pushError(errors, `${path}.multiplier`, 'must be a number for status-scaled context operations.');
                }
                if (effect.cap != null && (!isFiniteNumber(effect.cap) || effect.cap <= 0)) {
                    pushError(errors, `${path}.cap`, 'must be a positive number when provided.');
                }
            }
            if ((effect.operation === 'addStatusPotencyScaled' || effect.operation === 'addStatusCountScaled') && effect.direction != null && !['add', 'subtract'].includes(effect.direction)) {
                pushError(errors, `${path}.direction`, 'must be "add" or "subtract" when provided.');
            }
            if (effect.operation === 'addSpeedDifferenceScaled') {
                if (!isFiniteNumber(effect.multiplier)) {
                    pushError(errors, `${path}.multiplier`, 'must be a number for speed-difference context operations.');
                }
                if (effect.cap != null && (!isFiniteNumber(effect.cap) || effect.cap <= 0)) {
                    pushError(errors, `${path}.cap`, 'must be a positive number when provided.');
                }
                if (effect.minDifference != null && (!isFiniteNumber(effect.minDifference) || effect.minDifference < 0)) {
                    pushError(errors, `${path}.minDifference`, 'must be a non-negative number when provided.');
                }
            }
            break;
        case 'modifyCoinMap':
            if (!COIN_MAP_FIELDS.has(effect.field)) {
                pushError(errors, `${path}.field`, 'is missing or unsupported for coin-map modification.');
            }
            if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (!Number.isInteger(effect.coinIndex) || effect.coinIndex <= 0) {
                pushError(errors, `${path}.coinIndex`, 'must be a positive integer for coin-map modification.');
            }
            break;
        case 'setFollowUpSkill':
            if (!effect.skillId || typeof effect.skillId !== 'string') {
                pushError(errors, `${path}.skillId`, 'must be a non-empty string.');
            } else if (!unitSkillIds.has(effect.skillId)) {
                pushError(errors, `${path}.skillId`, 'must reference another skill on the same unit.');
            }
            break;
        case 'modifyPhysicalResistance':
            if (!effect.damageType || !PHYSICAL_DAMAGE_TYPES.has(effect.damageType)) {
                pushError(errors, `${path}.damageType`, 'must be slash, pierce, or blunt.');
            }
            if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['multiplyBase', 'multiplyCurrent'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "multiplyBase", or "multiplyCurrent".');
            }
            break;
        case 'modifySinResistance':
            if (!effect.sinType || !SIN_TYPES.has(effect.sinType)) {
                pushError(errors, `${path}.sinType`, 'must be a supported Sin affinity.');
            }
            if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['multiplyBase', 'multiplyCurrent'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "multiplyBase", or "multiplyCurrent".');
            }
            break;
        case 'retargetSlot':
            if (!effect.selector || !RETARGET_SELECTORS.has(effect.selector)) {
                pushError(errors, `${path}.selector`, 'must be a supported retarget selector.');
            }
            if (effect.lockTarget != null && typeof effect.lockTarget !== 'boolean') {
                pushError(errors, `${path}.lockTarget`, 'must be a boolean when provided.');
            }
            break;
        default:
            break;
        }
    }

    function validateSkill(errors, skill, path, unitSkillIds) {
        if (!skill || typeof skill !== 'object' || Array.isArray(skill)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (!skill.id || typeof skill.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a non-empty string.');
        }
        if (!skill.name || typeof skill.name !== 'string') {
            pushError(errors, `${path}.name`, 'must be a non-empty string.');
        }
        if (!isFiniteNumber(skill.basePower)) {
            pushError(errors, `${path}.basePower`, 'must be a number.');
        }
        if (!isFiniteNumber(skill.coinPower)) {
            pushError(errors, `${path}.coinPower`, 'must be a number.');
        }
        if (!Number.isInteger(skill.coinCount) || skill.coinCount <= 0) {
            pushError(errors, `${path}.coinCount`, 'must be a positive integer.');
        }
        if (skill.skillType != null && !SKILL_TYPES.has(skill.skillType)) {
            pushError(errors, `${path}.skillType`, 'must be attack, guard, evade, or counter.');
        }
        if (skill.damageType != null && !PHYSICAL_DAMAGE_TYPES.has(skill.damageType)) {
            pushError(errors, `${path}.damageType`, 'must be slash, pierce, or blunt.');
        }
        if (skill.sinType != null && !SIN_TYPES.has(skill.sinType)) {
            pushError(errors, `${path}.sinType`, 'must be a supported Sin affinity.');
        }
        if (skill.borderPath != null && typeof skill.borderPath !== 'string') {
            pushError(errors, `${path}.borderPath`, 'must be a string when provided.');
        }
        if (skill.showInPlanner != null && typeof skill.showInPlanner !== 'boolean') {
            pushError(errors, `${path}.showInPlanner`, 'must be a boolean when provided.');
        }
        if (skill.ammo != null) {
            if (typeof skill.ammo !== 'object' || Array.isArray(skill.ammo)) {
                pushError(errors, `${path}.ammo`, 'must be an object when provided.');
            } else {
                if (!skill.ammo.statusId || typeof skill.ammo.statusId !== 'string') {
                    pushError(errors, `${path}.ammo.statusId`, 'must be a non-empty string.');
                } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(skill.ammo.statusId)) {
                    pushError(errors, `${path}.ammo.statusId`, 'must reference a supported status id.');
                }
                ['countCost', 'potencyCost', 'randomCost'].forEach((field) => {
                    if (skill.ammo[field] != null && (!Number.isInteger(skill.ammo[field]) || skill.ammo[field] < 0)) {
                        pushError(errors, `${path}.ammo.${field}`, 'must be a non-negative integer when provided.');
                    }
                });
                if (skill.ammo.cancelIfInsufficient != null && typeof skill.ammo.cancelIfInsufficient !== 'boolean') {
                    pushError(errors, `${path}.ammo.cancelIfInsufficient`, 'must be a boolean when provided.');
                }
            }
        }

        if (Array.isArray(skill.effects)) {
            skill.effects.forEach((effect, index) => {
                validateEffect(errors, unitSkillIds, effect, `${path}.effects[${index}]`);
            });
        } else if (skill.effects != null) {
            pushError(errors, `${path}.effects`, 'must be an array when provided.');
        }
    }

    function validatePassive(errors, passive, path, unitSkillIds) {
        if (!passive || typeof passive !== 'object' || Array.isArray(passive)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (!passive.id || typeof passive.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a non-empty string.');
        }
        if (!passive.name || typeof passive.name !== 'string') {
            pushError(errors, `${path}.name`, 'must be a non-empty string.');
        }
        if (passive.description != null && typeof passive.description !== 'string') {
            pushError(errors, `${path}.description`, 'must be a string when provided.');
        }
        if (passive.hooks != null && (typeof passive.hooks !== 'object' || Array.isArray(passive.hooks))) {
            pushError(errors, `${path}.hooks`, 'must be an object when provided.');
        } else if (passive.hooks) {
            Object.entries(passive.hooks).forEach(([hookName, hookDefinition]) => {
                if (!PASSIVE_HOOKS.has(hookName)) {
                    pushError(errors, `${path}.hooks.${hookName}`, 'is not a supported passive hook.');
                    return;
                }

                validateHookDefinition(errors, unitSkillIds, hookDefinition, `${path}.hooks.${hookName}`, { allowFunction: true });
            });
        }
    }

    function validateUnit(errors, unit, path) {
        if (!unit || typeof unit !== 'object' || Array.isArray(unit)) {
            pushError(errors, path, 'must be an object.');
            return;
        }

        if (!unit.id || typeof unit.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a non-empty string.');
        }
        if (!unit.name || typeof unit.name !== 'string') {
            pushError(errors, `${path}.name`, 'must be a non-empty string.');
        }
        if (!isFiniteNumber(unit.maxHp) || unit.maxHp <= 0) {
            pushError(errors, `${path}.maxHp`, 'must be a positive number.');
        }
        if (!Array.isArray(unit.speedRange) || unit.speedRange.length !== 2 || !unit.speedRange.every((value) => Number.isInteger(value))) {
            pushError(errors, `${path}.speedRange`, 'must be a two-number integer array.');
        }
        if (!Array.isArray(unit.skills) || !unit.skills.length) {
            pushError(errors, `${path}.skills`, 'must contain at least one skill.');
        }

        if (unit.sprites == null || typeof unit.sprites !== 'object' || Array.isArray(unit.sprites)) {
            pushError(errors, `${path}.sprites`, 'must be an object.');
        } else if (!unit.sprites.idle || typeof unit.sprites.idle !== 'string') {
            pushError(errors, `${path}.sprites.idle`, 'must be a string.');
        }

        if (unit.staggerThresholds != null) {
            if (!Array.isArray(unit.staggerThresholds)) {
                pushError(errors, `${path}.staggerThresholds`, 'must be an array when provided.');
            } else {
                unit.staggerThresholds.forEach((threshold, index) => {
                    if (!isFiniteNumber(threshold) || threshold <= 0) {
                        pushError(errors, `${path}.staggerThresholds[${index}]`, 'must be a positive number.');
                    }
                });
            }
        }

        const unitSkillIds = new Set((Array.isArray(unit.skills) ? unit.skills : []).map((skill) => skill?.id).filter(Boolean));

        if (unit.passives != null) {
            if (!Array.isArray(unit.passives)) {
                pushError(errors, `${path}.passives`, 'must be an array when provided.');
            } else {
                unit.passives.forEach((passive, index) => validatePassive(errors, passive, `${path}.passives[${index}]`, unitSkillIds));
            }
        }

        if (unit.resistances != null && (typeof unit.resistances !== 'object' || Array.isArray(unit.resistances))) {
            pushError(errors, `${path}.resistances`, 'must be an object.');
        } else {
            const hasNestedBuckets = Boolean(unit.resistances?.physical || unit.resistances?.sin);
            validateResistanceBucket(
                errors,
                path,
                hasNestedBuckets ? 'physical' : 'physical',
                hasNestedBuckets ? unit.resistances?.physical : unit.resistances,
                PHYSICAL_DAMAGE_TYPES,
            );
            validateResistanceBucket(errors, path, 'sin', unit.resistances?.sin, SIN_TYPES);
        }
        const duplicateSkillIds = (Array.isArray(unit.skills) ? unit.skills : [])
            .map((skill) => skill?.id)
            .filter(Boolean)
            .filter((id, index, items) => items.indexOf(id) !== index);
        [...new Set(duplicateSkillIds)].forEach((id) => {
            pushError(errors, `${path}.skills`, `contains duplicate skill id "${id}".`);
        });
        (Array.isArray(unit.skills) ? unit.skills : []).forEach((skill, index) => {
            validateSkill(errors, skill, `${path}.skills[${index}]`, unitSkillIds);
        });
    }

    function validateStatusDefinition(definition) {
        const normalizedDefinition = cloneDefinition(definition || {});
        const errors = [];
        const path = 'status';

        if (!normalizedDefinition.id || typeof normalizedDefinition.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a non-empty string.');
        }
        if (!normalizedDefinition.label && !normalizedDefinition.name) {
            pushError(errors, `${path}.label`, 'must provide label or name.');
        }
        if (normalizedDefinition.label != null && typeof normalizedDefinition.label !== 'string') {
            pushError(errors, `${path}.label`, 'must be a string when provided.');
        }
        if (normalizedDefinition.name != null && typeof normalizedDefinition.name !== 'string') {
            pushError(errors, `${path}.name`, 'must be a string when provided.');
        }
        if (normalizedDefinition.description != null && typeof normalizedDefinition.description !== 'string') {
            pushError(errors, `${path}.description`, 'must be a string when provided.');
        }
        if (normalizedDefinition.iconPath != null && typeof normalizedDefinition.iconPath !== 'string') {
            pushError(errors, `${path}.iconPath`, 'must be a string when provided.');
        }
        if (normalizedDefinition.countOnly != null && typeof normalizedDefinition.countOnly !== 'boolean') {
            pushError(errors, `${path}.countOnly`, 'must be a boolean when provided.');
        }

        const stackModel = normalizedDefinition.stackModel;
        if (stackModel != null) {
            if (typeof stackModel !== 'object' || Array.isArray(stackModel)) {
                pushError(errors, `${path}.stackModel`, 'must be an object when provided.');
            } else {
                ['potency', 'count'].forEach((bucket) => {
                    if (stackModel[bucket] == null) {
                        return;
                    }

                    if (typeof stackModel[bucket] !== 'object' || Array.isArray(stackModel[bucket])) {
                        pushError(errors, `${path}.stackModel.${bucket}`, 'must be an object.');
                        return;
                    }

                    const bucketDefinition = stackModel[bucket];
                    if (bucketDefinition.enabled != null && typeof bucketDefinition.enabled !== 'boolean') {
                        pushError(errors, `${path}.stackModel.${bucket}.enabled`, 'must be a boolean when provided.');
                    }
                    if (bucketDefinition.min != null && (!isFiniteNumber(bucketDefinition.min) || bucketDefinition.min < 0)) {
                        pushError(errors, `${path}.stackModel.${bucket}.min`, 'must be a non-negative number when provided.');
                    }
                    if (bucketDefinition.max != null && (!isFiniteNumber(bucketDefinition.max) || bucketDefinition.max < 0)) {
                        pushError(errors, `${path}.stackModel.${bucket}.max`, 'must be a non-negative number when provided.');
                    }
                    if (bucketDefinition.application != null && !['add', 'set'].includes(bucketDefinition.application)) {
                        pushError(errors, `${path}.stackModel.${bucket}.application`, 'must be "add" or "set" when provided.');
                    }
                });
                if (stackModel.combinedMax != null && (!isFiniteNumber(stackModel.combinedMax) || stackModel.combinedMax < 0)) {
                    pushError(errors, `${path}.stackModel.combinedMax`, 'must be a non-negative number when provided.');
                }

                if (stackModel.expireWhen != null) {
                    if (typeof stackModel.expireWhen !== 'object' || Array.isArray(stackModel.expireWhen)) {
                        pushError(errors, `${path}.stackModel.expireWhen`, 'must be an object when provided.');
                    } else {
                        if (stackModel.expireWhen.countLte != null && !isFiniteNumber(stackModel.expireWhen.countLte)) {
                            pushError(errors, `${path}.stackModel.expireWhen.countLte`, 'must be a number when provided.');
                        }
                        if (stackModel.expireWhen.potencyLte != null && !isFiniteNumber(stackModel.expireWhen.potencyLte)) {
                            pushError(errors, `${path}.stackModel.expireWhen.potencyLte`, 'must be a number when provided.');
                        }
                    }
                }
            }
        }

        if (normalizedDefinition.hooks != null) {
            if (typeof normalizedDefinition.hooks !== 'object' || Array.isArray(normalizedDefinition.hooks)) {
                pushError(errors, `${path}.hooks`, 'must be an object when provided.');
            } else {
                Object.entries(normalizedDefinition.hooks).forEach(([hookName, hookDefinition]) => {
                    if (!PASSIVE_HOOKS.has(hookName)) {
                        pushError(errors, `${path}.hooks.${hookName}`, 'is not a supported status hook.');
                        return;
                    }

                    validateHookDefinition(errors, new Set(), hookDefinition, `${path}.hooks.${hookName}`);
                });
            }
        }

        if (!normalizedDefinition.label && typeof normalizedDefinition.name === 'string') {
            normalizedDefinition.label = normalizedDefinition.name;
        }

        return {
            normalizedDefinition,
            errors,
        };
    }

    function validateBattleDefinition(definition) {
        const normalizedDefinition = normalizeBattleDefinition(definition);
        const errors = [];

        if (!normalizedDefinition.id || typeof normalizedDefinition.id !== 'string') {
            pushError(errors, 'battle.id', 'must be a non-empty string.');
        }
        if (!normalizedDefinition.name || typeof normalizedDefinition.name !== 'string') {
            pushError(errors, 'battle.name', 'must be a non-empty string.');
        }
        if (!Array.isArray(normalizedDefinition.playerUnits) || !normalizedDefinition.playerUnits.length) {
            pushError(errors, 'battle.playerUnits', 'must contain at least one unit.');
        }
        if (!Array.isArray(normalizedDefinition.enemyUnits) || !normalizedDefinition.enemyUnits.length) {
            pushError(errors, 'battle.enemyUnits', 'must contain at least one unit.');
        }

        const enemyAiProfile = normalizedDefinition.rules?.enemyAiProfile;
        if (enemyAiProfile) {
            if (typeof enemyAiProfile === 'string') {
                if (!ENEMY_AI_SKILLS.has(enemyAiProfile)) {
                    pushError(errors, 'battle.rules.enemyAiProfile', 'is not a supported ai profile string.');
                }
            } else if (typeof enemyAiProfile === 'object') {
                if (enemyAiProfile.skill != null && typeof enemyAiProfile.skill !== 'string') {
                    pushError(errors, 'battle.rules.enemyAiProfile.skill', 'must be a string.');
                } else if (enemyAiProfile.skill && !ENEMY_AI_SKILLS.has(enemyAiProfile.skill)) {
                    pushError(errors, 'battle.rules.enemyAiProfile.skill', 'is not a supported value.');
                }
                if (enemyAiProfile.target != null && typeof enemyAiProfile.target !== 'string') {
                    pushError(errors, 'battle.rules.enemyAiProfile.target', 'must be a string.');
                } else if (enemyAiProfile.target && !ENEMY_AI_TARGETS.has(enemyAiProfile.target)) {
                    pushError(errors, 'battle.rules.enemyAiProfile.target', 'is not a supported value.');
                }
            } else {
                pushError(errors, 'battle.rules.enemyAiProfile', 'must be a string or object.');
            }
        }

        normalizedDefinition.playerUnits.forEach((unit, index) => validateUnit(errors, unit, `battle.playerUnits[${index}]`));
        normalizedDefinition.enemyUnits.forEach((unit, index) => validateUnit(errors, unit, `battle.enemyUnits[${index}]`));

        const allUnits = [...normalizedDefinition.playerUnits, ...normalizedDefinition.enemyUnits];
        const duplicateUnitIds = allUnits
            .map((unit) => unit?.id)
            .filter(Boolean)
            .filter((id, index, items) => items.indexOf(id) !== index);
        [...new Set(duplicateUnitIds)].forEach((id) => {
            pushError(errors, 'battle.units', `contains duplicate unit id "${id}".`);
        });

        return {
            normalizedDefinition,
            errors,
        };
    }

    function validateUnitDefinition(definition) {
        const normalizedDefinition = cloneDefinition(definition || {});
        const errors = [];

        validateUnit(errors, normalizedDefinition, 'unit');

        return {
            normalizedDefinition,
            errors,
        };
    }

    function formatBattleDefinitionErrors(errors) {
        if (!Array.isArray(errors) || !errors.length) {
            return 'Battle definition is invalid.';
        }

        return [
            'Battle definition is invalid:',
            ...errors.map((error) => `- ${error}`),
        ].join('\n');
    }

    battleModules.schema = battleModules.schema || {};
    battleModules.schema.normalizeBattleDefinition = normalizeBattleDefinition;
    battleModules.schema.validateBattleDefinition = validateBattleDefinition;
    battleModules.schema.validateUnitDefinition = validateUnitDefinition;
    battleModules.schema.validateStatusDefinition = validateStatusDefinition;
    battleModules.schema.formatBattleDefinitionErrors = formatBattleDefinitionErrors;

    battleModules.normalizeBattleDefinition = normalizeBattleDefinition;
    battleModules.validateBattleDefinition = validateBattleDefinition;
    battleModules.validateUnitDefinition = validateUnitDefinition;
    battleModules.validateStatusDefinition = validateStatusDefinition;
    battleModules.formatBattleDefinitionErrors = formatBattleDefinitionErrors;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        normalizeBattleDefinition,
        validateBattleDefinition,
        validateUnitDefinition,
        validateStatusDefinition,
    };
})();
