import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import fs from 'fs';
import path from 'path';
import RiskStats from "../../db/models/RiskStats";

// Storage for persistent data
const storagePath = path.join(__dirname, '../../../riskLeaderboardStorage.json');

interface RiskLeaderboardStorage {
  riskMessageId?: string;
  riskChannelId?: string;
}

function loadStorage(): RiskLeaderboardStorage {
  try {
    if (fs.existsSync(storagePath)) {
      return JSON.parse(fs.readFileSync(storagePath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading risk leaderboard storage:', error);
  }
  return {};
}

function saveStorage(storage: RiskLeaderboardStorage): void {
  try {
    fs.writeFileSync(storagePath, JSON.stringify(storage, null, 2));
  } catch (error) {
    console.error('Error saving risk leaderboard storage:', error);
  }
}

let storage: RiskLeaderboardStorage = loadStorage();
let isRiskUpdaterRunning = false;

// Function to update user risk stats in database
export async function updateRiskStats(userId: string, username: string, amount: number, won: boolean, jackpot: boolean = false) {
  try {
    // Find existing stats or create new ones
    let userStats = await RiskStats.findOne({ userId });
    
    if (!userStats) {
      userStats = new RiskStats({
        userId,
        username,
        totalWagered: 0,
        totalWon: 0,
        totalLost: 0,
        netProfit: 0,
        gamesPlayed: 0,
        jackpotsWon: 0
      });
    }

    // Update stats
    userStats.totalWagered += amount;
    userStats.gamesPlayed += 1;
    userStats.lastPlayed = new Date();

    if (won) {
      const winnings = jackpot ? amount : amount; // For jackpot, they keep their bet + win amount
      userStats.totalWon += winnings;
      userStats.netProfit += winnings;
      
      if (jackpot) {
        userStats.jackpotsWon += 1;
      }
    } else {
      userStats.totalLost += amount;
      userStats.netProfit -= amount;
    }

    // Update username if changed
    userStats.username = username;

    await userStats.save();
    console.log(`[risk] Updated stats for ${username}: ${won ? 'WIN' : 'LOSS'} ${amount} V-Bucks`);
    
  } catch (error) {
    console.error('Error updating risk stats:', error);
    throw error;
  }
}

// Function to build the risk leaderboard embed
async function buildRiskLeaderboard() {
  try {
    console.log('🔄 Building risk leaderboard from database...');
    
    // Get all risk stats from database
    const allStats = await RiskStats.find({})
      .sort({ netProfit: -1 })
      .limit(100); // Get more than needed for filtering

    // Top 10 winners (highest net profit)
    const topWinners = allStats
      .filter(stats => stats.netProfit > 0)
      .slice(0, 10);

    // Top 5 losers (lowest net profit)
    const topLosers = allStats
      .filter(stats => stats.netProfit < 0)
      .sort((a, b) => a.netProfit - b.netProfit) // Most negative first
      .slice(0, 5);

    const totalPlayers = allStats.length;
    const totalWagered = allStats.reduce((sum, stats) => sum + stats.totalWagered, 0);
    const totalProfit = allStats.reduce((sum, stats) => sum + stats.netProfit, 0);
    const totalJackpots = allStats.reduce((sum, stats) => sum + stats.jackpotsWon, 0);

    const embed = new EmbedBuilder()
      .setTitle("🎰 Risk Game Leaderboard - LIVE")
      .setColor("#ff69b4")
      .setFooter({ 
        text: "Net profit = Total won - Total lost • Live 24/7 • Last updated" 
      })
      .setTimestamp();

    // Add overall statistics
    embed.setDescription(
      `**${totalPlayers.toLocaleString()}** active gamblers • **${totalWagered.toLocaleString()}** total V-Bucks wagered\n` +
      `**${totalProfit.toLocaleString()}** total net profit • **${totalJackpots}** jackpots won\n` +
      `*Auto-refreshing every 30 seconds 24/7*`
    );

    // Add top winners section
    if (topWinners.length > 0) {
      const winnersText = topWinners.map((stats, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`;
        const jackpotText = stats.jackpotsWon > 0 ? ` • 🎊 ${stats.jackpotsWon} jackpot${stats.jackpotsWon > 1 ? 's' : ''}` : '';
        const winRate = stats.gamesPlayed > 0 ? Math.round((stats.totalWon / stats.totalWagered) * 100) : 0;
        return `${medal} **${stats.username}** — +${stats.netProfit.toLocaleString()} V-Bucks\n   📊 ${stats.gamesPlayed} games • 🎯 ${winRate}% win rate${jackpotText}`;
      }).join("\n\n");

      embed.addFields({
        name: "🏆 TOP 10 WINNERS",
        value: winnersText,
        inline: false
      });
    } else {
      embed.addFields({
        name: "🏆 TOP 10 WINNERS",
        value: "No winners yet! Be the first to make a profit!",
        inline: false
      });
    }

    // Add top losers section
    if (topLosers.length > 0) {
      const losersText = topLosers.map((stats, index) => {
        const rank = index + 1;
        const lossRate = stats.gamesPlayed > 0 ? Math.round((stats.totalLost / stats.totalWagered) * 100) : 0;
        return `${rank}. **${stats.username}** — ${stats.netProfit.toLocaleString()} V-Bucks\n   📊 ${stats.gamesPlayed} games • 💸 ${lossRate}% loss rate`;
      }).join("\n\n");

      embed.addFields({
        name: "💸 TOP 5 LOSERS",
        value: losersText,
        inline: false
      });
    } else {
      embed.addFields({
        name: "💸 TOP 5 LOSERS",
        value: "No major losses yet!",
        inline: false
      });
    }

    // Add some statistics
    const avgProfit = totalPlayers > 0 ? Math.round(totalProfit / totalPlayers) : 0;
    const avgGames = totalPlayers > 0 ? Math.round(allStats.reduce((sum, stats) => sum + stats.gamesPlayed, 0) / totalPlayers) : 0;
    const biggestWinner = topWinners.length > 0 ? topWinners[0].netProfit : 0;
    const biggestLoser = topLosers.length > 0 ? topLosers[0].netProfit : 0;

    embed.addFields({
      name: "📈 STATISTICS",
      value: `• Average Profit: ${avgProfit.toLocaleString()} V-Bucks\n• Average Games: ${avgGames}\n• Biggest Winner: +${biggestWinner.toLocaleString()} V-Bucks\n• Biggest Loser: ${biggestLoser.toLocaleString()} V-Bucks\n• House Edge: 30%`,
      inline: false
    });

    return embed;
  } catch (error) {
    console.error('❌ Error building risk leaderboard:', error);
    return new EmbedBuilder()
      .setTitle("🎰 Risk Game Leaderboard")
      .setColor("#ff0000")
      .setDescription("❌ Error loading risk leaderboard data. Please try again later.")
      .setTimestamp();
  }
}

// Function to update the risk leaderboard
async function updateRiskLeaderboard(client: any) {
  try {
    if (!storage.riskChannelId || !storage.riskMessageId) {
      console.log('No risk leaderboard message found in storage, skipping update');
      return;
    }

    const channel = await client.channels.fetch(storage.riskChannelId);
    if (!channel || !channel.isTextBased()) {
      console.log('Risk leaderboard channel not found');
      return;
    }

    const embed = await buildRiskLeaderboard();
    
    try {
      const message = await channel.messages.fetch(storage.riskMessageId);
      await message.edit({ embeds: [embed] });
      console.log(`🔄 Risk leaderboard updated at ${new Date().toLocaleTimeString()}`);
    } catch (error) {
      console.log('Risk leaderboard message not found, removing from storage...');
      storage.riskMessageId = undefined;
      storage.riskChannelId = undefined;
      saveStorage(storage);
    }
  } catch (error) {
    console.error('Error auto-updating risk leaderboard:', error);
  }
}

// Start the global auto-updater
function startRiskGlobalUpdater(client: any) {
  if (isRiskUpdaterRunning) {
    console.log('🔄 Global risk leaderboard updater already running');
    return;
  }

  console.log('🚀 Starting global risk leaderboard auto-updater (24/7)');
  isRiskUpdaterRunning = true;
  
  // Initial update
  updateRiskLeaderboard(client);
  
  // Set up interval (30 seconds)
  setInterval(() => updateRiskLeaderboard(client), 30000);
}

// Initialize or restore risk leaderboard on bot start
export function initializeRiskLeaderboard(client: any) {
  console.log('🔍 Initializing risk leaderboard from storage...');
  
  if (!storage.riskChannelId || !storage.riskMessageId) {
    console.log('❌ No risk leaderboard data in storage');
    return;
  }

  try {
    console.log('✅ Found risk leaderboard data, starting updater...');
    startRiskGlobalUpdater(client);
  } catch (error) {
    console.error('Error initializing risk leaderboard:', error);
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("riskleaderboard")
    .setDescription("Shows top 10 winners and top 5 losers from risk games with 24/7 auto-updates"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      // If we already have a message ID in this channel, just update it
      if (storage.riskMessageId && storage.riskChannelId === interaction.channelId) {
        const embed = await buildRiskLeaderboard();
        const message = await interaction.channel?.messages.fetch(storage.riskMessageId);
        
        if (message) {
          await message.edit({ embeds: [embed] });
          await interaction.editReply("✅ Updated existing risk leaderboard with 24/7 auto-updates!");
          startRiskGlobalUpdater(interaction.client);
          return;
        }
      }

      // Build and send the risk leaderboard embed (new message)
      const embed = await buildRiskLeaderboard();
      const message = await interaction.channel?.send({ embeds: [embed] });

      if (!message) {
        await interaction.editReply("❌ Failed to send risk leaderboard message.");
        return;
      }

      // Store the message ID and channel ID for persistent updates
      storage.riskMessageId = message.id;
      storage.riskChannelId = interaction.channelId;
      saveStorage(storage);

      // Start global updater
      startRiskGlobalUpdater(interaction.client);

      await interaction.editReply("✅ Risk leaderboard started with 24/7 auto-updates! It will refresh every 30 seconds.");

    } catch (error) {
      console.error('Error in risk leaderboard command:', error);
      await interaction.editReply({
        content: "❌ There was an error loading the risk leaderboard. Please try again."
      });
    }
  },
};