export const SINS = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
export const DAMAGE_TYPES = ['slash', 'pierce', 'blunt'];
export const SKILL_KINDS = ['attack', 'guard', 'evade', 'counter'];

export const SIDES = { ALLY: 'ally', ENEMY: 'enemy' };

/** Display names for resistance multipliers, as shown in game. */
export function resistanceLabel(mult) {
    if (mult >= 2) return 'Fatal';
    if (mult > 1) return 'Weak';
    if (mult === 1) return 'Normal';
    if (mult >= 0.75) return 'Endured';
    if (mult > 0) return 'Ineff.';
    return 'Immune';
}

/**
 * Tunable rule numbers. Values marked "wiki" come from limbuscompany.wiki.gg
 * (Battles / Damage Formula / Sin Resonance / Sanity pages); the rest are
 * best-known approximations and can be overridden per battle.
 */
export const DEFAULT_RULES = Object.freeze({
    sanityMin: -45, // wiki
    sanityMax: 45, // wiki
    panicAt: -45, // wiki
    clashWinSanity: 10,
    clashWinSanityPerClash: 0, // extra SP per clash in the exchange beyond the first
    clashLoseSanity: -5,
    killSanity: 10,
    allyDeathSanity: -10,
    maxClashCount: 99, // wiki
    clashCountDamageBonus: 0.03, // wiki
    critDamageBonus: 0.2, // wiki: Poise crits deal 1.2x
    minimumDamageRatio: 0.05, // wiki
    levelDiffPerClashPower: 3, // wiki: +1 clash power per 3 level difference
    maxStatusValue: 99, // wiki
    deckCopies: [3, 2, 1], // copies of Skill 1/2/3 in a unit's deck
    choicesPerSlot: 2, // skills offered per Skill Slot
    turnLimit: 99,
    // wiki: Resonance / Absolute Resonance Offense & Defense Level bonus, index = chain size
    resonanceBonus: [0, 0, 1, 3, 3, 5, 5, 7, 7, 9, 9, 11, 11],
    absoluteResonanceBonus: [0, 0, 0, 3, 5, 5, 7, 7, 9, 9, 11, 11, 13],
    staggerResistance: [1, 2, 2.5, 3], // wiki: by stagger level (none, Stagger, +, ++)
    egoResourcePerSkill: 1, // wiki
});
