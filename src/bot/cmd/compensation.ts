// src/bot/cmd/compensation.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { mutateVbucks } from "../../utils/handling/mutatevbucks";
import CompensationClaim from "../../db/models/CompensationClaim";

const COMPENSATION_AMOUNT = 100000;
const LOG_CHANNEL_ID = "1454539167286558783"; // ✅ mod-log channel

export const data = new SlashCommandBuilder()
  .setName("compensation")
  .setDescription(`Claim your ${COMPENSATION_AMOUNT.toLocaleString()} V-Bucks (one-time use only)`);

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
    const userId = member.user.id;
    const username = member.user.tag;

    await interaction.deferReply({ flags: 64 });

    // ✅ Check if user has already claimed compensation in DATABASE
    const existingClaim = await CompensationClaim.findOne({ discordId: userId });
    if (existingClaim) {
      await interaction.editReply({
        content: "❌ You have already claimed your one-time compensation!",
      });
      return;
    }

    // mutateVbucks expects Discord ID (based on your current usage)
    const result = await mutateVbucks(userId, COMPENSATION_AMOUNT, "add");

    if (!result.success) {
      await interaction.editReply(
        `❌ Failed to add compensation V-Bucks: ${
          result.message ?? "Unknown error."
        }`,
      );
      return;
    }

    // ✅ Save claim to DATABASE to prevent reuse
    await CompensationClaim.create({
      discordId: userId,
      username: username,
      amount: COMPENSATION_AMOUNT,
      claimedAt: new Date()
    });

    const newTotal = result.newTotal ?? 0;

    await interaction.editReply(
      `🎉 You successfully claimed **${COMPENSATION_AMOUNT.toLocaleString()}** V-Bucks as compensation! Your new total: **${newTotal.toLocaleString()}**.`,
    );

    // 🧾 Log to mod-log channel
    try {
      const ch = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (ch && ch.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("💰 Compensation Claimed")
          .setColor(0xf39c12)
          .addFields(
            { name: "User", value: `${interaction.user.tag} (${interaction.user.id})`, inline: false },
            { name: "Amount", value: COMPENSATION_AMOUNT.toLocaleString(), inline: true },
            { name: "New Total", value: newTotal.toLocaleString(), inline: true },
          )
          .setTimestamp();

        (ch as TextChannel).send({ embeds: [embed] }).catch(() => {});
      }
    } catch (e) {
      // Swallow log errors so they don't affect the command
      console.warn("[/compensation] failed to send log:", e);
    }
  } catch (err) {
    console.error("[/compensation] error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Something went wrong while processing your compensation.");
    } else {
      await interaction.reply({
        content: "❌ Something went wrong while processing your compensation.",
        flags: 64,
      });
    }
  }
}

export default { data, execute };