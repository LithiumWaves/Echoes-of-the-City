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

    const DAMAGE_GLYPHS = {
        slash: '⌁',
        pierce: '↑',
        blunt: '■',
    };

    function isDefenseSkill(skill) {
        const type = skill?.skillType || 'attack';
        return type === 'guard' || type === 'evade' || type === 'counter';
    }

    function renderCoinPips(coinCount, sinType) {
        const count = Math.max(1, Number(coinCount) || 1);
        const color = SIN_COLORS[sinType] || '#888';
        return Array.from({ length: count }, () => `
            <span class="echoes-kit-card__coin-pip" style="background:${color};"></span>
        `).join('');
    }

    function formatStat(value, fallback = '—') {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        return String(value);
    }

    function renderKitSkillCard(skill, skillIndex, selectedSkillIndex, catalog, escapeAttr, escapeHtml) {
        const tagRenderer = battleModules.skillTagRenderer || window.EchoesOfTheCitySkillTagRenderer || {};
        const sinType = skill?.sinType || 'wrath';
        const sinColor = SIN_COLORS[sinType] || '#888';
        const plannerLabel = skill?.plannerLabel || (isDefenseSkill(skill) ? 'DEFENSE' : `SKILL ${skillIndex + 1}`);
        const coinCount = Math.max(1, Number(skill?.coinCount) || 1);
        const damageType = skill?.damageType || 'slash';
        const damageGlyph = DAMAGE_GLYPHS[damageType] || '·';
        const isSelected = skillIndex === selectedSkillIndex;
        const effectCount = Array.isArray(skill?.effects) ? skill.effects.length : 0;
        const descriptionHtml = tagRenderer.renderTaggedText?.(skill?.description || '', catalog)
            || escapeHtml(skill?.description || '');

        return `
            <article
                class="echoes-kit-card${isSelected ? ' is-selected' : ''}${isDefenseSkill(skill) ? ' echoes-kit-card--defense' : ''}"
                style="--echoes-lc-sin-color:${sinColor};"
                data-action="creator-skill-select"
                data-index="${skillIndex}"
                role="button"
                tabindex="0"
                title="${escapeAttr(skill?.name || skill?.id || plannerLabel)}"
            >
                <header class="echoes-kit-card__header">
                    <span class="echoes-kit-card__sin echoes-lc-hex" style="background:${sinColor};">${escapeHtml(String(sinType).charAt(0).toUpperCase())}</span>
                    <div class="echoes-kit-card__titles">
                        <span class="echoes-kit-card__label">${escapeHtml(plannerLabel)}</span>
                        <strong class="echoes-kit-card__name">${escapeHtml(skill?.name || skill?.id || 'Skill')}</strong>
                    </div>
                    <span class="echoes-kit-card__damage" title="${escapeAttr(damageType)}">${escapeHtml(damageGlyph)}</span>
                </header>
                <div class="echoes-kit-card__stat-strip">
                    <span><em>Base</em> ${escapeHtml(formatStat(skill?.basePower))}</span>
                    <span><em>Coin</em> +${escapeHtml(formatStat(skill?.coinPower, '0'))}</span>
                    <span class="echoes-kit-card__coin-pips" title="Coins">${renderCoinPips(coinCount, sinType)}</span>
                    <span><em>Off</em> ${escapeHtml(skill?.offenseLevel != null ? `+${skill.offenseLevel}` : '—')}</span>
                    <span><em>Wt</em> ${escapeHtml(formatStat(skill?.attackWeight))}</span>
                    <span><em>Amt</em> ${escapeHtml(formatStat(skill?.deckCount))}</span>
                </div>
                <div class="echoes-kit-card__body">
                    ${descriptionHtml
                        ? `<div class="echoes-kit-card__description">${descriptionHtml}</div>`
                        : '<p class="echoes-creator__hint">Write skill text with tags like [On_Use] and [rupture].</p>'}
                </div>
                ${effectCount ? `<footer class="echoes-kit-card__engine-note">${effectCount} combat effect${effectCount === 1 ? '' : 's'} wired</footer>` : ''}
            </article>
        `;
    }

    function renderKitPassiveCard(passive, escapeHtml) {
        return `
            <article class="echoes-kit-card echoes-kit-card--passive">
                <header class="echoes-kit-card__header">
                    <div class="echoes-kit-card__titles">
                        <span class="echoes-kit-card__label">PASSIVE</span>
                        <strong class="echoes-kit-card__name">${escapeHtml(passive?.name || passive?.id || 'Passive')}</strong>
                    </div>
                </header>
                <div class="echoes-kit-card__body">
                    <p class="echoes-kit-card__passive-text">${escapeHtml(passive?.description || 'No description.')}</p>
                </div>
            </article>
        `;
    }

    function renderKitStrip(unitDraft, catalog, escapeAttr, escapeHtml, options = {}) {
        const skills = Array.isArray(unitDraft?.skills) ? unitDraft.skills : [];
        const passives = Array.isArray(unitDraft?.passives) ? unitDraft.passives : [];
        let selectedSkillIndex = Number.isInteger(options.selectedSkillIndex) ? options.selectedSkillIndex : 0;
        if (selectedSkillIndex < 0 || selectedSkillIndex >= skills.length) {
            selectedSkillIndex = skills.length ? 0 : -1;
        }

        const attackSkills = [];
        const defenseSkills = [];
        skills.forEach((skill, index) => {
            if (isDefenseSkill(skill)) {
                defenseSkills.push({ skill, index });
            } else {
                attackSkills.push({ skill, index });
            }
        });

        const attackCards = attackSkills.map(({ skill, index }) => renderKitSkillCard(skill, index, selectedSkillIndex, catalog, escapeAttr, escapeHtml)).join('');
        const defenseCards = defenseSkills.map(({ skill, index }) => renderKitSkillCard(skill, index, selectedSkillIndex, catalog, escapeAttr, escapeHtml)).join('');
        const passiveCards = passives.map((passive) => renderKitPassiveCard(passive, escapeHtml)).join('');

        return `
            <aside class="echoes-kit-strip">
                <h3 class="echoes-kit-strip__title">Kit preview</h3>
                <div class="echoes-kit-strip__row">
                    ${attackCards || '<span class="echoes-creator__hint">No offensive skills yet.</span>'}
                    ${defenseCards}
                    ${passiveCards}
                </div>
            </aside>
        `;
    }

    /** @deprecated Prefer renderKitStrip — kept for callers expecting a single-card preview. */
    function renderSkillPreview(skill, catalog, escapeAttr, escapeHtml) {
        return renderKitStrip({ skills: skill ? [skill] : [] }, catalog, escapeAttr, escapeHtml, { selectedSkillIndex: 0 });
    }

    const skillPreview = {
        SIN_COLORS,
        isDefenseSkill,
        renderKitStrip,
        renderKitSkillCard,
        renderSkillPreview,
    };

    battleModules.skillPreview = skillPreview;
    window.EchoesOfTheCitySkillPreview = skillPreview;
})();
