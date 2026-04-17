import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import Tournaments from "../../db/models/Tournaments";

export default {
  data: new SlashCommandBuilder()
    .setName("resetarena")
    .setDescription("Reset all arena points (Admin only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    // Check if user has the specific role ID
    const REQUIRED_ROLE_ID = "1460336894926782494";
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    
    if (!member) {
      await interaction.editReply({
        content: "❌ This command can only be used in a server."
      });
      return;
    }

    // Check for the specific role ID
    if (!member.roles.cache.has(REQUIRED_ROLE_ID)) {
      await interaction.editReply({
        content: `❌ You don't have permission to use this command. Required role: <@&${REQUIRED_ROLE_ID}>`
      });
      return;
    }

    const confirm = interaction.options.getBoolean("confirm");
    
    if (!confirm) {
      await interaction.editReply({
        content: "❌ Reset cancelled. You must confirm the reset to proceed."
      });
      return;
    }

    try {
      // Get count of players with arena points before reset
      const playersWithPoints = await Tournaments.countDocuments({ hype: { $gt: 0 } });
      const totalTournaments = await Tournaments.countDocuments({});

      // Reset all hype points to 0
      const result = await Tournaments.updateMany(
        { hype: { $gt: 0 } }, // Only update players with points > 0
        { $set: { hype: 0 } }
      );

      const embed = new EmbedBuilder()
        .setTitle("🎯 Arena Points Reset")
        .setColor("#00ff00")
        .setDescription("All arena points have been successfully reset to 0.")
        .addFields(
          {
            name: "Players Affected",
            value: `**${result.modifiedCount}** players had their points reset`,
            inline: true
          },
          {
            name: "Total Players",
            value: `**${totalTournaments}** players in tournaments database`,
            inline: true
          },
          {
            name: "Previous Active Players",
            value: `**${playersWithPoints}** players had arena points before reset`,
            inline: true
          }
        )
        .setFooter({ 
          text: `Reset by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.editReply({ 
        content: "✅ Arena points reset completed!",
        embeds: [embed] 
      });

      console.log(`🏆 Arena points reset by ${interaction.user.tag} (Role ID: ${REQUIRED_ROLE_ID}): ${result.modifiedCount} players affected`);

    } catch (error) {
      console.error('❌ Error resetting arena points:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Reset Failed")
        .setColor("#ff0000")
        .setDescription("An error occurred while resetting arena points.")
        .addFields({
          name: "Error",
          value: "```" + (error as Error).message + "```"
        })
        .setTimestamp();

      await interaction.editReply({ 
        content: "❌ Failed to reset arena points",
        embeds: [errorEmbed] 
      });
    }
  },
};