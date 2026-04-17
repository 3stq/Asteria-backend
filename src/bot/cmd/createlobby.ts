import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import User from "../../db/models/User";
import Lobby from "../../db/models/Lobby";
import { v4 as uuidv4 } from "uuid";

export default {
  data: new SlashCommandBuilder()
    .setName("createlobby")
    .setDescription("Create a new game lobby")
    .addStringOption(option =>
      option.setName("privacy")
        .setDescription("Lobby privacy settings")
        .addChoices(
          { name: "Public", value: "public" },
          { name: "Private", value: "private" },
          { name: "Friends Only", value: "friends-only" }
        )
        .setRequired(true)
    )
    .addIntegerOption(option =>
      option.setName("players")
        .setDescription("Maximum players (2-16)")
        .setMinValue(2)
        .setMaxValue(16)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const user = await User.findOne({ discordId: interaction.user.id });

    if (!user) {
      return interaction.editReply({
        content: "❌ You need to register first using `/register`!"
      });
    }

    // Check if user is already in a lobby
    if (user.currentLobby) {
      return interaction.editReply({
        content: "❌ You're already in a lobby! Leave your current lobby first."
      });
    }

    const privacy = interaction.options.getString("privacy", true) as "public" | "private" | "friends-only";
    const maxPlayers = interaction.options.getInteger("players") || 4;

    // Create new lobby
    const lobbyId = uuidv4().replace(/-/g, "").substring(0, 12);
    const lobby = new Lobby({
      lobbyId,
      creator: user.accountId,
      members: [user.accountId],
      maxPlayers,
      privacy,
      gameMode: "battle_royale",
      region: "NAE"
    });

    // Update user's current lobby
    user.currentLobby = lobbyId;
    
    await Promise.all([lobby.save(), user.save()]);

    const embed = new EmbedBuilder()
      .setTitle("Lobby Created")
      .setDescription(`Successfully created a ${privacy} lobby!`)
      .addFields(
        { name: "Lobby ID", value: lobbyId, inline: true },
        { name: "Privacy", value: privacy, inline: true },
        { name: "Max Players", value: maxPlayers.toString(), inline: true }
      )
      .setColor("#0099FF")
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
};