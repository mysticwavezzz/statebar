const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

/**
 * Generates the Verification panel embed and button.
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function getVerificationPanel() {
  const embedColor = config.colors.tan || '#E2D6B5';

  const embed = new EmbedBuilder()
    .setTitle('VERIFICATION')
    .setDescription('Click to receive access to all channels')
    .setColor(embedColor);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify_btn')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}

module.exports = { getVerificationPanel };
