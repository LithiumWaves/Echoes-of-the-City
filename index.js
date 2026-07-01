(() => {
    const EXTENSION_ID = 'echoes-of-the-city';
    const BUTTON_ID = `${EXTENSION_ID}-battle-launcher`;
    const WINDOW_NAME = 'echoes-of-the-city-battle-window';

    let battleWindow = null;

    function getBattleWindowMarkup() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Echoes of the City - Battle</title>
    <style>
        :root {
            color-scheme: dark;
            --bg: #090c14;
            --panel: rgba(14, 20, 34, 0.92);
            --panel-border: rgba(255, 255, 255, 0.08);
            --panel-strong: rgba(102, 159, 255, 0.28);
            --text: #f4f6fb;
            --muted: #9ca8bf;
            --accent: #8bb8ff;
            --accent-strong: #4d7bff;
            --warning: #ffd479;
            --shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
        }

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, "Segoe UI", sans-serif;
            color: var(--text);
            background:
                radial-gradient(circle at top, rgba(77, 123, 255, 0.18), transparent 34%),
                linear-gradient(180deg, #0c1020 0%, #080b13 100%);
        }

        .battle-shell {
            display: grid;
            grid-template-rows: auto auto 1fr;
            min-height: 100vh;
        }

        .battle-header {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            align-items: center;
            padding: 1.5rem 2rem 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(6, 9, 16, 0.82);
            backdrop-filter: blur(12px);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .battle-title {
            display: flex;
            flex-direction: column;
            gap: 0.35rem;
        }

        .battle-title h1 {
            margin: 0;
            font-size: 1.5rem;
            letter-spacing: 0.06em;
            text-transform: uppercase;
        }

        .battle-title p,
        .battle-status,
        .panel-subtitle,
        .empty-state {
            margin: 0;
            color: var(--muted);
        }

        .battle-actions {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            flex-wrap: wrap;
        }

        .battle-pill,
        .battle-button {
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.05);
            color: var(--text);
            border-radius: 999px;
            padding: 0.7rem 1rem;
            font-size: 0.9rem;
        }

        .battle-button {
            cursor: pointer;
            transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .battle-button:hover {
            transform: translateY(-1px);
            border-color: var(--panel-strong);
            background: rgba(77, 123, 255, 0.16);
        }

        .battle-banner {
            margin: 1.25rem 2rem 0;
            padding: 1rem 1.2rem;
            border-left: 3px solid var(--warning);
            background: rgba(255, 212, 121, 0.08);
            color: #f7e3b6;
            border-radius: 0.8rem;
        }

        .battle-layout {
            display: grid;
            grid-template-columns: minmax(280px, 1.1fr) minmax(380px, 1.4fr) minmax(280px, 1fr);
            gap: 1.25rem;
            padding: 1.25rem 2rem 2rem;
        }

        .battle-column {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
            min-height: 0;
        }

        .panel {
            background: var(--panel);
            border: 1px solid var(--panel-border);
            border-radius: 1rem;
            box-shadow: var(--shadow);
            overflow: hidden;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 1rem;
            padding: 1rem 1.1rem 0.75rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .panel-header h2 {
            margin: 0;
            font-size: 1rem;
            letter-spacing: 0.05em;
            text-transform: uppercase;
        }

        .panel-content {
            padding: 1rem 1.1rem 1.1rem;
        }

        .slot-list,
        .log-list {
            display: grid;
            gap: 0.85rem;
        }

        .unit-card,
        .queue-card,
        .log-item {
            border: 1px solid rgba(255, 255, 255, 0.08);
            background: rgba(255, 255, 255, 0.03);
            border-radius: 0.9rem;
            padding: 0.95rem;
        }

        .unit-card strong,
        .queue-card strong,
        .log-item strong {
            display: block;
            margin-bottom: 0.35rem;
            font-size: 0.97rem;
        }

        .unit-meta,
        .queue-meta {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            color: var(--muted);
            font-size: 0.87rem;
        }

        .arena {
            display: grid;
            gap: 1rem;
        }

        .arena-track {
            min-height: 360px;
            border-radius: 1rem;
            border: 1px dashed rgba(139, 184, 255, 0.24);
            background:
                linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.01)),
                radial-gradient(circle at center, rgba(77, 123, 255, 0.14), transparent 55%);
            padding: 1rem;
            display: grid;
            place-items: center;
            text-align: center;
        }

        .arena-clash {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 1rem;
            align-items: center;
        }

        .clash-card {
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 1rem;
            background: rgba(255, 255, 255, 0.04);
            padding: 1rem;
        }

        .clash-versus {
            font-size: 1.1rem;
            letter-spacing: 0.12em;
            color: var(--accent);
        }

        .empty-state {
            line-height: 1.6;
        }

        @media (max-width: 1180px) {
            .battle-layout {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="battle-shell">
        <header class="battle-header">
            <div class="battle-title">
                <h1>Echoes of the City</h1>
                <p>Limbus-inspired battle scene scaffold for future custom combat systems.</p>
            </div>
            <div class="battle-actions">
                <span class="battle-pill">Window Prototype</span>
                <button class="battle-button" type="button" onclick="window.close()">Close</button>
            </div>
        </header>

        <section class="battle-banner">
            This is the dedicated battle window. Units, attacks, clashes, speed dice, passives, effects,
            and fully custom rules can be layered onto this scaffold next.
        </section>

        <main class="battle-layout">
            <div class="battle-column">
                <section class="panel">
                    <div class="panel-header">
                        <h2>Player Units</h2>
                        <span class="panel-subtitle">6 slots</span>
                    </div>
                    <div class="panel-content slot-list">
                        <article class="unit-card">
                            <strong>Slot 01</strong>
                            <div class="unit-meta">
                                <span>No unit loaded</span>
                                <span>Speed -</span>
                            </div>
                        </article>
                        <article class="unit-card">
                            <strong>Slot 02</strong>
                            <div class="unit-meta">
                                <span>No unit loaded</span>
                                <span>Speed -</span>
                            </div>
                        </article>
                        <article class="unit-card">
                            <strong>Slot 03</strong>
                            <div class="unit-meta">
                                <span>No unit loaded</span>
                                <span>Speed -</span>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-header">
                        <h2>Action Queue</h2>
                        <span class="panel-subtitle">Turn order</span>
                    </div>
                    <div class="panel-content slot-list">
                        <article class="queue-card">
                            <strong>No actions queued</strong>
                            <div class="queue-meta">
                                <span>Awaiting combat data</span>
                                <span>Turn 1</span>
                            </div>
                        </article>
                    </div>
                </section>
            </div>

            <div class="battle-column">
                <section class="panel">
                    <div class="panel-header">
                        <h2>Combat Arena</h2>
                        <span class="panel-subtitle">Clashes and animations</span>
                    </div>
                    <div class="panel-content arena">
                        <div class="arena-track">
                            <p class="empty-state">
                                The main battle canvas will go here.<br />
                                Use this space later for unit sprites, timeline movement, clash resolution, and VFX.
                            </p>
                        </div>
                        <div class="arena-clash">
                            <article class="clash-card">
                                <strong>Left Side</strong>
                                <p class="empty-state">Selected unit and current skill preview.</p>
                            </article>
                            <div class="clash-versus">VS</div>
                            <article class="clash-card">
                                <strong>Right Side</strong>
                                <p class="empty-state">Opponent preview and clash forecast.</p>
                            </article>
                        </div>
                    </div>
                </section>
            </div>

            <div class="battle-column">
                <section class="panel">
                    <div class="panel-header">
                        <h2>Enemy Units</h2>
                        <span class="panel-subtitle">Custom roster</span>
                    </div>
                    <div class="panel-content slot-list">
                        <article class="unit-card">
                            <strong>Enemy 01</strong>
                            <div class="unit-meta">
                                <span>No unit loaded</span>
                                <span>HP -</span>
                            </div>
                        </article>
                        <article class="unit-card">
                            <strong>Enemy 02</strong>
                            <div class="unit-meta">
                                <span>No unit loaded</span>
                                <span>HP -</span>
                            </div>
                        </article>
                    </div>
                </section>

                <section class="panel">
                    <div class="panel-header">
                        <h2>Battle Log</h2>
                        <span class="panel-subtitle">Event feed</span>
                    </div>
                    <div class="panel-content log-list">
                        <article class="log-item">
                            <strong>Window Ready</strong>
                            <p class="empty-state">The battle UI shell loaded successfully and is waiting for data sources.</p>
                        </article>
                        <article class="log-item">
                            <strong>Next Step</strong>
                            <p class="empty-state">Hook this window to unit definitions, attack definitions, and combat state.</p>
                        </article>
                    </div>
                </section>
            </div>
        </main>
    </div>
</body>
</html>`;
    }

    function openBattleWindow() {
        if (battleWindow && !battleWindow.closed) {
            battleWindow.focus();
            return battleWindow;
        }

        battleWindow = window.open('', WINDOW_NAME, 'popup=yes,width=1500,height=920,resizable=yes,scrollbars=yes');

        if (!battleWindow) {
            console.warn('Echoes of the City: battle window was blocked by the browser.');
            return null;
        }

        battleWindow.document.open();
        battleWindow.document.write(getBattleWindowMarkup());
        battleWindow.document.close();
        battleWindow.focus();

        return battleWindow;
    }

    function createBattleLauncher() {
        if (!document.body || document.getElementById(BUTTON_ID)) {
            return;
        }

        const button = document.createElement('button');
        button.id = BUTTON_ID;
        button.type = 'button';
        button.className = 'echoes-battle-launcher';
        button.title = 'Open the Echoes of the City battle window';
        button.setAttribute('aria-label', 'Open battle window');
        button.innerHTML = `
            <span class="echoes-battle-launcher__label">Battle</span>
            <span class="echoes-battle-launcher__tag">Prototype</span>
        `;
        button.addEventListener('click', openBattleWindow);

        document.body.appendChild(button);
    }

    function initialize() {
        createBattleLauncher();
        window.EchoesOfTheCity = {
            openBattleWindow,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
        initialize();
    }
})();
