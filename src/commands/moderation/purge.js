const { PermissionsBitField } = require('discord.js');

const { SlashCommandBuilder } = require('discord.js');
module.exports = {
    data: new SlashCommandBuilder().setName('purge').setDescription('Bulk delete messages in a channel.'),
    async execute() {},
    async executePrefix(message, args) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('You do not have permission to manage messages.');
        }
        const amount = parseInt(args[0]);
        if (isNaN(amount) || amount < 2 || amount > 100) {
            return message.reply('Please provide a number between 2 and 100 for the number of messages to delete.');
        }
        let userId = null;
        let user = message.mentions.users.first();
        if (user) {
            userId = user.id;
        } else if (args[1] && /^\d{17,}$/.test(args[1])) {
            userId = args[1];
        }
        if (userId) {
            const messages = await message.channel.messages.fetch({ limit: 100 });
            const toDelete = messages.filter(m => m.author.id === userId).first(amount);
            await message.channel.bulkDelete(toDelete, true);
            message.channel.send(`Deleted ${toDelete.length} messages from <@${userId}>.`)
                .then(msg => setTimeout(() => msg.delete(), 3000));
        } else {
            await message.channel.bulkDelete(amount, true);
            message.channel.send(`Deleted ${amount} messages.`)
                .then(msg => setTimeout(() => msg.delete(), 3000));
        }
    }
};