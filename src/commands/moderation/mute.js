const { PermissionsBitField } = require('discord.js');

const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('mute').setDescription('Mute a user in the server.'),
    async execute() {},
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('You do not have permission to mute members.');
        }
        let user = message.mentions.users.first();
        let userId = user ? user.id : args[0];
        if (!userId) {
            return message.reply('Please mention a user or provide their ID to mute.');
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
        const duration = args[1] ? parseInt(args[1]) : 10; // default 10 minutes
        if (isNaN(duration) || duration <= 0) {
            return message.reply('Please provide a valid mute duration in minutes.');
        }
        await member.timeout(duration * 60 * 1000, 'Muted by moderator');
        message.channel.send(`${user.tag} has been muted for ${duration} minutes.`);
    }
};