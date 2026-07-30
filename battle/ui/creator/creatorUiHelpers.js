(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});
    const registry = battleModules.registry || {};

    const SKILL_TYPES = ['attack', 'guard', 'evade', 'counter'];
    const DAMAGE_TYPES = ['slash', 'pierce', 'blunt'];
    const SIN_TYPES = ['wrath', 'lust', 'sloth', 'gluttony', 'gloom', 'pride', 'envy'];
    const SKILL_TRIGGERS = ['onSelect', 'onUse', 'onHit', 'onClashWin', 'onClashLose', 'onAttackEnd'];
    const SKILL_TRIGGER_LABELS = {
        onSelect: 'When skill is selected (before coins)',
        onUse: 'When skill is used',
        onHit: 'When attack hits',
        onClashWin: 'When clash is won',
        onClashLose: 'When clash is lost',
        onAttackEnd: 'When attack ends',
    };
    const ONCE_PER_OPTIONS = ['battle', 'turn', 'skill', 'coin'];
    const TARGET_OPTIONS = [
        { value: '', label: 'Opponent (default)' },
        { value: 'self', label: 'Self' },
        { value: 'opponent', label: 'Opponent' },
        { value: 'allAllies', label: 'All allies' },
        { value: 'allOpponents', label: 'All opponents' },
        { value: 'randomOpponent', label: 'Random opponent' },
        { value: 'randomAlly', label: 'Random ally' },
        { value: 'lowestHpOpponent', label: 'Lowest HP opponent' },
        { value: 'highestHpOpponent', label: 'Highest HP opponent' },
        { value: 'lowestHpAlly', label: 'Lowest HP ally' },
        { value: 'highestHpAlly', label: 'Highest HP ally' },
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
        always: 'Always (no check)',
        hasStatus: 'Has status',
        statusPotencyAtLeast: 'Status potency is at least',
        statusPotencyAtOrBelow: 'Status potency is at most',
        statusCountAtLeast: 'Status count is at least',
        statusCountAtOrBelow: 'Status count is at most',
        skillSinType: 'Skill sin type is',
        skillDamageType: 'Skill damage type is',
        skillType: 'Skill type is',
        skillIdIs: 'Skill ID is',
        skillHasTag: 'Skill has tag',
        damageAtLeast: 'Damage dealt is at least',
        hpPercentAtOrBelow: 'HP% is at most',
        hpPercentAtOrAbove: 'HP% is at least',
        hpAtOrBelow: 'HP is at most',
        hpAtOrAbove: 'HP is at least',
        spAtOrBelow: 'SP is at most',
        spAtOrAbove: 'SP is at least',
        speedAtLeast: 'Speed is at least',
        speedAtOrBelow: 'Speed is at most',
        criticalHit: 'Critical hit',
        targetStaggered: 'Target is staggered',
        randomChance: 'Random chance (%)',
        coinIndex: 'Coin index is',
        skillCoinPowerSign: 'Coin power sign',
        unitSideIs: 'Unit side is',
        waveAtLeast: 'Wave is at least',
        waveAtOrBelow: 'Wave is at most',
        hasFlag: 'Has flag',
        counterAtLeast: 'Counter is at least',
        counterAtOrBelow: 'Counter is at most',
        encounterResourceAtLeast: 'Encounter resource is at least',
        encounterResourceAtOrBelow: 'Encounter resource is at most',
        unitResourceAtLeast: 'Unit resource is at least',
        unitResourceAtOrBelow: 'Unit resource is at most',
        resonanceAtLeast: 'Resonance is at least',
        resonanceAtOrBelow: 'Resonance is at most',
        absoluteResonanceAtLeast: 'Absolute resonance is at least',
        absoluteResonanceAtOrBelow: 'Absolute resonance is at most',
        panicStateIs: 'Panic state is',
        panicValueAtLeast: 'Panic value is at least',
        panicValueAtOrBelow: 'Panic value is at most',
        damageSourceIs: 'Damage source is',
        eventStatusIdIs: 'Event status is',
        lastEventTypeIs: 'Last event type is',
        statusCountGreaterThanStatus: 'Status count > other status',
        speedGreaterThan: 'Speed > other target',
    };

    const PASSIVE_HOOK_GROUPS = [
        {
            label: 'Turn & battle',
            hooks: ['battleStart', 'turnStart', 'turnEnd', 'battleEnd', 'unitDefeated'],
        },
        {
            label: 'Combat hits & damage',
            hooks: ['hitDealt', 'hitTaken', 'damageDealt', 'damageTaken', 'beforeDamage', 'afterDamage', 'attackEnd'],
        },
        {
            label: 'Coins & skills',
            hooks: ['beforeCoinRoll', 'coinRoll', 'afterCoinRoll', 'skillSelected'],
        },
        {
            label: 'Status events',
            hooks: ['statusApplied', 'statusChanged', 'statusExpired', 'statusConsumed', 'statusInflicted', 'statusReceived', 'beforeStatusTrigger', 'afterStatusTrigger'],
        },
        {
            label: 'Healing',
            hooks: ['beforeHeal', 'afterHeal'],
        },
    ];

    const COIN_MAP_FIELD_OPTIONS = [
        { value: 'coinPowerBonusByCoin', label: 'Coin power bonus' },
        { value: 'criticalBonusByCoin', label: 'Critical bonus' },
        { value: 'critChanceBonusByCoin', label: 'Crit chance bonus' },
        { value: 'staticDamageBonusByCoin', label: 'Static damage bonus' },
        { value: 'dynamicDamageBonusByCoin', label: 'Dynamic damage bonus' },
        { value: 'clashRoundBonusByCoin', label: 'Clash round bonus' },
        { value: 'observationBonusByCoin', label: 'Observation bonus' },
        { value: 'additiveDamageByCoin', label: 'Additive damage' },
        { value: 'extraCritDamageByCoin', label: 'Extra crit damage' },
        { value: 'critFinalPowerBonusByCoin', label: 'Crit final power bonus' },
        { value: 'damageCapByCoin', label: 'Damage cap' },
    ];

    const COMMON_EFFECT_TYPES = [
        'applyStatus',
        'adjustStatus',
        'consumeStatus',
        'clearStatus',
        'dealFixedDamage',
        'healHp',
        'adjustSanity',
        'modifyContext',
        'modifyCoinMap',
        'burstTremor',
        'gainShield',
        'modifyOffenseLevel',
        'modifyDefenseLevel',
        'modifySpeed',
        'modifyPhysicalResistance',
        'modifySinResistance',
        'adjustEncounterResource',
        'adjustUnitResource',
        'copyStatus',
        'transferStatus',
        'convertStatus',
        'clearStatusesByTag',
        'setFollowUpSkill',
    ];

    const SKILL_EFFECT_PRESETS = [
        { label: 'Apply status on hit', trigger: 'onHit', type: 'applyStatus', statusId: '', potency: 1, count: 1 },
        { label: 'Heal self on hit', trigger: 'onHit', type: 'healHp', target: 'self', value: 5 },
        { label: 'Coin power bonus (coin 1)', trigger: 'onSelect', type: 'modifyCoinMap', field: 'coinPowerBonusByCoin', coinIndex: 1, value: 2 },
        { label: 'Damage bonus on select', trigger: 'onSelect', type: 'modifyContext', field: 'dynamicDamageBonus', operation: 'add', value: 3 },
        { label: 'SP gain on clash win', trigger: 'onClashWin', type: 'adjustSanity', target: 'self', value: 5 },
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

    function getAmountMode(amount) {
        if (typeof amount === 'number' && Number.isFinite(amount)) {
            return 'number';
        }
        if (amount && typeof amount === 'object' && amount.statusPotency) {
            return 'statusPotency';
        }
        if (amount && typeof amount === 'object' && amount.statusCount) {
            return 'statusCount';
        }
        return 'number';
    }

    function renderAmountField(amount, escapeAttr, attrs = '') {
        const mode = getAmountMode(amount);
        const numericValue = typeof amount === 'number' ? amount : '';
        const potencySource = amount?.statusPotency || {};
        const countSource = amount?.statusCount || {};

        return `
            <div class="echoes-creator__amount-editor">
                <select ${attrs} data-field="amountMode" style="width:100%; margin-bottom:0.35rem;">
                    <option value="number" ${mode === 'number' ? 'selected' : ''}>Fixed number</option>
                    <option value="statusPotency" ${mode === 'statusPotency' ? 'selected' : ''}>Equals status potency</option>
                    <option value="statusCount" ${mode === 'statusCount' ? 'selected' : ''}>Equals status count</option>
                </select>
                ${mode === 'number'
                    ? `<input ${attrs} data-field="amount" inputmode="numeric" value="${escapeAttr(String(numericValue))}" placeholder="Amount" style="width:100%;" />`
                    : mode === 'statusPotency'
                        ? `
                            <div class="echoes-creator__field-row echoes-creator__field-row--2">
                                <input ${attrs} data-amount-mode="statusPotency" data-amount-field="statusId" value="${escapeAttr(String(potencySource.statusId || ''))}" placeholder="Status ID" />
                                <select ${attrs} data-amount-mode="statusPotency" data-amount-field="target" style="width:100%;">
                                    <option value="self" ${potencySource.target === 'self' || !potencySource.target ? 'selected' : ''}>Self</option>
                                    <option value="opponent" ${potencySource.target === 'opponent' ? 'selected' : ''}>Opponent</option>
                                </select>
                            </div>
                        `
                        : `
                            <div class="echoes-creator__field-row echoes-creator__field-row--2">
                                <input ${attrs} data-amount-mode="statusCount" data-amount-field="statusId" value="${escapeAttr(String(countSource.statusId || ''))}" placeholder="Status ID" />
                                <select ${attrs} data-amount-mode="statusCount" data-amount-field="target" style="width:100%;">
                                    <option value="self" ${countSource.target === 'self' || !countSource.target ? 'selected' : ''}>Self</option>
                                    <option value="opponent" ${countSource.target === 'opponent' ? 'selected' : ''}>Opponent</option>
                                </select>
                            </div>
                        `}
            </div>
        `;
    }

    function renderEffectFilters(effect, escapeAttr, fieldAttrs, options = {}) {
        if (!options.showFilters) {
            return '';
        }
        const coinIndex = effect?.coinIndex ?? '';
        const criticalOnly = Boolean(effect?.criticalOnly);
        const outcome = effect?.outcome || '';
        const minPotency = effect?.minStatusPotency ?? '';
        const statusSource = effect?.statusSource || 'self';

        return `
            <details class="echoes-creator__filters">
                <summary>Optional filters (coin, crit, clash outcome)</summary>
                <div class="echoes-creator__field-row echoes-creator__field-row--3" style="margin-top:0.5rem;">
                    <label>Coin #</label>
                    <input ${fieldAttrs} data-field="coinIndex" inputmode="numeric" value="${escapeAttr(String(coinIndex))}" placeholder="Any coin" />
                    <label class="echoes-creator__checkbox" style="align-self:center;">
                        <input type="checkbox" ${fieldAttrs} data-field="criticalOnly" ${criticalOnly ? 'checked' : ''} />
                        Critical only
                    </label>
                    <label class="echoes-creator__checkbox" style="align-self:center;">
                        <input type="checkbox" ${fieldAttrs} data-field="headsOnly" ${effect?.headsOnly ? 'checked' : ''} />
                        Heads only
                    </label>
                    <label class="echoes-creator__checkbox" style="align-self:center;">
                        <input type="checkbox" ${fieldAttrs} data-field="tailsOnly" ${effect?.tailsOnly ? 'checked' : ''} />
                        Tails only
                    </label>
                    <label>Clash outcome</label>
                    <select ${fieldAttrs} data-field="outcome" style="width:100%;">
                        <option value="" ${!outcome ? 'selected' : ''}>Any</option>
                        <option value="win" ${outcome === 'win' ? 'selected' : ''}>Clash win</option>
                        <option value="lose" ${outcome === 'lose' ? 'selected' : ''}>Clash lose</option>
                    </select>
                </div>
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Min status potency</label>
                    <input ${fieldAttrs} data-field="minStatusPotency" inputmode="numeric" value="${escapeAttr(String(minPotency))}" placeholder="Optional" />
                    <label>Check on</label>
                    <select ${fieldAttrs} data-field="statusSource" style="width:100%;">
                        <option value="self" ${statusSource === 'self' ? 'selected' : ''}>Self</option>
                        <option value="opponent" ${statusSource === 'opponent' ? 'selected' : ''}>Opponent</option>
                    </select>
                </div>
            </details>
        `;
    }

    function renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs, options = {}) {
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
                    ${renderAmountField(effect?.value ?? effect?.amount, escapeAttr, `${fieldAttrs} data-field="amount"`)}
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
                    ${renderAmountField(effect?.value ?? effect?.amount, escapeAttr, `${fieldAttrs} data-field="amount"`)}
                    <label>Operation</label>
                    <select ${fieldAttrs} data-field="operation" style="width:100%;">
                        <option value="add" ${!effect?.operation || effect?.operation === 'add' ? 'selected' : ''}>Add</option>
                        <option value="set" ${effect?.operation === 'set' ? 'selected' : ''}>Set</option>
                    </select>
                </div>
            `;
            break;
        case 'modifyCoinMap':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Coin stat</label>
                    <select ${fieldAttrs} data-field="field" style="width:100%;">
                        ${buildSelectOptions(COIN_MAP_FIELD_OPTIONS, effect?.field || 'coinPowerBonusByCoin', escapeAttr)}
                    </select>
                    <label>Coin #</label>
                    <input ${fieldAttrs} data-field="coinIndex" inputmode="numeric" value="${escapeAttr(String(effect?.coinIndex ?? 1))}" placeholder="1" />
                    <label>Value</label>
                    <input ${fieldAttrs} data-field="value" inputmode="decimal" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="Bonus" />
                </div>
            `;
            break;
        case 'modifyPhysicalResistance':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Damage type</label>
                    <select ${fieldAttrs} data-field="damageType" style="width:100%;">${buildSelectOptions(DAMAGE_TYPES, effect?.damageType || 'slash', escapeAttr)}</select>
                    <label>Multiplier</label>
                    <input ${fieldAttrs} data-field="value" inputmode="decimal" value="${escapeAttr(String(effect?.value ?? 1))}" placeholder="1.0" />
                    <label>Apply to</label>
                    <select ${fieldAttrs} data-field="operation" style="width:100%;">
                        <option value="multiplyBase" ${!effect?.operation || effect?.operation === 'multiplyBase' ? 'selected' : ''}>Base resistance</option>
                        <option value="multiplyCurrent" ${effect?.operation === 'multiplyCurrent' ? 'selected' : ''}>Current resistance</option>
                    </select>
                </div>
            `;
            break;
        case 'modifySinResistance':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--3">
                    <label>Sin type</label>
                    <select ${fieldAttrs} data-field="sinType" style="width:100%;">${buildSelectOptions(SIN_TYPES, effect?.sinType || 'wrath', escapeAttr)}</select>
                    <label>Multiplier</label>
                    <input ${fieldAttrs} data-field="value" inputmode="decimal" value="${escapeAttr(String(effect?.value ?? 1))}" placeholder="1.0" />
                    <label>Apply to</label>
                    <select ${fieldAttrs} data-field="operation" style="width:100%;">
                        <option value="multiplyBase" ${!effect?.operation || effect?.operation === 'multiplyBase' ? 'selected' : ''}>Base resistance</option>
                        <option value="multiplyCurrent" ${effect?.operation === 'multiplyCurrent' ? 'selected' : ''}>Current resistance</option>
                    </select>
                </div>
            `;
            break;
        case 'clearShield':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Shield ID</label>
                    <input ${fieldAttrs} data-field="shieldId" value="${escapeAttr(String(effect?.shieldId || ''))}" placeholder="shield-id" />
                </div>
            `;
            break;
        case 'adjustEncounterResource':
        case 'spendEncounterResource':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Resource ID</label>
                    <input ${fieldAttrs} data-field="resourceId" value="${escapeAttr(String(effect?.resourceId || ''))}" placeholder="resource-id" />
                    <label>Amount</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="± amount" />
                </div>
            `;
            break;
        case 'adjustUnitResource':
        case 'spendUnitResource':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Resource ID</label>
                    <input ${fieldAttrs} data-field="resourceId" value="${escapeAttr(String(effect?.resourceId || ''))}" placeholder="resource-id" />
                    <label>Amount</label>
                    <input ${fieldAttrs} data-field="value" inputmode="numeric" value="${escapeAttr(String(effect?.value ?? ''))}" placeholder="± amount" />
                </div>
            `;
            break;
        case 'copyStatus':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Status to copy</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                    <label>Copy from</label>
                    <select ${fieldAttrs} data-field="source" style="width:100%;">
                        <option value="self" ${effect?.source === 'self' || !effect?.source ? 'selected' : ''}>Self</option>
                        <option value="opponent" ${effect?.source === 'opponent' ? 'selected' : ''}>Opponent</option>
                    </select>
                </div>
            `;
            break;
        case 'transferStatus':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Status</label>
                    ${renderStatusSelect(statusList, effect?.statusId || '', escapeAttr, `${fieldAttrs} data-field="statusId"`)}
                    <label>Transfer to</label>
                    ${renderTargetSelect(effect?.destination || '', escapeAttr, `${fieldAttrs} data-field="destination"`)}
                </div>
            `;
            break;
        case 'convertStatus':
            specificFields = `
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>From status</label>
                    ${renderStatusSelect(statusList, effect?.fromStatusId || '', escapeAttr, `${fieldAttrs} data-field="fromStatusId"`)}
                    <label>To status</label>
                    ${renderStatusSelect(statusList, effect?.toStatusId || '', escapeAttr, `${fieldAttrs} data-field="toStatusId"`)}
                </div>
            `;
            break;
        case 'clearStatusesByTag':
        case 'consumeStatusesByTag':
            specificFields = `
                <div class="echoes-creator__field-row">
                    <label>Status tag</label>
                    <input ${fieldAttrs} data-field="tag" value="${escapeAttr(String(effect?.tag || ''))}" placeholder="e.g. buff, debuff" />
                </div>
            `;
            break;
        default:
            specificFields = `
                <div class="echoes-creator__hint">No form for this action yet — use Expert JSON below, or pick a common action from the list.</div>
            `;
            break;
        }

        return `
            <div class="echoes-creator__effect-card">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>What happens</label>
                    ${typeSelect}
                    <label>On target</label>
                    ${targetSelect}
                </div>
                ${specificFields}
                ${renderEffectFilters(effect, escapeAttr, fieldAttrs, options)}
                <details class="echoes-creator__advanced">
                    <summary>Expert: edit raw JSON</summary>
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
        } else if (type === 'skillHasTag') {
            valueFields = `<input ${fieldAttrs} data-field="value" value="${escapeAttr(String(condition?.value || ''))}" placeholder="tag name" style="width:100%;" />`;
        } else if (type === 'skillIdIs') {
            valueFields = `<input ${fieldAttrs} data-field="skillId" value="${escapeAttr(String(condition?.skillId || condition?.value || ''))}" placeholder="skill-id" style="width:100%;" />`;
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

        const needsTarget = ['hasStatus', 'statusPotencyAtLeast', 'statusPotencyAtOrBelow', 'statusCountAtLeast', 'statusCountAtOrBelow'].includes(type);
        const targetField = needsTarget
            ? `
                <div class="echoes-creator__field-row" style="margin-top:0.35rem;">
                    <label>Check on</label>
                    <select ${fieldAttrs} data-field="target" style="width:100%;">
                        <option value="self" ${!condition?.target || condition?.target === 'self' ? 'selected' : ''}>Self</option>
                        <option value="opponent" ${condition?.target === 'opponent' ? 'selected' : ''}>Opponent</option>
                    </select>
                </div>
            `
            : '';

        return `
            <div class="echoes-creator__condition-row">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>Only if</label>
                    ${typeSelect}
                    <div>${valueFields}${targetField}</div>
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
                    <div class="echoes-creator__section-title">Only if ALL of these are true</div>
                    ${conditionRows || '<span class="echoes-creator__hint">No conditions — this always runs when the trigger fires.</span>'}
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" ${blockAttrs} data-action="creator-hook-add-condition">+ Add condition</button>
                </div>
                <div class="echoes-creator__section">
                    <div class="echoes-creator__section-title">Then do this</div>
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
        const grouped = PASSIVE_HOOK_GROUPS.map((group) => {
            const options = group.hooks
                .map((hookId) => passiveHooks.find((hook) => hook.id === hookId))
                .filter(Boolean)
                .map((hook) => `<option value="${escapeAttr(hook.id)}">${escapeAttr(hook.label)}</option>`)
                .join('');
            if (!options) {
                return '';
            }
            return `<optgroup label="${escapeAttr(group.label)}">${options}</optgroup>`;
        }).join('');

        const usedIds = new Set(PASSIVE_HOOK_GROUPS.flatMap((group) => group.hooks));
        const extraHooks = passiveHooks
            .filter((hook) => !usedIds.has(hook.id))
            .map((hook) => `<option value="${escapeAttr(hook.id)}">${escapeAttr(hook.label)}</option>`)
            .join('');
        const extraGroup = extraHooks ? `<optgroup label="Other">${extraHooks}</optgroup>` : '';

        return `
            <div class="echoes-creator__add-hook-bar">
                <label class="echoes-creator__hint">When should this run?</label>
                <select data-action="creator-hook-pick-event" ${scopeAttrs} style="flex:1; min-width:12rem;">
                    <option value="">— Pick a trigger moment —</option>
                    ${grouped}${extraGroup}
                </select>
                <button class="echoes-battle-panel__combat-button" type="button" ${scopeAttrs} data-action="creator-hook-add-event">Add trigger</button>
            </div>
        `;
    }

    function renderSkillEffectEditor(effect, effectIndex, skillIndex, catalog, escapeAttr, escapeHtml) {
        const trigger = effect?.trigger || 'onHit';
        const triggerOptions = SKILL_TRIGGERS.map((entry) => {
            const label = SKILL_TRIGGER_LABELS[entry] || (typeof registry.getTriggerLabel === 'function' ? registry.getTriggerLabel(entry) : entry);
            return `<option value="${escapeAttr(entry)}" ${entry === trigger ? 'selected' : ''}>${escapeHtml(label)}</option>`;
        }).join('');

        const fieldAttrs = `data-creator-scope="skill-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}" data-action="creator-skill-effect-field"`;
        return `
            <div class="echoes-creator__skill-effect">
                <div class="echoes-creator__field-row echoes-creator__field-row--2">
                    <label>When</label>
                    <select ${fieldAttrs} data-field="trigger" style="width:100%;">${triggerOptions}</select>
                </div>
                ${renderEffectFields(effect, catalog, escapeAttr, escapeHtml, fieldAttrs, { showFilters: true })}
                <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-remove-effect" data-skill-index="${skillIndex}" data-effect-index="${effectIndex}">Remove effect</button>
            </div>
        `;
    }

    function renderSkillEffectsSection(skill, skillIndex, catalog, escapeAttr, escapeHtml) {
        const effects = Array.isArray(skill?.effects) ? skill.effects : [];
        const presetOptions = SKILL_EFFECT_PRESETS.map((preset, index) => `
            <option value="${index}">${escapeHtml(preset.label)}</option>
        `).join('');

        const grouped = SKILL_TRIGGERS.map((trigger) => {
            const matching = effects
                .map((effect, effectIndex) => ({ effect, effectIndex }))
                .filter(({ effect }) => (effect?.trigger || 'onHit') === trigger);
            if (!matching.length) {
                return '';
            }
            const label = SKILL_TRIGGER_LABELS[trigger] || trigger;
            const cards = matching.map(({ effect, effectIndex }) =>
                renderSkillEffectEditor(effect, effectIndex, skillIndex, catalog, escapeAttr, escapeHtml),
            ).join('');
            return `
                <details class="echoes-creator__trigger-group" open>
                    <summary class="echoes-creator__trigger-group-title">${escapeHtml(label)}</summary>
                    <div class="echoes-creator__trigger-group-body">${cards}</div>
                </details>
            `;
        }).join('');

        const ungrouped = effects
            .map((effect, effectIndex) => ({ effect, effectIndex }))
            .filter(({ effect }) => !SKILL_TRIGGERS.includes(effect?.trigger || 'onHit'))
            .map(({ effect, effectIndex }) => renderSkillEffectEditor(effect, effectIndex, skillIndex, catalog, escapeAttr, escapeHtml))
            .join('');

        return `
            <div class="echoes-creator__skill-effects">
                <p class="echoes-creator__hint">Skill effects run at specific moments (on select, on hit, on clash, etc.). Each effect is one action — use Passives or Statuses for complex IF/THEN logic.</p>
                <div class="echoes-creator__quick-add-bar">
                    <select data-action="creator-skill-preset-pick" data-skill-index="${skillIndex}" style="flex:1; min-width:12rem;">
                        <option value="">— Quick add preset —</option>
                        ${presetOptions}
                    </select>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-skill-add-preset" data-skill-index="${skillIndex}">Add preset</button>
                    <button class="echoes-battle-panel__combat-button echoes-battle-panel__combat-button--ghost" type="button" data-action="creator-unit-skill-add-effect" data-index="${skillIndex}">+ Custom effect</button>
                </div>
                <div class="echoes-creator__skill-effects-list">
                    ${grouped || ungrouped
                        ? `${grouped}${ungrouped ? `<details class="echoes-creator__trigger-group" open><summary class="echoes-creator__trigger-group-title">Other triggers</summary><div class="echoes-creator__trigger-group-body">${ungrouped}</div></details>` : ''}`
                        : '<span class="echoes-creator__hint">No effects yet — add a preset or custom effect.</span>'}
                </div>
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

    function applyAmountSubfieldUpdate(effect, amountMode, subField, rawValue) {
        if (!effect || typeof effect !== 'object') {
            return;
        }
        const trimmed = String(rawValue ?? '').trim();
        if (amountMode === 'statusPotency') {
            effect.amount = effect.amount && typeof effect.amount === 'object' ? effect.amount : {};
            effect.amount.statusPotency = effect.amount.statusPotency || { target: 'self', statusId: '' };
            if (subField === 'target') {
                effect.amount.statusPotency.target = trimmed || 'self';
            } else if (subField === 'statusId') {
                effect.amount.statusPotency.statusId = trimmed;
            }
            delete effect.value;
            return;
        }
        if (amountMode === 'statusCount') {
            effect.amount = effect.amount && typeof effect.amount === 'object' ? effect.amount : {};
            effect.amount.statusCount = effect.amount.statusCount || { target: 'self', statusId: '' };
            if (subField === 'target') {
                effect.amount.statusCount.target = trimmed || 'self';
            } else if (subField === 'statusId') {
                effect.amount.statusCount.statusId = trimmed;
            }
            delete effect.value;
        }
    }

    function applyEffectFieldUpdate(effect, field, rawValue, options = {}) {
        if (!effect || typeof effect !== 'object') {
            return;
        }
        const amountMode = options.amountMode || null;
        const amountSubField = options.amountSubField || null;
        if (amountMode && amountSubField) {
            applyAmountSubfieldUpdate(effect, amountMode, amountSubField, rawValue);
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
        if (field === 'amountMode') {
            if (rawValue === 'number') {
                const fallback = typeof effect.amount === 'number' ? effect.amount : (effect.value ?? 0);
                effect.amount = fallback;
                delete effect.value;
            } else if (rawValue === 'statusPotency') {
                const existing = effect.amount?.statusPotency || {};
                effect.amount = {
                    statusPotency: {
                        statusId: existing.statusId || effect.statusId || '',
                        target: existing.target || 'self',
                    },
                };
            } else if (rawValue === 'statusCount') {
                const existing = effect.amount?.statusCount || {};
                effect.amount = {
                    statusCount: {
                        statusId: existing.statusId || effect.statusId || '',
                        target: existing.target || 'self',
                    },
                };
            }
            return;
        }
        if (field === 'criticalOnly') {
            if (rawValue === true || rawValue === 'true' || rawValue === 'on') {
                effect.criticalOnly = true;
            } else {
                delete effect.criticalOnly;
            }
            return;
        }
        if (field === 'headsOnly') {
            if (rawValue === true || rawValue === 'true' || rawValue === 'on') {
                effect.headsOnly = true;
                delete effect.tailsOnly;
            } else {
                delete effect.headsOnly;
            }
            return;
        }
        if (field === 'tailsOnly') {
            if (rawValue === true || rawValue === 'true' || rawValue === 'on') {
                effect.tailsOnly = true;
                delete effect.headsOnly;
            } else {
                delete effect.tailsOnly;
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
        if (field === 'outcome' && !rawValue) {
            delete effect.outcome;
            return;
        }
        if (field === 'amount') {
            const trimmed = String(rawValue ?? '').trim();
            if (!trimmed) {
                delete effect.amount;
                delete effect.value;
                return;
            }
            const asNumber = Number(trimmed);
            if (Number.isFinite(asNumber)) {
                effect.amount = asNumber;
                if (effect.type === 'healHp' || effect.type === 'healHpPercent') {
                    effect.value = asNumber;
                }
                return;
            }
            return;
        }
        if (['potency', 'count', 'coinIndex', 'value', 'potencyDelta', 'countDelta', 'cap', 'minStatusPotency'].includes(field)) {
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
            if (rawValue === 'skillIdIs') {
                next.skillId = condition.skillId || condition.value || '';
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
        SKILL_TRIGGER_LABELS,
        SKILL_EFFECT_PRESETS,
        STATUS_TEMPLATES,
        createDefaultUnitDefinition,
        createDefaultStatusDefinition,
        buildCatalog,
        isHookBlock,
        renderHooksEditor,
        renderSkillEffectEditor,
        renderSkillEffectsSection,
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
