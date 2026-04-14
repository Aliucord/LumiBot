const { PermissionsBitField } = require('discord.js');

const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('unmute').setDescription('Unmute a user in the server.'),
    async execute() {},
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('You do not have permission to unmute members.');
        }
        let user = message.mentions.users.first();
        let userId = user ? user.id : args[0];
        if (!userId) {
            return message.reply('Please mention a user or provide their ID to unmute.');
        }
        if (!user) {
            try {
                user = await message.client.users.fetch(userId);
            } catch {
                return message.reply('Could not find a user with that ID.');
            }
        }
        const member = message.guild.members.cache.get(userId);
        if (!member) {
            return message.reply('User not found in this server.');
        }
        await member.timeout(null, 'Unmuted by moderator');
        message.channel.send(`${user.tag} has been unmuted.`);
    }
};