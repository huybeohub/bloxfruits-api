const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

let servers = [];

async function updateServers() {
    try {
        const res = await axios.get('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100');
        servers = res.data.data;
        console.log(`✅ Loaded ${servers.length} servers`);
    } catch(e) {
        console.log('❌ Server update failed');
    }
}

// Routes
app.get('/', (req, res) => res.send('🚀 Blox Fruits Hop API OK!'));

app.get('/api/servers', (req, res) => {
    res.json(servers);
});

app.get('/api/find-boss/:boss', (req, res) => {
    // Tìm boss hoặc random server
    const bossServer = servers.find(s => s.playing > 5) || servers[0];
    res.json({
        status: 'found',
        server: bossServer || { id: '1234567890', name: 'Low Player Server' }
    });
});

app.post('/api/boss-spawned', (req, res) => {
    console.log('🔔 Boss detected:', req.body.boss);
    res.json({ success: true });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
    updateServers();
    setInterval(updateServers, 30000);
});
