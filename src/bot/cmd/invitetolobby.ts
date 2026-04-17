import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import User from "../../db/models/User";
import Lobby from "../../db/models/Lobby";

export default {
  data: new SlashCommandBuilder()
    .setName("invitetolobby")
    .setDescription("Invite a friend to your lobby")
    .addStringOption(option =>
      option.setName("username")
        .setDescription("Username of friend to invite")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const inviter = await User.findOne({ discordId: interaction.user.id });
    const targetUsername = interaction.options.getString("username", true);

    if (!inviter || !inviter.currentLobby) {
      return interaction.editReply({
        content: "❌ You need to be in a lobby first! Use `/createlobby`"
      });
    }

    const targetUser = await User.findOne({ username: targetUsername });

    if (!targetUser) {
      return interaction.editReply({
        content: "❌ User not found."
      });
    }

    // Check if target is already in a lobby
    if (targetUser.currentLobby) {
      return interaction.editReply({
        content: "❌ This user is already in a lobby."
      });
    }

    // Check if they are friends (for friends-only lobbies)
    const lobby = await Lobby.findOne({ lobbyId: inviter.currentLobby });
    if (lobby?.privacy === "friends-only" && !inviter.friends.includes(targetUser.accountId)) {
      return interaction.editReply({
        content: "❌ You can only invite friends to this lobby."
      });
    }

    // Send lobby invite
    targetUser.lobbyInvites.push({
      lobbyId: inviter.currentLobby,
      from: inviter.accountId,
      expires: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    });

    await targetUser.save();

    const embed = new EmbedBuilder()
      .setTitle("Lobby Invite Sent")
      .setDescription(`Invited **${targetUsername}** to your lobby!`)
      .setColor("#00FF00")
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};