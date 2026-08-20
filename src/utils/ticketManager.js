const {
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const config = require('../../config.json');

/**
 * Parses configured attorney role IDs.
 * @returns {string[]}
 */
function getAttorneyRoleIds() {
  const raw = process.env.ATTORNEY_ROLE_IDS || process.env.ATTORNEY_ROLE_ID || '';
  return raw
    .split(/[\s,;]+/)
    .map(id => id.replace(/[^0-9]/g, ''))
    .filter(id => id.length >= 15);
}

/**
 * Counts the number of active case channels currently open.
 * @param {import('discord.js').Guild} guild
 * @param {string} categoryId
 * @returns {Promise<number>}
 */
async function getActiveCaseCount(guild, categoryId) {
  try {
    const channels = await guild.channels.fetch();
    return channels.filter(c => {
      if (!c || c.type !== ChannelType.GuildText) return false;
      const matchesCategory = categoryId ? c.parentId === categoryId : true;
      const isCaseChannel = c.name.startsWith('case-');
      return matchesCategory && isCaseChannel;
    }).size;
  } catch (err) {
    console.error('[Case Count Error]:', err);
    return 0;
  }
}

/**
 * Creates a new case ticket channel under the configured category.
 * @param {import('discord.js').ModalSubmitInteraction} interaction
 * @param {{ robloxUser: string, description: string, evidence: string }} formData
 * @returns {Promise<{ channel: import('discord.js').TextChannel, isQueued: boolean }>}
 */
async function createConsultationTicket(interaction, formData) {
  const guild = interaction.guild;
  const user = interaction.user;

  const categoryId = process.env.CASES_CATEGORY_ID;
  const attorneyRoleIds = getAttorneyRoleIds();

  // Check active case load
  const activeCases = await getActiveCaseCount(guild, categoryId);
  const isQueued = activeCases >= 10;

  // Clean channel name
  const sanitizedUsername = formData.robloxUser.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 20) || 'client';
  const channelName = isQueued ? `queued-${sanitizedUsername}` : `case-${sanitizedUsername}`;

  // Permission overwrites
  const permissionOverwrites = [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks
      ]
    },
    {
      id: interaction.client.user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.ManageChannels,
        PermissionsBitField.Flags.ManageMessages,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.AttachFiles
      ]
    }
  ];

  // Add permissions for all configured attorney roles
  for (const roleId of attorneyRoleIds) {
    permissionOverwrites.push({
      id: roleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory,
        PermissionsBitField.Flags.AttachFiles,
        PermissionsBitField.Flags.EmbedLinks,
        PermissionsBitField.Flags.ManageMessages
      ]
    });
  }

  // Create Channel
  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: categoryId || null,
    topic: `Consultation Ticket for Roblox: ${formData.robloxUser} | Discord: ${user.tag} (${user.id}) | Queued: ${isQueued}`,
    permissionOverwrites
  });

  const embedColor = config.colors.tan || '#E2D6B5';

  const ticketDescription = isQueued
    ? `**Notice:** Your case has been placed in a queue and will be accepted after cases filed prior to yours are handled.`
    : `Case opened by <@${user.id}>. An attorney will review your case details shortly.`;

  // Clean Ticket Embed
  const ticketEmbed = new EmbedBuilder()
    .setTitle(`CASE INTAKE: ${formData.robloxUser.toUpperCase()}${isQueued ? ' (QUEUED)' : ''}`)
    .setDescription(ticketDescription)
    .addFields(
      { name: 'Roblox Username', value: `\`${formData.robloxUser}\``, inline: true },
      { name: 'Discord Client', value: `<@${user.id}>`, inline: true },
      { name: 'Status', value: isQueued ? '`In Queue (Active Capacity: 10+ Cases)`' : '`Active Review`', inline: true },
      { name: 'Matter Overview', value: formData.description.slice(0, 1024) },
      { name: 'Evidence / Documentation', value: formData.evidence ? formData.evidence.slice(0, 1024) : 'None provided' }
    )
    .setColor(embedColor);

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('close_case_btn')
      .setLabel('Close Case')
      .setStyle(ButtonStyle.Danger)
  );

  const attorneyMentions = attorneyRoleIds.map(id => `<@&${id}>`).join(' ');

  await ticketChannel.send({
    content: attorneyMentions ? `${attorneyMentions}` : undefined,
    embeds: [ticketEmbed],
    components: [actionRow]
  });

  return { channel: ticketChannel, isQueued };
}

module.exports = { createConsultationTicket, getAttorneyRoleIds, getActiveCaseCount };
