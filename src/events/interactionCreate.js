const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType
} = require('discord.js');
const config = require('../../config.json');
const { generateAndPostTranscript } = require('../utils/transcriptGenerator');

// Temporary in-memory cache for filings data pending clerk review
const pendingFilings = new Map();

/**
 * Generates an authentic case code (e.g. CR-101, CV-202, SW-303)
 */
function generateCaseCode(type) {
  const prefixMap = {
    'Criminal': 'CR',
    'Civil': 'CV',
    'Expungement': 'EX',
    'Supreme Court Appeal': 'SA',
    'Arrest Warrant': 'AW',
    'Search Warrant': 'SW'
  };
  const prefix = prefixMap[type] || 'CS';
  const num = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${num}`;
}

/**
 * Handles all slash commands, button interactions, and modal submissions.
 * @param {import('discord.js').Interaction} interaction
 */
async function handleInteraction(interaction) {
  try {
    const guildIcon = interaction.guild ? interaction.guild.iconURL() : null;

    // =========================================================================
    // 1. SLASH COMMANDS
    // =========================================================================
    if (interaction.isChatInputCommand()) {
      const { commandName } = interaction;

      // A. /assign user:
      if (commandName === 'assign') {
        const targetUser = interaction.options.getUser('user', true);
        const executor = interaction.user;

        // Grant channel permissions if inside a case channel
        if (interaction.channel && interaction.channel.type === ChannelType.GuildText) {
          await interaction.channel.permissionOverwrites.create(targetUser, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(e => console.warn(`[Assign Permissions Warning]: ${e.message}`));
        }

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Case Assigned')
          .setDescription(`This case has been assigned to <@${targetUser.id}>\n\n**Executor:** <@${executor.id}>`)
          .setColor('#5C9CE6');

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // B. /appear case: party:
      if (commandName === 'appear') {
        const caseCodeStr = interaction.options.getString('case', true);
        const partyType = interaction.options.getString('party', true);
        const applicant = interaction.user;

        const requestId = `appear_${Date.now()}`;

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Appearance Request')
          .setDescription(`<@${applicant.id}> (${applicant.username}) is requesting to appear as **${partyType}** on **${caseCodeStr}**`)
          .setColor('#5C9CE6');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`appear_approve_${applicant.id}_${interaction.channelId}`).setLabel('Approve').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`appear_deny_${applicant.id}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({ embeds: [embed], components: [row] });
        return;
      }

      // C. /file title: link1: link2: link3:
      if (commandName === 'file') {
        const title = interaction.options.getString('title', true);
        const link1 = interaction.options.getString('link1');
        const link2 = interaction.options.getString('link2');
        const link3 = interaction.options.getString('link3');
        const executor = interaction.user;

        let linksFormatted = [];
        if (link1) linksFormatted.push(`[Filing 1](${link1})`);
        if (link2) linksFormatted.push(`[Filing 2](${link2})`);
        if (link3) linksFormatted.push(`[Filing 3](${link3})`);

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Document Filed')
          .setDescription(`**Title:** ${title}\n\n${linksFormatted.length > 0 ? linksFormatted.join(' | ') : '*No external link provided*'}\n\n**Executor:** ${executor.username}`)
          .setColor('#5C9CE6');

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // D. /ruling title: link1: link2: link3:
      if (commandName === 'ruling') {
        const title = interaction.options.getString('title', true);
        const link1 = interaction.options.getString('link1');
        const link2 = interaction.options.getString('link2');
        const link3 = interaction.options.getString('link3');
        const executor = interaction.user;

        let linksFormatted = [];
        if (link1) linksFormatted.push(`[Ruling 1](${link1})`);
        if (link2) linksFormatted.push(`[Ruling 2](${link2})`);
        if (link3) linksFormatted.push(`[Ruling 3](${link3})`);

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Judicial Ruling Issued')
          .setDescription(`**Title:** ${title}\n\n${linksFormatted.length > 0 ? linksFormatted.join(' | ') : '*No external link provided*'}\n\n**Executor:** ${executor.username}`)
          .setColor('#5C9CE6');

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // E. /archive
      if (commandName === 'archive') {
        await interaction.reply({
          content: 'Notice: This case channel will archive and close in 15 minutes. A full transcript is being generated.'
        });

        setTimeout(async () => {
          try {
            if (interaction.channel) {
              const archiveChannelId = config.archiveChannelId;
              const archiveChannel = await interaction.client.channels.fetch(archiveChannelId).catch(() => null);
              
              if (archiveChannel && archiveChannel.isTextBased()) {
                const messages = await interaction.channel.messages.fetch({ limit: 100 }).catch(() => null);
                let transcriptText = `=======================================================\nCASE CHANNEL TRANSCRIPT: #${interaction.channel.name}\n=======================================================\n\n`;
                if (messages) {
                  messages.reverse().forEach(m => {
                    transcriptText += `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}\n`;
                  });
                }

                await archiveChannel.send({
                  content: `Archive Transcript for Case Channel **#${interaction.channel.name}**:`,
                  files: [{ attachment: Buffer.from(transcriptText, 'utf-8'), name: `${interaction.channel.name}-transcript.txt` }]
                });
              }

              await interaction.channel.delete('Case channel archived after 15-minute countdown.').catch(e => console.warn(`[Archive Delete Warning]: ${e.message}`));
            }
          } catch (err) {
            console.error('[Archive Error]:', err.message);
          }
        }, 15 * 60 * 1000); // 15 minutes
        return;
      }

      // F. /certify-bar user: score: roblox_id:
      if (commandName === 'certify-bar') {
        const username = interaction.options.getString('user', true);
        const score = interaction.options.getString('score', true);
        const robloxId = interaction.options.getString('roblox_id', true);

        const logChannelId = config.stateBarCertLogChannelId;
        const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);

        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle('Certification Log')
            .setDescription(`This log hereby certifies that [${username}](https://www.roblox.com/users/${robloxId}/profile) has been duly admitted to the Bar of Harrison County, passing with a score of \`\`${score}\`\`.`)
            .setColor('#2E7D32');

          await logChannel.send({ embeds: [embed] });
          await interaction.reply({ content: `Successfully posted certification log for ${username} to <#${logChannelId}>`, ephemeral: true });
        } else {
          await interaction.reply({ content: `Error: Could not fetch certification log channel (${logChannelId}).`, ephemeral: true });
        }
        return;
      }
    }

    // =========================================================================
    // 2. BUTTON INTERACTIONS (FILING PANEL & CLERK ACTIONS)
    // =========================================================================
    if (interaction.isButton()) {
      const { customId } = interaction;

      // Civil Choice Trigger: Person vs Entity
      if (customId === 'file_btn_civil') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('civil_type_person').setLabel('Person').setStyle(ButtonStyle.Primary),
          new ButtonBuilder().setCustomId('civil_type_entity').setLabel('Entity').setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content: 'Is the respondent a person or an entity (e.g. a government department)?',
          components: [row],
          ephemeral: true
        });
        return;
      }

      // Modal Triggers for Civil (Person / Entity)
      if (customId === 'civil_type_person') {
        const modal = new ModalBuilder().setCustomId('filing_modal_civil_person').setTitle('Civil Claim (Person)');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('petitioner').setLabel('Petitioner').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('respondent').setLabel('Respondent').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('filing_link').setLabel('Google Filing link').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
      }

      if (customId === 'civil_type_entity') {
        const modal = new ModalBuilder().setCustomId('filing_modal_civil_entity').setTitle('Civil Claim (Entity)');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('petitioner').setLabel('Petitioner').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('respondent').setLabel('Respondent').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('additional_respondents').setLabel('Additional Respondent(s) if any').setStyle(TextInputStyle.Short).setRequired(false)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('filing_link').setLabel('Google Filing link').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
      }

      // Modals for Standard Filings (Criminal, Expungement, Supreme Court Appeal, Arrest Warrant, Search Warrant)
      const standardModalMap = {
        'file_btn_criminal': { id: 'filing_modal_Criminal', title: 'Criminal Complaint' },
        'file_btn_expungement': { id: 'filing_modal_Expungement', title: 'Expungement Petition' },
        'file_btn_supreme_appeal': { id: 'filing_modal_Supreme Court Appeal', title: 'Supreme Court Appeal' },
        'file_btn_arrest_warrant': { id: 'filing_modal_Arrest Warrant', title: 'Arrest Warrant Request' },
        'file_btn_search_warrant': { id: 'filing_modal_Search Warrant', title: 'Search Warrant Request' }
      };

      if (standardModalMap[customId]) {
        const modalData = standardModalMap[customId];
        const modal = new ModalBuilder().setCustomId(modalData.id).setTitle(modalData.title);
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('defendant').setLabel('Defendant').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('filing_link').setLabel('Google Filing link').setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
      }

      // Clerk Approval Interaction
      if (customId.startsWith('clerk_approve_')) {
        await interaction.deferUpdate();
        const filingId = customId.replace('clerk_approve_', '');
        const data = pendingFilings.get(filingId);

        if (!data) {
          await interaction.followUp({ content: 'Error: Filing data expired or already processed.', ephemeral: true });
          return;
        }

        const caseCode = generateCaseCode(data.type);
        const categoryId = config.pendingCasesCategoryId;
        const guild = interaction.guild;

        let newChannelName = `${caseCode.toLowerCase()}-${(data.defendant || data.respondent || 'case').toLowerCase().replace(/[^a-z0-9]/g, '')}`.substring(0, 30);

        // Create case channel in Pending Cases Category
        const caseChannel = await guild.channels.create({
          name: newChannelName,
          type: ChannelType.GuildText,
          parent: categoryId || undefined,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: data.applicant.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
          ]
        });

        // Notify user in plain text
        try {
          const applicantMember = await guild.members.fetch(data.applicant.id).catch(() => null);
          if (applicantMember) {
            await applicantMember.send(`case approved #${caseCode} (<#${caseChannel.id}>)`).catch(() => null);
          }
        } catch (e) {}

        // Send Case Information Embed into the newly created case channel
        const infoEmbed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Case Information')
          .setColor('#000080')
          .addFields(
            { name: 'Case Type', value: data.type, inline: true },
            { name: 'Case Code', value: caseCode, inline: true },
            { name: 'Prosecution', value: data.type === 'Criminal' ? 'People' : (data.petitioner || 'N/A'), inline: true },
            { name: 'Defendant', value: data.defendant || data.respondent || 'N/A', inline: true },
            { name: 'Prosecuting Office', value: "Harrison County District Attorney's Office (HCDAO)", inline: true },
            { name: 'Filed By', value: `<@${data.applicant.id}>`, inline: true },
            { name: 'Filing', value: `[Filing](${data.filingLink})`, inline: false }
          );

        await caseChannel.send({ embeds: [infoEmbed] });

        // Update Clerk Review Embed
        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#2E7D32')
          .addFields({ name: 'Status', value: `Approved by <@${interaction.user.id}> | Case Code: \`${caseCode}\` (<#${caseChannel.id}>)` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });
        pendingFilings.delete(filingId);
        return;
      }

      // Clerk Denial Interaction
      if (customId.startsWith('clerk_deny_')) {
        await interaction.deferUpdate();
        const filingId = customId.replace('clerk_deny_', '');
        const data = pendingFilings.get(filingId);

        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#C62828')
          .addFields({ name: 'Status', value: `Denied by <@${interaction.user.id}>` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });

        if (data && data.applicant) {
          try {
            const applicantMember = await interaction.guild.members.fetch(data.applicant.id).catch(() => null);
            if (applicantMember) {
              await applicantMember.send(`Your filing for ${data.type} was denied by court clerks.`).catch(() => null);
            }
          } catch (e) {}
        }
        pendingFilings.delete(filingId);
        return;
      }

      // Appearance Request Approval
      if (customId.startsWith('appear_approve_')) {
        await interaction.deferUpdate();
        const parts = customId.split('_');
        const applicantId = parts[2];

        // Grant channel permissions
        if (interaction.channel) {
          await interaction.channel.permissionOverwrites.create(applicantId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(e => console.warn(`[Appear Perms Warning]: ${e.message}`));
        }

        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setFooter({ text: `Approved by ${interaction.user.username}` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });
        return;
      }

      // Appearance Request Denial
      if (customId.startsWith('appear_deny_')) {
        await interaction.deferUpdate();
        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setFooter({ text: `Denied by ${interaction.user.username}` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });
        return;
      }
    }

    // =========================================================================
    // 3. MODAL SUBMISSIONS (COURT FILINGS)
    // =========================================================================
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      if (customId.startsWith('filing_modal_')) {
        await interaction.deferReply({ ephemeral: true });

        let type = 'Court Filing';
        let petitioner = null;
        let respondent = null;
        let defendant = null;
        let additionalRespondents = null;
        let filingLink = null;

        if (customId === 'filing_modal_civil_person') {
          type = 'Civil';
          petitioner = interaction.fields.getTextInputValue('petitioner').trim();
          respondent = interaction.fields.getTextInputValue('respondent').trim();
          filingLink = interaction.fields.getTextInputValue('filing_link').trim();
        } else if (customId === 'filing_modal_civil_entity') {
          type = 'Civil';
          petitioner = interaction.fields.getTextInputValue('petitioner').trim();
          respondent = interaction.fields.getTextInputValue('respondent').trim();
          additionalRespondents = interaction.fields.getTextInputValue('additional_respondents')?.trim() || 'None';
          filingLink = interaction.fields.getTextInputValue('filing_link').trim();
        } else {
          type = customId.replace('filing_modal_', '');
          defendant = interaction.fields.getTextInputValue('defendant').trim();
          filingLink = interaction.fields.getTextInputValue('filing_link').trim();
        }

        const filingId = `filing_${Date.now()}`;
        const filingData = {
          id: filingId,
          type,
          petitioner,
          respondent,
          defendant,
          additionalRespondents,
          filingLink,
          applicant: interaction.user
        };

        pendingFilings.set(filingId, filingData);

        // Send Embed to Clerk Review Channel (1538067231236161616)
        const clerkChannelId = config.clerkReviewChannelId;
        const clerkChannel = await interaction.client.channels.fetch(clerkChannelId).catch(() => null);

        if (clerkChannel && clerkChannel.isTextBased()) {
          const clerkEmbed = new EmbedBuilder()
            .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
            .setTitle(`New Court Filing: ${type}`)
            .setColor('#000080')
            .addFields(
              { name: 'Filed By', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
              { name: 'Filing Type', value: type, inline: true }
            );

          if (defendant) clerkEmbed.addFields({ name: 'Defendant', value: defendant, inline: true });
          if (petitioner) clerkEmbed.addFields({ name: 'Petitioner', value: petitioner, inline: true });
          if (respondent) clerkEmbed.addFields({ name: 'Respondent', value: respondent, inline: true });
          if (additionalRespondents) clerkEmbed.addFields({ name: 'Additional Respondent(s)', value: additionalRespondents, inline: true });

          clerkEmbed.addFields({ name: 'Filing Link', value: `[Filing Link](${filingLink})`, inline: false });

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`clerk_approve_${filingId}`).setLabel('Approve').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`clerk_deny_${filingId}`).setLabel('Deny').setStyle(ButtonStyle.Danger)
          );

          await clerkChannel.send({ embeds: [clerkEmbed], components: [actionRow] });
        }

        await interaction.editReply({
          content: 'Your court filing has been submitted to clerks for review. You will receive a notification once approved.'
        });
      }
    }

  } catch (error) {
    console.error('[Interaction Error]:', error);
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: 'An unexpected error occurred processing your request.', ephemeral: true });
      } else {
        await interaction.followUp({ content: 'An unexpected error occurred processing your request.', ephemeral: true });
      }
    } catch (e) {}
  }
}

module.exports = { handleInteraction };
