(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const COMBAT_SOUND_IDS = {
        uiClick: 'uiClick',
        parryAtk: 'parryAtk',
        defenseEvasion: 'defenseEvasion',
        defenseGuard: 'defenseGuard',
        effectBleeding: 'effectBleeding',
        effectBurn: 'effectBurn',
        blowStab: 'blowStab',
        blowHori: 'blowHori',
        blowVert: 'blowVert',
        swordStab: 'swordStab',
        swordHori: 'swordHori',
        swordVert: 'swordVert',
    };

    const BLUNT_ATTACK_SOUNDS = [
        COMBAT_SOUND_IDS.blowStab,
        COMBAT_SOUND_IDS.blowHori,
        COMBAT_SOUND_IDS.blowVert,
    ];

    const SLASH_PIERCE_ATTACK_SOUNDS = [
        COMBAT_SOUND_IDS.swordStab,
        COMBAT_SOUND_IDS.swordHori,
        COMBAT_SOUND_IDS.swordVert,
    ];

    function pickRandomItem(items) {
        if (!items.length) {
            return null;
        }
        return items[Math.floor(Math.random() * items.length)];
    }

    function pickAttackHitSound(damageType) {
        const normalized = String(damageType || '').toLowerCase();
        if (normalized === 'blunt') {
            return pickRandomItem(BLUNT_ATTACK_SOUNDS);
        }
        if (normalized === 'slash' || normalized === 'pierce') {
            return pickRandomItem(SLASH_PIERCE_ATTACK_SOUNDS);
        }
        return pickRandomItem(SLASH_PIERCE_ATTACK_SOUNDS);
    }

    function getSoundForBattleEvent(event) {
        if (!event || typeof event !== 'object') {
            return null;
        }
        const data = event.data && typeof event.data === 'object' ? event.data : {};
        if (event.type === 'status_triggered') {
            if (data.statusId === 'evade' && Number.isFinite(data.evadePower)) {
                return COMBAT_SOUND_IDS.defenseEvasion;
            }
            if (data.statusId === 'bleed' && Number(data.damage) > 0) {
                return COMBAT_SOUND_IDS.effectBleeding;
            }
            if (data.statusId === 'burn' && Number(data.damage) > 0) {
                return COMBAT_SOUND_IDS.effectBurn;
            }
        }
        return null;
    }

    function getEngagementBarTitle(entry) {
        if (!entry) {
            return 'CLASH';
        }
        if (entry.engagementType === 'clash') {
            return 'CLASH';
        }
        if (entry.engagementType === 'one-sided') {
            return 'ATTACK';
        }
        return 'DEFENSE';
    }

    const combatSounds = {
        COMBAT_SOUND_IDS,
        pickAttackHitSound,
        getSoundForBattleEvent,
        getEngagementBarTitle,
    };

    battleModules.combatSounds = combatSounds;
    window.EchoesOfTheCityCombatSounds = combatSounds;
})();
