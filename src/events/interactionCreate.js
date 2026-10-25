const { MessageFlags } = require('discord.js');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction) {
    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }

    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (command && command.autocomplete) {
        try {
          await command.autocomplete(interaction);
        } catch (error) {
          console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
          await interaction.respond([]).catch(() => {});
        }
      }
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
        flags: MessageFlags.Ephemeral
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
  if (interaction.customId.startsWith('search_')) {
    const searchCommand = interaction.client.commands.get('search');
    if (searchCommand && searchCommand.handleButton) {
      try {
        await searchCommand.handleButton(interaction);
      } catch (error) {
        console.error('Error handling search button:', error);
        try {
          await interaction.reply({
            content: '❌ Error loading results. Please try again.',
            flags: MessageFlags.Ephemeral
          });
        } catch (replyError) {
          console.error('Could not reply to button interaction:', replyError);
        }
      }
    }
    return;
  }

  if (interaction.customId.startsWith('backports_')) {
    const backportsCommand = interaction.client.commands.get('backports');
    if (backportsCommand && backportsCommand.handleButton) {
      const parts = interaction.customId.split('_');
      const action = parts[1]; // 'prev' or 'next'
      const page = parts[2] || '0';
      const encodedSearch = parts[3] || '';

      try {
        await backportsCommand.handleButton(interaction, action, page, encodedSearch);
      } catch (error) {
        console.error('Error handling backports button:', error);
        try {
          await interaction.update({
            content: '❌ Error loading backports. Please try again.',
            components: []
          });
        } catch (updateError) {
          console.error('Could not update button interaction:', updateError);
        }
      }
    }
    return;
  }

  if (interaction.customId.startsWith('random_')) {
    const randomCommand = interaction.client.commands.get('random-plugin');
    if (randomCommand && randomCommand.handleRandomButton) {
      const parts = interaction.customId.split('_');
      const action = parts[1]; // 'prev' or 'next'
      const page = parts[2] || '0';
      
      try {
        await randomCommand.handleRandomButton(interaction, action, page);
      } catch (error) {
        console.error('Error handling random button:', error);
        try {
          await interaction.update({
            content: '❌ Error loading plugin. Please try again.',
            components: []
          });
        } catch (updateError) {
          console.error('Could not update button interaction:', updateError);
        }
      }
    }
    return;
  }

  if (interaction.customId.startsWith('reviews_')) {
    const reviewsCommand = interaction.client.commands.get('plugin-reviews');
    if (reviewsCommand && reviewsCommand.handleButton) {
      const parts = interaction.customId.split('_');
      const action = parts[1]; // 'prev' or 'next'
      const page = parts[2] || '0';
      const type = parts[3] || 'user'; // 'plugin' or 'user'
      const identifier = parts[4] || '';
      const sortBy = parts[5] || 'date';
      
      try {
        await reviewsCommand.handleButton(interaction, action, page, type, identifier, sortBy);
      } catch (error) {
        console.error('Error handling reviews button:', error);
        try {
          await interaction.update({
            content: '❌ Error loading reviews. Please try again.',
            components: []
          });
        } catch (updateError) {
          console.error('Could not update button interaction:', updateError);
        }
      }
    }
    return;
  }
}
