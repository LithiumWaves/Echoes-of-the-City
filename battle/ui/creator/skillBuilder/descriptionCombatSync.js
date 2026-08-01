(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    function normalizeToken(raw) {
        return String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    }

    function resolveStatusId(token, catalog) {
        if (!token) {
            return '';
        }
        const normalized = normalizeToken(token);
        const compact = normalized.replace(/[_-]/g, '');
        const list = catalog?.statusList || [];
        if (!list.length) {
            return '';
        }

        const scored = list.map((entry) => {
            const id = normalizeToken(entry.id);
            const label = normalizeToken(entry.label || entry.name || '');
            const idCompact = id.replace(/[_-]/g, '');
            const labelCompact = label.replace(/[_-]/g, '');
            let score = 0;
            if (id === normalized || label === normalized) {
                score = 100;
            } else if (idCompact === compact || labelCompact === compact) {
                score = 90;
            } else if (idCompact.endsWith(compact) || compact.endsWith(idCompact)) {
                // iris_concealed_exoskeleton ↔ concealed_exoskeleton
                score = 80;
            } else if (labelCompact.includes(compact) || compact.includes(labelCompact)) {
                score = 60;
            }
            return { entry, score };
        }).filter((item) => item.score > 0);

        scored.sort((a, b) => b.score - a.score);
        if (scored[0]) {
            return scored[0].entry.id;
        }
        // Do not invent unsupported ids — leave blank for the author to pick.
        return '';
    }

    function syncNestedStatusIds(effect) {
        if (!effect || typeof effect !== 'object' || !effect.statusId) {
            return effect;
        }
        const statusId = effect.statusId;
        const visit = (node) => {
            if (!node || typeof node !== 'object') {
                return;
            }
            if (Array.isArray(node)) {
                node.forEach(visit);
                return;
            }
            if (node.statusCount && typeof node.statusCount === 'object') {
                if (!node.statusCount.statusId) {
                    node.statusCount.statusId = statusId;
                }
            }
            if (node.statusPotency && typeof node.statusPotency === 'object') {
                if (!node.statusPotency.statusId) {
                    node.statusPotency.statusId = statusId;
                }
            }
            Object.keys(node).forEach((key) => {
                if (key !== 'statusCount' && key !== 'statusPotency') {
                    visit(node[key]);
                }
            });
        };
        visit(effect.amount);
        return effect;
    }

    function extractBracketTokens(line) {
        const tokens = [];
        const re = /\[([^\]]+)\]/g;
        let match = re.exec(line);
        while (match) {
            tokens.push(match[1]);
            match = re.exec(line);
        }
        return tokens;
    }

    function stripTriggers(line) {
        return String(line || '')
            .replace(/\[On_Use\]/gi, '')
            .replace(/\[On_Hit\]/gi, '')
            .replace(/\[On_Clash_Win\]/gi, '')
            .replace(/\[On_Clash_Lose\]/gi, '')
            .replace(/\[On_Attack_End\]/gi, '')
            .replace(/\[Heads_Hit\]/gi, '')
            .replace(/\[Tails_Hit\]/gi, '')
            .replace(/\[Combat_Start\]/gi, '')
            .trim();
    }

    function parseCoinHeader(line) {
        const match = String(line || '').match(/^\s*\[Coin[_ ]?(\d+)\]\s*$/i);
        if (!match) {
            return null;
        }
        return Number(match[1]);
    }

    function isStacksOnly(catalog, statusId) {
        const creatorUi = battleModules.creatorUi || window.EchoesOfTheCityCreatorUi;
        if (typeof creatorUi?.getStatusMetricMode === 'function') {
            return creatorUi.getStatusMetricMode(statusId, catalog) === 'stacks';
        }
        const entry = (catalog?.statusList || []).find((item) => item.id === statusId);
        return Boolean(entry?.countOnly);
    }

    function tryParseDamagePct(line, catalog) {
        const text = stripTriggers(line);
        const match = text.match(/deal\s*\+?\s*(\d+(?:\.\d+)?)\s*%\s*damage\s*(?:for\s*every|per)\s*(?:\[([^\]]+)\]|(\w[\w\s-]*))\s*(?:on\s*self)?(?:[^(]*\(\s*max\s*(\d+(?:\.\d+)?)\s*%\s*\))?/i);
        if (!match) {
            return null;
        }
        const statusToken = match[2] || match[3];
        const statusId = resolveStatusId(statusToken, catalog);
        const multiplier = Number(match[1]) / 100;
        const cap = match[4] != null ? Number(match[4]) / 100 : undefined;
        const effect = {
            trigger: 'onSelect',
            type: 'modifyContext',
            field: 'damageMultiplier',
            operation: 'addStatusCountScaled',
            statusId,
            statusSource: 'self',
            multiplier,
        };
        if (cap != null && Number.isFinite(cap)) {
            effect.cap = cap;
        }
        return [effect];
    }

    function tryParseTieredCoinPower(line, catalog) {
        const text = stripTriggers(line);
        const match = text.match(/at\s+(\d+)\s*\+\s*\/\s*(\d+)\s*\+\s*\[([^\]]+)\]\s*,?\s*coin\s*power\s*\+?\s*(\d+)\s*\/\s*\+?\s*(\d+)/i)
            || text.match(/at\s+(\d+)\s*\+\s*\/\s*(\d+)\s*\+\s*\[([^\]]+)\][^.]*coin\s*power\s*\+?\s*(\d+)\s*\/\s*\+?\s*(\d+)/i);
        if (!match) {
            return null;
        }
        const statusId = resolveStatusId(match[3], catalog);
        return [
            {
                trigger: 'onSelect',
                type: 'modifyContext',
                field: 'coinPowerBonus',
                operation: 'add',
                value: Number(match[4]),
                statusId,
                minStatusCount: Number(match[1]),
                statusSource: 'self',
            },
            {
                trigger: 'onSelect',
                type: 'modifyContext',
                field: 'coinPowerBonus',
                operation: 'add',
                value: Number(match[5]),
                statusId,
                minStatusCount: Number(match[2]),
                statusSource: 'self',
            },
        ];
    }

    function tryParseClashPerStacks(line, catalog) {
        const text = stripTriggers(line);
        const match = text.match(/clash\s*power\s*\+?\s*(\d+)\s*for\s*every\s*(\d+)\s*\[([^\]]+)\][^(]*(?:\(\s*max\s*(\d+)\s*\))?/i);
        if (!match) {
            return null;
        }
        const statusId = resolveStatusId(match[3], catalog);
        const perStacks = Number(match[2]) || 5;
        const maxBonus = match[4] != null ? Number(match[4]) : 2;
        const stepMultiplier = 1 / perStacks;
        return [syncNestedStatusIds({
            trigger: 'onSelect',
            type: 'modifyContext',
            field: 'clashPowerBonus',
            operation: 'add',
            statusId,
            statusSource: 'self',
            amount: {
                clamp: {
                    value: {
                        floor: {
                            statusCount: { target: 'self', statusId },
                            multiplier: stepMultiplier,
                        },
                    },
                    max: maxBonus,
                },
            },
        })];
    }

    function tryParseSlotAggro(line) {
        const text = stripTriggers(line);
        const match = text.match(/gain\s*\+?\s*(\d+)\s*\[?aggro\]?\s*to\s*this\s*skill\s*slot/i)
            || text.match(/\+?\s*(\d+)\s*\[aggro\].*skill\s*slot/i);
        if (!match) {
            return null;
        }
        return [{
            trigger: 'onAttackEnd',
            type: 'adjustSlotAggro',
            target: 'self',
            value: Number(match[1]),
        }];
    }

    function tryParseApplyStatus(line, catalog, coinIndex) {
        const text = stripTriggers(line);
        const inflictPotencyCount = text.match(/inflict\s+(\d+)\s*\[([^\]]+)\]\s*(?:and|,)?\s*(\d+)\s*\[?\2\]?\s*count/i)
            || text.match(/inflict\s+(\d+)\s*\[([^\]]+)\]\s+and\s+(\d+)\s+\[([^\]]+)\]\s*count/i);
        if (inflictPotencyCount) {
            const statusId = resolveStatusId(inflictPotencyCount[2], catalog);
            const effect = {
                trigger: 'onHit',
                type: 'applyStatus',
                statusId,
                potency: Number(inflictPotencyCount[1]),
                count: Number(inflictPotencyCount[3]),
            };
            if (Number.isInteger(coinIndex) && coinIndex > 0) {
                effect.coinIndex = coinIndex;
            }
            return [effect];
        }

        const inflictSimple = text.match(/inflict\s+(\d+)\s*\[([^\]]+)\]/i);
        if (inflictSimple) {
            const statusId = resolveStatusId(inflictSimple[2], catalog);
            const amount = Number(inflictSimple[1]);
            const effect = {
                trigger: 'onHit',
                type: 'applyStatus',
                statusId,
            };
            if (isStacksOnly(catalog, statusId)) {
                effect.count = amount;
            } else {
                effect.potency = amount;
                effect.count = 1;
            }
            if (Number.isInteger(coinIndex) && coinIndex > 0) {
                effect.coinIndex = coinIndex;
            }
            return [effect];
        }

        const gain = text.match(/gain\s*\+?\s*(\d+)\s*\[([^\]]+)\]/i);
        if (gain) {
            const statusToken = gain[2];
            if (/^aggro$/i.test(statusToken) && /skill\s*slot/i.test(text)) {
                return null;
            }
            const statusId = resolveStatusId(statusToken, catalog);
            const amount = Number(gain[1]);
            const effect = {
                trigger: 'onHit',
                type: 'applyStatus',
                target: 'self',
                statusId,
                count: amount,
            };
            if (!isStacksOnly(catalog, statusId)) {
                effect.potency = 0;
            }
            if (Number.isInteger(coinIndex) && coinIndex > 0) {
                effect.coinIndex = coinIndex;
            }
            return [effect];
        }

        return null;
    }

    function tryParseWeightedBranch(line, catalog, coinIndex) {
        const text = stripTriggers(line);
        if (!/1\s*d\s*3|33\s*%|one\s*in\s*three/i.test(text)) {
            return null;
        }
        const statusMatch = text.match(/\[([^\]]+)\]/);
        const statusId = statusMatch ? resolveStatusId(statusMatch[1], catalog) : '';
        const bonusAction = statusId
            ? {
                type: 'applyStatus',
                statusId,
                count: 1,
                ...(isStacksOnly(catalog, statusId) ? {} : { potency: 1 }),
            }
            : { type: 'modifyContext', field: 'coinPowerBonus', operation: 'add', value: 1 };
        const effect = {
            trigger: 'onHit',
            type: 'chooseWeightedActions',
            branches: [
                { weight: 1, actions: [bonusAction] },
                { weight: 1, actions: [] },
                { weight: 1, actions: [] },
            ],
        };
        if (Number.isInteger(coinIndex) && coinIndex > 0) {
            effect.coinIndex = coinIndex;
        }
        return [effect];
    }

    function tryParseStanceGate(line, catalog, coinIndex) {
        const text = stripTriggers(line);
        const match = text.match(/\+?\s*(\d+)\s*if\s*(?:in|you\s*have|this\s*unit\s*has)?\s*\[([^\]]+)\]/i);
        if (!match) {
            return null;
        }
        const statusId = resolveStatusId(match[2], catalog);
        const effect = {
            trigger: 'onHit',
            type: 'modifyContext',
            field: 'coinPowerBonus',
            operation: 'add',
            value: Number(match[1]),
            statusId,
            minStatusCount: 1,
            statusSource: 'self',
        };
        if (Number.isInteger(coinIndex) && coinIndex > 0) {
            effect.coinIndex = coinIndex;
        }
        return [effect];
    }

    function parseLine(line, catalog, state) {
        const trimmed = String(line || '').trim();
        if (!trimmed || trimmed === '-' || /^[-–—]\s*$/.test(trimmed)) {
            return { effects: [], skipped: false };
        }

        const coinHeader = parseCoinHeader(trimmed);
        if (coinHeader != null) {
            state.coinIndex = coinHeader;
            return { effects: [], skipped: false, coinHeader: true };
        }

        const parsers = [
            () => tryParseDamagePct(trimmed, catalog),
            () => tryParseTieredCoinPower(trimmed, catalog),
            () => tryParseClashPerStacks(trimmed, catalog),
            () => tryParseSlotAggro(trimmed),
            () => tryParseWeightedBranch(trimmed, catalog, state.coinIndex),
            () => tryParseStanceGate(trimmed, catalog, state.coinIndex),
            () => tryParseApplyStatus(trimmed, catalog, state.coinIndex),
        ];

        for (let i = 0; i < parsers.length; i += 1) {
            const parsed = parsers[i]();
            if (parsed && parsed.length) {
                return { effects: parsed, skipped: false };
            }
        }

        // Pure trigger-only lines are ignored, not skipped as failures.
        if (/^\s*\[(On_Use|On_Hit|Heads_Hit|Tails_Hit)\]\s*$/i.test(trimmed)) {
            return { effects: [], skipped: false };
        }

        return { effects: [], skipped: true, line: trimmed };
    }

    function compileEffectsFromDescription(description, catalog) {
        const lines = String(description || '').split(/\r?\n/);
        const effects = [];
        const matched = [];
        const skipped = [];
        const state = { coinIndex: null };

        lines.forEach((rawLine, index) => {
            const result = parseLine(rawLine, catalog, state);
            if (result.coinHeader) {
                matched.push({ line: index + 1, kind: 'coinHeader', coinIndex: state.coinIndex });
                return;
            }
            if (result.effects.length) {
                result.effects.forEach((effect) => effects.push(syncNestedStatusIds(effect)));
                matched.push({ line: index + 1, kind: 'effect', count: result.effects.length, text: String(rawLine).trim() });
                return;
            }
            if (result.skipped) {
                skipped.push({ line: index + 1, text: result.line || String(rawLine).trim() });
            }
        });

        return { effects, matched, skipped };
    }

    const descriptionCombatSync = {
        compileEffectsFromDescription,
        resolveStatusId,
        syncNestedStatusIds,
        extractBracketTokens,
        parseLine,
    };

    battleModules.descriptionCombatSync = descriptionCombatSync;
    window.EchoesOfTheCityDescriptionCombatSync = descriptionCombatSync;
})();
