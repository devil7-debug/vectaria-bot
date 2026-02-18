const http = require('http');
const puppeteer = require('puppeteer');

// 1. THE "HEARTBEAT" SERVER (Tricks Render into staying active)
http.createServer((req, res) => {
  res.write('Vectaria RLGL Bot: Online and Judging.');
  res.end();
}).listen(process.env.PORT || 8080);

async function startBot() {
    console.log("Launching Headless Browser...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Memory fix for Render
            '--disable-gpu',           // CPU fix for Render
            '--no-first-run',
            '--no-zygote',
            '--single-process'         // Keeps RAM usage low
        ]
    });

    const page = await browser.newPage();
    
    // Set a user agent so the game doesn't block the bot
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36');

    await page.goto('https://vectaria.io/', { waitUntil: 'networkidle2', timeout: 60000 });

    console.log("Injecting Red Light Green Light Logic...");

    await page.evaluate(() => {
        // --- CONFIGURATION ---
        const OWNER_NAME = "devilfox"; // <--- CHANGE THIS TO YOUR NAME!
        const REWARD_AMOUNT = 50; 
        
        const ClientKeys = { CHAT: 0, TIME_STEP: 59, ACTION_WITH_PLAYER: 11, ANNOUNCE: 72, COIN_TRANSFER: 62 };
        const ServerKeys = { CHAT: 1, NEW_PLAYER: 4, PLAYERS_TIME_STEP_INFO: 31, PLAYER_LEFT: 12 };

        const checkReady = setInterval(() => {
            try {
                const gameWorld = app.__vue_app__.config.globalProperties.$pinia._s.get("gameState").gameWorld;
                if (gameWorld && gameWorld.server) {
                    clearInterval(checkReady);
                    
                    const server = gameWorld.server;
                    const listeners = {};
                    server.msgsListeners = {
                        [38]: (data) => {
                            for (let i = 0; i < data.length; i += 2) {
                                if (listeners[data[i]]) listeners[data[i]].forEach((fx) => fx(data[i + 1]));
                            }
                        }
                    };

                    const ws = {
                        on: (key, fx) => {
                            if (!listeners[key]) listeners[key] = [];
                            listeners[key].push(fx);
                        },
                        send: (key, data) => server.ws.send(JSON.stringify({ key, data }))
                    };

                    let gameActive = false;
                    let isRedLight = false;
                    let players = {};

                    ws.on(ServerKeys.NEW_PLAYER, (d) => {
                        players[d.id] = { id: d.id, name: d.name, pos: d.pos, lastPos: d.pos };
                    });

                    ws.on(ServerKeys.PLAYERS_TIME_STEP_INFO, (data) => {
                        if (!gameActive || !isRedLight) return;
                        for (let upd of data) {
                            let p = players[upd.i];
                            if (p && upd.p) {
                                const dist = Math.sqrt(Math.pow(upd.p[0]-p.lastPos[0],2) + Math.pow(upd.p[2]-p.lastPos[2],2));
                                if (dist > 0.2) {
                                    ws.send(ClientKeys.ANNOUNCE, { text: `${p.name.toUpperCase()} ELIMINATED!`, color: "#ff0000" });
                                    ws.send(ClientKeys.ACTION_WITH_PLAYER, { id: p.id, type: 9, xyz: [0, 20, 0] });
                                }
                                p.lastPos = upd.p;
                            }
                        }
                    });

                    ws.on(ServerKeys.CHAT, (data) => {
                        if (data.name !== OWNER_NAME) return;
                        if (data.msg === ",start") { gameActive = true; runLoop(); }
                        if (data.msg === ",stop") { gameActive = false; ws.send(ClientKeys.ANNOUNCE, { text: "GAME STOPPED", color: "#ffffff" }); }
                    });

                    async function runLoop() {
                        if (!gameActive) return;
                        isRedLight = false;
                        ws.send(ClientKeys.ANNOUNCE, { text: "GREEN LIGHT!", color: "#00ff00" });
                        await new Promise(r => setTimeout(r, 4000 + Math.random() * 3000));
                        
                        if (!gameActive) return;
                        isRedLight = true;
                        ws.send(ClientKeys.ANNOUNCE, { text: "RED LIGHT!", color: "#ff0000" });
                        await new Promise(r => setTimeout(r, 3000));
                        runLoop();
                    }

                    // ANTI-AFK: Tell server bot is still here
                    setInterval(() => {
                        ws.send(ClientKeys.TIME_STEP, [ClientKeys.TIME_STEP_INFO, { p: [0,0,0] }]);
                    }, 1000);
                }
            } catch (e) {}
        }, 2000);
    });
}

startBot();

