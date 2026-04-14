const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const OWNER_ID = process.env.DISCORD_OWNER_ID;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('send')
    .setDescription('Send a message as the bot or a custom profile (Owner only)')
    .addStringOption(option => 
      option.setName('message')
        .setDescription('The message to send')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the message to')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('profile')
        .setDescription('Which profile to use')
        .addChoices(
          { name: 'Bot (Default)', value: 'bot' },
          { name: 'Huskboard', value: 'huskboard' }
        ))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!OWNER_ID || interaction.user.id !== OWNER_ID) {
      return interaction.reply({ content: 'Only the bot owner can use this command.', ephemeral: true });
    }

    const message = interaction.options.getString('message');
    const channel = interaction.options.getChannel('channel');
    const profile = interaction.options.getString('profile') || 'bot';

    await interaction.deferReply({ ephemeral: true });

    try {
      if (profile === 'bot') {
        await channel.send(message);
      } else if (profile === 'huskboard') {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === interaction.client.user.id);

        if (!webhook) {
          webhook = await channel.createWebhook({
            name: 'Huskboard Webhook',
            avatar: 'https://files.catbox.moe/y7a4m5.webp',
          });
        }

        await webhook.send({
          content: message,
          username: 'Huskboard',
          avatarURL: 'https://files.catbox.moe/y7a4m5.webp'
        });
      }

      await interaction.editReply(`Message sent to ${channel}!`);
    } catch (err) {
      console.error('Error in send command:', err);
      await interaction.editReply(`Failed to send message: ${err.message}`);
    }
  },

  async executePrefix(message, args) {
    if (!OWNER_ID || message.author.id !== OWNER_ID) return;

    const channelMention = args[0];
    const channel = message.mentions.channels.first();
    
    if (!channel) {
      return message.reply('Please mention a channel first: `!send #channel [bot|huskboard] message`');
    }

    let profile = 'bot';
    let messageStartIdx = 1;

    if (args[1] === 'bot' || args[1] === 'huskboard') {
      profile = args[1];
      messageStartIdx = 2;
    }

    const content = args.slice(messageStartIdx).join(' ');
    if (!content) {
      return message.reply('Please provide a message to send.');
    }

    try {
      if (profile === 'bot') {
        await channel.send(content);
      } else {
        const webhooks = await channel.fetchWebhooks();
        let webhook = webhooks.find(wh => wh.owner.id === message.client.user.id);

        if (!webhook) {
          webhook = await channel.createWebhook({
            name: 'Huskboard Webhook',
            avatar: 'https://files.catbox.moe/y7a4m5.webp',
          });
        }

        await webhook.send({
          content: content,
          username: 'Huskboard',
          avatarURL: 'https://files.catbox.moe/y7a4m5.webp'
        });
      }
      await message.react('✅');
    } catch (err) {
      console.error('Error in prefix send command:', err);
      await message.reply(`Error: ${err.message}`);
    }
  }
};