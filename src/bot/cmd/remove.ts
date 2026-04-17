import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    PermissionFlagsBits,
} from "discord.js";
import { removeCosmetic } from "../../utils/handling/removecosmetic";
import User from "../../db/models/User";

export default {
    data: new SlashCommandBuilder()
        .setName("remove")
        .setDescription("Remove a cosmetic from a user's locker")
        .addStringOption((opt) =>
            opt.setName("user").setDescription("User's Discord ID").setRequired(true)
        )
        .addStringOption((opt) =>
            opt.setName("cosmetic").setDescription("Cosmetic ID").setRequired(true)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
            const noPermsEmbed = new EmbedBuilder()
                .setTitle("Permission Denied")
                .setDescription("You need to be an administrator to use this command.")
                .setColor("Red")
                .setTimestamp();

            return await interaction.reply({ embeds: [noPermsEmbed], flags: 64 });
        }

        const discordId = interaction.options.getString("user", true)!;
        const cosmeticId = interaction.options.getString("cosmetic", true)!;

        try {
            const user = await User.findOne({ discordId });

            if (!user) {
                const notFoundEmbed = new EmbedBuilder()
                    .setTitle("Heix")
                    .setDescription("Couldn't find the selected user.")
                    .setColor("Red")
                    .setTimestamp();

                return await interaction.reply({ embeds: [notFoundEmbed], flags: 64 });
            }

            const result = await removeCosmetic(discordId, cosmeticId);

            const embed = new EmbedBuilder()
                .setTitle("Lyric")
                .setDescription(result.success
                    ? `✅ Removed \`${cosmeticId}\` from <@${discordId}>`
                    : `❌ ${result.message}`)
                .setColor(result.success ? "Green" : "Red")
                .setTimestamp();

            return await interaction.reply({ embeds: [embed], flags: 64 });
        } catch (err) {
            console.error(err);

            const errorEmbed = new EmbedBuilder()
                .setTitle("Lyric")
                .setDescription("We ran into an error while removing the cosmetic.")
                .setColor("Red")
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], flags: 64 });
        }
    },
};