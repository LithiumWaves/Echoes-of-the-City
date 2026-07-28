(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registerStatusDefinition = battleModules.registry?.registerStatusDefinition
        || battleModules.registerStatusDefinition;

    if (typeof registerStatusDefinition !== 'function') {
        throw new Error('Status registry is not available.');
    }

    function createCountOnlyStackModel(maxCount = 10) {
        return {
            count: { enabled: true, min: 0, max: maxCount, application: 'add' },
            expireWhen: { countLte: 0 },
        };
    }

    function registerTypedDamageDown(id, label, iconPath, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: 'Deal 10% less matching damage per Count for one turn. Caps at 10 Count.',
            countOnly: true,
            iconPath,
            stackModel: createCountOnlyStackModel(10),
            hooks: {
                skillSelected: [
                    {
                        conditions: [
                            { type: 'skillType', value: ['attack', 'counter'] },
                            { type: conditionType, value: conditionValue },
                        ],
                        actions: [
                            {
                                type: 'modifyContext',
                                target: 'self',
                                field: 'dynamicDamageBonus',
                                operation: 'addStatusCountScaled',
                                statusId: id,
                                statusSource: 'self',
                                multiplier: 0.1,
                                cap: 1,
                                direction: 'subtract',
                            },
                        ],
                    },
                ],
                turnEnd: [
                    { type: 'consumeStatus', target: 'self', statusId: id },
                ],
            },
        });
    }

    function registerTypedPowerDown(id, label, iconPath, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: 'Matching skills lose Final Power by Count for one turn. Caps at 10 Count.',
            countOnly: true,
            iconPath,
            stackModel: createCountOnlyStackModel(10),
            hooks: {
                skillSelected: [
                    {
                        conditions: [
                            { type: conditionType, value: conditionValue },
                        ],
                        actions: [
                            {
                                type: 'modifyContext',
                                target: 'self',
                                field: 'flatPowerBonus',
                                operation: 'addStatusCountScaled',
                                statusId: id,
                                multiplier: 1,
                                direction: 'subtract',
                            },
                        ],
                    },
                ],
                turnEnd: [
                    { type: 'consumeStatus', target: 'self', statusId: id },
                ],
            },
        });
    }

    function registerTypedResistDown(id, label, iconPath, conditionType, conditionValue) {
        registerStatusDefinition({
            id,
            label,
            description: 'Increase matching Resistance by 0.1 per Count for one turn.',
            countOnly: true,
            iconPath,
            stackModel: createCountOnlyStackModel(10),
            hooks: {
                beforeDamage: [
                    {
                        conditions: [
                            { type: conditionType, value: conditionValue },
                        ],
                        actions: [
                            {
                                type: 'modifyContext',
                                target: 'self',
                                field: 'damageReductionMultiplier',
                                operation: 'addStatusCountScaled',
                                statusId: id,
                                multiplier: 0.1,
                            },
                        ],
                    },
                ],
                turnEnd: [
                    { type: 'consumeStatus', target: 'self', statusId: id },
                ],
            },
        });
    }

    registerStatusDefinition({
        id: 'power_down',
        label: 'Power Down',
        description: 'All skills lose Final Power by the effect potency for one turn.',
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Power_Down.png',
        stackModel: {
            potency: { enabled: true, min: 0, max: 99, application: 'add' },
            count: { enabled: true, min: 0, max: 99, application: 'add' },
            expireWhen: { potencyLte: 0 },
        },
        hooks: {
            skillSelected: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'flatPowerBonus',
                    operation: 'add',
                    amount: {
                        multiplier: -1,
                        statusPotency: {
                            target: 'self',
                            statusId: 'power_down',
                        },
                    },
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'power_down' },
            ],
        },
    });

    registerTypedDamageDown(
        'slash_dmg_down',
        'Slash DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Slash_DMG_Down.png',
        'skillDamageType',
        'slash',
    );
    registerTypedDamageDown(
        'pierce_dmg_down',
        'Pierce DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Pierce_DMG_Down.png',
        'skillDamageType',
        'pierce',
    );
    registerTypedDamageDown(
        'blunt_dmg_down',
        'Blunt DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Blunt_DMG_Down.png',
        'skillDamageType',
        'blunt',
    );
    registerTypedDamageDown(
        'wrath_dmg_down',
        'Wrath DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Wrath_DMG_Down.png',
        'skillSinType',
        'wrath',
    );
    registerTypedDamageDown(
        'lust_dmg_down',
        'Lust DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Lust_DMG_Down.png',
        'skillSinType',
        'lust',
    );
    registerTypedDamageDown(
        'sloth_dmg_down',
        'Sloth DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Sloth_DMG_Down.png',
        'skillSinType',
        'sloth',
    );
    registerTypedDamageDown(
        'gluttony_dmg_down',
        'Gluttony DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Gluttony_DMG_Down.png',
        'skillSinType',
        'gluttony',
    );
    registerTypedDamageDown(
        'gloom_dmg_down',
        'Gloom DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Gloom_DMG_Down.png',
        'skillSinType',
        'gloom',
    );
    registerTypedDamageDown(
        'pride_dmg_down',
        'Pride DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Pride_DMG_Down.png',
        'skillSinType',
        'pride',
    );
    registerTypedDamageDown(
        'envy_dmg_down',
        'Envy DMG Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Envy_DMG_Down.png',
        'skillSinType',
        'envy',
    );

    registerTypedPowerDown(
        'slash_power_down',
        'Slash Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Slash_Power_Down.png',
        'skillDamageType',
        'slash',
    );
    registerTypedPowerDown(
        'pierce_power_down',
        'Pierce Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Pierce_Power_Down.png',
        'skillDamageType',
        'pierce',
    );
    registerTypedPowerDown(
        'blunt_power_down',
        'Blunt Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Blunt_Power_Down.png',
        'skillDamageType',
        'blunt',
    );
    registerTypedPowerDown(
        'wrath_power_down',
        'Wrath Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Wrath_Power_Down.png',
        'skillSinType',
        'wrath',
    );
    registerTypedPowerDown(
        'lust_power_down',
        'Lust Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Lust_Power_Down.png',
        'skillSinType',
        'lust',
    );
    registerTypedPowerDown(
        'sloth_power_down',
        'Sloth Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Sloth_Power_Down.png',
        'skillSinType',
        'sloth',
    );
    registerTypedPowerDown(
        'gluttony_power_down',
        'Gluttony Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Gluttony_Power_Down.png',
        'skillSinType',
        'gluttony',
    );
    registerTypedPowerDown(
        'gloom_power_down',
        'Gloom Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Gloom_Power_Down.png',
        'skillSinType',
        'gloom',
    );
    registerTypedPowerDown(
        'pride_power_down',
        'Pride Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Pride_Power_Down.png',
        'skillSinType',
        'pride',
    );
    registerTypedPowerDown(
        'envy_power_down',
        'Envy Power Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Envy_Power_Down.png',
        'skillSinType',
        'envy',
    );

    registerTypedResistDown(
        'slash_resist_down',
        'Slash Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Slash_Resist_Down.png',
        'skillDamageType',
        'slash',
    );
    registerTypedResistDown(
        'pierce_resist_down',
        'Pierce Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Pierce_Resist_Down.png',
        'skillDamageType',
        'pierce',
    );
    registerTypedResistDown(
        'blunt_resist_down',
        'Blunt Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Blunt_Resist_Down.png',
        'skillDamageType',
        'blunt',
    );
    registerTypedResistDown(
        'wrath_resist_down',
        'Wrath Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Wrath_Resist_Down.png',
        'skillSinType',
        'wrath',
    );
    registerTypedResistDown(
        'gloom_resist_down',
        'Gloom Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Gloom_Resist_Down.png',
        'skillSinType',
        'gloom',
    );
    registerTypedResistDown(
        'envy_resist_down',
        'Envy Resist Down',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Envy_Resist_Down.png',
        'skillSinType',
        'envy',
    );

    registerStatusDefinition({
        id: 'nebulizer_alpha',
        label: 'Nebulizer α',
        description: 'At battle start, apply Poise (Potency +1, Count +1) to all allies per stack. Persists throughout the encounter.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Nebulizer_α.png',
        stackModel: createCountOnlyStackModel(5),
        hooks: {
            battleStart: [
                {
                    type: 'applyStatus',
                    target: 'allAllies',
                    statusId: 'poise',
                    potencyAmount: {
                        statusCount: { target: 'self', statusId: 'nebulizer_alpha' },
                    },
                    countAmount: {
                        statusCount: { target: 'self', statusId: 'nebulizer_alpha' },
                    },
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'nebulizer_beta',
        label: 'Nebulizer β',
        description: 'At battle start, apply Poise (Potency +3, Count +3) to self and to a number of allies equal to stacks (prioritizes lowest Poise). Persists throughout the encounter.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Nebulizer_β.png',
        stackModel: createCountOnlyStackModel(5),
        hooks: {
            battleStart: [
                {
                    type: 'applyStatus',
                    target: 'self',
                    statusId: 'poise',
                    potency: 3,
                    count: 3,
                },
                {
                    type: 'applyStatus',
                    target: 'allAllies',
                    excludeSelf: true,
                    maxTargetsAmount: {
                        statusCount: { target: 'self', statusId: 'nebulizer_beta' },
                    },
                    prioritizeStatusId: 'poise',
                    prioritizeOrder: 'asc',
                    statusId: 'poise',
                    potency: 3,
                    count: 3,
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'grace_of_the_prescript',
        label: 'Grace of the Prescript',
        description: 'Gain +1 Offense Level for every 3 stacks. Max 9.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Grace_of_the_Prescript.png',
        stackModel: createCountOnlyStackModel(9),
        hooks: {
            turnStart: [
                {
                    conditions: [
                        { type: 'statusCountAtLeast', statusId: 'grace_of_the_prescript', value: 3 },
                    ],
                    actions: [
                        { type: 'modifyOffenseLevel', target: 'self', value: 1 },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', statusId: 'grace_of_the_prescript', value: 6 },
                    ],
                    actions: [
                        { type: 'modifyOffenseLevel', target: 'self', value: 1 },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtLeast', statusId: 'grace_of_the_prescript', value: 9 },
                    ],
                    actions: [
                        { type: 'modifyOffenseLevel', target: 'self', value: 1 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'unlock',
        label: 'Unlock',
        description: 'A stage-based marker derived from Grace of the Prescript.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Unlock_-_I.png',
        stackModel: createCountOnlyStackModel(3),
    });

    function registerUnlockStage(id, label, iconPath, defenseLevel, sanityOnBattleEnd) {
        registerStatusDefinition({
            id,
            label,
            description: `Defense Level +${defenseLevel}. On battle end, heal ${sanityOnBattleEnd} SP.`,
            countOnly: true,
            iconPath,
            stackModel: createCountOnlyStackModel(1),
            hooks: {
                turnStart: [
                    { type: 'modifyDefenseLevel', target: 'self', value: defenseLevel },
                ],
                battleEnd: [
                    { type: 'adjustSanity', target: 'self', value: sanityOnBattleEnd },
                ],
            },
        });
    }

    registerUnlockStage(
        'unlock_i',
        'Unlock - I',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Unlock_-_I.png',
        1,
        5,
    );
    registerUnlockStage(
        'unlock_ii',
        'Unlock - II',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Unlock_-_II.png',
        2,
        10,
    );
    registerUnlockStage(
        'unlock_iii',
        'Unlock - III',
        'docs/Status Effects - Limbus Company Wiki_files/25px-Unlock_-_III.png',
        3,
        15,
    );

    registerStatusDefinition({
        id: 'mark_of_the_prescript',
        label: 'Mark of the Prescript',
        description: 'Marks a base attack skill for Index effects.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Mark_of_the_Prescript.png',
        stackModel: createCountOnlyStackModel(1),
    });

    registerStatusDefinition({
        id: 'the_prescripts_target',
        label: "The Prescript's Target",
        description: 'Take +10% damage for one turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-The_Prescript\'s_Target.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            beforeDamage: [
                {
                    type: 'modifyContext',
                    target: 'self',
                    field: 'damageReductionMultiplier',
                    operation: 'add',
                    value: 0.1,
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'the_prescripts_target' },
            ],
        },
    });

    registerStatusDefinition({
        id: 'desire_for_acknowledgement_sated',
        label: 'Desire for Acknowledgement Sated',
        description: 'Deal +7.5% damage when acting with Mark of the Prescript, and against The Prescript’s Target.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Desire_for_Acknowledgement_Sated.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: ['attack', 'counter'] },
                        { type: 'hasStatus', target: 'self', statusId: 'mark_of_the_prescript' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'damageMultiplier', operation: 'add', value: 0.075 },
                    ],
                },
                {
                    conditions: [
                        { type: 'skillType', value: ['attack', 'counter'] },
                        { type: 'hasStatus', target: 'opponent', statusId: 'the_prescripts_target' },
                    ],
                    actions: [
                        { type: 'modifyContext', target: 'self', field: 'damageMultiplier', operation: 'add', value: 0.075 },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'gaze_of_contempt',
        label: 'Gaze of Contempt',
        description: 'Deal +7% damage per stack this turn (max 7). At 7 stacks, convert into Contempt of the Gaze next turn.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Gaze_of_Contempt.png',
        stackModel: createCountOnlyStackModel(7),
        hooks: {
            skillSelected: [
                {
                    conditions: [
                        { type: 'skillType', value: ['attack', 'counter'] },
                    ],
                    actions: [
                        {
                            type: 'modifyContext',
                            target: 'self',
                            field: 'damageMultiplier',
                            operation: 'addStatusCountScaled',
                            statusId: 'gaze_of_contempt',
                            multiplier: 0.07,
                            cap: 0.49,
                        },
                    ],
                },
            ],
            turnEnd: [
                {
                    conditions: [
                        { type: 'statusCountAtLeast', statusId: 'gaze_of_contempt', value: 7 },
                    ],
                    actions: [
                        { type: 'queueStatus', target: 'self', statusId: 'contempt_of_the_gaze', count: 1 },
                        { type: 'consumeStatus', target: 'self', statusId: 'gaze_of_contempt' },
                    ],
                },
                {
                    conditions: [
                        { type: 'statusCountAtOrBelow', statusId: 'gaze_of_contempt', value: 6 },
                    ],
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'gaze_of_contempt' },
                    ],
                },
            ],
        },
    });

    registerStatusDefinition({
        id: 'contempt_of_the_gaze',
        label: 'Contempt of the Gaze',
        description: 'On gain: Protection +7, Damage Down +7, Aggro +20. Cannot gain Gaze of Contempt while active. Expires at turn end.',
        countOnly: true,
        iconPath: 'docs/Status Effects - Limbus Company Wiki_files/25px-Contempt_of_the_Gaze.png',
        stackModel: createCountOnlyStackModel(1),
        hooks: {
            statusApplied: [
                {
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'contempt_of_the_gaze' },
                    ],
                    actions: [
                        { type: 'applyStatus', target: 'self', statusId: 'protection', count: 7 },
                        { type: 'applyStatus', target: 'self', statusId: 'damage_down', count: 7 },
                        { type: 'applyStatus', target: 'self', statusId: 'aggro', count: 20 },
                    ],
                },
                {
                    conditions: [
                        { type: 'eventStatusIdIs', value: 'gaze_of_contempt' },
                        { type: 'hasStatus', target: 'self', statusId: 'contempt_of_the_gaze' },
                    ],
                    actions: [
                        { type: 'consumeStatus', target: 'self', statusId: 'gaze_of_contempt' },
                    ],
                },
            ],
            turnEnd: [
                { type: 'consumeStatus', target: 'self', statusId: 'contempt_of_the_gaze' },
            ],
        },
    });
})();

