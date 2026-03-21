const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let allServers = [];
let ripIndraServers = new Map(); // jobId -> server info

// Auto fetch servers mỗi 15s
async function fetchServers() {
    try {
        const res = await axios.get('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100');
        allServers = res.data.data;
        console.log(`📊 Fetched ${allServers.length} servers`);
    } catch(e) {
        console.error('Fetch error:', e.message);
    }
}

// RIP INDRAS API - Real JSON only
app.get('/api/rip-indra', (req, res) => {
    const ripServers = [];
    
    // Filter servers có Rip Indra từ cache
    for (let [jobId, serverInfo] of ripIndraServers) {
        const fullServer = allServers.find(s => s.id === jobId);
        if (fullServer) {
            ripServers.push({
                jobId: fullServer.id,
                name: fullServer.name || 'Unknown',
                players: fullServer.playing || 0,
                maxPlayers: fullServer.maxPlayers || 12,
                ping: fullServer.ping || 999,
                lastSeen: serverInfo.lastSeen
            });
        }
    }
    
    res.json({
        status: ripServers.length > 0 ? 'success' : 'empty',
        count: ripServers.length,
        servers: ripServers,
        lastUpdate: new Date().toISOString(),
        totalServers: allServers.length
    });
});

// Report boss spawn
app.post('/api/boss-spawned', (req, res) => {
    const { boss, jobId } = req.body;
    if (boss === 'Rip Indra') {
        ripIndraServers.set(jobId, {
            lastSeen: Date.now(),
            reports: (ripIndraServers.get(jobId)?.reports || 0) + 1
        });
        
        // Cleanup cũ hơn 5 phút
        setTimeout(() => ripIndraServers.delete(jobId), 300000);
        console.log(`🔔 RIP INDRAS reported: ${jobId}`);
    }
    res.json({ success: true });
});

// Debug - All servers
app.get('/api/debug', (req, res) => res.json({
    ripIndraCount: ripIndraServers.size,
    totalServers: allServers.length,
    allServers: allServers.slice(0, 5) // First 5
}));

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 API + UI on port ${port}`);
    fetchServers();
    setInterval(fetchServers, 15000); // 15s update
});
