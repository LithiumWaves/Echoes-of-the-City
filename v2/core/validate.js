// Validates content definitions and returns readable, path-addressed errors.
// The creator UI shows these inline; the engine refuses invalid content.
import { SINS, DAMAGE_TYPES, SKILL_KINDS } from './constants.js';
import { TRIGGERS, MODIFIABLE_STATS, ACTION_NAMES, actionName } from './effects.js';

const SELECTORS = ['self', 'target', 'attacker', 'allies', 'team', 'enemies', 'all', 'randomAlly', 'randomEnemy', 'lowestHpAlly', 'lowestHpEnemy', 'highestHpEnemy'];
const STATUS_ACTIONS = ['apply', 'reduce', 'remove', 'consume'];

function validateActions(actions, path, errors, statusIds) {
    if (!Array.isArray(actions)) { errors.push(`${path}: must be a list of actions`); return; }
    actions.forEach((action, i) => {
        const p = `${path}[${i}]`;
        const name = actionName(action || {});
        if (!name) { errors.push(`${p}: unknown action (expected one of ${ACTION_NAMES.join(', ')})`); return; }
        if (STATUS_ACTIONS.includes(name) && action[name] !== true && statusIds && !statusIds.has(action[name])) {
            errors.push(`${p}.${name}: unknown status "${action[name]}"`);
        }
        if (action.to && !SELECTORS.includes(action.to)) errors.push(`${p}.to: unknown target "${action.to}"`);
        if (name === 'if') {
            validateActions(action.then || [], `${p}.then`, errors, statusIds);
            validateActions(action.else || [], `${p}.else`, errors, statusIds);
        }
        if (name === 'repeat') validateActions(action.do || [], `${p}.do`, errors, statusIds);
    });
}

export function validateHooks(hooks, path, errors, statusIds) {
    if (hooks == null) return;
    if (!Array.isArray(hooks)) { errors.push(`${path}: must be a list`); return; }
    hooks.forEach((hook, i) => {
        const p = `${path}[${i}]`;
        if (hook.modify) {
            if (!MODIFIABLE_STATS.includes(hook.modify)) errors.push(`${p}.modify: unknown stat "${hook.modify}"`);
            if (hook.value === undefined) errors.push(`${p}.value: required`);
        } else if (hook.on) {
            if (!TRIGGERS.includes(hook.on)) errors.push(`${p}.on: unknown trigger "${hook.on}"`);
            validateActions(hook.do || [], `${p}.do`, errors, statusIds);
        } else {
            errors.push(`${p}: needs "on" (a trigger) or "modify" (a stat)`);
        }
    });
}

export function validateSkill(skill, path, errors, statusIds) {
    const kind = skill.kind || 'attack';
    if (!SKILL_KINDS.includes(kind)) errors.push(`${path}.kind: must be one of ${SKILL_KINDS.join(', ')}`);
    if (skill.sin && !SINS.includes(skill.sin)) errors.push(`${path}.sin: unknown sin "${skill.sin}"`);
    if (skill.damageType && !DAMAGE_TYPES.includes(skill.damageType)) errors.push(`${path}.damageType: unknown type "${skill.damageType}"`);
    if (skill.coins != null && (!Array.isArray(skill.coins) || !skill.coins.length)) errors.push(`${path}.coins: needs at least one coin`);
    for (const key of ['basePower', 'coinPower']) {
        if (skill[key] != null && typeof skill[key] !== 'number') errors.push(`${path}.${key}: must be a number`);
    }
    validateHooks(skill.hooks, `${path}.hooks`, errors, statusIds);
    (skill.coins || []).forEach((coin, i) => validateHooks(coin?.hooks, `${path}.coins[${i}].hooks`, errors, statusIds));
}

export function validateUnit(def, statusIds = null) {
    const errors = [];
    if (!def || typeof def !== 'object') return ['unit: must be an object'];
    if (!def.id) errors.push('id: required');
    if (!Array.isArray(def.skills) || !def.skills.some((s) => (s.kind || 'attack') === 'attack' && !s.egoCost)) {
        errors.push('skills: needs at least one attack skill');
    }
    if (def.speed && (!Array.isArray(def.speed) || def.speed.length !== 2 || def.speed[0] > def.speed[1])) errors.push('speed: must be [min, max]');
    for (const [key, value] of Object.entries(def.resist || {})) {
        if (![...SINS, ...DAMAGE_TYPES].includes(key)) errors.push(`resist.${key}: unknown resistance`);
        else if (typeof value !== 'number' || value < 0) errors.push(`resist.${key}: must be a number >= 0`);
    }
    (def.skills || []).forEach((s, i) => validateSkill(s, `skills[${i}]`, errors, statusIds));
    (def.passives || []).forEach((p, i) => validateHooks(p.hooks, `passives[${i}].hooks`, errors, statusIds));
    return errors;
}

export function validateStatus(def, statusIds = null) {
    const errors = [];
    if (!def?.id) errors.push('id: required');
    if (def?.stack && !['potencyCount', 'count'].includes(def.stack)) errors.push('stack: must be "potencyCount" or "count"');
    if (def?.duration && def.duration !== 'turn') errors.push('duration: only "turn" is supported');
    validateHooks(def?.hooks, 'hooks', errors, statusIds);
    return errors;
}
