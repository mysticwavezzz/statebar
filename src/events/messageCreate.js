const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createDraftGoogleDoc } = require('../utils/googleDriveHelper');
const { getAttorneyRoleIds } = require('../utils/ticketManager');
const config = require('../../config.json');

/**
 * Handles plain text contract command messages from attorneys.
 * Format: "contract, username, scope"
 * @param {import('discord.js').Message} message
 */
async function handleMessageCreate(message) {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();

  // Match: contract, username, scope
  if (!content.toLowerCase().startsWith('contract')) return;

  // Split by comma
  const parts = content.split(',').map(p => p.trim());
  if (parts.length < 2) return;

  // Verify author is an Attorney
  const attorneyRoleIds = getAttorneyRoleIds();
  const isAttorney = message.member.roles.cache.some(r => attorneyRoleIds.includes(r.id)) ||
                     message.member.permissions.has('Administrator');

  if (!isAttorney) {
    await message.reply('Only designated firm attorneys can issue legal contracts.');
    return;
  }

  const clientName = parts[1];
  const scope = parts[2] || 'Civil Representation';

  const statusMsg = await message.reply('Generating draft Legal Retainer Agreement Google Doc...');

  let docLink = null;
  let docId = null;

  try {
    const draftResult = await createDraftGoogleDoc({ clientName, scope });
    docId = draftResult.docId;
    docLink = draftResult.docUrl;
  } catch (err) {
    console.warn('[Message Contract Draft Error]:', err.message);
    docLink = 'https://docs.google.com/document/d/1CQyazd-CgKZMSSMk-LwAJCiDxqRgidsxC6u8qJ5Tgxs/edit';
  }

  const contractEmbed = new EmbedBuilder()
    .setTitle('LEGAL RETAINER AGREEMENT')
    .setDescription(
      `A Legal Engagement Agreement has been generated for **${clientName}**.\n\n` +
      `Scope of Representation: ${scope}\n` +
      `Draft Document: [View Draft Document](${docLink})\n\n` +
      `Click the button below to sign the agreement.`
    )
    .setColor(config.colors.tan || '#E2D6B5');

  const signButton = new ButtonBuilder()
    .setCustomId(`sign_contract_btn`)
    .setLabel('Sign Legal Retainer')
    .setStyle(ButtonStyle.Success);

  const row = new ActionRowBuilder().addComponents(signButton);

  message.channel._activeContract = {
    clientName,
    scope,
    docId,
    docLink
  };

  await statusMsg.delete().catch(() => null);
  await message.channel.send({
    embeds: [contractEmbed],
    components: [row]
  });
}

module.exports = { handleMessageCreate };
