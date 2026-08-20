const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

/**
 * Generates the permanent State Bar Admission & Transfer panel for channel 1539382125382471774
 * @param {string|null} guildIconUrl 
 */
function getBarPortalPanel(guildIconUrl) {
  const websiteUrl = config.websiteUrl || 'https://mysticwavezzz.github.io/statebar/';

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'State Bar of Harrison County',
      iconURL: guildIconUrl || undefined
    })
    .setTitle('Bar Admission & Reciprocal Transfer Portal')
    .setDescription('Welcome to the official State Bar Admission Portal. Candidates may petition for bar admission by sitting for the official 25-Question Statutory Examination or submitting a Reciprocal Bar Transfer Application.')
    .setColor('#6B21A8')
    .addFields(
      {
        name: 'Official State Bar Examination',
        value: 'Test your statutory knowledge across 25 legal categories including Constitutional Structure, Criminal Law, Civil Torts, Administrative Code, and Electoral Integrity.',
        inline: false
      },
      {
        name: 'Reciprocal Bar Transfer',
        value: 'Attorneys holding an active, unblemished bar license in an approved jurisdiction (e.g. State of Firestone) may submit evidence of prior certification for reciprocal admission.',
        inline: false
      }
    )
    .setFooter({ text: 'State Bar of Harrison County • Executive Review Board' });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Take Exam via Website')
      .setStyle(ButtonStyle.Link)
      .setURL(websiteUrl),
    new ButtonBuilder()
      .setCustomId('bar_exam_via_dms')
      .setLabel('Take Exam via DMs')
      .setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Transfer via Website')
      .setStyle(ButtonStyle.Link)
      .setURL(websiteUrl),
    new ButtonBuilder()
      .setCustomId('bar_transfer_via_dms')
      .setLabel('Transfer via DMs')
      .setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = { getBarPortalPanel };
