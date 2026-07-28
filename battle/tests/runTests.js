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
    require(path.resolve(battleRoot, 'schema', 'battleSchema.js'));
    require(path.resolve(battleRoot, 'validation', 'battleValidation.js'));
    require(path.resolve(battleRoot, 'content', 'battleContentRegistry.js'));
    require(path.resolve(battleRoot, 'effects', 'skillEffectRunner.js'));
    require(path.resolve(battleRoot, 'core', 'damageFormula.js'));
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
            const result = battleModules.validation.validateAndNormalizeBattleDefinition(definition);
            assert(!result.errors.length, `Battle "${id}" invalid:\n${result.errors.join('\n')}`);
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

        const protection = formula.calculateDamage({
            ...baseContext,
            defender: createUnit({ statuses: [{ id: 'protection', count: 5 }] }),
        });
        assert(protection.damage === 10, `Expected protection 5 to halve damage (10), got ${protection.damage}`);

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
            sprites: { skills: {} },
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

        const battleDefinition = {
            id: 'onceper-skill-smoke',
            name: 'OncePer Skill Smoke',
            playerUnits: [createUnit('ally', 'Ally', [skill])],
            enemyUnits: [createUnit('enemy', 'Enemy', [skill])],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = {
            'player-slot-1': [{ type: 'heads', value: 2 }],
            'enemy-slot-1': [{ type: 'heads', value: 2 }],
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
            .filter((data) => data?.unitId === 'enemy' && data?.damage === 5);
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
            sprites: { skills: {} },
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
            sprites: { skills: {} },
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
            sprites: { skills: {} },
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
            sprites: { skills: {} },
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
            sprites: { skills: {} },
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

    test('Export/import round-trip for a shipped battle pack', () => {
        const sourceModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'units'));
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'battles'));

        const battles = getCanonicalEntries(sourceModules.content.listBattleDefinitions());
        assert(battles.length > 0, 'Expected at least one battle definition.');
        const battleId = battles[0].id;

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

    process.stdout.write(`\nResult: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runSuite();
