const { PermissionsBitField } = require('discord.js');

const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('ban').setDescription('Ban a user from the server.'),
    async execute() {},
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('You do not have permission to ban members.');
        }
        let user = message.mentions.users.first();
        let userId = user ? user.id : args[0];
        if (!userId) {
            return message.reply('Please mention a user or provide their ID to ban.');
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
        if (!member.bannable) {
            return message.reply('I cannot ban this user.');
        }
        const reason = args.slice(1).join(' ') || 'No reason provided';
        await member.ban({ reason });
        message.channel.send(`${user.tag} has been banned. Reason: ${reason}`);
    }
};