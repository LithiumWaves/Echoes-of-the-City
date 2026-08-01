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
    require(path.resolve(battleRoot, 'core', 'skillDeck.js'));
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

    test('Passive requirements: owned true always fires; owned false blocks', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        registerStatusDefinition({
            id: 'test_owned_marker',
            label: 'Owned Marker',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });
        registerStatusDefinition({
            id: 'test_disabled_marker',
            label: 'Disabled Marker',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'test-owned-passive',
            name: 'Test Owned Passive',
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
                passives: [
                    {
                        id: 'owned-passive',
                        name: 'Owned Passive',
                        requirements: { owned: true },
                        hooks: {
                            battleStart: [{
                                type: 'adjustStatus',
                                target: 'self',
                                statusId: 'test_owned_marker',
                                countDelta: 1,
                            }],
                        },
                    },
                    {
                        id: 'disabled-passive',
                        name: 'Disabled Passive',
                        requirements: { owned: false },
                        hooks: {
                            battleStart: [{
                                type: 'adjustStatus',
                                target: 'self',
                                statusId: 'test_disabled_marker',
                                countDelta: 1,
                            }],
                        },
                    },
                ],
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
        const ownedMarker = hero.statuses.find((status) => status.id === 'test_owned_marker');
        const disabledMarker = hero.statuses.find((status) => status.id === 'test_disabled_marker');
        assert(ownedMarker?.count === 1, `Expected owned passive marker, got ${ownedMarker?.count}`);
        assert(!disabledMarker || disabledMarker.count === 0, 'Expected owned:false passive not to fire.');
    });

    test('Status: paralysis registers LC id and paralyze alias; consumes on coin roll', () => {
        const battleModules = createBattleEnvironment();
        const registry = battleModules.registry;
        const registerStatusDefinition = registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        assert(registry?.isSupportedStatusId?.('paralysis'), 'Expected paralysis status id.');
        assert(registry?.isSupportedStatusId?.('paralyze'), 'Expected paralyze alias id.');
        const definition = registry?.getStatusDefinition?.('paralysis');
        assert(definition?.id === 'paralysis', `Expected canonical paralysis id, got ${definition?.id}`);

        registerStatusDefinition({
            id: 'paralysis',
            label: 'Paralysis',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {
                coinRoll: [
                    {
                        type: 'modifyContext',
                        target: 'self',
                        field: 'forceCoinZero',
                        operation: 'set',
                        value: true,
                    },
                    {
                        type: 'adjustStatus',
                        target: 'self',
                        statusId: 'paralysis',
                        countDelta: -1,
                    },
                ],
                turnEnd: [
                    {
                        type: 'consumeStatus',
                        target: 'self',
                        statusId: 'paralysis',
                    },
                ],
            },
        }, { allowOverwrite: true, aliases: ['paralyze'] });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const attackSkill = {
            id: 'paralysis-strike',
            name: 'Paralysis Strike',
            skillType: 'attack',
            basePower: 4,
            coinPower: 6,
            coinCount: 2,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const pokeSkill = {
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
        const createUnit = (id, name, skills, speed) => ({
            id,
            name,
            level: 1,
            maxHp: 200,
            sp: 0,
            speedRange: [speed, speed],
            defenseLevel: 0,
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            sprites: { idle: '', skills: {} },
            skills,
            passives: [],
        });

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'paralysis-coin-roll',
                name: 'Paralysis Coin Roll',
                playerUnits: [createUnit('ally', 'Ally', [attackSkill], 5)],
                enemyUnits: [createUnit('enemy', 'Enemy', [pokeSkill], 1)],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 1,
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        assert(engine.addStatus('player', { id: 'paralysis', count: 2, potency: 0 }, 0), 'Expected to seed paralysis on attacker.');

        engine.selectSlot('player-slot-1');
        engine.selectSkill('paralysis-strike');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const ally = engine.getState().playerUnits[0];
        const paralysis = ally.statuses.find((status) => status.id === 'paralysis');
        assert(!paralysis || paralysis.count === 0, `Expected paralysis consumed on coin rolls, got ${paralysis?.count ?? 'removed'}`);
    });

    test('Skill deck: turn start draws offers and gates selection', () => {
        const battleModules = createBattleEnvironment();
        const skillDeck = battleModules.skillDeck;
        assert(typeof skillDeck?.drawTurnOffers === 'function', 'Expected skillDeck module.');

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'skill-deck-test',
            name: 'Skill Deck Test',
            playerUnits: [{
                id: 'hero',
                name: 'Hero',
                deploymentOrder: 1,
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
                skills: [
                    { id: 'wrath-1', name: 'Wrath 1', skillSlot: 'slot-1', basePower: 3, coinPower: 1, coinCount: 1, damageType: 'slash', sinType: 'wrath' },
                    { id: 'sloth-2', name: 'Sloth 2', skillSlot: 'slot-2', basePower: 5, coinPower: 2, coinCount: 2, damageType: 'slash', sinType: 'sloth' },
                    { id: 'guard', name: 'Guard', skillType: 'guard', basePower: 4, coinPower: 0, coinCount: 1, damageType: 'slash', sinType: 'pride' },
                ],
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
                skills: [{ id: 'poke', name: 'Poke', basePower: 1, coinPower: 0, coinCount: 1, damageType: 'slash', sinType: 'wrath' }],
                passives: [],
            }],
            rules: { encounterType: 'focused', maxPlayerUnits: 2, enemyAiProfile: { skill: 'first', target: 'firstLiving' } },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        const state = engine.getState();
        const playerSlot = state.playerSlots[0];
        assert(playerSlot.skillOffer?.top, 'Expected top skill offer on turn start.');
        assert(engine.selectSkill('guard', playerSlot.id) === false, 'Expected guard blocked until defense mode.');

        assert(engine.toggleDefenseMode(playerSlot.id), 'Expected defense toggle.');
        const defenseSlot = engine.getState().playerSlots[0];
        assert(defenseSlot.skillOffer?.bottom === 'guard', `Expected guard on bottom, got ${defenseSlot.skillOffer?.bottom}`);
        assert(engine.selectSkill('guard', playerSlot.id), 'Expected guard selection in defense mode.');

        const deck = state.runtimeState?.skillDeckByUnitId?.hero || {};
        const deckTotal = Object.values(deck).reduce((sum, count) => sum + count, 0);
        assert(deckTotal >= 4, `Expected default skill deck counts, got ${deckTotal}`);
    });

    test('Skill deck: focused slot growth and resolve regression', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'slot-growth-test',
            name: 'Slot Growth Test',
            playerUnits: [
                {
                    id: 'hero-a',
                    name: 'Hero A',
                    deploymentOrder: 1,
                    level: 1,
                    maxHp: 100,
                    sp: 0,
                    speedRange: [6, 6],
                    defenseLevel: 0,
                    resistances: {
                        physical: { slash: 1, pierce: 1, blunt: 1 },
                        sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                    },
                    sprites: { idle: '', skills: {} },
                    skills: [{ id: 'strike-a', name: 'Strike A', skillSlot: 'slot-1', basePower: 3, coinPower: 1, coinCount: 1, damageType: 'slash', sinType: 'wrath' }],
                    passives: [],
                },
                {
                    id: 'hero-b',
                    name: 'Hero B',
                    deploymentOrder: 2,
                    level: 1,
                    maxHp: 100,
                    sp: 0,
                    speedRange: [4, 4],
                    defenseLevel: 0,
                    resistances: {
                        physical: { slash: 1, pierce: 1, blunt: 1 },
                        sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
                    },
                    sprites: { idle: '', skills: {} },
                    skills: [{ id: 'strike-b', name: 'Strike B', skillSlot: 'slot-1', basePower: 3, coinPower: 1, coinCount: 1, damageType: 'slash', sinType: 'lust' }],
                    passives: [],
                },
            ],
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
                skills: [{ id: 'poke', name: 'Poke', basePower: 1, coinPower: 0, coinCount: 1, damageType: 'slash', sinType: 'wrath' }],
                passives: [],
            }],
            rules: { encounterType: 'focused', maxPlayerUnits: 3, enemyAiProfile: { skill: 'first', target: 'firstLiving' } },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        assert(engine.getState().playerSlots.length === 2, 'Expected two slots on turn 1.');
        assert(engine.resolveTurn(), 'Expected turn 1 resolve.');
        engine.advanceTurn();
        const afterGrowth = engine.getState();
        assert(afterGrowth.playerSlots.length === 3, `Expected third slot after growth, got ${afterGrowth.playerSlots.length}`);
        assert(afterGrowth.playerSlots.some((slot) => slot.unitId === 'hero-a' && slot.skillSlotIndex === 1), 'Expected extra slot for lowest deployment order.');

        assert(engine.resolveTurn(), 'Expected resolve to succeed with auto-selected skills.');
    });

    test('Skill deck: seven player slots initialize with offers', () => {
        const battleModules = createBattleEnvironment();
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const createUnit = (index) => ({
            id: `unit-${index}`,
            name: `Unit ${index}`,
            deploymentOrder: index,
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [3, 3],
            defenseLevel: 0,
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            sprites: { idle: '', skills: {} },
            skills: [{ id: `skill-${index}`, name: 'Skill', skillSlot: 'slot-1', basePower: 1, coinPower: 0, coinCount: 1, damageType: 'slash', sinType: 'wrath' }],
            passives: [],
        });
        const battleDefinition = {
            id: 'seven-slot-test',
            name: 'Seven Slot Test',
            playerUnits: Array.from({ length: 7 }, (_, index) => createUnit(index + 1)),
            enemyUnits: [createUnit(99)],
            rules: { encounterType: 'focused', enemyAiProfile: { skill: 'first', target: 'firstLiving' } },
        };
        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        const state = engine.getState();
        assert(state.playerSlots.length === 7, `Expected 7 player slots, got ${state.playerSlots.length}`);
        state.playerSlots.forEach((slot) => {
            assert(slot.skillOffer && typeof slot.skillOffer === 'object', 'Expected skillOffer object.');
            assert(slot.skillOffer.top, `Expected drawn top offer for slot ${slot.id}.`);
        });
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

    test('Schema: unit sprites.splash is optional', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'registry/battleRegistry.js'));
        require(path.resolve(battleRoot, 'schema/battleSchema.js'));

        const validateUnitDefinition = global.window.EchoesOfTheCityBattle.validateUnitDefinition;
        assert(typeof validateUnitDefinition === 'function', 'Expected validateUnitDefinition.');

        const baseUnit = {
            id: 'splash-test-unit',
            name: 'Splash Test',
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
        };

        const withSplash = validateUnitDefinition({
            ...baseUnit,
            sprites: { ...baseUnit.sprites, splash: 'assets/roster/splash.png' },
        });
        assert(!withSplash.errors.length, `Expected splash to be valid: ${withSplash.errors.join(', ')}`);

        const badSplash = validateUnitDefinition({
            ...baseUnit,
            sprites: { ...baseUnit.sprites, splash: '' },
        });
        assert(badSplash.errors.length > 0, 'Expected empty splash string to fail validation.');
    });

    test('Team builder: identity cards and portrait URL fallback', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'ui/roster/teamBuilderRenderer.js'));

        const teamBuilder = global.window.EchoesOfTheCityTeamBuilder;
        const unitList = [{
            id: 'card-unit',
            name: 'Card Unit',
            level: 12,
            sprites: {
                splash: 'assets/roster/card-splash.png',
                idle: 'assets/test-idle.png',
                skills: {},
            },
            skills: [{ id: 'hit', sinType: 'pride', skillType: 'attack', basePower: 1, coinPower: 0, coinCount: 1, damageType: 'slash', effects: [] }],
        }];

        const portraitFromSplash = teamBuilder.getUnitPortraitUrl(unitList[0], (value) => `resolved:${value}`);
        assert(portraitFromSplash === 'resolved:assets/roster/card-splash.png', 'Expected splash portrait URL.');

        const portraitFromIdle = teamBuilder.getUnitPortraitUrl({
            ...unitList[0],
            sprites: { idle: 'assets/fallback.png', skills: {} },
        }, (value) => `resolved:${value}`);
        assert(portraitFromIdle === 'resolved:assets/fallback.png', 'Expected idle fallback portrait URL.');

        const escapeAttr = (value) => String(value);
        const escapeHtml = (value) => String(value);
        const state = teamBuilder.createDefaultTeamPresetsState();
        state.presets[0].unitIds = ['card-unit'];

        const renderOptions = {
            resolveAssetUrl: (value) => `resolved:${value}`,
        };

        assert(typeof teamBuilder.renderPresetRail === 'function', 'Expected renderPresetRail export.');
        assert(typeof teamBuilder.renderTeamMain === 'function', 'Expected renderTeamMain export.');

        const presetRailHtml = teamBuilder.renderPresetRail(state, escapeAttr, escapeHtml, renderOptions);
        assert(presetRailHtml.includes('echoes-team__presets--lc'), 'Expected LC preset rail class in renderPresetRail.');
        assert(!presetRailHtml.includes('echoes-team-preset-button-url'), 'Preset rail should not use rosterbutton inline style.');
        assert(!presetRailHtml.includes('rosterbutton.png'), 'Preset rail should not embed rosterbutton asset.');
        assert(!presetRailHtml.includes('echoes-team__zone-grid'), 'Preset rail should not include zone grid.');

        const teamMainHtml = teamBuilder.renderTeamMain(state, unitList, escapeAttr, escapeHtml, renderOptions);
        assert(teamMainHtml.includes('echoes-team__zone-grid'), 'Expected LC zone grid in renderTeamMain.');
        assert(!teamMainHtml.includes('echoes-team__presets--lc'), 'renderTeamMain should not include preset rail.');

        const html = teamBuilder.renderTeamBuilder(state, unitList, escapeAttr, escapeHtml, renderOptions);
        assert(html.includes('echoes-identity-card'), 'Expected identity card markup.');
        assert(html.includes('echoes-identity-slot--empty'), 'Expected empty identity slots.');
        assert((html.match(/echoes-identity-slot/g) || []).length >= teamBuilder.MAX_TEAM_SIZE, 'Expected fixed slot containers.');
        assert(html.includes('resolved:assets/roster/card-splash.png'), 'Expected splash art in card background.');
        assert(html.includes('echoes-team--lc'), 'Expected LC team root class.');
        assert(html.includes('echoes-team__zone-name'), 'Expected LC zone name markup.');
        assert(html.includes('echoes-team__zone-grid'), 'Expected LC zone grid wrapper.');
        assert(!html.includes('echoes-team__center'), 'Expected no legacy center wrapper.');
        assert(!html.includes('echoes-team__grid-header'), 'Expected no legacy grid header.');
        assert(html.includes('echoes-team__presets--lc'), 'Expected LC preset rail class.');
        assert(!html.includes('echoes-team-preset-button-url'), 'Expected no rosterbutton inline style on preset tabs.');
        assert(teamBuilder.TEAM_MENU_ASSETS?.gridBackground?.includes('teammenubg.png'), 'Expected teammenubg grid background asset path.');
        assert(html.includes('Uptie_4_Frame_000.png'), 'Expected uptie frame asset on team cards.');
        assert(html.includes('echoes-identity-card__frame'), 'Expected identity card frame markup.');

        const cardHtml = teamBuilder.renderIdentityCard(unitList[0], unitList, escapeAttr, escapeHtml, {
            variant: 'team',
            unitId: 'card-unit',
            resolveAssetUrl: (value) => `resolved:${value}`,
        });
        assert(cardHtml.includes('echoes-identity-card--team'), 'Expected team card variant class.');
        assert(cardHtml.includes('echoes-identity-card__frame'), 'Expected frame element on team card.');
        assert(cardHtml.includes('resolved:assets/characterstab/Uptie_4_Frame_000.png'), 'Expected resolved frame URL.');

        assert(teamBuilder.TEAM_MENU_ASSETS?.presetButton?.includes('rosterbutton.png'), 'Expected TEAM_MENU_ASSETS preset button path.');
        assert(teamBuilder.TEAM_MENU_ASSETS?.gridBackground?.includes('teammenubg.png'), 'Expected TEAM_MENU_ASSETS grid background path.');
        assert((html.match(/echoes-team__preset-tab--lc/g) || []).length === teamBuilder.MAX_TEAM_PRESETS, 'Expected eight preset tabs.');
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
        const defaultUnit = creatorUi.createDefaultUnitDefinition();
        assert(defaultUnit.sprites?.splash === '', 'Expected default unit splash field.');
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
        assert(html.includes('echoes-editor-pack-section'), 'Expected workshop pack section wrapper.');
        assert(html.includes('Encounters in pack'), 'Expected encounters in pack section.');
        assert(html.includes('Background image'), 'Expected background image field.');
    });

    test('Creator UI: stack-only statuses adapt gate and apply fields', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/creator/creatorUiHelpers.js'));

        const creatorUi = global.window.EchoesOfTheCityCreatorUi;
        assert(typeof creatorUi?.getStatusMetricMode === 'function', 'Expected getStatusMetricMode.');

        const catalog = creatorUi.buildCatalog([
            {
                id: 'rupture',
                label: 'Rupture',
                stackModel: {
                    potency: { enabled: true, min: 0, max: 99, application: 'add' },
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                },
            },
            {
                id: 'aggro',
                label: 'Aggro',
                countOnly: true,
                stackModel: {
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                },
            },
            {
                id: 'haste-like',
                label: 'Haste',
                stackModel: {
                    count: { enabled: true, min: 0, max: 99, application: 'add' },
                },
            },
        ]);

        assert(creatorUi.getStatusMetricMode('rupture', catalog) === 'potencyCount', 'Expected rupture as potencyCount.');
        assert(creatorUi.getStatusMetricMode('aggro', catalog) === 'stacks', 'Expected aggro as stacks.');
        assert(creatorUi.getStatusMetricMode('haste-like', catalog) === 'stacks', 'Expected count-enabled-only as stacks.');
        assert(creatorUi.getStatusMetricMode('', catalog) === 'unknown', 'Expected empty status as unknown.');

        const escapeAttr = (value) => String(value);
        const escapeHtml = (value) => String(value);
        const fieldAttrs = 'data-action="creator-skill-effect-field"';

        const stacksGate = creatorUi.renderEffectFilters(
            { statusId: 'aggro', minStatusCount: 3, type: 'modifyContext' },
            catalog,
            escapeAttr,
            fieldAttrs,
            { showFilters: true },
        );
        assert(stacksGate.includes('Min stacks'), 'Expected Min stacks label for countOnly gate.');
        assert(!stacksGate.includes('Min potency'), 'Expected no Min potency for countOnly gate.');

        const keywordGate = creatorUi.renderEffectFilters(
            { statusId: 'rupture', minStatusPotency: 5, type: 'modifyContext' },
            catalog,
            escapeAttr,
            fieldAttrs,
            { showFilters: true },
        );
        assert(keywordGate.includes('Min potency'), 'Expected Min potency for keyword gate.');
        assert(keywordGate.includes('Min count'), 'Expected Min count for keyword gate.');

        const stacksApply = creatorUi.renderEffectFields(
            { type: 'applyStatus', statusId: 'aggro', count: 2 },
            catalog,
            escapeAttr,
            escapeHtml,
            fieldAttrs,
            { showFilters: false },
        );
        assert(stacksApply.includes('Stacks'), 'Expected Stacks field for countOnly apply.');
        assert(!stacksApply.includes('>Potency<') && !stacksApply.includes('<label>Potency</label>'), 'Expected no Potency label for countOnly apply.');

        const keywordApply = creatorUi.renderEffectFields(
            { type: 'applyStatus', statusId: 'rupture', potency: 2, count: 1 },
            catalog,
            escapeAttr,
            escapeHtml,
            fieldAttrs,
            { showFilters: false },
        );
        assert(keywordApply.includes('<label>Potency</label>'), 'Expected Potency for keyword apply.');

        const effect = { type: 'applyStatus', statusId: 'rupture', potency: 3, count: 2, minStatusPotency: 5 };
        creatorUi.applyEffectFieldUpdate(effect, 'statusId', 'aggro', { catalog });
        assert(effect.statusId === 'aggro', 'Expected statusId updated.');
        assert(effect.potency === undefined, 'Expected potency cleared for stacks status.');
        assert(effect.minStatusPotency === undefined, 'Expected minStatusPotency cleared for stacks status.');
        assert(effect.count === 2, 'Expected existing count kept.');

        const stacksCondition = creatorUi.renderConditionRow(
            { type: 'statusCountAtLeast', statusId: 'aggro', value: 5 },
            catalog,
            escapeAttr,
            escapeHtml,
            'data-action="creator-hook-condition-field"',
        );
        assert(stacksCondition.includes('Min stacks'), 'Expected Min stacks placeholder on stacks condition.');

        const potencyOnStacks = creatorUi.renderConditionRow(
            { type: 'statusPotencyAtLeast', statusId: 'aggro', value: 5 },
            catalog,
            escapeAttr,
            escapeHtml,
            'data-action="creator-hook-condition-field"',
        );
        assert(potencyOnStacks.includes('stacks-only'), 'Expected stacks-only warning on potency condition.');

        const hookHtml = creatorUi.renderHookBlock(
            {
                conditions: [],
                actions: [{ type: 'applyStatus', statusId: 'aggro', count: 1 }],
            },
            catalog,
            escapeAttr,
            escapeHtml,
            'data-creator-scope="status"',
        );
        assert(hookHtml.includes('When this runs'), 'Expected status gate filters on status/passive hook actions.');
        assert(hookHtml.includes('Stacks'), 'Expected Stacks field in status/passive hook apply action.');
        assert(hookHtml.includes('Status stacks/count is at least'), 'Expected stacks-aware condition hint in hooks.');
    });

    test('Description combat sync: compile Predictive Cuts–like description', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/creator/creatorUiHelpers.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/descriptionCombatSync.js'));

        const sync = global.window.EchoesOfTheCityDescriptionCombatSync;
        assert(typeof sync?.compileEffectsFromDescription === 'function', 'Expected compileEffectsFromDescription.');

        const catalog = {
            statusList: [
                { id: 'concealed-exoskeleton', label: 'Concealed Exoskeleton', countOnly: true },
                { id: 'tremor', label: 'Tremor' },
                { id: 'rupture', label: 'Rupture' },
                { id: 'aggro', label: 'Aggro', countOnly: true },
            ],
        };
        const description = [
            '[On_Use] Deal +6% damage for every [concealed_exoskeleton] on self (max 30%)',
            'At 5+ / 10+ [concealed_exoskeleton], Coin Power +1 / +2',
            'Clash Power +1 for every 5 [concealed_exoskeleton] on self (max 2)',
            'Gain +3 [Aggro] to this Skill Slot next Turn',
            '[Coin_1]',
            '[On_Hit] Gain +1 [concealed_exoskeleton]',
            '[On_Hit] Inflict 1 [tremor]',
            '[Coin_2]',
            '[On_Hit] Inflict 2 [rupture] and 1 [rupture] Count',
            'This line is unknown gobbledygook',
        ].join('\n');

        const result = sync.compileEffectsFromDescription(description, catalog);
        assert(Array.isArray(result.effects), 'Expected effects array.');
        assert(result.skipped.some((entry) => /gobbledygook/i.test(entry.text)), 'Expected unknown line in skipped.');

        const damage = result.effects.find((effect) => effect.operation === 'addStatusCountScaled');
        assert(damage, 'Expected damage% scaling effect.');
        assert(damage.multiplier === 0.06, 'Expected 6% multiplier from description.');
        assert(damage.cap === 0.3, 'Expected 30% cap from description.');
        assert(damage.statusId === 'concealed-exoskeleton', 'Expected concealed-exoskeleton on damage scale.');

        const coinPower = result.effects.filter((effect) => effect.field === 'coinPowerBonus' && effect.minStatusCount != null);
        assert(coinPower.length === 2, 'Expected two tiered coin power effects.');
        assert(coinPower[0].minStatusCount === 5 && coinPower[0].value === 1, 'Expected 5+ → +1 coin power.');
        assert(coinPower[1].minStatusCount === 10 && coinPower[1].value === 2, 'Expected 10+ → +2 coin power.');

        const clash = result.effects.find((effect) => effect.field === 'clashPowerBonus');
        assert(clash, 'Expected clash power stepped amount.');
        assert(clash.amount?.clamp?.value?.floor?.statusCount?.statusId === 'concealed-exoskeleton', 'Expected clash clamp.value.floor.statusCount.statusId.');
        assert(clash.amount?.clamp?.max === 2, 'Expected clash clamp.max number.');
        assert(!Array.isArray(clash.amount?.clamp?.max), 'Expected clamp.max to be a number, not an array.');

        const aggro = result.effects.find((effect) => effect.type === 'adjustSlotAggro');
        assert(aggro && aggro.value === 3, 'Expected +3 slot aggro.');
        assert(aggro.trigger === 'onAttackEnd', 'Expected aggro onAttackEnd.');

        const gain = result.effects.find((effect) => effect.type === 'applyStatus' && effect.statusId === 'concealed-exoskeleton');
        assert(gain && gain.target === 'self', 'Expected Gain line to target self.');
        assert(gain.coinIndex === 1, 'Expected Gain under Coin 1.');

        const tremor = result.effects.find((effect) => effect.type === 'applyStatus' && effect.statusId === 'tremor');
        assert(tremor, 'Expected Inflict tremor.');
        assert(!tremor.target || tremor.target === 'opponent', 'Expected Inflict to use opponent/default target.');
        assert(tremor.coinIndex === 1, 'Expected tremor under Coin 1.');

        const rupture = result.effects.find((effect) => effect.type === 'applyStatus' && effect.statusId === 'rupture');
        assert(rupture, 'Expected Inflict rupture potency/count.');
        assert(rupture.potency === 2 && rupture.count === 1, 'Expected rupture 2 potency and 1 count.');
        assert(rupture.coinIndex === 2, 'Expected rupture under Coin 2.');

        assert(sync.resolveStatusId('unknown_goblin_status', catalog) === '', 'Expected unresolved status tokens to stay empty.');
        assert(
            sync.resolveStatusId('concealed_exoskeleton', {
                statusList: [{ id: 'iris_concealed_exoskeleton', label: 'Concealed Exoskeleton' }],
            }) === 'iris_concealed_exoskeleton',
            'Expected suffix/catalog match to Iris concealed id.',
        );
    });

    test('Kit save wiring: clash pattern validates, empty idle allowed, Iris aliases resolve', () => {
        const battleModules = createBattleEnvironment();
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillEffectPatterns.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/descriptionCombatSync.js'));

        const patterns = global.window.EchoesOfTheCitySkillEffectPatterns;
        const sync = global.window.EchoesOfTheCityDescriptionCombatSync;
        const validateUnitDefinition = battleModules.schema.validateUnitDefinition;
        const registerStatusDefinition = battleModules.registry.registerStatusDefinition;
        assert(typeof patterns?.compilePattern === 'function', 'Expected compilePattern.');

        registerStatusDefinition({
            id: 'iris_concealed_exoskeleton',
            label: 'Concealed Exoskeleton',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 20, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        }, { aliases: ['concealed-exoskeleton', 'concealed_exoskeleton'], allowOverwrite: true });

        const compiledClash = patterns.compilePattern('clash_per_n_stacks')[0];
        assert(compiledClash.amount?.clamp?.value, 'Expected clash pattern clamp.value.');
        assert(typeof compiledClash.amount.clamp.max === 'number', 'Expected clash pattern clamp.max number.');

        const clashEffects = [{
            ...compiledClash,
            statusId: 'iris_concealed_exoskeleton',
            amount: {
                clamp: {
                    value: {
                        floor: {
                            statusCount: { target: 'self', statusId: 'iris_concealed_exoskeleton' },
                            multiplier: 0.2,
                        },
                    },
                    max: 2,
                },
            },
        }];

        const unit = {
            id: 'kit-save-unit',
            name: 'Kit Save',
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: '', skills: {} },
            skills: [{
                id: 'predictive-cuts',
                name: 'Predictive Cuts',
                skillType: 'attack',
                basePower: 3,
                coinPower: 4,
                coinCount: 2,
                damageType: 'slash',
                sinType: 'gluttony',
                effects: [
                    ...clashEffects,
                    {
                        trigger: 'onHit',
                        type: 'applyStatus',
                        target: 'self',
                        statusId: 'iris_concealed_exoskeleton',
                        count: 1,
                        coinIndex: 1,
                    },
                ],
            }],
            passives: [],
        };

        const validated = validateUnitDefinition(unit);
        assert(!validated.errors.length, `Expected kit draft to validate: ${validated.errors.join(', ')}`);

        const catalog = {
            statusList: [{ id: 'iris_concealed_exoskeleton', label: 'Concealed Exoskeleton', countOnly: true }],
        };
        assert(sync.resolveStatusId('concealed-exoskeleton', catalog) === 'iris_concealed_exoskeleton', 'Expected hyphen alias resolve.');
        assert(sync.resolveStatusId('concealed_exoskeleton', catalog) === 'iris_concealed_exoskeleton', 'Expected underscore resolve.');
        assert(battleModules.registry.isSupportedStatusId('concealed-exoskeleton'), 'Expected registry alias supported.');

        const pack = JSON.parse(fs.readFileSync(path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json'), 'utf8'));
        battleModules.content.importContentPack(pack, { allowOverwrite: true });
        assert(battleModules.registry.isSupportedStatusId('concealed_exoskeleton'), 'Expected Iris pack aliases to register.');
    });

    test('Skill effect patterns: compile and humanize Predictive Cuts patterns', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillEffectPatterns.js'));

        const patterns = global.window.EchoesOfTheCitySkillEffectPatterns;
        assert(typeof patterns?.compilePattern === 'function', 'Expected compilePattern.');
        assert(typeof patterns?.describeEffect === 'function', 'Expected describeEffect.');

        const catalog = { statusList: [{ id: 'concealed-exoskeleton', label: 'Concealed Exoskeleton' }] };
        const damageScaled = patterns.compilePattern('damage_pct_per_stack');
        assert(damageScaled.length === 1, 'Expected one damage scaling effect.');
        assert(damageScaled[0].type === 'modifyContext', 'Expected modifyContext for damage scaling.');
        assert(damageScaled[0].operation === 'addStatusCountScaled', 'Expected addStatusCountScaled operation.');
        const damageLine = patterns.describeEffect({
            ...damageScaled[0],
            statusId: 'concealed-exoskeleton',
            multiplier: 0.06,
            cap: 0.3,
        }, catalog);
        assert(damageLine.includes('6%'), 'Expected humanized percent damage line.');
        assert(damageLine.includes('Concealed Exoskeleton'), 'Expected status label in humanized line.');

        const tiered = patterns.compilePattern('tiered_coin_power');
        assert(tiered.length === 2, 'Expected two tiered coin power effects.');
        const tierLine = patterns.describeEffect({
            ...tiered[0],
            statusId: 'concealed-exoskeleton',
            minStatusCount: 5,
            value: 1,
        }, catalog);
        assert(tierLine.includes('Coin Power'), 'Expected Coin Power in tier line.');
        assert(tierLine.includes('5+'), 'Expected threshold in tier line.');

        const weighted = patterns.compilePattern('weighted_one_in_three', 2);
        assert(weighted.length === 1, 'Expected one weighted branch effect.');
        assert(weighted[0].coinIndex === 2, 'Expected coin index on weighted branch.');
        const branchLine = patterns.describeEffect(weighted[0], catalog);
        assert(branchLine.includes('33%'), 'Expected 33% label on weighted branch.');

        const skill = {
            effects: [
                ...patterns.compilePattern('damage_pct_per_stack').map((effect) => ({
                    ...effect,
                    statusId: 'concealed-exoskeleton',
                })),
                ...tiered.map((effect) => ({ ...effect, statusId: 'concealed-exoskeleton' })),
                ...patterns.compilePattern('slot_aggro'),
            ],
        };
        const description = patterns.buildDescriptionFromEffects(skill, catalog);
        assert(description.includes('[On Use]'), 'Expected On Use section in synced description.');
        assert(description.includes('Aggro'), 'Expected aggro line in synced description.');
    });

    test('Skill tag renderer: styles On_Use / status / coin tags', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillTagRenderer.js'));

        const tags = global.window.EchoesOfTheCitySkillTagRenderer;
        assert(typeof tags?.renderTaggedText === 'function', 'Expected renderTaggedText.');
        const catalog = {
            statusList: [
                { id: 'rupture', label: 'Rupture' },
                { id: 'concealed-exoskeleton', label: 'Concealed Exoskeleton' },
            ],
        };
        const html = tags.renderTaggedText(
            '[On_Use] Inflict 2 [rupture]\n[On_Hit] Gain [concealed_exoskeleton]\n[coin_1] [Heads_Hit]',
            catalog,
        );
        assert(html.includes('echoes-skill-tag--trigger'), 'Expected trigger tag class.');
        assert(html.includes('[On Use]'), 'Expected humanized On Use label.');
        assert(html.includes('echoes-skill-tag--status'), 'Expected status tag class.');
        assert(html.includes('Rupture'), 'Expected status label.');
        assert(html.includes('Concealed Exoskeleton'), 'Expected catalog status label.');
        assert(html.includes('echoes-skill-tag--coin'), 'Expected coin tag class.');
        assert(html.includes('<br>'), 'Expected newlines preserved as breaks.');
        assert(!html.includes('<script'), 'Expected escaped HTML.');

        const editor = tags.renderTaggedDescriptionEditor({
            value: 'Gain 1 [rupture]',
            fieldAttrs: 'data-action="creator-status-field" data-field="description"',
            catalog,
            escapeAttr: (value) => String(value),
            escapeHtml: (value) => String(value),
            label: 'Effect description',
            rows: 8,
        });
        assert(editor.includes('echoes-tagged-desc'), 'Expected tagged description editor root.');
        assert(editor.includes('[sinking_deluge]'), 'Expected tag syntax help.');
        assert(editor.includes('echoes-tagged-desc__preview'), 'Expected live preview panel.');
        assert(editor.includes('echoes-skill-tag--status'), 'Expected rendered status tag in preview.');
        assert(editor.includes('data-action="creator-status-field"'), 'Expected status field attrs wired.');
    });

    test('Passive card: tagged description editor and planner label', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/sinColors.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillTagRenderer.js'));
        require(path.resolve(battleRoot, 'ui/creator/creatorUiHelpers.js'));
        require(path.resolve(battleRoot, 'ui/creator/movesetSheet/movesetSheetRenderer.js'));

        const creatorUi = global.window.EchoesOfTheCityCreatorUi;
        const movesetSheet = global.window.EchoesOfTheCityMovesetSheet;
        const catalog = creatorUi.buildCatalog([{ id: 'assist-defense', label: 'Assist Defense' }]);
        const escapeAttr = (value) => String(value);
        const escapeHtml = (value) => String(value);
        const html = movesetSheet.renderPassiveCard(
            {
                id: 'dont-thank-me',
                name: "...Don't thank me.",
                plannerLabel: 'PASSIVE',
                description: 'Gain 1 [assist_defense] when an ally is Staggered.',
                hooks: {},
            },
            0,
            catalog,
            creatorUi,
            escapeAttr,
            escapeHtml,
        );
        assert(html.includes('echoes-tagged-desc'), 'Expected tagged description on passive card.');
        assert(html.includes('Passive description'), 'Expected passive description label.');
        assert(html.includes('data-field="plannerLabel"'), 'Expected planner label field.');
        assert(html.includes('echoes-skill-tag--status'), 'Expected tagged preview on passive card.');
    });

    test('Skill inspector: Limbus form and kit strip preview', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/sinColors.js'));
        require(path.resolve(battleRoot, 'ui/creator/iconPickers.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillEffectPatterns.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillTagRenderer.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/descriptionCombatSync.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillPreview.js'));
        require(path.resolve(battleRoot, 'ui/creator/creatorUiHelpers.js'));
        require(path.resolve(battleRoot, 'ui/creator/movesetSheet/movesetSheetRenderer.js'));
        require(path.resolve(battleRoot, 'ui/creator/skillBuilder/skillInspector.js'));

        const creatorUi = global.window.EchoesOfTheCityCreatorUi;
        const skillInspector = global.window.EchoesOfTheCitySkillInspector;
        const catalog = creatorUi.buildCatalog([
            { id: 'rupture', label: 'Rupture', name: 'Rupture' },
        ]);
        const escapeAttr = (value) => String(value);
        const escapeHtml = (value) => String(value);
        const unitDraft = {
            skills: [{
                id: 'predictive-cuts',
                name: 'Predictive Cuts',
                plannerLabel: 'SKILL 1',
                sinType: 'gluttony',
                damageType: 'slash',
                skillType: 'attack',
                basePower: 3,
                coinPower: 4,
                coinCount: 2,
                offenseLevel: 62,
                attackWeight: 1,
                description: '[On_Use] Clash Power +1\n[On_Hit] Inflict 1 [rupture]',
                effects: global.window.EchoesOfTheCitySkillEffectPatterns.compilePattern('apply_status_hit', 1),
            }, {
                id: 'guard-skill',
                name: 'Guard',
                skillType: 'guard',
                plannerLabel: 'DEFENSE',
                basePower: 8,
                coinPower: 0,
                coinCount: 1,
                description: '',
                effects: [],
            }],
            passives: [{ id: 'passive_1', name: 'Test Passive', description: 'Owned passive text.' }],
        };

        const html = skillInspector.renderSkillInspector(unitDraft, catalog, creatorUi, escapeAttr, escapeHtml, { selectedSkillIndex: 0 });
        assert(html.includes('echoes-skill-creator'), 'Expected skill creator form.');
        assert(html.includes('Combat mechanics (engine)'), 'Expected combat mechanics section.');
        assert(html.includes('creator-skill-wire-from-description'), 'Expected Wire combat from description button.');
        assert(html.includes('Who receives this'), 'Expected clarified target label.');
        assert(html.includes('Self (Gain buffs on you)'), 'Expected Self/Gain target option.');
        assert(html.includes('echoes-kit-strip'), 'Expected kit strip preview.');
        assert(html.includes('echoes-kit-card'), 'Expected kit skill cards.');
        assert(html.includes('SKILL 1'), 'Expected planner label in inspector/preview.');
        assert(html.includes('echoes-skill-tag--trigger'), 'Expected rendered description tags in kit card.');
        assert(html.includes('data-action="creator-skill-picker"'), 'Expected sin/damage picker buttons.');
        assert(html.includes('creator-skill-select-change'), 'Expected skill select dropdown.');
        assert(html.includes('PASSIVE'), 'Expected passive card in kit strip.');
    });

    test('Editor workbench: shell renderer exports and TCG labels', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/creator/editorWorkbenchRenderer.js'));

        const editorWorkbench = global.window.EchoesOfTheCityEditorWorkbench;
        const battleModules = global.window.EchoesOfTheCityBattleModules;
        assert(typeof editorWorkbench?.renderEditorWorkbenchShell === 'function', 'Expected renderEditorWorkbenchShell.');
        assert(typeof editorWorkbench?.renderPackBinderTile === 'function', 'Expected renderPackBinderTile.');
        assert(typeof editorWorkbench?.renderCardBinderTile === 'function', 'Expected renderCardBinderTile.');
        assert(typeof editorWorkbench?.renderPublishedSetRow === 'function', 'Expected renderPublishedSetRow.');
        assert(battleModules?.editorWorkbench === editorWorkbench, 'Expected battleModules.editorWorkbench export.');

        const escapeHtml = (value) => String(value);
        const escapeAttribute = (value) => String(value);
        const shellHtml = editorWorkbench.renderEditorWorkbenchShell({
            escapeHtml,
            tab: 'editor',
            entityType: 'battle',
            binderMarkup: editorWorkbench.renderPackBinderTile(
                { id: 'test-pack', name: 'Test Pack' },
                true,
                escapeHtml,
                escapeAttribute,
            ),
            deskMarkup: '<div class="echoes-editor-desk-panel">Desk</div>',
            message: { type: 'success', text: 'Bound.' },
        });

        assert(shellHtml.includes('echoes-editor-workshop'), 'Expected workshop root class.');
        assert(shellHtml.includes('Collection'), 'Expected Collection tab label.');
        assert(shellHtml.includes('Forge'), 'Expected Forge tab label.');
        assert(shellHtml.includes('Encounter Packs'), 'Expected Encounter Packs type label.');
        assert(shellHtml.includes('echoes-editor-pack-tile'), 'Expected pack binder tile.');
        assert(shellHtml.includes('Bound.'), 'Expected message banner text.');
    });

    test('Drive menu: grouping helper and select/deploy markup', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/drive/driveMenuRenderer.js'));

        const driveMenu = global.window.EchoesOfTheCityDriveMenu;
        const battleModules = global.window.EchoesOfTheCityBattleModules;
        assert(typeof driveMenu?.groupBattlesForDriveMenu === 'function', 'Expected groupBattlesForDriveMenu.');
        assert(typeof driveMenu?.renderDriveSelectScreen === 'function', 'Expected renderDriveSelectScreen.');
        assert(typeof driveMenu?.renderDriveDeployScreen === 'function', 'Expected renderDriveDeployScreen.');
        assert(battleModules?.driveMenu === driveMenu, 'Expected battleModules.driveMenu export.');

        const battles = [
            {
                id: 'story-encounter',
                name: 'Story Encounter',
                isDebug: false,
                description: 'A story fight.',
                drive: {
                    chapterId: 'echoes-district',
                    chapterLabel: 'Echoes District',
                    chapterOrder: 0,
                    encounterOrder: 0,
                },
            },
            {
                id: 'debug-fight',
                name: 'Debug Fight',
                isDebug: true,
                description: 'Debug tools.',
            },
            {
                id: 'pack-encounter',
                name: 'Pack Encounter',
                isDebug: false,
                description: 'From a pack.',
            },
        ];
        const installedPacks = [{
            id: 'custom-pack',
            name: 'Custom Pack',
            battleIds: ['pack-encounter'],
        }];

        const chapters = driveMenu.groupBattlesForDriveMenu(battles, installedPacks);
        assert(chapters.length >= 3, 'Expected multiple drive chapters.');
        const storyChapter = chapters.find((chapter) => chapter.chapterId === 'echoes-district');
        assert(storyChapter?.chapterLabel === 'Echoes District', 'Expected drive chapter label.');
        assert(storyChapter?.encounters.some((entry) => entry.id === 'story-encounter'), 'Expected story encounter in chapter.');
        const debugChapter = chapters[chapters.length - 1];
        assert(debugChapter.chapterId === driveMenu.DEBUG_CHAPTER_ID, 'Expected debug chapter last.');

        const escapeHtml = (value) => String(value);
        const escapeAttribute = (value) => String(value).replace(/"/g, '&quot;');
        const selectHtml = driveMenu.renderDriveSelectScreen({
            escapeHtml,
            escapeAttribute,
            chapters,
            selectedChapterId: 'echoes-district',
            selectedBattleId: 'story-encounter',
            selectedBattle: battles[0],
            showDebugToolsToggle: true,
            debugToolsEnabled: false,
            advancedMarkup: '',
        });
        assert(selectHtml.includes('echoes-drive'), 'Expected drive root class.');
        assert(selectHtml.includes('Echoes District'), 'Expected chapter header.');
        assert(selectHtml.includes('echoes-drive__encounter-banner'), 'Expected encounter banner.');
        assert(selectHtml.includes('Begin Drive'), 'Expected Begin Drive label.');

        const deployHtml = driveMenu.renderDriveDeployScreen({
            escapeHtml,
            escapeAttribute,
            selectedBattle: battles[0],
            encounterName: 'Story Encounter',
            teamName: 'Team A',
            capHintMarkup: '<p class="echoes-drive__deploy-cap">Cap</p>',
            deployCardsMarkup: '<div class="echoes-identity-card">Card</div>',
        });
        assert(deployHtml.includes('echoes-drive__deploy-grid'), 'Expected deploy grid wrapper.');
        assert(deployHtml.includes('data-action="confirm-deployment"'), 'Expected confirm deployment action.');
    });

    test('Sin colors and LC vitals markup', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/sinColors.js'));
        require(path.resolve(battleRoot, 'ui/combat/lcCombatUi.js'));

        const sinColors = global.window.EchoesOfTheCitySinColors;
        const lcCombatUi = global.window.EchoesOfTheCityLcCombatUi;
        assert(sinColors?.SIN_COLORS?.envy === '#9b59b6', 'Expected envy to be purple.');
        assert(sinColors?.SIN_COLORS?.pride === '#1e3a6e', 'Expected pride to be dark blue.');
        assert(lcCombatUi?.SIN_COLORS?.envy === '#9b59b6', 'Expected lcCombatUi to use shared envy color.');

        const vitalsHtml = lcCombatUi.renderLcUnitVitals({
            hp: 216,
            maxHp: 300,
            sp: 0,
            staggerThresholds: [75, 150, 225],
            staggerThresholdIndex: 1,
        }, {
            escapeHtml: (value) => String(value),
            variant: 'field',
        });
        assert(vitalsHtml.includes('echoes-lc-vitals'), 'Expected LC vitals root.');
        assert(vitalsHtml.includes('echoes-lc-vitals__hp-bar'), 'Expected HP bar.');
        assert(vitalsHtml.includes('echoes-lc-vitals__threshold-marker'), 'Expected threshold markers.');
        assert(vitalsHtml.includes('echoes-lc-vitals__sp-badge'), 'Expected SP badge.');
        assert(vitalsHtml.includes('216'), 'Expected HP value.');

        const hexFrameHtml = lcCombatUi.renderLcHexFrame({
            hp: 128,
            maxHp: 200,
            sp: 0,
        }, '<span class="test-inner">inner</span>', {
            escapeHtml: (value) => String(value),
            variant: 'portrait',
        });
        assert(hexFrameHtml.includes('echoes-lc-hex-frame'), 'Expected hex frame wrapper.');
        assert(hexFrameHtml.includes('echoes-lc-hex-frame__segment'), 'Expected hex HP segments.');
        assert(hexFrameHtml.includes('is-filled'), 'Expected filled hex segments.');
        assert(hexFrameHtml.includes('test-inner'), 'Expected hex frame inner content.');

        const portraitVitalsHtml = lcCombatUi.renderLcUnitVitals({
            hp: 128,
            maxHp: 200,
            sp: 0,
        }, {
            escapeHtml: (value) => String(value),
            variant: 'portrait',
            hideHpBar: true,
        });
        assert(!portraitVitalsHtml.includes('echoes-lc-vitals__hp-bar'), 'Expected portrait hex vitals to hide flat HP bar.');
        assert(portraitVitalsHtml.includes('echoes-lc-vitals--hex-frame'), 'Expected hex-frame vitals modifier.');

        const coinHtml = lcCombatUi.renderBillboardCoinTrack(
            ['pending', 'heads', 'tails'],
            (value) => `resolved:${value}`,
        );
        assert(coinHtml.includes('Coin.png'), 'Expected base coin image.');
        assert(coinHtml.includes('CoinHeads.png'), 'Expected heads coin image.');
        assert(coinHtml.includes('CoinTails.png'), 'Expected tails coin image.');

        const displayBattle = {
            playerUnits: [{ id: 'ally', hp: 100, sp: 0, maxHp: 100 }],
            enemyUnits: [{ id: 'enemy', hp: 100, sp: 0, maxHp: 100, staggerThresholds: [50], staggerThresholdIndex: 0, staggerTurnsRemaining: 0 }],
            playerSlots: [{ id: 'p1', unitId: 'ally' }],
            enemySlots: [{ id: 'e1', unitId: 'enemy' }],
        };
        const resolvedBattle = JSON.parse(JSON.stringify(displayBattle));
        resolvedBattle.enemyUnits[0].hp = 40;
        resolvedBattle.enemyUnits[0].staggerTurnsRemaining = 1;
        const entry = {
            engagementType: 'one-sided',
            leftSkillId: 'hit',
            leftSlotId: 'p1',
            rightSlotId: 'e1',
            hits: [{ targetHp: 40 }],
        };
        const vitalsResult = lcCombatUi.applyPlaybackHitVitals(
            entry,
            0,
            displayBattle,
            resolvedBattle,
            () => 'left',
        );
        assert(displayBattle.enemyUnits[0].hp === 40, 'Expected defender HP updated during playback.');
        assert(vitalsResult?.previousHp === 100, 'Expected previous HP in vitals result.');
        assert(lcCombatUi.didCrossStaggerThreshold(resolvedBattle.enemyUnits[0], 100, 40), 'Expected stagger threshold cross.');
    });

    test('LC chrome and battle HUD helpers', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/lc/lcChrome.js'));
        require(path.resolve(battleRoot, 'ui/combat/lcBattleHud.js'));

        const lcChrome = global.window.EchoesOfTheCityLcChrome;
        const lcBattleHud = global.window.EchoesOfTheCityLcBattleHud;
        assert(lcChrome?.LC_BATTLE_UI_ASSETS?.dashboardBackplate, 'Expected battle UI asset map.');
        const counterHtml = lcChrome.renderBrassCounter('ENEMY', '3', { subValue: '/ 12' });
        assert(counterHtml.includes('echoes-lc-brass-counter'), 'Expected brass counter markup.');

        const topHudHtml = lcBattleHud.renderLcBattleTopHud({
            turn: 2,
            wave: 1,
            totalWaves: 1,
            enemyUnits: [{ hp: 50 }, { hp: 0 }],
            phase: 'select',
        }, {}, {
            escapeHtml: (value) => String(value),
            escapeAttribute: (value) => String(value),
            getResolvedBattle: (battle) => battle,
        });
        assert(topHudHtml.includes('echoes-lc-battle-top-hud'), 'Expected top HUD.');
        assert(topHudHtml.includes('ENEMY'), 'Expected enemy counter label.');
        assert(topHudHtml.includes('TURN'), 'Expected turn counter label.');
        assert(!topHudHtml.includes('echoes-lc-dante-clock'), 'Dante clock should not be in top HUD.');

        const enemyHpHtml = lcBattleHud.renderLcEnemyHpBar({
            hp: 62,
            maxHp: 100,
            staggerThresholds: [75, 50],
            staggerThresholdIndex: 1,
        }, {
            escapeHtml: (value) => String(value),
            escapeAttribute: (value) => String(value),
        });
        assert(enemyHpHtml.includes('echoes-lc-enemy-hp-bar'), 'Expected enemy HP bar.');
        assert(enemyHpHtml.includes('echoes-lc-vitals__threshold-marker'), 'Expected stagger threshold markers on enemy HP bar.');
    });

    test('Battle renderer: LC battle shell markup', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = { EchoesOfTheCityBattleModules: {} };
        require(path.resolve(battleRoot, 'ui/sinColors.js'));
        require(path.resolve(battleRoot, 'ui/lc/lcChrome.js'));
        require(path.resolve(battleRoot, 'ui/combat/lcBattleHud.js'));
        require(path.resolve(battleRoot, 'ui/combat/lcCombatUi.js'));
        require(path.resolve(battleRoot, 'registry/battleRegistry.js'));
        require(path.resolve(battleRoot, 'core/battleRenderer.js'));

        const battleModules = global.window.EchoesOfTheCityBattleModules;
        const mountElement = { innerHTML: '' };
        const renderer = battleModules.createBattleRenderer({
            mountElement,
            resolveAssetUrl: (value) => `resolved:${value}`,
        });

        const mockUnit = {
            id: 'ally',
            name: 'Ally',
            hp: 128,
            maxHp: 200,
            sp: 0,
            sprites: { splash: 'assets/ally-splash.png', idle: 'assets/ally.png', skills: {} },
            skills: [],
        };
        const mockEnemy = {
            id: 'enemy',
            name: 'Enemy',
            hp: 62,
            maxHp: 100,
            sp: 0,
            sprites: { splash: 'assets/enemy-splash.png', idle: 'assets/enemy.png', skills: {} },
            skills: [],
        };
        const battle = {
            phase: 'select',
            turn: 1,
            wave: 1,
            totalWaves: 1,
            winner: null,
            activePlayerSlotId: 'p1',
            playerUnits: [mockUnit],
            enemyUnits: [mockEnemy],
            playerSlots: [{ id: 'p1', unitId: 'ally', index: 0, speed: 3, side: 'player' }],
            enemySlots: [{ id: 'e1', unitId: 'enemy', index: 0, speed: 2, side: 'enemy' }],
            log: [],
            speedOrder: ['p1', 'e1'],
            resolutionQueue: [],
            rules: {
                background: {
                    image: 'assets/combat/backgrounds/hall.png',
                },
            },
        };

        renderer.render(battle, {});
        const html = mountElement.innerHTML;
        assert(html.includes('combat-limbus--lc'), 'Expected LC combat shell.');
        assert(html.includes('echoes-lc-battle-top-hud'), 'Expected LC top HUD.');
        assert(html.includes('data-action="quit-battle"'), 'Expected quit battle control.');
        assert(html.includes('echoes-battle-panel__field-bg'), 'Expected field background layer.');
        assert(html.includes('combat-battlefield--custom-bg'), 'Expected custom background modifier class.');
        assert(html.includes('echoes-lc-enemy-hp-bar'), 'Expected enemy overhead HP bar.');
        assert(html.includes('echoes-lc-field-speed-hex'), 'Expected field speed hex.');
        assert(html.includes('echoes-lc-start-button'), 'Expected START gear button.');
        assert(html.includes('data-action="resolve-turn"'), 'Expected resolve turn action.');
        assert(html.includes('echoes-lc-sin-rail--vertical'), 'Expected vertical sin rail.');
        assert(html.includes('echoes-lc-dashboard-console'), 'Expected dashboard console backplate.');
        assert(!html.includes('Win Rate'), 'Win rate toggle should not be in dashboard console.');
        assert(!html.includes('echoes-lc-console-toggle'), 'Dashboard console should not use placeholder toggles.');
        assert(!html.includes('echoes-battle-panel__combat-result-card'), 'LC battlefield should not show center planning card.');
        assert(html.includes('echoes-battle-panel__field-vitals-lc'), 'Allied field units should show HP vitals.');
        assert(html.includes('echoes-lc-vitals--field'), 'Allied field units should use field vitals bar.');
    });

    test('Schema: rules.background validates image path', () => {
        const battleModules = createBattleEnvironment();
        const minimalEnemy = {
            id: 'bg-schema-enemy',
            name: 'BG Enemy',
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
        };
        const baseRules = {
            encounterType: 'focused',
            maxTurns: 10,
            victoryCondition: 'defeat-all-enemies',
            failureCondition: 'all-allies-defeated',
        };
        const valid = battleModules.schema.validateEncounterDefinition({
            id: 'bg-valid-encounter',
            name: 'BG Valid',
            enemyUnits: [minimalEnemy],
            rules: {
                ...baseRules,
                background: {
                    image: 'assets/combat/backgrounds/hall.png',
                    overlay: 'rgba(8,6,5,0.42)',
                },
            },
        });
        assert(!valid.errors.length, `Expected valid background rules: ${valid.errors.join(', ')}`);

        const invalid = battleModules.schema.validateEncounterDefinition({
            id: 'bg-invalid-encounter',
            name: 'BG Invalid',
            enemyUnits: [minimalEnemy],
            rules: {
                ...baseRules,
                background: { overlay: 'rgba(0,0,0,0.4)' },
            },
        });
        assert(
            invalid.errors.some((entry) => entry.includes('background.image')),
            `Expected background.image error: ${invalid.errors.join(', ')}`,
        );
    });

    test('LC UI: dashboard row layout and sin resource rail', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'ui/combat/lcCombatUi.js'));

        const lcCombatUi = global.window.EchoesOfTheCityLcCombatUi;
        assert(typeof lcCombatUi?.renderLcSinResourceRail === 'function', 'Expected renderLcSinResourceRail.');
        assert(typeof lcCombatUi?.renderLcDashboard === 'function', 'Expected renderLcDashboard.');

        const railHtml = lcCombatUi.renderLcSinResourceRail({
            encounterResources: { 'player:wrath': 3, 'player:pride': 7 },
        }, (value) => String(value));
        assert(railHtml.includes('echoes-lc-sin-rail--field'), 'Expected field sin rail markup.');
        assert(railHtml.includes('>3<'), 'Expected wrath count in sin rail.');
        assert(railHtml.includes('>7<'), 'Expected pride count in sin rail.');

        const dashboardHtml = lcCombatUi.renderLcDashboard({
            phase: 'select',
            playerSlots: [],
            playerUnits: [],
        }, {}, {
            escapeHtml: (value) => String(value),
            getPhaseLabel: () => 'Planning',
            getResolvedBattle: (battle) => battle,
            renderResolutionFeed: () => '',
            renderQueueTrack: () => '',
            renderDebugRollControls: () => '',
            escapeAttribute: (value) => String(value),
            resolveAssetUrl: (value) => value,
            getUnitById: () => null,
            getSkillById: () => null,
            isDefenseSkill: () => false,
            getSkillPowerLabel: () => '',
        });
        assert(dashboardHtml.includes('echoes-lc-stage-frame'), 'Expected LC stage frame.');
        assert(dashboardHtml.includes('echoes-lc-skill-row--top'), 'Expected top skill row.');
        assert(dashboardHtml.includes('echoes-lc-portrait-row'), 'Expected portrait row.');
    });

    test('LC UI: clash bar markup and playback helpers', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'ui/combat/lcCombatUi.js'));

        const lcCombatUi = global.window.EchoesOfTheCityLcCombatUi;
        const mockSkill = {
            id: 'clash-hit',
            name: 'Clash Hit',
            skillType: 'attack',
            basePower: 10,
            coinPower: 2,
            coinCount: 3,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const leftUnit = {
            id: 'clash-ally',
            name: 'Ally',
            sprites: { idle: 'assets/ally.png', skills: {} },
            skills: [mockSkill],
        };
        const rightUnit = {
            id: 'clash-enemy',
            name: 'Enemy',
            sprites: { splash: 'assets/enemy-splash.png', skills: {} },
            skills: [mockSkill],
        };
        const battle = {
            playerUnits: [leftUnit],
            enemyUnits: [rightUnit],
            playerSlots: [{ id: 'p1', unitId: 'clash-ally', side: 'player', index: 0 }],
            enemySlots: [{ id: 'e1', unitId: 'clash-enemy', side: 'enemy', index: 0 }],
        };
        const entry = {
            engagementType: 'clash',
            leftSlotId: 'p1',
            rightSlotId: 'e1',
            leftSkillId: 'clash-hit',
            rightSkillId: 'clash-hit',
            leftSkillName: 'Clash Hit',
            rightSkillName: 'Clash Hit',
            leftDisplayPower: 16,
            rightDisplayPower: 12,
            rounds: [{ leftPower: 18, rightPower: 14, result: 'left-win', leftFlips: 'H', rightFlips: 'T' }],
            hits: [],
        };
        const uiState = {
            playback: {
                isRunning: true,
                entry,
                entryIndex: 0,
                totalEntries: 1,
                phase: 'round-reveal',
                roundIndex: 0,
                hitIndex: -1,
                leftBroken: 0,
                rightBroken: 0,
            },
        };
        const deps = {
            escapeHtml: (value) => String(value),
            escapeAttribute: (value) => String(value),
            getSlotById: (b, id) => [...b.playerSlots, ...b.enemySlots].find((slot) => slot.id === id) || null,
            getUnitById: (b, id) => [...b.playerUnits, ...b.enemyUnits].find((unit) => unit.id === id) || null,
            getSkillById: (unit, id) => unit?.skills?.find((skill) => skill.id === id) || null,
            resolveAssetUrl: (value) => `resolved:${value}`,
            renderPlaybackCoinTrack: (skill) => skill ? '<span class="echoes-battle-panel__playback-coin is-heads"></span>' : '',
            getPlaybackValueState: () => ({ leftValue: 18, rightValue: 14 }),
        };
        const billboardDeps = {
            ...deps,
            leftPosition: { x: 24, y: 60 },
            rightPosition: { x: 78, y: 60 },
            getBillboardPowerForSide: (side) => (side === 'left' ? 18 : 14),
            renderBillboardCoinsForSide: (side, playback, entry, skill) => (
                skill ? '<span class="echoes-battle-panel__playback-coin is-heads"></span>' : ''
            ),
        };

        const clashHtml = lcCombatUi.renderLcEngagementBillboards(battle, uiState, billboardDeps);
        assert(clashHtml.includes('echoes-lc-engagement-billboard'), 'Expected LC engagement billboard.');
        assert(clashHtml.includes('echoes-lc-engagement-center'), 'Expected LC engagement center label.');
        assert(clashHtml.includes('CLASH'), 'Expected CLASH label.');
        assert(clashHtml.includes('Clash Hit'), 'Expected skill name on billboard.');
        assert(clashHtml.includes('>18<'), 'Expected left clash power.');
        assert(clashHtml.includes('>14<'), 'Expected right clash power.');
        assert(clashHtml.includes('echoes-battle-panel__playback-coin'), 'Expected coin track on billboard.');

        assert(typeof lcCombatUi.computeRunningPower === 'function', 'Expected computeRunningPower export.');
        const runningSkill = { basePower: 6, coinPower: 2 };
        assert(lcCombatUi.computeRunningPower(runningSkill, [true, false], 1) === 8, 'Expected one heads flip power.');
        assert(lcCombatUi.computeRunningPower(runningSkill, [true, true], 2, 12) === 12, 'Expected final power snap.');
        assert(lcCombatUi.normalizeCoinFlips('H T H').length === 3, 'Expected normalized flip tokens.');

        const coinStates = lcCombatUi.getBillboardCoinStates(mockSkill, {
            phase: 'round-reveal',
            roundIndex: 0,
            coinRevealIndex: 1,
            leftBroken: 0,
            rightBroken: 0,
        }, entry, 'left');
        assert(coinStates.includes('flipping') || coinStates.includes('heads'), 'Expected coin states during reveal.');

        assert(typeof lcCombatUi.shouldUseLcEngagementPlayback === 'function', 'Expected shouldUseLcEngagementPlayback export.');
        assert(lcCombatUi.shouldUseLcEngagementPlayback(uiState.playback), 'Expected clash playback to use LC UI.');
        assert(lcCombatUi.shouldUseLcClashPlayback(uiState.playback), 'Expected clash playback alias helper.');
        assert(!lcCombatUi.shouldUseLcEngagementPlayback({ isRunning: true, entry: null }), 'Expected missing entry to skip LC UI.');

        const oneSidedEntry = {
            ...entry,
            engagementType: 'one-sided',
            leftDisplayPower: 22,
            rightDisplayPower: 0,
            rounds: [],
            hits: [{ damage: 8, finalPower: 22, isHeads: true }],
        };
        const oneSidedHtml = lcCombatUi.renderLcEngagementBillboards(battle, {
            playback: {
                ...uiState.playback,
                entry: oneSidedEntry,
                phase: 'attack-hit',
                hitIndex: 0,
                coinRevealIndex: 1,
            },
        }, billboardDeps);
        assert(oneSidedHtml.includes('ATTACK'), 'Expected ATTACK label for one-sided playback.');
        assert(lcCombatUi.shouldUseLcEngagementPlayback({ isRunning: true, entry: oneSidedEntry }), 'Expected one-sided playback to use LC UI.');
    });

    test('Iris pack imports and validates', () => {
        const battleModules = createBattleEnvironment();
        const packPath = path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json');
        const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
        const validation = battleModules.schema.validateContentPackManifest(pack.manifest);
        assert(!validation.errors?.length, validation.errors?.join(', ') || 'Manifest validation failed.');
        const imported = battleModules.content.importContentPack(pack, { allowOverwrite: true });
        assert(imported.counts.units >= 3, `Expected at least 3 units, got ${imported.counts.units}.`);
        assert(imported.counts.statuses >= 9, `Expected at least 9 statuses, got ${imported.counts.statuses}.`);
        const iris = battleModules.content.getUnitDefinition('iris-seven-south');
        assert(iris?.skills?.some((skill) => skill.id === 'fall-back-i-got-you'), 'Expected hidden S1-2 skill.');
        assert(iris?.passives?.some((passive) => passive.id === 'iris-dont-thank-me'), 'Expected Dont thank me passive.');
        assert(iris?.passives?.some((passive) => passive.id === 'iris-modular-weapon-varunastra'), 'Expected Varunastra passive.');
        assert(iris?.passives?.some((passive) => passive.hooks?.onClashLose), 'Expected clash-lose passive hooks.');
        const probing = iris.passives.find((passive) => passive.id === 'iris-probing-weaknesses');
        assert(
            probing?.hooks?.battleStart?.[0]?.actions?.some((action) => action.target === 'highestMaxHpOpponent'),
            'Expected Probing to mark highest Max HP opponent.',
        );
    });

    test('Effect runner: rollDice, status-weighted branches, setSkillDamageType', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        registerStatusDefinition({
            id: 'reading_stacks',
            label: 'Reading',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 99, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const skill = {
            id: 'dice_skill',
            name: 'Dice Skill',
            skillType: 'attack',
            skillSlot: 'slot-1',
            basePower: 3,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [
                {
                    trigger: 'onSelect',
                    type: 'rollDice',
                    target: 'self',
                    faces: 3,
                    count: 1,
                    storeAs: 'typeRoll',
                },
                {
                    trigger: 'onSelect',
                    type: 'chooseWeightedActions',
                    branches: [
                        {
                            weight: { statusCount: { target: 'self', statusId: 'reading_stacks' }, offset: 1 },
                            actions: [{ type: 'setSkillDamageType', target: 'self', damageType: 'pierce', scope: 'baseSkills' }],
                        },
                        {
                            weight: 0.0001,
                            actions: [{ type: 'setSkillDamageType', target: 'self', damageType: 'blunt', scope: 'baseSkills' }],
                        },
                    ],
                },
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
        const createUnit = (id, name, skills, extras = {}) => ({
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
            statuses: extras.statuses || [],
        });

        const previousRandom = Math.random;
        try {
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({
                battleDefinition: {
                    id: 'dice-smoke',
                    name: 'Dice Smoke',
                    playerUnits: [createUnit('ally', 'Ally', [skill], {
                        statuses: [{ id: 'reading_stacks', count: 8, potency: 0 }],
                    })],
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
            engine.selectSkill('dice_skill');
            engine.selectTarget('enemy-slot-1');
            engine.resolveTurn();

            const state = engine.getState();
            const ally = state.playerUnits[0];
            assert(ally.runtimeState?.diceResults?.typeRoll === 3, `Expected dice 3, got ${ally.runtimeState?.diceResults?.typeRoll}`);
            assert(ally.runtimeState?.skillDamageTypeOverride === 'pierce', `Expected pierce override, got ${ally.runtimeState?.skillDamageTypeOverride}`);
            const resolved = ally.skills.find((entry) => entry.id === 'dice_skill');
            // Override is applied via getSkillById shallow copy; stored skill def stays slash.
            assert(resolved.damageType === 'slash', 'Expected definition damageType unchanged.');
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Passive: highestMaxHpOpponent mark + deferred recoverStagger', () => {
        const battleModules = createBattleEnvironment();
        const registerStatusDefinition = battleModules.registry?.registerStatusDefinition || battleModules.registerStatusDefinition;
        registerStatusDefinition({
            id: 'analyze_mark',
            label: 'Analyze',
            countOnly: true,
            stackModel: {
                count: { enabled: true, min: 0, max: 10, application: 'add' },
                expireWhen: { countLte: 0 },
            },
            hooks: {},
        });

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
        const guard = {
            id: 'guard',
            name: 'Guard',
            skillType: 'guard',
            basePower: 1,
            coinPower: 0,
            coinCount: 1,
            damageType: 'slash',
            sinType: 'wrath',
            effects: [],
        };
        const ally = {
            id: 'ally',
            name: 'Ally',
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
            skills: [poke],
            passives: [{
                id: 'mark-max-hp',
                name: 'Mark Max HP',
                hooks: {
                    battleStart: [{
                        actions: [{
                            type: 'applyStatus',
                            target: 'highestMaxHpOpponent',
                            statusId: 'analyze_mark',
                            count: 1,
                        }],
                    }],
                },
            }],
        };
        const enemyLow = {
            id: 'enemy_low',
            name: 'Low Max',
            level: 1,
            maxHp: 20,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [guard],
            passives: [],
        };
        const enemyHigh = {
            id: 'enemy_high',
            name: 'High Max',
            level: 1,
            maxHp: 90,
            sp: 0,
            speedRange: [1, 1],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            staggerThresholds: [],
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [guard],
            passives: [],
        };

        const engine = battleModules.createBattleEngine({
            battleDefinition: {
                id: 'maxhp-mark',
                name: 'Max HP Mark',
                playerUnits: [ally],
                enemyUnits: [enemyLow, enemyHigh],
                rules: {
                    encounterType: 'focused',
                    maxTurns: 2,
                    victoryCondition: 'defeat-all-enemies',
                    failureCondition: 'all-allies-defeated',
                    enemyAiProfile: { skill: 'first', target: 'firstLiving' },
                },
            },
            clamp,
        });

        const state = engine.getState();
        // Damage high-max enemy so current HP is lower than the low-max enemy.
        const high = state.enemyUnits.find((unit) => unit.id === 'enemy_high');
        const low = state.enemyUnits.find((unit) => unit.id === 'enemy_low');
        high.hp = 5;
        assert((high.statuses || []).some((status) => status.id === 'analyze_mark'), 'Expected battleStart mark on highest Max HP enemy.');
        assert(!(low.statuses || []).some((status) => status.id === 'analyze_mark'), 'Expected low Max HP enemy unmarked.');

        const staggered = state.playerUnits[0];
        staggered.staggerLevel = 2;
        staggered.staggerRecoverTurn = state.turn + 3;
        staggered.staggerTurnsRemaining = 3;
        staggered.runtimeState = staggered.runtimeState || { flags: {}, counters: {}, diceResults: {} };
        staggered.runtimeState.pendingRecoverStagger = true;

        engine.selectSlot('player-slot-1');
        engine.selectSkill('poke');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();
        assert(engine.advanceTurn(), 'Expected advanceTurn after resolve.');

        const after = engine.getState().playerUnits[0];
        assert((after.staggerTurnsRemaining || 0) === 0, 'Expected pendingRecoverStagger to clear on next turn start.');
        assert((after.staggerLevel || 0) === 0, 'Expected stagger level cleared.');
        assert(!after.runtimeState?.pendingRecoverStagger, 'Expected pending recover flag cleared.');
    });

    test('Iris: enemy stagger queues Fall back follow-up', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        const pack = JSON.parse(fs.readFileSync(path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json'), 'utf8'));
        battleModules.content.importContentPack(pack, { allowOverwrite: true });

        const iris = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-seven-south')));
        const enemy = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-test-enemy')));
        iris.passives = iris.passives.filter((passive) => passive.id === 'iris-dont-thank-me');
        iris.skills = [
            {
                id: 'stagger-hit',
                name: 'Stagger Hit',
                skillType: 'attack',
                basePower: 12,
                coinPower: 2,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [],
            },
            ...iris.skills.filter((skill) => skill.id === 'fall-back-i-got-you'),
        ];
        enemy.maxHp = 100;
        enemy.staggerThresholds = [0.9];

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'iris-stagger-followup-test',
            name: 'Iris Stagger Followup Test',
            playerUnits: [iris],
            enemyUnits: [enemy],
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
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousRandom = Math.random;
        try {
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            const battleState = engine.getState();
            const irisSlot = battleState.playerSlots.find((slot) => slot.id === 'player-slot-1');
            if (irisSlot) {
                irisSlot.skillOffer = { top: 'stagger-hit', bottom: null };
            }
            assert(engine.selectSlot('player-slot-1'), 'Expected Iris slot selection.');
            assert(engine.selectSkill('stagger-hit'), 'Expected stagger-hit selection.');
            assert(engine.selectTarget('enemy-slot-1'), 'Expected enemy target selection.');
            engine.resolveTurn();

            const events = engine.getState().events;
            assert(events.some((event) => event.type === 'unit_staggered'), 'Expected enemy stagger event.');
            const followUpHits = events.filter((event) => event.type === 'hit_resolved' && event.data?.skillId === 'fall-back-i-got-you');
            assert(followUpHits.length >= 1, `Expected Fall back follow-up hits, got ${followUpHits.length}.`);
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Iris: ally Skill 3 queues Fall back follow-up once per turn', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        const pack = JSON.parse(fs.readFileSync(path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json'), 'utf8'));
        battleModules.content.importContentPack(pack, { allowOverwrite: true });

        const iris = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-seven-south')));
        const ally = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-test-ally-s3')));
        const enemy = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-test-enemy')));
        iris.passives = iris.passives.filter((passive) => passive.id === 'iris-dont-thank-me');
        iris.skills = iris.skills.filter((skill) => skill.id === 'fall-back-i-got-you' || skill.id === 'impenetrable-defense');

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'iris-ally-s3-followup-test',
            name: 'Iris Ally S3 Followup Test',
            playerUnits: [iris, ally],
            enemyUnits: [enemy],
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
            'player-slot-2': [true],
            'enemy-slot-1': [false],
        };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const previousRandom = Math.random;
        try {
            Math.random = () => 0.99;
            const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
            const battleState = engine.getState();
            const irisSlot = battleState.playerSlots.find((slot) => slot.id === 'player-slot-1');
            const allySlot = battleState.playerSlots.find((slot) => slot.id === 'player-slot-2');
            if (irisSlot) {
                irisSlot.skillOffer = { top: 'impenetrable-defense', bottom: null };
            }
            if (allySlot) {
                allySlot.skillOffer = { top: 'ally-extension', bottom: null };
            }
            assert(engine.selectSlot('player-slot-1'), 'Expected Iris slot selection.');
            assert(engine.selectSkill('impenetrable-defense'), 'Expected Iris guard selection.');
            assert(engine.selectSlot('player-slot-2'), 'Expected ally slot selection.');
            assert(engine.selectSkill('ally-extension'), 'Expected ally S3 selection.');
            assert(engine.selectTarget('enemy-slot-1'), 'Expected enemy target selection.');
            engine.resolveTurn();

            const events = engine.getState().events;
            const followUpHits = events.filter((event) => event.type === 'hit_resolved' && event.data?.skillId === 'fall-back-i-got-you');
            assert(followUpHits.length >= 1, `Expected Fall back follow-up from ally S3, got ${followUpHits.length}.`);
        } finally {
            Math.random = previousRandom;
        }
    });

    test('Iris: concealed exoskeleton syncs shield stacks', () => {
        const battleModules = createBattleEnvironment();
        const pack = JSON.parse(fs.readFileSync(path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json'), 'utf8'));
        battleModules.content.importContentPack(pack, { allowOverwrite: true });

        const iris = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-seven-south')));
        iris.passives = [];
        iris.skills = [];

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'iris-concealed-shield-test',
            name: 'Iris Concealed Shield Test',
            playerUnits: [iris],
            enemyUnits: [JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-test-enemy')))],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp });
        engine.addStatus('player', { id: 'iris_concealed_exoskeleton', count: 3 }, 0);
        const unit = engine.getState().playerUnits[0];
        const shieldTotal = (unit.shields || [])
            .filter((entry) => entry.id === 'iris_concealed_shield')
            .reduce((sum, entry) => sum + (entry.amount || 0), 0);
        assert(shieldTotal >= 9, `Expected shield amount >= 9, got ${shieldTotal}.`);
    });

    test('Engine: amplitudeConvert tremor to tremor_gnaw', () => {
        const battleModules = createBattleEnvironment();
        requireAllScripts(path.resolve(battleRoot, 'content', 'packs', 'base', 'statuses'));
        const pack = JSON.parse(fs.readFileSync(path.resolve(battleRoot, 'content', 'packs', 'user', 'iris-seven-south-pack.json'), 'utf8'));
        battleModules.content.importContentPack(pack, { allowOverwrite: true });

        const attacker = {
            id: 'amp-attacker',
            name: 'Amp Attacker',
            level: 1,
            maxHp: 50,
            sp: 0,
            speedRange: [2, 2],
            staggerThresholds: [],
            resistances: {
                physical: { slash: 1, pierce: 1, blunt: 1 },
                sin: { wrath: 1, lust: 1, sloth: 1, gluttony: 1, gloom: 1, pride: 1, envy: 1 },
            },
            sprites: { idle: 'assets/test.png', skills: {} },
            skills: [{
                id: 'amp-hit',
                name: 'Amp Hit',
                skillType: 'attack',
                basePower: 1,
                coinPower: 0,
                coinCount: 1,
                damageType: 'slash',
                sinType: 'wrath',
                effects: [{
                    trigger: 'onHit',
                    type: 'amplitudeConvert',
                    fromStatusId: 'tremor',
                    toStatusId: 'tremor_gnaw',
                }],
            }],
            passives: [],
        };
        const defender = JSON.parse(JSON.stringify(battleModules.content.getUnitDefinition('iris-test-enemy')));

        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const battleDefinition = {
            id: 'iris-amplitude-convert-test',
            name: 'Iris Amplitude Convert Test',
            playerUnits: [attacker],
            enemyUnits: [defender],
            rules: {
                encounterType: 'focused',
                maxTurns: 1,
                victoryCondition: 'defeat-all-enemies',
                failureCondition: 'all-allies-defeated',
                enemyAiProfile: { skill: 'first', target: 'firstLiving' },
            },
        };

        const forcedTokens = { 'player-slot-1': [true], 'enemy-slot-1': [false] };
        const peekRollToken = (slotId) => forcedTokens[slotId]?.[0];
        const consumeRollToken = (slotId) => forcedTokens[slotId]?.shift();

        const engine = battleModules.createBattleEngine({ battleDefinition, clamp, peekRollToken, consumeRollToken });
        engine.addStatus('enemy', { id: 'tremor', potency: 5, count: 2 }, 0);
        engine.selectSlot('player-slot-1');
        engine.selectSkill('amp-hit');
        engine.selectTarget('enemy-slot-1');
        engine.resolveTurn();

        const enemy = engine.getState().enemyUnits[0];
        const gnaw = enemy.statuses.find((status) => status.id === 'tremor_gnaw');
        assert(gnaw, 'Expected tremor_gnaw after amplitude conversion.');
        assert(!enemy.statuses.some((status) => status.id === 'tremor'), 'Expected tremor to be cleared.');
        assert(gnaw.potency === 5 && gnaw.count === 2, `Expected gnaw potency/count preserved, got ${gnaw.potency}/${gnaw.count}.`);
    });

    test('Combat sounds: event mapping and attack hit picks', () => {
        const battleRoot = path.resolve(__dirname, '..');
        clearRequireCache(battleRoot);
        global.window = {};
        require(path.resolve(battleRoot, 'audio/combatSounds.js'));

        const combatSounds = global.window.EchoesOfTheCityCombatSounds;
        assert(combatSounds?.getEngagementBarTitle({ engagementType: 'clash' }) === 'CLASH', 'Expected clash title.');
        assert(combatSounds?.getEngagementBarTitle({ engagementType: 'one-sided' }) === 'ATTACK', 'Expected attack title.');

        const bluntSounds = new Set(['blowStab', 'blowHori', 'blowVert']);
        const slashSounds = new Set(['swordStab', 'swordHori', 'swordVert']);
        for (let index = 0; index < 12; index += 1) {
            const bluntPick = combatSounds.pickAttackHitSound('blunt');
            assert(bluntSounds.has(bluntPick), `Expected blunt attack sound, got ${bluntPick}.`);
            const slashPick = combatSounds.pickAttackHitSound('slash');
            assert(slashSounds.has(slashPick), `Expected slash attack sound, got ${slashPick}.`);
            const piercePick = combatSounds.pickAttackHitSound('pierce');
            assert(slashSounds.has(piercePick), `Expected pierce attack sound, got ${piercePick}.`);
        }

        assert(
            combatSounds.getSoundForBattleEvent({
                type: 'status_triggered',
                data: { statusId: 'evade', evadePower: 12 },
            }) === 'defenseEvasion',
            'Expected evade sound.',
        );
        assert(
            combatSounds.getSoundForBattleEvent({
                type: 'status_triggered',
                data: { statusId: 'bleed', damage: 3 },
            }) === 'effectBleeding',
            'Expected bleed sound.',
        );
        assert(
            combatSounds.getSoundForBattleEvent({
                type: 'status_triggered',
                data: { statusId: 'burn', damage: 2 },
            }) === 'effectBurn',
            'Expected burn sound.',
        );
        assert(
            combatSounds.getSoundForBattleEvent({
                type: 'status_triggered',
                data: { statusId: 'bleed', damage: 0 },
            }) === null,
            'Expected no bleed sound when damage is zero.',
        );
        assert(
            combatSounds.getSoundForBattleEvent({ type: 'unit_staggered', data: { unitName: 'Ally' } }) === 'stagger',
            'Expected stagger sound.',
        );
        assert(
            combatSounds.getSoundForBattleEvent({ type: 'unit_defeated', data: { unitName: 'Enemy' } }) === 'unitDeath',
            'Expected unit death sound.',
        );
        assert(combatSounds.countCoinFlipsInRound({
            leftFlips: [true, false, true],
            rightFlips: 'H T',
        }) === 5, 'Expected five coin flips in round.');
        assert(combatSounds.countCoinFlips('H H T') === 3, 'Expected three formatted coin flips.');
    });

    process.stdout.write(`\nResult: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runSuite();
