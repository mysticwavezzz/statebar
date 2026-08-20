const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

/**
 * Generates the permanent filing embed for channel 1537964874527936584
 * @param {string|null} guildIconUrl 
 */
function getFilingPanel(guildIconUrl) {
  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'State of Mayflower District Courts',
      iconURL: guildIconUrl || undefined
    })
    .setTitle('File with the Court')
    .setDescription('Pick the type of filing you would like to submit. A clerk will review it shortly.')
    .setColor('#6B21A8')
    .addFields(
      { name: 'Criminal', value: 'File a criminal complaint.', inline: false },
      { name: 'Civil', value: 'File a civil claim.', inline: false },
      { name: 'Expungement', value: 'Petition to expunge records.', inline: false },
      { name: 'Supreme Court Appeal', value: 'Appeal a case decision.', inline: false },
      { name: 'Arrest Warrant', value: 'Request an arrest warrant.', inline: false },
      { name: 'Search Warrant', value: 'Request a search warrant.', inline: false }
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('file_btn_criminal').setLabel('Criminal').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('file_btn_civil').setLabel('Civil').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('file_btn_expungement').setLabel('Expungement').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('file_btn_supreme_appeal').setLabel('Supreme Court Appeal').setStyle(ButtonStyle.Primary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('file_btn_arrest_warrant').setLabel('Arrest Warrant').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('file_btn_search_warrant').setLabel('Search Warrant').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2] };
}

module.exports = { getFilingPanel };
