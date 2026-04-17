import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} from "discord.js";
import mongoose from "mongoose";
import Profiles from "../../db/models/Profiles";

const ADMIN_ROLES = [
  "1460336894926782494", // original admin role
  "1428924403101732894"  // additional admin role
];

const TARGET_COSMETIC = "AthenaPickaxe:Pickaxe_ID_804_FNCSS20Male";

export default {
  data: new SlashCommandBuilder()
    .setName("removefncs20") // ✅ Fixed: removed the period from "removefncs2.0"
    .setDescription("Remove FNCS 2.0 pickaxe from all accounts (ADMIN ONLY)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction: ChatInputCommandInteraction) {
    // Check if user has admin role
    const memberRoles = interaction.member?.roles;
    const hasAdminAccess = ADMIN_ROLES.some(roleId => memberRoles?.cache?.has(roleId));

    if (!hasAdminAccess) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Access Denied")
        .setDescription("You don't have permission to use this command.")
        .setColor("Red");

      return await interaction.reply({ embeds: [embed], flags: 64 });
    }

    // Send initial response since this might take a while
    await interaction.deferReply({ flags: 64 });

    try {
      console.log(`🔧 Starting removal of ${TARGET_COSMETIC} from all accounts...`);

      // Find all profiles that have the FNCS 2.0 pickaxe
      const allProfiles = await Profiles.find({});
      let totalRemoved = 0;
      let totalProcessed = 0;

      const progressEmbed = new EmbedBuilder()
        .setTitle("🔄 Removing FNCS 2.0 Pickaxe")
        .setDescription(`Processing ${allProfiles.length} profiles...`)
        .setColor("Yellow")
        .setTimestamp();

      await interaction.editReply({ embeds: [progressEmbed] });

      // Process each profile
      for (const profile of allProfiles) {
        totalProcessed++;
        
        if (profile.profiles?.athena?.items) {
          const athenaItems = profile.profiles.athena.items;
          let removedFromThisProfile = 0;

          // Find and remove the FNCS 2.0 pickaxe
          for (const [itemId, item] of Object.entries(athenaItems)) {
            if (item && typeof item === 'object' && 'templateId' in item) {
              const typedItem = item as any;
              if (typedItem.templateId === TARGET_COSMETIC) {
                delete athenaItems[itemId];
                removedFromThisProfile++;
                totalRemoved++;
              }
            }
          }

          // If we removed items from this profile, save it
          if (removedFromThisProfile > 0) {
            await Profiles.updateOne(
              { _id: profile._id },
              { $set: { "profiles.athena.items": athenaItems } }
            );
            console.log(`✅ Removed ${removedFromThisProfile} FNCS 2.0 pickaxe(s) from ${profile.accountId}`);
          }
        }

        // Update progress every 50 profiles
        if (totalProcessed % 50 === 0) {
          progressEmbed.setDescription(
            `Processed ${totalProcessed}/${allProfiles.length} profiles\n` +
            `Removed ${totalRemoved} FNCS 2.0 pickaxes so far...`
          );
          await interaction.editReply({ embeds: [progressEmbed] });
        }
      }

      // Final results
      const resultEmbed = new EmbedBuilder()
        .setTitle("✅ FNCS 2.0 Removal Complete")
        .setDescription(
          `Successfully processed ${totalProcessed} profiles.\n\n` +
          `**Removed ${totalRemoved} FNCS 2.0 pickaxes** from user accounts.\n\n` +
          `The cosmetic \`${TARGET_COSMETIC}\` has been removed from all accounts.`
        )
        .setColor("Green")
        .setTimestamp()
        .addFields(
          { name: "Target Cosmetic", value: `\`${TARGET_COSMETIC}\``, inline: true },
          { name: "Profiles Processed", value: `${totalProcessed}`, inline: true },
          { name: "Items Removed", value: `${totalRemoved}`, inline: true }
        );

      await interaction.editReply({ embeds: [resultEmbed] });

      // Log to console
      console.log(`✅ FNCS 2.0 removal completed: ${totalRemoved} items removed from ${totalProcessed} profiles`);

    } catch (error) {
      console.error("❌ Error removing FNCS 2.0 pickaxe:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Removal Failed")
        .setDescription("An error occurred while removing the FNCS 2.0 pickaxe. Check the console for details.")
        .setColor("Red")
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  }
};