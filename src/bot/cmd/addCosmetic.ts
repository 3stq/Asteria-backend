import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import mongoose from "mongoose";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

// Permissions + logs
const ALLOWED_ROLE_ID = "1460336894926782494";
const LOG_CHANNEL_ID = "1454539167286558783";

export const data = new SlashCommandBuilder()
  .setName("addcosmetic")
  .setDescription("Add a cosmetic (or all) to a user by Discord ID, and send as a gift.")
  .addStringOption((o) =>
    o.setName("discordid").setDescription("Target user's Discord ID").setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("cosmeticid")
      .setDescription("Template ID (e.g. AthenaCharacter:CID_..., AthenaItemWrap:Wrap_...) or 'all'")
      .setRequired(true)
  )
  .addStringOption((o) =>
    o
      .setName("sender")
      .setDescription('Gift sender name (default: your Discord tag)')
      .setRequired(false)
  )
  .addStringOption((o) =>
    o.setName("message").setDescription("Gift message").setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as GuildMember;

  if (!member?.roles?.cache?.has(ALLOWED_ROLE_ID)) {
    await interaction.reply({
      content: "❌ You do not have permission to use this command.",
      flags: 64,
    });
    return;
  }

  await interaction.deferReply({ flags: 64 });

  const discordId = interaction.options.getString("discordid", true).trim();
  const cosmeticId = interaction.options.getString("cosmeticid", true).trim();
  const sender = interaction.options.getString("sender") || interaction.user.username;
  const message = interaction.options.getString("message") || "Enjoy your gift!";

  // ensure the target exists
  const target = await User.findOne({ discordId }).lean();
  if (!target) {
    await interaction.editReply("❌ User not found in database.");
    return;
  }

  try {
    if (cosmeticId.toLowerCase() === "all") {
      await interaction.editReply("❌ The 'all' option is not implemented yet. Please specify specific cosmetic IDs.");
      return;
    } else {
      // single cosmetic - handle both full template IDs and partial IDs
      let fullCosmeticId = cosmeticId;
      let type = "";
      
      // If it's already a full template ID (e.g., "AthenaCharacter:CID_123")
      if (cosmeticId.includes(":")) {
        [type, fullCosmeticId] = cosmeticId.split(":");
      } else {
        // If it's just the ID part, determine the type
        if (cosmeticId.startsWith("CID_") || cosmeticId.startsWith("Character_")) {
          type = "AthenaCharacter";
        } else if (cosmeticId.startsWith("Pickaxe_") || cosmeticId.startsWith("DefaultPickaxe")) {
          type = "AthenaPickaxe";
        } else if (cosmeticId.startsWith("Glider_") || cosmeticId.startsWith("DefaultGlider")) {
          type = "AthenaGlider";
        } else if (cosmeticId.startsWith("Wrap_")) {
          type = "AthenaItemWrap";
        } else if (cosmeticId.startsWith("Backpack_") || cosmeticId.startsWith("PetCarrier_")) {
          type = "AthenaBackpack";
        } else {
          // Try to guess based on common patterns
          if (cosmeticId.toLowerCase().includes("pickaxe")) {
            type = "AthenaPickaxe";
          } else if (cosmeticId.toLowerCase().includes("glider")) {
            type = "AthenaGlider";
          } else if (cosmeticId.toLowerCase().includes("wrap")) {
            type = "AthenaItemWrap";
          } else if (cosmeticId.toLowerCase().includes("backpack") || cosmeticId.toLowerCase().includes("pet")) {
            type = "AthenaBackpack";
          } else {
            type = "AthenaCharacter"; // Default to character
          }
        }
        fullCosmeticId = `${type}:${cosmeticId}`;
      }

      // Get the user's profile
      const profile = await Profiles.findOne({ accountId: target.accountId });
      if (!profile) {
        await interaction.editReply("❌ User profile not found.");
        return;
      }

      // Generate a unique item ID
      const itemId = `${fullCosmeticId.replace(/:/g, '_')}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create the cosmetic item with all variants
      const cosmeticItem = {
        templateId: fullCosmeticId,
        attributes: {
          variant: generateAutoVariants(fullCosmeticId),
          gift_info: {
            sender: sender,
            message: message,
            sentAt: new Date().toISOString(),
            giftedBy: interaction.user.id
          }
        },
        quantity: 1
      };

      // Add to the profile's items
      if (!profile.profiles.athena.items) {
        profile.profiles.athena.items = {};
      }

      profile.profiles.athena.items[itemId] = cosmeticItem;

      // Save the profile
      await profile.save();

      console.log(`✅ Added cosmetic ${fullCosmeticId} to user ${target.accountId}`);

      // Send DM notification
      try {
        const user = await interaction.client.users.fetch(discordId);
        if (user) {
          const cosmeticName = cosmeticId.split(":").pop() || cosmeticId;
          const cosmeticType = getCosmeticTypeName(type);
          
          const dmEmbed = new EmbedBuilder()
            .setTitle("🎁 **You Received a Gift!**")
            .setDescription(`You've received a cosmetic from **${sender}**!`)
            .setColor(0x7b2cff)
            .addFields(
              { name: "💌 Message", value: message, inline: false },
              { name: "🎁 Item", value: cosmeticName, inline: true },
              { name: "📦 Type", value: cosmeticType, inline: true },
              { name: "🎁 From", value: sender, inline: true },
              { name: "🎨 Styles", value: "All styles have been unlocked!", inline: false },
              { name: "✅ Status", value: "Item has been added to your account!", inline: false }
            )
            .setFooter({ text: "Lyric Gift System • Enjoy your new cosmetic!" })
            .setTimestamp();

          await user.send({ embeds: [dmEmbed] });
          console.log(`DM sent to ${user.tag}`);
        }
      } catch (dmError) {
        console.error(`Failed to send DM to user ${discordId}:`, dmError);
      }

      // Log to admin channel
      try {
        const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
        if (logChannel && logChannel.isTextBased()) {
          const logEmbed = new EmbedBuilder()
            .setTitle("🎁 Cosmetic Added")
            .setColor(0x00ff00)
            .addFields(
              { name: "Admin", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Target", value: `<@${discordId}>`, inline: true },
              { name: "Cosmetic", value: fullCosmeticId, inline: true },
              { name: "Sender", value: sender, inline: true }
            )
            .setTimestamp();
          
          await logChannel.send({ embeds: [logEmbed] });
        }
      } catch (logError) {
        console.error("Failed to log to admin channel:", logError);
      }

      await interaction.editReply(
        `✅ Added cosmetic \`${fullCosmeticId}\` to <@${discordId}>'s account. They have been notified via DM with all styles unlocked!`
      );
    }

  } catch (error: any) {
    console.error("Error in addcosmetic command:", error);
    await interaction.editReply(`❌ Error: ${error?.message ?? error}`);
  }
}

// Helper function to generate auto variants
function generateAutoVariants(cosmeticId: string): any {
  const variants: any = {};
  
  // Add default variant
  variants.variants = [
    {
      channel: "Progressive",
      active: "Stage1",
      owned: ["Stage1"]
    }
  ];

  // Add additional variants based on cosmetic type
  if (cosmeticId.includes("AthenaCharacter")) {
    // Add character variants (styles)
    variants.variants.push(
      {
        channel: "Part",
        active: "Base",
        owned: ["Base"]
      }
    );
  } else if (cosmeticId.includes("AthenaPickaxe") || cosmeticId.includes("AthenaGlider")) {
    // Add styles for tools/gliders
    variants.variants.push(
      {
        channel: "ItemWrap",
        active: "Default",
        owned: ["Default"]
      }
    );
  }

  return variants;
}

// Helper function to get cosmetic type names for display
function getCosmeticTypeName(type: string): string {
  const typeMap: { [key: string]: string } = {
    "AthenaCharacter": "Outfit",
    "AthenaPickaxe": "Harvesting Tool",
    "AthenaGlider": "Glider",
    "AthenaItemWrap": "Wrap",
    "AthenaBackpack": "Back Bling"
  };
  return typeMap[type] || type;
}

export default { data, execute };