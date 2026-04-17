import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js";
import Profiles from '../../db/models/Profiles';
import Tournaments from '../../db/models/Tournaments';
import User from '../../db/models/User';

export default {
  data: new SlashCommandBuilder()
    .setName("details")
    .setDescription("View your account details including email, password, Hype, V-Bucks, and leaderboard rank"),
  
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      const targetDiscordId = interaction.user.id;

      // Find profile by Discord ID
      const profile = await Profiles.findOne({ discordId: targetDiscordId });
      
      if (!profile) {
        return interaction.reply({
          content: '❌ No profile found. Please register with `/register` first.',
          flags: 64
        });
      }

      // GET V-BUCKS
      const vbucks = 
        profile.profiles?.common_core?.items?.["Currency:MtxPurchased"]?.quantity || 0;

      // GET HYPE AND RANK
      const tournament = await Tournaments.findOne({ accountId: profile.accountId });
      const hype = tournament?.hype || 0;

      // CALCULATE USER'S RANK
      const userRank = await Tournaments.countDocuments({ 
        hype: { $gt: hype } 
      }) + 1;

      const totalPlayers = await Tournaments.countDocuments();

      // Get user info including email and password
      const user = await User.findOne({ accountId: profile.accountId });
      if (!user) {
        return interaction.reply({
          content: '❌ User account not found in database.',
          flags: 64
        });
      }

      const username = user.username || 'Unknown';
      const email = user.email || 'Not set';
      const password = user.plainPassword || user.password || 'Password not available';

      // Calculate percentile
      const percentile = totalPlayers > 0 
        ? Math.round((userRank / totalPlayers) * 100) 
        : 0;

      const response = `
🔐 **Your Account Details**

👤 **Username:** \`${username}\`
📧 **Email:** \`${email}\`
🔑 **Password:** \`${password}\`

💰 **V-Bucks:** ${vbucks.toLocaleString()} 🪙
🔥 **Hype:** ${hype.toLocaleString()} ⚡
🏆 **Rank:** #${userRank.toLocaleString()} of ${totalPlayers.toLocaleString()}
📊 **Top:** ${percentile}% of players

🆔 **Account ID:** ${profile.accountId.slice(0, 8)}...
🔗 **Discord ID:** ${targetDiscordId}
      `.trim();

      await interaction.reply({
        content: response,
        flags: 64 // Ephemeral - only visible to the user
      });
      
    } catch (error) {
      console.error('Details error:', error);
      return interaction.reply({
        content: '❌ Failed to fetch account details.',
        flags: 64
      });
    }
  }
};