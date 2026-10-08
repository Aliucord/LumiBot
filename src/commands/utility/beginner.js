const { SlashCommandBuilder, MessageFlags } = require('discord.js');

// Adapted from the Beginner guide in the Aliucord docs (https://yutaplug.github.io/Aliucord/#beginner-guide)
const BEGINNER_MESSAGE = `# Aliucord Beginner Guide
## Installing Aliucord
Download the latest [Aliucord Manager](<https://github.com/Aliucord/Manager/releases/latest>) APK and install it. Open it, grant all permissions, press **New install** and follow the steps.

## Installing plugins
1. In #plugins-list or #new-plugins, hold any message
2. Tap \`View [Author]'s Plugins\` (#plugins-list) or \`Install [Plugin name]\` (#new-plugins)
3. Install the plugin you want, then restart Aliucord (most plugins need it)
-# Search plugins with \`!plugins <name>\` in #bot-spam, or use the PluginWeb plugin for a built-in list

**Installing manually** (needed for #unmaintained-plugins, or if you already have the \`.zip\`)
1. Open the plugin's repo, switch to the \`builds\` branch and download \`[PluginName].zip\`
2. Move the \`.zip\` to the \`Aliucord/plugins\` folder with a file manager
3. Restart Aliucord

## Installing themes
1. Install the \`Themer\` plugin
2. In #themes, hold any message (**not the link**) and tap \`Install [Theme name]\`
3. Enable the theme in Themer settings
-# Theme not working? Check the transparency mode, use the theme mirror from #theme-support pins for image backgrounds, or Themer may be broken on your Android version.`;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('beginner')
    .setDescription('Beginner guide for installing Aliucord, plugins and themes')
    .addBooleanOption(option =>
      option.setName('send')
        .setDescription('Send publicly or privately (default: private)')
        .setRequired(false)),

  async execute(interaction) {
    const send = interaction.options.getBoolean('send') ?? false;
    await interaction.reply({
      content: BEGINNER_MESSAGE,
      ...(send ? {} : { flags: MessageFlags.Ephemeral })
    });
  },

  async executePrefix(message) {
    await message.reply({ content: BEGINNER_MESSAGE });
  }
};
