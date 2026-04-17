import {
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    EmbedBuilder
} from "discord.js";
import User from "../../db/models/User";

const ADMIN_ROLE_ID = "1397248040116682772"; // Your admin role ID

export default {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a player from the game server")
        .addStringOption(option =>
            option.setName("username")
                .setDescription("The username of the player to kick")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("reason")
                .setDescription("Reason for kicking the player")
                .setRequired(false)
        ),

    async execute(interaction: ChatInputCommandInteraction) {
        await interaction.deferReply({ flags: 64 });

        try {
            // Check if user has admin role
            const member = interaction.member;
            if (!member || !('roles' in member) || !member.roles.cache.has(ADMIN_ROLE_ID)) {
                return interaction.editReply({
                    content: "❌ You do not have permission to use this command. Admin role required."
                });
            }

            const username = interaction.options.getString("username", true);
            const reason = interaction.options.getString("reason") || "No reason provided";

            // Find the user in database
            const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
            
            if (!user) {
                return interaction.editReply({
                    content: `❌ User **${username}** not found in the database.`
                });
            }

            // Add kick entry to database
            const kickResult = await addKickToDatabase(user.accountId, username, reason, interaction.user.tag);

            if (kickResult.success) {
                const embed = new EmbedBuilder()
                    .setTitle("✅ Player Kicked Successfully")
                    .setDescription(`Player **${username}** has been kicked from the game server.`)
                    .addFields(
                        { name: "Username", value: username, inline: true },
                        { name: "Account ID", value: user.accountId, inline: true },
                        { name: "Reason", value: reason, inline: false },
                        { name: "Kicked By", value: interaction.user.tag, inline: true },
                        { name: "Note", value: "Player will be kicked on next connection attempt or server check", inline: false }
                    )
                    .setColor("#FF0000")
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            } else {
                return interaction.editReply({
                    content: `❌ Failed to kick player: ${kickResult.error}`
                });
            }

        } catch (error) {
            console.error("Kick command error:", error);
            return interaction.editReply({
                content: "❌ An error occurred while executing the kick command."
            });
        }
    }
};

// Add kick entry to database
async function addKickToDatabase(accountId: string, username: string, reason: string, kickedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
        // We'll store kicks in the User model - add a kicks array
        const UserModule = await import("../../db/models/User");
        const User = UserModule.default;

        await User.findOneAndUpdate(
            { accountId },
            {
                $push: {
                    kicks: {
                        reason,
                        kickedBy,
                        kickedAt: new Date(),
                        active: true
                    }
                },
                isKicked: true // Simple flag for quick checking
            }
        );

        return { success: true };
    } catch (error) {
        console.error("Database kick error:", error);
        return { success: false, error: "Database error" };
    }
}