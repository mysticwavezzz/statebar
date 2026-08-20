const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');
const { getRobloxHeadshot } = require('../utils/roblox');

/**
 * Generates the clean Information embeds and navigation buttons.
 * @param {string} guildId - Discord Guild ID
 * @param {string} consultationsChannelId - Consultations Channel ID
 * @param {string} reviewsChannelId - Reviews Channel ID
 * @returns {Promise<{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }>}
 */
async function getInformationPanel(guildId, consultationsChannelId, reviewsChannelId) {
  const embedColor = config.colors.tan || '#E2D6B5';

  // 1. PRACTICE OVERVIEW Embed
  const overviewEmbed = new EmbedBuilder()
    .setTitle('FIRM OVERVIEW')
    .setDescription(
      `**${config.firmName}** is a subsidiary firm of **${config.parentFirm}**, providing legal counsel and advocacy across **${config.location}**.`
    )
    .setColor(embedColor);

  // 2. LEADERSHIP & BACKGROUND Embed
  const leadershipEmbeds = [];
  for (const leader of config.leadership) {
    let desc = `*Senior Associate taking cases in and on behalf of ${config.parentFirm}.*\n\n`;
    for (const exp of leader.experiences) {
      desc += `**Jurisdiction & Office - ${exp.jurisdiction}**\n`;
      for (const pos of exp.positions) {
        desc += `• ${pos}\n`;
      }
      desc += '\n';
    }

    const leaderEmbed = new EmbedBuilder()
      .setTitle(`COUNSEL - ${leader.name.toUpperCase()} (${leader.title.toUpperCase()})`)
      .setDescription(desc.trim())
      .setColor(embedColor);

    if (leader.robloxUser) {
      const headshotUrl = await getRobloxHeadshot(leader.robloxUser);
      if (headshotUrl) {
        leaderEmbed.setImage(headshotUrl);
      }
    }

    leadershipEmbeds.push(leaderEmbed);
  }

  // 3. PRACTICE AREAS & ADVISORY NOTICE Embed
  const servicesList = config.services.map(s => `• **${s}**`).join('\n');
  const conflictNotice = config.conflictNotice
    ? `\n\n**Representation Advisory:**\n*${config.conflictNotice}*`
    : '';

  const servicesEmbed = new EmbedBuilder()
    .setTitle('PRACTICE AREAS & SERVICES')
    .setDescription(
      `The **${config.firmName}** provides focused legal guidance and advocacy in the following fields:\n\n` +
      `${servicesList}` +
      `${conflictNotice}\n\n` +
      `To request legal representation or an evaluation of your case, open a ticket in **#consultations**.`
    )
    .setColor(embedColor);

  // Navigation Buttons
  const row = new ActionRowBuilder();

  if (guildId && consultationsChannelId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Consultations')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guildId}/${consultationsChannelId}`)
    );
  }

  if (guildId && reviewsChannelId) {
    row.addComponents(
      new ButtonBuilder()
        .setLabel('Reviews')
        .setStyle(ButtonStyle.Link)
        .setURL(`https://discord.com/channels/${guildId}/${reviewsChannelId}`)
    );
  }

  return {
    embeds: [overviewEmbed, ...leadershipEmbeds, servicesEmbed],
    components: row.components.length > 0 ? [row] : []
  };
}

module.exports = { getInformationPanel };
