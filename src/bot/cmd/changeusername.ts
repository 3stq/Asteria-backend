import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";

const ADMIN_ROLE_ID = "1460336894926782494"; // full access
const SELF_ROLE_ID  = "1460345443727708212"; // self only
const EXTRA_ROLE_ID = "1428924403101732894"; // additional admin role
const LOG_CHANNEL_ID = "1454539167286558783"; // mod-log channel

export default {
  data: new SlashCommandBuilder()
    .setName("changeusername")
    .setDescription("Change the username of a registered user.")
    // ✅ REQUIRED FIRST
    .addStringOption((opt) =>
      opt
        .setName("new_username")
        .setDescription("New username (no spaces allowed)")
        .setRequired(true)
    )
    // ✅ OPTIONAL AFTER
    .addStringOption((opt) =>
      opt
        .setName("discord_id")
        .setDescription("Target user's Discord ID (omit to change your own)")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const member = interaction.member as any;

    if (!member?.roles?.cache) {
      return interaction.reply({
        content: "❌ Could not verify your roles.",
        flags: 64,
      });
    }

    const hasAdminRole = member.roles.cache.has(ADMIN_ROLE_ID);
    const hasSelfRole  = member.roles.cache.has(SELF_ROLE_ID);
    const hasExtraRole = member.roles.cache.has(EXTRA_ROLE_ID);

    if (!hasAdminRole && !hasSelfRole && !hasExtraRole) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: 64,
      });
    }

    const providedId  = interaction.options.getString("discord_id") ?? undefined;
    const newUsername = interaction.options.getString("new_username", true);

    // Check for spaces in the new username
    if (/\s/.test(newUsername)) {
      return interaction.reply({
        content: "❌ Username cannot contain spaces.",
        flags: 64,
      });
    }

    // Allow only letters, numbers, and underscores
    const validChars = /^[a-zA-Z0-9_]+$/;
    if (!validChars.test(newUsername)) {
      return interaction.reply({
        content: "❌ Username can only contain letters, numbers, and underscores (_).",
        flags: 64,
      });
    }

    // Optional: Add additional validation
    if (newUsername.length < 2) {
      return interaction.reply({
        content: "❌ Username must be at least 2 characters long.",
        flags: 64,
      });
    }

    if (newUsername.length > 32) {
      return interaction.reply({
        content: "❌ Username cannot exceed 32 characters.",
        flags: 64,
      });
    }

    // decide target
    let targetDiscordId = providedId ?? interaction.user.id;

    // If user only has SELF_ROLE, they can only change their own username
    if (hasSelfRole && !hasAdminRole && !hasExtraRole) {
      if (providedId && providedId !== interaction.user.id) {
        return interaction.reply({
          content: "❌ You can only change your **own** username with your role.",
          flags: 64,
        });
      }
      targetDiscordId = interaction.user.id;
    }

    const user = await User.findOne({ discordId: targetDiscordId });
    if (!user) {
      return interaction.reply({
        content: `❌ No user found with Discord ID **${targetDiscordId}**.`,
        flags: 64,
      });
    }

    const existing = await User.findOne({ username: newUsername });
    if (existing) {
      return interaction.reply({
        content: `⚠️ The username **${newUsername}** is already taken.`,
        flags: 64,
      });
    }

    const oldUsername = user.username;
    user.username = newUsername;
    await user.save();

    const embed = new EmbedBuilder()
      .setTitle("Username Changed")
      .setDescription(
        `✅ Successfully changed **${oldUsername}** to **${newUsername}** for <@${targetDiscordId}>.`
      )
      .setColor("Green")
      .setTimestamp();

    // Send log to mod-log channel
    try {
      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("👤 Username Changed")
          .setColor(0x3498db)
          .addFields(
            { name: "Executor", value: `${interaction.user.tag} (${interaction.user.id})`, inline: true },
            { name: "Target User", value: `<@${targetDiscordId}> (${targetDiscordId})`, inline: true },
            { name: "Old Username", value: oldUsername, inline: true },
            { name: "New Username", value: newUsername, inline: true },
            { name: "Target Account ID", value: user.accountId, inline: false }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.warn("[/changeusername] Failed to send log:", logError);
    }

    return interaction.reply({ embeds: [embed], flags: 64 });
  },
};