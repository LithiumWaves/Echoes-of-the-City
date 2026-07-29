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
        ammo: { id: 'ammo', label: 'Ammo', countOnly: true },
        atelier_logic_ammo: { id: 'atelier_logic_ammo', label: 'Ammo - Atelier Logic', countOnly: true },
        bullet_solitude: { id: 'bullet_solitude', label: 'Bullet - Solitude', countOnly: true },
        lca_fracture_round: { id: 'lca_fracture_round', label: 'LCA Fracture Round', countOnly: true },
        spore_round_base: { id: 'spore_round_base', label: 'Spore Round [Base]', countOnly: true },
        spore_round_buckshot: { id: 'spore_round_buckshot', label: 'Spore Round [Buckshot]', countOnly: true },
        scorch_propellant_ammo: { id: 'scorch_propellant_ammo', label: 'Scorch Propellant Ammo', countOnly: true },
        tigermark_round: { id: 'tigermark_round', label: 'Tigermark Round', countOnly: true },
        savage_tigermark_round: { id: 'savage_tigermark_round', label: 'Savage Tigermark Round', countOnly: true },
        the_living_and_the_departed: { id: 'the_living_and_the_departed', label: 'The Living & The Departed' },
        tiantui_star: { id: 'tiantui_star', label: 'Tiantui Star [天退星]', countOnly: true },
        shin_tiantui_star: { id: 'shin_tiantui_star', label: 'Shin (心) - Tiantui Star [天退星]', countOnly: true },
        power_up: { id: 'power_up', label: 'Power Up', countOnly: true },
        weak_resist_dmg_boost: { id: 'weak_resist_dmg_boost', label: 'Weak-resist DMG Boost', countOnly: true },
        hp_healing_boost: { id: 'hp_healing_boost', label: 'HP Healing Boost', countOnly: true },
        rupture_protection: { id: 'rupture_protection', label: 'Rupture Protection', countOnly: true },
        commanding_cry: { id: 'commanding_cry', label: 'Commanding Cry', countOnly: true },
        unrelenting_storm: { id: 'unrelenting_storm', label: 'Unrelenting Storm', countOnly: true },
        somatic_frisson_inspiring_melody: { id: 'somatic_frisson_inspiring_melody', label: 'Somatic Frisson-inspiring Melody', countOnly: true },
        scarlet_moth: { id: 'scarlet_moth', label: 'Scarlet Moth', countOnly: true },
        borrowed_time: { id: 'borrowed_time', label: 'Borrowed Time' },
        dark_cloud_blade: { id: 'dark_cloud_blade', label: 'Dark Cloud Blade', countOnly: true },
        battle_ready: { id: 'battle_ready', label: 'Battle Ready', countOnly: true },
        strider_wu: { id: 'strider_wu', label: 'Strider【Wu】', countOnly: true },
        strider_mao: { id: 'strider_mao', label: 'Strider【Mao】', countOnly: true },
        burgeoning_of_horns: { id: 'burgeoning_of_horns', label: 'Burgeoning of Horns [發角]', countOnly: true },
        nebulizer_alpha: { id: 'nebulizer_alpha', label: 'Nebulizer α', countOnly: true },
        nebulizer_beta: { id: 'nebulizer_beta', label: 'Nebulizer β', countOnly: true },
        grace_of_the_prescript: { id: 'grace_of_the_prescript', label: 'Grace of the Prescript', countOnly: true },
        unlock: { id: 'unlock', label: 'Unlock', countOnly: true },
        unlock_i: { id: 'unlock_i', label: 'Unlock - I', countOnly: true },
        unlock_ii: { id: 'unlock_ii', label: 'Unlock - II', countOnly: true },
        unlock_iii: { id: 'unlock_iii', label: 'Unlock - III', countOnly: true },
        mark_of_the_prescript: { id: 'mark_of_the_prescript', label: 'Mark of the Prescript', countOnly: true },
        the_prescripts_target: { id: 'the_prescripts_target', label: "The Prescript's Target", countOnly: true },
        desire_for_acknowledgement_sated: { id: 'desire_for_acknowledgement_sated', label: 'Desire for Acknowledgement Sated', countOnly: true },
        gaze_of_contempt: { id: 'gaze_of_contempt', label: 'Gaze of Contempt', countOnly: true },
        contempt_of_the_gaze: { id: 'contempt_of_the_gaze', label: 'Contempt of the Gaze', countOnly: true },
        wild_hunt: { id: 'wild_hunt', label: 'Wild Hunt', countOnly: true },
        wild_hunt_doom: { id: 'wild_hunt_doom', label: 'Wild Hunt (Doomed)', countOnly: true },
        high_noon: { id: 'high_noon', label: 'High Noon', countOnly: true },
        loneliness_at_high_noon: { id: 'loneliness_at_high_noon', label: 'Loneliness at High Noon', countOnly: true },
        dawnherald: { id: 'dawnherald', label: 'Dawnherald', countOnly: true },
        dawn_office: { id: 'dawn_office', label: 'Dawn Office', countOnly: true },
        from_dawnbreak_to_sunset: { id: 'from_dawnbreak_to_sunset', label: 'From Dawnbreak to Sunset', countOnly: true },
        blazing_sunset: { id: 'blazing_sunset', label: 'Blazing Sunset', countOnly: true },
        bloodflame: { id: 'bloodflame', label: 'Bloodflame [血炎]', countOnly: true },
        fanatic: { id: 'fanatic', label: 'Fanatic', countOnly: true },
        blooming_thorn: { id: 'blooming_thorn', label: 'Blooming Thorn', countOnly: true },
        blooming_thorn_ii: { id: 'blooming_thorn_ii', label: 'Blooming Thorn II', countOnly: true },
        blooming_thorn_iii: { id: 'blooming_thorn_iii', label: 'Blooming Thorn III', countOnly: true },
        festive_fever: { id: 'festive_fever', label: 'Festive Fever', countOnly: true },
        aggro: { id: 'aggro', label: 'Aggro', countOnly: true },
        fairy_lure: { id: 'fairy_lure', label: 'Fairy Lure', countOnly: true },
        charge_barrier: { id: 'charge_barrier', label: 'Charge Barrier', countOnly: true },
        haste: { id: 'haste', label: 'Haste', countOnly: true },
        bind: { id: 'bind', label: 'Bind', countOnly: true },
        fragile: { id: 'fragile', label: 'Fragile', countOnly: true },
        concussion: { id: 'concussion', label: 'Concussion', countOnly: true },
        coffin: { id: 'coffin', label: 'Coffin', countOnly: true },
        spore: { id: 'spore', label: 'Spore', countOnly: true },
        defense_power_up: { id: 'defense_power_up', label: 'Defense Power Up', countOnly: true },
        defense_power_down: { id: 'defense_power_down', label: 'Defense Power Down', countOnly: true },
        clash_power_up: { id: 'clash_power_up', label: 'Clash Power Up', countOnly: true },
        clash_power_down: { id: 'clash_power_down', label: 'Clash Power Down', countOnly: true },
        base_power_up: { id: 'base_power_up', label: 'Base Power Up', countOnly: true },
        damage_up: { id: 'damage_up', label: 'Damage Up', countOnly: true },
        damage_down: { id: 'damage_down', label: 'Damage Down', countOnly: true },
        power_down: { id: 'power_down', label: 'Power Down', countOnly: true },
        crit_dmg_up: { id: 'crit_dmg_up', label: 'Crit DMG Up', countOnly: true },
        slash_dmg_up: { id: 'slash_dmg_up', label: 'Slash DMG Up', countOnly: true },
        pierce_dmg_up: { id: 'pierce_dmg_up', label: 'Pierce DMG Up', countOnly: true },
        blunt_dmg_up: { id: 'blunt_dmg_up', label: 'Blunt DMG Up', countOnly: true },
        wrath_dmg_up: { id: 'wrath_dmg_up', label: 'Wrath DMG Up', countOnly: true },
        lust_dmg_up: { id: 'lust_dmg_up', label: 'Lust DMG Up', countOnly: true },
        sloth_dmg_up: { id: 'sloth_dmg_up', label: 'Sloth DMG Up', countOnly: true },
        gluttony_dmg_up: { id: 'gluttony_dmg_up', label: 'Gluttony DMG Up', countOnly: true },
        gloom_dmg_up: { id: 'gloom_dmg_up', label: 'Gloom DMG Up', countOnly: true },
        pride_dmg_up: { id: 'pride_dmg_up', label: 'Pride DMG Up', countOnly: true },
        envy_dmg_up: { id: 'envy_dmg_up', label: 'Envy DMG Up', countOnly: true },
        slash_dmg_down: { id: 'slash_dmg_down', label: 'Slash DMG Down', countOnly: true },
        pierce_dmg_down: { id: 'pierce_dmg_down', label: 'Pierce DMG Down', countOnly: true },
        blunt_dmg_down: { id: 'blunt_dmg_down', label: 'Blunt DMG Down', countOnly: true },
        wrath_dmg_down: { id: 'wrath_dmg_down', label: 'Wrath DMG Down', countOnly: true },
        lust_dmg_down: { id: 'lust_dmg_down', label: 'Lust DMG Down', countOnly: true },
        sloth_dmg_down: { id: 'sloth_dmg_down', label: 'Sloth DMG Down', countOnly: true },
        gluttony_dmg_down: { id: 'gluttony_dmg_down', label: 'Gluttony DMG Down', countOnly: true },
        gloom_dmg_down: { id: 'gloom_dmg_down', label: 'Gloom DMG Down', countOnly: true },
        pride_dmg_down: { id: 'pride_dmg_down', label: 'Pride DMG Down', countOnly: true },
        envy_dmg_down: { id: 'envy_dmg_down', label: 'Envy DMG Down', countOnly: true },
        slash_power_up: { id: 'slash_power_up', label: 'Slash Power Up', countOnly: true },
        pierce_power_up: { id: 'pierce_power_up', label: 'Pierce Power Up', countOnly: true },
        blunt_power_up: { id: 'blunt_power_up', label: 'Blunt Power Up', countOnly: true },
        wrath_power_up: { id: 'wrath_power_up', label: 'Wrath Power Up', countOnly: true },
        lust_power_up: { id: 'lust_power_up', label: 'Lust Power Up', countOnly: true },
        sloth_power_up: { id: 'sloth_power_up', label: 'Sloth Power Up', countOnly: true },
        gluttony_power_up: { id: 'gluttony_power_up', label: 'Gluttony Power Up', countOnly: true },
        gloom_power_up: { id: 'gloom_power_up', label: 'Gloom Power Up', countOnly: true },
        pride_power_up: { id: 'pride_power_up', label: 'Pride Power Up', countOnly: true },
        envy_power_up: { id: 'envy_power_up', label: 'Envy Power Up', countOnly: true },
        slash_power_down: { id: 'slash_power_down', label: 'Slash Power Down', countOnly: true },
        pierce_power_down: { id: 'pierce_power_down', label: 'Pierce Power Down', countOnly: true },
        blunt_power_down: { id: 'blunt_power_down', label: 'Blunt Power Down', countOnly: true },
        wrath_power_down: { id: 'wrath_power_down', label: 'Wrath Power Down', countOnly: true },
        lust_power_down: { id: 'lust_power_down', label: 'Lust Power Down', countOnly: true },
        sloth_power_down: { id: 'sloth_power_down', label: 'Sloth Power Down', countOnly: true },
        gluttony_power_down: { id: 'gluttony_power_down', label: 'Gluttony Power Down', countOnly: true },
        gloom_power_down: { id: 'gloom_power_down', label: 'Gloom Power Down', countOnly: true },
        pride_power_down: { id: 'pride_power_down', label: 'Pride Power Down', countOnly: true },
        envy_power_down: { id: 'envy_power_down', label: 'Envy Power Down', countOnly: true },
        slash_protection: { id: 'slash_protection', label: 'Slash Protection', countOnly: true },
        pierce_protection: { id: 'pierce_protection', label: 'Pierce Protection', countOnly: true },
        blunt_protection: { id: 'blunt_protection', label: 'Blunt Protection', countOnly: true },
        wrath_protection: { id: 'wrath_protection', label: 'Wrath Protection', countOnly: true },
        lust_protection: { id: 'lust_protection', label: 'Lust Protection', countOnly: true },
        sloth_protection: { id: 'sloth_protection', label: 'Sloth Protection', countOnly: true },
        gluttony_protection: { id: 'gluttony_protection', label: 'Gluttony Protection', countOnly: true },
        gloom_protection: { id: 'gloom_protection', label: 'Gloom Protection', countOnly: true },
        pride_protection: { id: 'pride_protection', label: 'Pride Protection', countOnly: true },
        envy_protection: { id: 'envy_protection', label: 'Envy Protection', countOnly: true },
        slash_resist_down: { id: 'slash_resist_down', label: 'Slash Resist Down', countOnly: true },
        pierce_resist_down: { id: 'pierce_resist_down', label: 'Pierce Resist Down', countOnly: true },
        blunt_resist_down: { id: 'blunt_resist_down', label: 'Blunt Resist Down', countOnly: true },
        wrath_resist_down: { id: 'wrath_resist_down', label: 'Wrath Resist Down', countOnly: true },
        gloom_resist_down: { id: 'gloom_resist_down', label: 'Gloom Resist Down', countOnly: true },
        envy_resist_down: { id: 'envy_resist_down', label: 'Envy Resist Down', countOnly: true },
        slash_fragility: { id: 'slash_fragility', label: 'Slash Fragility', countOnly: true },
        pierce_fragility: { id: 'pierce_fragility', label: 'Pierce Fragility', countOnly: true },
        blunt_fragility: { id: 'blunt_fragility', label: 'Blunt Fragility', countOnly: true },
        wrath_fragility: { id: 'wrath_fragility', label: 'Wrath Fragility', countOnly: true },
        lust_fragility: { id: 'lust_fragility', label: 'Lust Fragility', countOnly: true },
        sloth_fragility: { id: 'sloth_fragility', label: 'Sloth Fragility', countOnly: true },
        gluttony_fragility: { id: 'gluttony_fragility', label: 'Gluttony Fragility', countOnly: true },
        gloom_fragility: { id: 'gloom_fragility', label: 'Gloom Fragility', countOnly: true },
        pride_fragility: { id: 'pride_fragility', label: 'Pride Fragility', countOnly: true },
        envy_fragility: { id: 'envy_fragility', label: 'Envy Fragility', countOnly: true },
        nails: { id: 'nails', label: 'Nails', countOnly: true },
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
        dark_flame: { id: 'dark_flame', label: 'Dark Flame', countOnly: true },
        photoelectricity: { id: 'photoelectricity', label: 'Photoelectricity', countOnly: true },
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
        beforeHeal: 'Before Heal',
        afterHeal: 'After Heal',
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
        dealHpPercentDamage: { id: 'dealHpPercentDamage', label: 'Deal HP Percent Damage' },
        adjustSanity: { id: 'adjustSanity', label: 'Adjust Sanity' },
        setSanity: { id: 'setSanity', label: 'Set Sanity' },
        healHp: { id: 'healHp', label: 'Heal HP' },
        healHpPercent: { id: 'healHpPercent', label: 'Heal HP Percent' },
        reviveUnit: { id: 'reviveUnit', label: 'Revive Unit' },
        recoverStagger: { id: 'recoverStagger', label: 'Recover Stagger' },
        staggerUnit: { id: 'staggerUnit', label: 'Stagger Unit' },
        adjustStatus: { id: 'adjustStatus', label: 'Adjust Status' },
        clearStatus: { id: 'clearStatus', label: 'Clear Status' },
        clearStatusesByTag: { id: 'clearStatusesByTag', label: 'Clear Statuses By Tag' },
        consumeStatusesByTag: { id: 'consumeStatusesByTag', label: 'Consume Statuses By Tag' },
        copyStatus: { id: 'copyStatus', label: 'Copy Status' },
        transferStatus: { id: 'transferStatus', label: 'Transfer Status' },
        convertStatus: { id: 'convertStatus', label: 'Convert Status' },
        multiplyStatus: { id: 'multiplyStatus', label: 'Multiply Status' },
        splitStatus: { id: 'splitStatus', label: 'Split Status' },
        modifyContext: { id: 'modifyContext', label: 'Modify Context' },
        modifyCoinMap: { id: 'modifyCoinMap', label: 'Modify Coin Map' },
        setFollowUpSkill: { id: 'setFollowUpSkill', label: 'Set Follow-up Skill' },
        modifyPhysicalResistance: { id: 'modifyPhysicalResistance', label: 'Modify Physical Resistance' },
        modifySinResistance: { id: 'modifySinResistance', label: 'Modify Sin Resistance' },
        modifyDefenseLevel: { id: 'modifyDefenseLevel', label: 'Modify Defense Level' },
        modifyOffenseLevel: { id: 'modifyOffenseLevel', label: 'Modify Offense Level' },
        modifySpeed: { id: 'modifySpeed', label: 'Modify Speed' },
        gainShield: { id: 'gainShield', label: 'Gain Shield' },
        clearShield: { id: 'clearShield', label: 'Clear Shield' },
        retargetSlot: { id: 'retargetSlot', label: 'Retarget Slot' },
        redirectDamage: { id: 'redirectDamage', label: 'Redirect Damage' },
        burstTremor: { id: 'burstTremor', label: 'Burst Tremor' },
        consumeStatus: { id: 'consumeStatus', label: 'Consume Status' },
        adjustEncounterResource: { id: 'adjustEncounterResource', label: 'Adjust Encounter Resource' },
        adjustUnitResource: { id: 'adjustUnitResource', label: 'Adjust Unit Resource' },
        spendEncounterResource: { id: 'spendEncounterResource', label: 'Spend Encounter Resource' },
        spendUnitResource: { id: 'spendUnitResource', label: 'Spend Unit Resource' },
        adjustResonance: { id: 'adjustResonance', label: 'Adjust Resonance' },
        setWave: { id: 'setWave', label: 'Set Wave' },
        setFlag: { id: 'setFlag', label: 'Set Flag' },
        clearFlag: { id: 'clearFlag', label: 'Clear Flag' },
        adjustCounter: { id: 'adjustCounter', label: 'Adjust Counter' },
        adjustCoinCount: { id: 'adjustCoinCount', label: 'Adjust Coin Count' },
        forceCoinOutcome: { id: 'forceCoinOutcome', label: 'Force Coin Outcome' },
        grantCoinReroll: { id: 'grantCoinReroll', label: 'Grant Coin Reroll' },
        reuseCoins: { id: 'reuseCoins', label: 'Reuse Coins' },
        breakCoins: { id: 'breakCoins', label: 'Break Coins' },
        setPanicState: { id: 'setPanicState', label: 'Set Panic State' },
        clearPanicState: { id: 'clearPanicState', label: 'Clear Panic State' },
        adjustPanicValue: { id: 'adjustPanicValue', label: 'Adjust Panic Value' },
        setDamageCap: { id: 'setDamageCap', label: 'Set Damage Cap' },
        chooseRandomActions: { id: 'chooseRandomActions', label: 'Choose Random Actions' },
        chooseWeightedActions: { id: 'chooseWeightedActions', label: 'Choose Weighted Actions' },
        abortEffects: { id: 'abortEffects', label: 'Abort Effects' },
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
        case 'dealHpPercentDamage':
            return `Deal ${effect.value ?? effect.amount ?? 0} max HP damage to ${effect.target || 'opponent'}.`;
        case 'adjustSanity':
            if (typeof effect.amount === 'number') {
                return `Adjust ${effect.target || 'opponent'} SP by ${formatSignedNumber(effect.amount)}.`;
            }
            if (effect.amount?.statusPotency?.statusId) {
                return `Adjust ${effect.target || 'opponent'} SP by ${getStatusLabel(effect.amount.statusPotency.statusId)} potency.`;
            }
            return `Adjust ${effect.target || 'opponent'} SP by ${formatSignedNumber(effect.value || 0)}.`;
        case 'setSanity':
            if (typeof effect.amount === 'number') {
                return `Set ${effect.target || 'opponent'} SP to ${effect.amount}.`;
            }
            if (typeof effect.value === 'number') {
                return `Set ${effect.target || 'opponent'} SP to ${effect.value}.`;
            }
            return `Set ${effect.target || 'opponent'} SP.`;
        case 'healHp':
            return `Heal ${effect.target || 'opponent'} for ${effect.value || 0} HP.`;
        case 'reviveUnit':
            return `Revive ${effect.target || 'opponent'}.`;
        case 'recoverStagger':
            return `Recover ${effect.target || 'opponent'} from Stagger.`;
        case 'staggerUnit':
            return `Stagger ${effect.target || 'opponent'}.`;
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
        case 'gainShield':
            return `${effect.operation === 'set' ? 'Set' : 'Gain'} ${effect.target || 'opponent'} ${effect.shieldId || 'shield'} for ${effect.value || 0}.`;
        case 'clearShield':
            return `Clear ${effect.shieldId || 'shield'} from ${effect.target || 'opponent'}.`;
        case 'retargetSlot':
            return `Retarget ${effect.target || 'opponent'} to ${retargetSelectorLabels[effect.selector] || effect.selector}.`;
        case 'redirectDamage':
            return `Redirect damage to ${retargetSelectorLabels[effect.selector] || effect.selector}.`;
        case 'burstTremor':
            return `Burst Tremor on ${effect.target || 'opponent'}.`;
        case 'consumeStatus':
            return `Consume ${getStatusLabel(effect.statusId)} from ${effect.target || 'opponent'}.`;
        case 'clearStatus':
            return `Clear ${getStatusLabel(effect.statusId)} from ${effect.target || 'opponent'}.`;
        case 'clearStatusesByTag':
            return `Clear statuses with tags [${(effect.tags || []).join(', ')}] from ${effect.target || 'opponent'}.`;
        case 'consumeStatusesByTag':
            return `Consume statuses with tags [${(effect.tags || []).join(', ')}] from ${effect.target || 'opponent'}.`;
        case 'copyStatus':
            return `Copy ${getStatusLabel(effect.statusId)} from ${effect.sourceTarget || 'self'} to ${effect.target || 'opponent'}.`;
        case 'transferStatus':
            return `Transfer ${getStatusLabel(effect.statusId)} from ${effect.sourceTarget || 'self'} to ${effect.target || 'opponent'}.`;
        case 'convertStatus':
            return `Convert ${getStatusLabel(effect.fromStatusId)} into ${getStatusLabel(effect.toStatusId)} on ${effect.target || 'opponent'}.`;
        case 'multiplyStatus':
            return `Multiply ${getStatusLabel(effect.statusId)} on ${effect.target || 'opponent'}.`;
        case 'splitStatus':
            return `Split ${getStatusLabel(effect.statusId)} from ${effect.sourceTarget || 'self'} across ${effect.target || 'opponent'}.`;
        case 'adjustEncounterResource':
            if (typeof effect.value === 'number') {
                return `Adjust ${effect.resourceId} by ${formatSignedNumber(effect.value)}.`;
            }
            return `Adjust ${effect.resourceId}.`;
        case 'adjustUnitResource':
            if (typeof effect.value === 'number') {
                return `Adjust ${effect.resourceId} on ${effect.target || 'opponent'} by ${formatSignedNumber(effect.value)}.`;
            }
            return `Adjust ${effect.resourceId} on ${effect.target || 'opponent'}.`;
        case 'spendEncounterResource':
            return `Spend ${effect.resourceId}.`;
        case 'spendUnitResource':
            return `Spend ${effect.resourceId} on ${effect.target || 'opponent'}.`;
        case 'adjustResonance':
            return `Adjust resonance ${effect.sinType}.`;
        case 'setWave':
            return 'Set wave.';
        case 'setFlag':
            return `Set flag "${effect.flagId}" on ${effect.target || 'opponent'}.`;
        case 'clearFlag':
            return `Clear flag "${effect.flagId}" on ${effect.target || 'opponent'}.`;
        case 'adjustCounter':
            return `Adjust counter "${effect.counterId}" on ${effect.target || 'opponent'}.`;
        case 'adjustCoinCount':
            return 'Adjust coin count.';
        case 'forceCoinOutcome':
            return `Force coin ${effect.coinIndex || 'all'} to ${effect.coinOutcome}.`;
        case 'grantCoinReroll':
            return 'Grant coin reroll.';
        case 'reuseCoins':
            return 'Reuse coins after clash.';
        case 'breakCoins':
            return 'Break coins after clash.';
        case 'setPanicState':
            return `Set panic state "${effect.stateId}".`;
        case 'clearPanicState':
            return 'Clear panic state.';
        case 'adjustPanicValue':
            return 'Adjust panic value.';
        case 'setDamageCap':
            return `Set damage cap ${effect.coinIndex ? `for coin ${effect.coinIndex}` : ''}.`;
        case 'chooseRandomActions':
            return 'Choose random actions.';
        case 'chooseWeightedActions':
            return 'Choose weighted actions.';
        case 'abortEffects':
            return 'Abort further effects.';
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

    function describeHookCondition(condition) {
        if (!condition || typeof condition !== 'object') {
            return 'Invalid condition';
        }
        const target = condition.target === 'opponent' ? 'Opponent' : 'Self';
        switch (condition.type) {
        case 'always':
            return 'Always';
        case 'damageAtLeast':
            return `Damage >= ${condition.value ?? 0}`;
        case 'damageSourceIs':
            return `Damage source is ${condition.value || 'skill'}`;
        case 'hasStatus':
            return `${target} has ${getStatusLabel(condition.statusId)}`;
        case 'statusPotencyAtLeast':
            return `${target} ${getStatusLabel(condition.statusId)} Potency >= ${condition.value ?? 0}`;
        case 'statusPotencyAtOrBelow':
            return `${target} ${getStatusLabel(condition.statusId)} Potency <= ${condition.value ?? 0}`;
        case 'statusCountAtLeast':
            return `${target} ${getStatusLabel(condition.statusId)} Count >= ${condition.value ?? 0}`;
        case 'statusCountAtOrBelow':
            return `${target} ${getStatusLabel(condition.statusId)} Count <= ${condition.value ?? 0}`;
        case 'encounterResourceAtLeast':
            return `${condition.resourceId} >= ${condition.value ?? 0}`;
        case 'encounterResourceAtOrBelow':
            return `${condition.resourceId} <= ${condition.value ?? 0}`;
        case 'unitResourceAtLeast':
            return `${target} ${condition.resourceId} >= ${condition.value ?? 0}`;
        case 'unitResourceAtOrBelow':
            return `${target} ${condition.resourceId} <= ${condition.value ?? 0}`;
        case 'hasFlag':
            return `${target} flag "${condition.flagId}" is ${condition.value ?? true}`;
        case 'counterAtLeast':
            return `${target} counter "${condition.counterId}" >= ${condition.value ?? 0}`;
        case 'counterAtOrBelow':
            return `${target} counter "${condition.counterId}" <= ${condition.value ?? 0}`;
        case 'randomChance':
            return `Chance ${condition.value}`;
        case 'skillIdIs':
            return `Skill id is ${condition.value}`;
        case 'skillHasTag':
            return `Skill has tag ${condition.value}`;
        case 'skillType':
            return `Skill type is ${condition.value}`;
        case 'skillSinType':
            return `Skill sin is ${condition.value}`;
        case 'skillDamageType':
            return `Skill damage type is ${condition.value}`;
        case 'skillCoinPowerSign':
            return `Skill coin sign is ${condition.value}`;
        case 'coinIndex':
            return `Coin index is ${condition.value}`;
        case 'criticalHit':
            return `Critical hit is ${condition.value ?? true}`;
        case 'targetStaggered':
            return `Target staggered is ${condition.value ?? true}`;
        case 'speedAtLeast':
            return `${target} Speed >= ${condition.value ?? 0}`;
        case 'speedAtOrBelow':
            return `${target} Speed <= ${condition.value ?? 0}`;
        case 'speedGreaterThan':
            return `Speed comparison`;
        case 'hpAtOrBelow':
            return `${target} HP <= ${condition.value ?? 0}`;
        case 'hpAtOrAbove':
            return `${target} HP >= ${condition.value ?? 0}`;
        case 'hpPercentAtOrBelow':
            return `${target} HP% <= ${condition.value ?? 0}`;
        case 'hpPercentAtOrAbove':
            return `${target} HP% >= ${condition.value ?? 0}`;
        case 'spAtOrBelow':
            return `${target} SP <= ${condition.value ?? 0}`;
        case 'spAtOrAbove':
            return `${target} SP >= ${condition.value ?? 0}`;
        case 'eventStatusIdIs':
            return `Event status is ${getStatusLabel(condition.value)}`;
        case 'unitSideIs':
            return `${target} side is ${condition.value}`;
        case 'lastEventTypeIs':
            return `Last event is ${condition.value}`;
        case 'panicStateIs':
            return `Panic state is ${condition.value}`;
        case 'panicValueAtLeast':
            return `Panic value is at least ${condition.value}`;
        case 'panicValueAtOrBelow':
            return `Panic value is at most ${condition.value}`;
        case 'waveAtLeast':
            return `Wave >= ${condition.value}`;
        case 'waveAtOrBelow':
            return `Wave <= ${condition.value}`;
        case 'resonanceAtLeast':
            return `Resonance ${condition.sinType} >= ${condition.value}`;
        case 'resonanceAtOrBelow':
            return `Resonance ${condition.sinType} <= ${condition.value}`;
        default:
            return condition.type;
        }
    }

    function describeHookBlock(hookName, block) {
        if (!block || typeof block !== 'object') {
            return `${getTriggerLabel(hookName)}: Invalid hook block.`;
        }
        const conditionText = Array.isArray(block.conditions) && block.conditions.length
            ? `IF ${block.conditions.map((condition) => describeHookCondition(condition)).join(' & ')} `
            : '';
        const actionText = Array.isArray(block.actions) && block.actions.length
            ? `DO ${block.actions.map((effect) => getEffectBodyDescription(effect)).join(' ')}`
            : 'DO nothing';
        const limitText = block.oncePer ? ` (Once per ${block.oncePer})` : '';
        return `${getTriggerLabel(hookName)}: ${conditionText}${actionText}${limitText}`.trim();
    }

    function describeHookDefinition(hooks) {
        if (!hooks || typeof hooks !== 'object' || Array.isArray(hooks)) {
            return [];
        }
        const lines = [];
        Object.entries(hooks).forEach(([hookName, hookDefinition]) => {
            const blocks = normalizeHookBlocks(hookDefinition);
            if (blocks) {
                blocks.forEach((block) => {
                    lines.push(describeHookBlock(hookName, block));
                });
                return;
            }
            if (Array.isArray(hookDefinition)) {
                hookDefinition.forEach((effect) => {
                    lines.push(describeEffect(effect, { hookName }));
                });
            }
        });
        return lines;
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
        describeHookBlock,
        describeHookDefinition,
    };

    battleModules.registry = registry;

    Object.assign(battleModules, registry);

    window.EchoesOfTheCityBattle = {
        ...window.EchoesOfTheCityBattle,
        battleRegistry: registry,
    };
})();
