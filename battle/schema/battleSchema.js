(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registry = battleModules.registry || {};

    const PHYSICAL_DAMAGE_TYPES = new Set(['slash', 'pierce', 'blunt']);
    const SIN_TYPES = new Set(['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy']);
    const SKILL_TYPES = new Set(['attack', 'guard', 'evade', 'counter']);
    const EFFECT_TRIGGERS = new Set(['onSelect', 'onUse', 'onHit', 'onClashWin', 'onClashLose', 'onAttackEnd']);
    const EFFECT_TYPES = new Set(Object.keys(registry.effectDefinitions || {}));
    const CONTEXT_FIELDS = new Set([
        'coinPowerBonus',
        'coinCountBonus',
        'flatPowerBonus',
        'clashPowerBonus',
        'critChanceBonus',
        'damage',
        'damageMultiplier',
        'damageCap',
        'damageReductionMultiplier',
        'damageReductionFlat',
        'minHpAfterDamage',
        'weakResistanceDamageBonus',
        'criticalBonus',
        'staticDamageBonus',
        'dynamicDamageBonus',
        'clashRoundBonus',
        'observationBonus',
        'additiveDamage',
        'healingMultiplier',
        'healingFlatBonus',
        'forceCoinZero',
        'forcedCoinOutcome',
        'rerollTailsRemaining',
    ]);
    const COIN_MAP_FIELDS = new Set([
        'coinPowerBonusByCoin',
        'criticalBonusByCoin',
        'critChanceBonusByCoin',
        'staticDamageBonusByCoin',
        'dynamicDamageBonusByCoin',
        'clashRoundBonusByCoin',
        'observationBonusByCoin',
        'additiveDamageByCoin',
        'extraCritDamageByCoin',
        'critFinalPowerBonusByCoin',
        'damageCapByCoin',
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
    const HOOK_CONDITION_TARGETS = new Set([
        'self',
        'opponent',
        'allyUnit',
        'defenderUnit',
        'attackerUnit',
        'actorUnit',
        'staggeredUnit',
        'defeatedUnit',
    ]);
    const EFFECT_TARGETS = new Set([
        'self',
        'opponent',
        'allAllies',
        'allOpponents',
        'randomAlly',
        'randomOpponent',
        'highestHpAlly',
        'lowestHpAlly',
        'highestHpOpponent',
        'lowestHpOpponent',
        'highestMaxHpAlly',
        'lowestMaxHpAlly',
        'highestMaxHpOpponent',
        'lowestMaxHpOpponent',
        'eventDefender',
        'eventAttacker',
        'attacker',
        'defender',
        'staggeredUnit',
        'eventStaggered',
        'defeatedUnit',
        'eventDefeated',
    ]);
    const HOOK_CONDITION_TYPES = new Set([
        'always',
        'damageAtLeast',
        'damageSourceIs',
        'hasStatus',
        'statusPotencyAtLeast',
        'statusPotencyAtOrBelow',
        'statusCountAtLeast',
        'statusCountAtOrBelow',
        'statusCountGreaterThanStatus',
        'encounterResourceAtLeast',
        'encounterResourceAtOrBelow',
        'unitResourceAtLeast',
        'unitResourceAtOrBelow',
        'hasFlag',
        'counterAtLeast',
        'counterAtOrBelow',
        'randomChance',
        'diceResultIs',
        'diceResultAtLeast',
        'skillDamageTypeMatchesWeakness',
        'skillIdIs',
        'skillHasTag',
        'skillType',
        'skillSinType',
        'skillDamageType',
        'skillCoinPowerSign',
        'coinIndex',
        'criticalHit',
        'targetStaggered',
        'speedAtLeast',
        'speedAtOrBelow',
        'speedGreaterThan',
        'hpAtOrBelow',
        'hpAtOrAbove',
        'hpPercentAtOrBelow',
        'hpPercentAtOrAbove',
        'spAtOrBelow',
        'spAtOrAbove',
        'eventStatusIdIs',
        'unitSideIs',
        'lastEventTypeIs',
        'panicStateIs',
        'panicValueAtLeast',
        'panicValueAtOrBelow',
        'waveAtLeast',
        'waveAtOrBelow',
        'turnAtLeast',
        'turnAtOrBelow',
        'resonanceAtLeast',
        'resonanceAtOrBelow',
        'absoluteResonanceAtLeast',
        'absoluteResonanceAtOrBelow',
        'eventStaggeredUnitSideIs',
        'eventStaggeredUnitIsSelf',
        'eventSourceSideIs',
        'eventActorSideIs',
        'eventActorIsAlly',
        'skillSlotIs',
        'eventSkillSlotIs',
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
        const sourceRules = source.rules && typeof source.rules === 'object' && !Array.isArray(source.rules)
            ? source.rules
            : {};
        const sourceWaves = Array.isArray(sourceRules.waves)
            ? sourceRules.waves
            : (Array.isArray(source.waves) ? source.waves : null);
        const firstWaveEnemyUnits = Array.isArray(sourceWaves?.[0]?.enemyUnits) ? sourceWaves[0].enemyUnits : null;
        const normalized = {
            id: source.id || 'custom-battle',
            name: source.name || 'Custom Battle',
            playerUnits: Array.isArray(source.playerUnits)
                ? source.playerUnits
                : (source.hero ? [source.hero] : []),
            enemyUnits: Array.isArray(source.enemyUnits)
                ? source.enemyUnits
                : (firstWaveEnemyUnits || (source.enemy ? [source.enemy] : [])),
            rules: {
                ...sourceRules,
                encounterType: sourceRules.encounterType || 'focused',
                maxTurns: sourceRules.maxTurns || 100,
                victoryCondition: sourceRules.victoryCondition || 'defeat-all-enemies',
                failureCondition: sourceRules.failureCondition || 'all-allies-defeated',
                enemyAiProfile: sourceRules.enemyAiProfile || source.enemyAiProfile || null,
            },
        };

        if (source.description) {
            normalized.description = source.description;
        }

        if (source.drive && typeof source.drive === 'object' && !Array.isArray(source.drive)) {
            normalized.drive = cloneDefinition(source.drive);
        }

        if (sourceWaves) {
            normalized.rules.waves = sourceWaves;
        }

        return normalized;
    }

    function pushError(errors, path, message) {
        errors.push(`${path}: ${message}`);
    }

    function isFiniteNumber(value) {
        return typeof value === 'number' && Number.isFinite(value);
    }

    function validateDriveMetadata(errors, drive, path) {
        if (drive == null) {
            return;
        }
        if (typeof drive !== 'object' || Array.isArray(drive)) {
            pushError(errors, path, 'must be an object when provided.');
            return;
        }
        ['chapterId', 'chapterLabel', 'encounterLabel', 'accentColor', 'bannerImage'].forEach((field) => {
            if (drive[field] != null && typeof drive[field] !== 'string') {
                pushError(errors, `${path}.${field}`, 'must be a string when provided.');
            }
        });
        ['chapterOrder', 'encounterOrder'].forEach((field) => {
            if (drive[field] != null && !isFiniteNumber(drive[field])) {
                pushError(errors, `${path}.${field}`, 'must be a number when provided.');
            }
        });
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
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
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

        if (amount.sum) {
            if (!Array.isArray(amount.sum) || amount.sum.length < 2) {
                pushError(errors, `${path}.sum`, 'must be an array with at least two amount definitions.');
                return;
            }

            amount.sum.forEach((entry, index) => {
                validateAmountDefinition(errors, entry, `${path}.sum[${index}]`);
            });
            return;
        }

        if (amount.min) {
            if (!Array.isArray(amount.min) || amount.min.length < 2) {
                pushError(errors, `${path}.min`, 'must be an array with at least two amount definitions.');
                return;
            }

            amount.min.forEach((entry, index) => {
                validateAmountDefinition(errors, entry, `${path}.min[${index}]`);
            });
            return;
        }

        if (amount.max) {
            if (!Array.isArray(amount.max) || amount.max.length < 2) {
                pushError(errors, `${path}.max`, 'must be an array with at least two amount definitions.');
                return;
            }

            amount.max.forEach((entry, index) => {
                validateAmountDefinition(errors, entry, `${path}.max[${index}]`);
            });
            return;
        }

        if (amount.clamp) {
            if (!amount.clamp || typeof amount.clamp !== 'object' || Array.isArray(amount.clamp)) {
                pushError(errors, `${path}.clamp`, 'must be an object.');
                return;
            }

            validateAmountDefinition(errors, amount.clamp.value, `${path}.clamp.value`);
            if (amount.clamp.min != null) {
                validateAmountDefinition(errors, amount.clamp.min, `${path}.clamp.min`);
            }
            if (amount.clamp.max != null) {
                validateAmountDefinition(errors, amount.clamp.max, `${path}.clamp.max`);
            }
            return;
        }

        if (amount.floor != null) {
            validateAmountDefinition(errors, amount.floor, `${path}.floor`);
            return;
        }

        if (amount.ceil != null) {
            validateAmountDefinition(errors, amount.ceil, `${path}.ceil`);
            return;
        }

        if (amount.abs != null) {
            validateAmountDefinition(errors, amount.abs, `${path}.abs`);
            return;
        }

        if (amount.skillCoinCount) {
            if (amount.skillCoinCount !== true) {
                pushError(errors, `${path}.skillCoinCount`, 'must be true when provided.');
            }
            if (amount.inverse != null && typeof amount.inverse !== 'boolean') {
                pushError(errors, `${path}.inverse`, 'must be a boolean when provided.');
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.hp || amount.maxHp || amount.hpPercent || amount.sp || amount.speed) {
            const amountKey = amount.hp
                ? 'hp'
                : (amount.maxHp
                    ? 'maxHp'
                    : (amount.hpPercent
                        ? 'hpPercent'
                        : (amount.sp ? 'sp' : 'speed')));
            const amountSource = amount[amountKey];
            if (amountSource != null && (typeof amountSource !== 'object' || Array.isArray(amountSource))) {
                pushError(errors, `${path}.${amountKey}`, 'must be an object when provided.');
                return;
            }
            if (amountSource?.target != null && !['self', 'opponent'].includes(amountSource.target)) {
                pushError(errors, `${path}.${amountKey}.target`, 'must be "self" or "opponent" when provided.');
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.encounterResource) {
            const resource = amount.encounterResource;
            if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
                pushError(errors, `${path}.encounterResource`, 'must be an object.');
                return;
            }
            if (!resource.resourceId || typeof resource.resourceId !== 'string') {
                pushError(errors, `${path}.encounterResource.resourceId`, 'must be a non-empty string.');
            }
            if (resource.target != null && !['self', 'opponent', 'battle'].includes(resource.target)) {
                pushError(errors, `${path}.encounterResource.target`, 'must be "self", "opponent", or "battle" when provided.');
            }
            if (resource.side != null) {
                if (resource.target !== 'battle') {
                    pushError(errors, `${path}.encounterResource.side`, 'requires target "battle".');
                } else if (!['self', 'opponent', 'player', 'enemy'].includes(resource.side)) {
                    pushError(errors, `${path}.encounterResource.side`, 'must be "self", "opponent", "player", or "enemy" when provided.');
                }
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.unitResource) {
            const resource = amount.unitResource;
            if (!resource || typeof resource !== 'object' || Array.isArray(resource)) {
                pushError(errors, `${path}.unitResource`, 'must be an object.');
                return;
            }
            if (!resource.resourceId || typeof resource.resourceId !== 'string') {
                pushError(errors, `${path}.unitResource.resourceId`, 'must be a non-empty string.');
            }
            if (resource.target != null && !['self', 'opponent'].includes(resource.target)) {
                pushError(errors, `${path}.unitResource.target`, 'must be "self" or "opponent" when provided.');
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.eventField) {
            if (typeof amount.eventField === 'string') {
                if (!amount.eventField) {
                    pushError(errors, `${path}.eventField`, 'must be a non-empty string.');
                }
            } else if (typeof amount.eventField === 'object' && !Array.isArray(amount.eventField)) {
                if (!amount.eventField.path || typeof amount.eventField.path !== 'string') {
                    pushError(errors, `${path}.eventField.path`, 'must be a non-empty string.');
                }
                if (amount.eventField.default != null && !isFiniteNumber(amount.eventField.default)) {
                    pushError(errors, `${path}.eventField.default`, 'must be a number when provided.');
                }
            } else {
                pushError(errors, `${path}.eventField`, 'must be a string or object.');
                return;
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            return;
        }

        if (amount.damage) {
            if (amount.damage !== true) {
                pushError(errors, `${path}.damage`, 'must be true when provided.');
            }
            if (amount.multiplier != null && !isFiniteNumber(amount.multiplier)) {
                pushError(errors, `${path}.multiplier`, 'must be a number when provided.');
            }
            if (amount.offset != null && !isFiniteNumber(amount.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
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

        if (condition.target != null && !HOOK_CONDITION_TARGETS.has(condition.target)) {
            pushError(errors, `${path}.target`, 'must be a supported hook condition target when provided.');
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
            if (condition.side != null && !['self', 'opponent', 'player', 'enemy'].includes(condition.side)) {
                pushError(errors, `${path}.side`, 'must be "self", "opponent", "player", or "enemy" when provided.');
            }
            break;
        case 'unitResourceAtLeast':
        case 'unitResourceAtOrBelow':
            if (!condition.resourceId || typeof condition.resourceId !== 'string') {
                pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
            }
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'hasFlag':
            if (!condition.flagId || typeof condition.flagId !== 'string') {
                pushError(errors, `${path}.flagId`, 'must be a non-empty string.');
            }
            if (condition.value != null && typeof condition.value !== 'boolean') {
                pushError(errors, `${path}.value`, 'must be a boolean when provided.');
            }
            break;
        case 'counterAtLeast':
        case 'counterAtOrBelow':
            if (!condition.counterId || typeof condition.counterId !== 'string') {
                pushError(errors, `${path}.counterId`, 'must be a non-empty string.');
            }
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'randomChance':
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'diceResultIs':
        case 'diceResultAtLeast':
            if (!condition.storeAs || typeof condition.storeAs !== 'string') {
                pushError(errors, `${path}.storeAs`, 'must be a non-empty string.');
            }
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (condition.faces != null && (!isFiniteNumber(condition.faces) || condition.faces < 1)) {
                pushError(errors, `${path}.faces`, 'must be a positive number when provided.');
            }
            break;
        case 'skillDamageTypeMatchesWeakness':
            if (condition.damageType != null && !PHYSICAL_DAMAGE_TYPES.has(condition.damageType)) {
                pushError(errors, `${path}.damageType`, 'must be slash, pierce, or blunt when provided.');
            }
            if (condition.storeAs != null && typeof condition.storeAs !== 'string') {
                pushError(errors, `${path}.storeAs`, 'must be a string when provided.');
            }
            if (condition.statusId != null && typeof condition.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a string when provided.');
            } else if (typeof condition.statusId === 'string' && typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id when provided.');
            }
            if (condition.damageTypeMap != null) {
                if (!condition.damageTypeMap || typeof condition.damageTypeMap !== 'object' || Array.isArray(condition.damageTypeMap)) {
                    pushError(errors, `${path}.damageTypeMap`, 'must be an object when provided.');
                } else {
                    Object.entries(condition.damageTypeMap).forEach(([key, value]) => {
                        if (!PHYSICAL_DAMAGE_TYPES.has(value)) {
                            pushError(errors, `${path}.damageTypeMap.${key}`, 'must be slash, pierce, or blunt.');
                        }
                    });
                }
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
        case 'statusCountGreaterThanStatus':
            if (!condition.statusId || typeof condition.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (!condition.otherStatusId || typeof condition.otherStatusId !== 'string') {
                pushError(errors, `${path}.otherStatusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.otherStatusId)) {
                pushError(errors, `${path}.otherStatusId`, 'must reference a supported status id.');
            }
            if (condition.otherTarget != null && !['self', 'opponent'].includes(condition.otherTarget)) {
                pushError(errors, `${path}.otherTarget`, 'must be "self" or "opponent" when provided.');
            }
            if (condition.offset != null && !isFiniteNumber(condition.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
            }
            break;
        case 'skillType':
        case 'skillIdIs':
        case 'skillHasTag':
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
        case 'skillCoinPowerSign':
            if (!condition.value || typeof condition.value !== 'string' || !['plus', 'minus'].includes(condition.value)) {
                pushError(errors, `${path}.value`, 'must be "plus" or "minus".');
            }
            break;
        case 'eventStatusIdIs':
            if (!condition.value || typeof condition.value !== 'string') {
                pushError(errors, `${path}.value`, 'must be a supported status id.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a supported status id.');
            }
            break;
        case 'unitSideIs':
            if (!condition.value || typeof condition.value !== 'string' || !['player', 'enemy'].includes(condition.value)) {
                pushError(errors, `${path}.value`, 'must be "player" or "enemy".');
            }
            break;
        case 'lastEventTypeIs':
            if (
                !condition.value
                || !(
                    typeof condition.value === 'string'
                    || (Array.isArray(condition.value) && condition.value.every((entry) => typeof entry === 'string' && entry))
                )
            ) {
                pushError(errors, `${path}.value`, 'must be an event type string or array of event type strings.');
            }
            break;
        case 'panicStateIs':
            if (!condition.value || typeof condition.value !== 'string') {
                pushError(errors, `${path}.value`, 'must be a non-empty string.');
            }
            break;
        case 'panicValueAtLeast':
        case 'panicValueAtOrBelow':
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'waveAtLeast':
        case 'waveAtOrBelow':
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'resonanceAtLeast':
        case 'resonanceAtOrBelow':
        case 'absoluteResonanceAtLeast':
        case 'absoluteResonanceAtOrBelow':
            if (!condition.sinType || typeof condition.sinType !== 'string' || !SIN_TYPES.has(condition.sinType)) {
                pushError(errors, `${path}.sinType`, 'must be a supported sin type.');
            }
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (condition.side != null && !['self', 'opponent', 'player', 'enemy'].includes(condition.side)) {
                pushError(errors, `${path}.side`, 'must be "self", "opponent", "player", or "enemy" when provided.');
            }
            break;
        case 'damageSourceIs':
            if (condition.value != null && !['skill', 'status', 'burst'].includes(condition.value)) {
                pushError(errors, `${path}.value`, 'must be "skill", "status", or "burst" when provided.');
            }
            break;
        case 'coinIndex':
            if (!Number.isInteger(condition.value) || condition.value <= 0) {
                pushError(errors, `${path}.value`, 'must be a positive integer.');
            }
            break;
        case 'damageAtLeast':
        case 'hpAtOrBelow':
        case 'hpAtOrAbove':
        case 'hpPercentAtOrBelow':
        case 'hpPercentAtOrAbove':
        case 'spAtOrBelow':
        case 'spAtOrAbove':
        case 'speedAtLeast':
        case 'speedAtOrBelow':
            if (!isFiniteNumber(condition.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'speedGreaterThan':
            if (condition.otherTarget != null && !['self', 'opponent'].includes(condition.otherTarget)) {
                pushError(errors, `${path}.otherTarget`, 'must be "self" or "opponent" when provided.');
            }
            if (condition.offset != null && !isFiniteNumber(condition.offset)) {
                pushError(errors, `${path}.offset`, 'must be a number when provided.');
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

        if (effect.target != null && !EFFECT_TARGETS.has(effect.target)) {
            pushError(errors, `${path}.target`, 'must be a supported target selector.');
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

        if (effect.headsOnly != null && typeof effect.headsOnly !== 'boolean') {
            pushError(errors, `${path}.headsOnly`, 'must be a boolean when provided.');
        }

        if (effect.tailsOnly != null && typeof effect.tailsOnly !== 'boolean') {
            pushError(errors, `${path}.tailsOnly`, 'must be a boolean when provided.');
        }

        if (effect.headsOnly && effect.tailsOnly) {
            pushError(errors, `${path}.headsOnly`, 'cannot be combined with tailsOnly.');
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
            if (effect.excludeSelf != null && typeof effect.excludeSelf !== 'boolean') {
                pushError(errors, `${path}.excludeSelf`, 'must be a boolean when provided.');
            }
            if (effect.maxTargets != null && (!Number.isInteger(effect.maxTargets) || effect.maxTargets <= 0)) {
                pushError(errors, `${path}.maxTargets`, 'must be a positive integer when provided.');
            }
            if (effect.maxTargetsAmount != null) {
                validateAmountDefinition(errors, effect.maxTargetsAmount, `${path}.maxTargetsAmount`);
            }
            if (effect.prioritizeStatusId != null) {
                if (typeof effect.prioritizeStatusId !== 'string' || !effect.prioritizeStatusId) {
                    pushError(errors, `${path}.prioritizeStatusId`, 'must be a non-empty string when provided.');
                } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.prioritizeStatusId)) {
                    pushError(errors, `${path}.prioritizeStatusId`, 'must reference a supported status id.');
                }
            }
            if (effect.prioritizeOrder != null && !['asc', 'desc'].includes(effect.prioritizeOrder)) {
                pushError(errors, `${path}.prioritizeOrder`, 'must be "asc" or "desc" when provided.');
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
        case 'dealHpPercentDamage':
            validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            if (effect.statusId != null && typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a string when provided.');
            } else if (typeof effect.statusId === 'string' && typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id when provided.');
            }
            break;
        case 'endBattle':
            if (effect.winner != null && !['player', 'enemy', 'draw'].includes(effect.winner)) {
                pushError(errors, `${path}.winner`, 'must be "player", "enemy", or "draw" when provided.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
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
        case 'healHpPercent':
        case 'setSanity':
        case 'reviveUnit':
        case 'recoverStagger':
        case 'staggerUnit':
        case 'modifyDefenseLevel':
        case 'modifyOffenseLevel':
        case 'modifySpeed':
        case 'gainShield':
        case 'clearShield':
        case 'burstTremor':
        case 'adjustEncounterResource':
        case 'setWave':
        case 'spawnWave':
        case 'advanceWave':
        case 'amplitudeConvert':
        case 'cancelAttack':
            if (effect.type === 'recoverStagger') {
                if (effect.when != null && !['immediate', 'nextTurnStart'].includes(effect.when)) {
                    pushError(errors, `${path}.when`, 'must be "immediate" or "nextTurnStart" when provided.');
                }
                if (effect.amount != null) {
                    validateAmountDefinition(errors, effect.amount, `${path}.amount`);
                } else if (effect.value != null && !isFiniteNumber(effect.value)) {
                    pushError(errors, `${path}.value`, 'must be a number when provided.');
                }
                break;
            }
            if (effect.type !== 'clearShield' && effect.type !== 'burstTremor' && effect.type !== 'amplitudeConvert' && effect.type !== 'cancelAttack' && effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (effect.type !== 'clearShield' && effect.type !== 'burstTremor' && effect.type !== 'amplitudeConvert' && effect.type !== 'cancelAttack' && !isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            if (effect.type === 'burstTremor') {
                if (effect.statusId != null && typeof effect.statusId !== 'string') {
                    pushError(errors, `${path}.statusId`, 'must be a string when provided.');
                } else if (typeof effect.statusId === 'string' && typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                    pushError(errors, `${path}.statusId`, 'must reference a supported status id when provided.');
                }
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
                if (effect.scope != null && !['unit', 'battle'].includes(effect.scope)) {
                    pushError(errors, `${path}.scope`, 'must be "unit" or "battle" when provided.');
                }
                if (effect.min != null && (!isFiniteNumber(effect.min) || effect.min < 0)) {
                    pushError(errors, `${path}.min`, 'must be a non-negative number when provided.');
                }
                if (effect.max != null && (!isFiniteNumber(effect.max) || effect.max < 0)) {
                    pushError(errors, `${path}.max`, 'must be a non-negative number when provided.');
                }
            }
            break;
        case 'spawnReinforcement':
            if (effect.side != null && !['player', 'enemy'].includes(effect.side)) {
                pushError(errors, `${path}.side`, 'must be "player" or "enemy" when provided.');
            }
            if (!effect.unit || typeof effect.unit !== 'object' || Array.isArray(effect.unit)) {
                pushError(errors, `${path}.unit`, 'must be a unit definition object.');
            } else {
                validateUnit(errors, effect.unit, `${path}.unit`);
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
        case 'clearStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            break;
        case 'clearStatusesByTag':
        case 'consumeStatusesByTag':
            if (!Array.isArray(effect.tags) || effect.tags.some((entry) => typeof entry !== 'string' || !entry)) {
                pushError(errors, `${path}.tags`, 'must be an array of non-empty strings.');
            }
            if (effect.match != null && !['any', 'all'].includes(effect.match)) {
                pushError(errors, `${path}.match`, 'must be "any" or "all" when provided.');
            }
            break;
        case 'copyStatus':
        case 'transferStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (effect.sourceTarget != null && !['self', 'opponent'].includes(effect.sourceTarget)) {
                pushError(errors, `${path}.sourceTarget`, 'must be "self" or "opponent" when provided.');
            }
            if (effect.asStatusId != null) {
                if (typeof effect.asStatusId !== 'string' || !effect.asStatusId) {
                    pushError(errors, `${path}.asStatusId`, 'must be a non-empty string when provided.');
                } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.asStatusId)) {
                    pushError(errors, `${path}.asStatusId`, 'must reference a supported status id when provided.');
                }
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be "add" or "set" when provided.');
            }
            break;
        case 'convertStatus':
            if (!effect.fromStatusId || typeof effect.fromStatusId !== 'string') {
                pushError(errors, `${path}.fromStatusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.fromStatusId)) {
                pushError(errors, `${path}.fromStatusId`, 'must reference a supported status id.');
            }
            if (!effect.toStatusId || typeof effect.toStatusId !== 'string') {
                pushError(errors, `${path}.toStatusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.toStatusId)) {
                pushError(errors, `${path}.toStatusId`, 'must reference a supported status id.');
            }
            break;
        case 'multiplyStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (effect.potencyMultiplier != null && !isFiniteNumber(effect.potencyMultiplier)) {
                pushError(errors, `${path}.potencyMultiplier`, 'must be a number when provided.');
            }
            if (effect.countMultiplier != null && !isFiniteNumber(effect.countMultiplier)) {
                pushError(errors, `${path}.countMultiplier`, 'must be a number when provided.');
            }
            if (effect.rounding != null && !['floor', 'round', 'ceil'].includes(effect.rounding)) {
                pushError(errors, `${path}.rounding`, 'must be "floor", "round", or "ceil" when provided.');
            }
            if (effect.potencyMultiplier == null && effect.countMultiplier == null) {
                pushError(errors, `${path}`, 'must provide potencyMultiplier, countMultiplier, or both.');
            }
            break;
        case 'splitStatus':
            if (!effect.statusId || typeof effect.statusId !== 'string') {
                pushError(errors, `${path}.statusId`, 'must be a non-empty string.');
            } else if (typeof registry.isSupportedStatusId === 'function' && !registry.isSupportedStatusId(effect.statusId)) {
                pushError(errors, `${path}.statusId`, 'must reference a supported status id.');
            }
            if (effect.sourceTarget != null && !['self', 'opponent'].includes(effect.sourceTarget)) {
                pushError(errors, `${path}.sourceTarget`, 'must be "self" or "opponent" when provided.');
            }
            if (effect.mode != null && !['even'].includes(effect.mode)) {
                pushError(errors, `${path}.mode`, 'must be "even" when provided.');
            }
            break;
        case 'adjustUnitResource':
            if (!effect.resourceId || typeof effect.resourceId !== 'string') {
                pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            if (effect.min != null && !isFiniteNumber(effect.min)) {
                pushError(errors, `${path}.min`, 'must be a number when provided.');
            }
            if (effect.max != null && !isFiniteNumber(effect.max)) {
                pushError(errors, `${path}.max`, 'must be a number when provided.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            break;
        case 'spendUnitResource':
            if (!effect.resourceId || typeof effect.resourceId !== 'string') {
                pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.cancelIfInsufficient != null && typeof effect.cancelIfInsufficient !== 'boolean') {
                pushError(errors, `${path}.cancelIfInsufficient`, 'must be a boolean when provided.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            break;
        case 'spendEncounterResource':
            if (!effect.resourceId || typeof effect.resourceId !== 'string') {
                pushError(errors, `${path}.resourceId`, 'must be a non-empty string.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.cancelIfInsufficient != null && typeof effect.cancelIfInsufficient !== 'boolean') {
                pushError(errors, `${path}.cancelIfInsufficient`, 'must be a boolean when provided.');
            }
            if (effect.scope != null && !['unit', 'battle'].includes(effect.scope)) {
                pushError(errors, `${path}.scope`, 'must be "unit" or "battle" when provided.');
            }
            if (effect.reason != null && typeof effect.reason !== 'string') {
                pushError(errors, `${path}.reason`, 'must be a string when provided.');
            }
            break;
        case 'adjustResonance':
            if (!effect.sinType || typeof effect.sinType !== 'string' || !SIN_TYPES.has(effect.sinType)) {
                pushError(errors, `${path}.sinType`, 'must be a supported sin type.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            if (effect.side != null && !['self', 'opponent', 'player', 'enemy'].includes(effect.side)) {
                pushError(errors, `${path}.side`, 'must be "self", "opponent", "player", or "enemy" when provided.');
            }
            if (effect.min != null && !isFiniteNumber(effect.min)) {
                pushError(errors, `${path}.min`, 'must be a number when provided.');
            }
            if (effect.max != null && !isFiniteNumber(effect.max)) {
                pushError(errors, `${path}.max`, 'must be a number when provided.');
            }
            break;
        case 'setFlag':
            if (!effect.flagId || typeof effect.flagId !== 'string') {
                pushError(errors, `${path}.flagId`, 'must be a non-empty string.');
            }
            if (effect.value != null && typeof effect.value !== 'boolean') {
                pushError(errors, `${path}.value`, 'must be a boolean when provided.');
            }
            break;
        case 'clearFlag':
            if (!effect.flagId || typeof effect.flagId !== 'string') {
                pushError(errors, `${path}.flagId`, 'must be a non-empty string.');
            }
            break;
        case 'adjustCounter':
            if (!effect.counterId || typeof effect.counterId !== 'string') {
                pushError(errors, `${path}.counterId`, 'must be a non-empty string.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            if (effect.min != null && !isFiniteNumber(effect.min)) {
                pushError(errors, `${path}.min`, 'must be a number when provided.');
            }
            if (effect.max != null && !isFiniteNumber(effect.max)) {
                pushError(errors, `${path}.max`, 'must be a number when provided.');
            }
            break;
        case 'adjustCoinCount':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            break;
        case 'forceCoinOutcome':
            if (!effect.coinOutcome || typeof effect.coinOutcome !== 'string' || !['heads', 'tails', 'zero'].includes(effect.coinOutcome)) {
                pushError(errors, `${path}.coinOutcome`, 'must be "heads", "tails", or "zero".');
            }
            if (effect.coinIndex != null && (!Number.isInteger(effect.coinIndex) || effect.coinIndex <= 0)) {
                pushError(errors, `${path}.coinIndex`, 'must be a positive integer when provided.');
            }
            if (effect.operation != null && !['set', 'clear'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "set", or "clear" when provided.');
            }
            break;
        case 'grantCoinReroll':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'reuseCoins':
        case 'breakCoins':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'setPanicState':
            if (!effect.stateId || typeof effect.stateId !== 'string') {
                pushError(errors, `${path}.stateId`, 'must be a non-empty string.');
            }
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (effect.value != null && !isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number when provided.');
            }
            break;
        case 'clearPanicState':
            break;
        case 'adjustPanicValue':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            if (effect.operation != null && !['add', 'set'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "add", or "set".');
            }
            if (effect.min != null && !isFiniteNumber(effect.min)) {
                pushError(errors, `${path}.min`, 'must be a number when provided.');
            }
            if (effect.max != null && !isFiniteNumber(effect.max)) {
                pushError(errors, `${path}.max`, 'must be a number when provided.');
            }
            break;
        case 'setDamageCap':
            if (effect.amount != null) {
                validateAmountDefinition(errors, effect.amount, `${path}.amount`);
            } else if (effect.value != null && !isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number when provided.');
            }
            if (effect.operation != null && !['set', 'clear'].includes(effect.operation)) {
                pushError(errors, `${path}.operation`, 'must be omitted, "set", or "clear" when provided.');
            }
            break;
        case 'chooseRandomActions':
        case 'chooseWeightedActions':
            if (!Array.isArray(effect.branches) || effect.branches.length < 1) {
                pushError(errors, `${path}.branches`, 'must be an array with at least one branch.');
                break;
            }
            effect.branches.forEach((branch, branchIndex) => {
                if (!branch || typeof branch !== 'object' || Array.isArray(branch)) {
                    pushError(errors, `${path}.branches[${branchIndex}]`, 'must be an object.');
                    return;
                }
                if (effect.type === 'chooseWeightedActions') {
                    if (isFiniteNumber(branch.weight)) {
                        if (branch.weight <= 0) {
                            pushError(errors, `${path}.branches[${branchIndex}].weight`, 'must be a positive number.');
                        }
                    } else if (branch.weight && typeof branch.weight === 'object' && !Array.isArray(branch.weight)) {
                        validateAmountDefinition(errors, branch.weight, `${path}.branches[${branchIndex}].weight`);
                    } else {
                        pushError(errors, `${path}.branches[${branchIndex}].weight`, 'must be a positive number or amount definition.');
                    }
                }
                if (!Array.isArray(branch.actions)) {
                    pushError(errors, `${path}.branches[${branchIndex}].actions`, 'must be an array of effects.');
                    return;
                }
                branch.actions.forEach((action, actionIndex) => {
                    validateEffect(errors, unitSkillIds, action, `${path}.branches[${branchIndex}].actions[${actionIndex}]`, { requireTrigger: false });
                });
            });
            break;
        case 'rollDice':
            if (!isFiniteNumber(effect.faces) || effect.faces < 2) {
                pushError(errors, `${path}.faces`, 'must be a number >= 2.');
            }
            if (effect.count != null && (!isFiniteNumber(effect.count) || effect.count < 1)) {
                pushError(errors, `${path}.count`, 'must be a positive number when provided.');
            }
            if (!effect.storeAs || typeof effect.storeAs !== 'string') {
                pushError(errors, `${path}.storeAs`, 'must be a non-empty string.');
            }
            break;
        case 'setSkillDamageType':
            if (!effect.damageType || !PHYSICAL_DAMAGE_TYPES.has(effect.damageType)) {
                pushError(errors, `${path}.damageType`, 'must be slash, pierce, or blunt.');
            }
            if (effect.scope != null && !['baseSkills', 'allSkills'].includes(effect.scope)) {
                pushError(errors, `${path}.scope`, 'must be "baseSkills" or "allSkills" when provided.');
            }
            break;
        case 'abortEffects':
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
            } else if (unitSkillIds.size > 0 && !unitSkillIds.has(effect.skillId)) {
                pushError(errors, `${path}.skillId`, 'must reference another skill on the same unit.');
            }
            break;
        case 'queueUnopposedFollowUp':
            if (!effect.skillId || typeof effect.skillId !== 'string') {
                pushError(errors, `${path}.skillId`, 'must be a non-empty string.');
            } else if (unitSkillIds.size > 0 && !unitSkillIds.has(effect.skillId)) {
                pushError(errors, `${path}.skillId`, 'must reference another skill on the same unit.');
            }
            break;
        case 'amplitudeConvert':
            if (effect.fromStatusId != null && typeof effect.fromStatusId !== 'string') {
                pushError(errors, `${path}.fromStatusId`, 'must be a string when provided.');
            }
            if (effect.toStatusId != null && typeof effect.toStatusId !== 'string') {
                pushError(errors, `${path}.toStatusId`, 'must be a string when provided.');
            }
            break;
        case 'grantSkillOffer':
            if (!effect.skillId || typeof effect.skillId !== 'string') {
                pushError(errors, `${path}.skillId`, 'must be a non-empty string.');
            } else if (unitSkillIds.size > 0 && !unitSkillIds.has(effect.skillId)) {
                pushError(errors, `${path}.skillId`, 'must reference another skill on the same unit.');
            }
            if (effect.offerLane != null && effect.offerLane !== 'top' && effect.offerLane !== 'bottom') {
                pushError(errors, `${path}.offerLane`, 'must be "top" or "bottom" when provided.');
            }
            break;
        case 'adjustSlotAggro':
            if (!isFiniteNumber(effect.value)) {
                pushError(errors, `${path}.value`, 'must be a number.');
            }
            break;
        case 'cancelAttack':
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
        case 'redirectDamage':
            if (!effect.selector || !RETARGET_SELECTORS.has(effect.selector)) {
                pushError(errors, `${path}.selector`, 'must be a supported redirect selector.');
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
        if (skill.attackWeight != null && (!Number.isInteger(skill.attackWeight) || skill.attackWeight <= 0)) {
            pushError(errors, `${path}.attackWeight`, 'must be a positive integer when provided.');
        }
        if (skill.cannotClash != null && typeof skill.cannotClash !== 'boolean') {
            pushError(errors, `${path}.cannotClash`, 'must be a boolean when provided.');
        }
        if (skill.skipDefenseSkills != null && typeof skill.skipDefenseSkills !== 'boolean') {
            pushError(errors, `${path}.skipDefenseSkills`, 'must be a boolean when provided.');
        }
        if (skill.targeting != null && typeof skill.targeting !== 'string') {
            pushError(errors, `${path}.targeting`, 'must be a string when provided.');
        }
        if (skill.unbreakableCoins != null) {
            if (!Array.isArray(skill.unbreakableCoins)) {
                pushError(errors, `${path}.unbreakableCoins`, 'must be an array of positive integers when provided.');
            } else {
                skill.unbreakableCoins.forEach((coinIndex, index) => {
                    if (!Number.isInteger(coinIndex) || coinIndex <= 0) {
                        pushError(errors, `${path}.unbreakableCoins[${index}]`, 'must be a positive integer.');
                    }
                });
            }
        }
        if (skill.tags != null) {
            if (!Array.isArray(skill.tags)) {
                pushError(errors, `${path}.tags`, 'must be an array of strings when provided.');
            } else {
                skill.tags.forEach((tag, index) => {
                    if (typeof tag !== 'string' || !tag.trim()) {
                        pushError(errors, `${path}.tags[${index}]`, 'must be a non-empty string.');
                    }
                });
            }
        }
        if (skill.skillSlot != null && typeof skill.skillSlot !== 'string') {
            pushError(errors, `${path}.skillSlot`, 'must be a string when provided.');
        }
        if (skill.plannerLabel != null && typeof skill.plannerLabel !== 'string') {
            pushError(errors, `${path}.plannerLabel`, 'must be a string when provided.');
        }
        if (skill.deckCount != null && (!Number.isInteger(skill.deckCount) || skill.deckCount < 0)) {
            pushError(errors, `${path}.deckCount`, 'must be a non-negative integer when provided.');
        }
        if (skill.variantPriority != null && (!Number.isInteger(skill.variantPriority) || skill.variantPriority < 0)) {
            pushError(errors, `${path}.variantPriority`, 'must be a non-negative integer when provided.');
        }
        if (skill.variantConditions != null) {
            if (!Array.isArray(skill.variantConditions)) {
                pushError(errors, `${path}.variantConditions`, 'must be an array when provided.');
            } else {
                skill.variantConditions.forEach((condition, index) => {
                    validateHookCondition(errors, condition, `${path}.variantConditions[${index}]`);
                });
            }
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
        if (passive.plannerLabel != null && typeof passive.plannerLabel !== 'string') {
            pushError(errors, `${path}.plannerLabel`, 'must be a string when provided.');
        }
        if (passive.requirements != null) {
            if (typeof passive.requirements !== 'object' || Array.isArray(passive.requirements)) {
                pushError(errors, `${path}.requirements`, 'must be an object when provided.');
            } else {
                if (passive.requirements.owned != null && typeof passive.requirements.owned !== 'boolean') {
                    pushError(errors, `${path}.requirements.owned`, 'must be a boolean when provided.');
                }
                const resonance = passive.requirements.resonance;
                if (resonance != null) {
                    if (typeof resonance !== 'object' || Array.isArray(resonance)) {
                        pushError(errors, `${path}.requirements.resonance`, 'must be an object when provided.');
                    } else {
                        if (!resonance.sinType || !SIN_TYPES.has(resonance.sinType)) {
                            pushError(errors, `${path}.requirements.resonance.sinType`, 'must be a supported Sin affinity.');
                        }
                        const minimum = resonance.minimum ?? resonance.value;
                        if (minimum != null && (!Number.isInteger(minimum) || minimum < 0)) {
                            pushError(errors, `${path}.requirements.resonance.minimum`, 'must be a non-negative integer when provided.');
                        }
                    }
                }
            }
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
        if (unit.slotWeight != null && (!Number.isInteger(unit.slotWeight) || unit.slotWeight <= 0)) {
            pushError(errors, `${path}.slotWeight`, 'must be a positive integer when provided.');
        }
        if (!Array.isArray(unit.skills) || !unit.skills.length) {
            pushError(errors, `${path}.skills`, 'must contain at least one skill.');
        }

        if (unit.sprites == null || typeof unit.sprites !== 'object' || Array.isArray(unit.sprites)) {
            pushError(errors, `${path}.sprites`, 'must be an object.');
        } else if (!unit.sprites.idle || typeof unit.sprites.idle !== 'string') {
            pushError(errors, `${path}.sprites.idle`, 'must be a string.');
        } else if (unit.sprites.splash != null && (typeof unit.sprites.splash !== 'string' || !unit.sprites.splash)) {
            pushError(errors, `${path}.sprites.splash`, 'must be a non-empty string when provided.');
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
        if (normalizedDefinition.tags != null) {
            if (!Array.isArray(normalizedDefinition.tags) || normalizedDefinition.tags.some((entry) => typeof entry !== 'string' || !entry)) {
                pushError(errors, `${path}.tags`, 'must be an array of non-empty strings when provided.');
            }
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

    function validatePanicStateDefinition(definition) {
        const normalizedDefinition = cloneDefinition(definition || {});
        const errors = [];
        const path = 'panicState';

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

        const behavior = normalizedDefinition.behavior;
        if (behavior != null) {
            if (typeof behavior !== 'object' || Array.isArray(behavior)) {
                pushError(errors, `${path}.behavior`, 'must be an object when provided.');
            } else {
                if (behavior.mode != null && !['none', 'ai', 'skip', 'corrode'].includes(behavior.mode)) {
                    pushError(errors, `${path}.behavior.mode`, 'must be "none", "ai", "skip", or "corrode" when provided.');
                }
                if (behavior.lockPlayerInput != null && typeof behavior.lockPlayerInput !== 'boolean') {
                    pushError(errors, `${path}.behavior.lockPlayerInput`, 'must be a boolean when provided.');
                }
                if (behavior.forcedSkillId != null && (typeof behavior.forcedSkillId !== 'string' || !behavior.forcedSkillId)) {
                    pushError(errors, `${path}.behavior.forcedSkillId`, 'must be a non-empty string when provided.');
                }
                if (behavior.forcedSkillTag != null && (typeof behavior.forcedSkillTag !== 'string' || !behavior.forcedSkillTag)) {
                    pushError(errors, `${path}.behavior.forcedSkillTag`, 'must be a non-empty string when provided.');
                }
                if (behavior.forcedTarget != null && (typeof behavior.forcedTarget !== 'string' || !behavior.forcedTarget)) {
                    pushError(errors, `${path}.behavior.forcedTarget`, 'must be a non-empty string when provided.');
                } else if (behavior.forcedTarget && !ENEMY_AI_TARGETS.has(behavior.forcedTarget)) {
                    pushError(errors, `${path}.behavior.forcedTarget`, 'is not a supported value.');
                }
                if (behavior.aiProfile != null) {
                    if (typeof behavior.aiProfile !== 'object' || Array.isArray(behavior.aiProfile)) {
                        pushError(errors, `${path}.behavior.aiProfile`, 'must be an object when provided.');
                    } else {
                        if (behavior.aiProfile.skill != null && typeof behavior.aiProfile.skill !== 'string') {
                            pushError(errors, `${path}.behavior.aiProfile.skill`, 'must be a string when provided.');
                        } else if (behavior.aiProfile.skill && !ENEMY_AI_SKILLS.has(behavior.aiProfile.skill)) {
                            pushError(errors, `${path}.behavior.aiProfile.skill`, 'is not a supported value.');
                        }
                        if (behavior.aiProfile.target != null && typeof behavior.aiProfile.target !== 'string') {
                            pushError(errors, `${path}.behavior.aiProfile.target`, 'must be a string when provided.');
                        } else if (behavior.aiProfile.target && !ENEMY_AI_TARGETS.has(behavior.aiProfile.target)) {
                            pushError(errors, `${path}.behavior.aiProfile.target`, 'is not a supported value.');
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
                        pushError(errors, `${path}.hooks.${hookName}`, 'is not a supported panic state hook.');
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

    function validateBattleDefinition(definition, options = {}) {
        const requirePlayerParty = options.requirePlayerParty !== false;
        const normalizedDefinition = normalizeBattleDefinition(definition);
        const errors = [];

        if (!normalizedDefinition.id || typeof normalizedDefinition.id !== 'string') {
            pushError(errors, 'battle.id', 'must be a non-empty string.');
        }
        if (!normalizedDefinition.name || typeof normalizedDefinition.name !== 'string') {
            pushError(errors, 'battle.name', 'must be a non-empty string.');
        }
        if (normalizedDefinition.drive != null) {
            validateDriveMetadata(errors, normalizedDefinition.drive, 'battle.drive');
        }
        if (requirePlayerParty && (!Array.isArray(normalizedDefinition.playerUnits) || !normalizedDefinition.playerUnits.length)) {
            pushError(errors, 'battle.playerUnits', 'must contain at least one unit.');
        }
        const waveEnemyUnits = Array.isArray(normalizedDefinition.rules?.waves)
            ? normalizedDefinition.rules.waves.some((wave) => Array.isArray(wave?.enemyUnits) && wave.enemyUnits.length)
            : false;
        if (!Array.isArray(normalizedDefinition.enemyUnits) || !normalizedDefinition.enemyUnits.length) {
            if (!waveEnemyUnits) {
                pushError(errors, 'battle.enemyUnits', 'must contain at least one unit (or define enemy waves).');
            }
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

        const sanityModel = normalizedDefinition.rules?.sanityModel || normalizedDefinition.rules?.sanity;
        if (sanityModel != null) {
            if (typeof sanityModel !== 'object' || Array.isArray(sanityModel)) {
                pushError(errors, 'battle.rules.sanityModel', 'must be an object when provided.');
            } else {
                if (sanityModel.clearSpAtOrAbove != null && !isFiniteNumber(sanityModel.clearSpAtOrAbove)) {
                    pushError(errors, 'battle.rules.sanityModel.clearSpAtOrAbove', 'must be a number when provided.');
                }
                ['lowMorale', 'panic'].forEach((field) => {
                    const entry = sanityModel[field];
                    if (entry == null) {
                        return;
                    }
                    if (typeof entry !== 'object' || Array.isArray(entry)) {
                        pushError(errors, `battle.rules.sanityModel.${field}`, 'must be an object when provided.');
                        return;
                    }
                    if (entry.spAtOrBelow != null && !isFiniteNumber(entry.spAtOrBelow)) {
                        pushError(errors, `battle.rules.sanityModel.${field}.spAtOrBelow`, 'must be a number when provided.');
                    }
                    if (entry.stateId != null && (typeof entry.stateId !== 'string' || !entry.stateId)) {
                        pushError(errors, `battle.rules.sanityModel.${field}.stateId`, 'must be a non-empty string when provided.');
                    }
                    if (field === 'lowMorale' && entry.chance != null) {
                        if (isFiniteNumber(entry.chance)) {
                            return;
                        }
                        if (typeof entry.chance !== 'object' || Array.isArray(entry.chance)) {
                            pushError(errors, 'battle.rules.sanityModel.lowMorale.chance', 'must be a number or object when provided.');
                            return;
                        }
                        if (entry.chance.base != null && !isFiniteNumber(entry.chance.base)) {
                            pushError(errors, 'battle.rules.sanityModel.lowMorale.chance.base', 'must be a number when provided.');
                        }
                        if (entry.chance.perSpBelowThreshold != null && !isFiniteNumber(entry.chance.perSpBelowThreshold)) {
                            pushError(errors, 'battle.rules.sanityModel.lowMorale.chance.perSpBelowThreshold', 'must be a number when provided.');
                        }
                    }
                });
            }
        }

        const background = normalizedDefinition.rules?.background;
        if (background != null) {
            if (typeof background !== 'object' || Array.isArray(background)) {
                pushError(errors, 'battle.rules.background', 'must be an object when provided.');
            } else {
                if (!background.image || typeof background.image !== 'string' || !background.image.trim()) {
                    pushError(errors, 'battle.rules.background.image', 'must be a non-empty string when background is provided.');
                }
                if (background.overlay != null && typeof background.overlay !== 'string') {
                    pushError(errors, 'battle.rules.background.overlay', 'must be a string when provided.');
                }
                if (background.position != null && typeof background.position !== 'string') {
                    pushError(errors, 'battle.rules.background.position', 'must be a string when provided.');
                }
                if (background.size != null && typeof background.size !== 'string') {
                    pushError(errors, 'battle.rules.background.size', 'must be a string when provided.');
                }
            }
        }

        const waves = normalizedDefinition.rules?.waves;
        if (waves != null) {
            if (!Array.isArray(waves) || !waves.length) {
                pushError(errors, 'battle.rules.waves', 'must be a non-empty array when provided.');
            } else {
                waves.forEach((wave, waveIndex) => {
                    const wavePath = `battle.rules.waves[${waveIndex}]`;
                    if (!wave || typeof wave !== 'object' || Array.isArray(wave)) {
                        pushError(errors, wavePath, 'must be an object.');
                        return;
                    }
                    if (!Array.isArray(wave.enemyUnits) || !wave.enemyUnits.length) {
                        pushError(errors, `${wavePath}.enemyUnits`, 'must contain at least one unit.');
                        return;
                    }
                    wave.enemyUnits.forEach((unit, unitIndex) => validateUnit(errors, unit, `${wavePath}.enemyUnits[${unitIndex}]`));
                });
            }
        }

        const scriptedEvents = normalizedDefinition.rules?.scriptedEvents;
        if (scriptedEvents != null) {
            if (!Array.isArray(scriptedEvents) || !scriptedEvents.length) {
                pushError(errors, 'battle.rules.scriptedEvents', 'must be a non-empty array when provided.');
            } else {
                scriptedEvents.forEach((entry, entryIndex) => {
                    const entryPath = `battle.rules.scriptedEvents[${entryIndex}]`;
                    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                        pushError(errors, entryPath, 'must be an object.');
                        return;
                    }
                    if (!entry.id || typeof entry.id !== 'string') {
                        pushError(errors, `${entryPath}.id`, 'must be a non-empty string.');
                    }
                    if (!entry.trigger || typeof entry.trigger !== 'string') {
                        pushError(errors, `${entryPath}.trigger`, 'must be a non-empty string.');
                    } else if (!PASSIVE_HOOKS.has(entry.trigger)) {
                        pushError(errors, `${entryPath}.trigger`, 'must be a supported hook trigger name.');
                    }
                    if (entry.side != null && !['player', 'enemy'].includes(entry.side)) {
                        pushError(errors, `${entryPath}.side`, 'must be "player" or "enemy" when provided.');
                    }
                    if (entry.unitId != null && (typeof entry.unitId !== 'string' || !entry.unitId)) {
                        pushError(errors, `${entryPath}.unitId`, 'must be a non-empty string when provided.');
                    }
                    if (entry.threshold != null) {
                        const thresholdValue = Number(entry.threshold);
                        if (!Number.isFinite(thresholdValue) || thresholdValue < 0 || thresholdValue > 1) {
                            pushError(errors, `${entryPath}.threshold`, 'must be a number between 0 and 1 when provided.');
                        }
                    }
                    if (entry.hook == null) {
                        pushError(errors, `${entryPath}.hook`, 'must be provided.');
                    } else {
                        validateHookDefinition(errors, new Set(), entry.hook, `${entryPath}.hook`);
                    }
                });
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

    function validateEncounterDefinition(definition) {
        return validateBattleDefinition(definition, { requirePlayerParty: false });
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

    function validateContentPackManifest(manifest) {
        const normalizedDefinition = cloneDefinition(manifest || {});
        const errors = [];
        const path = 'manifest';

        if (!normalizedDefinition.id || typeof normalizedDefinition.id !== 'string') {
            pushError(errors, `${path}.id`, 'must be a non-empty string.');
        }
        if (!normalizedDefinition.name || typeof normalizedDefinition.name !== 'string') {
            pushError(errors, `${path}.name`, 'must be a non-empty string.');
        }
        if (!normalizedDefinition.version || typeof normalizedDefinition.version !== 'string') {
            pushError(errors, `${path}.version`, 'must be a non-empty string.');
        }
        if (normalizedDefinition.engineVersion != null && typeof normalizedDefinition.engineVersion !== 'string') {
            pushError(errors, `${path}.engineVersion`, 'must be a string when provided.');
        }
        if (normalizedDefinition.description != null && typeof normalizedDefinition.description !== 'string') {
            pushError(errors, `${path}.description`, 'must be a string when provided.');
        }
        if (normalizedDefinition.authors != null) {
            if (
                !(
                    typeof normalizedDefinition.authors === 'string'
                    || (Array.isArray(normalizedDefinition.authors) && normalizedDefinition.authors.every((entry) => typeof entry === 'string' && entry))
                )
            ) {
                pushError(errors, `${path}.authors`, 'must be a string or array of strings when provided.');
            }
        }
        if (normalizedDefinition.dependencies != null) {
            if (!Array.isArray(normalizedDefinition.dependencies)) {
                pushError(errors, `${path}.dependencies`, 'must be an array when provided.');
            } else {
                normalizedDefinition.dependencies.forEach((dep, index) => {
                    if (typeof dep === 'string') {
                        return;
                    }
                    if (!dep || typeof dep !== 'object' || Array.isArray(dep)) {
                        pushError(errors, `${path}.dependencies[${index}]`, 'must be a string pack id or { id, version }.');
                        return;
                    }
                    if (!dep.id || typeof dep.id !== 'string') {
                        pushError(errors, `${path}.dependencies[${index}].id`, 'must be a non-empty string.');
                    }
                    if (dep.version != null && typeof dep.version !== 'string') {
                        pushError(errors, `${path}.dependencies[${index}].version`, 'must be a string when provided.');
                    }
                });
            }
        }
        if (normalizedDefinition.featureFlags != null) {
            if (typeof normalizedDefinition.featureFlags !== 'object' || Array.isArray(normalizedDefinition.featureFlags)) {
                pushError(errors, `${path}.featureFlags`, 'must be an object when provided.');
            } else {
                Object.entries(normalizedDefinition.featureFlags).forEach(([key, value]) => {
                    if (typeof value !== 'boolean') {
                        pushError(errors, `${path}.featureFlags.${key}`, 'must be a boolean.');
                    }
                });
            }
        }

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
    battleModules.schema.validateEncounterDefinition = validateEncounterDefinition;
    battleModules.schema.validateUnitDefinition = validateUnitDefinition;
    battleModules.schema.validateStatusDefinition = validateStatusDefinition;
    battleModules.schema.validatePanicStateDefinition = validatePanicStateDefinition;
    battleModules.schema.validateContentPackManifest = validateContentPackManifest;
    battleModules.schema.formatBattleDefinitionErrors = formatBattleDefinitionErrors;

    battleModules.normalizeBattleDefinition = normalizeBattleDefinition;
    battleModules.validateBattleDefinition = validateBattleDefinition;
    battleModules.validateEncounterDefinition = validateEncounterDefinition;
    battleModules.validateUnitDefinition = validateUnitDefinition;
    battleModules.validateStatusDefinition = validateStatusDefinition;
    battleModules.validatePanicStateDefinition = validatePanicStateDefinition;
    battleModules.validateContentPackManifest = validateContentPackManifest;
    battleModules.formatBattleDefinitionErrors = formatBattleDefinitionErrors;

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        normalizeBattleDefinition,
        validateBattleDefinition,
        validateEncounterDefinition,
        validateUnitDefinition,
        validateStatusDefinition,
        validatePanicStateDefinition,
        validateContentPackManifest,
    };
})();
