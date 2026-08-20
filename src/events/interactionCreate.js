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
const fs = require('fs');
const path = require('path');
const config = require('../../config.json');
const { generateAndPostTranscript } = require('../utils/transcriptGenerator');
const { validateRobloxUsername } = require('../utils/roblox');
const {
  startDmExamSession,
  sendNextDmExamQuestion,
  handleDmExamAnswer
} = require('../utils/dmExamManager');
const { getRoster, addBarLicense } = require('../utils/rosterStore');

// Temporary in-memory cache for filings data pending clerk review
const pendingFilings = new Map();
const COUNTERS_FILE = path.join(__dirname, '../../case_counters.json');

function getCaseCounters() {
  try {
    if (fs.existsSync(COUNTERS_FILE)) {
      return JSON.parse(fs.readFileSync(COUNTERS_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

function saveCaseCounters(counters) {
  try {
    fs.writeFileSync(COUNTERS_FILE, JSON.stringify(counters, null, 2), 'utf-8');
  } catch (e) {}
}

/**
 * Generates a sequential case code (e.g. CV-001-26, CR-001-26, EX-001-26)
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
  const yearYY = String(new Date().getFullYear()).slice(-2);

  const counters = getCaseCounters();
  const key = `${prefix}-${yearYY}`;
  const nextNum = (counters[key] || 0) + 1;
  counters[key] = nextNum;
  saveCaseCounters(counters);

  const paddedNum = String(nextNum).padStart(3, '0');
  return `${prefix}-${paddedNum}-${yearYY}`;
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
          .setColor('#6B21A8');

        await interaction.reply({ embeds: [embed] });
        return;
      }

      // B. /appear case: party:
      if (commandName === 'appear') {
        const caseCodeStr = interaction.options.getString('case', true);
        const partyType = interaction.options.getString('party', true);
        const applicant = interaction.user;

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Notice of Formal Legal Appearance')
          .setColor('#6B21A8')
          .addFields(
            { name: 'Applicant Attorney / Party', value: `<@${applicant.id}> (${applicant.username})`, inline: true },
            { name: 'Appearance Role', value: partyType, inline: true },
            { name: 'Case Reference', value: caseCodeStr, inline: true },
            { name: 'Status', value: 'Pending Judicial Authorization', inline: false }
          )
          .setFooter({ text: 'State of Mayflower Judicial Branch' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`appear_approve_${applicant.id}`).setLabel('Approve Appearance').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`appear_deny_${applicant.id}`).setLabel('Deny Appearance').setStyle(ButtonStyle.Danger)
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
          .setColor('#6B21A8');

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
          .setColor('#6B21A8');

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

      // F. /certify-bar user: score:
      if (commandName === 'certify-bar') {
        await interaction.deferReply({ ephemeral: true });
        const username = interaction.options.getString('user', true);
        const score = interaction.options.getString('score', true);

        const robloxRes = await validateRobloxUsername(username).catch(() => ({ valid: false }));
        const resolvedUsername = robloxRes.username || username;
        const profileUrl = robloxRes.userId
          ? `https://www.roblox.com/users/${robloxRes.userId}/profile`
          : `https://www.roblox.com/users/profile?username=${encodeURIComponent(username)}`;

        const logChannelId = config.stateBarCertLogChannelId;
        const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);

        if (logChannel && logChannel.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle('Certification Log')
            .setDescription(`This log hereby certifies that [${resolvedUsername}](${profileUrl}) has been duly admitted to the Bar of Harrison County, passing with a score of \`\`${score}\`\`.`)
            .setColor('#2E7D32');

          await logChannel.send({ embeds: [embed] });
          await interaction.editReply({ content: `Successfully posted certification log for ${resolvedUsername} to <#${logChannelId}>` });
        } else {
          await interaction.editReply({ content: `Error: Could not fetch certification log channel (${logChannelId}).` });
        }
        return;
      }
    }

    // =========================================================================
    // 2. BUTTON INTERACTIONS (FILING PANEL, STATE BAR PORTAL & CLERK ACTIONS)
    // =========================================================================
    if (interaction.isButton()) {
      const { customId } = interaction;

      // DM Exam Question Answer Buttons: dm_exam_ans_{qIndex}_{choice}
      if (customId.startsWith('dm_exam_ans_')) {
        const parts = customId.split('_');
        const qIndex = parseInt(parts[3], 10);
        const selectedChoice = parts[4];
        await handleDmExamAnswer(interaction, qIndex, selectedChoice);
        return;
      }

      // State Bar Portal: Take Exam via DMs (Auto-fills Discord Tag)
      if (customId === 'bar_exam_via_dms') {
        const discordTag = interaction.user.tag || interaction.user.username;
        const modal = new ModalBuilder().setCustomId('bar_exam_dm_modal').setTitle('State Bar Exam Registration');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox_user').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_user').setLabel('Discord Username').setValue(discordTag).setStyle(TextInputStyle.Short).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
      }

      // State Bar Portal: Transfer via DMs (Auto-fills Discord Tag)
      if (customId === 'bar_transfer_via_dms') {
        const discordTag = interaction.user.tag || interaction.user.username;
        const modal = new ModalBuilder().setCustomId('bar_transfer_dm_modal').setTitle('Reciprocal Bar Transfer Application');
        modal.addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox_user').setLabel('Roblox Username').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('discord_user').setLabel('Discord Username').setValue(discordTag).setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('state_from').setLabel('State / Jurisdiction From').setPlaceholder('e.g. State of Firestone').setStyle(TextInputStyle.Short).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('evidence').setLabel('Proof / Evidence of Active Certification').setPlaceholder('Link to bar license certificate...').setStyle(TextInputStyle.Paragraph).setRequired(true))
        );
        await interaction.showModal(modal);
        return;
      }

      // State Bar Portal: View Bar Roster (Ephemeral - Only You Can See)
      if (customId === 'bar_view_roster') {
        const roster = getRoster();

        const rosterFormatted = roster.length > 0
          ? roster.map((r, i) => `**${i + 1}. ${r.name}**\n├ License (SBN): \`${r.sbn}\`\n├ Status: \`${r.status}\` \n└ Date Admitted: \`${r.date}\``).join('\n\n')
          : '*No active bar licenses recorded.*';

        const embed = new EmbedBuilder()
          .setAuthor({ name: 'State Bar of Harrison County', iconURL: guildIcon || undefined })
          .setTitle('Official Attorney Bar Roster')
          .setColor('#6B21A8')
          .setDescription(`Total Admitted Attorneys: **${roster.length}**\n\n${rosterFormatted}`)
          .setFooter({ text: 'Official Public Record • Only Visible to You' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
        return;
      }

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
        const guild = interaction.guild;

        // Check if Warrant vs Court Case vs Bar Application
        const isWarrant = data.type === 'Arrest Warrant' || data.type === 'Search Warrant';
        const isBarApp = data.type === 'Bar Transfer' || data.type === 'Bar Exam Result';

        if (isBarApp) {
          // Bar Applications: Issue Certification Log in channel 1539839511544991785
          const robloxRes = await validateRobloxUsername(data.petitioner || data.robloxUser).catch(() => ({ valid: false }));
          const resolvedUsername = robloxRes.username || data.petitioner || data.robloxUser;
          const profileUrl = robloxRes.userId
            ? `https://www.roblox.com/users/${robloxRes.userId}/profile`
            : `https://www.roblox.com/users/profile?username=${encodeURIComponent(resolvedUsername)}`;

          const scoreStr = (data.stateFrom || '').match(/(\d+%)|(\d+\.\d+%)/)?.[0] || '100%';

          const logChannelId = config.stateBarCertLogChannelId;
          const logChannel = await interaction.client.channels.fetch(logChannelId).catch(() => null);

          if (logChannel && logChannel.isTextBased()) {
            const embed = new EmbedBuilder()
              .setTitle('Certification Log')
              .setDescription(`This log hereby certifies that [${resolvedUsername}](${profileUrl}) has been duly admitted to the Bar of Harrison County, passing with a score of \`\`${scoreStr}\`\`.`)
              .setColor('#2E7D32');

            await logChannel.send({ embeds: [embed] });
          }

          const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
            .setColor('#2E7D32')
            .addFields({ name: 'Status', value: `Admitted by Executive <@${interaction.user.id}>` });

          await interaction.message.edit({ embeds: [origEmbed], components: [] });
          pendingFilings.delete(filingId);
          return;
        }

        if (isWarrant) {
          // Warrants: Processed as standalone Judicial Warrant Authorizations
          const warrantEmbed = new EmbedBuilder()
            .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
            .setTitle(`Judicial Warrant Issued: ${data.type}`)
            .setColor('#2E7D32')
            .addFields(
              { name: 'Warrant Control Code', value: caseCode, inline: true },
              { name: 'Warrant Type', value: data.type, inline: true },
              { name: 'Subject / Target', value: data.defendant || 'N/A', inline: true },
              { name: 'Affiant / Applicant', value: `<@${data.applicant.id}>`, inline: true },
              { name: 'Issuing Judicial Officer', value: `Hon. <@${interaction.user.id}>`, inline: true },
              { name: 'Status', value: 'ACTIVE / EXECUTABLE WARRANT', inline: true },
              { name: 'Affidavit & Probable Cause', value: `[Filing Affidavit](${data.filingLink})`, inline: false }
            )
            .setFooter({ text: 'State of Mayflower Judicial Branch • Official Warrant Authorization' });

          await interaction.message.edit({ embeds: [warrantEmbed], components: [] });

          try {
            const applicantMember = await guild.members.fetch(data.applicant.id).catch(() => null);
            if (applicantMember) {
              await applicantMember.send(`warrant approved ${data.type} [${caseCode}] for target "${data.defendant}".`).catch(() => null);
            }
          } catch (e) {}

          pendingFilings.delete(filingId);
          return;
        }

        // Court Cases: Create case channel in Pending Cases Category
        const categoryId = config.pendingCasesCategoryId;
        let partyA = 'people';
        if (data.type !== 'Criminal') {
          partyA = (data.petitioner || data.applicant.username || 'petitioner').toLowerCase().replace(/[^a-z0-9]/g, '');
        }
        let partyB = (data.defendant || data.respondent || 'respondent').toLowerCase().replace(/[^a-z0-9]/g, '');
        let newChannelName = `${partyA}-v-${partyB}`.substring(0, 32);

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
            await applicantMember.send(`case approved <#${caseChannel.id}>`).catch(() => null);
          }
        } catch (e) {}

        // Send Case Information Embed into the newly created case channel
        const infoEmbed = new EmbedBuilder()
          .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
          .setTitle('Case Information')
          .setColor('#6B21A8')
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
              await applicantMember.send(`Your filing/application for ${data.type} was denied by court clerks/executives.`).catch(() => null);
            }
          } catch (e) {}
        }
        pendingFilings.delete(filingId);
        return;
      }

      // Appearance Request Approval
      if (customId.startsWith('appear_approve_')) {
        await interaction.deferUpdate();
        const applicantId = customId.replace('appear_approve_', '');

        if (interaction.channel) {
          await interaction.channel.permissionOverwrites.create(applicantId, {
            ViewChannel: true,
            SendMessages: true,
            ReadMessageHistory: true
          }).catch(e => console.warn(`[Appear Perms Warning]: ${e.message}`));
        }

        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#2E7D32')
          .spliceFields(3, 1, { name: 'Status', value: `Approved by Hon. ${interaction.user.username}`, inline: false })
          .setFooter({ text: `Approved by Hon. ${interaction.user.username}` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });
        return;
      }

      // Appearance Request Denial
      if (customId.startsWith('appear_deny_')) {
        await interaction.deferUpdate();
        const origEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor('#C62828')
          .spliceFields(3, 1, { name: 'Status', value: `Denied by Hon. ${interaction.user.username}`, inline: false })
          .setFooter({ text: `Denied by Hon. ${interaction.user.username}` });

        await interaction.message.edit({ embeds: [origEmbed], components: [] });
        return;
      }
    }

    // =========================================================================
    // 3. MODAL SUBMISSIONS (COURT FILINGS & STATE BAR PORTALS)
    // =========================================================================
    if (interaction.isModalSubmit()) {
      const { customId } = interaction;

      // State Bar Exam DM Modal -> Starts Interactive Question-by-Question Exam
      if (customId === 'bar_exam_dm_modal') {
        await interaction.deferReply({ ephemeral: true });
        const robloxUser = interaction.fields.getTextInputValue('roblox_user').trim();

        const session = startDmExamSession(interaction.user, robloxUser);

        try {
          await sendNextDmExamQuestion(interaction.user, interaction);
          await interaction.editReply({ content: `Exam session initiated! Please check your Direct Messages (<@${interaction.user.id}>) to begin Question 1 of 25.` });
        } catch (err) {
          await interaction.editReply({
            content: `Notice: Could not send DM to candidate. Please enable Direct Messages from server members, or take the exam directly on the website:\n👉 https://mysticwavezzz.github.io/statebar/`
          });
        }
        return;
      }

      // State Bar Transfer DM Modal
      if (customId === 'bar_transfer_dm_modal') {
        await interaction.deferReply({ ephemeral: true });
        const robloxUser = interaction.fields.getTextInputValue('roblox_user').trim();
        const discordUser = interaction.fields.getTextInputValue('discord_user').trim();
        const stateFrom = interaction.fields.getTextInputValue('state_from').trim();
        const evidence = interaction.fields.getTextInputValue('evidence').trim();

        const filingId = `transfer_${Date.now()}`;
        const filingData = {
          id: filingId,
          type: 'Bar Transfer',
          petitioner: robloxUser,
          respondent: stateFrom,
          defendant: stateFrom,
          evidence: evidence,
          filingLink: evidence,
          applicant: interaction.user
        };

        pendingFilings.set(filingId, filingData);

        const clerkChannelId = config.clerkReviewChannelId;
        const clerkChannel = await interaction.client.channels.fetch(clerkChannelId).catch(() => null);

        if (clerkChannel && clerkChannel.isTextBased()) {
          const clerkEmbed = new EmbedBuilder()
            .setAuthor({ name: 'State Bar of Harrison County', iconURL: guildIcon || undefined })
            .setTitle('Reciprocal Bar Transfer Application')
            .setColor('#6B21A8')
            .addFields(
              { name: 'Roblox Username', value: robloxUser, inline: true },
              { name: 'Discord Handle', value: `@${discordUser}`, inline: true },
              { name: 'State / Jurisdiction From', value: stateFrom, inline: true },
              { name: 'Proof of Active License', value: `[License Evidence Link](${evidence})`, inline: false }
            )
            .setFooter({ text: 'Submitted via State Bar DM Portal' });

          const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`clerk_approve_${filingId}`).setLabel('Approve Admission').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`clerk_deny_${filingId}`).setLabel('Deny Admission').setStyle(ButtonStyle.Danger)
          );

          await clerkChannel.send({ embeds: [clerkEmbed], components: [actionRow] });
        }

        await interaction.editReply({
          content: `SUCCESS: Your Reciprocal Bar Transfer Application for **${robloxUser}** has been submitted to the Executive Board for review.`
        });
        return;
      }

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

        const clerkChannelId = config.clerkReviewChannelId;
        const clerkChannel = await interaction.client.channels.fetch(clerkChannelId).catch(() => null);

        if (clerkChannel && clerkChannel.isTextBased()) {
          const clerkEmbed = new EmbedBuilder()
            .setAuthor({ name: 'State of Mayflower District Courts', iconURL: guildIcon || undefined })
            .setTitle(`New Court Filing: ${type}`)
            .setColor('#6B21A8')
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
