import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  User as DiscordUser,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";

const MODERATOR_ROLE_ID = "1460337766603821226"; // keep your role id
const EXTRA_ROLE_ID = "1460336894926782494"; // additional admin role
const LOG_CHANNEL_ID    = "1454539167286558783"; // where to post ban logs

const NOTICE_DEFAULT = "This ban is permanent and cannot be appealed.";
const FAR_FUTURE_DEFAULT = "2125-08-08"; // mimic your original style

function resolveExpiryFromPreset(preset?: string | null): Date | null {
  if (!preset) return null;
  if (preset === "permanent") return new Date(FAR_FUTURE_DEFAULT);
  const m = preset.match(/^(\d+)d$/i);
  if (m) {
    const days = parseInt(m[1], 10);
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }
  return null;
}

function resolveExpiry(input?: string | null): Date {
  if (!input) return new Date(FAR_FUTURE_DEFAULT);
  if (input.toLowerCase() === "permanent") return new Date(FAR_FUTURE_DEFAULT);

  const rel = input.match(/^(\d+)\s*d$/i);
  if (rel) {
    const days = parseInt(rel[1], 10);
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + days);
    return d;
  }

  const parsed = new Date(input);
  if (!isNaN(parsed.getTime())) return parsed;

  return new Date(FAR_FUTURE_DEFAULT);
}

function discordDateTag(date: Date, style: "D" | "F" | "R" = "D") {
  const unix = Math.floor(date.getTime() / 1000);
  return `<t:${unix}:${style}>`;
}

export default {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Ban a user, DM them a private notice, and save the ban details.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((opt) =>
      opt
        .setName("identifier")
        .setDescription("User's username or Discord ID")
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Reason for the ban")
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("expiry_preset")
        .setDescription("Pick a common expiration")
        .setRequired(false)
        .addChoices(
          { name: "1 Day", value: "1d" },
          { name: "7 Days", value: "7d" },
          { name: "30 Days", value: "30d" },
          { name: "90 Days", value: "90d" },
          { name: "Permanent", value: "permanent" },
        )
    )
    .addStringOption((opt) =>
      opt
        .setName("expires")
        .setDescription('Custom expiration (e.g., "45d", "2025-12-31", or "permanent"). Used if no preset is chosen.')
        .setRequired(false)
    )
    .addBooleanOption((opt) =>
      opt
        .setName("include_notice")
        .setDescription('Include a notice line like: "This ban is permanent and cannot be appealed."')
        .setRequired(false)
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("Optional extra description to include in the DM")
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    // Role check (updated to include both roles)
    const member = interaction.member as GuildMember;
    const hasModRole = member?.roles?.cache?.has(MODERATOR_ROLE_ID);
    const hasExtraRole = member?.roles?.cache?.has(EXTRA_ROLE_ID);
    
    if (!hasModRole && !hasExtraRole) {
      return interaction.editReply({ content: "You do not have permission to use this command." });
    }

    const identifier    = interaction.options.getString("identifier", true);
    const reason        = interaction.options.getString("reason") || "No reason provided";
    const preset        = interaction.options.getString("expiry_preset");
    const expiresInput  = interaction.options.getString("expires");
    const includeNotice = interaction.options.getBoolean("include_notice") ?? false;
    const description   = interaction.options.getString("description") ?? "";

    // Find the user in your DB (by discordId or username)
    const user = await User.findOne({
      $or: [{ discordId: identifier }, { username: identifier }],
    });

    if (!user) {
      return interaction.editReply({ content: "User not found." });
    }

    if (user.banned) {
      return interaction.editReply({ content: "This user is already banned." });
    }

    // Resolve expiration: preset wins if provided, else use custom
    const presetDate = resolveExpiryFromPreset(preset);
    const banExpires = presetDate ?? resolveExpiry(expiresInput);

    // Save to DB
    user.banned = true;
    (user as any).banReason  = reason;
    (user as any).banExpires = banExpires;
    await user.save();

    const expiryTag = discordDateTag(banExpires, "D");

    // Try to DM the user
    let dmSuccess = false;
    try {
      const discordUser: DiscordUser = await interaction.client.users.fetch(user.discordId);
      const dmEmbed = new EmbedBuilder()
        .setTitle("Ban Notification")
        .setDescription("You have been banned from Lyric and some of its services may be disabled.")
        .setColor(0x7b2cff)
        .addFields(
          { name: "Reason", value: reason, inline: true },
          { name: "Expires", value: expiryTag, inline: true }
        )
        .setTimestamp();

      if (includeNotice) {
        dmEmbed.addFields({ name: "Notice", value: NOTICE_DEFAULT });
      }
      if (description.trim()) {
        dmEmbed.addFields({ name: "Description", value: description.trim() });
      }

      await discordUser.send({ content: `<@${user.discordId}>`, embeds: [dmEmbed] });
      dmSuccess = true;
    } catch {
      dmSuccess = false;
    }

    // Reply to moderator (ephemeral)
    const modEmbed = new EmbedBuilder()
      .setTitle("🔨 User Banned")
      .setColor("Red")
      .addFields(
        { name: "User", value: `${user.username} (<@${user.discordId}>)`, inline: false },
        { name: "Account ID", value: user.accountId, inline: false },
        { name: "Reason", value: reason, inline: false },
        { name: "Expires", value: expiryTag, inline: false },
        ...(includeNotice ? [{ name: "Notice", value: NOTICE_DEFAULT, inline: false }] : []),
        ...(description.trim() ? [{ name: "Description", value: description.trim(), inline: false }] : []),
      )
      .setFooter({ text: dmSuccess ? "DM sent to user" : "Failed to DM user" })
      .setTimestamp();

    await interaction.editReply({ embeds: [modEmbed] });

    // 🔔 Public log to the moderation channel
    try {
      const ch = interaction.client.channels.cache.get(LOG_CHANNEL_ID) as TextChannel | undefined;
      if (ch && ch.send) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🚫 Ban Issued")
          .setColor("DarkRed")
          .addFields(
            { name: "Banned User", value: `${user.username} (<@${user.discordId}>)`, inline: false },
            { name: "Banned By", value: `<@${interaction.user.id}>`, inline: false },
            { name: "Reason", value: reason, inline: false },
            { name: "Expires", value: expiryTag, inline: false },
          )
          .setTimestamp();

        await ch.send({ embeds: [logEmbed] });
      }
    } catch (e) {
      // Don't break the command if logging fails
      console.warn("Failed to post ban log:", e);
    }
  },
};