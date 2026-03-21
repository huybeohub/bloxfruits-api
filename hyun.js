const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let allServers = [];
let ripIndraServers = new Map();

// ===== AUTO FETCH SERVERS =====
async function fetchServers() {
    try {
        const res = await axios.get('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100', {
            timeout: 10000
        });
        allServers = res.data.data.filter(s => s.playing > 0 && s.playing < 15);
        console.log(`📊 Fetched ${allServers.length} servers`);
    } catch(e) {
        console.error('❌ Fetch servers:', e.message);
    }
}

// ===== API ROUTES =====
app.get('/api/rip-indra', (req, res) => {
    const ripServers = [];
    const now = Date.now();
    
    for (let [jobId, info] of ripIndraServers) {
        if (now - info.lastSeen < 300000) { // 5 phút
            const server = allServers.find(s => s.id === jobId);
            if (server) {
                ripServers.push({
                    jobId: server.id,
                    name: server.name || 'Low Player Server',
                    players: server.playing,
                    maxPlayers: server.maxPlayers || 12,
                    ping: server.ping || 999
                });
            }
        } else {
            ripIndraServers.delete(jobId); // Cleanup
        }
    }
    
    res.json({
        status: ripServers.length > 0 ? 'success' : 'empty',
        count: ripServers.length,
        servers: ripServers,
        totalServers: allServers.length,
        lastUpdate: new Date().toISOString()
    });
});

app.post('/api/boss-spawned', (req, res) => {
    const { boss, jobId } = req.body;
    if (boss === 'Rip Indra') {
        ripIndraServers.set(jobId, {
            lastSeen: Date.now(),
            reports: (ripIndraServers.get(jobId)?.reports || 0) + 1
        });
        console.log(`🔔 RIP INDRAS: ${jobId} (${req.body.players || 0}p)`);
    }
    res.json({ success: true });
});

app.get('/api/servers', (req, res) => res.json(allServers.slice(0, 10)));
app.get('/api/debug', (req, res) => res.json({
    ripIndra: ripIndraServers.size,
    total: allServers.length,
    uptime: process.uptime()
}));

// ===== WEB UI (EMBED HTML) =====
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>RIP INDRAS Hopper</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        *{margin:0;padding:0;box-sizing:border-box;}
        body{font-family:Arial,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);color:white;min-height:100vh;padding:20px;}
        .container{max-width:600px;margin:0 auto;background:rgba(0,0,0,0.3);border-radius:20px;padding:30px;}
        h1{text-align:center;font-size:2.5em;margin-bottom:30px;text-shadow:2px 2px 4px rgba(0,0,0,0.5);}
        button{padding:15px 30px;font-size:18px;border:none;border-radius:50px;cursor:pointer;transition:all 0.3s;font-weight:bold;margin:10px;}
        .scan-btn{background:linear-gradient(45deg,#ff6b6b,#feca57);color:white;box-shadow:0 5px 15px rgba(255,107,107,0.4);}
        .scan-btn:hover{transform:scale(1.05);}
        .status{background:rgba(0,0,0,0.4);padding:15px;border-radius:15px;margin:20px 0;text-align:center;font-weight:bold;}
        .server-card{background:linear-gradient(135deg,#ff9a9e,#fecfef);margin:15px 0;padding:20px;border-radius:15px;cursor:pointer;transition:all 0.3s;color:#333;}
        .server-card:hover{transform:translateY(-5px);box-shadow:0 10px 30px rgba(0,0,0,0.3);}
        .server-join{background:#4ecdc4;color:white;padding:10px 20px;border:none;border-radius:25px;cursor:pointer;font-weight:bold;margin-left:10px;}
        .no-servers{text-align:center;color:#ccc;padding:40px;font-style:italic;}
        .info{text-align:center;background:rgba(0,0,0,0.3);padding:15px;border-radius:15px;}
        @keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}
        .scanning{animation:spin 1s linear infinite;}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔥 RIP INDRAS HOPPER</h1>
        <button id="scanBtn" class="scan-btn">🔍 SCAN NOW</button>
        <div class="status" id="status">Click SCAN to start</div>
        <div id="serversContainer">
            <div class="no-servers">No RIP INDRAS found... Scanning...</div>
        </div>
        <div class="info">
            <p id="info">Servers: 0 | Last scan: Never</p>
        </div>
    </div>
    <script>
        const API_URL = '/api';
        async function scanServers(){
            const btn=document.getElementById('scanBtn'),status=document.getElementById('status'),container=document.getElementById('serversContainer'),info=document.getElementById('info');
            btn.innerHTML='⏳ Scanning...';btn.classList.add('scanning');status.textContent='Fetching real-time data...';
            try{
                const res=await fetch(API_URL+'/rip-indra');
                const data=await res.json();
                console.log('JSON:',data);
                if(data.status==='success'&&data.servers.length>0){
                    let html='';
                    data.servers.forEach(s=>html+=`<div class="server-card">
                        <strong>${s.name}</strong><br>
                        <small>🆔 ${s.jobId.slice(0,16)}... | 👥 ${s.players}/${s.maxPlayers} | 🌐 ${s.ping}ms</small><br>
                        <button class="server-join" onclick="window.location.href='roblox://placeID=2753915549:jobId=${s.jobId}'">🚀 JOIN</button>
                    </div>`);
                    container.innerHTML=html;status.textContent=data.count+' RIP INDRAS found!';info.textContent='Servers: '+data.count+' RIP | Total: '+data.totalServers;
                }else{
                    container.innerHTML='<div class="no-servers">No active RIP INDRAS ('+data.totalServers+' servers scanned)</div>';
                    status.textContent='No RIP INDRAS active';info.textContent='RIP INDRAS: 0 | Total: '+data.totalServers;
                }
            }catch(e){
                status.textContent='Network error';console.error(e);
            }
            btn.innerHTML='🔍 SCAN AGAIN';btn.classList.remove('scanning');
            info.textContent+=' | '+new Date().toLocaleTimeString();
        }
        document.getElementById('scanBtn').onclick=scanServers;
        setInterval(scanServers,30000);scanServers();
    </script>
</body>
</html>
    `);
});

app.get('*', (req, res) => {
    res.redirect('/');
});

// ===== START SERVER =====
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 FULL API + UI → http://localhost:${port}`);
    console.log(`📡 /api/rip-indra → JSON only`);
    fetchServers();
    setInterval(fetchServers, 15000);
});
