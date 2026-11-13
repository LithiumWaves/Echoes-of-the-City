// Damage formula, per limbuscompany.wiki.gg/wiki/Damage_Formula:
//   Final = CoinRoll * (1 + Static) * (1 + Dynamic), floored, min 1,
//   and never below 5% of the coin roll.
//   Static  = sinRes + typeRes + levelAdvantage + crit + clashCount*0.03
//   Dynamic = statuses / passives / skill damage bonuses (percent / 100)

export function resistanceModifier(mult) {
    if (mult <= 0) return -0.5;
    if (mult < 1) return (mult - 1) / 2;
    return mult - 1;
}

export function levelAdvantage(offense, defense) {
    const diff = offense - defense;
    return diff / (Math.abs(diff) + 25);
}

/** Physical resistance while staggered: wiki "Stagger bonuses do not stack with weaknesses". */
export function effectiveTypeResistance(baseMult, staggerLevel, rules) {
    if (!staggerLevel) return baseMult;
    return Math.max(baseMult, rules.staggerResistance[Math.min(staggerLevel, 3)]);
}

export function computeDamage({
    coinRoll, sinResist = 1, typeResist = 1, offenseLevel = 0, defenseLevel = 0,
    isCrit = false, clashCount = 0, dynamicPct = 0, rules,
}) {
    const roll = Math.max(0, coinRoll);
    const parts = {
        sin: resistanceModifier(sinResist),
        type: resistanceModifier(typeResist),
        level: levelAdvantage(offenseLevel, defenseLevel),
        crit: isCrit ? rules.critDamageBonus : 0,
        clash: Math.min(clashCount, rules.maxClashCount - 1) * rules.clashCountDamageBonus,
    };
    const staticMod = parts.sin + parts.type + parts.level + parts.crit + parts.clash;
    const dynamicMod = dynamicPct / 100;
    let damage = roll * (1 + staticMod) * (1 + dynamicMod);
    damage = Math.max(damage, roll * rules.minimumDamageRatio);
    const final = roll > 0 ? Math.max(1, Math.floor(damage)) : 0;
    return { damage: final, staticMod, dynamicMod, parts };
}
