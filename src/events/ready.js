const { getInformationPanel } = require('../panels/informationPanel');
const { getConsultationPanel } = require('../panels/consultationPanel');
const { getResourcesPanel } = require('../panels/resourcesPanel');
const config = require('../../config.json');

/**
 * Deploys or updates information, consultation, and resources panels in designated channels.
 * @param {import('discord.js').Client} client
 */
async function deployPanels(client) {
  const guildId = process.env.GUILD_ID;
  const infoChannelId = process.env.INFORMATION_CHANNEL_ID;
  const consultationsChannelId = process.env.CONSULTATIONS_CHANNEL_ID;
  const reviewsChannelId = process.env.REVIEWS_CHANNEL_ID;
  const resourcesChannelId = process.env.RESOURCES_CHANNEL_ID;

  // 1. Deploy / Refresh Information Panel
  if (infoChannelId) {
    try {
      const infoChannel = await client.channels.fetch(infoChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch Information channel (${infoChannelId}): ${e.message}`);
        return null;
      });

      if (infoChannel && infoChannel.isTextBased()) {
        const messages = await infoChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;
        const infoData = await getInformationPanel(guildId, consultationsChannelId, reviewsChannelId);

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing Information Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(infoData);
          console.log('[Auto-Deploy] Information Panel updated.');
        } else {
          console.log('[Auto-Deploy] Sending new Information Panel...');
          await infoChannel.send(infoData);
          console.log('[Auto-Deploy] Information Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed checking/deploying Information panel:', err);
    }
  }

  // 2. Deploy / Refresh Consultation Panel
  if (consultationsChannelId) {
    try {
      const consultationsChannel = await client.channels.fetch(consultationsChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch Consultations channel (${consultationsChannelId}): ${e.message}`);
        return null;
      });

      if (consultationsChannel && consultationsChannel.isTextBased()) {
        const messages = await consultationsChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;
        const consultData = getConsultationPanel();

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing Consultation Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(consultData);
          console.log('[Auto-Deploy] Consultation Panel updated.');
        } else {
          console.log('[Auto-Deploy] Sending new Consultation Panel...');
          await consultationsChannel.send(consultData);
          console.log('[Auto-Deploy] Consultation Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed checking/deploying Consultation panel:', err);
    }
  }

  // 3. Deploy / Refresh Resources Panel (if configured)
  if (resourcesChannelId) {
    try {
      const resourcesChannel = await client.channels.fetch(resourcesChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch Resources channel (${resourcesChannelId}): ${e.message}`);
        return null;
      });

      if (resourcesChannel && resourcesChannel.isTextBased()) {
        const messages = await resourcesChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;
        const resourcesData = getResourcesPanel();

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing Resources Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(resourcesData);
          console.log('[Auto-Deploy] Resources Panel updated.');
        } else {
          console.log('[Auto-Deploy] Sending new Resources Panel...');
          await resourcesChannel.send(resourcesData);
          console.log('[Auto-Deploy] Resources Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed checking/deploying Resources panel:', err);
    }
  }
}

/**
 * Handles the ready event.
 * @param {import('discord.js').Client} client
 */
async function handleReady(client) {
  console.log(`=======================================================`);
  console.log(` [${config.firmName} Bot] Ready!`);
  console.log(` Logged in as ${client.user.tag} (ID: ${client.user.id})`);
  console.log(` Connected to ${client.guilds.cache.size} server(s): ${client.guilds.cache.map(g => g.name).join(', ') || 'None'}`);
  console.log(`=======================================================`);

  await deployPanels(client);
}

module.exports = { handleReady, deployPanels };
