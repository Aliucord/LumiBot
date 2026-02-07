const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const SUPPORTED_CHANNELS = [
  '811261298997460992',
  '847566769258233926',
  '811262084968742932',
  '811263527239024640'
];

function isChannelSupported(channelId) {
  return SUPPORTED_CHANNELS.includes(channelId);
}

const FAKENITRO_MESSAGE = `**"FAKENITRO" PLUGINS**
Hold this message to install them.
**Note:** Reading [this guide](<https://aliucord.pages.dev/documentation#userpfp-bg>) is necessary if you want to use UserPFP/BG.

[FreeNitroEmojis](https://github.com/nyxiereal/AliucordPlugins/raw/builds/FreeNitroEmojis.zip) for emojis.
[BetterFakeStickers](https://github.com/Archimedes9500/aliucord-plugins/raw/builds/BetterFakeStickers.zip) for stickers.
[UserPFP](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserPFP.zip) for profile picture.
[UserBG](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserBG.zip) for banner.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fakenitro')
    .setDescription('Get the "fakenitro" plugins for Aliucord')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const isSupported = isChannelSupported(interaction.channelId);

    if (!isSupported) {
      await interaction.deferReply();
      try {
        const msg = await interaction.followUp({
          content: 'Please use <#811263527239024640> to use this command.'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
      return;
    }

    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    await interaction.editReply({ content: FAKENITRO_MESSAGE });
  },

  async executePrefix(message, args) {
    const isSupported = isChannelSupported(message.channelId);

    if (!isSupported) {
      try {
        const msg = await message.reply({
          content: 'Please use <#811263527239024640> to use this command.'
        });
        setTimeout(() => msg.delete().catch(() => {}), 30000);
      } catch (err) {
        console.error('Error sending info message:', err);
      }
      return;
    }

    await message.reply({ content: FAKENITRO_MESSAGE });
  }
};
