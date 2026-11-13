// Enemy skill / target selection, plus the "auto plan" used for the
// player's Win Rate / Damage buttons.

function aliveSlots(battle, side) {
    return battle.slots.filter((s) => s.side === side && s.unit.alive);
}

/**
 * Enemy units have no deck. If the unit definition has `ai.pattern`
 * (an array of turns, each an array of skill ids per slot), it is followed
 * in a loop; otherwise each slot picks a random attack skill, weighted
 * toward lower-rank skills like the player's deck.
 */
export function planEnemySlots(battle) {
    const allySlots = aliveSlots(battle, 'ally');
    for (const slot of aliveSlots(battle, 'enemy')) {
        if (slot.disabled) continue;
        const unit = slot.unit;
        const pattern = unit.def.ai?.pattern;
        let skill = null;
        if (pattern?.length) {
            const turnPattern = pattern[(battle.turn - 1) % pattern.length] || [];
            const id = turnPattern[slot.unitSlotIndex % Math.max(1, turnPattern.length)];
            skill = unit.skills.find((s) => s.id === id || s.name === id) || null;
        }
        if (!skill) {
            const weighted = [];
            unit.attackSkills.forEach((s) => {
                const copies = s.copies ?? battle.rules.deckCopies[s.rank - 1] ?? 1;
                for (let i = 0; i < copies; i += 1) weighted.push(s);
            });
            skill = battle.rng.pick(weighted.length ? weighted : unit.skills);
        }
        slot.skill = skill || null;
        const targetable = allySlots.filter((s) => s.unit.alive);
        slot.target = targetable.length ? battle.rng.pick(targetable).id : null;
    }
}

/** Fill every empty ally slot with its first choice and a sensible target. */
export function autoPlanAllies(battle, { mode = 'winrate' } = {}) {
    const enemySlots = aliveSlots(battle, 'enemy');
    const engaged = new Set(battle.slots.filter((s) => s.side === 'ally' && s.target).map((s) => s.target));
    const mine = aliveSlots(battle, 'ally').filter((s) => !s.disabled).sort((a, b) => b.speed - a.speed);
    for (const slot of mine) {
        if (!slot.skill && slot.choices.length) slot.skill = slot.choices[0];
        if (slot.target || !slot.skill || slot.skill.kind !== 'attack') continue;
        const myUnitSlots = new Set(battle.slots.filter((s) => s.unit === slot.unit).map((s) => s.id));
        const free = enemySlots.filter((e) => !engaged.has(e.id));
        let pick = null;
        if (mode === 'winrate') {
            // Defend: clash whatever is coming at this unit first, then intercept anything we outspeed.
            pick = free.find((e) => myUnitSlots.has(e.target))
                || free.filter((e) => slot.speed > e.speed && e.skill?.kind === 'attack').sort((a, b) => b.speed - a.speed)[0];
        }
        pick = pick || free[0] || enemySlots[0];
        if (pick) {
            slot.target = pick.id;
            engaged.add(pick.id);
        }
    }
}
