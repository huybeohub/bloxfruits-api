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
    console.log('✅ Servers updated:', servers.length);
  } catch(e) {
    console.log('❌ Update failed');
  }
}

app.get('/api/servers', (req, res) => res.json(servers));
app.get('/api/find-boss/:boss', (req, res) => {
  // Mock boss data (thay bằng real logic)
  res.json({status: 'found', server: servers[0] || {}});
});
app.post('/api/boss-spawned', (req, res) => {
  console.log('🔔', req.body);
  res.json({success: true});
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('🚀 API LIVE: ' + (process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.glitch.me` : 'localhost'));
  updateServers();
  setInterval(updateServers, 30000);
});

module.exports = listener;
