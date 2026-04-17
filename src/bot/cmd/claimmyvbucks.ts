import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  userMention,
} from "discord.js";
import { mutateVbucks } from "../../utils/handling/mutatevbucks";

const COOLDOWN_HOURS = 12;
const REWARD_AMOUNT = 1000;

// In-memory cooldown map (userId -> timestamp last claimed)
const lastClaims = new Map<string, number>();

export const data = new SlashCommandBuilder()
  .setName("claimmyvbucks")
  .setDescription(`Claim ${REWARD_AMOUNT} V-Bucks (every ${COOLDOWN_HOURS} hours)`);

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const userId = interaction.user.id;
    const now = Date.now();
    const lastClaim = lastClaims.get(userId);

    if (lastClaim) {
      const elapsed = (now - lastClaim) / (1000 * 60 * 60); // hours
      if (elapsed < COOLDOWN_HOURS) {
        const remaining = COOLDOWN_HOURS - elapsed;
        const hours = Math.floor(remaining);
        const minutes = Math.floor((remaining - hours) * 60);

        await interaction.reply({
          content: `⏳ You already claimed your V-Bucks! Please wait **${hours}h ${minutes}m** before claiming again.`,
          flags: 64,
        });
        return;
      }
    }

    // Update last claim time
    lastClaims.set(userId, now);

    await interaction.deferReply({ flags: 64 });

    const result = await mutateVbucks(userId, REWARD_AMOUNT, "add");

    if (!result.success) {
      await interaction.editReply(
        `❌ Failed to grant your V-Bucks: ${result.message ?? "Unknown error."}`,
      );
      return;
    }

    await interaction.editReply(
      `🎉 You claimed **${REWARD_AMOUNT.toLocaleString()} V-Bucks**! New total: **${(result.newTotal ?? 0).toLocaleString()}**.`,
    );
  } catch (err) {
    console.error("[/claimmyvbucks] error:", err);
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
