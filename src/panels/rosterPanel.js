const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getRoster } = require('../utils/rosterStore');

/**
 * Generates the static Bar Roster embed panel for channel 1539848820056260628
 * @param {string|null} guildIconUrl 
 */
function getRosterPanel(guildIconUrl) {
  const roster = getRoster();

  const rosterFormatted = roster.length > 0
    ? roster.map((r, i) => `**${i + 1}. ${r.name}**\n├ License (SBN): \`${r.sbn}\`\n├ Status: \`${r.status}\`\n└ Date Admitted: \`${r.date}\``).join('\n\n')
    : '*No active attorney bar licenses registered.*';

  const embed = new EmbedBuilder()
    .setAuthor({
      name: 'State Bar of Mayflower',
      iconURL: guildIconUrl || undefined
    })
    .setTitle('Official Attorney Bar Roster Directory')
    .setDescription(`Total Admitted Attorneys: **${roster.length}**\n\n${rosterFormatted}`)
    .setColor('#6B21A8')
    .setFooter({ text: 'State Bar of Mayflower • Executive Board Management' });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('roster_add_attorney').setLabel('Add Attorney').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('roster_edit_attorney').setLabel('Edit / Update Status').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('roster_remove_attorney').setLabel('Remove Attorney').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('roster_refresh').setLabel('Refresh Roster').setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row] };
}

module.exports = { getRosterPanel };
