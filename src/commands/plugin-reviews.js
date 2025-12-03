const { SlashCommandBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getPluginReviews, getUserReviews, getPluginAverageRating } = require('../utils/database');
const { fetchPlugins } = require('./plugins');

const REVIEWS_PER_PAGE = 5;

function encodeIdentifier(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '');
}

function decodeIdentifier(str) {
  const padded = str + '='.repeat((4 - str.length % 4) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function formatStars(rating) {
  return '★'.repeat(rating) + '☆'.repeat(5 - rating);
}

function formatReviewDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildPaginationRow(page, totalPages, type, identifier, sortBy) {
  const row = new ActionRowBuilder();
  const encodedId = encodeIdentifier(identifier);
  
  const prevBtn = new ButtonBuilder()
    .setCustomId(`reviews_prev_${page}_${type}_${encodedId}_${sortBy}`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === 0);
  
  const nextBtn = new ButtonBuilder()
    .setCustomId(`reviews_next_${page}_${type}_${encodedId}_${sortBy}`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Primary)
    .setDisabled(page === totalPages - 1);
  
  row.addComponents(prevBtn, nextBtn);
  return row;
}

async function handleButton(interaction, action, page, type, encodedIdentifier, sortBy) {
  try {
    page = parseInt(page);
    if (action === 'next') page++;
    if (action === 'prev') page--;

    const identifier = decodeIdentifier(encodedIdentifier);

    let reviews;
    let title;
    
    if (type === 'plugin') {
      reviews = await getPluginReviews(identifier, sortBy);
      const stats = await getPluginAverageRating(identifier);
      title = `**Reviews for ${identifier}** ${formatStars(Math.round(parseFloat(stats.avgRating || 0)))} (${stats.avgRating || 'N/A'}/5 from ${stats.reviewCount} reviews)`;
    } else {
      reviews = await getUserReviews(identifier);
      title = `**Your Reviews** (${reviews.length} total)`;
    }

    const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
    if (page < 0 || page >= totalPages) {
      return await interaction.update({ content: 'Invalid page.', components: [] });
    }

    const start = page * REVIEWS_PER_PAGE;
    const pageReviews = reviews.slice(start, start + REVIEWS_PER_PAGE);

    let content = `${title}\n\n`;

    if (pageReviews.length === 0) {
      content += 'No reviews found.';
    } else {
      for (const review of pageReviews) {
        if (type === 'plugin') {
          content += `${formatStars(review.rating)} by <@${review.user_id}>\n`;
        } else {
          content += `**${review.plugin_name}** ${formatStars(review.rating)}\n`;
        }
        if (review.review) {
          content += `"${review.review}"\n`;
        }
        content += `-# ID: ${review.id} | ${formatReviewDate(review.created_at)}\n\n`;
      }
    }

    content += `Page ${page + 1}/${totalPages}`;

    const row = totalPages > 1 ? buildPaginationRow(page, totalPages, type, identifier, sortBy) : null;
    await interaction.update({ content, components: row ? [row] : [] });
  } catch (err) {
    console.error('Error in reviews handleButton:', err);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('plugin-reviews')
    .setDescription('View plugin reviews')
    .addStringOption(option =>
      option.setName('plugin')
        .setDescription('Plugin name to view reviews for (leave empty to see your own reviews)')
        .setRequired(false)
        .setAutocomplete(true))
    .addStringOption(option =>
      option.setName('sort')
        .setDescription('Sort reviews by')
        .setRequired(false)
        .addChoices(
          { name: 'Date (newest first)', value: 'date' },
          { name: 'Rating (highest first)', value: 'rating' }
        )),

  async execute(interaction) {
    const pluginName = interaction.options.getString('plugin');
    const sortBy = interaction.options.getString('sort') || 'date';

    let reviews;
    let title;
    let type;
    let identifier;

    if (pluginName) {
      const allPlugins = await fetchPlugins();
      const plugin = allPlugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase());

      if (!plugin) {
        return interaction.reply({
          content: `❌ Plugin "${pluginName}" not found.`,
          flags: MessageFlags.Ephemeral
        });
      }

      reviews = await getPluginReviews(plugin.name, sortBy);
      const stats = await getPluginAverageRating(plugin.name);
      title = `**Reviews for ${plugin.name}** ${formatStars(Math.round(parseFloat(stats.avgRating || 0)))} (${stats.avgRating || 'N/A'}/5 from ${stats.reviewCount} reviews)`;
      type = 'plugin';
      identifier = plugin.name;
    } else {
      reviews = await getUserReviews(interaction.user.id);
      title = `**Your Reviews** (${reviews.length} total)`;
      type = 'user';
      identifier = interaction.user.id;
    }

    const page = 0;
    const totalPages = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
    const start = page * REVIEWS_PER_PAGE;
    const pageReviews = reviews.slice(start, start + REVIEWS_PER_PAGE);

    let content = `${title}\n\n`;

    if (pageReviews.length === 0) {
      content += 'No reviews found.';
    } else {
      for (const review of pageReviews) {
        if (type === 'plugin') {
          content += `${formatStars(review.rating)} by <@${review.user_id}>\n`;
        } else {
          content += `**${review.plugin_name}** ${formatStars(review.rating)}\n`;
        }
        if (review.review) {
          content += `"${review.review}"\n`;
        }
        content += `-# ID: ${review.id} | ${formatReviewDate(review.created_at)}\n\n`;
      }
    }

    content += `Page ${page + 1}/${totalPages}`;

    const row = totalPages > 1 ? buildPaginationRow(page, totalPages, type, identifier, sortBy) : null;

    await interaction.reply({
      content,
      components: row ? [row] : [],
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const pluginName = args.join(' ').trim() || null;
    const sortBy = 'date';

    let reviews;
    let title;

    if (pluginName) {
      const allPlugins = await fetchPlugins();
      const plugin = allPlugins.find(p => p.name.toLowerCase() === pluginName.toLowerCase());

      if (!plugin) {
        return message.reply(`❌ Plugin "${pluginName}" not found.`);
      }

      reviews = await getPluginReviews(plugin.name, sortBy);
      const stats = await getPluginAverageRating(plugin.name);
      title = `**Reviews for ${plugin.name}** ${formatStars(Math.round(parseFloat(stats.avgRating || 0)))} (${stats.avgRating || 'N/A'}/5 from ${stats.reviewCount} reviews)`;
    } else {
      reviews = await getUserReviews(message.author.id);
      title = `**Your Reviews** (${reviews.length} total)`;
    }

    let content = `${title}\n\n`;

    if (reviews.length === 0) {
      content += 'No reviews found.';
    } else {
      const displayReviews = reviews.slice(0, REVIEWS_PER_PAGE);
      for (const review of displayReviews) {
        if (pluginName) {
          content += `${formatStars(review.rating)} by <@${review.user_id}>\n`;
        } else {
          content += `**${review.plugin_name}** ${formatStars(review.rating)}\n`;
        }
        if (review.review) {
          content += `"${review.review}"\n`;
        }
        content += `-# ID: ${review.id} | ${formatReviewDate(review.created_at)}\n\n`;
      }
      if (reviews.length > REVIEWS_PER_PAGE) {
        content += `...and ${reviews.length - REVIEWS_PER_PAGE} more. Use slash command for pagination.`;
      }
    }

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
      console.error('Error in plugin-reviews autocomplete:', err);
      await interaction.respond([]).catch(() => {});
    }
  },

  handleButton
};
