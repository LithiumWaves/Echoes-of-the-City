(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const CRITICAL_DAMAGE_BONUS = 0.2;

    function getPhysicalResistanceMultiplier(unit, damageType, isUnitStaggered) {
        const dynamic = unit?.turnState?.physicalResistanceOverrides?.[damageType]
            ?? unit?.turnState?.resistanceOverrides?.[damageType];
        const baseResistance = typeof dynamic === 'number'
            ? dynamic
            : (unit?.resistances?.physical?.[damageType] || 1);
        return typeof isUnitStaggered === 'function' && isUnitStaggered(unit)
            ? Math.max(2, baseResistance)
            : baseResistance;
    }

    function getSinResistanceMultiplier(unit, sinType) {
        if (!sinType) {
            return 1;
        }

        return unit?.turnState?.sinResistanceOverrides?.[sinType]
            || unit?.resistances?.sin?.[sinType]
            || 1;
    }

    function createDamageFormula(deps) {
        const {
            getStatusCount = null,
            isUnitStaggered = null,
        } = deps || {};

        function getLevelModifier(levelDifference) {
            return 1 + (levelDifference / (Math.abs(levelDifference) + 25));
        }

        function getProtectionModifier(protection) {
            return protection > 0
                ? Math.max(0, 1 - (Math.min(protection, 10) * 0.1))
                : 1;
        }

        function getCriticalContribution(context, attackModifiers) {
            if (!context?.isCritical) {
                return 0;
            }

            return CRITICAL_DAMAGE_BONUS + ((attackModifiers.criticalBonus || 0) * (1 + CRITICAL_DAMAGE_BONUS));
        }

        function calculateDamage(context) {
            const defender = context?.defender || null;
            const skill = context?.skill || null;
            const attackModifiers = context?.modifiers?.attack || {};
            const defenseModifiers = context?.modifiers?.defense || {};
            const basePower = context?.finalPower || 0;
            const resistance = {
                physical: getPhysicalResistanceMultiplier(defender, context?.damageType || skill?.damageType, isUnitStaggered),
                sin: getSinResistanceMultiplier(defender, context?.sinType || skill?.sinType),
            };
            const levelDifference = (context?.offenseLevel || 0) - (context?.defenseLevel || 0);
            const levelModifier = getLevelModifier(levelDifference);
            const protection = typeof getStatusCount === 'function'
                ? getStatusCount(defender, 'protection')
                : 0;
            const protectionModifier = getProtectionModifier(protection);
            const damageMultiplier = attackModifiers.damageMultiplier ?? 1;
            const weakResistanceBonus = attackModifiers.weakResistanceDamageBonus ?? 0;
            const additiveDamage = attackModifiers.additiveDamage || 0;
            const incomingReduction = defenseModifiers.damageReductionMultiplier ?? 1;
            const flatReduction = defenseModifiers.damageReductionFlat ?? 0;
            const staticContributions = {
                physicalResistance: resistance.physical - 1,
                sinResistance: resistance.sin - 1,
                offenseDefenseAdvantage: levelModifier - 1,
                critical: getCriticalContribution(context, attackModifiers),
                clashRoundBonus: attackModifiers.clashRoundBonus || 0,
                observationBonus: attackModifiers.observationBonus || 0,
                attackBonus: attackModifiers.staticDamageBonus || 0,
                defenseBonus: defenseModifiers.staticDamageBonus || 0,
            };
            const dynamicContributions = {
                protection: protectionModifier - 1,
                damageMultiplier: damageMultiplier - 1,
                weakResistanceBonus: ((resistance.physical > 1 || resistance.sin > 1) ? (1 + weakResistanceBonus) : 1) - 1,
                incomingReduction: incomingReduction - 1,
                attackBonus: attackModifiers.dynamicDamageBonus || 0,
                defenseBonus: defenseModifiers.dynamicDamageBonus || 0,
            };
            const staticMultiplier = Object.values(staticContributions).reduce((sum, value) => sum + value, 0);
            const dynamicMultiplier = Object.values(dynamicContributions).reduce((sum, value) => sum + value, 0);
            const staticFactor = Math.max(1 + staticMultiplier, 0);
            const dynamicFactor = Math.max(1 + dynamicMultiplier, 0);
            const scaledDamage = basePower * staticFactor * dynamicFactor;
            const preFloorDamage = scaledDamage + additiveDamage;
            const minimumDamageFloor = Math.max(1, Math.floor(basePower * 0.05));
            const rawDamage = Math.max(
                1,
                Math.floor(Math.max(preFloorDamage, minimumDamageFloor)),
            );
            const reducedDamage = Math.max(0, rawDamage - Math.round(flatReduction));
            const finalDamage = Math.max(
                1,
                reducedDamage,
            );

            return {
                damage: finalDamage,
                breakdown: {
                    basePower,
                    resistance,
                    levelDifference,
                    levelModifier,
                    protection,
                    protectionModifier,
                    damageMultiplier,
                    weakResistanceBonus,
                    incomingReduction,
                    flatReduction,
                    staticContributions,
                    dynamicContributions,
                    staticMultiplier,
                    dynamicMultiplier,
                    staticFactor,
                    dynamicFactor,
                    scaledDamage,
                    additiveDamage,
                    preFloorDamage,
                    minimumDamageFloor,
                    rawDamage,
                    reducedDamage,
                },
            };
        }

        return {
            calculateDamage,
            getPhysicalResistanceMultiplier(unit, damageType) {
                return getPhysicalResistanceMultiplier(unit, damageType, isUnitStaggered);
            },
            getSinResistanceMultiplier,
        };
    }

    battleModules.createDamageFormula = createDamageFormula;
})();
