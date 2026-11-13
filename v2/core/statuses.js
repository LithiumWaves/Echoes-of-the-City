// Status instances on units. Definitions (hooks, stack model) live in content;
// this file only manages numbers so it can be shared by the engine and UI.
//
// Stack models:
//   potencyCount - Burn/Bleed/Tremor/Rupture/Sinking/Poise... removed when either hits 0.
//                  Gaining only Potency on a fresh status gives 1 Count and vice versa (as in game).
//   count        - a single "stack" number (Haste, Fragile, Charge...). Stored in `count`.

export function getStatus(unit, id) {
    return unit.statuses.get(id) || null;
}

export function getPotency(unit, id) {
    const s = unit.statuses.get(id);
    if (!s) return 0;
    return s.model === 'count' ? s.count : s.potency;
}

export function getCount(unit, id) {
    return unit.statuses.get(id)?.count ?? 0;
}

function clamp(n, max) {
    return Math.max(0, Math.min(max, Math.floor(n)));
}

/** Returns {before, after} snapshots or null when nothing changed. */
export function changeStatus(unit, def, { potency = 0, count = 0 } = {}, cap = 99) {
    const id = def.id;
    const model = def.stack || 'potencyCount';
    const existing = unit.statuses.get(id);
    const before = existing ? { potency: existing.potency, count: existing.count } : { potency: 0, count: 0 };
    let next;
    if (model === 'count') {
        const amount = count || potency; // one number: "stack"
        next = { potency: 0, count: clamp(before.count + amount, def.max ?? cap) };
    } else {
        let p = before.potency + potency;
        let c = before.count + count;
        if (!existing) {
            if (potency > 0 && count === 0) c = 1;
            if (count > 0 && potency === 0) p = 1;
        }
        next = { potency: clamp(p, def.maxPotency ?? cap), count: clamp(c, def.maxCount ?? cap) };
    }
    const dead = model === 'count' ? next.count <= 0 : next.count <= 0 || next.potency <= 0;
    if (dead) {
        if (!existing) return null;
        unit.statuses.delete(id);
        return { id, before, after: { potency: 0, count: 0 }, removed: true };
    }
    if (existing) {
        existing.potency = next.potency;
        existing.count = next.count;
    } else {
        unit.statuses.set(id, { id, model, potency: next.potency, count: next.count, def });
    }
    if (before.potency === next.potency && before.count === next.count) return null;
    return { id, before, after: next, removed: false };
}

export function removeStatus(unit, id) {
    const s = unit.statuses.get(id);
    if (!s) return null;
    unit.statuses.delete(id);
    return { id, before: { potency: s.potency, count: s.count }, after: { potency: 0, count: 0 }, removed: true };
}
