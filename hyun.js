const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// ===== DATA =====
let allServers = [];
let ripIndraServers = new Map(); // jobId -> timestamp

// ===== FETCH SERVERS (REAL ROBLOX API) =====
async function fetchServers() {
    try {
        console.log('🔄 Fetching Roblox servers...');
        const response = await axios.get(
            'https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100',
            { timeout: 10000 }
        );
        
        allServers = response.data.data
            .filter(server => server.playing > 0 && server.playing < 15)
            .sort((a, b) => a.playing - b.playing);
            
        console.log(`✅ Loaded ${allServers.length} servers (low player priority)`);
    } catch (error) {
        console.error('❌ Server fetch failed:', error.message);
        allServers = []; // Reset on fail
    }
}

// ===== API ENDPOINTS =====
// RIP INDRAS - Real JSON response
app.get('/api/rip-indra', (req, res) => {
    const now = Date.now();
    const activeServers = [];
    
    // Filter active RIP INDRAS (5 min timeout)
    for (let [jobId, timestamp] of ripIndraServers) {
        if (now - timestamp < 300000) {
            const server = allServers.find(s => s.id === jobId);
            if (server) {
                activeServers.push({
                    jobId: server.id,
                    name: server.name || 'Low Player Server',
                    players: server.playing,
                    maxPlayers: server.maxPlayers || 12,
                    ping: server.ping || 999,
                    fps: server.fps || 60
                });
            }
        }
    }
    
    res.json({
        status: activeServers.length > 0 ? 'success' : 'empty',
        count: activeServers.length,
        servers: activeServers,
        totalServers: allServers.length,
        lastUpdate: new Date().toISOString(),
        cacheSize: ripIndraServers.size
    });
});

// Report RIP INDRAS spawn
app.post('/api/boss-spawned', (req, res) => {
    try {
        const { boss, jobId, players } = req.body;
        
        if (boss === 'Rip Indra') {
            ripIndraServers.set(jobId, Date.now());
            console.log(`🔔 RIP INDRAS DETECTED → ${jobId} (${players || '?'} players)`);
            
            // Auto cleanup after 5 minutes
            setTimeout(() => {
                ripIndraServers.delete(jobId);
                console.log(`🧹 Cleanup: ${jobId}`);
            }, 300000);
        }
        
        res.json({ success: true, timestamp: Date.now() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// All servers (debug)
app.get('/api/servers', (req, res) => {
    res.json({
        count: allServers.length,
        servers: allServers.slice(0, 20).map(s => ({
            id: s.id,
            name: s.name,
            playing: s.playing
        }))
    });
});

// Debug info
app.get('/api/debug', (req, res) => {
    res.json({
        uptime: Math.floor(process.uptime()),
        ripIndraActive: ripIndraServers.size,
        totalServers: allServers.length,
        memory: process.memoryUsage()
    });
});

// ===== WEB UI (SINGLE PAGE) =====
app.get('/', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RIP INDRAS Hopper API</title>
    <style>
        *{margin:0;padding:0;box-sizing:border-box;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;}
        body{background:linear-gradient(135deg,#1e3c72,#2a5298);color:#fff;min-height:100vh;padding:20px;overflow-x:hidden;}
        .container{max-width:900px;margin:0 auto;background:rgba(0,0,0,0.85);border-radius:20px;padding:30px;box-shadow:0 20px 40px rgba(0,0,0,0.5);}
        h1{text-align:center;font-size:2.8em;margin-bottom:10px;background:linear-gradient(45deg,#ff6b6b,#4ecdc4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .subtitle{text-align:center;font-size:1.1em;color:#ccc;margin-bottom:30px;}
        .api-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px;margin:30px 0;}
        .api-card{background:linear-gradient(135deg,rgba(255,107,107,0.2),rgba(254,202,87,0.2));border-radius:15px;padding:25px;border:1px solid rgba(255,255,255,0.1);transition:transform 0.3s;}
        .api-card:hover{transform:translateY(-5px);}
        .endpoint{font-size:1.4em;font-weight:bold;margin-bottom:10px;color:#4ecdc4;}
        .method{background:#4ecdc4;color:#1a1a1a;padding:5px 12px;border-radius:20px;font-size:0.9em;font-weight:bold;margin-right:10px;}
        .response{background:#2d2d3a;color:#ccc;padding:15px;border-radius:10px;margin-top:15px;font-family:monospace;font-size:0.85em;max-height:200px;overflow:auto;}
        .status{display:flex;align-items:center;gap:10px;font-weight:bold;padding:15px;border-radius:10px;margin:20px 0;}
        .success{background:rgba(100,255,100,0.2);border:1px solid #4caf50;color:#4caf50;}
        .empty{background:rgba(255,193,7,0.2);border:1px solid #ff9800;color:#ff9800;}
        .error{background:rgba(244,67,54,0.2);border:1px solid #f44336;color:#f44336;}
        .scan-btn{display:block;width:100%;padding:20px;font-size:1.5em;background:linear-gradient(45deg,#ff6b6b,#feca57);color:white;border:none;border-radius:50px;cursor:pointer;font-weight:bold;transition:all 0.3s;margin:20px 0;box-shadow:0 10px 30px rgba(255,107,107,0.4);}
        .scan-btn:hover{transform:scale(1.05);box-shadow:0 15px 40px rgba(255,107,107,0.6);}
        @media(max-width:768px){.container{padding:20px;margin:10px;border-radius:15px;}}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 RIP INDRAS HOPPER</h1>
        <p class="subtitle">Real-time Roblox server scanner | Auto JSON API</p>
        
        <button class="scan-btn" onclick="testAPI()">🧪 TEST API NOW</button>
        
        <div class="status empty" id="statusDiv">
            <span>⏳</span> Click TEST to scan RIP INDRAS servers
        </div>
        
        <div class="api-grid">
            <div class="api-card">
                <div class="endpoint">GET <span class="method">/api/rip-indra</span></div>
                <p>Real-time RIP INDRAS servers (Job ID + Players)</p>
                <div class="response" id="ripIndraResponse">{ "status": "empty", "count": 0, "servers": [] }</div>
            </div>
            <div class="api-card">
                <div class="endpoint">POST <span class="method">/api/boss-spawned</span></div>
                <p>Report RIP INDRAS spawn (Server scripts)</p>
                <div class="response">{ "boss": "Rip Indra", "jobId": "abc-123-def456" }</div>
            </div>
        </div>
        
        <div style="text-align:center;margin-top:30px;font-size:0.9em;color:#aaa;">
            <p>📡 Last update: <span id="lastUpdate">--</span></p>
            <p>🚀 <a href="/api/debug" style="color:#4ecdc4;" target="_blank">Debug</a> | 
               <a href="/api/servers" style="color:#4ecdc4;" target="_blank">Servers</a></p>
        </div>
    </div>

    <script>
        async function testAPI(){
            const btn = document.querySelector('.scan-btn');
            const status = document.getElementById('statusDiv');
            const responseDiv = document.getElementById('ripIndraResponse');
            const lastUpdate = document.getElementById('lastUpdate');
            
            btn.textContent = '⏳ Scanning...';
            status.innerHTML = '<span>🔄</span> Fetching real Roblox servers...';
            status.className = 'status';
            
            try{
                const res = await fetch('/api/rip-indra');
                const data = await res.json();
                
                responseDiv.textContent = JSON.stringify(data, null, 2);
                lastUpdate.textContent = new Date().toLocaleString();
                
                if(data.status === 'success'){
                    status.innerHTML = '<span>✅</span> ' + data.count + ' RIP INDRAS found!';
                    status.className = 'status success';
                }else{
                    status.innerHTML = '<span>⏳</span> No active RIP INDRAS (' + data.totalServers + ' servers scanned)';
                    status.className = 'status empty';
                }
            }catch(error){
                status.innerHTML = '<span>❌</span> Network error: ' + error.message;
                status.className = 'status error';
            }
            
            btn.textContent = '✅ SCAN AGAIN';
            setTimeout(testAPI, 30000); // Auto scan 30s
        }
        
        // Initial load
        testAPI();
    </script>
</body>
</html>`);
});

// ===== 404 HANDLER =====
app.use((req, res) => {
    res.redirect('/');
});

// ===== STARTUP =====
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(50));
    console.log(`🚀 RIP INDRAS API + UI LIVE`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📡 /api/rip-indra → JSON endpoints`);
    console.log(`🖥️  / → Web dashboard`);
    console.log('='.repeat(50));
    
    // Initial fetch
    fetchServers();
    setInterval(fetchServers, 15000); // Every 15s
});
