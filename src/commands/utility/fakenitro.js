const { SlashCommandBuilder, MessageFlags } = require('discord.js');

const FAKENITRO_MESSAGE = `# FAKENITRO PLUGINS
**⚠️ READING [THIS GUIDE](<https://yutaplug.github.io/Aliucord/#userpfp-and-bg>) IS NECESSARY IF YOU WANT TO USE USERPFP/BG ⚠️**

[FreeNitroEmojis](https://github.com/nyxiereal/AliucordPlugins/raw/builds/FreeNitroEmojis.zip) for sending emojis as URL.
[FakeStickers](https://github.com/RhythmLunatic/aliucord-plugins/raw/builds/FakeStickers.zip) for sending stickers as URL.
[UserPFP](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserPFP.zip) for setting a profile picture to UserPFP database.
[UserBG](https://github.com/OmegaSunkey/awesomeplugins/raw/builds/UserBG.zip) for setting a banner to UserBG database.
[FakeDecor](https://github.com/yutaplug/yutaplugins/raw/builds/FakeDecor.zip) for setting an avatar decoration to Decor database.

-# Hold this message to install them.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fakenitro')
    .setDescription('Get the "fakenitro" plugins for Aliucord')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const send = interaction.options.getBoolean('send') ?? false;
    const deferOptions = send ? {} : { flags: MessageFlags.Ephemeral };
    await interaction.deferReply(deferOptions);

    await interaction.editReply({ content: FAKENITRO_MESSAGE });
  },

  async executePrefix(message, args) {
    await message.reply({ content: FAKENITRO_MESSAGE });
  }
};
