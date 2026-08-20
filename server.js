const express = require('express');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('./config.json');

const app = express();
app.use(express.json());

// Enable CORS for web requests from GitHub Pages or localhost
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.static(__dirname));

let discordClientRef = null;

function setDiscordClient(client) {
  discordClientRef = client;
}

const { validateRobloxUsername } = require('./src/utils/roblox');

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/database.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'database.html'));
});

const { getRoster, saveRoster, addBarLicense } = require('./src/utils/rosterStore');

app.get('/api/roster', (req, res) => {
  res.json(getRoster());
});

app.post('/api/sync-roster', (req, res) => {
  const { name, sbn, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const entry = addBarLicense(name, sbn, status || 'Active');
  res.json({ success: true, entry });
});

app.post('/api/bulk-sync-roster', (req, res) => {
  const { roster } = req.body;
  if (!Array.isArray(roster)) return res.status(400).json({ error: 'Roster array required' });

  const currentRoster = getRoster();
  const existingSBNs = new Set(currentRoster.map(r => r.sbn));
  const existingNames = new Set(currentRoster.map(r => (r.name || '').toLowerCase()));

  let updated = false;
  roster.forEach(item => {
    if (item.name) {
      const itemSbn = item.sbn || String(Math.floor(1000000000 + Math.random() * 9000000000));
      const itemKey = item.name.toLowerCase();
      if (!existingSBNs.has(itemSbn) && !existingNames.has(itemKey)) {
        currentRoster.push({
          id: item.id || Date.now(),
          name: item.name,
          sbn: itemSbn,
          status: item.status || 'Active',
          date: item.date || new Date().toLocaleDateString()
        });
        existingSBNs.add(itemSbn);
        existingNames.add(itemKey);
        updated = true;
      }
    }
  });

  if (updated) {
    saveRoster(currentRoster);
  }

  res.json({ success: true, count: currentRoster.length, roster: currentRoster });
});

// API Endpoint to send Bar Certification Log embed to Discord Channel 1539839511544991785
app.post('/api/certify-bar', async (req, res) => {
  const { robloxUser, score } = req.body;

  if (!robloxUser) {
    return res.status(400).json({ error: 'robloxUser is required' });
  }

  const scoreStr = score || '79.11%';

  // Dynamically resolve Roblox User ID from username
  const robloxRes = await validateRobloxUsername(robloxUser).catch(() => ({ valid: false }));
  const resolvedUsername = robloxRes.username || robloxUser;
  const profileUrl = robloxRes.userId
    ? `https://www.roblox.com/users/${robloxRes.userId}/profile`
    : `https://www.roblox.com/users/profile?username=${encodeURIComponent(robloxUser)}`;

  if (discordClientRef) {
    try {
      const channelId = config.stateBarCertLogChannelId || '1539839511544991785';
      const channel = await discordClientRef.channels.fetch(channelId).catch(() => null);

      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('Certification Log')
          .setDescription(`This log hereby certifies that [${resolvedUsername}](${profileUrl}) has been duly admitted to the Bar of Mayflower, passing with a score of \`\`${scoreStr}\`\`.`)
          .setColor('#2E7D32');

        await channel.send({ embeds: [embed] });
        console.log(`[Bar Certification Log] Posted log for ${resolvedUsername} to channel ${channelId}`);
        return res.json({ success: true, message: `Certification log sent for ${resolvedUsername}` });
      }
    } catch (err) {
      console.error('[API Certify Bar Error]:', err.message);
    }
  }

  res.json({ success: false, message: 'Discord bot not ready or channel unavailable' });
});

const PORT = process.env.PORT || 3000;

function startServer(client) {
  if (client) setDiscordClient(client);
  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` Mayflower State Bar Workstation Local Host Online!`);
    console.log(` Main Desktop:     http://localhost:${PORT}`);
    console.log(` Hidden Database: http://localhost:${PORT}/database.html`);
    console.log(`=======================================================`);
  });
}

module.exports = { app, startServer, setDiscordClient };
