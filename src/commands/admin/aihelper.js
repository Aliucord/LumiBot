const { EmbedBuilder, SlashCommandBuilder } = require('discord.js');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// For slash command registration
const data = new SlashCommandBuilder()
  .setName('aihelper')
  .setDescription('Helper AI for Aliucord')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set the helper AI channel')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('Channel to set as helper AI channel')
          .setRequired(true)
      )
  );

// In-memory conversation history for users
const helperHistory = new Map();

// In-memory storage for helper channels per guild (Set of channel IDs per guild)
const HELPER_CHANNELS = new Map();


// Strict FAQ list: question keywords mapped to answers
const FAQ_LIST = [
  { keywords: ["vc", "voice", "nobody can hear me"], answer: "VC is not really possible on Aliucord/old Discord versions anymore due to the new end to end encryption. Wait for the devs to backport it!" },
  { keywords: ["failed to initialize", "pluginDownloader", "can't install plugins", "emojis are blank"], answer: "You might need to create an 'Aliucord' folder in your internal storage (https://raw.githubusercontent.com/yutaplug/Aliucord/main/stuff/Aliucord.jpg)" },
  { keywords: ["can't open pfps", "viewprofileimages"], answer: "Disable 'Decorations' plugin (make sure to enable showing built-in plugins)." },
  { keywords: ["crash", "crashlog", "crashing"], answer: "Post a crashlog .txt file that can be found in your 'Aliucord/crashlogs' folder." },
  { keywords: ["plugin not working"], answer: "Have you restarted the app? if yes, stand by until a supporter can assist you." },
  { keywords: ["userpfp", "userbg"], answer: "Make sure you have read the guide: <https://yutaplug.github.io/Aliucord/#userpfp-and-bg>" },
  { keywords: ["emojis don't save in status"], answer: "Known issue, no fix." },
  { keywords: ["password bar"], answer: "Device or keyboard issue. no fix on our end." },
  { keywords: ["modern ui", "modern interface"], answer: "This is not really possible due to Aliucord using an old Discord version. However, you can install 'DiscordRN Dark' theme from #themes channel or use Kettu/Rain clients." },
  { keywords: ["install aliucord", "install plugins", "install themes"], answer: "<https://yutaplug.github.io/Aliucord/#beginner-guide>" },
  { keywords: ["is there", "plugin"], answer: "Search for it using the !plugins command in #bot-spam, PluginWeb plugin or using the built-in Discord searchbar. If you can't find it, stand by until a supporter can assist you." },
  { keywords: ["nitro"], answer: "Real nitro is not possible, but you can get plugins that mimic a few nitro features (use the !fakenitro command)." },
  { keywords: ["changelog"], answer: "<https://yutaplug.github.io/Aliucord/#changelog>" },
  { keywords: ["bypass file size"], answer: "Best you can do is uploading the file to <https://catbox.moe> or a similar service." },
  { keywords: ["message links opening in discord"], answer: "Install https://github.com/yutaplug/Aliucord/raw/builds/OpenLinksInApp.zip plugin" },
  { keywords: ["2fa", "can't login"], answer: "You probably have security keys, check if you do using the official Discord app/browser, and remove them (you can re-add them later)." },
  { keywords: ["login with token"], answer: "Make sure the token is still valid and that it doesn't contain any white spaces." },
  { keywords: ["playableembeds not working"], answer: "Install https://github.com/yutaplug/Aliucord/raw/builds/Fluff.zip instead." },
  { keywords: ["old discord version"], answer: "<https://yutaplug.github.io/Aliucord/#old-version>" },
  { keywords: ["theme is not working"], answer: "Read #theme-support pins for fixed versions of old themes and make sure you are using the right transparency." },
  { keywords: ["custom font", "custom background"], answer: "<https://yutaplug.github.io/Aliucord/#themer>" },
  { keywords: ["banned", "ban", "will using aliucord get me banned"], answer: "Client modifications are against Discord's Terms of Service. However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods. So you should generally be fine as long as you don't use plugins that bypass api restrictions or implement spammy / selfbot behaviour (mass deleting, spam plugins, 'animated' custom status, etc)." },
  { keywords: ["manager", "can't install aliucord"], answer: "Read #common-issues channel or stand by until a supporter can assist you." },
  { keywords: ["how to use bot commands"], answer: "Install SlashCommandsFix plugin." },
  { keywords: ["can't view bot messages"], answer: "Install ComponentsV2 plugin." },
  { keywords: ["showhiddenchannels"], answer: "The plugin needed to be gone for private reasons, thanks for your understanding." },
  { keywords: ["audio files", "play audio"], answer: "Install https://github.com/yutaplug/Aliucord/raw/builds/AudioPlayer.zip" },
];

function matchFAQ(question) {
  const q = question.toLowerCase();
  for (const entry of FAQ_LIST) {
    if (entry.keywords.some(k => q.includes(k))) {
      return entry.answer;
    }
  }
  return null;
}

async function callGeminiAPI(prompt, userId, history, systemPrompt) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini/OpenRouter API key configured.');

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history.get(userId) || []),
    { role: 'user', content: prompt }
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://lumibot',
      'X-Title': 'LumiBot'
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-001',
      messages
    })
  });

  if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('No response from Gemini API');

  // Save conversation history (last 20 exchanges)
  const prev = history.get(userId) || [];
  history.set(userId, [...prev, { role: 'user', content: prompt }, { role: 'assistant', content }].slice(-20));
  return content;
}


// Helper: get helper channels for a guild (returns a Set)
function getHelperChannels(guildId) {
  return HELPER_CHANNELS.get(guildId) || new Set();
}

// Helper: add a helper channel for a guild
function addHelperChannel(guildId, channelId) {
  let set = HELPER_CHANNELS.get(guildId);
  if (!set) {
    set = new Set();
    HELPER_CHANNELS.set(guildId, set);
  }
  set.add(channelId);
}

// Helper: remove a helper channel for a guild
function removeHelperChannel(guildId, channelId) {
  const set = HELPER_CHANNELS.get(guildId);
  if (set) {
    set.delete(channelId);
    if (set.size === 0) HELPER_CHANNELS.delete(guildId);
  }
}

module.exports = {
  name: 'aihelper',
  description: 'Helper AI for Aliucord',
  data,
  getHelperChannels,
  addHelperChannel,
  removeHelperChannel,
  async executePrefix(message, args) {
    const guildId = message.guild?.id;
    // Set helper channel: !aihelper add <channelId>
    if (args[0] === 'add' && (message.member.permissions.has('Administrator') || message.member.roles.cache.has('811256488676425758'))) {
      if (!args[1]) return message.reply('Provide a channel ID.');
      addHelperChannel(guildId, args[1]);
      return message.reply('Helper AI channel added.');
    }
    // Remove helper channel: !aihelper remove <channelId>
    if (args[0] === 'remove' && (message.member.permissions.has('Administrator') || message.member.roles.cache.has('811256488676425758'))) {
      if (!args[1]) return message.reply('Provide a channel ID.');
      removeHelperChannel(guildId, args[1]);
      return message.reply('Helper AI channel removed.');
    }
    // Only respond if this channel is a helper channel
    const channels = getHelperChannels(guildId);
    if (!channels.has(message.channel.id)) return;
    // If called from messageCreate.js with no args, use message.content
    const prompt = args.length ? args.join(' ') : message.content;
    if (!prompt) return;
    // Strict FAQ matching only
    const faqAnswer = matchFAQ(prompt);
    if (!faqAnswer) {
      await message.reply('I do not know.');
      return;
    }
    try {
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setAuthor({ name: 'Helper AI', iconURL: message.client.user.displayAvatarURL() })
        .setDescription(faqAnswer.slice(0, 4096));
      await message.reply({ embeds: [embed] });
    } catch (e) {
      // Silent fail if error
    }
  },
  async execute(interaction) {
    const guildId = interaction.guild?.id;
    if (interaction.options.getSubcommand(false) === 'set') {
      // Allow users with the specific role OR administrators to use set
      const member = interaction.member;
      const hasHelperRole = member && member.roles && (member.roles.cache ? member.roles.cache.has('811256488676425758') : member.roles.includes('811256488676425758'));
      const isAdmin = member && member.permissions && (member.permissions.has ? member.permissions.has('Administrator') : false);
      if (!(hasHelperRole || isAdmin)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      const channel = interaction.options.getChannel('channel');
      addHelperChannel(guildId, channel.id);
      return interaction.reply({ content: `Helper AI channel <#${channel.id}> added.`, ephemeral: true });
    }
    // Default: respond to questions in the helper channel (not used, but required for slash command compatibility)
    return;
  },
};