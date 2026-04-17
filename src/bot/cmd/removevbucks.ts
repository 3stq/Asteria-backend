import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  userMention,
} from "discord.js";
import { mutateVbucks } from "../../utils/handling/mutatevbucks"; // correct path

const ALLOWED_ROLE_ID = "1460336894926782494";

export const data = new SlashCommandBuilder()
  .setName("removevbucks")
  .setDescription("Remove V-Bucks from a user's account (admin-only).")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The user to remove V-Bucks from")
      .setRequired(true),
  )
  .addIntegerOption((opt) =>
    opt
      .setName("amount")
      .setDescription("How many V-Bucks to remove")
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

    // Only allow members with the specific role
    if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
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

    const result = await mutateVbucks(targetUser.id, amount, "remove");

    if (!result.success) {
      await interaction.editReply(
        `❌ Couldn't remove V-Bucks from ${userMention(targetUser.id)}: ${
          result.message ?? "Unknown error."
        }`,
      );
      return;
    }

    await interaction.editReply(
      `✅ Removed **${amount.toLocaleString()}** V-Bucks from ${userMention(
        targetUser.id,
      )}. New total: **${(result.newTotal ?? 0).toLocaleString()}**.`,
    );
  } catch (err) {
    console.error("[/removevbucks] error:", err);
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
