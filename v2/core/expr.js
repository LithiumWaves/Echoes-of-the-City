// Tiny data-only expression language used by every effect in the game
// (built-in or user-authored). No JavaScript is ever executed from content.
//
// Values:  3 | {potency:'bleed', of:'target'} | {count:'poise'} | {stat:'hpPercent', of:'self'}
//          {ctx:'heads'} | {var:'x'} | {add:[..]} {sub:[a,b]} {mul:[..]} {div:[a,b]} {min:[..]} {max:[..]}
//          {floor:v} {ceil:v} {neg:v} {resource:'wrath'} {countUnits:'enemies', where:cond}
// Conditions: true | {all:[..]} {any:[..]} {not:c} {gte:[a,b]} {gt} {lte} {lt} {eq} {neq}
//          {has:'bleed', of:'target', min?:n} {heads:true} {crit:true} {chance:50}
//          {staggered:'target'} {skillKind:'attack'} {sin:'wrath'} {damageType:'slash'}
//          {isClash:true} {resonance:{sin:'wrath', min:3}}

import { getPotency, getCount } from './statuses.js';

export function unitFrom(ctx, who = 'self') {
    if (who === 'self') return ctx.self;
    if (who === 'target') return ctx.target;
    if (who === 'attacker') return ctx.attacker;
    if (who === 'defender') return ctx.defender;
    return null;
}

const STAT_READERS = {
    hp: (u) => u.hp,
    maxHp: (u) => u.maxHp,
    hpPercent: (u) => (u.maxHp ? (u.hp / u.maxHp) * 100 : 0),
    missingHp: (u) => u.maxHp - u.hp,
    missingHpPercent: (u) => (u.maxHp ? ((u.maxHp - u.hp) / u.maxHp) * 100 : 0),
    sp: (u) => u.sp,
    speed: (u) => u.currentSpeed ?? 0,
    level: (u) => u.level,
    shield: (u) => u.shield,
    staggerLevel: (u) => u.staggerLevel,
    hasSanity: (u) => (u.hasSanity ? 1 : 0),
};

export function evalValue(expr, ctx) {
    if (expr == null) return 0;
    if (typeof expr === 'number') return expr;
    if (typeof expr === 'boolean') return expr ? 1 : 0;
    if (typeof expr !== 'object') return Number(expr) || 0;

    const of = (field) => unitFrom(ctx, expr.of || 'self');
    const list = (key) => expr[key].map((e) => evalValue(e, ctx));

    if ('potency' in expr) {
        const unit = of();
        return unit ? getPotency(unit, expr.potency === true ? ctx.statusId : expr.potency || ctx.statusId) : 0;
    }
    if ('count' in expr) {
        const unit = of();
        return unit ? getCount(unit, expr.count === true ? ctx.statusId : expr.count || ctx.statusId) : 0;
    }
    if ('stat' in expr) {
        const unit = of();
        const read = STAT_READERS[expr.stat];
        return unit && read ? read(unit) : 0;
    }
    if ('ctx' in expr) return Number(ctx.attack?.[expr.ctx] ?? ctx[expr.ctx] ?? 0) || 0;
    if ('var' in expr) return Number(ctx.vars?.[expr.var] ?? 0) || 0;
    if ('add' in expr) return list('add').reduce((a, b) => a + b, 0);
    if ('mul' in expr) return list('mul').reduce((a, b) => a * b, 1);
    if ('sub' in expr) { const [a, b] = list('sub'); return a - b; }
    if ('div' in expr) { const [a, b] = list('div'); return b ? Math.floor(a / b) : 0; }
    if ('min' in expr) return Math.min(...list('min'));
    if ('max' in expr) return Math.max(...list('max'));
    if ('floor' in expr) return Math.floor(evalValue(expr.floor, ctx));
    if ('ceil' in expr) return Math.ceil(evalValue(expr.ceil, ctx));
    if ('neg' in expr) return -evalValue(expr.neg, ctx);
    if ('resource' in expr) {
        const side = unitFrom(ctx, expr.of || 'self')?.side;
        return ctx.battle?.resources?.[side]?.[expr.resource] ?? 0;
    }
    if ('countUnits' in expr) {
        return selectUnits(ctx, expr.countUnits).filter((u) => !expr.where || evalCondition(expr.where, { ...ctx, target: u })).length;
    }
    throw new Error(`Unknown value expression: ${JSON.stringify(expr)}`);
}

export function evalCondition(cond, ctx) {
    if (cond == null || cond === true) return true;
    if (cond === false) return false;
    if (Array.isArray(cond)) return cond.every((c) => evalCondition(c, ctx));

    const pair = (key) => [evalValue(cond[key][0], ctx), evalValue(cond[key][1], ctx)];
    if ('all' in cond) return cond.all.every((c) => evalCondition(c, ctx));
    if ('any' in cond) return cond.any.some((c) => evalCondition(c, ctx));
    if ('not' in cond) return !evalCondition(cond.not, ctx);
    if ('gte' in cond) { const [a, b] = pair('gte'); return a >= b; }
    if ('gt' in cond) { const [a, b] = pair('gt'); return a > b; }
    if ('lte' in cond) { const [a, b] = pair('lte'); return a <= b; }
    if ('lt' in cond) { const [a, b] = pair('lt'); return a < b; }
    if ('eq' in cond) { const [a, b] = pair('eq'); return a === b; }
    if ('neq' in cond) { const [a, b] = pair('neq'); return a !== b; }
    if ('has' in cond) {
        const unit = unitFrom(ctx, cond.of || 'self');
        const min = cond.min ?? 1;
        const field = cond.field || 'any';
        if (!unit) return false;
        const p = getPotency(unit, cond.has);
        const c = getCount(unit, cond.has);
        if (field === 'potency') return p >= min;
        if (field === 'count') return c >= min;
        return Math.max(p, c) >= min;
    }
    if ('heads' in cond) return Boolean(ctx.attack?.isHeads) === Boolean(cond.heads);
    if ('crit' in cond) return Boolean(ctx.attack?.isCrit) === Boolean(cond.crit);
    if ('isClash' in cond) return Boolean(ctx.attack?.inClash) === Boolean(cond.isClash);
    if ('chance' in cond) return ctx.battle.rng.next() * 100 < evalValue(cond.chance, ctx);
    if ('staggered' in cond) return (unitFrom(ctx, cond.staggered)?.staggerLevel ?? 0) > 0;
    if ('skillKind' in cond) return ctx.skill?.kind === cond.skillKind;
    if ('sin' in cond) return ctx.skill?.sin === cond.sin;
    if ('damageType' in cond) return ctx.skill?.damageType === cond.damageType;
    if ('resonance' in cond) {
        const side = ctx.self?.side;
        const res = ctx.battle?.resonance?.[side]?.[cond.resonance.sin];
        const kind = cond.resonance.absolute ? 'absolute' : 'count';
        return (res?.[kind] ?? 0) >= (cond.resonance.min ?? 2);
    }
    throw new Error(`Unknown condition: ${JSON.stringify(cond)}`);
}

/**
 * Unit selectors used by actions and countUnits.
 * self | target | allies (excl. self) | team (incl. self) | enemies | all
 * randomAlly | randomEnemy | lowestHpAlly | lowestHpEnemy | highestHpEnemy
 */
export function selectUnits(ctx, selector = 'target') {
    const { battle, self } = ctx;
    if (selector === 'self') return self ? [self] : [];
    if (selector === 'target') return ctx.target ? [ctx.target] : [];
    if (selector === 'attacker') return ctx.attacker ? [ctx.attacker] : [];
    if (!battle || !self) return [];
    const alive = battle.units.filter((u) => u.alive);
    const team = alive.filter((u) => u.side === self.side);
    const foes = alive.filter((u) => u.side !== self.side);
    const byHp = (a, b) => a.hp / a.maxHp - b.hp / b.maxHp;
    switch (selector) {
        case 'allies': return team.filter((u) => u !== self);
        case 'team': return team;
        case 'enemies': return foes;
        case 'all': return alive;
        case 'randomAlly': { const pool = team.filter((u) => u !== self); return pool.length ? [battle.rng.pick(pool)] : []; }
        case 'randomEnemy': return foes.length ? [battle.rng.pick(foes)] : [];
        case 'lowestHpAlly': return team.length ? [[...team].sort(byHp)[0]] : [];
        case 'lowestHpEnemy': return foes.length ? [[...foes].sort(byHp)[0]] : [];
        case 'highestHpEnemy': return foes.length ? [[...foes].sort(byHp).at(-1)] : [];
        default: throw new Error(`Unknown target selector: ${selector}`);
    }
}
