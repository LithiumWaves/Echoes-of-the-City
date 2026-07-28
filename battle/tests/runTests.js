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

function createBattleEnvironment() {
    clearRequireCache(battleRoot);
    global.window = {};

    require(path.resolve(battleRoot, 'registry', 'battleRegistry.js'));
    require(path.resolve(battleRoot, 'schema', 'battleSchema.js'));
    require(path.resolve(battleRoot, 'validation', 'battleValidation.js'));
    require(path.resolve(battleRoot, 'content', 'battleContentRegistry.js'));
    require(path.resolve(battleRoot, 'effects', 'skillEffectRunner.js'));
    require(path.resolve(battleRoot, 'core', 'damageFormula.js'));
    require(path.resolve(battleRoot, 'core', 'battleEngine.js'));

    return global.window.EchoesOfTheCityBattleModules;
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

    process.stdout.write(`\nResult: ${passed} passed, ${failed} failed\n`);

    if (failed > 0) {
        process.exitCode = 1;
    }
}

runSuite();
