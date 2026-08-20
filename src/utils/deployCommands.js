const { REST, Routes, SlashCommandBuilder, ChannelType } = require('discord.js');
const config = require('../../config.json');

const assignCommand = new SlashCommandBuilder()
  .setName('assign')
  .setDescription('Assign a case to a user or judicial officer')
  .addUserOption(option =>
    option.setName('user').setDescription('The user or officer to assign').setRequired(true)
  );

const appearCommand = new SlashCommandBuilder()
  .setName('appear')
  .setDescription('Request an official legal appearance on a pending or ongoing case')
  .addChannelOption(option =>
    option.setName('case')
      .setDescription('Select case channel (#partyA-v-partyB)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('party').setDescription('Your formal appearance role')
      .setRequired(true)
      .addChoices(
        { name: 'Lead Counsel', value: 'Lead Counsel' },
        { name: 'Co-Counsel / Defense Attorney', value: 'Co-Counsel / Defense Attorney' },
        { name: 'Prosecutor / Assistant DA', value: 'Prosecutor / Assistant DA' },
        { name: 'Plaintiff / Petitioner', value: 'Plaintiff / Petitioner' },
        { name: 'Defendant / Respondent', value: 'Defendant / Respondent' },
        { name: 'Witness', value: 'Witness' },
        { name: 'Amicus Curiae (Friend of Court)', value: 'Amicus Curiae' },
        { name: 'Party in Interest / Observer', value: 'Party in Interest' }
      )
  );

const fileCommand = new SlashCommandBuilder()
  .setName('file')
  .setDescription('File a document inside the case channel')
  .addStringOption(option =>
    option.setName('title').setDescription('Document Title / Description').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('link1').setDescription('Filing Document Link 1').setRequired(false)
  )
  .addStringOption(option =>
    option.setName('link2').setDescription('Filing Document Link 2').setRequired(false)
  )
  .addStringOption(option =>
    option.setName('link3').setDescription('Filing Document Link 3').setRequired(false)
  );

const rulingCommand = new SlashCommandBuilder()
  .setName('ruling')
  .setDescription('Issue a judicial ruling inside the case channel (Judge only)')
  .addStringOption(option =>
    option.setName('title').setDescription('Ruling Title / Summary').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('link1').setDescription('Ruling Document Link 1').setRequired(false)
  )
  .addStringOption(option =>
    option.setName('link2').setDescription('Ruling Document Link 2').setRequired(false)
  )
  .addStringOption(option =>
    option.setName('link3').setDescription('Ruling Document Link 3').setRequired(false)
  );

const archiveCommand = new SlashCommandBuilder()
  .setName('archive')
  .setDescription('Archive case channel after 15 minutes with transcript export');

const certifyBarCommand = new SlashCommandBuilder()
  .setName('certify-bar')
  .setDescription('Log a candidate bar admission certification to channel 1539839511544991785')
  .addStringOption(option =>
    option.setName('user').setDescription('Roblox Username').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('score').setDescription('Bar Exam Score percentage (e.g. 79.11%)').setRequired(true)
  )
  .addStringOption(option =>
    option.setName('roblox_id').setDescription('Roblox User ID (e.g. 8223519700)').setRequired(true)
  );

const commands = [
  assignCommand.toJSON(),
  appearCommand.toJSON(),
  fileCommand.toJSON(),
  rulingCommand.toJSON(),
  archiveCommand.toJSON(),
  certifyBarCommand.toJSON()
];

/**
 * Registers slash commands with Discord REST API across target guilds.
 * @param {import('discord.js').Client} client 
 */
async function registerCommands(client) {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.CLIENT_ID || client.user.id;

  if (!token) {
    console.warn('[Commands] Missing DISCORD_TOKEN. Slash commands not registered.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  // Register in Judiciary Guild
  if (config.judiciaryGuildId) {
    try {
      console.log(`[Commands] Registering slash commands for Judiciary Guild (${config.judiciaryGuildId})...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, config.judiciaryGuildId),
        { body: commands }
      );
      console.log('[Commands] Judiciary Guild commands registered!');
    } catch (err) {
      console.error('[Commands Error] Judiciary Guild:', err.message);
    }
  }

  // Register in State Bar Guild
  if (config.stateBarGuildId) {
    try {
      console.log(`[Commands] Registering slash commands for State Bar Guild (${config.stateBarGuildId})...`);
      await rest.put(
        Routes.applicationGuildCommands(clientId, config.stateBarGuildId),
        { body: commands }
      );
      console.log('[Commands] State Bar Guild commands registered!');
    } catch (err) {
      console.error('[Commands Error] State Bar Guild:', err.message);
    }
  }
}

module.exports = { registerCommands };
