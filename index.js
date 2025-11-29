const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const responders = [];

client.once('clientReady', async () => {
  console.log(`Logged in as ${client.user.tag}`);

  client.user.setPresence({
    activities: [],
    status: 'online'
  });

  console.log("BotGhost status removed!");

  const commands = [
    new SlashCommandBuilder()
      .setName('minky')
      .setDescription('Get a random Minky cat image'),
    new SlashCommandBuilder()
      .setName('addresponder')
      .setDescription('Add a new autoresponder')
      .addStringOption(option =>
        option.setName('trigger')
          .setDescription('Trigger phrase')
          .setRequired(true))
      .addStringOption(option =>
        option.setName('response')
          .setDescription('Response message')
          .setRequired(true))
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('Optional channel restriction')
          .setRequired(false))
  ];

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  try {
    console.log('Registering slash commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands }
    );
    console.log('Slash commands registered!');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'minky') {
    try {
      const imageUrl = 'https://minky.materii.dev';

      await interaction.reply({
        embeds: [{
          title: "Here's a random Minky 🐱",
          image: { url: imageUrl },
          color: 0xFFC0CB
        }]
      });
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Failed to fetch Minky image.');
    }
  }

  if (interaction.commandName === 'addresponder') {
    const trigger = interaction.options.getString('trigger').toLowerCase();
    const response = interaction.options.getString('response');
    const channel = interaction.options.getChannel('channel');

    responders.push({
      trigger,
      response,
      channelId: channel?.id || null
    });

    await interaction.reply(`✅ Autoresponder added for trigger: "${trigger}"${channel ? ` in ${channel}` : ''}`);
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('messageCreate', (message) => {
  if (message.author.bot) return;

  for (const r of responders) {
    const matches = message.content.toLowerCase().includes(r.trigger);
    const channelMatch = !r.channelId || message.channel.id === r.channelId;

    if (matches && channelMatch) {
      message.reply(r.response);
      break;
    }
  }
});

client.login(TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));

app.listen(PORT, () => console.log(`Webserver running on port ${PORT}`));
