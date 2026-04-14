const { PermissionsBitField } = require('discord.js');
const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('unban').setDescription('Unban a user from the server.'),
    async execute() {},
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('You do not have permission to unban members.');
        }
        let userId = args[0];
        if (!userId || !/^\d{17,}$/.test(userId)) {
            return message.reply('Please provide a valid user ID to unban.');
        }
        try {
            await message.guild.members.unban(userId);
            message.channel.send(`<@${userId}> has been unbanned.`);
        } catch {
            message.reply('Could not unban user. They may not be banned or the ID is invalid.');
        }
    }
};