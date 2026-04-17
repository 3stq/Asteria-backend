import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import createProfiles from "../../utils/creationTools/createProfiles";
import Tournaments from "../../db/models/Tournaments";

const ADMIN_ROLE_ID = "1397248040116682772";

export default {
  data: new SlashCommandBuilder()
    .setName("repair")
    .setDescription("Admin only: Repair missing profiles for users")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to repair")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    try {
      // ADMIN ROLE CHECK
      const member = interaction.member;
      if (!member || !('roles' in member)) {
        return interaction.editReply({
          content: "Cannot verify your permissions. Please try again later.",
        });
      }

      const isAdmin = member.roles.cache.has(ADMIN_ROLE_ID);
      if (!isAdmin) {
        return interaction.editReply({
          content: "❌ You do not have permission to use this command. Admin role required.",
        });
      }

      const targetUser = interaction.options.getUser("target", true);

      // Find the User document
      const user = await User.findOne({ discordId: targetUser.id });
      if (!user) {
        return interaction.editReply({
          content: `User **${targetUser.tag}** is not registered in the User collection!`,
        });
      }

      // Check if profile already exists
      const existingProfile = await Profiles.findOne({ discordId: targetUser.id });
      if (existingProfile) {
        return interaction.editReply({
          content: `Profile for **${targetUser.tag}** already exists. No repair needed.`,
        });
      }

      // Check if profile exists by accountId (different discordId issue)
      const existingProfileByAccount = await Profiles.findOne({ accountId: user.accountId });
      if (existingProfileByAccount) {
        // Fix the discordId mismatch
        existingProfileByAccount.discordId = targetUser.id;
        await existingProfileByAccount.save();
        
        return interaction.editReply({
          content: `✅ Fixed profile for **${targetUser.tag}**. Profile existed with wrong discordId.`,
        });
      }

      // Create the missing profile
      const userProfile = await createProfiles(user.accountId);

      await Profiles.create({
        accountId: user.accountId,
        discordId: targetUser.id,
        profiles: userProfile,
        created: new Date().toISOString(),
        access_token: "",
        refresh_token: "",
      });

      // Also ensure they have a tournament entry
      const existingTournament = await Tournaments.findOne({ accountId: user.accountId });
      if (!existingTournament) {
        await Tournaments.create({
          accountId: user.accountId,
          hype: 0,
          divisions: ["NormalArenaDiv1"],
        });
      }

      const embed = new EmbedBuilder()
        .setTitle("✅ Profile Repaired Successfully!")
        .setDescription(`Repaired profile for **${targetUser.tag}**`)
        .addFields(
          { name: "Discord ID", value: targetUser.id, inline: true },
          { name: "Account ID", value: user.accountId, inline: true },
          { name: "Username", value: user.username, inline: true }
        )
        .setColor("#00FF00")
        .setTimestamp();

      return interaction.editReply({
        embeds: [embed],
      });
    } catch (err) {
      console.error("Error in /repair command:", err);
      return interaction.editReply({
        content: "An error occurred while repairing the profile. Please check the logs.",
      });
    }
  },
};