const express = require('express');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const config = require('./config.json');

const app = express();
app.use(express.json());
app.use(express.static(__dirname));

let discordClientRef = null;

function setDiscordClient(client) {
  discordClientRef = client;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/database.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'database.html'));
});

// API Endpoint to send Bar Certification Log embed to Discord Channel 1539839511544991785
app.post('/api/certify-bar', async (req, res) => {
  const { robloxUser, score, robloxId } = req.body;

  if (!robloxUser) {
    return res.status(400).json({ error: 'robloxUser is required' });
  }

  const scoreStr = score || '79.11%';
  const profileId = robloxId || '8223519700';

  if (discordClientRef) {
    try {
      const channelId = config.stateBarCertLogChannelId || '1539839511544991785';
      const channel = await discordClientRef.channels.fetch(channelId).catch(() => null);

      if (channel && channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('Certification Log')
          .setDescription(`This log hereby certifies that [${robloxUser}](https://www.roblox.com/users/${profileId}/profile) has been duly admitted to the Bar of Harrison County, passing with a score of \`\`${scoreStr}\`\`.`)
          .setColor('#2E7D32');

        await channel.send({ embeds: [embed] });
        console.log(`[Bar Certification Log] Posted log for ${robloxUser} to channel ${channelId}`);
        return res.json({ success: true, message: `Certification log sent for ${robloxUser}` });
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
