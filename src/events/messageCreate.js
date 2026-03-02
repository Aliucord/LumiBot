const { responders } = require('../utils/database');
const { sendMinkyToChannel } = require('../utils/helpers');
const { parseMessage } = require('../utils/prefixParser');
const { handleMessage: handleStickyMessage } = require('../utils/stickyManager');

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message) {
    if (message.author.bot) return;

    if (!message.guild) {
      await sendMinkyToChannel(message.channel);
      return;
    }

    await handleStickyMessage(message);

    const parsed = parseMessage(message);
    if (parsed) {
      const command = message.client.commands.get(parsed.commandName);
      if (command && command.executePrefix) {
        try {
          await command.executePrefix(message, parsed.args, parsed.rawArgs);
        } catch (error) {
          console.error(`Error executing prefix command ${parsed.commandName}:`, error);
          await message.reply('❌ There was an error executing this command.');
        }
        return;
      }
    }

    // Helper AI: respond to any message in any helper channel
    const aihelper = message.client.commands.get('aihelper');
    const helperChannels = aihelper && aihelper.getHelperChannels && aihelper.getHelperChannels(message.guild.id);
    if (aihelper && aihelper.executePrefix && helperChannels && helperChannels.size && helperChannels.has(message.channel.id)) {
      // Only respond if not a command (avoid double response)
      if (!parsed) {
        await aihelper.executePrefix(message, []);
        return;
      }
    }

    const guildResponders = responders[message.guild.id] || [];

    for (const r of guildResponders) {
      const matches = message.content.toLowerCase().includes(r.trigger);
      const channelMatch = !r.channelId || message.channel.id === r.channelId;

      if (matches && channelMatch) {
        await message.reply(r.response);
        return;
      }
    }
  }
};