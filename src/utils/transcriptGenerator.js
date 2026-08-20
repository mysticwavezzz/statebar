const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const config = require('../../config.json');

/**
 * Fetches all messages from a channel (paginating if needed).
 * @param {import('discord.js').TextChannel} channel
 * @param {number} limit
 * @returns {Promise<import('discord.js').Message[]>}
 */
async function fetchAllMessages(channel, limit = 500) {
  const messages = [];
  let lastId = null;

  while (messages.length < limit) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const batch = await channel.messages.fetch(options);
    if (!batch || batch.size === 0) break;

    messages.push(...batch.values());
    lastId = batch.last().id;

    if (batch.size < 100) break;
  }

  // Reverse so oldest messages appear first in transcript
  return messages.reverse();
}

/**
 * Generates a plain-text transcript, posts it to the transcripts channel, and returns summary info.
 * @param {import('discord.js').TextChannel} channel - The ticket channel being closed
 * @param {import('discord.js').User} closedBy - The user who clicked Close Case
 * @param {object} caseMetadata - Additional metadata (robloxUser, openedBy, etc.)
 * @returns {Promise<boolean>}
 */
async function generateAndPostTranscript(channel, closedBy, caseMetadata = {}) {
  const transcriptsChannelId = process.env.TRANSCRIPTS_CHANNEL_ID;
  if (!transcriptsChannelId) {
    console.warn('[Transcript] TRANSCRIPTS_CHANNEL_ID is not configured in .env.');
  }

  const transcriptsChannel = transcriptsChannelId
    ? channel.guild.channels.cache.get(transcriptsChannelId) || (await channel.guild.channels.fetch(transcriptsChannelId).catch(() => null))
    : null;

  const messages = await fetchAllMessages(channel);

  let transcriptText = `=====================================================\n`;
  transcriptText += `   ${config.firmName.toUpperCase()} - CASE TRANSCRIPT\n`;
  transcriptText += `=====================================================\n`;
  transcriptText += `Case Channel:    #${channel.name}\n`;
  transcriptText += `Roblox User:     ${caseMetadata.robloxUser || 'N/A'}\n`;
  transcriptText += `Discord Client:  ${caseMetadata.clientTag || 'N/A'} (ID: ${caseMetadata.clientId || 'N/A'})\n`;
  transcriptText += `Closed By:       ${closedBy.tag} (ID: ${closedBy.id})\n`;
  transcriptText += `Closed At:       ${new Date().toUTCString()}\n`;
  transcriptText += `Total Messages:  ${messages.length}\n`;
  transcriptText += `=====================================================\n\n`;

  for (const msg of messages) {
    const timestamp = msg.createdAt.toISOString().replace('T', ' ').slice(0, 19);
    const author = `${msg.author.tag} (${msg.author.id})`;
    transcriptText += `[${timestamp}] ${author}:\n`;

    if (msg.content) {
      transcriptText += `  ${msg.content}\n`;
    }

    if (msg.embeds && msg.embeds.length > 0) {
      for (const embed of msg.embeds) {
        transcriptText += `  [EMBED] Title: "${embed.title || 'Untitled'}" - ${embed.description ? embed.description.replace(/\n/g, ' ') : ''}\n`;
      }
    }

    if (msg.attachments && msg.attachments.size > 0) {
      for (const [, att] of msg.attachments) {
        transcriptText += `  [ATTACHMENT] ${att.name} (${att.url})\n`;
      }
    }

    transcriptText += '\n';
  }

  const sanitizedChannelName = channel.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const fileName = `transcript-${sanitizedChannelName}-${Date.now()}.txt`;
  const fileBuffer = Buffer.from(transcriptText, 'utf-8');
  const attachment = new AttachmentBuilder(fileBuffer, { name: fileName });

  if (transcriptsChannel && transcriptsChannel.isTextBased()) {
    const summaryEmbed = new EmbedBuilder()
      .setTitle(`📁 Case Closed | #${channel.name}`)
      .setDescription(`A consultation case has been concluded and archived.`)
      .addFields(
        { name: '👤 Roblox Username', value: `\`${caseMetadata.robloxUser || 'N/A'}\``, inline: true },
        { name: '💬 Discord Client', value: caseMetadata.clientId ? `<@${caseMetadata.clientId}>` : 'N/A', inline: true },
        { name: '🔒 Closed By', value: `<@${closedBy.id}>`, inline: true },
        { name: '📊 Message Count', value: `${messages.length} messages`, inline: true },
        { name: '⏰ Closed At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
      )
      .setColor(config.colors.gold)
      .setFooter({ text: `${config.firmName} Case Archive` })
      .setTimestamp();

    await transcriptsChannel.send({
      embeds: [summaryEmbed],
      files: [attachment]
    });
  }

  return true;
}

module.exports = { generateAndPostTranscript };
