import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import bcrypt from "bcrypt";
import User from "../../db/models/User";

export default {
  data: new SlashCommandBuilder()
    .setName("resetpassword")
    .setDescription("Change your Lyric password (self only).")
    .addStringOption(opt =>
      opt
        .setName("new_password")
        .setDescription("Your new password")
        .setRequired(true)
        .setMinLength(8)     // optional: enforce basic length
        .setMaxLength(64)    // optional: cap length
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    // Self-only: operate on the caller's discordId
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ No Account")
            .setDescription("You don’t have an account yet. Use `/register` first.")
            .setColor("Red"),
        ],
      });
    }

    // If banned, return the custom message
    if (user.banned) {
      return interaction.editReply({
        content: "LOL you're banned kid",
      });
    }

    // Get desired new password
    const newPlain = interaction.options.getString("new_password", true);

    try {
      const hash = await bcrypt.hash(newPlain, 10);
      user.password = hash;
      await user.save();

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("✅ Password Updated")
            .setDescription("Your password has been changed successfully.")
            .setColor("Green")
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error("resetpassword error:", err);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("❌ Command Error")
            .setDescription("An error occurred while updating your password. Please try again later.")
            .setColor("Red"),
        ],
      });
    }
  },
};
