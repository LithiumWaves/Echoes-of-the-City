(() => {
    const battleModules = window.EchoesOfTheCityBattleModules || (window.EchoesOfTheCityBattleModules = {});

    const LC_BATTLE_UI_ASSETS = {
        dashboardBackplate: 'assets/combat/ui/dashboard_backplate.png',
        gearColumnLeft: 'assets/combat/ui/gear_column_left.png',
        gearColumnRight: 'assets/combat/ui/gear_column_right.png',
        topHudPlate: 'assets/combat/ui/top_hud_plate.png',
        danteClockFace: 'assets/combat/ui/dante_clock_face.png',
        startButton: 'assets/combat/ui/start_button.png',
        unitBase: 'assets/combat/ui/unit_base.png',
        speedHexFrame: 'assets/combat/ui/speed_hex_frame.png',
        enemyHpBarBg: 'assets/combat/ui/enemy_hp_bar_bg.png',
        sinRailFrame: 'assets/combat/ui/sin_rail_frame.png',
    };

    function resolveAssetStyle(assetPath, resolveAssetUrl, escapeAttribute) {
        if (!assetPath || typeof resolveAssetUrl !== 'function') {
            return '';
        }
        const url = resolveAssetUrl(assetPath);
        if (!url) {
            return '';
        }
        const safe = typeof escapeAttribute === 'function' ? escapeAttribute(url) : String(url);
        return `background-image:url('${safe}');`;
    }

    function renderBackplateLayer(options = {}) {
        const {
            className = 'echoes-lc-backplate',
            assetPath = '',
            resolveAssetUrl = null,
            escapeAttribute = (value) => String(value),
            ariaHidden = true,
        } = options;
        const style = resolveAssetStyle(assetPath, resolveAssetUrl, escapeAttribute);
        return `
            <div
                class="${className}${style ? ' has-image' : ''}"
                ${style ? `style="${style}"` : ''}
                ${ariaHidden ? 'aria-hidden="true"' : ''}
            ></div>
        `;
    }

    function renderBrassCounter(label, value, options = {}) {
        const {
            escapeHtml = (value) => String(value),
            modifier = '',
            subValue = '',
        } = options;
        return `
            <div class="echoes-lc-brass-counter${modifier ? ` ${modifier}` : ''}">
                <span class="echoes-lc-brass-counter__label">${escapeHtml(label)}</span>
                <strong class="echoes-lc-brass-counter__value">${escapeHtml(value)}</strong>
                ${subValue ? `<span class="echoes-lc-brass-counter__sub">${escapeHtml(subValue)}</span>` : ''}
            </div>
        `;
    }

    function renderLcButton(label, action, options = {}) {
        const {
            escapeHtml = (value) => String(value),
            modifier = '',
            disabled = false,
            title = '',
        } = options;
        const titleAttr = title ? ` title="${escapeHtml(title)}"` : '';
        return `
            <button
                class="echoes-lc-chrome-button${modifier ? ` ${modifier}` : ''}"
                type="button"
                data-action="${escapeHtml(action)}"
                ${disabled ? 'disabled' : ''}
                ${titleAttr}
            >${escapeHtml(label)}</button>
        `;
    }

    function renderSinChip(sinType, count, color, escapeHtml) {
        return `
            <div class="echoes-lc-sin-chip" style="--echoes-lc-sin-color:${color}">
                <span class="echoes-lc-sin-chip__droplet" aria-hidden="true"></span>
                <span class="echoes-lc-sin-chip__count">${escapeHtml(String(count))}</span>
            </div>
        `;
    }

    const lcChrome = {
        LC_BATTLE_UI_ASSETS,
        resolveAssetStyle,
        renderBackplateLayer,
        renderBrassCounter,
        renderLcButton,
        renderSinChip,
    };

    battleModules.lcChrome = lcChrome;
    window.EchoesOfTheCityLcChrome = lcChrome;
})();
