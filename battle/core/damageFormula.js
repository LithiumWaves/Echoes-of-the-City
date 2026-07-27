(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

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

        function calculateDamage(context) {
            const defender = context?.defender || null;
            const skill = context?.skill || null;
            const attackModifiers = context?.modifiers?.attack || {};
            const defenseModifiers = context?.modifiers?.defense || {};
            const resistance = {
                physical: getPhysicalResistanceMultiplier(defender, context?.damageType || skill?.damageType, isUnitStaggered),
                sin: getSinResistanceMultiplier(defender, context?.sinType || skill?.sinType),
            };
            const levelDifference = (context?.offenseLevel || 0) - (context?.defenseLevel || 0);
            const levelModifier = 1 + (levelDifference / (Math.abs(levelDifference) + 25));
            const protection = typeof getStatusCount === 'function'
                ? getStatusCount(defender, 'protection')
                : 0;
            const protectionModifier = protection > 0
                ? Math.max(0, 1 - (Math.min(protection, 10) * 0.1))
                : 1;
            const critDamageMultiplier = context?.isCritical
                ? 1.2 * (1 + (attackModifiers.extraCritDamage || 0))
                : 1;
            const damageMultiplier = attackModifiers.damageMultiplier || 1;
            const additiveDamage = attackModifiers.additiveDamage || 0;
            const incomingReduction = defenseModifiers.damageReductionMultiplier ?? 1;
            const rawDamage = Math.max(
                1,
                Math.round(
                    (
                        (context?.finalPower || 0)
                        * resistance.physical
                        * resistance.sin
                        * levelModifier
                        * protectionModifier
                        * damageMultiplier
                        * critDamageMultiplier
                        * incomingReduction
                    )
                    + additiveDamage,
                ),
            );

            return {
                damage: rawDamage,
                breakdown: {
                    basePower: context?.finalPower || 0,
                    resistance,
                    levelDifference,
                    levelModifier,
                    protection,
                    protectionModifier,
                    damageMultiplier,
                    additiveDamage,
                    critDamageMultiplier,
                    incomingReduction,
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
