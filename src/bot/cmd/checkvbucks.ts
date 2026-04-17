// src/bot/cmd/checkvbucks.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

const ALLOWED_ROLE_IDS = [
  "1460336894926782494", // original admin role
  "1428924403101732894"  // additional admin role
];

export const data = new SlashCommandBuilder()
  .setName("checkvbucks")
  .setDescription("Check a user's V-Bucks balance (admin-only).")
  .addStringOption((opt) =>
    opt
      .setName("identifier")
      .setDescription("User's Discord ID or in-game name")
      .setRequired(true)
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

    const identifier = interaction.options.getString("identifier", true).trim();

    await interaction.deferReply({ flags: 64 });

    let user;
    let searchMethod = "";

    // Check if identifier is a Discord ID (numeric)
    if (/^\d+$/.test(identifier)) {
      // Search by Discord ID
      user = await User.findOne({ discordId: identifier });
      searchMethod = `Discord ID: ${identifier}`;
    } else {
      // Search by in-game name (case insensitive)
      user = await User.findOne({
        $or: [
          { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
          { displayName: { $regex: new RegExp(`^${identifier}$`, 'i') } },
          { epicName: { $regex: new RegExp(`^${identifier}$`, 'i') } }
        ]
      });
      searchMethod = `In-game name: ${identifier}`;
    }

    if (!user) {
      await interaction.editReply({
        content: `❌ No user found with ${searchMethod}.`
      });
      return;
    }

    // Get the user's profile to check V-Bucks
    const profile = await Profiles.findOne({ accountId: user.accountId });

    if (!profile) {
      await interaction.editReply({
        content: `❌ User found but no profile data available for account \`${user.accountId}\`.`
      });
      return;
    }

    // Extract V-Bucks from common_core profile (FIXED - same as lookup command)
    const vbucks = 
      profile.profiles?.common_core?.items?.["Currency:MtxPurchased"]?.quantity ?? 0;

    const mtxPlatform = 
      profile.profiles?.common_core?.items?.["Currency:MtxPlatform"]?.quantity ?? 0;

    const totalVbucks = vbucks + mtxPlatform;

    // Get user display info
    const displayName = user.displayName || user.username || user.epicName || "Unknown";
    const discordId = user.discordId || "Not linked";

    // Create embed with V-Bucks information
    const embed = new EmbedBuilder()
      .setTitle("💳 V-Bucks Balance")
      .setColor(0x0099FF)
      .setDescription(`V-Bucks balance for **${displayName}**`)
      .addFields(
        { 
          name: "User Information", 
          value: `**Display Name:** ${displayName}\n**Discord ID:** ${discordId}\n**Account ID:** \`${user.accountId}\``,
          inline: false 
        },
        { 
          name: "V-Bucks Breakdown", 
          value: `**MtxPurchased:** ${vbucks.toLocaleString()}\n**MtxPlatform:** ${mtxPlatform.toLocaleString()}\n**Total V-Bucks:** ${totalVbucks.toLocaleString()}`,
          inline: false 
        },
        { 
          name: "Search Method", 
          value: searchMethod,
          inline: false 
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: `Requested by ${interaction.user.tag}`, 
        iconURL: interaction.user.displayAvatarURL() 
      });

    await interaction.editReply({ 
      embeds: [embed] 
    });

  } catch (err) {
    console.error("[/checkvbucks] error:", err);
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Something went wrong while checking V-Bucks balance.");
    } else {
      await interaction.reply({
        content: "❌ Something went wrong while checking V-Bucks balance.",
        flags: 64,
      });
    }
  }
}

export default { data, execute };