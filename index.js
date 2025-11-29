const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder } = require('discord.js');
const express = require('express');

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
  console.error('Error: DISCORD_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

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
      .setDescription('Get a random Minky cat image')
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
      await interaction.reply({
        content: "Here's a random Minky 🐱",
        files: ["https://minky.materii.dev"]
      });
    } catch (err) {
      console.error(err);
      await interaction.reply('❌ Failed to fetch Minky image.');
    }
  }
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.login(TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is alive!'));

app.listen(PORT, () => console.log(`Webserver running on port ${PORT}`));
