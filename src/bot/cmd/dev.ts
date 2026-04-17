import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import mongoose from "mongoose";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

const ADMIN_ROLES = [
  "1460336894926782494", // original admin role
  "1428924403101732894"  // additional admin role
];

const FNCS_PICKAXE_ID = "AthenaPickaxe:Pickaxe_ID_804_FNCSS20Male";
const LOG_CHANNEL_ID = "1396150414348390540"; // mod-log channel

export default {
  data: new SlashCommandBuilder()
    .setName("dev")
    .setDescription("Add FNCS 2.0 pickaxe to a user (ADMIN ONLY)")
    .addStringOption((opt) =>
      opt.setName("user")
        .setDescription("User's Discord ID")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const requestedId = interaction.options.getString("user", true);
    const executorId = interaction.user.id;

    const memberRoles = interaction.member?.roles;
    const hasAdminAccess = ADMIN_ROLES.some(roleId => memberRoles?.cache?.has(roleId));

    if (!hasAdminAccess) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Access Denied")
        .setDescription("You don't have permission to use this command.")
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    try {
      const user = await User.findOne({ discordId: requestedId });

      if (!user) {
        const embed = new EmbedBuilder()
          .setTitle("❌ User Not Found")
          .setDescription("Couldn't find the selected user in the database.")
          .setColor("Red");

        return await interaction.reply({ embeds: [embed], flags: 64 });
      }

      // Add the FNCS 2.0 pickaxe
      const result = await this.addFNCSPickaxe(user.accountId);

      const embed = new EmbedBuilder()
        .setTitle("✅ FNCS 2.0 Pickaxe Added")
        .setDescription(
          `Successfully added FNCS 2.0 pickaxe to <@${requestedId}>!\n\n` +
          `**Cosmetic ID:** \`${FNCS_PICKAXE_ID}\`\n` +
          `**Account ID:** \`${user.accountId}\``
        )
        .setColor("Green")
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: 64 });

      // Log to mod-log channel
      await this.logDevCommand(interaction, {
        executorId: interaction.user.id,
        executorTag: interaction.user.tag,
        targetDiscordId: requestedId,
        targetUsername: user.username,
        targetAccountId: user.accountId,
        cosmeticId: FNCS_PICKAXE_ID
      });

    } catch (err) {
      console.error("Error in /dev command:", err);

      const embed = new EmbedBuilder()
        .setTitle("❌ Error")
        .setDescription("An error occurred while adding the FNCS 2.0 pickaxe.")
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }
  },

  async addFNCSPickaxe(accountId: string) {
    const profiles = await Profiles.findOne({ accountId });
    if (!profiles) throw new Error(`Profile not found for accountId: ${accountId}`);

    const profile = profiles.profiles["athena"];
    profile.items = profile.items || {};

    // Generate a unique item ID
    const itemId = `FNCS20_Pickaxe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create the FNCS 2.0 pickaxe with proper structure
    const fncsPickaxe = {
      templateId: FNCS_PICKAXE_ID,
      attributes: {
        max_level_bonus: 0,
        level: 1,
        item_seen: true,
        rarity: "efortress",
        variant: {
          variants: [
            {
              channel: "Progressive",
              active: "Stage1",
              owned: ["Stage1"]
            },
            {
              channel: "Part",
              active: "Base",
              owned: ["Base"]
            }
          ]
        },
        favorite: false
      },
      quantity: 1
    };

    // Add to profile
    profile.items[itemId] = fncsPickaxe;

    console.log(`✅ Added FNCS 2.0 pickaxe to ${accountId} with itemId: ${itemId}`);

    await profiles.updateOne({
      $set: { "profiles.athena.items": profile.items },
    });

    return { success: true, itemId };
  },

  async logDevCommand(
    interaction: ChatInputCommandInteraction,
    data: {
      executorId: string;
      executorTag: string;
      targetDiscordId: string;
      targetUsername: string;
      targetAccountId: string;
      cosmeticId: string;
    }
  ) {
    try {
      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID) as TextChannel;
      if (logChannel) {
        const logEmbed = new EmbedBuilder()
          .setTitle("🔧 Dev Command Used - FNCS 2.0 Added")
          .setColor(0xffa500) // Orange color for dev commands
          .addFields(
            { name: "Executor", value: `${data.executorTag} (${data.executorId})`, inline: true },
            { name: "Target User", value: `<@${data.targetDiscordId}>`, inline: true },
            { name: "In-Game Name", value: data.targetUsername, inline: true },
            { name: "Account ID", value: `\`${data.targetAccountId}\``, inline: false },
            { name: "Cosmetic Added", value: `\`${data.cosmeticId}\``, inline: false },
            { name: "Command", value: "`/dev`", inline: true }
          )
          .setTimestamp();

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.warn("[/dev] Failed to send log:", logError);
    }
  }
};