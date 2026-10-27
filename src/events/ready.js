const { REST, Routes, ActivityType } = require('discord.js');
const { loadAutoresponders } = require('../utils/db');
const path = require('path');
const { clearPluginCache, initializePluginCache } = require(path.join(__dirname, '../utils/plugins'));
const { clearThemeCache, initializeThemeCache } = require(path.join(__dirname, '../utils/themes'));

const activityTypes = {
  playing: ActivityType.Playing,
  streaming: ActivityType.Streaming,
  listening: ActivityType.Listening,
  watching: ActivityType.Watching,
  competing: ActivityType.Competing
};

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

    try {
      const commands = [];
      client.commands.forEach(command => {
        commands.push(command.data.toJSON());
      });

      console.log('Registering slash commands...');
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: commands }
      );
      console.log('Slash commands registered!');
    } catch (error) {
      console.error('Error registering commands:', error);
    }

    await loadAutoresponders();

    pluginsCommand.clearPluginCache();
    await pluginsCommand.initializePluginCache();
  }
};
