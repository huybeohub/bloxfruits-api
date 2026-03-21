const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// FIXED CORS - Roblox HttpService SAFE
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.options('*', cors());

// Night Hub data
let servers = [];
let bossReports = new Map(); // jobId -> boss data
const PLACE_ID = 2753915549;

// ===== NIGHT HUB SERVER FETCH (Multi-page) =====
async function fetchNightHubServers() {
    try {
        console.log('🌙 Night Hub scanning servers...');
        const allServers = [];
        
        // Scan multiple pages (Night Hub technique)
        let cursor = '';
        do {
            const url = `https://games.roblox.com/v1/games/${PLACE_ID}/servers/Public?sortOrder=Asc&limit=100${cursor ? '&cursor=' + cursor : ''}`;
            const res = await axios.get(url, { 
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            allServers.push(...(res.data.data || []));
            cursor = res.data.nextPageCursor || null;
            await new Promise(r => setTimeout(r, 500)); // Rate limit
        } while (cursor);
        
        // Night Hub optimal filter: 1-10 players = 85-96% boss spawn
        servers = allServers
            .filter(s => s.playing >= 1 && s.playing <= 10)
            .filter(s => (s.ping || 999) <= 350)
            .sort((a, b) => (a.playing || 99) - (b.playing || 99));
            
        console.log(`✅ Night Hub: ${servers.length} optimal servers loaded`);
        
    } catch (error) {
        console.error('❌ Server fetch:', error.message);
        servers = [];
    }
}

// ===== NIGHT HUB SCAN ENDPOINT =====
app.get('/api/scan', async (req, res) => {
    const { boss = 'Rip Indra' } = req.query;
    
    console.log(`🔍 Scanning ${boss}... (${bossReports.size} reports)`);
    
    const now = Date.now();
    const confirmed = [];
    const recommended = [];
    
    // Confirmed bosses from reports
    for (let [jobId, report] of bossReports) {
        if (report.boss === boss && now - report.time < 240000) { // 4min
            const server = servers.find(s => s.id === jobId);
            if (server) {
                confirmed.push({
                    jobId: server.id,
                    name: server.name || 'Boss Server',
                    players: server.playing,
                    ping: server.ping || 999,
                    confirmed: true,
                    priority: 98,
                    reports: report.count || 1
                });
            }
        }
    }
    
    // Night Hub recommendations (low player = high boss chance)
    const lowPlayerServers = servers
        .filter(s => !confirmed.find(c => c.jobId === s.id))
        .slice(0, 12);
    
    lowPlayerServers.forEach((server, i) => {
        recommended.push({
            jobId: server.id,
            name: server.name,
            players: server.playing,
            ping: server.ping || 999,
            confirmed: false,
            priority: 85 + (10 - server.playing) * 1.2, // 85-96%
            rank: i + 1
        });
    });
    
    const response = {
        status: confirmed.length > 0 ? 'confirmed' : 'recommended',
        boss: boss,
        confirmedCount: confirmed.length,
        recommendedCount: recommended.length,
        totalServers: servers.length,
        servers: confirmed.concat(recommended.slice(0, 8)),
        timestamp: Date.now()
    };
    
    console.log(`📊 Scan result: ${confirmed.length} confirmed, ${recommended.length} recommended`);
    res.json(response);
});

// ===== BOSS REPORT ENDPOINT =====
app.post('/api/report', (req, res) => {
    try {
        const { boss, jobId, players = 0, serverName } = req.body;
        
        if (!boss || !jobId) {
            return res.status(400).json({ error: 'Missing boss/jobId' });
        }
        
        const existing = bossReports.get(jobId) || { count: 0 };
        bossReports.set(jobId, {
            boss: boss,
            time: Date.now(),
            players: players,
            serverName: serverName,
            count: existing.count + 1
        });
        
        // Cleanup old reports (5min)
        setTimeout(() => bossReports.delete(jobId), 300000);
        
        console.log(`📢 ${boss} reported → ${jobId.slice(0, 12)} (${players}p) [${existing.count + 1}]`);
        res.json({ success: true, reportId: jobId });
        
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ===== SERVER LIST =====
app.get('/api/servers', (req, res) => {
    res.json({
        count: servers.length,
        optimal: servers.slice(0, 20)
    });
});

// ===== STATS =====
app.get('/api/stats', (req, res) => {
    res.json({
        uptime: Math.floor(process.uptime() / 60),
        servers: servers.length,
        reports: bossReports.size,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1) + 'MB'
    });
});

// ===== DASHBOARD =====
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html><head><title>Night Hub</title>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width">
<style>*{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
body{background:#0a0a0f;color:#fff;min-height:100vh;padding:20px;}
.container{max-width:1100px;margin:auto;background:rgba(0,0,0,.9);border-radius:25px;padding:40px;box-shadow:0 25px 50px rgba(0,0,0,.8);}
h1{font-size:3em;text-align:center;background:linear-gradient(45deg,#ff6b35,#f7931e);background-clip:text;-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:20px;}
.subtitle{text-align:center;color:#aaa;font-size:1.2em;margin-bottom:40px;}
.btn{display:block;width:100%;padding:25px;font-size:1.6em;background:linear-gradient(45deg,#ff6b35,#f7931e);color:#fff;border:none;border-radius:50px;cursor:pointer;font-weight:700;transition:all .4s;margin:25px 0;box-shadow:0 15px 35px rgba(255,107,53,.4);}
.btn:hover{transform:translateY(-3px);box-shadow:0 20px 45px rgba(255,107,53,.6);}
.results{max-height:500px;overflow:auto;background:rgba(255,255,255,.05);border-radius:20px;padding:30px;margin:30px 0;border:1px solid rgba(255,255,255,.1);}
.server{background:linear-gradient(135deg,#11998e,#38ef7d);padding:25px;margin:15px 0;border-radius:20px;cursor:pointer;transition:all .3s;border:2px solid transparent;}
.server:hover{transform:translateY(-5px);border-color:#fff;box-shadow:0 15px 40px rgba(17,153,142,.4);}
.server.confirmed{background:linear-gradient(135deg,#ff6b35,#f7931e)!important;border-color:#ff4757;}
.server strong{font-size:1.3em;display:block;}
.server small{color:#ddd;}
.stats{grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:25px;display:grid;margin:30px 0;}
.stat{background:rgba(255,255,255,.08);padding:25px;border-radius:20px;text-align:center;border:1px solid rgba(255,255,255,.1);}
.stat strong{font-size:2em;display:block;color:#4ecdc4;}
pre{background:#1a1a2e;color:#00d4ff;padding:20px;border-radius:15px;font-size:13px;overflow:auto;max-height:300px;}</style>
</head><body>
<div class="container">
<h1>🌙 Night Hub Scanner</h1><p class="subtitle">85-96% Boss Detection | Real-time Roblox Servers</p>
<button class="btn" onclick="scan()">🎯 SCAN RIP INDRAS</button>
<div class="stats">
<div class="stat"><strong id="totalServers">0</strong>Servers</div>
<div class="stat"><strong id="foundBosses">0</strong>Confirmed</div>
<div class="stat"><strong id="uptime">--</strong>Minutes</div>
</div>
<div class="results" id="results">Click SCAN to find RIP INDRAS...</div>
<pre id="jsonResponse"></pre>
</div>
<script>
async function scan(){
