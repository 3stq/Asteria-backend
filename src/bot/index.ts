import mongoose from "mongoose";
import {
  Client,
  Collection,
  GatewayIntentBits,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActivityType,
  ButtonInteraction,
  REST,
  Routes
} from "discord.js";
import { config } from "dotenv";

config();

interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
}) as Client & { commands: Collection<string, Command> };

client.commands = new Collection<string, Command>();

// Import all your commands
import fulllocker from "./cmd/fulllocker";
import removefulllocker from "./cmd/removefulllocker";
import registerCmd from "./cmd/register";
import deleteCommand from "./cmd/delete";
import changeusername from "./cmd/changeusername";
import ban from "./cmd/ban";
import unban from "./cmd/unban";
import basicdonator from "./cmd/basicdonator";
import axebundle from "./cmd/axebundle";
import iconemotes from "./cmd/iconemotes";
import ogpack from "./cmd/ogpack";
import skinbundle from "./cmd/50skinbundle";
import lookup from "./cmd/lookup";
import fncsdonator from "./cmd/fncsdonator";
import removefncs20 from "./cmd/removefncs20";
import dev from "./cmd/dev";
import addCosmetic from "./cmd/addCosmetic";
import itemshop from "./cmd/itemshop";
import arenaleaderboard from "./cmd/arenaleaderboard";
import details from "./cmd/details";
import addvbucks from "./cmd/addvbucks";
import removevbucks from "./cmd/removevbucks";
import claimmyvbucks from "./cmd/claimmyvbucks";
import addhype from "./cmd/addhype";
import resetpassword from "./cmd/resetpassword";
import claimgift from "./cmd/claimgift";
import fixstyles from "./cmd/fixstyles";
import tradeWithFriend from "./cmd/tradeWithFriend";
import compensation from "./cmd/compensation";
import checkvbucks from "./cmd/checkvbucks";
import risk from "./cmd/risk";
import riskleaderboard from "./cmd/riskleaderboard";
import resetarena from "./cmd/resetarena"; // ✅ Added resetarena command

// DEBUG: Check if commands are loading
console.log("🔍 Checking command imports:");
console.log("registerCmd:", registerCmd ? "LOADED" : "MISSING");
console.log("registerCmd data:", registerCmd?.data?.name);

const commands = [
  fulllocker,
  removefulllocker,
  registerCmd,
  deleteCommand,
  changeusername,
  ban,
  unban,
  basicdonator,
  axebundle,
  iconemotes,
  ogpack,
  skinbundle,
  lookup,
  fncsdonator,
  removefncs20,
  dev,
  addCosmetic,
  itemshop,
  arenaleaderboard,
  details,
  addvbucks,
  removevbucks,
  claimmyvbucks,
  addhype,
  resetpassword,
  claimgift,
  fixstyles,
  tradeWithFriend,
  compensation,
  checkvbucks,
  risk,
  riskleaderboard,
  resetarena, // ✅ Added resetarena command
];

// DEBUG: List all commands and their status
console.log("📋 Command loading status:");
commands.forEach((cmd, index) => {
  if (!cmd?.data?.name) {
    console.log(`❌ [${index}] MISSING DATA -`, cmd);
  } else {
    console.log(`✅ [${index}] ${cmd.data.name}`);
  }
});

// Register commands with the client
commands.forEach((cmd: any) => {
  if (!cmd?.data?.name) {
    console.warn("⚠️ Skipping invalid command (missing data.name):", cmd);
    return;
  }
  client.commands.set(cmd.data.name, cmd);
});

console.log(`🎯 Total commands registered: ${client.commands.size}`);
console.log("📝 Available commands:", Array.from(client.commands.keys()));

// Function to register slash commands with Discord
async function registerSlashCommands() {
  if (!process.env.DISCORD_TOKEN) {
    console.error("❌ DISCORD_TOKEN is missing");
    return;
  }
  
  if (!process.env.CLIENT_ID) {
    console.error("❌ CLIENT_ID is missing");
    return;
  }

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    console.log('🔄 Started refreshing application (/) commands.');

    const commandData = commands
      .filter(cmd => cmd?.data)
      .map(cmd => cmd.data.toJSON());

    console.log(`📤 Deploying ${commandData.length} commands to Discord...`);

    // Register commands globally
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commandData }
    );

    console.log(`✅ Successfully reloaded ${commandData.length} application (/) commands.`);
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

client.once("ready", async () => {
  console.log(`✅ Bot logged in as ${client.user?.tag}`);

  // Register slash commands with Discord
  await registerSlashCommands();

  // Start the 24/7 arena leaderboard auto-updater
  try {
    const { initializeLeaderboard } = await import("./cmd/arenaleaderboard");
    initializeLeaderboard(client);
  } catch (error) {
    console.warn("⚠️ Arena leaderboard initialization failed:", error.message);
  }

  // Start the 24/7 risk leaderboard auto-updater
  try {
    const { initializeRiskLeaderboard } = await import("./cmd/riskleaderboard");
    initializeRiskLeaderboard(client);
  } catch (error) {
    console.warn("⚠️ Risk leaderboard initialization failed:", error.message);
  }

  const updateBotStatus = async () => {
    try {
      // Simple online count from global state
      const onlineCount = global.OnlineAccountIds?.size || 0;
      
      console.log(`[Bot Status] Updating status: ${onlineCount} players online`);

      if (onlineCount > 0) {
        client.user?.setActivity(`${onlineCount} players online`, {
          type: ActivityType.Watching,
        });
      } else {
        client.user?.setActivity("Lyric Server", {
          type: ActivityType.Playing,
        });
      }
    } catch (error) {
      console.error("❌ Error updating bot status:", error);
      // Fallback to basic status
      client.user?.setActivity("Lyric Server", {
        type: ActivityType.Playing,
      });
    }
  };

  // Update status immediately and then every 30 seconds
  updateBotStatus();
  setInterval(updateBotStatus, 30000);

  // Log initial global state for debugging
  console.log(`[Bot Ready] Global OnlineAccountIds:`, {
    exists: !!global.OnlineAccountIds,
    size: global.OnlineAccountIds?.size || 0,
    type: typeof global.OnlineAccountIds
  });
});

// Channel moderation for register channel - ALLOW ALL USERS TO USE COMMANDS
client.on("messageCreate", async (message) => {
  const REGISTER_CHANNEL_ID = "1413934023465500732";
  
  // Ignore if not in register channel, or from bots, or in DMs
  if (message.channelId !== REGISTER_CHANNEL_ID || message.author.bot || !message.guild) return;
  
  // ALLOW slash commands from ALL users
  if (message.content.startsWith('/')) {
    // It's a slash command, allow it - the interactionCreate handler will process it
    return;
  }
  
  // DELETE regular messages from ALL users (only allow slash commands)
  try {
    await message.delete();
    
    // Send ephemeral warning only to the user
    try {
      await message.author.send({
        content: `❌ The channel <#${REGISTER_CHANNEL_ID}> is for bot commands only! Use slash commands like \`/register\`, \`/details\`, etc. in the channel.`
      });
    } catch (dmError) {
      // If we can't DM the user, just log it
      console.log(`Could not DM user ${message.author.tag}`);
    }
  } catch (error) {
    console.error('Error handling register channel message:', error);
  }
});

client.on("interactionCreate", async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      console.log(`🔍 Command used: ${interaction.commandName}`);
      console.log(`📝 Available commands:`, Array.from(client.commands.keys()));
      
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`⚠️ Unknown command: ${interaction.commandName}`);
        await interaction.reply({
          content: "❌ This command isn't available right now.",
          flags: 64,
        });
        return;
      }

      console.log(`✅ Executing command: ${interaction.commandName}`);
      await command.execute(interaction);
      return;
    }

    if (interaction.isButton()) {
      console.log(`🔘 Button clicked: ${interaction.customId}`);

      // Handle risk command buttons specifically
      if (interaction.customId === "confirm_spin" || interaction.customId === "cancel_spin" || interaction.customId === "play_again") {
        // These are handled within the risk command itself
        return;
      }

      if (!interaction.replied) {
        await interaction.reply({
          content:
            "⚠️ Button interactions are disabled right now. Please use slash commands.",
          flags: 64,
        });
      }
    }
  } catch (error) {
    console.error("❌ Interaction error:", error);

    if (interaction.isRepliable()) {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ An unexpected error occurred.",
          flags: 64,
        });
      } else {
        await interaction.followUp({
          content: "❌ An unexpected error occurred.",
          flags: 64,
        });
      }
    }
  }
});

client.login(process.env.DISCORD_TOKEN);