const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');


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
