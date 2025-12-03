const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { fetchPlugins } = require('./plugins');
const { getTopReviewedPlugins } = require('../utils/database');

function formatStars(rating) {
  const rounded = Math.round(parseFloat(rating));
  return '★'.repeat(rounded) + '☆'.repeat(5 - rounded);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin-stats')
    .setDescription('View statistics about available plugins'),
  
  async execute(interaction) {
    await interaction.deferReply();

    try {
      const allPlugins = await fetchPlugins();
      
      if (allPlugins.length === 0) {
        return interaction.editReply('No plugin data available.');
      }

      // Calculate stats
      const totalPlugins = allPlugins.length;
      const authorsSet = new Set(allPlugins.map(p => p.authors).filter(a => a && a !== 'Unknown'));
      const uniqueAuthors = authorsSet.size;
      
      // Count plugins with descriptions
      const withDescriptions = allPlugins.filter(p => p.description && p.description !== 'No description').length;
      
      // Calculate average plugins per author
      const avgPluginsPerAuthor = uniqueAuthors > 0 ? (totalPlugins / uniqueAuthors).toFixed(2) : 0;
      
      // Top authors - count plugins per author
      const authorCounts = {};
      allPlugins.forEach(p => {
        if (p.authors && p.authors !== 'Unknown') {
          authorCounts[p.authors] = (authorCounts[p.authors] || 0) + 1;
        }
      });
      
      const topAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author, count]) => `• ${author} - **${count}** plugins`)
        .join('\n') || 'No data';
      
      // Latest plugins (first in manifest)
      const latestPlugins = allPlugins.slice(0, 5).map(p => `• ${p.name}`).join('\n');

      // Top reviewed plugins
      const topReviewed = await getTopReviewedPlugins(5);
      const topReviewedText = topReviewed.length > 0
        ? topReviewed.map(p => `• ${p.pluginName} ${formatStars(p.avgRating)} (${p.reviewCount} reviews)`).join('\n')
        : 'No reviews yet';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Plugin Statistics')
        .addFields(
          {
            name: '✨ Latest Plugins',
            value: latestPlugins,
            inline: false
          },
          {
            name: '⭐ Most Reviewed Plugins',
            value: topReviewedText,
            inline: false
          },
          {
            name: '👑 Top Authors',
            value: topAuthors,
            inline: false
          },
          {
            name: 'Total Plugins',
            value: `**${totalPlugins}** plugins`,
            inline: true
          },
          {
            name: 'Unique Authors',
            value: `**${uniqueAuthors}** authors`,
            inline: true
          },
          {
            name: 'Avg Plugins per Author',
            value: `**${avgPluginsPerAuthor}** plugins`,
            inline: true
          }
        )
        .setFooter({ text: 'Use /plugins to browse all plugins | /rate-plugin to review' });

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in plugin-stats:', err);
      await interaction.editReply('❌ Failed to fetch plugin statistics.');
    }
  },

  async executePrefix(message) {
    try {
      const allPlugins = await fetchPlugins();
      
      if (allPlugins.length === 0) {
        return message.reply('No plugin data available.');
      }

      // Calculate stats
      const totalPlugins = allPlugins.length;
      const authorsSet = new Set(allPlugins.map(p => p.authors).filter(a => a && a !== 'Unknown'));
      const uniqueAuthors = authorsSet.size;
      
      // Count plugins with descriptions
      const withDescriptions = allPlugins.filter(p => p.description && p.description !== 'No description').length;
      
      // Calculate average plugins per author
      const avgPluginsPerAuthor = uniqueAuthors > 0 ? (totalPlugins / uniqueAuthors).toFixed(2) : 0;
      
      // Top authors - count plugins per author
      const authorCounts = {};
      allPlugins.forEach(p => {
        if (p.authors && p.authors !== 'Unknown') {
          authorCounts[p.authors] = (authorCounts[p.authors] || 0) + 1;
        }
      });
      
      const topAuthors = Object.entries(authorCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([author, count]) => `• ${author} - **${count}** plugins`)
        .join('\n') || 'No data';
      
      // Latest plugins (first in manifest)
      const latestPlugins = allPlugins.slice(0, 5).map(p => `• ${p.name}`).join('\n');

      // Top reviewed plugins
      const topReviewed = await getTopReviewedPlugins(5);
      const topReviewedText = topReviewed.length > 0
        ? topReviewed.map(p => `• ${p.pluginName} ${formatStars(p.avgRating)} (${p.reviewCount} reviews)`).join('\n')
        : 'No reviews yet';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📊 Plugin Statistics')
        .addFields(
          {
            name: '✨ Latest Plugins',
            value: latestPlugins,
            inline: false
          },
          {
            name: '⭐ Most Reviewed Plugins',
            value: topReviewedText,
            inline: false
          },
          {
            name: '👑 Top Authors',
            value: topAuthors,
            inline: false
          },
          {
            name: 'Total Plugins',
            value: `**${totalPlugins}** plugins`,
            inline: true
          },
          {
            name: 'Unique Authors',
            value: `**${uniqueAuthors}** authors`,
            inline: true
          },
          {
            name: 'Avg Plugins per Author',
            value: `**${avgPluginsPerAuthor}** plugins`,
            inline: true
          }
        )
        .setFooter({ text: 'Use l!plugins to browse | l!rate-plugin to review' });

      await message.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Error in plugin-stats prefix:', err);
      await message.reply('❌ Failed to fetch plugin statistics.');
    }
  }
};
