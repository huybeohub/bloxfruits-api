const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

let servers = [];
let ripIndraServers = new Set(); // Lưu server có Rip Indra

// Cập nhật danh sách server
async function updateServers() {
    try {
        const res = await axios.get('https://games.roblox.com/v1/games/2753915549/servers/Public?sortOrder=Asc&limit=100');
        servers = res.data.data.filter(s => s.playing < 15); // Chỉ server ít người
        console.log(`✅ Loaded ${servers.length} servers`);
    } catch(e) {
        console.log('❌ Update failed');
    }
}

// API chính: Tìm Rip Indra
app.get('/api/rip-indra', async (req, res) => {
    // Kiểm tra cache trước
    if (ripIndraServers.size > 0) {
        const serverList = servers.filter(s => ripIndraServers.has(s.id));
        if (serverList.length > 0) {
            return res.json({
                status: "found",
                boss: "Rip Indra",
                servers: serverList.map(s => ({
                    jobId: s.id,
                    name: s.name,
                    players: s.playing,
                    ping: s.ping || 0
                }))
            });
        }
    }
    
    // Không tìm thấy
    res.json({
        status: "not_found",
        message: "No Rip Indra servers found",
        randomServer: servers[0] ? {
            jobId: servers[0].id,
            name: servers[0].name,
            players: servers[0].playing
        } : null
    });
});

// Nhận thông báo từ Roblox server
app.post('/api/boss-spawned', (req, res) => {
    const { boss, jobId } = req.body;
    
    if (boss === "Rip Indra") {
        ripIndraServers.add(jobId);
        console.log(`🔔 RIP INDRAS spawn! JobId: ${jobId}`);
        
        // Auto xóa sau 5 phút
        setTimeout(() => {
            ripIndraServers.delete(jobId);
            console.log(`⏰ RIP INDRAS ${jobId} expired`);
        }, 300000);
    }
    
    res.json({ success: true });
});

// Test endpoint
app.get('/', (req, res) => res.send(`
    🚀 RIP INDRAS HOP API<br>
    📡 /api/rip-indra → Lấy Job ID<br>
    📤 POST /api/boss-spawned → Report boss
`));

// Start
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`🚀 RIP INDRAS API on port ${port}`);
    updateServers();
    setInterval(updateServers, 20000); // Update 20s
});
