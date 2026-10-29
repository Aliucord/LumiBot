const { MessageFlags } = require('discord.js');

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_LENGTH = 2000;

const cache = new Map();

async function fetchMarkdown(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.content;
  }

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    let content = (await response.text()).trim();
    if (content.length > MAX_LENGTH) content = content.slice(0, MAX_LENGTH - 3) + '...';
    cache.set(url, { content, timestamp: Date.now() });
    return content;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    // Fall back to stale cache if available
    return cached?.content ?? null;
  }
}

// Builds a slash/prefix command that replies with the contents of a remote markdown file
function createMarkdownCommand(data, url) {
  const FAILED_MESSAGE = 'Failed to load this message. Please try again later.';

  return {
    data,

    async execute(interaction) {
      const send = interaction.options.getBoolean('send') ?? false;
      const content = await fetchMarkdown(url);
      await interaction.reply({
        content: content ?? FAILED_MESSAGE,
        flags: MessageFlags.SuppressEmbeds | (send && content ? 0 : MessageFlags.Ephemeral)
      });
    },

    async executePrefix(message) {
      const content = await fetchMarkdown(url);
      await message.reply({
        content: content ?? FAILED_MESSAGE,
        flags: MessageFlags.SuppressEmbeds
      });
    }
  };
}

module.exports = { fetchMarkdown, createMarkdownCommand };
