const {
    SlashCommandBuilder,
    MessageFlags,
    PermissionsBitField,
} = require("discord.js");
const { setSticky, disableSticky } = require("../../utils/stickyManager");
const { findChannel } = require("../../utils/prefixParser");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("sticky")
        .setDescription("Manage stickied messages")
        .addSubcommand((sub) =>
            sub
                .setName("add")
                .setDescription("Add or update a stickied message in a channel")
                .addStringOption((opt) =>
                    opt
                        .setName("message")
                        .setDescription("Message content")
                        .setRequired(true),
                )
                .addChannelOption((opt) =>
                    opt
                        .setName("channel")
                        .setDescription("Target channel (default: current)")
                        .setRequired(false),
                ),
        )
        .addSubcommand((sub) =>
            sub
                .setName("remove")
                .setDescription("Remove the stickied message from a channel")
                .addChannelOption((opt) =>
                    opt
                        .setName("channel")
                        .setDescription("Target channel (default: current)")
                        .setRequired(false),
                ),
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            const hasModPerms = interaction.member.permissions.has(
                PermissionsBitField.Flags.ManageMessages,
            );

            if (!hasModPerms) {
                return interaction.editReply({
                    content:
                        "❌ You need moderator permissions (Manage Messages) to use this command.",
                });
            }

            const sub = interaction.options.getSubcommand();
            const channel =
                interaction.options.getChannel("channel") ||
                interaction.channel;
            const guildId = interaction.guildId;

            if (sub === "add") {
                const message = interaction.options.getString("message");
                const res = await setSticky(guildId, channel, message);
                if (!res?.ok)
                    return interaction.editReply({
                        content: `❌ Failed to set stickied message: ${res?.error || "unknown error"}`,
                    });
                return interaction.editReply({
                    content: `✅ Stickied message set in ${channel}`,
                });
            }

            if (sub === "remove") {
                const ok = await disableSticky(guildId, channel);
                if (!ok)
                    return interaction.editReply({
                        content: "❌ Failed to remove stickied message.",
                    });
                return interaction.editReply({
                    content: `✅ Removed stickied message from ${channel}`,
                });
            }
        } catch (err) {
            console.error("Error in sticky command:", err);
            return interaction
                .editReply({
                    content: `❌ An error occurred: ${err.message || "unknown error"}`,
                })
                .catch(() => {});
        }
    },

    async executePrefix(message, args, rawArgs) {
        const hasModPerms = interaction.member.permissions.has(
            PermissionsBitField.Flags.ManageMessages,
        );

        if (!hasModPerms) {
            return message.reply(
                "❌ You need moderator permissions (Manage Messages) to use this command.",
            );
        }

        const sub = (args[0] || "").toLowerCase();
        if (!["add", "remove", "set", "disable"].includes(sub)) {
            return message.reply(
                "❌ Usage: `!sticky add [#channel] | <message>` | `!sticky remove [#channel]`",
            );
        }

        let channel = message.channel;
        let rest = rawArgs.slice(sub.length).trim();

        const channelMention = rest.match(/^<#\d+>|^\S+/)?.[0];
        if (channelMention && !["set", "add"].includes(sub)) {
            const found = findChannel(message.guild, channelMention);
            if (found) {
                channel = found;
                rest = rest.slice(channelMention.length).trim();
            }
        }

        if (sub === "set" || sub === "add") {
            const pipeIdx = rest.indexOf("|");
            if (pipeIdx === -1) {
                return message.reply(
                    "❌ Usage: `!sticky add [#channel] | <message>`",
                );
            }

            const maybeChan = rest.slice(0, pipeIdx).trim();
            const found = findChannel(message.guild, maybeChan);
            if (found) channel = found;

            const stickyText = rest.slice(pipeIdx + 1).trim();
            if (!stickyText)
                return message.reply("❌ Sticky message cannot be empty.");

            const res = await setSticky(message.guild.id, channel, stickyText);
            if (!res?.ok)
                return message.reply(
                    `❌ Failed to set stickied message: ${res?.error || "unknown error"}`,
                );
            return message.reply(`✅ Stickied message set in ${channel}`);
        }

        if (sub === "disable" || sub === "remove") {
            const ok = await disableSticky(message.guild.id, channel);
            if (!ok)
                return message.reply("❌ Failed to remove stickied message.");
            return message.reply(`✅ Removed stickied message from ${channel}`);
        }
    },
};
