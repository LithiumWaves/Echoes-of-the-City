(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const TRIGGER_LABELS = {
        on_use: 'On Use',
        on_hit: 'On Hit',
        on_clash_win: 'On Clash Win',
        on_clash_lose: 'On Clash Lose',
        on_attack_end: 'After Attack',
        heads_hit: 'Heads Hit',
        tails_hit: 'Tails Hit',
        combat_start: 'Combat Start',
    };

    const STATUS_COLORS = {
        rupture: '#6bbf4e',
        tremor: '#c9a227',
        bleed: '#c73e3e',
        burn: '#e07b39',
        sinking: '#6eb8e8',
        poise: '#d4b84a',
        aggro: '#e07b39',
        protection: '#8ecae6',
        concealed_exoskeleton: '#d4b84a',
        concealedexoskeleton: '#d4b84a',
        aggressive_stance: '#d4b84a',
        aggressivestance: '#d4b84a',
        paralyze: '#9b59b6',
        paralysis: '#9b59b6',
    };

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function normalizeToken(raw) {
        return String(raw || '').trim().toLowerCase().replace(/\s+/g, '_');
    }

    function displayFromToken(token) {
        return String(token || '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (ch) => ch.toUpperCase());
    }

    function resolveStatus(token, catalog) {
        const normalized = normalizeToken(token);
        const compact = normalized.replace(/[_-]/g, '');
        const list = catalog?.statusList || [];
        const match = list.find((entry) => {
            const id = normalizeToken(entry.id);
            const label = normalizeToken(entry.label || entry.name || '');
            return id === normalized
                || id.replace(/[_-]/g, '') === compact
                || label === normalized
                || label.replace(/[_-]/g, '') === compact;
        });
        if (match) {
            return {
                id: match.id,
                label: match.label || match.name || match.id,
                color: STATUS_COLORS[normalizeToken(match.id).replace(/-/g, '_')]
                    || STATUS_COLORS[compact]
                    || '#c8b07a',
            };
        }
        const color = STATUS_COLORS[normalized.replace(/-/g, '_')] || STATUS_COLORS[compact];
        if (color) {
            return {
                id: normalized,
                label: displayFromToken(token),
                color,
            };
        }
        return null;
    }

    function classifyTag(token, catalog) {
        const normalized = normalizeToken(token);
        if (TRIGGER_LABELS[normalized]) {
            return {
                kind: 'trigger',
                label: TRIGGER_LABELS[normalized],
            };
        }
        const coinMatch = normalized.match(/^coin[_-]?(\d+)$/);
        if (coinMatch) {
            return {
                kind: 'coin',
                label: `Coin ${coinMatch[1]}`,
                coinIndex: Number(coinMatch[1]),
            };
        }
        const status = resolveStatus(token, catalog);
        if (status) {
            return {
                kind: 'status',
                label: status.label,
                color: status.color,
                statusId: status.id,
            };
        }
        return {
            kind: 'unknown',
            label: displayFromToken(token),
        };
    }

    function renderTagHtml(token, catalog) {
        const classified = classifyTag(token, catalog);
        if (classified.kind === 'trigger') {
            return `<span class="echoes-skill-tag echoes-skill-tag--trigger">[${escapeHtml(classified.label)}]</span>`;
        }
        if (classified.kind === 'coin') {
            return `<span class="echoes-skill-tag echoes-skill-tag--coin">[${escapeHtml(classified.label)}]</span>`;
        }
        if (classified.kind === 'status') {
            return `<span class="echoes-skill-tag echoes-skill-tag--status" style="--echoes-tag-color:${classified.color};"><span class="echoes-skill-tag__dot" aria-hidden="true"></span>${escapeHtml(classified.label)}</span>`;
        }
        return `<span class="echoes-skill-tag echoes-skill-tag--unknown">[${escapeHtml(classified.label)}]</span>`;
    }

    function renderTaggedText(text, catalog, options = {}) {
        const escape = options.escapeHtml || escapeHtml;
        const source = String(text || '');
        if (!source) {
            return '';
        }
        const parts = [];
        const tagRe = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match = tagRe.exec(source);
        while (match) {
            if (match.index > lastIndex) {
                parts.push(escape(source.slice(lastIndex, match.index)));
            }
            parts.push(renderTagHtml(match[1], catalog));
            lastIndex = match.index + match[0].length;
            match = tagRe.exec(source);
        }
        if (lastIndex < source.length) {
            parts.push(escape(source.slice(lastIndex)));
        }
        return parts.join('').replace(/\n/g, '<br>');
    }

    const skillTagRenderer = {
        TRIGGER_LABELS,
        STATUS_COLORS,
        normalizeToken,
        classifyTag,
        renderTagHtml,
        renderTaggedText,
        escapeHtml,
    };

    battleModules.skillTagRenderer = skillTagRenderer;
    window.EchoesOfTheCitySkillTagRenderer = skillTagRenderer;
})();
