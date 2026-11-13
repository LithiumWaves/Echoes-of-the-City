// Seeded, serialisable PRNG (mulberry32). Every random roll in a battle goes
// through one of these so a battle can be replayed from its seed.
export function createRng(seed = Date.now()) {
    let state = (Number(seed) >>> 0) || 1;
    const next = () => {
        state = (state + 0x6D2B79F5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
        next,
        /** Inclusive integer range. */
        int(min, max) {
            return min + Math.floor(next() * (max - min + 1));
        },
        chance(probability) {
            return next() < probability;
        },
        pick(list) {
            return list.length ? list[Math.floor(next() * list.length)] : undefined;
        },
        get state() { return state; },
        set state(value) { state = value >>> 0; },
    };
}
