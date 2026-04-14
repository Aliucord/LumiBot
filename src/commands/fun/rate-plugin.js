const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const { savePluginReview, getPluginAverageRating } = require(path.join(__dirname, '../../utils/db'));
const { fetchPlugins } = require(path.join(__dirname, '../utility/plugins'));

function formatStars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rate-plugin')
    .setDescription('Rate and review a plugin (1-5 stars)')
    .addStringOption(option =>
      option.setName('plugin')
        .setDescription('Name of the plugin to rate')
        .setRequired(true)
        .setAutocomplete(true))
    .addIntegerOption(option =>
      option.setName('rating')
        .setDescription('Rating from 1 to 5 stars')
        .setRequired(true)
        .addChoices(
          { name: '★☆☆☆☆ (1)', value: 1 },
          { name: '★★☆☆☆ (2)', value: 2 },
          { name: '★★★☆☆ (3)', value: 3 },
          { name: '★★★★☆ (4)', value: 4 },
          { name: '★★★★★ (5)', value: 5 }
        ))
    .addStringOption(option =>
      option.setName('review')
        .setDescription('Optional review text')
        .setRequired(false)),

  async execute(interaction) {
    const pluginName = interaction.options.getString('plugin');
    const rating = interaction.options.getInteger('rating');
    const review = interaction.options.getString('review');
    const userId = interaction.user.id;

    const allPlugins = await fetchPlugins();
    const plugin = allPlugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase());

    if (!plugin) {
      return interaction.reply({
        content: `❌ Plugin "${pluginName}" not found. Use autocomplete to select a valid plugin.`,
        flags: MessageFlags.Ephemeral
      });
    }

    const success = await savePluginReview(plugin.name, userId, rating, review);

    if (!success) {
      return interaction.reply({
        content: '❌ Failed to save your review. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }

    const stats = await getPluginAverageRating(plugin.name);
    
    let content = `✅ Your review for **${plugin.name}** has been saved!\n\n`;
    content += `Your rating: ${formatStars(rating)} (${rating}/5)\n`;
    if (review) {
      content += `Your review: "${review}"\n`;
    }
    content += `\n**${plugin.name}** now has an average rating of ${formatStars(Math.round(parseFloat(stats.avgRating)))} (${stats.avgRating}/5) from ${stats.reviewCount} review${stats.reviewCount !== 1 ? 's' : ''}.`;

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args, rawArgs) {
    const parts = rawArgs.split(' ');
    if (parts.length < 2) {
      return message.reply('❌ Usage: `l!rate-plugin <plugin-name> <rating> [review]`\nExample: `l!rate-plugin Themer 5 Great plugin!`');
    }

    const pluginName = parts[0];
    const rating = parseInt(parts[1]);
    const review = parts.slice(2).join(' ').trim() || null;

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return message.reply('❌ Rating must be a number between 1 and 5.');
    }

    const allPlugins = await fetchPlugins();
    const plugin = allPlugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase());

    if (!plugin) {
      return message.reply(`❌ Plugin "${pluginName}" not found.`);
    }

    const success = await savePluginReview(plugin.name, message.author.id, rating, review);

    if (!success) {
      return message.reply('❌ Failed to save your review. Please try again later.');
    }

    const stats = await getPluginAverageRating(plugin.name);
    
    let content = `✅ Your review for **${plugin.name}** has been saved!\n\n`;
    content += `Your rating: ${formatStars(rating)} (${rating}/5)\n`;
    if (review) {
      content += `Your review: "${review}"\n`;
    }
    content += `\n**${plugin.name}** now has an average rating of ${formatStars(Math.round(parseFloat(stats.avgRating)))} (${stats.avgRating}/5) from ${stats.reviewCount} review${stats.reviewCount !== 1 ? 's' : ''}.`;

    await message.reply(content);
  },

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused();
      const allPlugins = await fetchPlugins();
      
      const searchLower = focusedValue.toLowerCase();
      const matches = allPlugins
        .filter(p => p.name.toLowerCase().includes(searchLower))
        .slice(0, 25)
        .map(plugin => ({
          name: plugin.name,
          value: plugin.name
        }));
      
      await interaction.respond(matches);
    } catch (err) {
      console.error('Error in rate-plugin autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  }
};
