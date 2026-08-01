(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const sinPalette = battleModules.sinColors || window.EchoesOfTheCitySinColors || {};
    const SIN_COLORS = sinPalette.SIN_COLORS || {
        wrath: '#c73e3e',
        lust: '#e07b39',
        sloth: '#d4b84a',
        gluttony: '#5cb85c',
        gloom: '#6eb8e8',
        pride: '#1e3a6e',
        envy: '#9b59b6',
    };

    function renderCoinPips(coinCount, sinType) {
        const count = Math.max(1, Number(coinCount) || 1);
        const color = SIN_COLORS[sinType] || '#888';
        return Array.from({ length: count }, () => `
            <span class="echoes-skill-preview__coin-pip" style="background:${color};"></span>
        `).join('');
    }

    function formatStat(value, fallback = '—') {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        return String(value);
    }

    function renderEffectLines(skill, catalog, patterns, escapeHtml) {
        const describe = patterns?.describeEffect || ((effect) => effect?.type || 'effect');
        const groups = patterns?.groupEffectsForDisplay?.(skill?.effects) || { onUse: [], onAttackEnd: [], byCoin: {}, other: [] };

        const sections = [];

        if (groups.onUse.length) {
            sections.push(`
                <div class="echoes-skill-preview__effect-group">
                    <div class="echoes-skill-preview__effect-heading">[On Use]</div>
                    ${groups.onUse.map(({ effect }) => `<p class="echoes-skill-preview__effect-line">${escapeHtml(describe(effect, catalog))}</p>`).join('')}
                </div>
            `);
        }

        if (groups.onAttackEnd.length) {
            sections.push(`
                <div class="echoes-skill-preview__effect-group">
                    <div class="echoes-skill-preview__effect-heading">[After attack]</div>
                    ${groups.onAttackEnd.map(({ effect }) => `<p class="echoes-skill-preview__effect-line">${escapeHtml(describe(effect, catalog))}</p>`).join('')}
                </div>
            `);
        }

        Object.keys(groups.byCoin).sort((a, b) => Number(a) - Number(b)).forEach((coinKey) => {
            const coinNum = Number(coinKey);
            const heading = coinNum > 0 ? `[On Hit Coin ${coinNum}]` : '[On Hit]';
            sections.push(`
                <div class="echoes-skill-preview__effect-group">
                    <div class="echoes-skill-preview__effect-heading">${escapeHtml(heading)}</div>
                    ${groups.byCoin[coinKey].map(({ effect }) => `<p class="echoes-skill-preview__effect-line">${escapeHtml(describe(effect, catalog))}</p>`).join('')}
                </div>
            `);
        });

        if (groups.other.length) {
            sections.push(`
                <div class="echoes-skill-preview__effect-group">
                    <div class="echoes-skill-preview__effect-heading">[Other]</div>
                    ${groups.other.map(({ effect }) => `<p class="echoes-skill-preview__effect-line">${escapeHtml(describe(effect, catalog))}</p>`).join('')}
                </div>
            `);
        }

        if (!sections.length) {
            return '<p class="echoes-creator__hint">No effects yet — add patterns in the inspector.</p>';
        }

        return sections.join('');
    }

    function renderSkillPreview(skill, catalog, escapeAttr, escapeHtml) {
        const patterns = battleModules.skillEffectPatterns || window.EchoesOfTheCitySkillEffectPatterns || {};
        const sinType = skill?.sinType || 'wrath';
        const sinColor = SIN_COLORS[sinType] || '#888';
        const plannerLabel = skill?.plannerLabel || skill?.skillSlot || '';
        const coinCount = Math.max(1, Number(skill?.coinCount) || 1);
        const offense = skill?.offenseLevel != null ? `+${skill.offenseLevel}` : '—';
        const attackWeight = skill?.attackWeight != null ? skill.attackWeight : '—';
        const deckCount = skill?.deckCount != null ? skill.deckCount : '—';

        return `
            <aside class="echoes-skill-preview" style="--echoes-lc-sin-color:${sinColor};">
                <h3 class="echoes-skill-preview__title">Live preview</h3>
                <article class="echoes-skill-preview__card echoes-lc-hex">
                    <header class="echoes-skill-preview__card-header">
                        <span class="echoes-skill-preview__sin echoes-lc-hex" style="background:${sinColor};">${escapeHtml(String(sinType).charAt(0).toUpperCase())}</span>
                        <div class="echoes-skill-preview__card-titles">
                            ${plannerLabel ? `<span class="echoes-skill-preview__planner-label">${escapeHtml(plannerLabel)}</span>` : ''}
                            <strong class="echoes-skill-preview__name">${escapeHtml(skill?.name || skill?.id || 'Skill')}</strong>
                        </div>
                        <div class="echoes-skill-preview__coin-pips">${renderCoinPips(coinCount, sinType)}</div>
                    </header>
                    <div class="echoes-skill-preview__stat-strip">
                        <span><em>Base</em> ${escapeHtml(formatStat(skill?.basePower))}</span>
                        <span><em>Coin</em> +${escapeHtml(formatStat(skill?.coinPower, '0'))}</span>
                        <span><em>Coins</em> ${escapeHtml(String(coinCount))}</span>
                        <span><em>Offense</em> ${escapeHtml(offense)}</span>
                        <span><em>Wt</em> ${escapeHtml(String(attackWeight))}</span>
                        <span><em>Amt</em> ${escapeHtml(String(deckCount))}</span>
                    </div>
                    <div class="echoes-skill-preview__tags">
                        <span class="echoes-skill-preview__tag">${escapeHtml(skill?.damageType || 'slash')}</span>
                        <span class="echoes-skill-preview__tag">${escapeHtml(skill?.skillType || 'attack')}</span>
                    </div>
                </article>
                <section class="echoes-skill-preview__effects">
                    <h4 class="echoes-skill-preview__effects-title">Effect text</h4>
                    ${renderEffectLines(skill, catalog, patterns, escapeHtml)}
                </section>
                ${skill?.description ? `<section class="echoes-skill-preview__player-desc"><h4>Player description</h4><p>${escapeHtml(skill.description)}</p></section>` : ''}
            </aside>
        `;
    }

    const skillPreview = {
        SIN_COLORS,
        renderSkillPreview,
        renderEffectLines,
    };

    battleModules.skillPreview = skillPreview;
    window.EchoesOfTheCitySkillPreview = skillPreview;
})();
