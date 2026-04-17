import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import { generateAutoVariants } from "../../utils/handling/addCosmetic";

// Function to trigger a profile refresh (simulates what the game does)
async function refreshUserProfile(accountId: string) {
  try {
    // This simulates the game client refreshing the profile
    // by updating the revision number which forces the client to reload
    await Profiles.updateOne(
      { accountId },
      { 
        $inc: { "profiles.athena.stats.attributes.homebase_version": 1 },
        $set: { "profiles.athena.rvn": Date.now() }
      }
    );
    return true;
  } catch (error) {
    console.error("Profile refresh error:", error);
    return false;
  }
}

export default {
  data: new SlashCommandBuilder()
    .setName("fixstyles")
    .setDescription("Fix styles for all cosmetics in your own locker and refresh your profile"),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    try {
      const user = await User.findOne({ discordId: interaction.user.id });
      if (!user) {
        return interaction.editReply("❌ Your account was not found. Please register first!");
      }

      const profileDoc = await Profiles.findOne({ accountId: user.accountId });
      if (!profileDoc) {
        return interaction.editReply("❌ Your profile was not found. Please contact support.");
      }

      const athena = (profileDoc.profiles as any).athena ?? {};
      if (!athena.items || Object.keys(athena.items).length === 0) {
        return interaction.editReply("❌ Your locker is empty! Add some cosmetics first.");
      }

      let fixedCount = 0;
      let totalItems = 0;
      const fixedItems: string[] = [];

      // Fix styles for all items in the user's locker
      for (const [templateId, itemData] of Object.entries(athena.items as Record<string, any>)) {
        totalItems++;
        const variants = generateAutoVariants(templateId);
        if (variants.length > 0) {
          itemData.attributes = itemData.attributes || {};
          
          // Store original variants for comparison
          const originalVariants = itemData.attributes.variants || [];
          
          // Merge variants properly
          const mergedVariants = [...originalVariants];
          variants.forEach(newVariant => {
            const existingIndex = mergedVariants.findIndex((v: any) => v.channel === newVariant.channel);
            if (existingIndex >= 0) {
              mergedVariants[existingIndex] = newVariant;
            } else {
              mergedVariants.push(newVariant);
            }
          });
          
          itemData.attributes.variants = mergedVariants;
          fixedCount++;
          fixedItems.push(templateId);
        }
      }

      if (fixedCount > 0) {
        // Update the profile with fixed variants
        await profileDoc.updateOne({
          $set: { 
            "profiles.athena.items": athena.items,
            "profiles.athena.stats.attributes.last_applied_loadout": Date.now().toString()
          }
        });

        // Trigger profile refresh
        const refreshSuccess = await refreshUserProfile(user.accountId);
        
        const embed = new EmbedBuilder()
          .setTitle("✅ Styles Fixed Successfully!")
          .setDescription(`Fixed styles for **${fixedCount}** out of **${totalItems}** cosmetics in your locker!`)
          .setColor(0x00ff00)
          .addFields(
            { 
              name: "📊 Results", 
              value: `**Fixed:** ${fixedCount} items\n**Total:** ${totalItems} items\n**Profile Refresh:** ${refreshSuccess ? "✅ Successful" : "⚠️ Partial"}`, 
              inline: false 
            },
            { 
              name: "🎮 How to Use", 
              value: "**Restart Fortnite** to see all the styles in your locker! The styles are now properly configured.", 
              inline: false 
            },
            { 
              name: "💡 Important", 
              value: "You may need to **completely restart Fortnite** for the changes to take effect. Just returning to lobby might not be enough.", 
              inline: false 
            }
          )
          .setFooter({ text: "If styles still don't work, contact support with your Discord ID" })
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Log the fix for debugging
        console.log(`🛠️ Fixed styles for user ${user.accountId}:`, {
          fixedCount,
          totalItems,
          fixedItems: fixedItems.slice(0, 5), // First 5 items for log
          refreshSuccess
        });

      } else {
        const embed = new EmbedBuilder()
          .setTitle("ℹ️ No Styles Needed")
          .setDescription(`All **${totalItems}** cosmetics in your locker already have proper styles or don't need styles.`)
          .setColor(0x0099ff)
          .addFields(
            { 
              name: "📊 Analysis", 
              value: `**Total items:** ${totalItems}\n**Items needing styles:** 0\n\nMost wraps, emotes, and music packs don't have styles.`, 
              inline: false 
            },
            { 
              name: "❓ Still having issues?", 
              value: "If you can't equip styles on certain items, try using `/fulllocker` again or contact support.", 
              inline: false 
            }
          );

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      console.error("Fix styles error:", error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Error Fixing Styles")
        .setDescription("An unexpected error occurred while fixing your styles. Please try again later or contact support.")
        .setColor(0xff0000)
        .addFields({
          name: "🔧 Technical Details",
          value: "The bot encountered a database error. This has been logged for investigation.",
          inline: false
        });
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};