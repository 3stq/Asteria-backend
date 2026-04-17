import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";
import { giveFullLocker } from "../../utils/handling/giveFullLocker";

const FULL_ACCESS_ROLES = [
  "1490432802209136924", // original admin role
  "1465591414451605611"  // additional admin role
];
const SELF_ONLY_ROLE = "1460345443727708212";
const LOG_CHANNEL_ID = "1454539167286558783"; // mod-log channel

export default {
  data: new SlashCommandBuilder()
    .setName("fulllocker")
    .setDescription("Give a user full locker (excluding FNCS 2.0)!")
    .addStringOption((opt) =>
      opt.setName("user")
        .setDescription("User's Discord ID (only yourself if limited role)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const requestedId = interaction.options.getString("user", true);
    const executorId = interaction.user.id;

    const memberRoles = interaction.member?.roles;
    const hasFullAccess = FULL_ACCESS_ROLES.some(roleId => memberRoles?.cache?.has(roleId));
    const hasSelfOnlyAccess = memberRoles?.cache?.has(SELF_ONLY_ROLE);

    // Permissions logic
    if (!hasFullAccess && hasSelfOnlyAccess && requestedId !== executorId) {
      const embed = new EmbedBuilder()
        .setTitle("Lyric")
        .setDescription("You can only use this command on yourself.")
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    if (!hasFullAccess && !hasSelfOnlyAccess) {
      const embed = new EmbedBuilder()
        .setTitle("Lyric")
        .setDescription("You don't have permission to use this command.")
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    try {
      const user = await User.findOne({ discordId: requestedId });

      if (!user) {
        const embed = new EmbedBuilder()
          .setTitle("Lyric")
          .setDescription("Couldn't find the selected user.")
          .setColor("Red");

        return await interaction.reply({ embeds: [embed], flags: 64 });
      }

      // Use giveFullLocker which now automatically excludes FNCS 2.0
      const result = await giveFullLocker(user.accountId);

      const embed = new EmbedBuilder()
        .setTitle("Lyric")
        .setDescription(
          `Full locker granted to <@${requestedId}> successfully!\n\n` +
          `**Items Added:** ${result.itemsAdded}\n` +
          `**Items Excluded:** ${result.itemsExcluded} (FNCS 2.0)`
        )
        .setColor("Green");

      await interaction.reply({ embeds: [embed], flags: 64 });

      // Log to mod-log channel
      await this.logFullLocker(interaction, {
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetDiscordId: requestedId,
        targetUsername: user.username,
        targetAccountId: user.accountId,
        itemsAdded: result.itemsAdded,
        itemsExcluded: result.itemsExcluded
      });

    } catch (err) {
      console.error(err);

      const embed = new EmbedBuilder()
        .setTitle("Lyric")
        .setDescription(
          "An error occurred while processing the full locker command."
        )
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },

  async logFullLocker(
    interaction: ChatInputCommandInteraction,
    data: {
      executorId: string;
      executorTag: string;
      targetDiscordId: string;
      targetUsername: string;
      targetAccountId: string;
      itemsAdded: number;
      itemsExcluded: number;
    }
  ) {
    try {
      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🎁 Full Locker Granted (Excluding FNCS 2.0)")
          .setColor(0x9b59b6) // Purple color for locker
          .addFields(
            { name: "Executor", value: `${data.executorTag} (${data.executorId})`, inline: true },
            { name: "Target User", value: `<@${data.targetDiscordId}>`, inline: true },
            { name: "In-Game Name", value: data.targetUsername, inline: true },
            { name: "Account ID", value: `\`${data.targetAccountId}\``, inline: false },
            { name: "Items Added", value: `${data.itemsAdded}`, inline: true },
            { name: "Items Excluded", value: `${data.itemsExcluded} (FNCS 2.0)`, inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.warn("[/fulllocker] Failed to send log:", logError);
    }
  }
};