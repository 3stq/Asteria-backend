import { REST, Routes } from "discord.js";
import { config } from "dotenv";
config();

import fulllocker from "./cmd/fulllocker";
import removefulllocker from "./cmd/removefulllocker";
import register from "./cmd/register";
import deleteCommand from "./cmd/delete";
import changeusername from "./cmd/changeusername";
import ban from "./cmd/ban";
import unban from "./cmd/unban";
import basicdonator from "./cmd/basicdonator";
import axebundle from "./cmd/axebundle";
import iconemotes from "./cmd/iconemotes";
import ogpack from "./cmd/ogpack";
import skinbundle from "./cmd/50skinbundle";
import fncsdonator from "./cmd/fncsdonator";
import removefncs20 from "./cmd/removefncs20";
import dev from "./cmd/dev";
import lookup from "./cmd/lookup";
import itemshop from "./cmd/itemshop";
import arenaleaderboard from "./cmd/arenaleaderboard";
import tradeWithFriend from "./cmd/tradeWithFriend";
import details from "./cmd/details";
import addvbucks from "./cmd/addvbucks";
import removevbucks from "./cmd/removevbucks";
import claimmyvbucks from "./cmd/claimmyvbucks";
import addhype from "./cmd/addhype";
import resetpassword from "./cmd/resetpassword";
import addCosmetic from "./cmd/addCosmetic";
import claimgift from "./cmd/claimgift";
import fixstyles from "./cmd/fixstyles";
import repair from "./cmd/repair";
import compensation from "./cmd/compensation";
import checkvbucks from "./cmd/checkvbucks";
import risk from "./cmd/risk";
import riskleaderboard from "./cmd/riskleaderboard";
import resetarena from "./cmd/resetarena"; // ✅ Added resetarena command

const commandObjs = [
  fulllocker,
  removefulllocker,
  register,
  deleteCommand,
  changeusername,
  ban,
  unban,
  basicdonator,
  axebundle,
  iconemotes,
  ogpack,
  skinbundle,
  fncsdonator,
  removefncs20,
  dev,
  lookup,
  itemshop,
  arenaleaderboard,
  tradeWithFriend,
  details,
  addvbucks,
  removevbucks,
  claimmyvbucks,
  addhype,
  resetpassword,
  addCosmetic,
  claimgift,
  fixstyles,
  repair,
  compensation,
  checkvbucks,
  risk,
  riskleaderboard,
  resetarena, // ✅ Added resetarena command
].filter(Boolean);

const commands = commandObjs
  .map((c: any) => c?.data)
  .filter(Boolean)
  .map((d: any) => d.toJSON());

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN!);

(async () => {
  try {
    console.log("🚀 Deploying slash commands...");

    // DEBUG: Show what we're deploying
    console.log(`📦 Total commands to deploy: ${commands.length}`);
    console.log("🔧 Command names:", commands.map((c: any) => c.name).join(", "));

    // Clear existing commands first (optional, but helps avoid conflicts)
    console.log("🗑️ Clearing existing commands...");
    try {
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
        body: [],
      });
      console.log("✅ Existing commands cleared");
    } catch (clearError) {
      console.log("⚠️ Could not clear commands (may be first time):", clearError.message);
    }

    // Wait a moment for Discord to process the clear
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Deploy new commands
    console.log("📤 Deploying new commands...");
    const data = await rest.put(Routes.applicationCommands(process.env.CLIENT_ID!), {
      body: commands,
    }) as any[];

    console.log("✅ Successfully registered application commands.");
    console.log(`📋 Total commands deployed: ${data.length}`);
    
    const commandNames = data.map((cmd: any) => cmd.name);
    console.log("🔧 Commands deployed:", commandNames.sort().join(", "));
    
  } catch (err: any) {
    console.error("❌ Failed to deploy commands:");
    console.error("Error code:", err.code);
    console.error("Error message:", err.message);
    
    // Provide helpful debugging info
    if (err.code === 50035) {
      console.log("\n🔧 Debug info:");
      console.log("- CLIENT_ID:", process.env.CLIENT_ID ? "✓ Set" : "✗ Missing");
      console.log("- DISCORD_TOKEN:", process.env.DISCORD_TOKEN ? "✓ Set" : "✗ Missing");
      console.log("- Number of commands:", commands.length);
      
      // Try to identify problematic command
      if (err.errors?.body?._errors) {
        console.log("\n📋 Command-by-command errors:");
        err.errors.body._errors.forEach((error: any, index: number) => {
          if (error._errors) {
            console.log(`Command ${index + 1}:`);
            error._errors.forEach((subError: any) => {
              console.log(`  - ${subError.code}: ${subError.message}`);
            });
          }
        });
      }
    }
  }
})();