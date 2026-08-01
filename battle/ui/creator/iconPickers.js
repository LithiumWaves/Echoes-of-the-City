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

    const SIN_TYPES = sinPalette.SIN_TYPES || ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
    const DAMAGE_TYPES = [
        { id: 'slash', label: 'Slash', glyph: '⌁' },
        { id: 'pierce', label: 'Pierce', glyph: '↑' },
        { id: 'blunt', label: 'Blunt', glyph: '■' },
    ];
    const SKILL_TYPES = [
        { id: 'attack', label: 'Attack' },
        { id: 'guard', label: 'Guard' },
        { id: 'evade', label: 'Evade' },
        { id: 'counter', label: 'Counter' },
    ];

    function renderSinPicker(selected, skillIndex, escapeAttr) {
        return `
            <div class="echoes-skill-picker echoes-skill-picker--sin" role="group" aria-label="Sin affinity">
                ${SIN_TYPES.map((sin) => {
                    const color = SIN_COLORS[sin] || '#888';
                    const isActive = selected === sin;
                    return `
                        <button
                            class="echoes-skill-picker__tile echoes-skill-picker__tile--hex${isActive ? ' is-active' : ''}"
                            type="button"
                            data-action="creator-skill-picker"
                            data-index="${skillIndex}"
                            data-picker="sinType"
                            data-value="${escapeAttr(sin)}"
                            title="${escapeAttr(sin)}"
                            style="--echoes-picker-color:${color};"
                        >
                            <span class="echoes-skill-picker__glyph">${escapeAttr(String(sin).charAt(0).toUpperCase())}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderDamagePicker(selected, skillIndex, escapeAttr) {
        return `
            <div class="echoes-skill-picker echoes-skill-picker--damage" role="group" aria-label="Damage type">
                ${DAMAGE_TYPES.map((entry) => {
                    const isActive = selected === entry.id;
                    return `
                        <button
                            class="echoes-skill-picker__tile echoes-skill-picker__tile--damage${isActive ? ' is-active' : ''}"
                            type="button"
                            data-action="creator-skill-picker"
                            data-index="${skillIndex}"
                            data-picker="damageType"
                            data-value="${escapeAttr(entry.id)}"
                            title="${escapeAttr(entry.label)}"
                        >
                            <span class="echoes-skill-picker__glyph">${escapeAttr(entry.glyph)}</span>
                            <span class="echoes-skill-picker__label">${escapeAttr(entry.label)}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderSkillTypePicker(selected, skillIndex, escapeAttr) {
        return `
            <div class="echoes-skill-picker echoes-skill-picker--skill-type" role="group" aria-label="Skill type">
                ${SKILL_TYPES.map((entry) => {
                    const isActive = (selected || 'attack') === entry.id;
                    return `
                        <button
                            class="echoes-skill-picker__tile echoes-skill-picker__tile--type${isActive ? ' is-active' : ''}"
                            type="button"
                            data-action="creator-skill-picker"
                            data-index="${skillIndex}"
                            data-picker="skillType"
                            data-value="${escapeAttr(entry.id)}"
                        >${escapeAttr(entry.label)}</button>
                    `;
                }).join('')}
            </div>
        `;
    }

    const iconPickers = {
        SIN_COLORS,
        SIN_TYPES,
        DAMAGE_TYPES,
        SKILL_TYPES,
        renderSinPicker,
        renderDamagePicker,
        renderSkillTypePicker,
    };

    battleModules.iconPickers = iconPickers;
    window.EchoesOfTheCityIconPickers = iconPickers;
})();
