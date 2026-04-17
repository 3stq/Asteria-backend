import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
  PermissionFlagsBits,
} from "discord.js";
import User from "../../db/models/User";
import Tournaments from "../../db/models/Tournaments";
import fs from 'fs';
import path from 'path';

// Storage for persistent data
const storagePath = path.join(__dirname, '../../../leaderboardStorage.json');

interface LeaderboardStorage {
  arenaMessageId?: string;
  arenaChannelId?: string;
}

function loadStorage(): LeaderboardStorage {
  try {
    if (fs.existsSync(storagePath)) {
      return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading storage:', error);
  }
  return {};
}

function saveStorage(storage: LeaderboardStorage): void {
  try {
    fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2));
  } catch (error) {
    console.error('Error saving storage:', error);
  }
}

let storage: LeaderboardStorage = loadStorage();
let isUpdaterRunning = false;

// Function to build the leaderboard embed
async function buildLeaderboard() {
  try {
    console.log('🔄 Building leaderboard...');
    
    // Get ALL users first
    const allUsers = await User.find({ banned: false });
    console.log(`👥 Found ${allUsers.length} non-banned users`);
    
    const leaderboard: { name: string; hype: number; rank: number }[] = [];
    
    // For each user, find their tournament data
    for (const user of allUsers) {
      if (!user.accountId) continue;
      
      // Find tournament by accountId (same as lookup command)
      const tournament = await Tournaments.findOne({ accountId: user.accountId });
      
      if (tournament && tournament.hype > 0) {
        leaderboard.push({
          name: user.username,
          hype: tournament.hype,
          rank: 0 // Will be set after sorting
        });
        
        console.log(`✅ Added to leaderboard: ${user.username} - ${tournament.hype} hype`);
      }
    }

    // Sort by hype (descending) and limit to top 50
    leaderboard.sort((a, b) => b.hype - a.hype);
    const top50 = leaderboard.slice(0, 50);
    
    // Set ranks
    top50.forEach((user, index) => {
      user.rank = index + 1;
    });

    console.log(`🏁 Final leaderboard: ${top50.length} players`);

    const totalPlayers = await Tournaments.countDocuments({ hype: { $gt: 0 } });

    // Split into groups of 10 for better readability
    const groups = [];
    for (let i = 0; i < top50.length; i += 10) {
      groups.push(top50.slice(i, i + 10));
    }

    const embed = new EmbedBuilder()
      .setTitle("🏆 Top 50 Arena Leaderboard - LIVE")
      .setColor("#0099ff")
      .setFooter({ 
        text: "Banned users automatically removed • Live 24/7 • Last updated" 
      })
      .setTimestamp();

    // Add description based on player count
    if (top50.length > 0) {
      embed.setDescription(`**${top50.length.toLocaleString()}** active players • **${totalPlayers.toLocaleString()}** total players\n*Auto-refreshing every 30 seconds 24/7*`);
    } else {
      embed.setDescription("No players with arena points yet! Play arena matches to earn hype points and appear on the leaderboard.");
    }

    // Add each group as a field
    groups.forEach((group, index) => {
      if (group.length > 0) {
        embed.addFields({
          name: `Rank ${index * 10 + 1} - ${index * 10 + group.length}`,
          value: group.map(u => `**#${u.rank}.** ${u.name} — ${u.hype.toLocaleString()} hype`).join("\n"),
          inline: false
        });
      }
    });

    return embed;
  } catch (error) {
    console.error('❌ Error building leaderboard:', error);
    return new EmbedBuilder()
      .setTitle("🏆 Top 50 Arena Leaderboard")
      .setColor("#ff0000")
      .setDescription("❌ Error loading leaderboard data. Please try again later.")
      .setTimestamp();
  }
}

// Function to update the leaderboard
async function updateLeaderboard(client: any) {
  try {
    if (!storage.arenaChannelId || !storage.arenaMessageId) {
      console.log('No leaderboard message found in storage, skipping update');
      return;
    }

    const channel = await client.channels.fetch(storage.arenaChannelId);
    if (!channel || !channel.isTextBased()) {
      console.log('Leaderboard channel not found');
      return;
    }

    const embed = await buildLeaderboard();
    
    try {
      const message = await channel.messages.fetch(storage.arenaMessageId);
      await message.edit({ embeds: [embed] });
      console.log(`🔄 Leaderboard updated at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.log('Leaderboard message not found, removing from storage...');
      storage.arenaMessageId = undefined;
      storage.arenaChannelId = undefined;
      saveStorage(storage);
    }
  } catch (error) {
    console.error('Error auto-updating leaderboard:', error);
  }
}

// Start the global auto-updater
function startGlobalUpdater(client: any) {
  if (isUpdaterRunning) {
    console.log('🔄 Global leaderboard updater already running');
    return;
  }

  console.log('🚀 Starting global leaderboard auto-updater (24/7)');
  isUpdaterRunning = true;
  
  // Initial update
  updateLeaderboard(client);
  
  // Set up interval (30 seconds)
  setInterval(() => updateLeaderboard(client), 30000);
}

// Initialize or restore leaderboard on bot start
export function initializeLeaderboard(client: any) {
  console.log('🔍 Initializing leaderboard from storage...');
  
  if (!storage.arenaChannelId || !storage.arenaMessageId) {
    console.log('❌ No leaderboard data in storage');
    return;
  }

  try {
    console.log('✅ Found leaderboard data, starting updater...');
    startGlobalUpdater(client);
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("arenaleaderboard")
    .setDescription("Shows the top 50 arena leaderboard with 24/7 auto-updates")
    // Add default permission to false to restrict to specific roles
    .setDefaultMemberPermissions(0),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user has the required role (1397248040116682772)
    const requiredRoleId = "1397248040116682772";
    
    // Check if the member exists and has the required role
    if (!interaction.member || typeof interaction.member.permissions === 'string') {
      await interaction.reply({
        content: "❌ Unable to check your permissions. Please try again.",
        ephemeral: true
      });
      return;
    }

    const member = interaction.member;
    
    // Check if user has the required role
    if (!member.roles.cache.has(requiredRoleId)) {
      await interaction.reply({
        content: "❌ You do not have permission to use this command. This command is restricted to specific roles only.",
        ephemeral: true
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // If we already have a message ID in this channel, just update it
      if (storage.arenaMessageId && storage.arenaChannelId === interaction.channelId) {
        const embed = await buildLeaderboard();
        const message = await interaction.channel?.messages.fetch(storage.arenaMessageId);
        
        if (message) {
          await message.edit({ embeds: [embed] });
          await interaction.editReply("✅ Updated existing leaderboard with 24/7 auto-updates!");
          startGlobalUpdater(interaction.client);
          return;
        }
      }

      // Build and send the leaderboard embed (new message)
      const embed = await buildLeaderboard();
      const message = await interaction.channel?.send({ embeds: [embed] });

      if (!message) {
        await interaction.editReply("❌ Failed to send leaderboard message.");
        return;
      }

      // Store the message ID and channel ID for persistent updates
      storage.arenaMessageId = message.id;
      storage.arenaChannelId = interaction.channelId;
      saveStorage(storage);

      // Start global updater
      startGlobalUpdater(interaction.client);

      await interaction.editReply("✅ Leaderboard started with 24/7 auto-updates! It will refresh every 30 seconds.");

    } catch (error) {
      console.error('Error in leaderboard command:', error);
      await interaction.editReply({
        content: "❌ There was an error loading the leaderboard. Please try again."
      });
    }
  },
};