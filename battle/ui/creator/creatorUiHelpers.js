(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registry = battleModules.registry || {};

    const SKILL_TYPES = ['attack', 'guard', 'evade', 'counter'];
    const DAMAGE_TYPES = ['slash', 'pierce', 'blunt'];
    const SIN_TYPES = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
    const SKILL_TRIGGERS = ['onSelect', 'onUse', 'onHit', 'onClashWin', 'onClashLose', 'onAttackEnd'];
    const ONCE_PER_OPTIONS = ['battle', 'turn', 'skill', 'coin'];
    const TARGET_OPTIONS = [
        { value: '', label: 'Opponent (default)' },
        { value: 'self', label: 'Self' },
        { value: 'allAllies', label: 'All Allies' },
        { value: 'allOpponents', label: 'All Opponents' },
        { value: 'randomOpponent', label: 'Random Opponent' },
        { value: 'randomAlly', label: 'Random Ally' },
        { value: 'lowestHpOpponent', label: 'Lowest HP Opponent' },
        { value: 'highestHpOpponent', label: 'Highest HP Opponent' },
    ];
    const CONTEXT_FIELDS = [
        'dynamicDamageBonus',
        'staticDamageBonus',
        'flatPowerBonus',
        'coinPowerBonus',
        'clashPowerBonus',
        'critChanceBonus',
        'damageMultiplier',
        'additiveDamage',
    ];

    const CONDITION_LABELS = {
        always: 'Always (no condition)',
        hasStatus: 'Target has status',
        statusPotencyAtLeast: 'Status potency ≥',
        statusPotencyAtOrBelow: 'Status potency ≤',
        statusCountAtLeast: 'Status count ≥',
        statusCountAtOrBelow: 'Status count ≤',
        skillSinType: 'Skill sin type is',
        skillDamageType: 'Skill damage type is',
        skillType: 'Skill type is',
        skillIdIs: 'Skill ID is',
        damageAtLeast: 'Damage dealt ≥',
        hpPercentAtOrBelow: 'HP% ≤',
        hpPercentAtOrAbove: 'HP% ≥',
        hpAtOrBelow: 'HP ≤',
        hpAtOrAbove: 'HP ≥',
        spAtOrBelow: 'SP ≤',
        spAtOrAbove: 'SP ≥',
        speedAtLeast: 'Speed ≥',
        speedAtOrBelow: 'Speed ≤',
        criticalHit: 'Critical hit',
        targetStaggered: 'Target staggered',
        randomChance: 'Random chance %',
        coinIndex: 'Coin index is',
        skillCoinPowerSign: 'Coin power sign',
        unitSideIs: 'Unit side is',
        waveAtLeast: 'Wave ≥',
        waveAtOrBelow: 'Wave ≤',
        hasFlag: 'Has flag',
        counterAtLeast: 'Counter ≥',
        counterAtOrBelow: 'Counter ≤',
        encounterResourceAtLeast: 'Encounter resource ≥',
        encounterResourceAtOrBelow: 'Encounter resource ≤',
        unitResourceAtLeast: 'Unit resource ≥',
        unitResourceAtOrBelow: 'Unit resource ≤',
        resonanceAtLeast: 'Resonance ≥',
        resonanceAtOrBelow: 'Resonance ≤',
        panicStateIs: 'Panic state is',
        panicValueAtLeast: 'Panic value ≥',
        panicValueAtOrBelow: 'Panic value ≤',
        damageSourceIs: 'Damage source is',
        eventStatusIdIs: 'Event status is',
        lastEventTypeIs: 'Last event type is',
        statusCountGreaterThanStatus: 'Status count > other status',
        speedGreaterThan: 'Speed > other target',
    };

    const COMMON_EFFECT_TYPES = [
        'applyStatus',
        'adjustStatus',
        'consumeStatus',
        'dealFixedDamage',
        'healHp',
        'adjustSanity',
        'modifyContext',
        'modifyCoinMap',
        'clearStatus',
        'burstTremor',
        'gainShield',
        'modifyOffenseLevel',
        'modifyDefenseLevel',
        'modifySpeed',
        'setFollowUpSkill',
    ];

    const STATUS_TEMPLATES = [
        {
            id: 'blank',
            label: 'Blank status',
            definition: () => ({
                id: 'new-status',
                name: 'New Status',
                label: 'New Status',
                description: '',
                iconPath: '',
                stackModel: {
                    potency: { enabled: true, min: 0, max: 99, application: 'add' },
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {},
            }),
        },
        {
            id: 'burn-like',
            label: 'Burn-like (potency damage at turn end)',
            definition: () => ({
                id: 'my-burn',
                name: 'My Burn',
                label: 'My Burn',
                description: 'At turn end, take fixed damage equal to Potency, then lose 1 Count.',
                iconPath: 'assets/statuseffects/keywordstatus/Burn.png',
                stackModel: {
                    potency: { enabled: true, min: 0, max: 99, application: 'add' },
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {
                    turnEnd: [
                        {
                            type: 'dealFixedDamage',
                            target: 'self',
                            statusId: 'my-burn',
                            amount: {
                                statusPotency: { target: 'self', statusId: 'my-burn' },
                            },
                        },
                        {
                            type: 'adjustStatus',
                            target: 'self',
                            statusId: 'my-burn',
                            countDelta: -1,
                        },
                    ],
                },
            }),
        },
        {
            id: 'count-buff',
            label: 'Count-only buff (expires when count hits 0)',
            definition: () => ({
                id: 'my-buff',
                name: 'My Buff',
                label: 'My Buff',
                description: 'A count-based buff that expires when count reaches 0.',
                countOnly: true,
                stackModel: {
                    count: { enabled: true, min: 0, max: 10, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {},
            }),
        },
        {
            id: 'bleed-like',
            label: 'Bleed-like (potency damage on hit taken)',
            definition: () => ({
                id: 'my-bleed',
                name: 'My Bleed',
                label: 'My Bleed',
                description: 'When hit, take fixed damage equal to Potency.',
                stackModel: {
                    potency: { enabled: true, min: 0, max: 99, application: 'add' },
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {
                    hitTaken: [
                        {
                            type: 'dealFixedDamage',
                            target: 'self',
                            statusId: 'my-bleed',
                            amount: {
                                statusPotency: { target: 'self', statusId: 'my-bleed' },
                            },
                        },
                    ],
                },
            }),
        },
    ];

    function getPassiveHooks() {
        const labels = registry.passiveHookLabels || {};
        return Object.entries(labels).map(([id, label]) => ({ id, label }));
    }

    function getEffectTypes() {
        const defs = registry.effectDefinitions || {};
        const all = Object.entries(defs).map(([id, def]) => ({
            id,
            label: def.label || id,
        }));
        const commonSet = new Set(COMMON_EFFECT_TYPES);
        const common = all.filter((entry) => commonSet.has(entry.id));
        const rest = all.filter((entry) => !commonSet.has(entry.id));
        return { common, rest, all };
    }

    function getConditionTypes() {
        return Object.entries(CONDITION_LABELS).map(([id, label]) => ({ id, label }));
    }

    function isHookBlock(entry) {
        return entry && typeof entry === 'object' && Array.isArray(entry.actions);
    }

    function createDefaultUnitDefinition() {
        const sinResistances = Object.fromEntries(SIN_TYPES.map((key) => [key, 1]));
        return {
            id: 'new-unit',
            name: 'New Unit',
            level: 1,
            maxHp: 100,
            sp: 0,
            speedRange: [1, 1],
            defenseLevel: 0,
            staggerThresholds: [],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: sinResistances,
            },
            passives: [],
            sprites: {
                idle: '',
                moving: '',
                hurt: '',
                guard: '',
                evade: '',
                skills: {},
            },
            skills: [],
        };
    }

    function createDefaultStatusDefinition() {
        return STATUS_TEMPLATES[0].definition();
    }

    function normalizeNumberInput(value, fallback) {
        const trimmed = String(value ?? '').trim();
        if (!trimmed) {
            return fallback;
        }
        const parsed = Number(trimmed);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function normalizeStringInput(value, fallback = '') {
        const trimmed = String(value ?? '').trim();
        return trimmed ? trimmed : fallback;
    }

    function buildSelectOptions(options, selectedValue, escapeAttr) {
        return options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const label = typeof option === 'string' ? option : option.label;
            const selected = value === selectedValue ? 'selected' : '';
            return `<option value="${escapeAttr(value)}" ${selected}>${escapeAttr(label)}</option>`;
        }).join('');
    }

    function renderStatusSelect(statusList, selectedId, escapeAttr, attrs = '') {
        const options = [
            { value: '', label: '— Select status —' },
            ...statusList.map((entry) => ({
                value: entry.id,
                label: entry.label || entry.name || entry.id,
            })),
        ];
        return `<select ${attrs} style="width:100%;">${buildSelectOptions(options, selectedId, escapeAttr)}</select>`;
    }

    function renderTargetSelect(selectedValue, escapeAttr, attrs = '') {
        return `<select ${attrs} style="width:100%;">${buildSelectOptions(TARGET_OPTIONS, selectedValue || '', escapeAttr)}</select>`;
    }

    function renderAmountField(amount, escapeAttr, attrs = '') {
        if (typeof amount === 'number' && Number.isFinite(amount)) {
            return `<input ${attrs} inputmode="numeric" value="${escapeAttr(String(amount))}" placeholder="Amount" style="width:100%;" />`;
        }
        if (amount && typeof amount === 'object' && amount.statusPotency) {
            const source = amount.statusPotency;
            const statusId = source.statusId || '';
            const target = source.target || 'self';
            return `
                <div style="display:grid; gap:0.35rem;">
                    <span class="echoes-creator__hint">Amount = status potency</span>
                    <input ${attrs} data-amount-mode="statusPotency" data-amount-field="statusId" value="${escapeAttr(statusId)}" placeholder="Status ID for potency" style="width:100%;" />
                    <select ${attrs} data-amount-mode="statusPotency" data-amount-field="target" style="width:100%;">
                        <option value="self" ${target === 'self' ? 'selected' : ''}>Self potency</option>
                        <option value="opponent" ${target === 'opponent' ? 'selected' : ''}>Opponent potency</option>
                    </select>
                </div>
            `;
        }
        return `<input ${attrs} inputmode="numeric" value="${escapeAttr(String(amount ?? ''))}" placeholder="Amount (number)" style="width:100%;" />`;
    }

    function renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs) {
        const type = effect?.type || 'applyStatus';
        const statusList = catalog.statusList || [];

        const typeSelect = `
            <select ${fieldAttrs} data-field="type" style="width:100%;">
                <optgroup label="Common">
                    ${catalog.effectTypes.common.map((entry) => `
                        <option value="${escapeAttr(entry.id)}" ${entry.id === type ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                    `).join('')}
                </optgroup>
                <optgroup label="All Effects">
                    ${catalog.effectTypes.rest.map((entry) => `
                        <option value="${escapeAttr(entry.id)}" ${entry.id === type ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                    `).join('')}
                </optgroup>
            </select>
        `;

        const target = effect?.target || '';
        const targetSelect = renderTargetSelect(target, escapeAttr, `${fieldAttrs} data-field="target"`);

        let specificFields = '';

        switch (type) {
        case 'applyStatus':
        case 'queueStatus':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Status</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Potency</label>
                    <input ${fieldAttrs} data-field="potency" inputmode="numeric" value="${escapeAttr(String(effect?.potency ?? ''))}" placeholder="Potency" />
                    <label>Count</label>
                    <input ${fieldAttrs} data-field="count" inputmode="numeric" value="${escapeAttr(String(effect?.count ?? ''))}" placeholder="Count" />
                </div>
            `;
            break;
        case 'adjustStatus':
        case 'consumeStatus':
        case 'clearStatus':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Status</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Potency Δ</label>
                    <input ${fieldAttrs} data-field="potencyDelta" inputmode="numeric" value="${escapeAttr(String(effect?.potencyDelta ?? ''))}" placeholder="±" />
                    <label>Count Δ</label>
                    <input ${fieldAttrs} data-field="countDelta" inputmode="numeric" value="${escapeAttr(String(effect?.countDelta ?? ''))}" placeholder="±" />
                </div>
            `;
            break;
        case 'dealFixedDamage':
        case 'dealHpPercentDamage':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Amount</label>
                    ${renderAmountField(effect?.amount, escapeAttr, `${fieldAttrs} data-field="amount"`)}
                </div>
                <div class="echoes-creator__field-row">
                    <label>Linked status (optional)</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                </div>
            `;
            break;
        case 'healHp':
        case 'healHpPercent':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Heal amount</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? effect?.amount ?? ''))}" placeholder="HP healed" />
                </div>
            `;
            break;
        case 'adjustSanity':
        case 'setSanity':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>SP change</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="± SP" />
                    <label>Reason (optional)</label>
                    <input ${fieldAttrs} data-field="reason" value="${escapeAttr(String(effect?.reason || ''))}" placeholder="reason" />
                </div>
            `;
            break;
        case 'modifyContext':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Field</label>
                    <select ${fieldAttrs} data-field="field" style="width:100%;">
                        ${buildSelectOptions(CONTEXT_FIELDS, effect?.field || 'dynamicDamageBonus', escapeAttr)}
                    </select>
                    <label>Operation</label>
                    <select ${fieldAttrs} data-field="operation" style="width:100%;">
                        <option value="add" ${effect?.operation === 'add' ? 'selected' : ''}>Add</option>
                        <option value="set" ${effect?.operation === 'set' ? 'selected' : ''}>Set</option>
                        <option value="addStatusCountScaled" ${effect?.operation === 'addStatusCountScaled' ? 'selected' : ''}>Add × status count</option>
                        <option value="addStatusPotencyScaled" ${effect?.operation === 'addStatusPotencyScaled' ? 'selected' : ''}>Add × status potency</option>
                    </select>
                    <label>Value</label>
                    <input ${fieldAttrs} data-field="value" inputmode="decimal" value="${escapeAttr(String(effect?.value ?? effect?.multiplier ?? ''))}" placeholder="value" />
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Status (for scaled ops)</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                    <label>Cap (optional)</label>
                    <input ${fieldAttrs} data-field="cap" inputmode="decimal" value="${escapeAttr(String(effect?.cap ?? ''))}" placeholder="cap" />
                </div>
            `;
            break;
        case 'burstTremor':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Tremor status</label>
                    ${renderStatusSelect(statusList, effect?.statusId || 'tremor', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                </div>
            `;
            break;
        case 'setFollowUpSkill':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Skill ID</label>
                    <input ${fieldAttrs} data-field="skillId" value="${escapeAttr(String(effect?.skillId || ''))}" placeholder="skill-id" />
                </div>
            `;
            break;
        case 'gainShield':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Shield ID</label>
                    <input ${fieldAttrs} data-field="shieldId" value="${escapeAttr(String(effect?.shieldId || ''))}" placeholder="shield-id" />
                    <label>Amount</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="shield HP" />
                </div>
            `;
            break;
        case 'modifyOffenseLevel':
        case 'modifyDefenseLevel':
        case 'modifySpeed':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Change</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="± levels" />
                    <label>Operation</label>
                    <select ${fieldAttrs} data-field="operation" style="width:100%;">
                        <option value="add" ${!effect?.operation || effect?.operation === 'add' ? 'selected' : ''}>Add</option>
                        <option value="set" ${effect?.operation === 'set' ? 'selected' : ''}>Set</option>
                    </select>
                </div>
            `;
            break;
        default:
            specificFields = `
                <div class="echoes-creator__hint">This effect type uses advanced fields. Edit them in Advanced JSON below.</div>
            `;
            break;
        }

        return `
            <div class="echoes-creator__effect-card">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Action</label>
                    ${typeSelect}
                    <label>Target</label>
                    ${targetSelect}
                </div>
                ${specificFields}
                <details class="echoes-creator__advanced">
                    <summary>Advanced JSON</summary>
                    <textarea ${fieldAttrs} data-field="__raw" rows="4" class="echoes-creator__raw-json">${escapeHtml(JSON.stringify(effect, null, 2))}</textarea>
                </details>
            </div>
        `;
    }

    function renderConditionRow(condition, catalog, escapeAttr, escapeHtml, fieldAttrs) {
        const type = condition?.type || 'always';
        const statusList = catalog.statusList || [];
        const conditionTypes = catalog.conditionTypes || [];

        const typeSelect = `
            <select ${fieldAttrs} data-field="type" style="width:100%;">
                ${conditionTypes.map((entry) => `
                    <option value="${escapeAttr(entry.id)}" ${entry.id === type ? 'selected' : ''}>${escapeHtml(entry.label)}</option>
                `).join('')}
            </select>
        `;

        let valueFields = '';
        if (type === 'always') {
            valueFields = '<span class="echoes-creator__hint">No extra fields needed.</span>';
        } else if (type === 'hasStatus') {
            valueFields = renderStatusSelect(statusList, condition?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`);
        } else if (type === 'skillSinType') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">${buildSelectOptions(SIN_TYPES, condition?.value || 'wrath', escapeAttr)}</select>`;
        } else if (type === 'skillDamageType') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">${buildSelectOptions(DAMAGE_TYPES, condition?.value || 'slash', escapeAttr)}</select>`;
        } else if (type === 'skillType') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">${buildSelectOptions(SKILL_TYPES, condition?.value || 'attack', escapeAttr)}</select>`;
        } else if (type === 'skillCoinPowerSign') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">
                <option value="plus" ${condition?.value === 'plus' ? 'selected' : ''}>Plus coin</option>
                <option value="minus" ${condition?.value === 'minus' ? 'selected' : ''}>Minus coin</option>
            </select>`;
        } else if (type === 'unitSideIs') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">
                <option value="player" ${condition?.value === 'player' ? 'selected' : ''}>Player</option>
                <option value="enemy" ${condition?.value === 'enemy' ? 'selected' : ''}>Enemy</option>
            </select>`;
        } else if (type === 'damageSourceIs') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">
                <option value="skill" ${condition?.value === 'skill' ? 'selected' : ''}>Skill</option>
                <option value="status" ${condition?.value === 'status' ? 'selected' : ''}>Status</option>
                <option value="burst" ${condition?.value === 'burst' ? 'selected' : ''}>Burst</option>
            </select>`;
        } else if (type === 'criticalHit' || type === 'targetStaggered') {
            valueFields = `<select ${fieldAttrs} data-field="value" style="width:100%;">
                <option value="true" ${condition?.value === true ? 'selected' : ''}>Yes</option>
                <option value="false" ${condition?.value === false ? 'selected' : ''}>No</option>
            </select>`;
        } else if (['statusPotencyAtLeast', 'statusPotencyAtOrBelow', 'statusCountAtLeast', 'statusCountAtOrBelow'].includes(type)) {
            valueFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    ${renderStatusSelect(statusList, condition?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(condition?.value ?? ''))}" placeholder="value" />
                </div>
            `;
        } else if (['encounterResourceAtLeast', 'encounterResourceAtOrBelow', 'unitResourceAtLeast', 'unitResourceAtOrBelow'].includes(type)) {
            valueFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <input ${fieldAttrs} data-field="resourceId" value="${escapeAttr(String(condition?.resourceId || ''))}" placeholder="resource ID" />
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(condition?.value ?? ''))}" placeholder="value" />
                </div>
            `;
        } else if (['hasFlag', 'counterAtLeast', 'counterAtOrBelow'].includes(type)) {
            const idField = type === 'hasFlag' ? 'flagId' : 'counterId';
            valueFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <input ${fieldAttrs} data-field="${idField}" value="${escapeAttr(String(condition?.[idField] || ''))}" placeholder="${idField}" />
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(condition?.value ?? ''))}" placeholder="value" />
                </div>
            `;
        } else if (['resonanceAtLeast', 'resonanceAtOrBelow', 'absoluteResonanceAtLeast', 'absoluteResonanceAtOrBelow'].includes(type)) {
            valueFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <select ${fieldAttrs} data-field="sinType" style="width:100%;">${buildSelectOptions(SIN_TYPES, condition?.sinType || 'wrath', escapeAttr)}</select>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(condition?.value ?? ''))}" placeholder="value" />
                </div>
            `;
        } else if (type === 'statusCountGreaterThanStatus') {
            valueFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    ${renderStatusSelect(statusList, condition?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                    ${renderStatusSelect(statusList, condition?.otherStatusId || '', escapeAttr, `${fieldAttrs} data-field="otherStatusId"`)}
                    <input ${fieldAttrs} data-field="offset" inputmode="numeric" value="${escapeAttr(String(condition?.offset ?? 0))}" placeholder="offset" />
                </div>
            `;
        } else {
            valueFields = `<input ${fieldAttrs} data-field="value" value="${escapeAttr(String(condition?.value ?? condition?.skillId ?? ''))}" placeholder="value" style="width:100%;" />`;
        }

        return `
            <div class="echoes-creator__condition-row">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>If</label>
                    ${typeSelect}
                    <div>${valueFields}</div>
                </div>
            </div>
        `;
    }

    function renderHookBlock(block, catalog, escapeAttr, escapeHtml, blockAttrs, options = {}) {
        const conditions = Array.isArray(block?.conditions) ? block.conditions : [];
        const actions = Array.isArray(block?.actions) ? block.actions : [];
        const oncePer = block?.oncePer || '';

        const conditionRows = conditions.map((condition, condIndex) => {
            const fieldAttrs = `${blockAttrs} data-condition-index="${condIndex}" data-action="creator-hook-condition-field"`;
            return `
                <div class="echoes-creator__condition-wrap">
                    ${renderConditionRow(condition, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-remove-condition" data-condition-index="${condIndex}">Remove condition</button>
                </div>
            `;
        }).join('');

        const actionRows = actions.map((action, actionIndex) => {
            const fieldAttrs = `${blockAttrs} data-action-index="${actionIndex}" data-action="creator-hook-action-field"`;
            return `
                <div class="echoes-creator__action-wrap">
                    ${renderEffectFields(action, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-remove-action" data-action-index="${actionIndex}">Remove action</button>
                </div>
            `;
        }).join('');

        return `
            <div class="echoes-creator__hook-block">
                <div class="echoes-creator__hook-block-header">
                    <span class="echoes-creator__badge">Conditional block</span>
                    <select ${blockAttrs} data-action="creator-hook-block-field" data-field="oncePer" style="max-width: 10rem;">
                        <option value="" ${!oncePer ? 'selected' : ''}>No limit</option>
                        ${ONCE_PER_OPTIONS.map((entry) => `<option value="${entry}" ${oncePer === entry ? 'selected' : ''}>Once per ${entry}</option>`).join('')}
                    </select>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-remove-block">Remove block</button>
                </div>
                <div class="echoes-creator__section">
                    <div class="echoes-creator__section-title">WHEN (conditions)</div>
                    ${conditionRows || '<span class="echoes-creator__hint">No conditions — always runs.</span>'}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-add-condition">+ Add condition</button>
                </div>
                <div class="echoes-creator__section">
                    <div class="echoes-creator__section-title">DO (actions)</div>
                    ${actionRows || '<span class="echoes-creator__hint">Add at least one action.</span>'}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-add-action">+ Add action</button>
                </div>
            </div>
        `;
    }

    function renderSimpleEffect(effect, catalog, escapeAttr, escapeHtml, effectAttrs) {
        const fieldAttrs = `${effectAttrs} data-action="creator-simple-effect-field"`;
        return `
            <div class="echoes-creator__simple-effect">
                <span class="echoes-creator__badge">Simple action</span>
                ${renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${effectAttrs} data-action="creator-simple-effect-remove">Remove</button>
            </div>
        `;
    }

    function renderHooksEditor(hooks, catalog, escapeAttr, escapeHtml, scopeAttrs) {
        const hookMap = hooks && typeof hooks === 'object' && !Array.isArray(hooks) ? hooks : {};
        const hookNames = Object.keys(hookMap);
        const passiveHooks = catalog.passiveHooks || [];

        if (!hookNames.length) {
            return `
                <div class="echoes-creator__empty">No behavior hooks yet. Add a trigger event below (e.g. Turn End, Hit Dealt).</div>
                ${renderAddHookEventBar(passiveHooks, escapeAttr, scopeAttrs)}
            `;
        }

        const sections = hookNames.map((hookName) => {
            const entries = Array.isArray(hookMap[hookName]) ? hookMap[hookName] : [];
            const hookLabel = registry.getTriggerLabel?.(hookName) || catalog.passiveHooks.find((h) => h.id === hookName)?.label || hookName;
            const hookAttrs = `${scopeAttrs} data-hook-name="${escapeAttr(hookName)}"`;

            const entryMarkup = entries.map((entry, entryIndex) => {
                const entryAttrs = `${hookAttrs} data-hook-entry-index="${entryIndex}"`;
                if (isHookBlock(entry)) {
                    return renderHookBlock(entry, catalog, escapeAttr, escapeHtml, entryAttrs);
                }
                return renderSimpleEffect(entry, catalog, escapeAttr, escapeHtml, entryAttrs);
            }).join('');

            return `
                <details class="echoes-creator__hook-event" open>
                    <summary class="echoes-creator__hook-event-title">
                        <span>${escapeHtml(hookLabel)}</span>
                        <span class="echoes-battle-panel__combat-pill">${escapeHtml(hookName)}</span>
                    </summary>
                    <div class="echoes-creator__hook-event-body">
                        ${entryMarkup}
                        <div class="echoes-creator__hook-event-actions">
                            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${hookAttrs} data-action="creator-hook-add-simple">+ Simple action</button>
                            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${hookAttrs} data-action="creator-hook-add-block">+ Conditional block</button>
                            <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${hookAttrs} data-action="creator-hook-remove-event">Remove event</button>
                        </div>
                    </div>
                </details>
            `;
        }).join('');

        return `
            <div class="echoes-creator__hooks">
                ${sections}
                ${renderAddHookEventBar(passiveHooks, escapeAttr, scopeAttrs)}
            </div>
        `;
    }

    function renderAddHookEventBar(passiveHooks, escapeAttr, scopeAttrs) {
        return `
            <div class="echoes-creator__add-hook-bar">
                <label class="echoes-creator__hint">Add trigger event:</label>
                <select data-action="creator-hook-pick-event" ${scopeAttrs} style="flex:1; min-width:12rem;">
                    <option value="">— Pick when this runs —</option>
                    ${passiveHooks.map((hook) => `<option value="${escapeAttr(hook.id)}">${escapeAttr(hook.label)}</option>`).join('')}
                </select>
                <button class="echoes-battle-panel__combat-button" type="button" ${scopeAttrs} data-action="creator-hook-add-event">Add Event</button>
            </div>
        `;
    }

    function renderSkillEffectEditor(effect, effectIndex, skillIndex, catalog, escapeAttr, escapeHtml) {
        const trigger = effect?.trigger || 'onHit';
        const triggerOptions = SKILL_TRIGGERS.map((entry) => {
            const label = typeof registry.getTriggerLabel === 'function' ? registry.getTriggerLabel(entry) : entry;
            return `<option value="${escapeAttr(entry)}" ${entry === trigger ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');

        const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
        return `
            <div class="echoes-creator__skill-effect">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>When</label>
                    <select ${fieldAttrs} data-field="trigger" style="width:100%;">${triggerOptions}</select>
                </div>
                ${renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs)}
                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove effect</button>
            </div>
        `;
    }

    function buildCatalog(statusList) {
        return {
            statusList: statusList || [],
            effectTypes: getEffectTypes(),
            conditionTypes: getConditionTypes(),
            passiveHooks: getPassiveHooks(),
            skillTypes: SKILL_TYPES,
            damageTypes: DAMAGE_TYPES,
            sinTypes: SIN_TYPES,
            skillTriggers: SKILL_TRIGGERS,
        };
    }

    function applyEffectFieldUpdate(effect, field, rawValue) {
        if (!effect || typeof effect !== 'object') {
            return;
        }
        if (field === '__raw') {
            try {
                const parsed = JSON.parse(rawValue || '{}');
                Object.keys(effect).forEach((key) => delete effect[key]);
                Object.assign(effect, parsed);
            } catch {
                // ignore invalid json while typing
            }
            return;
        }
        if (field === 'type') {
            effect.type = rawValue;
            const keep = { type: rawValue, trigger: effect.trigger };
            if (effect.target) {
                keep.target = effect.target;
            }
            Object.keys(effect).forEach((key) => delete effect[key]);
            Object.assign(effect, keep);
            return;
        }
        if (field === 'target' && !rawValue) {
            delete effect.target;
            return;
        }
        if (field === 'amount') {
            const trimmed = String(rawValue ?? '').trim();
            if (!trimmed) {
                delete effect.amount;
                return;
            }
            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                effect.amount = asNumber;
                return;
            }
            return;
        }
        if (['potency', 'count', 'coinIndex', 'value', 'potencyDelta', 'countDelta', 'cap'].includes(field)) {
            const trimmed = String(rawValue ?? '').trim();
            if (!trimmed) {
                delete effect[field];
                return;
            }
            const parsed = Number(trimmed);
            effect[field] = Number.isFinite(parsed) ? parsed : trimmed;
            return;
        }
        if (field === 'operation' && rawValue === 'addStatusCountScaled') {
            effect.operation = rawValue;
            if (!effect.multiplier && effect.value != null) {
                effect.multiplier = effect.value;
                delete effect.value;
            }
            return;
        }
        const trimmed = String(rawValue ?? '').trim();
        if (!trimmed) {
            delete effect[field];
            return;
        }
        effect[field] = trimmed;
    }

    function applyConditionFieldUpdate(condition, field, rawValue) {
        if (!condition || typeof condition !== 'object') {
            return;
        }
        if (field === 'type') {
            const next = { type: rawValue };
            if (rawValue === 'always') {
                Object.keys(condition).forEach((key) => delete condition[key]);
                condition.type = 'always';
                return;
            }
            Object.keys(condition).forEach((key) => delete condition[key]);
            Object.assign(condition, next);
            return;
        }
        if (field === 'value') {
            if (rawValue === 'true') {
                condition.value = true;
                return;
            }
            if (rawValue === 'false') {
                condition.value = false;
                return;
            }
            const trimmed = String(rawValue ?? '').trim();
            if (!trimmed) {
                delete condition.value;
                return;
            }
            const asNumber = Number(trimmed);
            condition.value = Number.isFinite(asNumber) && String(asNumber) === trimmed ? asNumber : trimmed;
            return;
        }
        const trimmed = String(rawValue ?? '').trim();
        if (!trimmed) {
            delete condition[field];
            return;
        }
        const asNumber = Number(trimmed);
        condition[field] = Number.isFinite(asNumber) && String(asNumber) === trimmed ? asNumber : trimmed;
    }

    const CreatorUi = {
        SKILL_TYPES,
        DAMAGE_TYPES,
        SIN_TYPES,
        SKILL_TRIGGERS,
        STATUS_TEMPLATES,
        createDefaultUnitDefinition,
        createDefaultStatusDefinition,
        buildCatalog,
        isHookBlock,
        renderHooksEditor,
        renderSkillEffectEditor,
        applyEffectFieldUpdate,
        applyConditionFieldUpdate,
        normalizeNumberInput,
        normalizeStringInput,
        buildSelectOptions,
        renderTargetSelect,
        renderStatusSelect,
    };

    battleModules.creatorUi = CreatorUi;
    window.EchoesOfTheCityCreatorUi = CreatorUi;
})();
