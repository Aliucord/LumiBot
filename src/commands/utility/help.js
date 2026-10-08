const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available bot commands'),
  
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Aliucord Bot Commands')
      .setDescription('All available commands for the Aliucord community bot')
      .addFields(
        {
          name: '📚 Plugin Commands',
          value: '`/beginner` - How to install Aliucord, plugins and themes\n`/plugins [search]` - Browse all Aliucord plugins\n`/backports [search]` - Plugins that bring features from new Discord\n`/random-plugin` - Get a random plugin suggestion',
          inline: false
        },
        {
          name: '🎨 Theme Commands',
          value: '`/themes [search]` - Browse all Aliucord themes',
          inline: false
        },
        {
          name: '🐱 Fun Commands',
          value: '`/minky` - Get a random Minky cat image\n`/minkyinterval [interval]` - Auto-post Minky images (seconds, 0 to stop)',
          inline: false
        },
        {
          name: '📌 Prefix Commands',
          value: 'Use `!` prefix for text-based versions of slash commands\n(e.g., `!plugins`, `!minky`, `!help`)',
          inline: false
        },
        {
          name: '💡 Tips',
          value: '• Hold a `/plugins` or `/backports` message (not the links) to install the plugins in it',
          inline: false
        }
      );

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message) {
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🤖 Aliucord Bot Commands')
      .setDescription('All available commands for the Aliucord community bot')
      .addFields(
        {
          name: '📚 Plugin Commands',
          value: '`/beginner` - How to install Aliucord, plugins and themes\n`/plugins [search]` - Browse all Aliucord plugins\n`/backports [search]` - Plugins that bring features from new Discord\n`/random-plugin` - Get a random plugin suggestion',
          inline: false
        },
        {
          name: '🎨 Theme Commands',
          value: '`/themes [search]` - Browse all Aliucord themes',
          inline: false
        },
        {
          name: '🐱 Fun Commands',
          value: '`/minky` - Get a random Minky cat image\n`/minkyinterval [interval]` - Auto-post Minky images (seconds, 0 to stop)',
          inline: false
        },
        {
          name: '📌 Prefix Commands',
          value: 'Use `!` prefix for text-based versions of slash commands\n(e.g., `!plugins`, `!minky`, `!help`)',
          inline: false
        },
        {
          name: '💡 Tips',
          value: '• Hold a `/plugins` or `/backports` message (not the links) to install the plugins in it',
          inline: false
        }
      );

    await message.reply({ embeds: [embed] });
  }
};
