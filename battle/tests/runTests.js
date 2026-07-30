const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..', '..');
const battleRoot = path.resolve(projectRoot, 'battle');

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed.');
    }
}

function stableStringify(value) {
    const seen = new WeakSet();
    const normalize = (entry) => {
        if (typeof entry === 'function') {
            return undefined;
        }
        if (entry && typeof entry === 'object') {
            if (seen.has(entry)) {
                return undefined;
            }
            seen.add(entry);
        }
        return entry;
    };

    const normalized = JSON.parse(JSON.stringify(value, (key, entry) => normalize(entry)));
    const sortRecursively = (entry) => {
        if (Array.isArray(entry)) {
            const array = entry.map(sortRecursively);
            if (array.length && array.every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
                const hasId = array.every((item) => typeof item.id === 'string');
                if (hasId) {
                    return array.sort((a, b) => a.id.localeCompare(b.id));
                }
            }
            return array;
        }
        if (!entry || typeof entry !== 'object') {
            return entry;
        }

        return Object.fromEntries(
            Object.keys(entry)
                .sort()
                .map((key) => [key, sortRecursively(entry[key])]),
        );
    };

    return JSON.stringify(sortRecursively(normalized));
}

function clearRequireCache(targetRoot) {
    const normalizedRoot = path.resolve(targetRoot);
    Object.keys(require.cache).forEach((key) => {
        if (key.startsWith(normalizedRoot)) {
            delete require.cache[key];
        }
    });
}

function createBattleEnvironment(options = {}) {
    clearRequireCache(battleRoot);
    global.window = {};
    if (options.localStorage) {
        global.window.localStorage = options.localStorage;
    }

    require(path.resolve(battleRoot, 'registry', 'battleRegistry.js'));
    require(path.resolve(battleRoot, 'ai', 'enemyAi.js'));
    require(path.resolve(battleRoot, 'schema', 'battleSchema.js'));
    require(path.resolve(battleRoot, 'validation', 'battleValidation.js'));
    require(path.resolve(battleRoot, 'content', 'battleContentRegistry.js'));
    require(path.resolve(battleRoot, 'effects', 'skillEffectRunner.js'));
    require(path.resolve(battleRoot, 'core', 'damageFormula.js'));
    require(path.resolve(battleRoot, 'core', 'plannerSkills.js'));
    require(path.resolve(battleRoot, 'core', 'battleEngine.js'));

    return global.window.EchoesOfTheCityBattleModules;
}

function createMemoryLocalStorage() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) : null;
        },
        setItem(key, value) {
            store.set(key, String(value));
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}

function requireAllScripts(directoryPath) {
    fs.readdirSync(directoryPath, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
        .map((entry) => entry.name)
        .sort((a, b) => a.localeCompare(b))
        .forEach((fileName) => {
            require(path.resolve(directoryPath, fileName));
        });
}

function getCanonicalEntries(entries) {
    return entries
        .filter((entry) => entry && entry.id && entry.key && entry.id === entry.key);
}

function runSuite() {
    let passed = 0;
    let failed = 0;
    const failures = [];

    const test = (name, fn) => {
        try {
            fn();
            process.stdout.write(`PASS ${name}\n`);
            passed += 1;
        } catch (error) {
            process.stdout.write(`FAIL ${name}\n`);
            process.stdout.write(`${error?.stack || error}\n`);
            failed += 1;
            failures.push({ name, error });
        }
    };

    test('Load base pack scripts', () => {
        const battleModules = createBattleEnvironment();
        assert(battleModules, 'Battle modules must be available.');
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));
    });

    test('Validate shipped status definitions', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));

        const list = battleModules.registry?.listStatusDefinitions?.() || [];
        const canon = getCanonicalEntries(list);
        assert(canon.length > 0, 'Expected at least one status definition.');

        canon.forEach(({ id }) => {
            const definition = battleModules.registry.getStatusDefinition(id);
            const result = battleModules.schema.validateStatusDefinition(definition);
            assert(!result.errors.length, `Status "${id}" invalid:\n${result.errors.join('\n')}`);
        });
    });

    test('Validate shipped unit definitions', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));

        const list = battleModules.content?.listUnitDefinitions?.() || [];
        const canon = getCanonicalEntries(list);
        assert(canon.length > 0, 'Expected at least one unit definition.');

        canon.forEach(({ id }) => {
            const definition = battleModules.content.getUnitDefinition(id);
            const result = battleModules.schema.validateUnitDefinition(definition);
            assert(!result.errors.length, `Unit "${id}" invalid:\n${result.errors.join('\n')}`);
        });
    });

    test('Validate shipped battle definitions', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        const list = battleModules.content?.listBattleDefinitions?.() || [];
        const canon = getCanonicalEntries(list);
        assert(canon.length > 0, 'Expected at least one battle definition.');

        canon.forEach(({ id }) => {
            const definition = battleModules.content.getBattleDefinition(id);
            const encounterResult = battleModules.validation.validateAndNormalizeEncounterDefinition(definition);
            assert(!encounterResult.errors.length, `Encounter "${id}" invalid:\n${encounterResult.errors.join('\n')}`);
        });
    });

    test('Validate content-pack manifest schema', () => {
        const battleModules = createBattleEnvironment();
        assert(typeof battleModules.schema?.validateContentPackManifest === 'function', 'Expected validateContentPackManifest to exist.');
        const result = battleModules.schema.validateContentPackManifest({
            id: 'example-pack',
            name: 'Example Pack',
            version: '1.0.0',
            engineVersion: 'dev',
            authors: ['Tester'],
            description: 'Example',
            dependencies: [],
            featureFlags: { example: true },
        });
        assert(!result.errors.length, `Manifest invalid:\n${result.errors.join('\n')}`);
    });

    test('Damage formula fixtures', () => {
        const battleModules = createBattleEnvironment();
        assert(typeof battleModules.createDamageFormula === 'function', 'Expected createDamageFormula to exist.');

        const getStatusCount = (unit, statusId) => {
            const statuses = Array.isArray(unit?.statuses) ? unit.statuses : [];
            return statuses.find((status) => status?.id === statusId)?.count || 0;
        };
        const isUnitStaggered = (unit) => (unit?.staggerTurnsRemaining || 0) > 0 || (unit?.staggerLevel || 0) > 0;
        const formula = battleModules.createDamageFormula({ getStatusCount, isUnitStaggered });

        const createUnit = (overrides = {}) => ({
            maxHp: 100,
            hp: 100,
            sp: 0,
            staggerTurnsRemaining: 0,
            staggerLevel: 0,
            turnState: {},
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            statuses: [],
            ...overrides,
        });

        const baseContext = {
            finalPower: 20,
            offenseLevel: 10,
            defenseLevel: 10,
            damageType: 'slash',
            sinType: 'wrath',
            modifiers: { attack: {}, defense: {} },
        };

        const neutral = formula.calculateDamage({ ...baseContext, defender: createUnit() });
        assert(neutral.damage === 20, `Expected neutral damage 20, got ${neutral.damage}`);

        const weak = formula.calculateDamage({
            ...baseContext,
            defender: createUnit({ resistances: { ...createUnit().resistances, physical: { slash: 2, pierce: 1, blunt: 1 } } }),
        });
        assert(weak.damage === 40, `Expected weak damage 40, got ${weak.damage}`);

        const resisted = formula.calculateDamage({
            ...baseContext,
            defender: createUnit({ resistances: { ...createUnit().resistances, physical: { slash: 0.5, pierce: 1, blunt: 1 } } }),
        });
        assert(resisted.damage === 10, `Expected resisted damage 10, got ${resisted.damage}`);

        const staggered = formula.calculateDamage({
            ...baseContext,
            defender: createUnit({ staggerTurnsRemaining: 1, resistances: { ...createUnit().resistances, physical: { slash: 1, pierce: 1, blunt: 1 } } }),
        });
        assert(staggered.damage === 40, `Expected staggered to clamp physical resist to 2x (40), got ${staggered.damage}`);

        const critical = formula.calculateDamage({
            ...baseContext,
            defender: createUnit(),
            isCritical: true,
        });
        assert(critical.damage === 24, `Expected critical damage 24, got ${critical.damage}`);

        const additive = formula.calculateDamage({
            ...baseContext,
            defender: createUnit({ resistances: { ...createUnit().resistances, physical: { slash: 0.5, pierce: 1, blunt: 1 } } }),
            modifiers: { attack: { additiveDamage: 5 }, defense: {} },
        });
        assert(additive.damage === 15, `Expected additive damage 15, got ${additive.damage}`);

        const floored = formula.calculateDamage({
            ...baseContext,
            finalPower: 20,
            defender: createUnit({ resistances: { ...createUnit().resistances, physical: { slash: 0.01, pierce: 1, blunt: 1 } } }),
        });
        assert(floored.damage === 1, `Expected minimum damage floor to be at least 1, got ${floored.damage}`);
    });

    test('Effect runner: oncePer skill on multi-coin hitTaken', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({
            id: 'test_hit_proc',
            label: 'Test Hit Proc',
        });
        registerStatusDefinition({
            id: 'test_hit_proc',
            label: 'Test Hit Proc',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                hitTaken: [
                    {
                        oncePer: 'skill',
                        actions: [
                            { type: 'dealFixedDamage', target: 'self', statusId: 'test_hit_proc', amount: 5 },
                        ],
                    },
                ],
            },
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const skill = {
            id: 'double_strike',
            name: 'Double Strike',
            skillType: 'attack',
            basePower: 4,
            coinPower: 1,
            coinCount: 2,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const weakerSkill = {
            id: 'weak_poke',
            name: 'Weak Poke',
            skillType: 'attack',
            basePower: 4,
            coinPower: 1,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'onceper-skill-smoke',
            name: 'OncePer Skill Smoke',
            playerUnits: [createUnit('ally', 'Ally', [skill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [weakerSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true, true, true, true],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({
            battleDefinition,
            clamp,
            peekRollToken,
            consumeRollToken,
        });
        engine.addStatus('enemy', { id: 'test_hit_proc', count: 1 }, 0);

        engine.selectSlot('player-slot-1');
        engine.selectSkill('double_strike');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const procs = state.events
            .filter((event) => event.type === 'status_triggered')
            .map((event) => event.data)
            .filter((data) => data?.unitId === 'enemy' && data?.statusId === 'test_hit_proc');
        assert(procs.length === 1, `Expected exactly one oncePer=skill proc, got ${procs.length}`);
        assert(state.enemyUnits[0].hp < 50, 'Expected enemy to take damage from the attack.');
    });

    test('Effect runner: allAllies target on battleStart', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({
            id: 'test_marker',
            label: 'Test Marker',
        });
        registerStatusDefinition({
            id: 'test_marker',
            label: 'Test Marker',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const auraPassive = {
            id: 'test_aura_passive',
            label: 'Test Aura Passive',
            hooks: {
                battleStart: [
                    {
                        actions: [
                            { type: 'applyStatus', target: 'allAllies', statusId: 'test_marker', count: 1 },
                        ],
                    },
                ],
            },
        };

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const basicSkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 1,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const createUnit = (id, name, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [basicSkill],
            passives,
        });

        const battleDefinition = {
            id: 'allallies-battlestart-smoke',
            name: 'AllAllies BattleStart Smoke',
            playerUnits: [
                createUnit('ally1', 'Ally 1', [auraPassive]),
                createUnit('ally2', 'Ally 2', []),
            ],
            enemyUnits: [createUnit('enemy', 'Enemy', [])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        const state = engine.getState();
        const playerMarkers = state.playerUnits.map((unit) => unit.statuses.find((status) => status.id === 'test_marker')?.count || 0);
        assert(playerMarkers[0] === 1 && playerMarkers[1] === 1, `Expected both allies to gain marker at battle start, got ${JSON.stringify(playerMarkers)}`);
    });

    test('Effect runner: skillHasTag + skillIdIs conditions', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({
            id: 'test_counter',
            label: 'Test Counter',
        });
        registerStatusDefinition({
            id: 'test_counter',
            label: 'Test Counter',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        registerStatusDefinition({
            id: 'test_skill_conditions',
            label: 'Test Skill Conditions',
        });
        registerStatusDefinition({
            id: 'test_skill_conditions',
            label: 'Test Skill Conditions',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                skillSelected: [
                    {
                        conditions: [{ type: 'skillHasTag', value: 'tag-a' }],
                        actions: [{ type: 'adjustStatus', target: 'self', statusId: 'test_counter', countDelta: 1 }],
                    },
                    {
                        conditions: [{ type: 'skillIdIs', value: 'tagged_skill' }],
                        actions: [{ type: 'adjustStatus', target: 'self', statusId: 'test_counter', countDelta: 2 }],
                    },
                ],
            },
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 40,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const taggedSkill = {
            id: 'tagged_skill',
            name: 'Tagged Skill',
            skillType: 'attack',
            basePower: 3,
            coinPower: 1,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            tags: ['tag-a'],
            effects: [],
        };

        const battleDefinition = {
            id: 'skill-conditions-smoke',
            name: 'Skill Conditions Smoke',
            playerUnits: [createUnit('ally', 'Ally', [taggedSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [taggedSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [{ type: 'heads', value: 1 }],
            'enemy-slot-1': [{ type: 'heads', value: 1 }],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.addStatus('player', { id: 'test_skill_conditions', count: 1 }, 0);

        engine.selectSlot('player-slot-1');
        engine.selectSkill('tagged_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const ally = state.playerUnits[0];
        const counter = ally.statuses.find((status) => status.id === 'test_counter')?.count || 0;
        assert(counter === 3, `Expected counter to be 3 after skillSelected hooks, got ${counter}`);
    });

    test('Effect runner: statusApplied lifecycle hook', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({
            id: 'test_applied_a',
            label: 'Test Applied A',
        });
        registerStatusDefinition({
            id: 'test_applied_b',
            label: 'Test Applied B',
        });
        registerStatusDefinition({
            id: 'test_applied_a',
            label: 'Test Applied A',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                statusApplied: [
                    {
                        conditions: [{ type: 'eventStatusIdIs', value: 'test_applied_a' }],
                        actions: [{ type: 'applyStatus', target: 'self', statusId: 'test_applied_b', count: 1 }],
                    },
                ],
            },
        });

        registerStatusDefinition({
            id: 'test_applied_b',
            label: 'Test Applied B',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const passive = {
            id: 'test_apply_on_start',
            label: 'Test Apply On Start',
            hooks: {
                battleStart: [{ actions: [{ type: 'applyStatus', target: 'self', statusId: 'test_applied_a', count: 1 }] }],
            },
        };

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const basicSkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 1,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const createUnit = (id, name) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [basicSkill],
            passives: id === 'ally' ? [passive] : [],
        });

        const battleDefinition = {
            id: 'status-applied-smoke',
            name: 'Status Applied Smoke',
            playerUnits: [createUnit('ally', 'Ally')],
            enemyUnits: [createUnit('enemy', 'Enemy')],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        const ally = engine.getState().playerUnits[0];
        const hasA = ally.statuses.some((status) => status.id === 'test_applied_a');
        const hasB = ally.statuses.some((status) => status.id === 'test_applied_b');
        assert(hasA && hasB, `Expected statusApplied hook to chain apply B; got A=${hasA} B=${hasB}`);
    });

    test('Effect runner: status action effects (clear/copy/transfer/convert/multiply/split/tags)', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        const registerCountOnly = (definition) => {
            registerStatusDefinition({ id: definition.id, label: definition.label });
            registerStatusDefinition({
                id: definition.id,
                label: definition.label,
                tags: definition.tags || [],
                countOnly: true,
                stackModel: {
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {},
            });
        };

        registerCountOnly({ id: 'test_tag_a', label: 'Tag A', tags: ['a'] });
        registerCountOnly({ id: 'test_tag_ab', label: 'Tag AB', tags: ['a', 'b'] });
        registerCountOnly({ id: 'test_copy_source', label: 'Copy Source', tags: ['copy'] });
        registerCountOnly({ id: 'test_convert_from', label: 'Convert From', tags: ['from'] });
        registerCountOnly({ id: 'test_convert_to', label: 'Convert To', tags: ['to'] });

        registerStatusDefinition({ id: 'test_mult', label: 'Multiply Status' });
        registerStatusDefinition({
            id: 'test_mult',
            label: 'Multiply Status',
            stackModel: {
                potency: { enabled: true, min: 0, max: 99, application: 'add' },
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        registerCountOnly({ id: 'test_split', label: 'Split Status', tags: ['split'] });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skill = {
            id: 'dsl_status_actions',
            name: 'DSL Status Actions',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onSelect', type: 'clearStatus', target: 'opponent', statusId: 'test_tag_a' },
                { trigger: 'onSelect', type: 'clearStatusesByTag', target: 'opponent', tags: ['a', 'b'], match: 'all' },
                { trigger: 'onSelect', type: 'consumeStatusesByTag', target: 'opponent', tags: ['copy'], match: 'any' },
                { trigger: 'onSelect', type: 'copyStatus', target: 'opponent', sourceTarget: 'self', statusId: 'test_copy_source', operation: 'set' },
                { trigger: 'onSelect', type: 'transferStatus', target: 'opponent', sourceTarget: 'self', statusId: 'test_tag_ab', operation: 'set' },
                { trigger: 'onSelect', type: 'convertStatus', target: 'opponent', fromStatusId: 'test_convert_from', toStatusId: 'test_convert_to' },
                { trigger: 'onSelect', type: 'multiplyStatus', target: 'opponent', statusId: 'test_mult', potencyMultiplier: 2, countMultiplier: 3, rounding: 'floor' },
                { trigger: 'onSelect', type: 'splitStatus', target: 'allOpponents', sourceTarget: 'self', statusId: 'test_split', mode: 'even' },
            ],
        };
        const enemySkill = {
            id: 'enemy_poke',
            name: 'Enemy Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'dsl-status-actions-smoke',
            name: 'DSL Status Actions Smoke',
            playerUnits: [createUnit('ally', 'Ally', [skill])],
            enemyUnits: [
                createUnit('enemy1', 'Enemy 1', [enemySkill]),
                createUnit('enemy2', 'Enemy 2', [enemySkill]),
            ],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [{ type: 'heads', value: 0 }],
            'enemy-slot-1': [{ type: 'heads', value: 0 }],
            'enemy-slot-2': [{ type: 'heads', value: 0 }],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.addStatus('enemy', { id: 'test_tag_a', count: 1 }, 0);
        engine.addStatus('enemy', { id: 'test_tag_ab', count: 1 }, 0);
        engine.addStatus('enemy', { id: 'test_copy_source', count: 2 }, 0);
        engine.addStatus('enemy', { id: 'test_convert_from', count: 4 }, 0);
        engine.addStatus('enemy', { id: 'test_mult', potency: 3, count: 2 }, 0);

        engine.addStatus('player', { id: 'test_copy_source', count: 5 }, 0);
        engine.addStatus('player', { id: 'test_tag_ab', count: 3 }, 0);
        engine.addStatus('player', { id: 'test_split', count: 5 }, 0);

        engine.selectSlot('player-slot-1');
        engine.selectSkill('dsl_status_actions');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const enemy1 = state.enemyUnits.find((unit) => unit.id === 'enemy1');
        const enemy2 = state.enemyUnits.find((unit) => unit.id === 'enemy2');
        const ally = state.playerUnits[0];

        assert(!enemy1.statuses.some((status) => status.id === 'test_tag_a'), 'Expected clearStatus to remove test_tag_a.');
        assert(enemy1.statuses.find((status) => status.id === 'test_tag_ab')?.count === 3, 'Expected transferStatus to set opponent test_tag_ab to 3.');
        assert(!ally.statuses.some((status) => status.id === 'test_tag_ab'), 'Expected transferStatus to remove test_tag_ab from source.');
        assert(enemy1.statuses.find((status) => status.id === 'test_copy_source')?.count === 5, 'Expected copyStatus to set opponent copy count to 5.');
        assert(!enemy1.statuses.some((status) => status.id === 'test_convert_from') && enemy1.statuses.find((status) => status.id === 'test_convert_to')?.count === 4, 'Expected convertStatus to swap statuses.');
        assert(enemy1.statuses.find((status) => status.id === 'test_mult')?.potency === 6 && enemy1.statuses.find((status) => status.id === 'test_mult')?.count === 6, 'Expected multiplyStatus to scale potency/count.');
        assert(enemy1.statuses.find((status) => status.id === 'test_split')?.count === 3, 'Expected splitStatus remainder to go to first opponent.');
        assert(enemy2.statuses.find((status) => status.id === 'test_split')?.count === 2, 'Expected splitStatus to distribute evenly across opponents.');
        assert(!ally.statuses.some((status) => status.id === 'test_split'), 'Expected splitStatus to remove from source.');

        const consumedEvents = state.events.filter((event) => event.type === 'status_consumed' && event.data?.statusId === 'test_copy_source');
        assert(consumedEvents.length >= 1, 'Expected consumeStatusesByTag to emit status_consumed event.');
    });

    test('Effect runner: coin actions (adjustCoinCount + forceCoinOutcome + grantCoinReroll)', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const skill = {
            id: 'coin_actions',
            name: 'Coin Actions',
            skillType: 'attack',
            basePower: 3,
            coinPower: 2,
            coinCount: 2,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onSelect', type: 'adjustCoinCount', value: 1, operation: 'add' },
                { trigger: 'onSelect', type: 'grantCoinReroll', value: 1 },
                { trigger: 'onSelect', type: 'forceCoinOutcome', coinIndex: 2, coinOutcome: 'tails' },
            ],
        };

        const enemySkill = {
            id: 'enemy_poke',
            name: 'Enemy Poke',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 80,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'coin-actions-smoke',
            name: 'Coin Actions Smoke',
            playerUnits: [createUnit('ally', 'Ally', [skill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const previousRandom = Math.random;
        try {
            const rolls = [0.99, 0.01, 0.01, 0.01];
            Math.random = () => (rolls.length ? rolls.shift() : 0.01);
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('coin_actions');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const presentation = state.resolutionHistory[0];
            assert(presentation?.hits?.length === 3, `Expected 3 hits after adjustCoinCount, got ${presentation?.hits?.length || 0}`);
            const faces = presentation.hits.map((hit) => Boolean(hit.isHeads));
            assert(String(faces) === String([true, false, true]), `Expected heads/tails/heads after reroll + forced tail, got ${JSON.stringify(faces)}`);
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Effect runner: unit resources + flags/counters + randomChance + eventField amounts', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_resource_mark', label: 'Resource Mark' });
        registerStatusDefinition({
            id: 'test_resource_mark',
            label: 'Resource Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const passive = {
            id: 'resource_passive',
            label: 'Resource Passive',
            hooks: {
                battleStart: [
                    {
                        actions: [
                            { type: 'adjustUnitResource', target: 'self', resourceId: 'wrath', value: 0, operation: 'set' },
                            { type: 'adjustUnitResource', target: 'self', resourceId: 'wrath', amount: { sum: [{ eventField: { path: 'battle.turn', default: 0 } }, 2] }, operation: 'add' },
                            { type: 'setFlag', target: 'self', flagId: 'ready', value: true },
                            { type: 'adjustCounter', target: 'self', counterId: 'charge', value: 2, operation: 'set' },
                        ],
                    },
                    {
                        conditions: [
                            { type: 'unitResourceAtLeast', target: 'self', resourceId: 'wrath', value: 2 },
                            { type: 'hasFlag', target: 'self', flagId: 'ready', value: true },
                            { type: 'counterAtLeast', target: 'self', counterId: 'charge', value: 2 },
                            { type: 'randomChance', value: 1 },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'test_resource_mark', countAmount: { unitResource: { target: 'self', resourceId: 'wrath' } } },
                        ],
                    },
                ],
            },
        };

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const basicSkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const createUnit = (id, name, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [basicSkill],
            passives,
        });

        const previousRandom = Math.random;
        try {
            Math.random = () => 0;
            const engine = battleModules.createBattleEngine({
                battleDefinition: {
                    id: 'resource-actions-smoke',
                    name: 'Resource Actions Smoke',
                    playerUnits: [createUnit('ally', 'Ally', [passive])],
                    enemyUnits: [createUnit('enemy', 'Enemy')],
                    rules: {
                        encounterType: 'focused',
                        maxTurns: 1,
                        victoryCondition: 'defeat-all-enemies',
                        failureCondition: 'all-allies-defeated',
                        enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    },
                },
                clamp,
            });
            const state = engine.getState();
            const ally = state.playerUnits[0];
            const wrath = ally.resources?.wrath || 0;
            const mark = ally.statuses.find((status) => status.id === 'test_resource_mark')?.count || 0;
            assert(wrath === 2, `Expected wrath unit resource to be 2 at battleStart, got ${wrath}`);
            assert(mark === 2, `Expected mark count to equal unitResource(wrath)=2, got ${mark}`);
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Effect runner: dealHpPercentDamage + setDamageCap', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const skill = {
            id: 'percent_damage',
            name: 'Percent Damage',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onSelect', type: 'dealHpPercentDamage', target: 'opponent', amount: 0.5, statusId: 'hp_percent_effect' },
                { trigger: 'onSelect', type: 'setDamageCap', value: 0, operation: 'set' },
            ],
        };

        const enemySkill = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 100,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'percent-damage-smoke',
                name: 'Percent Damage Smoke',
                playerUnits: [createUnit('ally', 'Ally', [skill])],
                enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('percent_damage');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const enemy = state.enemyUnits[0];
        assert(enemy.hp === 50, `Expected enemy HP to be 50 after 50% max HP fixed damage, got ${enemy.hp}`);
    });

    test('Effect runner: redirectDamage + lastEventTypeIs', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'redirect_mark', label: 'Redirect Mark' });
        registerStatusDefinition({
            id: 'redirect_mark',
            label: 'Redirect Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const attackerSkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 12,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyGuard = {
            id: 'enemy_guard',
            name: 'Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const redirectPassive = {
            id: 'redirect_passive',
            name: 'Redirect Passive',
            hooks: {
                beforeDamage: [
                    {
                        actions: [
                            { type: 'redirectDamage', selector: 'firstLivingAlly' },
                        ],
                    },
                ],
            },
        };

        const markOnHitPassive = {
            id: 'mark_on_hit',
            name: 'Mark On Hit',
            hooks: {
                hitTaken: [
                    {
                        conditions: [
                            { type: 'lastEventTypeIs', value: 'hit_resolved' },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'redirect_mark', count: 1 },
                        ],
                    },
                ],
            },
        };

        const createUnit = (id, name, skills, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'redirect-smoke',
                name: 'Redirect Smoke',
                playerUnits: [createUnit('ally', 'Ally', [attackerSkill])],
                enemyUnits: [
                    createUnit('enemy1', 'Enemy 1', [enemyGuard], [redirectPassive]),
                    createUnit('enemy2', 'Enemy 2', [enemyGuard], [markOnHitPassive]),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('poke');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const enemy1 = state.enemyUnits.find((unit) => unit.id === 'enemy1');
        const enemy2 = state.enemyUnits.find((unit) => unit.id === 'enemy2');
        assert(enemy1.hp === enemy1.maxHp, `Expected redirectDamage to prevent damage on enemy1, got ${enemy1.hp}/${enemy1.maxHp}`);
        assert(enemy2.hp < enemy2.maxHp, `Expected redirectDamage to apply damage to enemy2, got ${enemy2.hp}/${enemy2.maxHp}`);
        const mark = enemy2.statuses.find((status) => status.id === 'redirect_mark')?.count || 0;
        assert(mark === 1, `Expected lastEventTypeIs to gate redirect_mark application, got ${mark}`);
    });

    test('Effect runner: chooseWeightedActions + abortEffects', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        const registerCountOnly = (id) => {
            registerStatusDefinition({ id, label: id });
            registerStatusDefinition({
                id,
                label: id,
                countOnly: true,
                stackModel: {
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {},
            });
        };
        registerCountOnly('branch_a');
        registerCountOnly('branch_b');
        registerCountOnly('should_not_apply');

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skill = {
            id: 'branching',
            name: 'Branching',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                {
                    trigger: 'onSelect',
                    type: 'chooseWeightedActions',
                    branches: [
                        { weight: 1, actions: [{ type: 'applyStatus', target: 'self', statusId: 'branch_a', count: 1 }] },
                        { weight: 3, actions: [{ type: 'applyStatus', target: 'self', statusId: 'branch_b', count: 1 }] },
                    ],
                },
                { trigger: 'onSelect', type: 'abortEffects' },
                { trigger: 'onSelect', type: 'applyStatus', target: 'self', statusId: 'should_not_apply', count: 1 },
            ],
        };
        const enemySkill = {
            id: 'enemy_guard',
            name: 'Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const previousRandom = Math.random;
        try {
            Math.random = () => 0.8;
            const engine = battleModules.createBattleEngine({
                battleDefinition: {
                    id: 'branching-smoke',
                    name: 'Branching Smoke',
                    playerUnits: [createUnit('ally', 'Ally', [skill])],
                    enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
                    rules: {
                        encounterType: 'focused',
                        maxTurns: 1,
                        victoryCondition: 'defeat-all-enemies',
                        failureCondition: 'all-allies-defeated',
                        enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    },
                },
                clamp,
            });

            engine.selectSlot('player-slot-1');
            engine.selectSkill('branching');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const ally = state.playerUnits[0];
            const hasA = ally.statuses.some((status) => status.id === 'branch_a');
            const hasB = ally.statuses.some((status) => status.id === 'branch_b');
            const hasNo = ally.statuses.some((status) => status.id === 'should_not_apply');
            assert(!hasA && hasB, `Expected weighted branch to apply only branch_b, got A=${hasA} B=${hasB}`);
            assert(!hasNo, 'Expected abortEffects to stop further effects.');
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Effect runner: reuseCoins adds post-clash hits', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const reuseSkill = {
            id: 'reuse_skill',
            name: 'Reuse Skill',
            skillType: 'attack',
            basePower: 12,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onClashWin', type: 'reuseCoins', value: 1 },
            ],
        };

        const enemySkill = {
            id: 'enemy_skill',
            name: 'Enemy Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'reuse-coins-smoke',
            name: 'Reuse Coins Smoke',
            playerUnits: [createUnit('ally', 'Ally', [reuseSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true, true, true],
            'enemy-slot-1': [true],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.selectSlot('player-slot-1');
        engine.selectSkill('reuse_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const hits = engine.getState().events.filter((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally');
        assert(hits.length === 2, `Expected 2 post-clash hits after reuseCoins(+1), got ${hits.length}`);
    });

    test('Effect runner: breakCoins removes post-clash hits', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const breakSkill = {
            id: 'break_skill',
            name: 'Break Skill',
            skillType: 'attack',
            basePower: 12,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onClashWin', type: 'breakCoins', value: 1 },
            ],
        };

        const enemySkill = {
            id: 'enemy_skill',
            name: 'Enemy Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'break-coins-smoke',
            name: 'Break Coins Smoke',
            playerUnits: [createUnit('ally', 'Ally', [breakSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true],
            'enemy-slot-1': [true],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.selectSlot('player-slot-1');
        engine.selectSkill('break_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const hits = engine.getState().events.filter((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally');
        assert(hits.length === 0, `Expected 0 post-clash hits after breakCoins(+1), got ${hits.length}`);
    });

    test('Effect runner: coinPowerBonusByCoin via modifyCoinMap affects final power', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const skill = {
            id: 'coin_power_by_coin',
            name: 'Coin Power By Coin',
            skillType: 'attack',
            basePower: 5,
            coinPower: 2,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onSelect', type: 'modifyCoinMap', field: 'coinPowerBonusByCoin', coinIndex: 1, value: 3 },
            ],
        };

        const enemySkill = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'coin-power-by-coin-smoke',
            name: 'Coin Power By Coin Smoke',
            playerUnits: [createUnit('ally', 'Ally', [skill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.selectSlot('player-slot-1');
        engine.selectSkill('coin_power_by_coin');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const hit = engine.getState().events.find((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally')?.data || null;
        assert(hit, 'Expected Ally hit_resolved event.');
        assert(hit.finalPower === 10, `Expected finalPower 10 (5 + (2+3)), got ${hit.finalPower}`);
    });

    test('Effect runner: panic runtime state (set/adjust + conditions)', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_panic_mark', label: 'Panic Mark' });
        registerStatusDefinition({
            id: 'test_panic_mark',
            label: 'Panic Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const passive = {
            id: 'panic_passive',
            name: 'Panic Passive',
            hooks: {
                battleStart: [
                    {
                        actions: [
                            { type: 'setPanicState', target: 'self', stateId: 'meltdown', value: 2 },
                            { type: 'adjustPanicValue', target: 'self', operation: 'add', value: 1 },
                        ],
                    },
                    {
                        conditions: [
                            { type: 'panicStateIs', target: 'self', value: 'meltdown' },
                            { type: 'panicValueAtLeast', target: 'self', value: 3 },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'test_panic_mark', count: 1 },
                        ],
                    },
                ],
            },
        };

        const basicSkill = {
            id: 'basic',
            name: 'Basic',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'panic-smoke',
                name: 'Panic Smoke',
                playerUnits: [createUnit('ally', 'Ally', [basicSkill], [passive])],
                enemyUnits: [createUnit('enemy', 'Enemy', [basicSkill])],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        const ally = engine.getState().playerUnits[0];
        assert(ally.runtimeState?.panicStateId === 'meltdown', `Expected panicStateId "meltdown", got ${ally.runtimeState?.panicStateId}`);
        assert(ally.runtimeState?.panicValue === 3, `Expected panicValue 3, got ${ally.runtimeState?.panicValue}`);
        const mark = ally.statuses.find((status) => status.id === 'test_panic_mark')?.count || 0;
        assert(mark === 1, `Expected panicStateIs/panicValueAtLeast to gate mark application, got ${mark}`);
    });

    test('Effect runner: spendUnitResource cancels skill when insufficient', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const spendSkill = {
            id: 'spend_skill',
            name: 'Spend Skill',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onSelect', type: 'spendUnitResource', target: 'self', resourceId: 'wrath', value: 1, cancelIfInsufficient: true },
            ],
        };
        const enemySkill = {
            id: 'enemy_hit',
            name: 'Enemy Hit',
            skillType: 'attack',
            basePower: 8,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 40,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const battleDefinition = {
            id: 'spend-unit-resource-cancel',
            name: 'Spend Unit Resource Cancel',
            playerUnits: [createUnit('ally', 'Ally', [spendSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [true],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.selectSlot('player-slot-1');
        engine.selectSkill('spend_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const cancelled = engine.getState().events.find((event) => event.type === 'skill_cancelled' && event.data?.unitName === 'Ally')?.data || null;
        assert(cancelled, 'Expected spendUnitResource to cancel skill.');
        assert(cancelled.reason === 'insufficient wrath', `Expected cancel reason "insufficient wrath", got ${cancelled.reason}`);
        const allyHits = engine.getState().events.filter((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally');
        assert(allyHits.length === 0, `Expected cancelled ally to deal no hits, got ${allyHits.length}`);
        const enemyHit = engine.getState().events.find((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Enemy')?.data || null;
        assert(enemyHit, 'Expected enemy to still hit after ally cancellation.');
    });

    test('Effect runner: spendEncounterResource spends and gates by resonance/wave', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_wave_mark', label: 'Wave Mark' });
        registerStatusDefinition({
            id: 'test_wave_mark',
            label: 'Wave Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const passive = {
            id: 'wave_res_passive',
            name: 'Wave+Resonance Passive',
            hooks: {
                battleStart: [
                    {
                        actions: [
                            { type: 'adjustEncounterResource', resourceId: 'test_currency', value: 2, operation: 'set', scope: 'battle' },
                            { type: 'setWave', value: 3 },
                        ],
                    },
                ],
            },
        };

        const spendSkill = {
            id: 'spend_currency',
            name: 'Spend Currency',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                {
                    trigger: 'onSelect',
                    type: 'spendEncounterResource',
                    resourceId: 'test_currency',
                    value: 1,
                    cancelIfInsufficient: true,
                    scope: 'battle',
                },
            ],
        };

        const wrathSkill = {
            id: 'wrath_skill',
            name: 'Wrath Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const gatedPassive = {
            id: 'gated_passive',
            name: 'Gated Passive',
            hooks: {
                skillSelected: [
                    {
                        conditions: [
                            { type: 'waveAtLeast', value: 3 },
                            { type: 'resonanceAtLeast', sinType: 'wrath', value: 2 },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'test_wave_mark', count: 1 },
                        ],
                    },
                ],
            },
        };

        const enemySkill = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 40,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'spend-encounter-resource-smoke',
                name: 'Spend Encounter Resource Smoke',
                playerUnits: [
                    createUnit('ally', 'Ally', [spendSkill], [passive, gatedPassive]),
                    createUnit('ally2', 'Ally 2', [wrathSkill]),
                ],
                enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('spend_currency');
        engine.selectTarget('enemy-slot-1');
        engine.selectSlot('player-slot-2');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.encounterResources.test_currency === 1, `Expected test_currency to be 1 after spending 1, got ${state.encounterResources.test_currency}`);
        assert(state.wave === 3, `Expected wave to be 3, got ${state.wave}`);
        assert(state.runtimeState?.resonanceBySide?.player?.wrath === 2, `Expected wrath resonance to be 2, got ${state.runtimeState?.resonanceBySide?.player?.wrath}`);
        const mark = state.playerUnits[0].statuses.find((status) => status.id === 'test_wave_mark')?.count || 0;
        assert(mark === 1, `Expected waveAtLeast+resonanceAtLeast to gate status application, got ${mark}`);
    });

    test('Effect runner: in-game absolute resonance uses longest chain (not sum)', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_abs_mark', label: 'Abs Mark' });
        registerStatusDefinition({
            id: 'test_abs_mark',
            label: 'Abs Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const wrathSkill = {
            id: 'wrath_skill',
            name: 'Wrath Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const prideSkill = {
            id: 'pride_skill',
            name: 'Pride Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: id === 'w1' ? [
                {
                    id: 'abs_res_passive',
                    name: 'Abs Reson Gate',
                    hooks: {
                        skillSelected: [
                            {
                                conditions: [
                                    { type: 'absoluteResonanceAtLeast', sinType: 'wrath', value: 3 },
                                ],
                                actions: [
                                    { type: 'applyStatus', target: 'self', statusId: 'test_abs_mark', count: 1 },
                                ],
                            },
                        ],
                    },
                },
            ] : [],
        });

        const playerUnits = [
            createUnit('w1', 'W1', [wrathSkill], 7),
            createUnit('w2', 'W2', [wrathSkill], 6),
            createUnit('w3', 'W3', [wrathSkill], 5),
            createUnit('p1', 'P1', [prideSkill], 4),
            createUnit('w4', 'W4', [wrathSkill], 3),
            createUnit('w5', 'W5', [wrathSkill], 2),
            createUnit('w6', 'W6', [wrathSkill], 1),
        ];

        const enemySkill = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyUnits = [
            createUnit('enemy', 'Enemy', [enemySkill], 1),
        ];

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'abs-reson-chain-smoke',
                name: 'Abs Reson Chain Smoke',
                playerUnits,
                enemyUnits,
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        for (let index = 1; index <= playerUnits.length; index += 1) {
            engine.selectSlot(`player-slot-${index}`);
            engine.selectSkill(index === 4 ? 'pride_skill' : 'wrath_skill');
            engine.selectTarget('enemy-slot-1');
        }
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.runtimeState?.resonanceBySide?.player?.wrath === 6, `Expected wrath resonance to be 6, got ${state.runtimeState?.resonanceBySide?.player?.wrath}`);
        assert(state.runtimeState?.absoluteResonanceBySide?.player?.wrath === 3, `Expected wrath A-resonance to be 3 (longest chain), got ${state.runtimeState?.absoluteResonanceBySide?.player?.wrath}`);
        const absMark = state.playerUnits[0].statuses.find((status) => status.id === 'test_abs_mark')?.count || 0;
        assert(absMark === 1, `Expected absoluteResonanceAtLeast to gate mark application, got ${absMark}`);
    });

    test('Engine: [On Use] grants side-scoped E.G.O resources', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const wrathSkill = {
            id: 'wrath_skill',
            name: 'Wrath Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const prideSkill = {
            id: 'pride_skill',
            name: 'Pride Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'ego-on-use-side-resources',
                name: 'EGO On Use Side Resources',
                playerUnits: [
                    createUnit('ally1', 'Ally 1', [wrathSkill], 6),
                    createUnit('ally2', 'Ally 2', [wrathSkill], 5),
                ],
                enemyUnits: [
                    createUnit('enemy', 'Enemy', [prideSkill], 1),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.selectSlot('player-slot-2');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.encounterResources['player:wrath'] === 2, `Expected player:wrath to be 2, got ${state.encounterResources['player:wrath']}`);
        assert(state.encounterResources['enemy:pride'] === 1, `Expected enemy:pride to be 1, got ${state.encounterResources['enemy:pride']}`);
    });

    test('Engine: Attack Weight targets untargeted slots and hits multiple targets', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const weightSkill = {
            id: 'weight_skill',
            name: 'Weight Skill',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            attackWeight: 2,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const dummySkill = {
            id: 'dummy_skill',
            name: 'Dummy Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyGuard = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, extra = {}) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
            ...extra,
        });

        const forcedTokens = {
            'player-slot-1': [true, true],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'attack-weight-smoke',
                name: 'Attack Weight Smoke',
                playerUnits: [
                    createUnit('attacker', 'Attacker', [weightSkill], 6),
                    createUnit('dummy', 'Dummy', [dummySkill], 5),
                ],
                enemyUnits: [
                    createUnit('enemy1', 'Enemy 1', [enemyGuard], 1),
                    createUnit('enemy2', 'Enemy 2', [enemyGuard], 1),
                    createUnit('enemy3', 'Enemy 3', [enemyGuard], 1),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
            peekRollToken,
            consumeRollToken,
        });

        engine.selectSlot('player-slot-2');
        engine.selectSkill('dummy_skill');
        engine.selectTarget('enemy-slot-2');

        engine.selectSlot('player-slot-1');
        engine.selectSkill('weight_skill');
        engine.selectTarget('enemy-slot-2');

        engine.selectSlot('player-slot-2');
        engine.selectTarget('enemy-slot-3');

        const stateBefore = engine.getState();
        const attackerSlot = stateBefore.playerSlots.find((slot) => slot.id === 'player-slot-1');
        assert(Array.isArray(attackerSlot?.targetSlotIds), 'Expected attackerSlot.targetSlotIds to be an array.');
        assert(attackerSlot.targetSlotIds[0] === 'enemy-slot-2', `Expected primary target to be enemy-slot-2, got ${attackerSlot.targetSlotIds[0]}`);
        assert(attackerSlot.targetSlotIds[1] === 'enemy-slot-1', `Expected Attack Weight to pick untargeted enemy-slot-1 as extra, got ${attackerSlot.targetSlotIds[1]}`);

        engine.resolveTurn();

        const state = engine.getState();
        const hitsByAttacker = state.events
            .filter((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Attacker')
            .map((event) => event.data?.defenderName);
        assert(hitsByAttacker.includes('Enemy 2'), `Expected attacker to hit Enemy 2, got [${hitsByAttacker.join(', ')}]`);
        assert(hitsByAttacker.includes('Enemy 1'), `Expected attacker to hit Enemy 1 via Attack Weight, got [${hitsByAttacker.join(', ')}]`);
    });

    test('Effect targeting: deployment order breaks ties for highest HP', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({
            id: 'deployment_mark',
            label: 'Deployment Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const markPassive = {
            id: 'markPassive',
            name: 'Mark Passive',
            description: 'Marks the highest HP opponent.',
            hooks: {
                turnStart: [
                    {
                        actions: [
                            { type: 'applyStatus', target: 'highestHpOpponent', statusId: 'deployment_mark', count: 1 },
                        ],
                    },
                ],
            },
        };

        const createUnit = (id, name, skills, speed, extra = {}) => ({
            id,
            name,
            level: 1,
            maxHp: 100,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
            ...extra,
        });

        const noopSkill = {
            id: 'noop',
            name: 'No-op',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'deployment-tiebreak',
                name: 'Deployment Tiebreak',
                playerUnits: [
                    createUnit('ally', 'Ally', [noopSkill], 5, { passives: [markPassive] }),
                ],
                enemyUnits: [
                    createUnit('enemyA', 'Enemy A', [noopSkill], 1, { deploymentOrder: 2 }),
                    createUnit('enemyB', 'Enemy B', [noopSkill], 1, { deploymentOrder: 1 }),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        const state = engine.getState();
        const enemyB = state.enemyUnits.find((unit) => unit.id === 'enemyB');
        const enemyA = state.enemyUnits.find((unit) => unit.id === 'enemyA');
        const markOnB = enemyB?.statuses?.some((status) => status.id === 'deployment_mark') || false;
        const markOnA = enemyA?.statuses?.some((status) => status.id === 'deployment_mark') || false;
        assert(markOnB === true, 'Expected deployment_mark to land on enemyB (lower deploymentOrder).');
        assert(markOnA === false, 'Expected deployment_mark not to land on enemyA.');
    });

    test('Engine: sanity model triggers Low Morale panic state and locks player input', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        const registerPanicStateDefinition = battleModules.registry?.registerPanicStateDefinition || battleModules.registerPanicStateDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');
        assert(typeof registerPanicStateDefinition === 'function', 'Expected registerPanicStateDefinition to exist.');

        registerStatusDefinition({ id: 'panic_hook_mark', label: 'Panic Hook Mark' });
        registerStatusDefinition({
            id: 'panic_hook_mark',
            label: 'Panic Hook Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        registerPanicStateDefinition({
            id: 'low_morale',
            label: 'Low Morale',
            behavior: {
                mode: 'ai',
                lockPlayerInput: true,
                aiProfile: { skill: 'first', target: 'firstLiving' },
            },
            hooks: {
                turnStart: [
                    {
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'panic_hook_mark', count: 1 },
                        ],
                    },
                ],
            },
        }, { allowOverwrite: true });
        registerPanicStateDefinition({
            id: 'panic',
            label: 'Panic',
            behavior: {
                mode: 'skip',
                lockPlayerInput: true,
            },
        }, { allowOverwrite: true });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skillA = {
            id: 'skill_a',
            name: 'Skill A',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const skillB = {
            id: 'skill_b',
            name: 'Skill B',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyGuard = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, sp) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'sanity-low-morale-smoke',
                name: 'Sanity Low Morale Smoke',
                playerUnits: [createUnit('ally', 'Ally', [skillA, skillB], 5, -30)],
                enemyUnits: [createUnit('enemy', 'Enemy', [enemyGuard], 1, 0)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    sanityModel: {
                        lowMorale: { spAtOrBelow: -30, stateId: 'low_morale', chance: 1 },
                        panic: { spAtOrBelow: -45, stateId: 'panic' },
                        clearSpAtOrAbove: -29,
                    },
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.playerUnits[0].runtimeState?.panicStateId === 'low_morale', `Expected panicStateId to be low_morale, got ${state.playerUnits[0].runtimeState?.panicStateId}`);
        assert(state.playerSlots[0].selectedSkillId === 'skill_a', `Expected Low Morale to auto-select skill_a, got ${state.playerSlots[0].selectedSkillId}`);
        const markCount = state.playerUnits[0].statuses.find((status) => status.id === 'panic_hook_mark')?.count || 0;
        assert(markCount === 1, `Expected Low Morale turnStart hook to apply mark, got ${markCount}`);

        assert(engine.selectSkill('skill_b', 'player-slot-1') === false, 'Expected skill selection to be locked by Low Morale.');
        assert(engine.selectTarget('enemy-slot-1', 'player-slot-1') === false, 'Expected target selection to be locked by Low Morale.');
    });

    test('Engine: sanity model Panic at -45 skips turn', () => {
        const battleModules = createBattleEnvironment();
        const registerPanicStateDefinition = battleModules.registry?.registerPanicStateDefinition || battleModules.registerPanicStateDefinition;
        assert(typeof registerPanicStateDefinition === 'function', 'Expected registerPanicStateDefinition to exist.');

        registerPanicStateDefinition({
            id: 'panic',
            label: 'Panic',
            behavior: {
                mode: 'skip',
                lockPlayerInput: true,
            },
        }, { allowOverwrite: true });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skillA = {
            id: 'skill_a',
            name: 'Skill A',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'enemy_skill',
            name: 'Enemy Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };
        const createUnit = (id, name, skills, speed, sp) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'sanity-panic-smoke',
                name: 'Sanity Panic Smoke',
                playerUnits: [createUnit('ally', 'Ally', [skillA], 5, -45)],
                enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill], 1, 0)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    sanityModel: {
                        lowMorale: { spAtOrBelow: -30, stateId: 'low_morale', chance: 1 },
                        panic: { spAtOrBelow: -45, stateId: 'panic' },
                        clearSpAtOrAbove: -29,
                    },
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.playerUnits[0].runtimeState?.panicStateId === 'panic', `Expected panicStateId to be panic, got ${state.playerUnits[0].runtimeState?.panicStateId}`);
        assert(state.playerSlots[0].resolved === true, 'Expected Panic to resolve the slot immediately.');
        assert(state.playerSlots[0].selectedSkillId == null, `Expected Panic to clear selectedSkillId, got ${state.playerSlots[0].selectedSkillId}`);
        assert(engine.selectSlot('player-slot-1') === false, 'Expected slot selection to be locked by Panic.');

        engine.resolveTurn();
        const stateAfter = engine.getState();
        const skipped = stateAfter.events.some((event) => event.type === 'panic_turn_skipped' && event.data?.unitName === 'Ally');
        assert(skipped, 'Expected panic_turn_skipped event to be emitted.');
    });

    test('Engine: waves advance and end on final wave', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const bigHit = {
            id: 'big_hit',
            name: 'Big Hit',
            skillType: 'attack',
            basePower: 50,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const weakHit = {
            id: 'weak_hit',
            name: 'Weak Hit',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 20) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'wave-smoke',
                name: 'Wave Smoke',
                playerUnits: [createUnit('ally', 'Ally', [bigHit], 5, 999)],
                enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [weakHit], 1, 5)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    waves: [
                        { enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [weakHit], 1, 5)] },
                        { enemyUnits: [createUnit('wave2', 'Wave 2 Enemy', [weakHit], 1, 5)] },
                    ],
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('big_hit');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const afterWave1 = engine.getState();
        assert(afterWave1.wave === 2, `Expected wave to advance to 2, got ${afterWave1.wave}`);
        assert(afterWave1.winner == null, `Expected no winner after wave 1, got ${afterWave1.winner}`);
        assert(afterWave1.enemyUnits[0]?.name === 'Wave 2 Enemy', `Expected wave 2 enemy, got ${afterWave1.enemyUnits[0]?.name}`);

        engine.advanceTurn();
        engine.selectSlot('player-slot-1');
        engine.selectSkill('big_hit');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const afterWave2 = engine.getState();
        assert(afterWave2.winner === 'player', `Expected player to win after final wave, got ${afterWave2.winner}`);
    });

    test('Engine: maxTurns ends battle as defeat when reached', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 999) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'turn-limit-smoke',
                name: 'Turn Limit Smoke',
                playerUnits: [createUnit('ally', 'Ally', [poke], 5)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('poke');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.winner === 'enemy', `Expected enemy winner on turn limit, got ${state.winner}`);
        const ended = state.events.some((event) => event.type === 'battle_ended' && event.data?.reason === 'turn_limit');
        assert(ended, 'Expected battle_ended reason turn_limit.');
    });

    test('Engine: scripted encounter events trigger across battle lifecycle', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        const registerMark = (id, label) => {
            registerStatusDefinition({ id, label });
            registerStatusDefinition({
                id,
                label,
                countOnly: true,
                stackModel: {
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0 },
                },
                hooks: {},
            });
        };

        registerMark('evt_battle_start', 'Event Battle Start');
        registerMark('evt_turn_start', 'Event Turn Start');
        registerMark('evt_turn_end', 'Event Turn End');
        registerMark('evt_unit_defeated', 'Event Unit Defeated');
        registerMark('evt_battle_end', 'Event Battle End');

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const finisher = {
            id: 'finisher',
            name: 'Finisher',
            skillType: 'attack',
            basePower: 99,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 10) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const scriptedEvents = [
            { id: 'evt_battle_start', trigger: 'battleStart', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_battle_start', count: 1 }] },
            { id: 'evt_turn_start', trigger: 'turnStart', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_turn_start', count: 1 }] },
            { id: 'evt_turn_end', trigger: 'turnEnd', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_turn_end', count: 1 }] },
            { id: 'evt_unit_defeated', trigger: 'unitDefeated', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_unit_defeated', count: 1 }] },
            { id: 'evt_battle_end', trigger: 'battleEnd', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_battle_end', count: 1 }] },
        ];

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'scripted-events-lifecycle',
                name: 'Scripted Events Lifecycle',
                playerUnits: [createUnit('ally', 'Ally', [finisher], 5, 999)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1, 5)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    scriptedEvents,
                },
            },
            clamp,
        });

        const initial = engine.getState();
        const initialMarks = new Map((initial.playerUnits[0].statuses || []).map((status) => [status.id, status.count || 0]));
        assert(initialMarks.get('evt_battle_start') === 1, `Expected evt_battle_start to be 1, got ${initialMarks.get('evt_battle_start')}`);
        assert(initialMarks.get('evt_turn_start') === 1, `Expected evt_turn_start to be 1, got ${initialMarks.get('evt_turn_start')}`);

        engine.selectSlot('player-slot-1');
        engine.selectSkill('finisher');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const after = engine.getState();
        assert(after.winner === 'player', `Expected player to win, got ${after.winner}`);
        const afterMarks = new Map((after.playerUnits[0].statuses || []).map((status) => [status.id, status.count || 0]));
        assert(afterMarks.get('evt_turn_end') === 1, `Expected evt_turn_end to be 1, got ${afterMarks.get('evt_turn_end')}`);
        assert(afterMarks.get('evt_unit_defeated') === 1, `Expected evt_unit_defeated to be 1, got ${afterMarks.get('evt_unit_defeated')}`);
        assert(afterMarks.get('evt_battle_end') === 1, `Expected evt_battle_end to be 1, got ${afterMarks.get('evt_battle_end')}`);
    });

    test('Engine: scripted stagger threshold event fires with optional threshold filter', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'evt_stagger_75', label: 'Event Stagger 75' });
        registerStatusDefinition({
            id: 'evt_stagger_75',
            label: 'Event Stagger 75',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const finisher = {
            id: 'finisher',
            name: 'Finisher',
            skillType: 'attack',
            basePower: 99,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 100, staggerThresholds = []) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds,
            sprites: { skills: {} },
            skills,
            passives: [],
        });

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'scripted-stagger-threshold',
                name: 'Scripted Stagger Threshold',
                playerUnits: [createUnit('ally', 'Ally', [finisher], 5, 100)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1, 100, [0.75])],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    scriptedEvents: [
                        {
                            id: 'evt_stagger_75',
                            trigger: 'staggerThresholdCrossed',
                            side: 'enemy',
                            threshold: 0.75,
                            hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_stagger_75', count: 1 }],
                        },
                    ],
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('finisher');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const after = engine.getState();
        const enemy = after.enemyUnits[0];
        const marks = new Map((enemy.statuses || []).map((status) => [status.id, status.count || 0]));
        assert(marks.get('evt_stagger_75') === 1, `Expected evt_stagger_75 on enemy, got ${marks.get('evt_stagger_75')}`);
    });

    test('Engine: scripted encounter events trigger on waveStart', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'evt_wave_start', label: 'Event Wave Start' });
        registerStatusDefinition({
            id: 'evt_wave_start',
            label: 'Event Wave Start',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const bigHit = {
            id: 'big_hit',
            name: 'Big Hit',
            skillType: 'attack',
            basePower: 50,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const weakHit = {
            id: 'weak_hit',
            name: 'Weak Hit',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 20) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'scripted-events-wave',
                name: 'Scripted Events Wave',
                playerUnits: [createUnit('ally', 'Ally', [bigHit], 5, 999)],
                enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [weakHit], 1, 5)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    waves: [
                        { enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [weakHit], 1, 5)] },
                        { enemyUnits: [createUnit('wave2', 'Wave 2 Enemy', [weakHit], 1, 5)] },
                    ],
                    scriptedEvents: [
                        { id: 'evt_wave_start', trigger: 'waveStart', side: 'player', hook: [{ type: 'applyStatus', target: 'self', statusId: 'evt_wave_start', count: 1 }] },
                    ],
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('big_hit');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const afterWave1 = engine.getState();
        assert(afterWave1.wave === 2, `Expected wave to advance to 2, got ${afterWave1.wave}`);
        assert(afterWave1.winner == null, `Expected no winner after wave 1, got ${afterWave1.winner}`);
        const waveMark = afterWave1.playerUnits[0].statuses.find((status) => status.id === 'evt_wave_start')?.count || 0;
        assert(waveMark === 1, `Expected evt_wave_start to be 1, got ${waveMark}`);
    });

    test('Engine: hit_resolved carries damage formula breakdown data', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 5,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 30) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'breakdown-smoke',
                name: 'Breakdown Smoke',
                playerUnits: [createUnit('ally', 'Ally', [poke], 5)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('poke');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        const hit = state.events.find((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally')?.data || null;
        assert(hit, 'Expected Ally hit_resolved event.');
        assert(hit.breakdown && typeof hit.breakdown === 'object', 'Expected hit_resolved.breakdown to be an object.');
        assert(typeof hit.breakdown.basePower === 'number', `Expected breakdown.basePower to be a number, got ${typeof hit.breakdown.basePower}`);
    });

    test('Effect runner: endBattle can end the encounter from scripted events', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 30) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'end-battle-smoke',
                name: 'End Battle Smoke',
                playerUnits: [createUnit('ally', 'Ally', [poke], 5)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    scriptedEvents: [
                        { id: 'end_now', trigger: 'battleStart', side: 'player', hook: [{ type: 'endBattle', winner: 'player', reason: 'scripted' }] },
                    ],
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.winner === 'player', `Expected winner to be player, got ${state.winner}`);
        const ended = state.events.some((event) => event.type === 'battle_ended' && event.data?.winner === 'player' && event.data?.reason === 'scripted');
        assert(ended, 'Expected battle_ended event with scripted reason.');
    });

    test('Effect runner: spawnWave spawns the requested wave', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 30) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'spawn-wave-smoke',
                name: 'Spawn Wave Smoke',
                playerUnits: [createUnit('ally', 'Ally', [poke], 5)],
                enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [poke], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    waves: [
                        { enemyUnits: [createUnit('wave1', 'Wave 1 Enemy', [poke], 1)] },
                        { enemyUnits: [createUnit('wave2', 'Wave 2 Enemy', [poke], 1)] },
                    ],
                    scriptedEvents: [
                        { id: 'force_wave_2', trigger: 'battleStart', side: 'player', hook: [{ type: 'spawnWave', value: 2 }] },
                    ],
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.wave === 2, `Expected wave to be 2, got ${state.wave}`);
        assert(state.enemyUnits[0]?.name === 'Wave 2 Enemy', `Expected wave 2 enemy, got ${state.enemyUnits[0]?.name}`);
        const waveStarted = state.events.some((event) => event.type === 'wave_started' && event.data?.wave === 2);
        assert(waveStarted, 'Expected wave_started event for wave 2.');
    });

    test('Effect runner: spawnReinforcement adds a new unit mid-encounter', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, hp = 30) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'reinforcement-smoke',
                name: 'Reinforcement Smoke',
                playerUnits: [createUnit('ally', 'Ally', [poke], 5)],
                enemyUnits: [createUnit('enemy', 'Enemy', [poke], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 10,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    scriptedEvents: [
                        {
                            id: 'spawn_reinforcement',
                            trigger: 'battleStart',
                            side: 'player',
                            hook: [
                                {
                                    type: 'spawnReinforcement',
                                    side: 'enemy',
                                    unit: createUnit('enemy_reinforce', 'Reinforcement', [poke], 1),
                                },
                            ],
                        },
                    ],
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.enemyUnits.length === 2, `Expected 2 enemies after reinforcement, got ${state.enemyUnits.length}`);
        const spawned = state.events.some((event) => event.type === 'reinforcement_spawned' && event.data?.side === 'enemy');
        assert(spawned, 'Expected reinforcement_spawned event.');
    });

    test('Engine: panic state corrode mode forces a skill selection', () => {
        const battleModules = createBattleEnvironment();
        const registerPanicStateDefinition = battleModules.registry?.registerPanicStateDefinition || battleModules.registerPanicStateDefinition;
        assert(typeof registerPanicStateDefinition === 'function', 'Expected registerPanicStateDefinition to exist.');

        registerPanicStateDefinition({
            id: 'corrode_panic',
            label: 'Corrode Panic',
            behavior: {
                mode: 'corrode',
                lockPlayerInput: true,
                forcedSkillId: 'skill_b',
                forcedTarget: 'firstLiving',
            },
        }, { allowOverwrite: true });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skillA = {
            id: 'skill_a',
            name: 'Skill A',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const skillB = {
            id: 'skill_b',
            name: 'Skill B',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const createUnit = (id, name, skills, speed, sp = -45, hp = 30) => ({
            id,
            name,
            level: 1,
            maxHp: hp,
            sp,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'corrode-smoke',
                name: 'Corrode Smoke',
                playerUnits: [createUnit('ally', 'Ally', [skillA, skillB], 5, -45)],
                enemyUnits: [createUnit('enemy', 'Enemy', [skillA], 1, 0)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                    sanityModel: {
                        panic: { spAtOrBelow: -45, stateId: 'corrode_panic' },
                        clearSpAtOrAbove: -29,
                    },
                },
            },
            clamp,
        });

        const state = engine.getState();
        assert(state.playerUnits[0].runtimeState?.panicStateId === 'corrode_panic', `Expected panicStateId to be corrode_panic, got ${state.playerUnits[0].runtimeState?.panicStateId}`);
        assert(state.playerSlots[0].selectedSkillId === 'skill_b', `Expected corrode to force skill_b, got ${state.playerSlots[0].selectedSkillId}`);
        assert(engine.selectSlot('player-slot-1') === false, 'Expected slot selection to be locked by corrode panic.');
    });

    test('Effect runner: encounterResource amount supports side scoping', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_side_amount_mark', label: 'Side Amount Mark' });
        registerStatusDefinition({
            id: 'test_side_amount_mark',
            label: 'Side Amount Mark',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const passive = {
            id: 'side_amount_passive',
            name: 'Side Amount Passive',
            hooks: {
                turnEnd: [
                    {
                        actions: [
                            {
                                type: 'applyStatus',
                                target: 'self',
                                statusId: 'test_side_amount_mark',
                                countAmount: {
                                    encounterResource: {
                                        target: 'battle',
                                        resourceId: 'wrath',
                                        side: 'self',
                                    },
                                },
                            },
                        ],
                    },
                ],
            },
        };

        const wrathSkill = {
            id: 'wrath_skill',
            name: 'Wrath Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'enemy_guard',
            name: 'Enemy Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, passives = []) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'side-amount-smoke',
                name: 'Side Amount Smoke',
                playerUnits: [
                    createUnit('ally', 'Ally', [wrathSkill], [passive]),
                ],
                enemyUnits: [
                    createUnit('enemy', 'Enemy', [enemySkill]),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.encounterResources['player:wrath'] === 1, `Expected player:wrath to be 1, got ${state.encounterResources['player:wrath']}`);
        const mark = state.playerUnits[0].statuses.find((status) => status.id === 'test_side_amount_mark')?.count || 0;
        assert(mark === 1, `Expected side-scoped encounterResource amount to apply 1 mark, got ${mark}`);
    });

    test('Effect runner: encounterResource conditions support side scoping', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'test_side_cond_self', label: 'Side Cond Self' });
        registerStatusDefinition({
            id: 'test_side_cond_self',
            label: 'Side Cond Self',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        registerStatusDefinition({ id: 'test_side_cond_opp', label: 'Side Cond Opp' });
        registerStatusDefinition({
            id: 'test_side_cond_opp',
            label: 'Side Cond Opp',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        const passive = {
            id: 'side_condition_passive',
            name: 'Side Condition Passive',
            hooks: {
                turnEnd: [
                    {
                        conditions: [
                            { type: 'encounterResourceAtLeast', resourceId: 'wrath', value: 2, side: 'self' },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'test_side_cond_self', count: 1 },
                        ],
                    },
                    {
                        conditions: [
                            { type: 'encounterResourceAtLeast', resourceId: 'pride', value: 1, side: 'opponent' },
                        ],
                        actions: [
                            { type: 'applyStatus', target: 'self', statusId: 'test_side_cond_opp', count: 1 },
                        ],
                    },
                ],
            },
        };

        const wrathSkill = {
            id: 'wrath_skill',
            name: 'Wrath Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const prideSkill = {
            id: 'pride_skill',
            name: 'Pride Skill',
            skillType: 'attack',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'pride',
            effects: [],
        };

        const createUnit = (id, name, skills, passives = [], speed = 2) => ({
            id,
            name,
            level: 1,
            maxHp: 999,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives,
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'side-cond-smoke',
                name: 'Side Cond Smoke',
                playerUnits: [
                    createUnit('ally1', 'Ally 1', [wrathSkill], [passive], 6),
                    createUnit('ally2', 'Ally 2', [wrathSkill], [], 5),
                ],
                enemyUnits: [
                    createUnit('enemy', 'Enemy', [prideSkill], [], 1),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        engine.selectSlot('player-slot-1');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.selectSlot('player-slot-2');
        engine.selectSkill('wrath_skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const state = engine.getState();
        assert(state.encounterResources['player:wrath'] === 2, `Expected player:wrath to be 2, got ${state.encounterResources['player:wrath']}`);
        assert(state.encounterResources['enemy:pride'] === 1, `Expected enemy:pride to be 1, got ${state.encounterResources['enemy:pride']}`);
        const selfMark = state.playerUnits[0].statuses.find((status) => status.id === 'test_side_cond_self')?.count || 0;
        assert(selfMark === 1, `Expected side=self condition to apply mark, got ${selfMark}`);
        const oppMark = state.playerUnits[0].statuses.find((status) => status.id === 'test_side_cond_opp')?.count || 0;
        assert(oppMark === 1, `Expected side=opponent condition to apply mark, got ${oppMark}`);
    });

    test('Golden fixture: coinRoll status triggers before hit resolution', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

        registerStatusDefinition({ id: 'fixture_bleed', label: 'Fixture Bleed' });
        registerStatusDefinition({
            id: 'fixture_bleed',
            label: 'Fixture Bleed',
            description: 'On coin roll, take fixed damage equal to Potency, then lose 1 Count.',
            stackModel: {
                potency: { enabled: true, min: 0, max: 99, application: 'add' },
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                coinRoll: [
                    {
                        actions: [
                            {
                                type: 'dealFixedDamage',
                                target: 'self',
                                statusId: 'fixture_bleed',
                                amount: {
                                    statusPotency: {
                                        target: 'self',
                                        statusId: 'fixture_bleed',
                                    },
                                },
                            },
                            {
                                type: 'adjustStatus',
                                target: 'self',
                                statusId: 'fixture_bleed',
                                countDelta: -1,
                            },
                        ],
                    },
                ],
            },
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const playerSkill = {
            id: 'two_coin',
            name: 'Two Coin',
            skillType: 'attack',
            basePower: 3,
            coinPower: 1,
            coinCount: 2,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 1,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-coinroll-before-hit',
            name: 'Golden CoinRoll Before Hit',
            playerUnits: [createUnit('ally', 'Ally', [playerSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [{ type: 'heads', value: 0 }],
            'enemy-slot-1': [{ type: 'heads', value: 0 }],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'fixture_bleed', potency: 2, count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('two_coin');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const normalizedEvents = state.events.map((event) => ({
                type: event.type,
                turn: event.turn,
                data: event.data,
            }));
            const firstBleed = normalizedEvents.findIndex((event) => event.type === 'status_triggered' && event.data?.statusId === 'fixture_bleed');
            const firstHit = normalizedEvents.findIndex((event) => event.type === 'hit_resolved');
            assert(firstBleed >= 0, 'Expected at least one fixture_bleed status_triggered event.');
            assert(firstHit >= 0, 'Expected at least one hit_resolved event.');
            assert(firstBleed < firstHit, `Expected fixture_bleed trigger to occur before hit resolution. bleed=${firstBleed} hit=${firstHit}`);
            assert(state.playerUnits[0].hp === 28, `Expected Ally HP 28 after one 2-damage bleed proc, got ${state.playerUnits[0].hp}`);
            assert(!state.playerUnits[0].statuses.some((status) => status.id === 'fixture_bleed'), 'Expected fixture_bleed to expire after count reaches 0.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden fixture: clash repeated ties resolve via speed-break at 6', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 40,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const tieSkill = {
            id: 'tie',
            name: 'Tie',
            skillType: 'attack',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-clash-tie-break',
            name: 'Golden Clash Tie Break',
            playerUnits: [createUnit('ally', 'Ally', [tieSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [tieSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [{ type: 'heads', value: 0 }],
            'enemy-slot-1': [{ type: 'heads', value: 0 }],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('tie');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const events = engine.getState().events.map((event) => ({
                type: event.type,
                data: event.data,
            }));
            const clashRounds = events.filter((event) => event.type === 'clash_round');
            assert(clashRounds.length === 7, `Expected 7 clash rounds (6 ties + speed break), got ${clashRounds.length}`);
            const last = clashRounds[clashRounds.length - 1]?.data?.result || null;
            assert(last === 'left-speed-break', `Expected final clash round to be left-speed-break, got ${last}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: deterministic clash event stream', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 40,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const playerSkill = {
            id: 'high',
            name: 'High',
            skillType: 'attack',
            basePower: 5,
            coinPower: 2,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'low',
            name: 'Low',
            skillType: 'attack',
            basePower: 5,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-clash',
            name: 'Golden Snapshot Clash',
            playerUnits: [createUnit('ally', 'Ally', [playerSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true, true],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('high');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'clash_round',
                'clash_won',
                'sanity_changed',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        return {
                            type: event.type,
                            engagementType: data.engagementType,
                            leftUnitName: data.leftUnitName,
                            rightUnitName: data.rightUnitName,
                            leftSkillName: data.leftSkillName,
                            rightSkillName: data.rightSkillName,
                        };
                    }
                    if (event.type === 'clash_round') {
                        return {
                            type: event.type,
                            index: data.index,
                            result: data.result,
                            roundWinnerName: data.roundWinnerName,
                            roundLoserName: data.roundLoserName,
                        };
                    }
                    if (event.type === 'clash_won') {
                        return { type: event.type, winnerName: data.winnerName, loserName: data.loserName, remainingCoins: data.remainingCoins };
                    }
                    if (event.type === 'sanity_changed') {
                        return { type: event.type, unitName: data.unitName, previousSp: data.previousSp, nextSp: data.nextSp, reason: data.reason };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, index: data.index, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, coinFace: data.coinFace };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Low', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'High' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'engagement_started', engagementType: 'clash', leftUnitName: 'Ally', rightUnitName: 'Enemy', leftSkillName: 'High', rightSkillName: 'Low' },
                { type: 'clash_round', index: 1, result: 'left-win', roundWinnerName: 'Ally', roundLoserName: 'Enemy' },
                { type: 'clash_won', winnerName: 'Ally', loserName: 'Enemy', remainingCoins: 1 },
                { type: 'sanity_changed', unitName: 'Ally', previousSp: 0, nextSp: 5, reason: 'clash win' },
                { type: 'sanity_changed', unitName: 'Enemy', previousSp: 0, nextSp: -5, reason: 'clash loss' },
                { type: 'hit_resolved', index: 1, attackerName: 'Ally', defenderName: 'Enemy', skillName: 'High', coinFace: 'Heads' },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected event stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: deterministic battle end ordering', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const finisher = {
            id: 'finisher',
            name: 'Finisher',
            skillType: 'attack',
            basePower: 60,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'low',
            name: 'Low',
            skillType: 'attack',
            basePower: 5,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-battle-end',
            name: 'Golden Snapshot Battle End',
            playerUnits: [createUnit('ally', 'Ally', [finisher])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [true, true],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('finisher');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'clash_round',
                'clash_won',
                'sanity_changed',
                'hit_resolved',
                'unit_defeated',
                'battle_ended',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        return {
                            type: event.type,
                            engagementType: data.engagementType,
                            leftUnitName: data.leftUnitName,
                            rightUnitName: data.rightUnitName,
                            leftSkillName: data.leftSkillName,
                            rightSkillName: data.rightSkillName,
                        };
                    }
                    if (event.type === 'clash_round') {
                        return { type: event.type, index: data.index, result: data.result, roundWinnerName: data.roundWinnerName, roundLoserName: data.roundLoserName };
                    }
                    if (event.type === 'clash_won') {
                        return { type: event.type, winnerName: data.winnerName, loserName: data.loserName, remainingCoins: data.remainingCoins };
                    }
                    if (event.type === 'sanity_changed') {
                        return { type: event.type, unitName: data.unitName, previousSp: data.previousSp, nextSp: data.nextSp, reason: data.reason };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, index: data.index, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, coinFace: data.coinFace };
                    }
                    if (event.type === 'unit_defeated') {
                        return { type: event.type, unitId: data.unitId, unitName: data.unitName, defeatedById: data.defeatedById, defeatedByName: data.defeatedByName };
                    }
                    if (event.type === 'battle_ended') {
                        return { type: event.type, winner: data.winner, winnerId: data.winnerId, winnerName: data.winnerName };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Low', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Finisher' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'engagement_started', engagementType: 'clash', leftUnitName: 'Ally', rightUnitName: 'Enemy', leftSkillName: 'Finisher', rightSkillName: 'Low' },
                { type: 'clash_round', index: 1, result: 'left-win', roundWinnerName: 'Ally', roundLoserName: 'Enemy' },
                { type: 'clash_won', winnerName: 'Ally', loserName: 'Enemy', remainingCoins: 1 },
                { type: 'sanity_changed', unitName: 'Ally', previousSp: 0, nextSp: 5, reason: 'clash win' },
                { type: 'sanity_changed', unitName: 'Enemy', previousSp: 0, nextSp: -5, reason: 'clash loss' },
                { type: 'hit_resolved', index: 1, attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Finisher', coinFace: 'Heads' },
                { type: 'unit_defeated', unitId: 'enemy', unitName: 'Enemy', defeatedById: 'ally', defeatedByName: 'Ally' },
                { type: 'battle_ended', winner: 'player', winnerId: 'ally', winnerName: 'Ally' },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected battle end stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: one-sided attack into guard shield', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const attackSkill = {
            id: 'jab',
            name: 'Jab',
            skillType: 'attack',
            basePower: 8,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const guardSkill = {
            id: 'guard',
            name: 'Guard',
            skillType: 'guard',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-guard',
            name: 'Golden Snapshot Guard',
            playerUnits: [createUnit('ally', 'Ally', [attackSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [guardSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('jab');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'shield_changed',
                'status_triggered',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        return { type: event.type, engagementType: data.engagementType, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    if (event.type === 'shield_changed') {
                        return { type: event.type, unitName: data.unitName, shieldId: data.shieldId, previousAmount: data.previousAmount, nextAmount: data.nextAmount, reason: data.reason };
                    }
                    if (event.type === 'status_triggered') {
                        return { type: event.type, unitName: data.unitName, statusId: data.statusId, damage: data.damage };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, coinFace: data.coinFace, damage: data.damage };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Guard', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Jab' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'engagement_started', engagementType: 'one-sided', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Jab' },
                { type: 'shield_changed', unitName: 'Enemy', shieldId: 'guard', previousAmount: 0, nextAmount: 10, reason: 'Guard' },
                { type: 'status_triggered', unitName: 'Enemy', statusId: 'guard', damage: 10 },
                { type: 'shield_changed', unitName: 'Enemy', shieldId: 'total', previousAmount: 10, nextAmount: 2, reason: 'damage absorbed' },
                { type: 'hit_resolved', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Jab', coinFace: 'Tails', damage: 0 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected guard stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: one-sided attack against evade', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const attackSkill = {
            id: 'jab',
            name: 'Jab',
            skillType: 'attack',
            basePower: 5,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const evadeSkill = {
            id: 'evade',
            name: 'Evade',
            skillType: 'evade',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-evade',
            name: 'Golden Snapshot Evade',
            playerUnits: [createUnit('ally', 'Ally', [attackSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [evadeSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('jab');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'status_triggered',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        return { type: event.type, engagementType: data.engagementType, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    if (event.type === 'status_triggered') {
                        return { type: event.type, unitName: data.unitName, statusId: data.statusId, damage: data.damage };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Evade', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Jab' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'engagement_started', engagementType: 'one-sided', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Jab' },
                { type: 'status_triggered', unitName: 'Enemy', statusId: 'evade', damage: 0 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected evade stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: counter defense follow-up engagement', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const attackSkill = {
            id: 'jab',
            name: 'Jab',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const counterSkill = {
            id: 'counter',
            name: 'Counter',
            skillType: 'counter',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-counter',
            name: 'Golden Snapshot Counter',
            playerUnits: [createUnit('ally', 'Ally', [attackSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [counterSkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('jab');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        return { type: event.type, engagementType: data.engagementType, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, damage: data.damage };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Counter', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Jab' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'engagement_started', engagementType: 'one-sided', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Jab' },
                { type: 'hit_resolved', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Jab', damage: 4 },
                { type: 'engagement_started', engagementType: 'one-sided', attackerName: 'Enemy', defenderName: 'Ally', skillName: 'Counter' },
                { type: 'hit_resolved', attackerName: 'Enemy', defenderName: 'Ally', skillName: 'Counter', damage: 3 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected counter stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: redirect clash overrides enemy intent', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills, speed) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const redirectSkill = {
            id: 'taunt_slash',
            name: 'Taunt Slash',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const evadeSkill = {
            id: 'evade',
            name: 'Evade',
            skillType: 'evade',
            basePower: 8,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyStrong = {
            id: 'strike',
            name: 'Strike',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemyWeak = {
            id: 'stab',
            name: 'Stab',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-redirect',
            name: 'Golden Snapshot Redirect',
            playerUnits: [
                createUnit('ally1', 'Ally 1', [redirectSkill], 5),
                createUnit('ally2', 'Ally 2', [evadeSkill], 1),
            ],
            enemyUnits: [
                createUnit('enemy1', 'Enemy 1', [enemyStrong], 4),
                createUnit('enemy2', 'Enemy 2', [enemyWeak], 2),
            ],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false, false],
            'player-slot-2': [false],
            'enemy-slot-1': [false],
            'enemy-slot-2': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('taunt_slash');
            engine.selectTarget('enemy-slot-2');

            engine.selectSlot('player-slot-2');
            engine.selectSkill('evade');
            engine.selectTarget('enemy-slot-1');

            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'engagement_started',
                'clash_round',
                'clash_won',
                'sanity_changed',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        if (data.engagementType === 'clash') {
                            return { type: event.type, engagementType: 'clash', leftUnitName: data.leftUnitName, rightUnitName: data.rightUnitName, leftSkillName: data.leftSkillName, rightSkillName: data.rightSkillName };
                        }
                        return { type: event.type, engagementType: 'one-sided', attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    if (event.type === 'clash_round') {
                        return { type: event.type, index: data.index, result: data.result, roundWinnerName: data.roundWinnerName, roundLoserName: data.roundLoserName };
                    }
                    if (event.type === 'clash_won') {
                        return { type: event.type, winnerName: data.winnerName, loserName: data.loserName, remainingCoins: data.remainingCoins };
                    }
                    if (event.type === 'sanity_changed') {
                        return { type: event.type, unitName: data.unitName, previousSp: data.previousSp, nextSp: data.nextSp, reason: data.reason };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, coinFace: data.coinFace, damage: data.damage };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally 1', slotLabel: 'Slot 1', speed: 5 },
                { type: 'slot_speed_rolled', unitName: 'Ally 2', slotLabel: 'Slot 2', speed: 1 },
                { type: 'slot_speed_rolled', unitName: 'Enemy 1', slotLabel: 'Slot 1', speed: 4 },
                { type: 'slot_speed_rolled', unitName: 'Enemy 2', slotLabel: 'Slot 2', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy 1', slotLabel: 'Slot 1', skillName: 'Strike', targetLabel: 'Ally 1 Slot 1' },
                { type: 'enemy_intent_set', unitName: 'Enemy 2', slotLabel: 'Slot 2', skillName: 'Stab', targetLabel: 'Ally 1 Slot 1' },
                { type: 'skill_selected', unitName: 'Ally 1', slotLabel: 'Slot 1', skillName: 'Taunt Slash' },
                { type: 'target_selected', unitName: 'Ally 1', slotLabel: 'Slot 1', targetLabel: 'Enemy 2 Slot 2' },
                { type: 'skill_selected', unitName: 'Ally 2', slotLabel: 'Slot 2', skillName: 'Evade' },
                { type: 'target_selected', unitName: 'Ally 2', slotLabel: 'Slot 2', targetLabel: 'Enemy 1 Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally 1 Slot 1 (5), Enemy 1 Slot 1 (4), Enemy 2 Slot 2 (2), Ally 2 Slot 2 (1)' },
                { type: 'engagement_started', engagementType: 'clash', leftUnitName: 'Ally 1', rightUnitName: 'Enemy 2', leftSkillName: 'Taunt Slash', rightSkillName: 'Stab' },
                { type: 'clash_round', index: 1, result: 'left-win', roundWinnerName: 'Ally 1', roundLoserName: 'Enemy 2' },
                { type: 'clash_won', winnerName: 'Ally 1', loserName: 'Enemy 2', remainingCoins: 1 },
                { type: 'sanity_changed', unitName: 'Ally 1', previousSp: 0, nextSp: 5, reason: 'clash win' },
                { type: 'sanity_changed', unitName: 'Enemy 2', previousSp: 0, nextSp: -5, reason: 'clash loss' },
                { type: 'hit_resolved', attackerName: 'Ally 1', defenderName: 'Enemy 2', skillName: 'Taunt Slash', coinFace: 'Tails', damage: 6 },
                { type: 'engagement_started', engagementType: 'one-sided', attackerName: 'Enemy 1', defenderName: 'Ally 1', skillName: 'Strike' },
                { type: 'hit_resolved', attackerName: 'Enemy 1', defenderName: 'Ally 1', skillName: 'Strike', coinFace: 'Tails', damage: 4 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected redirect stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: ammo cancellation emits skill_cancelled and resolves as one-sided', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const ammoSkill = {
            id: 'ammo_strike',
            name: 'Ammo Strike',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'lca_fracture_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-ammo-cancel',
            name: 'Golden Snapshot Ammo Cancel',
            playerUnits: [createUnit('ally', 'Ally', [ammoSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.selectSlot('player-slot-1');
            engine.selectSkill('ammo_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'resolution_queue_built',
                'skill_cancelled',
                'engagement_started',
                'hit_resolved',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'skill_cancelled') {
                        return { type: event.type, unitName: data.unitName, skillName: data.skillName, reason: data.reason };
                    }
                    if (event.type === 'engagement_started') {
                        if (data.engagementType === 'clash') {
                            return { type: event.type, engagementType: 'clash', leftUnitName: data.leftUnitName, rightUnitName: data.rightUnitName, leftSkillName: data.leftSkillName, rightSkillName: data.rightSkillName };
                        }
                        return { type: event.type, engagementType: data.engagementType };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName, damage: data.damage };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Poke', targetLabel: 'Ally Slot 1' },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Ammo Strike' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'skill_cancelled', unitName: 'Ally', skillName: 'Ammo Strike', reason: 'insufficient LCA Fracture Round' },
                { type: 'engagement_started', engagementType: 'clash', leftUnitName: 'Ally', rightUnitName: 'Enemy', leftSkillName: 'Ammo Strike', rightSkillName: 'Poke' },
                { type: 'hit_resolved', attackerName: 'Enemy', defenderName: 'Ally', skillName: 'Poke', damage: 4 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected ammo cancel stream:\n${JSON.stringify(stream, null, 2)}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: ammo spend emits skill_ammo_spent and applies onSpendOnHit', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'spore.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'sporeRoundBase.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const ammoSkill = {
            id: 'spore_shot',
            name: 'Spore Shot',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'spore_round_base',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-ammo-spend',
            name: 'Golden Snapshot Ammo Spend',
            playerUnits: [createUnit('ally', 'Ally', [ammoSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'spore_round_base', count: 2 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('spore_shot');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const relevantTypes = new Set([
                'battle_started',
                'turn_started',
                'slot_speed_rolled',
                'enemy_intent_set',
                'skill_selected',
                'target_selected',
                'skill_ammo_spent',
                'resolution_queue_built',
                'engagement_started',
                'hit_resolved',
                'status_applied',
            ]);

            const stream = engine.getState().events
                .filter((event) => relevantTypes.has(event.type))
                .map((event) => {
                    const data = event.data || {};
                    if (event.type === 'battle_started') {
                        return { type: event.type };
                    }
                    if (event.type === 'turn_started') {
                        return { type: event.type, turn: data.turn };
                    }
                    if (event.type === 'slot_speed_rolled') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, speed: data.speed };
                    }
                    if (event.type === 'enemy_intent_set') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, skillName: data.skillName };
                    }
                    if (event.type === 'target_selected') {
                        return { type: event.type, unitName: data.unitName, slotLabel: data.slotLabel, targetLabel: data.targetLabel };
                    }
                    if (event.type === 'skill_ammo_spent') {
                        return { type: event.type, unitName: data.unitName, skillName: data.skillName, summary: data.summary };
                    }
                    if (event.type === 'resolution_queue_built') {
                        return { type: event.type, queueLabel: data.queueLabel };
                    }
                    if (event.type === 'engagement_started') {
                        if (data.engagementType === 'clash') {
                            return { type: event.type, engagementType: 'clash', leftUnitName: data.leftUnitName, rightUnitName: data.rightUnitName, leftSkillName: data.leftSkillName, rightSkillName: data.rightSkillName };
                        }
                        return { type: event.type, engagementType: data.engagementType };
                    }
                    if (event.type === 'hit_resolved') {
                        return { type: event.type, attackerName: data.attackerName, defenderName: data.defenderName, skillName: data.skillName };
                    }
                    if (event.type === 'status_applied') {
                        return { type: event.type, unitName: data.unitName, statusId: data.statusId, count: data.count };
                    }
                    return { type: event.type };
                });

            const expected = [
                { type: 'battle_started' },
                { type: 'turn_started', turn: 1 },
                { type: 'slot_speed_rolled', unitName: 'Ally', slotLabel: 'Slot 1', speed: 2 },
                { type: 'slot_speed_rolled', unitName: 'Enemy', slotLabel: 'Slot 1', speed: 2 },
                { type: 'enemy_intent_set', unitName: 'Enemy', slotLabel: 'Slot 1', skillName: 'Poke', targetLabel: 'Ally Slot 1' },
                { type: 'status_applied', unitName: 'Ally', statusId: 'spore_round_base', count: 2 },
                { type: 'skill_selected', unitName: 'Ally', slotLabel: 'Slot 1', skillName: 'Spore Shot' },
                { type: 'target_selected', unitName: 'Ally', slotLabel: 'Slot 1', targetLabel: 'Enemy Slot 1' },
                { type: 'resolution_queue_built', queueLabel: 'Ally Slot 1 (2), Enemy Slot 1 (2)' },
                { type: 'skill_ammo_spent', unitName: 'Ally', skillName: 'Spore Shot', summary: '1 Count Spore Round [Base]' },
                { type: 'engagement_started', engagementType: 'clash', leftUnitName: 'Ally', rightUnitName: 'Enemy', leftSkillName: 'Spore Shot', rightSkillName: 'Poke' },
                { type: 'hit_resolved', attackerName: 'Ally', defenderName: 'Enemy', skillName: 'Spore Shot' },
                { type: 'status_applied', unitName: 'Enemy', statusId: 'spore', count: 2 },
            ];

            assert(stableStringify(stream) === stableStringify(expected), `Unexpected ammo spend stream:\n${JSON.stringify(stream, null, 2)}`);

            const state = engine.getState();
            const enemySpore = state.enemyUnits[0].statuses.find((status) => status.id === 'spore')?.count || 0;
            assert(enemySpore === 2, `Expected enemy to have 2 spore from onSpendOnHit, got ${enemySpore}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: randomCost ammo spends deterministic buckets', () => {
        const runScenario = (randomValue, expected) => {
            const battleModules = createBattleEnvironment();
            const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
            assert(typeof registerStatusDefinition === 'function', 'Expected registerStatusDefinition to exist.');

            registerStatusDefinition({
                id: 'test_random_ammo',
                label: 'Test Random Ammo',
            });
            registerStatusDefinition({
                id: 'test_random_ammo',
                label: 'Test Random Ammo',
                description: 'Test ammo with both Count and Potency.',
                stackModel: {
                    potency: { enabled: true, min: 0, max: 99, application: 'add' },
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                    expireWhen: { countLte: 0, potencyLte: 0 },
                },
                ammoProfile: {
                    canCancelAttacksWhenEmpty: true,
                },
            });

            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            const createUnit = (id, name, skills) => ({
                id,
                name,
                level: 1,
                maxHp: 30,
                sp: 0,
                speedRange: [2, 2],
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                staggerThresholds: [],
                sprites: { skills: {} },
                skills,
                passives: [],
            });

            const ammoSkill = {
                id: 'random_shot',
                name: 'Random Shot',
                skillType: 'attack',
                basePower: 4,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                ammo: {
                    statusId: 'test_random_ammo',
                    countCost: 1,
                    randomCost: 2,
                    cancelIfInsufficient: true,
                },
                effects: [],
            };
            const enemySkill = {
                id: 'poke',
                name: 'Poke',
                skillType: 'attack',
                basePower: 4,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            };

            const battleDefinition = {
                id: 'golden-snapshot-ammo-random-cost',
                name: 'Golden Snapshot Ammo Random Cost',
                playerUnits: [createUnit('ally', 'Ally', [ammoSkill])],
                enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            };

            const forcedTokens = {
                'player-slot-1': [false],
                'enemy-slot-1': [false],
            };
            const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
            const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

            const previousNow = Date.now;
            const previousRandom = Math.random;
            try {
                Date.now = () => 1700000000000;
                Math.random = () => randomValue;
                const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
                engine.addStatus('player', { id: 'test_random_ammo', potency: 2, count: 2 }, 0);

                engine.selectSlot('player-slot-1');
                engine.selectSkill('random_shot');
                engine.selectTarget('enemy-slot-1');
                engine.resolveTurn();

                const stream = engine.getState().events
                    .filter((event) => {
                        if (event.type === 'skill_ammo_spent') {
                            return true;
                        }
                        return event.type === 'status_changed' && event.data?.statusId === 'test_random_ammo';
                    })
                    .map((event) => {
                        const data = event.data || {};
                        if (event.type === 'status_changed') {
                            return {
                                type: event.type,
                                unitName: data.unitName,
                                statusId: data.statusId,
                                previousPotency: data.previousPotency,
                                previousCount: data.previousCount,
                                nextPotency: data.nextPotency,
                                nextCount: data.nextCount,
                            };
                        }
                        return { type: event.type, unitName: data.unitName, skillName: data.skillName, summary: data.summary };
                    });

                assert(stableStringify(stream) === stableStringify(expected.stream), `Unexpected randomCost stream:\n${JSON.stringify(stream, null, 2)}`);

                const status = engine.getState().playerUnits[0].statuses.find((entry) => entry.id === 'test_random_ammo') || null;
                assert(status, 'Expected test_random_ammo to remain on Ally.');
                assert(status.count === expected.remaining.count && status.potency === expected.remaining.potency, `Expected remaining ammo ${JSON.stringify(expected.remaining)}, got ${JSON.stringify({ count: status.count, potency: status.potency })}`);
            } finally {
                Date.now = previousNow;
                Math.random = previousRandom;
            }
        };

        runScenario(0, {
            stream: [
                { type: 'status_changed', unitName: 'Ally', statusId: 'test_random_ammo', previousPotency: 2, previousCount: 2, nextPotency: 0, nextCount: 1 },
                { type: 'skill_ammo_spent', unitName: 'Ally', skillName: 'Random Shot', summary: '1 Count Test Random Ammo, 2 Potency Test Random Ammo' },
            ],
            remaining: { potency: 0, count: 1 },
        });

        runScenario(0.99, {
            stream: [
                { type: 'status_changed', unitName: 'Ally', statusId: 'test_random_ammo', previousPotency: 2, previousCount: 2, nextPotency: 1, nextCount: 0 },
                { type: 'skill_ammo_spent', unitName: 'Ally', skillName: 'Random Shot', summary: '2 Count Test Random Ammo, 1 Potency Test Random Ammo' },
            ],
            remaining: { potency: 1, count: 0 },
        });
    });

    test('Golden snapshot: aggro overrides enemy target selection deterministically', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'aggro.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills, speed) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [speed, speed],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-aggro-targeting',
            name: 'Golden Snapshot Aggro Targeting',
            playerUnits: [
                createUnit('ally-1', 'Ally 1', [poke], 1),
                createUnit('ally-2', 'Ally 2', [poke], 1),
            ],
            enemyUnits: [
                createUnit('enemy', 'Enemy', [poke], 1),
            ],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'random' },
            },
        };

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({
                battleDefinition,
                clamp,
                onTurnStarted: (battle) => {
                    const unit = battle.playerUnits[1];
                    unit.pendingStatuses.push({ statusId: 'aggro', potency: 0, count: 3 });
                },
            });

            const intent = engine.getState().events.find((event) => event.type === 'enemy_intent_set')?.data || null;
            assert(intent, 'Expected enemy_intent_set to exist.');
            assert(intent.targetLabel === 'Ally 2 Slot 2', `Expected aggro target to be Ally 2 Slot 2, got ${intent.targetLabel}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: enemy AI random target selection is deterministic', () => {
        const runScenario = (randomValue, expectedTarget) => {
            const battleModules = createBattleEnvironment();
            const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
            const createUnit = (id, name, skills) => ({
                id,
                name,
                level: 1,
                maxHp: 30,
                sp: 0,
                speedRange: [1, 1],
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                staggerThresholds: [],
                sprites: { skills: {} },
                skills,
                passives: [],
            });

            const poke = {
                id: 'poke',
                name: 'Poke',
                skillType: 'attack',
                basePower: 3,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            };

            const battleDefinition = {
                id: 'golden-snapshot-enemy-ai-random-target',
                name: 'Golden Snapshot Enemy AI Random Target',
                playerUnits: [
                    createUnit('ally-1', 'Ally 1', [poke]),
                    createUnit('ally-2', 'Ally 2', [poke]),
                ],
                enemyUnits: [
                    createUnit('enemy', 'Enemy', [poke]),
                ],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'random' },
                },
            };

            const previousNow = Date.now;
            const previousRandom = Math.random;
            try {
                Date.now = () => 1700000000000;
                Math.random = () => randomValue;
                const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
                const intent = engine.getState().events.find((event) => event.type === 'enemy_intent_set')?.data || null;
                assert(intent, 'Expected enemy_intent_set to exist.');
                assert(intent.targetLabel === expectedTarget, `Expected target ${expectedTarget}, got ${intent.targetLabel}`);
            } finally {
                Date.now = previousNow;
                Math.random = previousRandom;
            }
        };

        runScenario(0, 'Ally 1 Slot 1');
        runScenario(0.99, 'Ally 2 Slot 2');
    });

    test('Golden snapshot: ammo spend increments cumulative spent encounter resource', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'tigermarkRound.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const ammoSkill = {
            id: 'tigermark_shot',
            name: 'Tigermark Shot',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'tigermark_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-ammo-resource',
            name: 'Golden Snapshot Ammo Resource',
            playerUnits: [createUnit('ally', 'Ally', [ammoSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'tigermark_round', count: 2 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('tigermark_shot');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const resourceEvents = state.events
                .filter((event) => event.type === 'encounter_resource_changed')
                .map((event) => event.data)
                .filter((data) => data?.resourceId === 'ally:tigermark_rounds_spent');
            assert(resourceEvents.length === 1, `Expected 1 cumulative resource event, got ${resourceEvents.length}`);
            assert(resourceEvents[0].previousValue === 0 && resourceEvents[0].nextValue === 1, `Expected tigermark_rounds_spent 0→1, got ${resourceEvents[0].previousValue}→${resourceEvents[0].nextValue}`);
            assert(resourceEvents[0].unitId === 'ally' && resourceEvents[0].unitName === 'Ally', 'Expected resource event to be scoped to Ally.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Golden snapshot: bleed fixed damage increments bloodfeast encounter resource', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'bleed.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const playerSkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const enemySkill = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'golden-snapshot-bleed-bloodfeast',
            name: 'Golden Snapshot Bleed Bloodfeast',
            playerUnits: [createUnit('ally', 'Ally', [playerSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'bleed', potency: 2, count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('poke');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const events = engine.getState().events;
            const bleedTriggerIndex = events.findIndex((event) => event.type === 'status_triggered' && event.data?.statusId === 'bleed');
            const bloodfeastIndex = events.findIndex((event) => event.type === 'encounter_resource_changed' && event.data?.resourceId === 'ally:bloodfeast');
            assert(bleedTriggerIndex >= 0, 'Expected bleed status_triggered event.');
            assert(bloodfeastIndex > bleedTriggerIndex, `Expected bloodfeast to be incremented after bleed trigger. bleed=${bleedTriggerIndex} resource=${bloodfeastIndex}`);

            const bloodfeastEvent = events[bloodfeastIndex]?.data || null;
            assert(bloodfeastEvent?.previousValue === 0 && bloodfeastEvent?.nextValue === 2, `Expected bloodfeast 0→2, got ${bloodfeastEvent?.previousValue}→${bloodfeastEvent?.nextValue}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Burn triggers at turn end', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'burn.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'guard',
            basePower: 0,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-burn-turn-end',
            name: 'Regression Burn Turn End',
            playerUnits: [createUnit('ally', 'Ally', [poke])],
            enemyUnits: [createUnit('enemy', 'Enemy', [poke])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'burn', potency: 3, count: 1 }, 0);

            const startHp = engine.getState().playerUnits[0].hp;
            engine.selectSlot('player-slot-1');
            engine.selectSkill('poke');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const burnTrigger = state.events.find((event) => event.type === 'status_triggered' && event.data?.statusId === 'burn')?.data || null;
            assert(burnTrigger, 'Expected burn status_triggered event.');
            assert(burnTrigger.damage === 3, `Expected burn damage 3, got ${burnTrigger.damage}`);
            assert(state.playerUnits[0].hp === startHp - 3, `Expected Ally hp ${startHp}→${startHp - 3}, got ${state.playerUnits[0].hp}`);
            assert(!state.playerUnits[0].statuses.some((status) => status.id === 'burn'), 'Expected burn to expire after losing its last count.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Protection reduces incoming damage via beforeDamage hook', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'protection.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'lcaFractureRound.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const cancelledSkill = {
            id: 'ammo_strike',
            name: 'Ammo Strike',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'lca_fracture_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'heavy_hit',
            name: 'Heavy Hit',
            skillType: 'attack',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-protection-before-damage',
            name: 'Regression Protection BeforeDamage',
            playerUnits: [createUnit('ally', 'Ally', [cancelledSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'protection', count: 5 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('ammo_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const hit = engine.getState().events.find((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Enemy')?.data || null;
            assert(hit, 'Expected Enemy hit_resolved event.');
            assert(hit.damage === 5, `Expected Heavy Hit damage 5 under Protection 5, got ${hit.damage}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Rupture triggers on hitTaken', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'rupture.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'lcaFractureRound.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const cancelledSkill = {
            id: 'ammo_strike',
            name: 'Ammo Strike',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'lca_fracture_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'heavy_hit',
            name: 'Heavy Hit',
            skillType: 'attack',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-rupture-hit-taken',
            name: 'Regression Rupture HitTaken',
            playerUnits: [createUnit('ally', 'Ally', [cancelledSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'rupture', potency: 4, count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('ammo_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const hitIndex = state.events.findIndex((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Enemy');
            const ruptureIndex = state.events.findIndex((event) => event.type === 'status_triggered' && event.data?.statusId === 'rupture');
            assert(hitIndex >= 0, 'Expected Enemy hit_resolved event.');
            assert(ruptureIndex > hitIndex, `Expected rupture to trigger after hit. hit=${hitIndex}, rupture=${ruptureIndex}`);

            const ruptureTrigger = state.events[ruptureIndex]?.data || null;
            assert(ruptureTrigger?.damage === 4, `Expected rupture damage 4, got ${ruptureTrigger?.damage}`);
            assert(!state.playerUnits[0].statuses.some((status) => status.id === 'rupture'), 'Expected rupture to expire after losing its last count.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Concussion scales rupture fixed damage', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'rupture.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'concussion.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'lcaFractureRound.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const cancelledSkill = {
            id: 'ammo_strike',
            name: 'Ammo Strike',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'lca_fracture_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'heavy_hit',
            name: 'Heavy Hit',
            skillType: 'attack',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-concussion-rupture-scale',
            name: 'Regression Concussion Rupture Scale',
            playerUnits: [createUnit('ally', 'Ally', [cancelledSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'rupture', potency: 8, count: 1 }, 0);
            engine.addStatus('player', { id: 'concussion', count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('ammo_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const ruptureTrigger = state.events.find((event) => event.type === 'status_triggered' && event.data?.statusId === 'rupture')?.data || null;
            assert(ruptureTrigger, 'Expected rupture status_triggered event.');
            assert(ruptureTrigger.damage === 9, `Expected rupture damage 9 under Concussion, got ${ruptureTrigger.damage}`);
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Sinking triggers sanity loss on hitTaken', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'sinking.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'lcaFractureRound.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const cancelledSkill = {
            id: 'ammo_strike',
            name: 'Ammo Strike',
            skillType: 'attack',
            basePower: 6,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            ammo: {
                statusId: 'lca_fracture_round',
                countCost: 1,
                cancelIfInsufficient: true,
            },
            effects: [],
        };
        const enemySkill = {
            id: 'heavy_hit',
            name: 'Heavy Hit',
            skillType: 'attack',
            basePower: 10,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-sinking-hit-taken',
            name: 'Regression Sinking HitTaken',
            playerUnits: [createUnit('ally', 'Ally', [cancelledSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [enemySkill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'sinking', potency: 5, count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('ammo_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const hitIndex = state.events.findIndex((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Enemy');
            const sanityIndex = state.events.findIndex((event) => event.type === 'sanity_changed' && event.data?.reason === 'sinking');
            assert(hitIndex >= 0, 'Expected Enemy hit_resolved event.');
            assert(sanityIndex > hitIndex, `Expected sinking sanity change after hit. hit=${hitIndex}, sanity=${sanityIndex}`);

            const sanityEvent = state.events[sanityIndex]?.data || null;
            assert(sanityEvent?.previousSp === 0 && sanityEvent?.nextSp === -5, `Expected SP 0→-5, got ${sanityEvent?.previousSp}→${sanityEvent?.nextSp}`);
            assert(!state.playerUnits[0].statuses.some((status) => status.id === 'sinking'), 'Expected sinking to expire after losing its last count.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Tremor burst raises stagger threshold and consumes count', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'tremor.js'));
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'concussion.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills, staggerThresholds = []) => ({
            id,
            name,
            level: 1,
            maxHp: 30,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds,
            sprites: { skills: {} },
            skills,
            passives: [],
        });

        const burstSkill = {
            id: 'tremor_burst_strike',
            name: 'Tremor Burst Strike',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                { trigger: 'onHit', type: 'burstTremor', statusId: 'tremor' },
            ],
        };
        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-tremor-burst',
            name: 'Regression Tremor Burst',
            playerUnits: [createUnit('ally', 'Ally', [burstSkill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [poke], [0.5])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('enemy', { id: 'tremor', potency: 5, count: 1 }, 0);
            engine.addStatus('enemy', { id: 'concussion', count: 1 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('tremor_burst_strike');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const burstEvent = state.events.find((event) => event.type === 'tremor_burst')?.data || null;
            assert(burstEvent, 'Expected tremor_burst event.');
            assert(burstEvent.burstAmount === 6, `Expected burstAmount 6 under Concussion, got ${burstEvent.burstAmount}`);
            assert(burstEvent.previousThreshold === 15 && burstEvent.nextThreshold === 21, `Expected threshold 15→21, got ${burstEvent.previousThreshold}→${burstEvent.nextThreshold}`);

            const enemy = state.enemyUnits[0];
            assert(enemy.staggerThresholds[0] === 21, `Expected enemy staggerThresholds[0] to be 21, got ${enemy.staggerThresholds[0]}`);
            assert(!enemy.statuses.some((status) => status.id === 'tremor'), 'Expected tremor to expire after losing its last count.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Regression: Poise critical consumes count and flags hit', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses', 'poise.js'));
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (id, name, skills) => ({
            id,
            name,
            level: 1,
            maxHp: 60,
            sp: 0,
            speedRange: [2, 2],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills,
            passives: [],
        });

        const poke = {
            id: 'poke',
            name: 'Poke',
            skillType: 'attack',
            basePower: 4,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };

        const battleDefinition = {
            id: 'regression-poise-critical',
            name: 'Regression Poise Critical',
            playerUnits: [createUnit('ally', 'Ally', [poke])],
            enemyUnits: [createUnit('enemy', 'Enemy', [poke])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [false],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousNow = Date.now;
        const previousRandom = Math.random;
        try {
            Date.now = () => 1700000000000;
            Math.random = () => 0.49;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            engine.addStatus('player', { id: 'poise', potency: 10, count: 2 }, 0);

            engine.selectSlot('player-slot-1');
            engine.selectSkill('poke');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const events = engine.getState().events;
            const poiseChangeIndex = events.findIndex((event) => event.type === 'status_changed' && event.data?.statusId === 'poise');
            const critHitIndex = events.findIndex((event) => event.type === 'hit_resolved' && event.data?.attackerName === 'Ally' && event.data?.isCritical === true);
            assert(poiseChangeIndex >= 0, 'Expected poise status_changed event.');
            assert(critHitIndex >= 0, 'Expected Ally to land a critical hit.');
            assert(poiseChangeIndex > critHitIndex, `Expected poise to be consumed after hit_resolved via hitDealt hook. poise=${poiseChangeIndex}, hit=${critHitIndex}`);
            assert(events.some((event) => event.type === 'status_expired' && event.data?.statusId === 'poise'), 'Expected poise to expire by turn end.');
        } finally {
            Date.now = previousNow;
            Math.random = previousRandom;
        }
    });

    test('Export/import round-trip for a shipped battle pack', () => {
        const sourceModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        const battles = getCanonicalEntries(sourceModules.content.listBattleDefinitions());
        assert(battles.length > 0, 'Expected at least one battle definition.');
        const battleWithStatuses = battles.find((entry) => {
            const pack = sourceModules.content.exportBattleContentPack(entry.id);
            return Array.isArray(pack?.statuses) && pack.statuses.length > 0;
        });
        assert(battleWithStatuses, 'Expected at least one battle with exportable status dependencies.');
        const battleId = battleWithStatuses.id;

        const exported = sourceModules.content.exportBattleContentPack(battleId);
        assert(exported && Array.isArray(exported.battles) && exported.battles.length === 1, 'Export must include a battle.');

        const targetModules = createBattleEnvironment();
        const imported = targetModules.content.importContentPack(exported, { allowOverwrite: true });
        assert(imported.counts.battles === 1, 'Expected imported battle count to be 1.');
        assert(imported.counts.units > 0, 'Expected imported units to be non-empty.');
        assert(imported.counts.statuses > 0, 'Expected imported statuses to be non-empty.');

        const reExported = targetModules.content.exportBattleContentPack(battleId);
        assert(stableStringify(exported) === stableStringify(reExported), 'Re-exported pack does not match the original export.');
    });

    test('Install pack with rename strategy', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        assert(typeof battleModules.content?.installContentPack === 'function', 'Expected installContentPack to exist.');
        const battles = getCanonicalEntries(battleModules.content.listBattleDefinitions());
        assert(battles.length > 0, 'Expected at least one battle definition.');
        const battleId = battles[0].id;
        const pack = battleModules.content.exportBattleContentPack(battleId);

        const first = battleModules.content.installContentPack(pack, { conflictStrategy: 'overwrite' });
        assert(first.ids.battles.length === 1, 'Expected installed battle count to be 1.');

        const second = battleModules.content.installContentPack(pack, { conflictStrategy: 'rename' });
        assert(second.ids.battles.length === 1, 'Expected installed battle count to be 1 (renamed).');
        assert(second.ids.battles[0] !== first.ids.battles[0], 'Expected renamed battle id to differ.');
        assert(battleModules.content.getBattleDefinition(first.ids.battles[0]), 'Original battle should remain available.');
        assert(battleModules.content.getBattleDefinition(second.ids.battles[0]), 'Renamed battle should be available.');
    });

    test('Persist and reload installed packs', () => {
        const storage = createMemoryLocalStorage();
        const firstEnv = createBattleEnvironment({ localStorage: storage });
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        const battles = getCanonicalEntries(firstEnv.content.listBattleDefinitions());
        const battleId = battles[0].id;
        const pack = firstEnv.content.exportBattleContentPack(battleId);
        pack.manifest.id = 'persisted-pack-test';
        const installed = firstEnv.content.installContentPack(pack, { conflictStrategy: 'rename' });
        assert(installed.manifest.id === 'persisted-pack-test', 'Expected pack manifest id to match.');

        const secondEnv = createBattleEnvironment({ localStorage: storage });
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));
        const loadResult = secondEnv.content.loadPersistedContentPacks();
        assert(loadResult.loaded >= 1, 'Expected at least one pack to load from storage.');
        const installedPacks = secondEnv.content.listInstalledContentPacks();
        assert(installedPacks.some((entry) => entry.id === 'persisted-pack-test'), 'Expected persisted pack to be listed.');
    });

    test('Export installed content pack payload', () => {
        const storage = createMemoryLocalStorage();
        const battleModules = createBattleEnvironment({ localStorage: storage });
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        assert(typeof battleModules.content?.exportInstalledContentPack === 'function', 'Expected exportInstalledContentPack to exist.');

        const battles = getCanonicalEntries(battleModules.content.listBattleDefinitions());
        const battleId = battles[0].id;
        const pack = battleModules.content.exportBattleContentPack(battleId);
        pack.manifest.id = 'export-installed-pack-test';
        battleModules.content.installContentPack(pack, { conflictStrategy: 'overwrite' });

        const exported = battleModules.content.exportInstalledContentPack('export-installed-pack-test');
        assert(exported?.manifest?.id === 'export-installed-pack-test', 'Expected exported payload to include manifest id.');
        assert(Array.isArray(exported?.battles) && exported.battles.length === 1, 'Expected exported payload to include battles.');
    });

    test('Uninstall and clear installed packs', () => {
        const storage = createMemoryLocalStorage();
        const battleModules = createBattleEnvironment({ localStorage: storage });
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        assert(typeof battleModules.content?.installContentPack === 'function', 'Expected installContentPack to exist.');
        assert(typeof battleModules.content?.uninstallContentPack === 'function', 'Expected uninstallContentPack to exist.');
        assert(typeof battleModules.content?.clearInstalledContentPacks === 'function', 'Expected clearInstalledContentPacks to exist.');

        const battles = getCanonicalEntries(battleModules.content.listBattleDefinitions());
        const battleId = battles[0].id;
        const pack = battleModules.content.exportBattleContentPack(battleId);
        pack.manifest.id = 'uninstall-pack-test';
        battleModules.content.installContentPack(pack, { conflictStrategy: 'rename' });

        assert(battleModules.content.listInstalledContentPacks().some((entry) => entry.id === 'uninstall-pack-test'), 'Expected installed pack to be listed.');
        const removed = battleModules.content.uninstallContentPack('uninstall-pack-test');
        assert(removed, 'Expected uninstall to return true.');
        assert(!battleModules.content.listInstalledContentPacks().some((entry) => entry.id === 'uninstall-pack-test'), 'Expected pack to be removed from list.');

        battleModules.content.installContentPack(pack, { conflictStrategy: 'rename' });
        battleModules.content.clearInstalledContentPacks();
        assert(battleModules.content.listInstalledContentPacks().length === 0, 'Expected pack list to be empty after clear.');

        const storedRaw = storage.getItem('echoes-of-the-city:contentPacks:v1');
        assert(storedRaw, 'Expected storage entry to exist.');
        const parsed = JSON.parse(storedRaw);
        assert(Array.isArray(parsed?.packs) && parsed.packs.length === 0, 'Expected stored packs array to be empty after clear.');
    });

    test('Pack dependencies are enforced', () => {
        const storage = createMemoryLocalStorage();
        const battleModules = createBattleEnvironment({ localStorage: storage });
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        const battles = getCanonicalEntries(battleModules.content.listBattleDefinitions());
        const battleId = battles[0].id;
        const depPack = battleModules.content.exportBattleContentPack(battleId);
        depPack.manifest.id = 'dep-pack-a';

        const childPack = battleModules.content.exportBattleContentPack(battleId);
        childPack.manifest.id = 'dep-pack-b';
        childPack.manifest.dependencies = ['dep-pack-a'];

        let missingDependencyError = null;
        try {
            battleModules.content.installContentPack(childPack, { conflictStrategy: 'rename' });
        } catch (error) {
            missingDependencyError = error;
        }
        assert(missingDependencyError, 'Expected missing dependency error.');

        battleModules.content.installContentPack(depPack, { conflictStrategy: 'rename' });
        const installed = battleModules.content.installContentPack(childPack, { conflictStrategy: 'rename' });
        assert(installed.manifest.id === 'dep-pack-b', 'Expected dependent pack to install once dependency exists.');
    });

    test('Effect runner: onUse trigger fires when skill is used', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        registerStatusDefinition({
            id: 'test_on_use_marker',
            label: 'On Use Marker',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'test-on-use',
            name: 'Test On Use',
            playerUnits: [{
                id: 'hero',
                name: 'Hero',
                level: 1,
                maxHp: 100,
                sp: 0,
                speedRange: [5, 5],
                defenseLevel: 0,
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                sprites: { idle: '', skills: {} },
                skills: [{
                    id: 'on-use-skill',
                    name: 'On Use Skill',
                    basePower: 5,
                    coinPower: 0,
                    coinCount: 1,
                    damageType: 'slash',
                    sinType: 'wrath',
                    effects: [{
                        trigger: 'onUse',
                        type: 'adjustStatus',
                        target: 'self',
                        statusId: 'test_on_use_marker',
                        countDelta: 1,
                    }],
                }],
                passives: [],
            }],
            enemyUnits: [{
                id: 'enemy',
                name: 'Enemy',
                level: 1,
                maxHp: 100,
                sp: 0,
                speedRange: [1, 1],
                defenseLevel: 0,
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                sprites: { idle: '', skills: {} },
                skills: [{
                    id: 'enemy-skill',
                    name: 'Enemy Skill',
                    basePower: 1,
                    coinPower: 0,
                    coinCount: 1,
                    skillType: 'guard',
                    sinType: 'wrath',
                }],
                passives: [],
            }],
            rules: {
                encounterType: 'focused',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        engine.selectSlot('player-slot-1');
        engine.selectSkill('on-use-skill');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const hero = engine.getState().playerUnits[0];
        const marker = hero.statuses.find((status) => status.id === 'test_on_use_marker');
        assert(marker && marker.count >= 1, `Expected onUse effect to apply marker, got ${JSON.stringify(marker)}`);
    });

    test('Effect runner: headsOnly filter on onHit effects', () => {
        const battleModules = createBattleEnvironment();
        const effectMatchesRuntime = battleModules.effectMatchesRuntime;
        assert(typeof effectMatchesRuntime === 'function', 'Expected effectMatchesRuntime export.');

        const headsEffect = { trigger: 'onHit', type: 'applyStatus', headsOnly: true };
        assert(effectMatchesRuntime(headsEffect, { isHeads: true }, () => 0), 'Expected headsOnly to match heads.');
        assert(!effectMatchesRuntime(headsEffect, { isHeads: false }, () => 0), 'Expected headsOnly to reject tails.');
    });

    test('Passive requirements: resonance gate blocks hook actions', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        registerStatusDefinition({
            id: 'test_resonance_gate',
            label: 'Resonance Gate',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'test-resonance-passive',
            name: 'Test Resonance Passive',
            playerUnits: [{
                id: 'hero',
                name: 'Hero',
                level: 1,
                maxHp: 100,
                sp: 0,
                speedRange: [5, 5],
                defenseLevel: 0,
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                sprites: { idle: '', skills: {} },
                skills: [{
                    id: 'basic',
                    name: 'Basic',
                    basePower: 1,
                    coinPower: 0,
                    coinCount: 1,
                    damageType: 'slash',
                    sinType: 'wrath',
                }],
                passives: [{
                    id: 'gated-passive',
                    name: 'Gated Passive',
                    requirements: { resonance: { sinType: 'wrath', minimum: 3 } },
                    hooks: {
                        battleStart: [{
                            type: 'adjustStatus',
                            target: 'self',
                            statusId: 'test_resonance_gate',
                            countDelta: 1,
                        }],
                    },
                }],
            }],
            enemyUnits: [{
                id: 'enemy',
                name: 'Enemy',
                level: 1,
                maxHp: 100,
                sp: 0,
                speedRange: [1, 1],
                defenseLevel: 0,
                resistances: {
                    physical: { slash: 1, pierce: 1, blunt: 1 },
                    sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                },
                sprites: { idle: '', skills: {} },
                skills: [{
                    id: 'enemy-skill',
                    name: 'Enemy Skill',
                    basePower: 1,
                    coinPower: 0,
                    coinCount: 1,
                    skillType: 'guard',
                    sinType: 'wrath',
                }],
                passives: [],
            }],
            rules: {
                encounterType: 'focused',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        const hero = engine.getState().playerUnits[0];
        const marker = hero.statuses.find((status) => status.id === 'test_resonance_gate');
        assert(!marker || marker.count === 0, 'Expected gated passive not to fire without resonance.');
    });

    test('Planner skills: skill slot variants resolve by conditions', () => {
        const battleModules = createBattleEnvironment();
        const resolvePlannerSkills = battleModules.plannerSkills?.resolvePlannerSkills;
        assert(typeof resolvePlannerSkills === 'function', 'Expected resolvePlannerSkills.');

        const unit = {
            id: 'variant-unit',
            name: 'Variant Unit',
            skills: [
                {
                    id: 'skill-base',
                    name: 'Skill Base',
                    skillSlot: 'slot-1',
                    variantPriority: 0,
                    basePower: 1,
                    coinPower: 0,
                    coinCount: 1,
                    showInPlanner: true,
                },
                {
                    id: 'skill-enhanced',
                    name: 'Skill Enhanced',
                    skillSlot: 'slot-1',
                    variantPriority: 2,
                    variantConditions: [{
                        type: 'statusCountAtLeast',
                        target: 'self',
                        statusId: 'insight',
                        value: 3,
                    }],
                    basePower: 5,
                    coinPower: 2,
                    coinCount: 2,
                    showInPlanner: true,
                },
            ],
            statuses: [{ id: 'insight', count: 4, potency: 0 }],
        };

        const battle = { playerUnits: [unit], enemyUnits: [], playerSlots: [], enemySlots: [] };
        const active = resolvePlannerSkills(unit, battle);
        assert(active.length === 1 && active[0].id === 'skill-enhanced', `Expected enhanced variant, got ${active[0]?.id}`);
    });

    test('Content: resolveBattleDefinitionComposition resolves wave enemyUnitIds', () => {
        const battleModules = createBattleEnvironment();
        const content = battleModules.content;
        assert(typeof content?.resolveBattleDefinitionComposition === 'function', 'Expected resolveBattleDefinitionComposition.');

        const registerUnitDefinition = content.registerUnitDefinition;
        registerUnitDefinition({
            id: 'test-wave-enemy',
            name: 'Wave Enemy',
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [{
                id: 'wave-hit',
                name: 'Wave Hit',
                skillType: 'attack',
                basePower: 1,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            }],
            passives: [],
        }, { allowOverwrite: true });

        const resolved = content.resolveBattleDefinitionComposition({
            id: 'wave-id-test',
            name: 'Wave Id Test',
            playerUnitIds: ['test-wave-enemy'],
            rules: {
                waves: [
                    { enemyUnitIds: ['test-wave-enemy'] },
                    { enemyUnitIds: ['test-wave-enemy'] },
                ],
            },
        });

        assert(Array.isArray(resolved.rules?.waves?.[0]?.enemyUnits), 'Expected resolved wave enemyUnits.');
        assert(resolved.rules.waves[0].enemyUnits[0]?.id === 'test-wave-enemy', 'Expected wave enemy unit id.');
        assert(Array.isArray(resolved.enemyUnits) && resolved.enemyUnits[0]?.id === 'test-wave-enemy', 'Expected top-level enemyUnits from wave 1.');
    });

    test('Content: enemy-only encounter registers and runtime battle merges player party', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'registry/battleRegistry.js'));
        require(path.resolve(battleRoot, 'schema/battleSchema.js'));
        require(path.resolve(battleRoot, 'validation/battleValidation.js'));
        require(path.resolve(battleRoot, 'content/battleContentRegistry.js'));

        const api = global.window.EchoesOfTheCityBattle;
        const content = api || global.window.EchoesOfTheCityBattleModules?.content;
        assert(typeof content?.registerBattleDefinition === 'function', 'Expected registerBattleDefinition.');
        assert(typeof content?.buildRuntimeBattleDefinition === 'function', 'Expected buildRuntimeBattleDefinition.');

        const registerUnitDefinition = content.registerUnitDefinition;
        registerUnitDefinition({
            id: 'encounter-merge-ally',
            name: 'Merge Ally',
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [{
                id: 'hit',
                name: 'Hit',
                skillType: 'attack',
                basePower: 1,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            }],
            passives: [],
        }, { allowOverwrite: true });

        registerUnitDefinition({
            id: 'encounter-merge-enemy',
            name: 'Merge Enemy',
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [{
                id: 'hit',
                name: 'Hit',
                skillType: 'attack',
                basePower: 1,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            }],
            passives: [],
        }, { allowOverwrite: true });

        content.registerBattleDefinition({
            id: 'enemy-only-encounter',
            name: 'Enemy Only',
            enemyUnitIds: ['encounter-merge-enemy'],
            rules: {
                encounterType: 'focused',
                maxTurns: 10,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
            },
        }, { allowOverwrite: true });

        const encounter = content.getBattleDefinition('enemy-only-encounter');
        assert(Array.isArray(encounter.playerUnits) && encounter.playerUnits.length === 0, 'Encounter should have empty playerUnits.');

        const runtime = content.buildRuntimeBattleDefinition(encounter, ['encounter-merge-ally']);
        assert(Array.isArray(runtime.playerUnits) && runtime.playerUnits.length === 1, 'Runtime battle should have one player unit.');
        assert(runtime.playerUnits[0]?.id === 'encounter-merge-ally', 'Expected merged player unit id.');
    });

    test('Team builder: preset state serializes and parses', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'ui/roster/teamBuilderRenderer.js'));

        const teamBuilder = global.window.EchoesOfTheCityTeamBuilder;
        assert(typeof teamBuilder?.serializeTeamPresetsState === 'function', 'Expected serializeTeamPresetsState.');

        const state = teamBuilder.createDefaultTeamPresetsState();
        state.presets[0].unitIds = ['vergilius'];
        const serialized = teamBuilder.serializeTeamPresetsState(state);
        const parsed = teamBuilder.parseTeamPresetsFromStorage(serialized);
        assert(parsed.presets.length === teamBuilder.MAX_TEAM_PRESETS, 'Expected eight presets.');
        assert(parsed.presets[0].unitIds[0] === 'vergilius', 'Expected preset unit id to round-trip.');
    });

    test('Creator UI: default battle definition and encounter builder render', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'ui/creator/creatorUiHelpers.js'));
        require(path.resolve(battleRoot, 'ui/creator/encounterBuilder/encounterBuilderRenderer.js'));

        const creatorUi = global.window.EchoesOfTheCityCreatorUi;
        const encounterBuilder = global.window.EchoesOfTheCityEncounterBuilder;
        assert(typeof creatorUi?.createDefaultBattleDefinition === 'function', 'Expected createDefaultBattleDefinition.');
        const defaultBattle = creatorUi.createDefaultBattleDefinition();
        assert(defaultBattle.id === 'new-battle', 'Expected default battle id.');
        assert(Array.isArray(defaultBattle.enemyUnitIds), 'Expected enemyUnitIds array.');
        assert(defaultBattle.rules?.enemyAiProfile?.skill === 'cycle', 'Expected default AI skill.');

        const catalog = creatorUi.buildCatalog([]);
        const escapeAttr = (value) => String(value);
        const escapeHtml = (value) => String(value);
        const html = encounterBuilder.renderEncounterBuilder(
            defaultBattle,
            [{ id: 'vergilius', name: 'Vergilius' }],
            catalog,
            creatorUi,
            escapeAttr,
            escapeHtml,
            { hookTriggers: [{ id: 'battleStart', label: 'Battle Start' }, { id: 'staggerThresholdCrossed', label: 'Stagger threshold crossed' }] },
        );
        assert(html.includes('echoes-encounter'), 'Expected encounter builder markup.');
        assert(html.includes('playerUnitIds') === false, 'Markup should not expose raw JSON keys.');
        assert(html.includes('Characters'), 'Expected Characters deploy hint.');
        assert(html.includes('Enemy setup'), 'Expected enemy setup section.');
    });

    process.stdout.write(`\nResult: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runSuite();
