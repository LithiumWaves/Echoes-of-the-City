// Hook dispatch + action interpreter. Built-in content and user content go
// through exactly this code, so anything the base game pack can do, a
// custom pack can do.
//
// A hook is one of:
//   { on: '<trigger>', if?: cond, do: [action...], oncePer?: 'turn'|'battle' }
//   { modify: '<stat>', value: expr, if?: cond }
//
// Triggers are always from the hook owner's point of view (ctx.self):
//   battleStart turnStart combatStart turnEnd
//   use clashStart clashWin clashLose coinFlip coinToss hit headsHit tailsHit crit kill attackEnd
//   hitTaken damaged staggered defeated allyDefeated enemyDefeated evade
//
// Modifiable stats (summed): basePower coinPower clashPower finalPower
//   offenseLevel defenseLevel speed critChance (percent) damagePct takenDamagePct
//   headsChance (percent points) plusCoinPower minusCoinPower

import { evalValue, evalCondition, selectUnits } from './expr.js';

export const TRIGGERS = [
    'battleStart', 'turnStart', 'combatStart', 'turnEnd',
    'use', 'clashStart', 'clashWin', 'clashLose', 'coinFlip', 'coinToss', 'hit', 'headsHit', 'tailsHit', 'crit', 'kill', 'attackEnd',
    'hitTaken', 'damaged', 'staggered', 'defeated', 'allyDefeated', 'enemyDefeated', 'evade',
];

export const MODIFIABLE_STATS = [
    'basePower', 'coinPower', 'clashPower', 'finalPower', 'offenseLevel', 'defenseLevel', 'speed',
    'critChance', 'damagePct', 'takenDamagePct', 'headsChance', 'plusCoinPower', 'minusCoinPower',
];

/** Collect hook sources that belong to a unit regardless of what it's doing. */
function unitHookSources(unit) {
    const sources = [];
    for (const passive of unit.passives) {
        if (passive.hooks?.length) sources.push({ key: `passive:${passive.id}`, hooks: passive.hooks });
    }
    for (const status of unit.statuses.values()) {
        if (status.def.hooks?.length) sources.push({ key: `status:${status.id}`, hooks: status.def.hooks, statusId: status.id });
    }
    return sources;
}

function skillHookSources(skill, coin) {
    const sources = [];
    if (skill?.hooks?.length) sources.push({ key: `skill:${skill.id}`, hooks: skill.hooks });
    if (coin?.hooks?.length) sources.push({ key: `coin:${skill.id}:${coin.index}`, hooks: coin.hooks });
    return sources;
}

function hookAllowed(battle, owner, sourceKey, index, hook) {
    if (!hook.oncePer) return true;
    const scope = hook.oncePer === 'turn' ? battle.turn : 'battle';
    const key = `${owner.uid}|${sourceKey}|${index}|${scope}`;
    if (battle.hookUsage.has(key)) return false;
    battle.hookUsage.add(key);
    return true;
}

function runSources(battle, owner, sources, trigger, ctx) {
    for (const source of sources) {
        source.hooks.forEach((hook, index) => {
            if (hook.on !== trigger) return;
            if (!owner.alive && trigger !== 'defeated') return;
            const hookCtx = { ...ctx, battle, self: owner, statusId: source.statusId ?? ctx.statusId, vars: ctx.vars || {} };
            if (!evalCondition(hook.if, hookCtx)) return;
            if (!hookAllowed(battle, owner, source.key, index, hook)) return;
            runActions(hook.do || [], hookCtx);
        });
    }
}

/**
 * Fire a trigger for `owner`. If `skill` (and optionally `coin`) is passed,
 * that skill's own hooks fire first, then passives and statuses.
 */
export function fire(battle, owner, trigger, ctx = {}, { skill = null, coin = null } = {}) {
    if (!owner) return;
    const base = { ...ctx, skill: skill ?? ctx.skill, coin: coin ?? ctx.coin, vars: ctx.vars || {} };
    if (skill) runSources(battle, owner, skillHookSources(skill, coin), trigger, base);
    runSources(battle, owner, unitHookSources(owner), trigger, base);
}

/** Sum all `modify` hooks for a stat on a unit (plus its active skill/coin). */
export function modifier(battle, owner, stat, ctx = {}, { skill = null, coin = null } = {}) {
    if (!owner) return 0;
    let total = 0;
    const sources = [...skillHookSources(skill, coin), ...unitHookSources(owner)];
    for (const source of sources) {
        for (const hook of source.hooks) {
            if (hook.modify !== stat) continue;
            const hookCtx = { ...ctx, battle, self: owner, skill: skill ?? ctx.skill, coin: coin ?? ctx.coin, statusId: source.statusId, vars: ctx.vars || {} };
            if (!evalCondition(hook.if, hookCtx)) continue;
            total += evalValue(hook.value, hookCtx);
        }
    }
    return total;
}

const ACTIONS = {
    apply(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'target')) {
            ctx.battle.ops.addStatus(unit, a.apply, {
                potency: evalValue(a.potency ?? 0, ctx),
                count: evalValue(a.count ?? a.stack ?? 0, ctx),
            }, { nextTurn: Boolean(a.nextTurn), source: ctx.self });
        }
    },
    reduce(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'self')) {
            ctx.battle.ops.addStatus(unit, a.reduce === true ? ctx.statusId : a.reduce, {
                potency: -evalValue(a.potency ?? 0, ctx),
                count: -evalValue(a.count ?? a.stack ?? 0, ctx),
            }, { source: ctx.self });
        }
    },
    remove(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'self')) ctx.battle.ops.removeStatus(unit, a.remove === true ? ctx.statusId : a.remove);
    },
    consume(a, ctx) {
        // Consume up to N count; the amount actually consumed goes into vars[as || 'consumed'].
        const [unit] = selectUnits(ctx, a.to || 'self');
        const id = a.consume === true ? ctx.statusId : a.consume;
        const have = unit ? (unit.statuses.get(id)?.count ?? 0) : 0;
        const want = evalValue(a.count ?? a.amount ?? 1, ctx);
        const used = Math.min(have, want);
        if (unit && used > 0) ctx.battle.ops.addStatus(unit, id, { count: -used }, { source: ctx.self });
        ctx.vars[a.as || 'consumed'] = used;
    },
    damage(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'target')) {
            ctx.battle.ops.dealFixedDamage(unit, evalValue(a.damage, ctx), { kind: a.kind || ctx.statusId || 'fixed', source: ctx.self });
        }
    },
    heal(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'self')) ctx.battle.ops.heal(unit, evalValue(a.heal, ctx));
    },
    sanity(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'self')) ctx.battle.ops.changeSanity(unit, evalValue(a.sanity, ctx), a.reason || 'effect');
    },
    shield(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'self')) ctx.battle.ops.addShield(unit, evalValue(a.shield, ctx));
    },
    tremorBurst(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'target')) ctx.battle.ops.tremorBurst(unit, ctx.self);
    },
    raiseStagger(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'target')) ctx.battle.ops.raiseStaggerThreshold(unit, evalValue(a.raiseStagger, ctx));
    },
    stagger(a, ctx) {
        for (const unit of selectUnits(ctx, a.to || 'target')) ctx.battle.ops.stagger(unit, 'effect');
    },
    resource(a, ctx) {
        ctx.battle.ops.addResource(ctx.self.side, a.resource, evalValue(a.amount ?? 1, ctx));
    },
    nullifyCoin(a, ctx) {
        if (ctx.coinRoll) ctx.coinRoll.nullified = true;
    },
    setVar(a, ctx) {
        ctx.vars[a.setVar] = evalValue(a.value, ctx);
    },
    if(a, ctx) {
        runActions(evalCondition(a.if, ctx) ? a.then || [] : a.else || [], ctx);
    },
    repeat(a, ctx) {
        const n = Math.min(99, evalValue(a.repeat, ctx));
        for (let i = 0; i < n; i += 1) runActions(a.do || [], ctx);
    },
    log(a, ctx) {
        ctx.battle.emit({ type: 'log', text: a.log, unit: ctx.self?.uid });
    },
};

export const ACTION_NAMES = Object.keys(ACTIONS);

export function actionName(action) {
    return ACTION_NAMES.find((name) => name !== 'if' && name in action) || ('if' in action ? 'if' : undefined);
}

export function runActions(actions, ctx) {
    for (const action of actions) {
        const name = actionName(action);
        if (!name) throw new Error(`Unknown action: ${JSON.stringify(action)}`);
        // Any action may carry its own `if` guard: {apply:'burn', potency:2, if:{heads:true}}
        if (name !== 'if' && 'if' in action && !evalCondition(action.if, ctx)) continue;
        ACTIONS[name](action, ctx);
    }
}
