import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
  User as DiscordUser,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";

const MODERATOR_ROLE_IDS = [
  "1460336894926782494", // original moderator role
  "1428924403101732894"  // additional admin role
];
const LOG_CHANNEL_ID    = "1454539167286558783"; // moderation logs channel

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a Fortnite account and remove Discord timeout")
  .addStringOption((option) =>
    option
      .setName("discordid")
      .setDescription("Discord user ID")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;

  // Role check - updated to check for both roles
  const hasModeratorRole = MODERATOR_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
  
  if (!hasModeratorRole) {
    return interaction.reply({
      content: "❌ You do not have permission to use this command.",
      flags: 64,
    });
  }

  const discordId = interaction.options.getString("discordid", true);

  const user = await User.findOne({ discordId });
  if (!user) {
    return interaction.reply({
      content: `❌ No Fortnite account linked to Discord ID: ${discordId}`,
      flags: 64,
    });
  }

  if (!user.banned) {
    await interaction.reply({
      content: `✅ User **${user.username}** is not banned.`,
      flags: 64,
    });
    // Still log the action (attempted unban)
    await logUnban(interaction, {
      targetDiscordId: discordId,
      targetUsername: user.username,
      accountId: user.accountId,
      actuallyUnbanned: false,
      timeoutLifted: false,
      dmSent: false,
      note: "User was not banned.",
    });
    return;
  }

  // Update DB
  user.banned = false;
  (user as any).banReason = undefined;
  (user as any).banExpires = undefined;
  await user.save();

  // Try to lift Discord timeout
  let timeoutLifted = false;
  try {
    const guildMember = await interaction.guild?.members.fetch(discordId);
    if (
      guildMember instanceof GuildMember &&
      guildMember.communicationDisabledUntilTimestamp
    ) {
      await guildMember.timeout(null, "Unbanned by admin");
      timeoutLifted = true;
    }
  } catch (err) {
    // ignore, we'll reflect in log message
  }

  // Try to DM the user
  let dmSent = false;
  try {
    const discordUser: DiscordUser = await interaction.client.users.fetch(discordId);

    const dmEmbed = new EmbedBuilder()
      .setTitle("Unban Notification")
      .setDescription("You have been unbanned from Lyric.")
      .setColor(0x43b581) // green
      .setTimestamp();

    await discordUser.send({
      content: `<@${discordId}>`,
      embeds: [dmEmbed],
    });

    dmSent = true;
  } catch {
    dmSent = false;
  }

  await interaction.reply({
    content:
      `✅ Unbanned Fortnite account **${user.username}** (${user.accountId}) linked to Discord ID **${discordId}**.\n` +
      `${timeoutLifted ? "🕒 Discord timeout removed.\n" : "ℹ️ No active timeout found.\n"}` +
      `${dmSent ? "✉️ DM sent to the user." : "⚠️ Failed to DM the user (DMs closed or blocked)."}`
    ,
    flags: 64,
  });

  await logUnban(interaction, {
    targetDiscordId: discordId,
    targetUsername: user.username,
    accountId: user.accountId,
    actuallyUnbanned: true,
    timeoutLifted,
    dmSent,
  });
}

async function logUnban(
  interaction: ChatInputCommandInteraction,
  opts: {
    targetDiscordId: string;
    targetUsername?: string;
    accountId?: string;
    actuallyUnbanned: boolean;
    timeoutLifted: boolean;
    dmSent: boolean;
    note?: string;
  }
) {
  try {
    const channel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
    if (!channel || !(channel instanceof TextChannel)) return;

    const embed = new EmbedBuilder()
      .setTitle(opts.actuallyUnbanned ? "✅ User Unbanned" : "ℹ️ Unban Attempt")
      .setColor(opts.actuallyUnbanned ? 0x43b581 : 0xfee75c) // green / yellow
      .addFields(
        { name: "Moderator", value: `<@${interaction.user.id}> (${interaction.user.id})`, inline: false },
        { name: "Target", value: `<@${opts.targetDiscordId}> (${opts.targetDiscordId})`, inline: false },
        ...(opts.targetUsername ? [{ name: "Username", value: opts.targetUsername, inline: true }] : []),
        ...(opts.accountId ? [{ name: "Account ID", value: opts.accountId, inline: true }] : []),
        { name: "Timeout Lifted", value: String(opts.timeoutLifted), inline: true },
        { name: "DM Sent", value: String(opts.dmSent), inline: true },
        ...(opts.note ? [{ name: "Note", value: opts.note, inline: false }] : []),
      )
      .setTimestamp();

    await channel.send({ embeds: [embed] });
  } catch {
    // Silent fail if we can't log
  }
}

export default { data, execute };