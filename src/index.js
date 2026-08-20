require('dotenv').config();
const { Client, GatewayIntentBits, Partials, Events } = require('discord.js');
const { handleReady, deployPanels, syncGuildNicknames } = require('./events/ready');
const { handleInteraction } = require('./events/interactionCreate');
const { handleMessageCreate } = require('./events/messageCreate');
const { startServer, setDiscordClient } = require('../server');

// Validate critical environment variables
if (!process.env.DISCORD_TOKEN) {
  console.error('[Error] DISCORD_TOKEN is missing in .env file. Please check your configuration.');
  process.exit(1);
}

// Initialize Client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.User,
    Partials.GuildMember
  ]
});

// Pass Discord client instance to Express Server for webhook API endpoints
setDiscordClient(client);

// Event Handlers
client.once(Events.ClientReady, async (c) => {
  await handleReady(c);
});

client.on(Events.GuildCreate, async (guild) => {
  console.log(`[Bot Joined Server] Joined server: ${guild.name} (ID: ${guild.id})`);
  await syncGuildNicknames(client);
  await deployPanels(client);
});

client.on(Events.InteractionCreate, async (interaction) => {
  await handleInteraction(interaction);
});

client.on(Events.MessageCreate, async (message) => {
  await handleMessageCreate(message);
});

// Global Error Catchers
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Unhandled Rejection at]:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception]:', err);
});

// Bot Login and Express Web Server Start
client.login(process.env.DISCORD_TOKEN).then(() => {
  startServer(client);
}).catch((err) => {
  console.error('[Login Failed] Could not connect to Discord Gateway:', err.message);
  startServer(null);
});
