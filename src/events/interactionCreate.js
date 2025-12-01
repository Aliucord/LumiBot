module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      const reply = {
        content: '❌ There was an error executing this command.',
        ephemeral: true
      };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  }
};

async function handleButton(interaction) {
  if (interaction.customId.startsWith('plugins_')) {
    const pluginsCommand = interaction.client.commands.get('plugins');
    if (pluginsCommand && pluginsCommand.handleButton) {
      const parts = interaction.customId.split('_');
      const action = parts[1];
      const page = parts[2] || '0';
      const searchBase64 = parts[3] || null;
      
      try {
        await pluginsCommand.handleButton(interaction, action, page, searchBase64);
      } catch (error) {
        console.error('Error handling plugins button:', error);
        await interaction.reply({
          content: '❌ Error loading plugins. Please try again.',
          ephemeral: true
        });
      }
    }
    return;
  }

  if (interaction.customId === 'install_android') {
    const isAliucord = interaction.guildId === '811255666990907402';
    
    if (isAliucord) {
      await interaction.reply({
        embeds: [{
          title: 'Aliucord Installation',
          description: '**Download the Manager:**\n\n' +
            '[Aliucord Manager](https://github.com/Aliucord/Manager/releases/latest)\n\n' +
            '*Use the manager to install and manage Aliucord*',
          color: 0x3DDC84
        }],
        ephemeral: true
      });
    } else {
      await interaction.reply({
        embeds: [{
          title: 'Android Installation',
          description: '**Choose your method:**\n\n' +
            '**Root with Xposed** → [KettuXposed](https://github.com/C0C0B01/KettuXposed/releases/latest)\n\n' +
            '**Non-root** → [KettuManager](https://github.com/C0C0B01/KettuManager/releases/latest)\n\n' +
            '*If you don\'t know what root is, go with KettuManager*',
          color: 0x3DDC84
        }],
        ephemeral: true
      });
    }
    return;
  }

  if (interaction.customId === 'install_ios') {
    await interaction.reply({
      embeds: [{
        title: 'iOS Installation',
        description: '**Choose your method:**\n\n' +
          '**Jailbroken** → [KettuTweak](https://github.com/C0C0B01/KettuTweak)\n\n' +
          '**Jailed** → [BTLoader](https://github.com/CloudySn0w/BTLoader)\n\n' +
          '*If you don\'t know what jailbreak is, go with BTLoader*',
        color: 0x007AFF
      }],
      ephemeral: true
    });
    return;
  }
}
