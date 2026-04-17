import { SlashCommandBuilder, ChatInputCommandInteraction, GuildMember } from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import Tournaments from "../../db/models/Tournaments";

const ALLOWED_ROLE_IDS = [
  "1460336894926782494", // original admin role
  "1428924403101732894"  // additional admin role
];

export const data = new SlashCommandBuilder()
  .setName("lookup")
  .setDescription("Lookup user ID, username, ban status, V-Bucks, hype, email and password")
  .addStringOption((option) =>
    option
      .setName("user")
      .setDescription("Discord username, Discord ID, or in-game username")
      .setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content: "This command can only be used in a server.",
      flags: 64,
    });
    return;
  }

  // 🔒 Role check - updated to check for both roles
  const memberInvoker = interaction.member as GuildMember;
  const hasAllowedRole = ALLOWED_ROLE_IDS.some(roleId => memberInvoker.roles?.cache?.has(roleId));
  
  if (!hasAllowedRole) {
    await interaction.reply({
      content: "You do not have permission to use this command.",
      flags: 64,
    });
    return;
  }

  const input = interaction.options.getString("user", true).trim();
  const guild = interaction.guild;

  let member: GuildMember | null = null;
  let userDoc = null;
  let foundBy = "";

  // Try fetch by Discord ID first
  if (/^\d+$/.test(input)) {
    try {
      member = await guild.members.fetch(input);
      foundBy = "Discord ID";
    } catch {
      member = null;
    }
  }

  // If not found by ID, try to find by in-game username in database
  if (!member) {
    try {
      userDoc = await User.findOne({ 
        username: { $regex: new RegExp(`^${input}$`, 'i') } 
      }).exec();
      
      if (userDoc && userDoc.discordId) {
        try {
          member = await guild.members.fetch(userDoc.discordId);
          foundBy = "In-game username";
        } catch {
          member = null;
        }
      }
    } catch (error) {
      console.warn("Error searching database:", error);
    }
  }

  // Try find by Discord username (case-insensitive)
  if (!member) {
    const lower = input.toLowerCase();
    member = guild.members.cache.find((m) => 
      m.user.username.toLowerCase().includes(lower) ||
      m.user.globalName?.toLowerCase().includes(lower) ||
      m.displayName.toLowerCase().includes(lower)
    ) ?? null;
    
    if (member) {
      foundBy = "Discord username";
    }
  }

  // If we found a member but no userDoc, try to get userDoc from their Discord ID
  if (member && !userDoc) {
    try {
      userDoc = await User.findOne({ discordId: member.id }).exec();
    } catch (error) {
      console.warn("Error fetching user from DB:", error);
    }
  }

  // If we found userDoc but no member, try to get member from Discord ID
  if (userDoc && !member && userDoc.discordId) {
    try {
      member = await guild.members.fetch(userDoc.discordId);
      foundBy = "Database Discord ID";
    } catch {
      member = null;
    }
  }

  if (!member && !userDoc) {
    await interaction.reply({
      content: `User "${input}" not found in this server or database.`,
      flags: 64,
    });
    return;
  }

  // Get Discord ban status if we have a member
  let bannedOnDiscord = false;
  if (member) {
    try {
      const ban = await guild.bans.fetch(member.id);
      if (ban) bannedOnDiscord = true;
    } catch {
      bannedOnDiscord = false;
    }
  }

  // Get database info
  let inGameName = "Not set";
  let bannedInDB = false;
  let discordId = member?.id || userDoc?.discordId || "Not linked";
  let email = "Not set";
  let password = "Not set";
  let vbucks = 0;
  let hype = 0;
  let accountId = "Not found";

  if (userDoc) {
    inGameName = userDoc.username || inGameName;
    bannedInDB = !!userDoc.banned;
    email = userDoc.email || email;
    password = userDoc.plainPassword || "Password not available (old account)";
    accountId = userDoc.accountId || accountId;

    // Get V-Bucks from Profiles
    try {
      const profiles = await Profiles.findOne({ accountId: userDoc.accountId });
      if (profiles && profiles.profiles && profiles.profiles["common_core"]) {
        const currency = profiles.profiles["common_core"].items?.["Currency:MtxPurchased"];
        vbucks = currency?.quantity || 0;
      }
    } catch (error) {
      console.warn("Error fetching V-Bucks:", error);
    }

    // Get hype from Tournaments
    try {
      const tournament = await Tournaments.findOne({ accountId: userDoc.accountId });
      hype = tournament?.hype || 0;
    } catch (error) {
      console.warn("Error fetching hype:", error);
    }
  }

  const discordTag = member ? (member.user.tag || member.user.username) : "Not in server";
  const discordName = member ? member.user.username : "Not in server";
  const displayName = member ? member.displayName : "Not in server";

  let response = `**User Lookup** (Found by: ${foundBy || "Unknown"})\n` +
    `- Discord ID: \`${discordId}\`\n` +
    `- Discord Tag: \`${discordTag}\`\n` +
    `- Discord Username: \`${discordName}\`\n` +
    `- Display Name: \`${displayName}\`\n` +
    `- In-Game Name: \`${inGameName}\`\n` +
    `- Account ID: \`${accountId}\`\n` +
    `- Email: \`${email}\`\n` +
    `- Password: \`${password}\`\n` +
    `- V-Bucks: \`${vbucks.toLocaleString()}\`\n` +
    `- Hype: \`${hype.toLocaleString()}\`\n` +
    `- Banned on Discord: \`${bannedOnDiscord}\`\n` +
    `- Banned in DB: \`${bannedInDB}\``;

  // Add additional info if user is not in server but exists in database
  if (!member && userDoc) {
    response += `\n\n⚠️ User exists in database but is not in this Discord server.`;
  }

  await interaction.reply({
    content: response,
    flags: 64,
  });
}

export default { data, execute };