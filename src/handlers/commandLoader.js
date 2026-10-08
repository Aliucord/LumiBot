const fs = require('fs');
const path = require('path');
const { Collection, ApplicationIntegrationType, InteractionContextType } = require('discord.js');

// Commands in these folders rely on guild members/permissions, so they stay server-only
const GUILD_ONLY_DIRS = ['admin', 'moderation'];

function applyContexts(command, dir) {
  const guildOnly = command.guildOnly || GUILD_ONLY_DIRS.includes(path.basename(dir));
  if (guildOnly) {
    command.data
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
      .setContexts(InteractionContextType.Guild);
  } else {
    // Usable in any server, the bot's DMs and group DMs, and as a user-installed app
    command.data
      .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall)
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel);
  }
}

function loadCommands(client) {
  client.commands = new Collection();

  const commandsPath = path.join(__dirname, '..', 'commands');
  const commands = [];

  function loadFromDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        loadFromDir(entryPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const command = require(entryPath);
        if ('data' in command && 'execute' in command) {
          applyContexts(command, dir);
          client.commands.set(command.data.name, command);
          if (typeof command.data.toJSON === 'function') {
            commands.push(command.data.toJSON());
          }
          console.log(`Loaded command: ${command.data.name}`);
        } else {
          console.warn(`Command at ${entryPath} is missing "data" or "execute" property`);
        }
      }
    }
  }

  loadFromDir(commandsPath);
  return commands;
}

module.exports = { loadCommands };
