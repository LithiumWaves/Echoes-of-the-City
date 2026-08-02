(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function getCombatSync() {
        return battleModules.descriptionCombatSync || window.EchoesOfTheCityDescriptionCombatSync || null;
    }

    function resolveStatusId(token, catalog) {
        const sync = getCombatSync();
        if (typeof sync?.resolveStatusId === 'function') {
            return sync.resolveStatusId(token, catalog);
        }
        return String(token || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/_/g, '-') || '';
    }

    function normalizeLine(line) {
        return String(line || '').trim();
    }

    function stripTriggerTags(line) {
        return String(line || '')
            .replace(/\[Combat[_ ]?Start\]/gi, '')
            .replace(/\[Turn[_ ]?Start\]/gi, '')
            .replace(/\[Turn[_ ]?End\]/gi, '')
            .replace(/\[On[_ ]?Clash[_ ]?Win\]/gi, '')
            .replace(/\[On[_ ]?Clash[_ ]?Lose\]/gi, '')
            .replace(/\[On[_ ]?Hit\]/gi, '')
            .replace(/\[When[_ ]?Hit\]/gi, '')
            .trim();
    }

    function detectTrigger(line, ownerType) {
        const text = String(line || '');
        if (/\[Combat[_ ]?Start\]/i.test(text) || /\bcombat\s*start\b/i.test(text)) {
            return 'battleStart';
        }
        if (/\[Turn[_ ]?Start\]/i.test(text) || /\bat\s*turn\s*start\b/i.test(text)) {
            return 'turnStart';
        }
        if (/\[Turn[_ ]?End\]/i.test(text) || /\bat\s*turn\s*end\b/i.test(text) || /\bturn\s*end\b/i.test(text)) {
            return 'turnEnd';
        }
        if (/\[On[_ ]?Clash[_ ]?Lose\]/i.test(text) || /\bon\s*clash\s*loss\b/i.test(text)) {
            return 'onClashLose';
        }
        if (/\[On[_ ]?Clash[_ ]?Win\]/i.test(text) || /\bon\s*clash\s*win\b/i.test(text)) {
            return 'onClashWin';
        }
        if (/\bwhen\s*hit\b/i.test(text) || /\bhit\s*taken\b/i.test(text)) {
            return 'hitTaken';
        }
        if (/\[On[_ ]?Hit\]/i.test(text) || /\bon\s*hit\b/i.test(text)) {
            if (ownerType === 'passive' && /\b(inflict|deal)\b/i.test(text)) {
                return 'hitDealt';
            }
            if (ownerType === 'passive' && /\bgain\b/i.test(text)) {
                return 'hitTaken';
            }
            return ownerType === 'status' ? 'hitTaken' : 'hitDealt';
        }
        return null;
    }

    function extractTurnAtLeast(line) {
        const match = String(line || '').match(/starting\s*at\s*turn\s*(\d+)/i)
            || String(line || '').match(/from\s*turn\s*(\d+)/i)
            || String(line || '').match(/turn\s*(\d+)\+/i);
        if (!match) {
            return null;
        }
        return Number(match[1]);
    }

    function extractBracketStatus(line, catalog) {
        const match = String(line || '').match(/\[([^\]]+)\]/);
        if (!match) {
            return '';
        }
        const token = match[1];
        if (/^(combat_start|turn_start|turn_end|on_hit|when_hit|on_clash_win|on_clash_lose|on_use)$/i.test(token.replace(/\s+/g, '_'))) {
            return '';
        }
        return resolveStatusId(token, catalog);
    }

    function extractGainAmount(line) {
        const match = String(line || '').match(/gain\s*\+?\s*(\d+)/i);
        return match ? Number(match[1]) : 1;
    }

    function makePotencyDamageActions(ownerId, loseCount) {
        const actions = [
            {
                type: 'dealFixedDamage',
                target: 'self',
                statusId: ownerId,
                amount: {
                    statusPotency: { target: 'self', statusId: ownerId },
                },
            },
        ];
        if (loseCount) {
            actions.push({
                type: 'adjustStatus',
                target: 'self',
                statusId: ownerId,
                countDelta: -1,
            });
        }
        return actions;
    }

    function makeShieldSyncActions(ownerId, hpPerStack) {
        const shield = {
            type: 'gainShield',
            target: 'self',
            shieldId: `${String(ownerId || 'status').replace(/[^a-z0-9_-]/gi, '_')}_shield`,
            operation: 'set',
            stackSize: hpPerStack,
            expiresAt: 'turnEnd',
            linkedStatusId: ownerId,
            linkedStatusCountDeltaOnBreak: -1,
            amount: {
                statusCount: { target: 'self', statusId: ownerId },
                multiplier: hpPerStack,
            },
        };
        return [shield];
    }

    function tryParseStatusPotencyTick(line, ownerId) {
        const text = stripTriggerTags(line);
        const hasPotencyDamage = /(?:take\s+)?(?:fixed\s+)?damage\s*(?:equal\s*to|=)\s*potency|damage\s*=\s*potency|potency\s*damage/i.test(text)
            || (/damage/i.test(text) && /potency/i.test(text));
        if (!hasPotencyDamage) {
            return null;
        }
        const loseCount = /lose\s*1\s*count|then\s*lose\s*1|count\s*-?\s*1/i.test(text);
        const trigger = detectTrigger(line, 'status') || (/when\s*hit|hit\s*taken/i.test(line) ? 'hitTaken' : 'turnEnd');
        return {
            hookName: trigger === 'hitTaken' ? 'hitTaken' : 'turnEnd',
            block: {
                actions: makePotencyDamageActions(ownerId, loseCount || /turn\s*end/i.test(line)),
            },
        };
    }

    function tryParseStatusThresholdGrant(line, ownerId, catalog, options) {
        const text = stripTriggerTags(line);
        const match = text.match(/at\s+(\d+)\s*(?:count|stacks?)?\b/i);
        if (!match || !/\bgrants?\b|\bunlocks?\b|\boffers?\b/i.test(text)) {
            return null;
        }
        const threshold = Number(match[1]);
        const actions = [];
        const skillList = options.skillList || catalog?.skillList || [];
        const skillMatch = skillList.find((skill) => {
            const id = String(skill.id || '').toLowerCase();
            const name = String(skill.name || '').toLowerCase();
            const hay = text.toLowerCase();
            return (id && hay.includes(id)) || (name && hay.includes(name));
        });
        if (skillMatch) {
            actions.push({
                type: 'grantSkillOffer',
                target: 'self',
                skillId: skillMatch.id,
                offerLane: 'top',
            });
        } else {
            const statusId = extractBracketStatus(text, catalog);
            if (statusId) {
                actions.push({
                    type: 'applyStatus',
                    target: 'self',
                    statusId,
                    count: 1,
                });
            }
        }
        if (!actions.length) {
            return null;
        }
        return {
            hookName: 'statusChanged',
            block: {
                conditions: [
                    { type: 'eventStatusIdIs', value: ownerId },
                    { type: 'statusCountAtLeast', target: 'self', statusId: ownerId, value: threshold },
                ],
                actions,
            },
        };
    }

    function tryParseStatusShieldSync(line, ownerId) {
        const text = stripTriggerTags(line);
        const match = text.match(/shield\s*worth\s*(\d+)/i)
            || text.match(/(\d+)\s*hp\s*per\s*stack/i)
            || text.match(/\(\s*stack\s*[x×]\s*(\d+)\s*\)\s*shield/i)
            || text.match(/gain\s*\(\s*stack\s*[x×]\s*(\d+)\s*\)\s*shield/i);
        if (!match) {
            return null;
        }
        const hpPerStack = Number(match[1]) || 3;
        const actions = makeShieldSyncActions(ownerId, hpPerStack);
        return {
            multi: [
                {
                    hookName: 'statusApplied',
                    block: {
                        conditions: [{ type: 'eventStatusIdIs', value: ownerId }],
                        actions: actions.map((action) => ({ ...action })),
                    },
                },
                {
                    hookName: 'statusChanged',
                    block: {
                        conditions: [{ type: 'eventStatusIdIs', value: ownerId }],
                        actions: actions.map((action) => ({ ...action })),
                    },
                },
                {
                    hookName: 'turnStart',
                    block: {
                        actions: actions.map((action) => ({ ...action })),
                    },
                },
            ],
        };
    }

    function tryParsePassiveGainLine(line, catalog) {
        const text = stripTriggerTags(line);
        const gainMatch = text.match(/gain\s*\+?\s*(\d+)?\s*\[([^\]]+)\]/i)
            || text.match(/gain\s*\+?\s*(\d+)\s+([a-z][\w-]*)/i);
        if (!gainMatch && !/gain\s*\[/i.test(text)) {
            return null;
        }
        let amount = 1;
        let statusToken = '';
        if (gainMatch) {
            amount = gainMatch[1] != null && gainMatch[1] !== '' ? Number(gainMatch[1]) : extractGainAmount(text);
            statusToken = gainMatch[2];
        } else {
            statusToken = (text.match(/\[([^\]]+)\]/) || [])[1] || '';
            amount = extractGainAmount(text);
        }
        const statusId = resolveStatusId(statusToken, catalog);
        if (!statusId) {
            return null;
        }
        const trigger = detectTrigger(line, 'passive') || 'turnEnd';
        const turnAtLeast = extractTurnAtLeast(line);
        const block = {
            actions: [{
                type: 'adjustStatus',
                target: 'self',
                statusId,
                countDelta: amount,
            }],
        };
        if (turnAtLeast != null) {
            block.conditions = [{ type: 'turnAtLeast', value: turnAtLeast }];
        }
        return { hookName: trigger, block };
    }

    function tryParsePassiveTriggerOnlyGain(line, catalog) {
        // Lines that only set a trigger context aren't useful alone; gain parser handles most.
        const trigger = detectTrigger(line, 'passive');
        const turnAtLeast = extractTurnAtLeast(line);
        const statusId = extractBracketStatus(stripTriggerTags(line), catalog);
        if (!trigger || !statusId) {
            return null;
        }
        if (!/gain|inflict|apply/i.test(line)) {
            return null;
        }
        const amount = extractGainAmount(line);
        const block = {
            actions: [{
                type: /inflict|apply/i.test(line)
                    ? 'applyStatus'
                    : 'adjustStatus',
                target: 'self',
                statusId,
                ...( /inflict|apply/i.test(line)
                    ? { count: amount }
                    : { countDelta: amount }),
            }],
        };
        if (turnAtLeast != null) {
            block.conditions = [{ type: 'turnAtLeast', value: turnAtLeast }];
        }
        return { hookName: trigger, block };
    }

    function pushHook(hooks, hookName, block) {
        if (!hookName || !block) {
            return;
        }
        if (!Array.isArray(hooks[hookName])) {
            hooks[hookName] = [];
        }
        hooks[hookName].push(block);
    }

    function parseStatusLine(line, catalog, options) {
        const ownerId = options.ownerId || 'this-status';
        return tryParseStatusShieldSync(line, ownerId)
            || tryParseStatusThresholdGrant(line, ownerId, catalog, options)
            || tryParseStatusPotencyTick(line, ownerId);
    }

    function parsePassiveLine(line, catalog) {
        return tryParsePassiveGainLine(line, catalog)
            || tryParsePassiveTriggerOnlyGain(line, catalog);
    }

    function compileHooksFromDescription(description, catalog, options = {}) {
        const ownerType = options.ownerType === 'status' ? 'status' : 'passive';
        const lines = String(description || '').split(/\r?\n/);
        const hooks = {};
        const matched = [];
        const skipped = [];

        lines.forEach((rawLine, index) => {
            const line = normalizeLine(rawLine);
            if (!line || line === '-' || /^[-–—]\s*$/.test(line)) {
                return;
            }

            const parsed = ownerType === 'status'
                ? parseStatusLine(line, catalog, options)
                : parsePassiveLine(line, catalog);

            if (!parsed) {
                // Pure trigger-only tags are ignored, not skipped.
                if (/^\s*\[(Combat_Start|Turn_Start|Turn_End|On_Hit|When_Hit|On_Clash_Win|On_Clash_Lose)\]\s*$/i.test(line)) {
                    matched.push({ line: index + 1, kind: 'triggerOnly', text: line });
                    return;
                }
                skipped.push({ line: index + 1, text: line });
                return;
            }

            if (parsed.multi) {
                parsed.multi.forEach((entry) => pushHook(hooks, entry.hookName, entry.block));
                matched.push({ line: index + 1, kind: 'effect', count: parsed.multi.length, text: line });
                return;
            }

            pushHook(hooks, parsed.hookName, parsed.block);
            matched.push({ line: index + 1, kind: 'effect', count: 1, text: line });
        });

        return { hooks, matched, skipped };
    }

    const descriptionHooksSync = {
        compileHooksFromDescription,
        resolveStatusId,
        detectTrigger,
        extractTurnAtLeast,
    };

    battleModules.descriptionHooksSync = descriptionHooksSync;
    window.EchoesOfTheCityDescriptionHooksSync = descriptionHooksSync;
})();
