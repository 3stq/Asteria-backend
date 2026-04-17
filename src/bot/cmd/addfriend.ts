import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import User from "../../db/models/User";

export default {
  data: new SlashCommandBuilder()
    .setName("addfriend")
    .setDescription("Send a friend request to another player")
    .addStringOption(option =>
      option.setName("username")
        .setDescription("The username of the player you want to add")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const targetUsername = interaction.options.getString("username", true);
    const sender = await User.findOne({ discordId: interaction.user.id });

    if (!sender) {
      return interaction.editReply({
        content: "❌ You need to register first using `/register`!"
      });
    }

    // Can't add yourself
    if (sender.username === targetUsername) {
      return interaction.editReply({
        content: "❌ You can't add yourself as a friend!"
      });
    }

    const targetUser = await User.findOne({ username: targetUsername });

    if (!targetUser) {
      return interaction.editReply({
        content: "❌ User not found. Make sure you spelled the username correctly."
      });
    }

    // Check if already friends
    if (sender.friends.includes(targetUser.accountId)) {
      return interaction.editReply({
        content: "✅ You're already friends with this user!"
      });
    }

    // Check if pending request already exists
    const existingRequest = sender.friendRequests.find(
      req => req.from === sender.accountId && req.to === targetUser.accountId && req.status === "pending"
    );

    if (existingRequest) {
      return interaction.editReply({
        content: "⏳ You already have a pending friend request to this user."
      });
    }

    // Add friend request
    sender.friendRequests.push({
      from: sender.accountId,
      to: targetUser.accountId,
      status: "pending",
      sentAt: new Date()
    });

    await sender.save();

    const embed = new EmbedBuilder()
      .setTitle("Friend Request Sent")
      .setDescription(`Friend request sent to **${targetUsername}**!`)
      .setColor("#00FF00")
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};