const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

/**
 * Generates the reworded Consultation Request embed and button panel.
 * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
 */
function getConsultationPanel() {
  const embedColor = config.colors.tan || '#E2D6B5';

  const consultationEmbed = new EmbedBuilder()
    .setTitle('CASE CONSULTATION INTAKE')
    .setDescription(
      `If you require legal representation, advisory counsel, or contract review, open a ticket below to submit your matter for review by **${config.firmName}**.`
    )
    .setColor(embedColor);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('request_consultation_btn')
      .setLabel('Request Consultation')
      .setStyle(ButtonStyle.Success)
  );

  return {
    embeds: [consultationEmbed],
    components: [row]
  };
}

module.exports = { getConsultationPanel };
