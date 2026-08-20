const { getFilingPanel } = require('../panels/filingPanel');
const { getBarPortalPanel } = require('../panels/barPortalPanel');
const { getRosterPanel } = require('../panels/rosterPanel');
const { registerCommands } = require('../utils/deployCommands');
const config = require('../../config.json');

/**
 * Syncs nicknames for target guilds
 * @param {import('discord.js').Client} client 
 */
async function syncGuildNicknames(client) {
  // 1. Judiciary Guild Nickname -> caseFLOW
  if (config.judiciaryGuildId) {
    try {
      const judiciaryGuild = await client.guilds.fetch(config.judiciaryGuildId).catch(() => null);
      if (judiciaryGuild) {
        const me = await judiciaryGuild.members.fetchMe().catch(() => null);
        if (me && me.nickname !== config.judiciaryNickname) {
          await me.setNickname(config.judiciaryNickname).catch(err => {
            console.warn(`[Nickname Warning] Could not set nickname in Judiciary Guild: ${err.message}`);
          });
          console.log(`[Nickname Sync] Set nickname in Judiciary Guild to "${config.judiciaryNickname}"`);
        }
      }
    } catch (err) {
      console.error('[Nickname Error] Judiciary Guild:', err.message);
    }
  }

  // 2. State Bar Guild Nickname -> barFLOW
  if (config.stateBarGuildId) {
    try {
      const stateBarGuild = await client.guilds.fetch(config.stateBarGuildId).catch(() => null);
      if (stateBarGuild) {
        const me = await stateBarGuild.members.fetchMe().catch(() => null);
        if (me && me.nickname !== config.stateBarNickname) {
          await me.setNickname(config.stateBarNickname).catch(err => {
            console.warn(`[Nickname Warning] Could not set nickname in State Bar Guild: ${err.message}`);
          });
          console.log(`[Nickname Sync] Set nickname in State Bar Guild to "${config.stateBarNickname}"`);
        }
      }
    } catch (err) {
      console.error('[Nickname Error] State Bar Guild:', err.message);
    }
  }
}

/**
 * Deploys or updates permanent panels across Judiciary and State Bar guilds
 * @param {import('discord.js').Client} client 
 */
async function deployPanels(client) {
  // 1. Permanent Court Filing Panel (1537964874527936584)
  const filingChannelId = config.judiciaryFilingChannelId;
  if (filingChannelId) {
    try {
      const channel = await client.channels.fetch(filingChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch Filing channel (${filingChannelId}): ${e.message}`);
        return null;
      });

      if (channel && channel.isTextBased()) {
        const guildIcon = channel.guild ? channel.guild.iconURL() : null;
        const panelData = getFilingPanel(guildIcon);

        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing Permanent Court Filing Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(panelData);
          console.log('[Auto-Deploy] Permanent Filing Panel updated successfully.');
        } else {
          console.log('[Auto-Deploy] Posting new Permanent Court Filing Panel...');
          await channel.send(panelData);
          console.log('[Auto-Deploy] Permanent Filing Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed deploying Court Filing Panel:', err.message);
    }
  }

  // 2. Permanent State Bar Admission Portal Panel (1539382125382471774)
  const barPortalChannelId = config.stateBarPortalChannelId;
  if (barPortalChannelId) {
    try {
      const barChannel = await client.channels.fetch(barPortalChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch State Bar Portal channel (${barPortalChannelId}): ${e.message}`);
        return null;
      });

      if (barChannel && barChannel.isTextBased()) {
        const barGuildIcon = barChannel.guild ? barChannel.guild.iconURL() : null;
        const barPanelData = getBarPortalPanel(barGuildIcon);

        const messages = await barChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing State Bar Portal Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(barPanelData);
          console.log('[Auto-Deploy] State Bar Portal Panel updated successfully.');
        } else {
          console.log('[Auto-Deploy] Posting new State Bar Portal Panel...');
          await barChannel.send(barPanelData);
          console.log('[Auto-Deploy] State Bar Portal Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed deploying State Bar Portal Panel:', err.message);
    }
  }

  // 3. Static Bar Roster Embed Panel (1539848820056260628)
  const rosterChannelId = config.stateBarRosterChannelId || '1539848820056260628';
  if (rosterChannelId) {
    try {
      const rosterChannel = await client.channels.fetch(rosterChannelId).catch((e) => {
        console.warn(`[Auto-Deploy] Could not fetch State Bar Roster channel (${rosterChannelId}): ${e.message}`);
        return null;
      });

      if (rosterChannel && rosterChannel.isTextBased()) {
        const rosterGuildIcon = rosterChannel.guild ? rosterChannel.guild.iconURL() : null;
        const rosterPanelData = getRosterPanel(rosterGuildIcon);

        const messages = await rosterChannel.messages.fetch({ limit: 10 }).catch(() => null);
        const botMessages = messages ? messages.filter(m => m.author.id === client.user.id) : null;

        if (botMessages && botMessages.size > 0) {
          console.log('[Auto-Deploy] Updating existing Static Bar Roster Panel...');
          const lastBotMsg = botMessages.first();
          await lastBotMsg.edit(rosterPanelData);
          console.log('[Auto-Deploy] Static Bar Roster Panel updated successfully.');
        } else {
          console.log('[Auto-Deploy] Posting new Static Bar Roster Panel...');
          await rosterChannel.send(rosterPanelData);
          console.log('[Auto-Deploy] Static Bar Roster Panel posted successfully.');
        }
      }
    } catch (err) {
      console.error('[Auto-Deploy Error] Failed deploying Static Bar Roster Panel:', err.message);
    }
  }
}

/**
 * Handles the client ready event.
 * @param {import('discord.js').Client} client
 */
async function handleReady(client) {
  console.log(`=======================================================`);
  console.log(` caseFLOW & barFLOW Judiciary Bot Ready!`);
  console.log(` Logged in as ${client.user.tag} (ID: ${client.user.id})`);
  console.log(` Connected to ${client.guilds.cache.size} server(s)`);
  console.log(`=======================================================`);

  await syncGuildNicknames(client);
  await registerCommands(client);
  await deployPanels(client);
}

module.exports = { handleReady, deployPanels, syncGuildNicknames };
