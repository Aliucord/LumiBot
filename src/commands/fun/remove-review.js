const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const path = require('path');
const { getReviewById, deleteReview } = require(path.join(__dirname, '../../utils/db'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-review')
    .setDescription('Remove a review (admins can remove any, users can remove their own)')
    .addIntegerOption(option =>
      option.setName('review-id')
        .setDescription('The ID of the review to remove')
        .setRequired(true)),

  async execute(interaction) {
    const reviewId = interaction.options.getInteger('review-id');
    const userId = interaction.user.id;
    const isAdmin = interaction.member.permissions.has('Administrator');

    const review = await getReviewById(reviewId);

    if (!review) {
      return interaction.reply({
        content: `❌ Review with ID ${reviewId} not found.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (!isAdmin && review.user_id !== userId) {
      return interaction.reply({
        content: '❌ You can only remove your own reviews. Administrators can remove any review.',
        flags: MessageFlags.Ephemeral
      });
    }

    const success = await deleteReview(reviewId);

    if (!success) {
      return interaction.reply({
        content: '❌ Failed to remove the review. Please try again later.',
        flags: MessageFlags.Ephemeral
      });
    }

    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    let content = `✅ Review #${reviewId} has been removed.\n\n`;
    content += `**Removed review:**\n`;
    content += `Plugin: ${review.plugin_name}\n`;
    content += `Rating: ${stars} (${review.rating}/5)\n`;
    if (review.review) {
      content += `Review: "${review.review}"`;
    }

    await interaction.reply({
      content,
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    if (args.length < 1) {
      return message.reply('❌ Usage: `l!remove-review <review-id>`\nExample: `l!remove-review 42`');
    }

    const reviewId = parseInt(args[0]);
    if (isNaN(reviewId)) {
      return message.reply('❌ Review ID must be a number.');
    }

    const userId = message.author.id;
    const isAdmin = message.member.permissions.has('Administrator');

    const review = await getReviewById(reviewId);

    if (!review) {
      return message.reply(`❌ Review with ID ${reviewId} not found.`);
    }

    if (!isAdmin && review.user_id !== userId) {
      return message.reply('❌ You can only remove your own reviews. Administrators can remove any review.');
    }

    const success = await deleteReview(reviewId);

    if (!success) {
      return message.reply('❌ Failed to remove the review. Please try again later.');
    }

    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);
    
    let content = `✅ Review #${reviewId} has been removed.\n\n`;
    content += `**Removed review:**\n`;
    content += `Plugin: ${review.plugin_name}\n`;
    content += `Rating: ${stars} (${review.rating}/5)\n`;
    if (review.review) {
      content += `Review: "${review.review}"`;
    }

    await message.reply(content);
  }
};
