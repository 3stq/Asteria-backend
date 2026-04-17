import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import Tournaments from "../../db/models/Tournaments";

const ADMIN_ROLE_ID = "1465591414451605611";
const EXTRA_ROLE_ID = "1465591414451605610"; // additional admin role
const LOG_CHANNEL_ID = "1454539167286558783"; // mod-log channel

export default {
  data: new SlashCommandBuilder()
    .setName("delete")
    .setDescription("Admin only: Delete an Lyric account by specifying a user")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to delete")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    try {
      const member = interaction.member;
      const isAdmin = member && "roles" in member && (member.roles.cache.has(ADMIN_ROLE_ID) || member.roles.cache.has(EXTRA_ROLE_ID));

      if (!isAdmin) {
        return interaction.editReply({
          content: "You do not have permission to delete any accounts.",
        });
      }

      const targetUser = interaction.options.getUser("target", true);

      // Find the User document
      const user = await User.findOne({ discordId: targetUser.id });
      if (!user) {
        return interaction.editReply({
          content: `User **${targetUser.tag}** is not registered!`,
        });
      }

      // Store user info for logging before deletion
      const userInfo = {
        username: user.username,
        email: user.email,
        accountId: user.accountId,
        created: user.created
      };

      // Lookup profile by discordId first (primary key now)
      let profile = await Profiles.findOne({ discordId: targetUser.id });

      if (!profile) {
        // If not found by discordId, try the accountId from the User document
        profile = await Profiles.findOne({ accountId: user.accountId });

        if (!profile) {
          return interaction.editReply({
            content: `Please contact support, the profile for **${targetUser.tag}** was not found. (Tried discordId and accountId)`,
          });
        }
        
        // AUTO-FIX: If profile was found by accountId but missing discordId, fix it
        profile.discordId = targetUser.id;
        await profile.save();
      }

      // Delete tournament data if exists
      let tournamentDeleted = false;
      const tournament = await Tournaments.findOne({ accountId: user.accountId });
      if (tournament) {
        await tournament.deleteOne();
        tournamentDeleted = true;
      }

      // Delete both documents
      await profile.deleteOne();
      await user.deleteOne();

      // Send log to mod-log channel
      try {
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
        if (logChannel) {
          const logEmbed = new EmbedBuilder()
            .setTitle("🗑️ Account Deleted")
            .setColor(0xe74c3c)
            .addFields(
              { name: "Executor", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
              { name: "Target User", value: `${targetUser.tag} (${targetUser.id})`, inline: true },
              { name: "In-Game Username", value: userInfo.username, inline: true },
              { name: "Email", value: userInfo.email, inline: true },
              { name: "Account ID", value: userInfo.accountId, inline: false },
              { name: "Account Created", value: `<t:${Math.floor(userInfo.created.getTime() / 1000)}:R>`, inline: true },
              { name: "Tournament Data", value: tournamentDeleted ? "✅ Deleted" : "❌ Not Found", inline: true }
            )
            .setTimestamp();

          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (logError) {
        console.warn("[/delete] Failed to send log:", logError);
      }

      return interaction.editReply({
        content: `Account for **${targetUser.tag}** has been successfully deleted.`,
      });
    } catch (err) {
      console.error("Error in /delete command:", err);
      return interaction.editReply({
        content: "An error occurred while deleting the account. Please try again later.",
      });
    }
  },
};