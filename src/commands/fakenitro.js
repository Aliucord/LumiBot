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
HOLD THIS MESSAGE TO INSTALL THEM

[NitroSpoof fork](https://github.com/kiwi-706/AliucordPlugins/raw/builds/NitroSpoof.zip) for emojis.
[FakeStickers fork](https://github.com/Archimedes9500/aliucord-plugins-1/raw/4315eb5da048504832e1956994af90ac4e143f47/FakeStickers.zip) for stickers.
[UserPFP](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserPFP.zip) for profile picture.
[UserBG](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserBG.zip) for banner.

**READING THIS GUIDE IS NECESSARY IF YOU WANT TO USE USERPFP/BG:**
<https://yutaplug.github.io/Aliucord/#userpfp-and-bg>`;

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
