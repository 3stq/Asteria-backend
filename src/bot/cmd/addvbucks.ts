// src/bot/cmd/addvbucks.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  userMention,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { mutateVbucks } from "../../utils/handling/mutatevbucks"; // ✅ keep this path

const ALLOWED_ROLE_IDS = [
  "1460336894926782494", // original admin role
  "1386316323545415690"  // additional admin role
];
const LOG_CHANNEL_ID = "1454539167286558783"; // ✅ mod-log channel

export const data = new SlashCommandBuilder()
  .setName("addvbucks")
  .setDescription("Add V-Bucks to a user's account (admin-only).")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The user to receive V-Bucks")
      .setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("amount")
      .setDescription("How many V-Bucks to add")
      .setRequired(true)
      .setMinValue(1),
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        content: "❌ This command can only be used inside a server.",
        flags: 64,
      });
      return;
    }

    const member = interaction.member as GuildMember;

    // ✅ Only allow specific roles - updated to check for both roles
    const hasAllowedRole = ALLOWED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
    
    if (!hasAllowedRole) {
      await interaction.reply({
        content: "❌ You don't have permission to use this command.",
        flags: 64,
      });
      return;
    }

    const targetUser = interaction.options.getUser("user", true);
    const amount = interaction.options.getInteger("amount", true);

    if (!Number.isSafeInteger(amount) || amount <= 0) {
      await interaction.reply({
        content: "❌ Amount must be a positive integer.",
        flags: 64,
      });
      return;
    }

    await interaction.deferReply({ flags: 64 });

    // mutateVbucks expects Discord ID (based on your current usage)
    const result = await mutateVbucks(targetUser.id, amount, "add");

    if (!result.success) {
      await interaction.editReply(
        `❌ Failed to add V-Bucks to ${userMention(targetUser.id)}: ${
          result.message ?? "Unknown error."
        }`,
      );
      return;
    }

    const newTotal = result.newTotal ?? 0;

    await interaction.editReply(
      `✅ Added **${amount.toLocaleString()}** V-Bucks to ${userMention(
        targetUser.id,
      )}. New total: **${newTotal.toLocaleString()}**.`,
    );

    // 🧾 Log to mod-log channel
    try {
      const ch = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (ch && ch.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("💳 V-Bucks Added")
          .setColor(0x2ecc71)
          .addFields(
            { name: "Executor", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
            { name: "Target", value: `${targetUser.tag} (${targetUser.id})`, inline: false },
            { name: "Amount", value: amount.toLocaleString(), inline: true },
            { name: "New Total", value: newTotal.toLocaleString(), inline: true },
          )
          .setTimestamp();

        (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      // Swallow log errors so they don't affect the command
      console.warn("[/addvbucks] failed to send log:", e);
    }
  } catch (err) {
    console.error("[/addvbucks] error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Something went wrong while processing that.");
    } else {
      await interaction.reply({
        content: "❌ Something went wrong while processing that.",
        flags: 64,
      });
    }
  }
}

export default { data, execute };