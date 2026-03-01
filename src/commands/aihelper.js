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

// Channel ID for helper AI (set via command or env)
let HELPER_CHANNEL_ID = process.env.AI_HELPER_CHANNEL_ID || null;

// Helper AI system prompt (strict, only answers if confident)
const HELPER_PROMPT = `You are a Discord helper bot for a discord client mod called Aliucord. You are ONLY allowed to answer questions if the answer can be found in the following FAQ or common issues list. If you do not know the answer exactly from the FAQ, reply with "I do not know."

---
"Nobody can hear me in VC/VC is not working"
VC is not really possible on Aliucord/old Discord versions anymore due to the new end to end encryption. Wait for the devs to backport it!

"Failed to initialize/I don't have PluginDownloader/I can't install plugins/Emojis are blank"
You might need to create an "Aliucord" folder in your internal storage (https://raw.githubusercontent.com/yutaplug/Aliucord/main/stuff/Aliucord.jpg)

"I can't open pfps with ViewProfileImages plugin"
Disable "Decorations" plugin (make sure to enable showing built-in plugins).

"My Aliucord is crashing"
Post a crashlog .txt file that can be found in your "Aliucord/crashlogs" folder.

"Plugin not working"
Have you restarted the app? if yes, stand by until a supporter can assist you.

"UserPFP/UserBG not working"
Make sure you have read the guide: <https://yutaplug.github.io/Aliucord/#userpfp-and-bg>

"Emojis don't save in status"
Known issue, no fix.

"Aliucord thinks my text bar is a password bar"
Device or keyboard issue. no fix on our end.

"How to get modern UI/interface?"
This is not really possible due to Aliucord using an old Discord version. However, you can install "DiscordRN Dark" theme from #themes channel or use Kettu/Rain clients.

"How to install Aliucord/plugins/themes?"
<https://yutaplug.github.io/Aliucord/#beginner-guide>

"Is there x plugin?"
Search for it using the !plugins command in #bot-spam, PluginWeb plugin or using the built-in Discord searchbar. If you can't find it, stand by until a supporter can assist you.

"Can I get nitro?"
Real nitro is not possible, but you can get plugins that mimic a few nitro features (use the !fakenitro command).

"Where can I find the changelog?"
<https://yutaplug.github.io/Aliucord/#changelog>

"Is there a plugin to bypass file size?"
Best you can do is uploading the file to <https://catbox.moe> or a similar service.

"How to fix message links opening in Discord?"
Install https://github.com/yutaplug/Aliucord/raw/builds/OpenLinksInApp.zip plugin

"I can't login because of 2FA"
You probably have security keys, check if you do using the official Discord app/browser, and remove them (you can re-add them later).

"I can't login with token"
Make sure the token is still valid and that it doesn't contain any white spaces.

"PlayableEmbeds not working"
Install https://github.com/yutaplug/Aliucord/raw/builds/Fluff.zip instead.

"Why does Aliucord use an old Discord version?"
<https://yutaplug.github.io/Aliucord/#old-version>

"Theme is not working"
Read #theme-support pins for fixed versions of old themes and make sure you are using the right transparency.

"How to add a custom font or background?"
<https://yutaplug.github.io/Aliucord/#themer>

"Will using Aliucord get me banned?"
Client modifications are against Discord's Terms of Service. However, Discord is pretty indifferent about them and there are no known cases of users getting banned for using client mods. So you should generally be fine as long as you don't use plugins that bypass api restrictions or implement spammy / selfbot behaviour (mass deleting, spam plugins, "animated" custom status, etc).

"I have issues with the manager (I can't install Aliucord)"
Read #common-issues channel or stand by until a supporter can assist you.

"How to use bot commands?"
Install SlashCommandsFix plugin.

"I can't view bot messages"
Install ComponentsV2 plugin.

"Where is ShowHiddenChannels?"
The plugin needed to be gone for private reasons, thanks for your understanding.

"How to play audio files"
Install https://github.com/yutaplug/Aliucord/raw/builds/AudioPlayer.zip
---`;

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

module.exports = {
  name: 'aihelper',
  description: 'Helper AI for Aliucord',
  data,
  getHelperChannelId: () => HELPER_CHANNEL_ID,
  async executePrefix(message, args) {
    // Set helper channel: !aihelper set <channelId>
    if (args[0] === 'set' && (message.member.permissions.has('Administrator') || message.member.roles.cache.has('811256488676425758'))) {
      if (!args[1]) return message.reply('Provide a channel ID.');
      HELPER_CHANNEL_ID = args[1];
      return message.reply('Helper AI channel set.');
    }
    if (!HELPER_CHANNEL_ID || message.channel.id !== HELPER_CHANNEL_ID) return;
    // If called from messageCreate.js with no args, use message.content
    const prompt = args.length ? args.join(' ') : message.content;
    if (!prompt) return;
    try {
      const reply = await callGeminiAPI(prompt, message.channel.id, helperHistory, HELPER_PROMPT);
      if (reply.toLowerCase().includes('i am not sure') || reply.toLowerCase().includes('i do not know')) return;
      const embed = new EmbedBuilder()
        .setColor('#00e676')
        .setAuthor({ name: 'Helper AI', iconURL: message.client.user.displayAvatarURL() })
        .setDescription(reply.slice(0, 4096));
      await message.reply({ embeds: [embed] });
    } catch (e) {
      // Silent fail if unsure or error
    }
  },
  async execute(interaction) {
    if (interaction.options.getSubcommand(false) === 'set') {
      // Allow users with the specific role OR administrators to use set
      const member = interaction.member;
      const hasHelperRole = member && member.roles && (member.roles.cache ? member.roles.cache.has('811256488676425758') : member.roles.includes('811256488676425758'));
      const isAdmin = member && member.permissions && (member.permissions.has ? member.permissions.has('Administrator') : false);
      if (!(hasHelperRole || isAdmin)) return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
      const channel = interaction.options.getChannel('channel');
      HELPER_CHANNEL_ID = channel.id;
      return interaction.reply({ content: `Helper AI channel set to <#${channel.id}>.`, ephemeral: true });
    }
    // Default: respond to questions in the helper channel (not used, but required for slash command compatibility)
    return;
  },
};
