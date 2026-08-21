const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} = require('discord.js');
const { createConsultationTicket } = require('../utils/ticketManager');
const { generateAndPostTranscript } = require('../utils/transcriptGenerator');
const config = require('../../config.json');

/**
 * Handles all button and modal interactions.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    // 1. Button Interaction: "Request Consultation"
    if (interaction.isButton() && interaction.customId === 'request_consultation_btn') {
      const modal = new ModalBuilder()
        .setCustomId('consultation_modal')
        .setTitle('Consultation Request');

      const robloxUserInput = new TextInputBuilder()
        .setCustomId('roblox_user')
        .setLabel('Roblox Username')
        .setPlaceholder('Enter your Roblox username')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(50);

      const descriptionInput = new TextInputBuilder()
        .setCustomId('case_description')
        .setLabel('What happened in full')
        .setPlaceholder('Provide full details of what occurred...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(2000);

      const evidenceInput = new TextInputBuilder()
        .setCustomId('case_evidence')
        .setLabel('Evidence (Optional)')
        .setPlaceholder('Links to evidence, footage, or documents...')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(1000);

      modal.addComponents(
        new ActionRowBuilder().addComponents(robloxUserInput),
        new ActionRowBuilder().addComponents(descriptionInput),
        new ActionRowBuilder().addComponents(evidenceInput)
      );

      await interaction.showModal(modal);
      return;
    }

    // 2. Modal Submit Interaction: Consultation Intake Form
    if (interaction.isModalSubmit() && interaction.customId === 'consultation_modal') {
      await interaction.deferReply({ ephemeral: true });

      const robloxUser = interaction.fields.getTextInputValue('roblox_user').trim();
      const description = interaction.fields.getTextInputValue('case_description').trim();
      const evidence = interaction.fields.getTextInputValue('case_evidence')?.trim() || '';

      try {
        const { channel: ticketChannel, isQueued } = await createConsultationTicket(interaction, {
          robloxUser,
          description,
          evidence
        });

        if (isQueued) {
          await interaction.editReply({
            content: `Your case has been placed in a queue and will be accepted after cases filed prior to yours are handled: <#${ticketChannel.id}>`
          });
        } else {
          await interaction.editReply({
            content: `Your consultation ticket has been opened: <#${ticketChannel.id}>`
          });
        }
      } catch (err) {
        console.error('[Ticket Error] Failed to create consultation channel:', err);
        await interaction.editReply({
          content: 'An error occurred while creating your consultation ticket. Please contact an attorney.'
        });
      }
      return;
    }

    // 3. Button Interaction: "Close Case"
    if (interaction.isButton() && interaction.customId === 'close_case_btn') {
      await interaction.deferReply();

      // Extract metadata from channel topic
      const topic = interaction.channel.topic || '';
      let robloxUser = 'Unknown';
      let clientId = null;

      const robloxMatch = topic.match(/Roblox:\s*([^\s|]+)/i);
      if (robloxMatch) robloxUser = robloxMatch[1];

      const clientMatch = topic.match(/\((\d{17,20})\)/);
      if (clientMatch) clientId = clientMatch[1];

      const closingEmbed = new EmbedBuilder()
        .setTitle('Closing Case')
        .setDescription('Archiving transcript and deleting channel in 5 seconds.')
        .setColor(config.colors.danger || '#C62828');

      await interaction.editReply({ embeds: [closingEmbed] });

      // Generate transcript and send to #transcripts
      await generateAndPostTranscript(interaction.channel, interaction.user, {
        robloxUser,
        clientId,
        clientTag: clientId ? `<@${clientId}>` : 'Unknown'
      }).catch(err => console.error('[Transcript Error]:', err));

      // 5-second countdown then delete
      setTimeout(async () => {
        try {
          await interaction.channel.delete(`Case closed by ${interaction.user.tag}`);
        } catch (err) {
          console.error('[Channel Delete Error]:', err);
        }
      }, 5000);

      return;
    }
  } catch (error) {
    console.error('[Interaction Handler Error]:', error);
  }
}

module.exports = { handleInteraction };
