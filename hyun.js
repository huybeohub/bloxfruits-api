const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const SERVERS = []; // Danh sách server sẽ được cập nhật tự động

// Lấy danh sách server
app.get('/servers', async (req, res) => {
    try {
        const response = await axios.get('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100');
        SERVERS.push(...response.data.data);
        res.json(SERVERS);
    } catch (error) {
        res.status(500).json({ error: 'Không thể lấy server' });
    }
});

// Tìm server có boss
app.get('/find-boss/:bossName', async (req, res) => {
    const { bossName } = req.params;
    const servers = await getServers();
    
    for (const server of servers) {
        const hasBoss = await checkBossInServer(server.id, bossName);
        if (hasBoss) {
            return res.json({ 
                server: server, 
                status: 'found',
                players: server.playerCount 
            });
        }
    }
    
    res.json({ status: 'not_found' });
});

// Hop server
app.post('/hop-server/:serverId', async (req, res) => {
    const { serverId } = req.params;
    const placeId = '2753915549'; // Blox Fruits
    
    try {
        const response = await axios.post('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc');
        res.json({ success: true, serverId });
    } catch (error) {
        res.status(500).json({ error: 'Hop thất bại' });
    }
});

// Anti-ban & Rate limit
app.use((req, res, next) => {
    const ip = req.ip;
    if (!rateLimit[ip]) rateLimit[ip] = 0;
    
    rateLimit[ip]++;
    if (rateLimit[ip] > 10) { // 10 req/phút
        return res.status(429).json({ error: 'Rate limited' });
    }
    
    next();
});

// Cache servers 30s
let serverCache = { data: [], expires: 0 };
async function getServers() {
    if (Date.now() > serverCache.expires) {
        serverCache = {
            data: await fetchRobloxServers(),
            expires: Date.now() + 30000
        };
    }
    return serverCache.data;
}