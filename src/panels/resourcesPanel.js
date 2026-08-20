const { EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/**
 * Generates the Resources & Representation Policy embed.
 * @returns {{ embeds: EmbedBuilder[] }}
 */
function getResourcesPanel() {
  const embedColor = config.colors.tan || '#E2D6B5';

  const resourcesEmbed = new EmbedBuilder()
    .setTitle('FIRM RESOURCES & PRACTICE POLICIES')
    .setDescription(
      `**${config.firmName}** adheres strictly to all professional conduct and jurisdictional ethics standards.\n\n` +
      `**Conflict of Interest Policy**\n` +
      `• ${config.conflictNotice}\n\n` +
      `**Client Consultations**\n` +
      `• All consultations are confidential and evaluated on a case-by-case basis.\n` +
      `• To submit a matter for intake review, proceed to the **#consultations** channel.`
    )
    .setColor(embedColor);

  return {
    embeds: [resourcesEmbed]
  };
}

module.exports = { getResourcesPanel };
