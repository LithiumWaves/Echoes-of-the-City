(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function statusLabel(catalog, statusId) {
        if (!statusId) {
            return 'status';
        }
        const list = catalog?.statusList || [];
        const match = list.find((entry) => entry.id === statusId);
        return match?.label || match?.name || statusId;
    }

    function isStacksOnlyStatus(catalog, statusId) {
        if (!statusId) {
            return false;
        }
        const creatorUi = battleModules.creatorUi || window.EchoesOfTheCityCreatorUi;
        if (typeof creatorUi?.getStatusMetricMode === 'function') {
            return creatorUi.getStatusMetricMode(statusId, catalog) === 'stacks';
        }
        const match = (catalog?.statusList || []).find((entry) => entry.id === statusId);
        if (!match) {
            return false;
        }
        if (match.countOnly === true) {
            return true;
        }
        const potencyEnabled = Boolean(match.stackModel?.potency?.enabled);
        const countEnabled = Boolean(match.stackModel?.count?.enabled);
        return countEnabled && !potencyEnabled;
    }

    function pct(value) {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            return '';
        }
        return `${Math.round(value * 100)}%`;
    }

    const PATTERN_DEFS = [
        {
            id: 'damage_pct_per_stack',
            label: '% damage per status count (capped)',
            scope: 'onSelect',
            compile: () => [{
                trigger: 'onSelect',
                type: 'modifyContext',
                field: 'damageMultiplier',
                operation: 'addStatusCountScaled',
                statusId: '',
                statusSource: 'self',
                multiplier: 0.06,
                cap: 0.3,
            }],
        },
        {
            id: 'tiered_coin_power',
            label: 'Tiered Coin Power (e.g. 5+ / 10+)',
            scope: 'onSelect',
            compile: () => [
                {
                    trigger: 'onSelect',
                    type: 'modifyContext',
                    field: 'coinPowerBonus',
                    operation: 'add',
                    value: 1,
                    statusId: '',
                    minStatusCount: 5,
                    statusSource: 'self',
                },
                {
                    trigger: 'onSelect',
                    type: 'modifyContext',
                    field: 'coinPowerBonus',
                    operation: 'add',
                    value: 2,
                    statusId: '',
                    minStatusCount: 10,
                    statusSource: 'self',
                },
            ],
        },
        {
            id: 'clash_per_n_stacks',
            label: 'Clash Power per N stacks (max)',
            scope: 'onSelect',
            compile: () => [{
                trigger: 'onSelect',
                type: 'modifyContext',
                field: 'clashPowerBonus',
                operation: 'add',
                statusId: '',
                statusSource: 'self',
                amount: {
                    clamp: {
                        value: {
                            floor: {
                                statusCount: { target: 'self', statusId: '' },
                                multiplier: 0.2,
                            },
                        },
                        max: 2,
                    },
                },
            }],
        },
        {
            id: 'slot_aggro',
            label: '+Aggro to this skill slot (next turn)',
            scope: 'onAttackEnd',
            compile: () => [{
                trigger: 'onAttackEnd',
                type: 'adjustSlotAggro',
                target: 'self',
                value: 3,
            }],
        },
        {
            id: 'apply_status_hit',
            label: 'On Hit — inflict status',
            scope: 'onHit',
            compile: (coinIndex) => [{
                trigger: 'onHit',
                type: 'applyStatus',
                statusId: '',
                count: 1,
                coinIndex: coinIndex || 1,
            }],
        },
        {
            id: 'gain_status_hit',
            label: 'On Hit — gain status on self',
            scope: 'onHit',
            compile: (coinIndex) => [{
                trigger: 'onHit',
                type: 'applyStatus',
                target: 'self',
                statusId: '',
                count: 1,
                coinIndex: coinIndex || 1,
            }],
        },
        {
            id: 'weighted_one_in_three',
            label: 'On Hit — 33% bonus branch (like 1d3 = 1)',
            scope: 'onHit',
            compile: (coinIndex) => [{
                trigger: 'onHit',
                type: 'chooseWeightedActions',
                coinIndex: coinIndex || 1,
                branches: [
                    {
                        weight: 1,
                        actions: [{
                            type: 'applyStatus',
                            statusId: '',
                            count: 1,
                        }],
                    },
                    { weight: 1, actions: [] },
                    { weight: 1, actions: [] },
                ],
            }],
        },
        {
            id: 'bonus_if_status',
            label: 'On Hit — bonus if status active',
            scope: 'onHit',
            compile: (coinIndex) => [{
                trigger: 'onHit',
                type: 'modifyContext',
                field: 'coinPowerBonus',
                operation: 'add',
                value: 2,
                statusId: '',
                minStatusCount: 1,
                statusSource: 'self',
                coinIndex: coinIndex || 1,
            }],
        },
        {
            id: 'coin_power_all',
            label: 'On Use — +Coin Power (all coins)',
            scope: 'onSelect',
            compile: () => [{
                trigger: 'onSelect',
                type: 'modifyContext',
                field: 'coinPowerBonus',
                operation: 'add',
                value: 2,
            }],
        },
    ];

    function listPatterns(scope) {
        return PATTERN_DEFS.filter((entry) => !scope || entry.scope === scope || (scope === 'onHit' && entry.scope === 'onHit'));
    }

    function compilePattern(patternId, coinIndex) {
        const def = PATTERN_DEFS.find((entry) => entry.id === patternId);
        if (!def) {
            return [];
        }
        return def.compile(coinIndex);
    }

    function describeEffect(effect, catalog) {
        if (!effect || typeof effect !== 'object') {
            return 'Effect';
        }
        const type = effect.type || '';
        const trigger = effect.trigger || 'onHit';
        const triggerLabel = trigger === 'onSelect' ? 'On Use' : (trigger === 'onAttackEnd' ? 'After attack' : trigger);
        const coinSuffix = Number.isInteger(effect.coinIndex) ? ` (Coin ${effect.coinIndex})` : '';

        if (type === 'modifyContext' && effect.operation === 'addStatusCountScaled' && effect.field === 'damageMultiplier') {
            const cap = typeof effect.cap === 'number' ? pct(effect.cap) : '';
            return `[${triggerLabel}] Deal +${pct(effect.multiplier)} damage per ${statusLabel(catalog, effect.statusId)} on self${cap ? ` (max ${cap})` : ''}`;
        }
        if (type === 'modifyContext' && effect.field === 'coinPowerBonus' && effect.operation === 'add' && effect.minStatusCount) {
            const unit = isStacksOnlyStatus(catalog, effect.statusId) ? 'stacks' : 'count';
            return `[${triggerLabel}] At ${effect.minStatusCount}+ ${statusLabel(catalog, effect.statusId)} ${unit}, Coin Power +${effect.value || 0}${coinSuffix}`;
        }
        if (type === 'modifyContext' && effect.field === 'coinPowerBonus' && effect.operation === 'add' && !effect.minStatusCount) {
            return `[${triggerLabel}] Coin Power +${effect.value || 0}${coinSuffix}`;
        }
        if (type === 'modifyContext' && effect.field === 'clashPowerBonus') {
            return `[${triggerLabel}] Clash Power scales with ${statusLabel(catalog, effect.statusId)} stacks (stepped, capped)`;
        }
        if (type === 'adjustSlotAggro') {
            return `[After attack] Gain +${effect.value || 0} Aggro to this skill slot next turn (see engine note: bonus may persist until cleared)`;
        }
        if (type === 'applyStatus') {
            const target = effect.target === 'self' ? 'self' : 'target';
            const stacksOnly = isStacksOnlyStatus(catalog, effect.statusId);
            if (stacksOnly) {
                const stacks = effect.count != null ? ` ${effect.count} stacks` : '';
                return `[On Hit${coinSuffix}] ${target === 'self' ? 'Gain' : 'Inflict'} ${statusLabel(catalog, effect.statusId)}${stacks}`;
            }
            const potency = effect.potency != null ? ` potency ${effect.potency}` : '';
            const count = effect.count != null ? ` count ${effect.count}` : '';
            return `[On Hit${coinSuffix}] ${target === 'self' ? 'Gain' : 'Inflict'} ${statusLabel(catalog, effect.statusId)}${potency}${count}`;
        }
        if (type === 'consumeStatus') {
            return `[${triggerLabel}] Consume ${statusLabel(catalog, effect.statusId)}${coinSuffix}`;
        }
        if (type === 'chooseWeightedActions') {
            return `[On Hit${coinSuffix}] 33% chance bonus branch`;
        }
        if (type === 'burstTremor') {
            return `[On Hit${coinSuffix}] Burst Tremor`;
        }
        if (type === 'adjustSlotAggro') {
            return `[${triggerLabel}] Adjust slot aggro +${effect.value || 0}`;
        }
        return `[${triggerLabel}${coinSuffix}] ${type || 'effect'}`;
    }

    function groupEffectsForDisplay(effects) {
        const onUse = [];
        const onAttackEnd = [];
        const byCoin = {};
        const other = [];

        (Array.isArray(effects) ? effects : []).forEach((effect, index) => {
            const entry = { effect, index };
            const trigger = effect?.trigger || 'onHit';
            if (trigger === 'onSelect' || trigger === 'onUse') {
                onUse.push(entry);
                return;
            }
            if (trigger === 'onAttackEnd') {
                onAttackEnd.push(entry);
                return;
            }
            if (trigger === 'onHit') {
                const coin = Number.isInteger(effect?.coinIndex) ? effect.coinIndex : 0;
                if (!byCoin[coin]) {
                    byCoin[coin] = [];
                }
                byCoin[coin].push(entry);
                return;
            }
            other.push(entry);
        });

        return { onUse, onAttackEnd, byCoin, other };
    }

    function buildDescriptionFromEffects(skill, catalog) {
        const lines = [];
        const groups = groupEffectsForDisplay(skill?.effects);
        groups.onUse.forEach(({ effect }) => lines.push(describeEffect(effect, catalog)));
        groups.onAttackEnd.forEach(({ effect }) => lines.push(describeEffect(effect, catalog)));
        Object.keys(groups.byCoin).sort((a, b) => Number(a) - Number(b)).forEach((coinKey) => {
            const coinNum = Number(coinKey);
            groups.byCoin[coinKey].forEach(({ effect }) => {
                const line = describeEffect(effect, catalog);
                if (coinNum > 0) {
                    lines.push(line.replace('[On Hit', `[On Hit Coin ${coinNum}`));
                } else {
                    lines.push(line);
                }
            });
        });
        groups.other.forEach(({ effect }) => lines.push(describeEffect(effect, catalog)));
        return lines.join('\n');
    }

    const skillEffectPatterns = {
        PATTERN_DEFS,
        listPatterns,
        compilePattern,
        describeEffect,
        groupEffectsForDisplay,
        buildDescriptionFromEffects,
        statusLabel,
    };

    battleModules.skillEffectPatterns = skillEffectPatterns;
    window.EchoesOfTheCitySkillEffectPatterns = skillEffectPatterns;
})();
