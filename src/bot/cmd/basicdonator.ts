import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import User from "../../db/models/User";
import Gift from "../../db/models/Gift";
import { addCosmeticsAsGift } from "../../utils/handling/addCosmetic";

const ALLOWED_ROLE_IDS = [
  "1460336894926782494", // original admin role
  "1460336894926782494"  // additional admin role
];
const LOG_CHANNEL_ID = "1454539167286558783";

const COSMETICS = [
  "AthenaCharacter:Character_MirageHike",
  "AthenaCharacter:CID_A_381_Athena_Commando_F_CactusRocker_3HTBV",
  "AthenaCharacter:CID_A_205_Athena_Commando_F_TextileRam_GMRJ0",
  "AthenaCharacter:CID_A_206_Athena_Commando_F_TextileSparkle_V8YSA",
  "AthenaCharacter:CID_A_215_Athena_Commando_F_SunriseCastle_48TIZ",
  "AthenaCharacter:CID_A_452_Athena_Commando_F_Barium",
  "AthenaPickaxe:Pickaxe_ID_179_StarWand",
  "AthenaPickaxe:Pickaxe_ID_190_GolfClub",
  "AthenaPickaxe:Pickaxe_ID_138_Gnome",
  "AthenaPickaxe:Pickaxe_ID_014_WinterCamo",
];

export default {
  data: new SlashCommandBuilder()
    .setName("basicdonator")
    .setDescription("Gives the basic donator cosmetics as a gift with DM notification.")
    .addStringOption((o) =>
      o.setName("user").setDescription("Target user's Discord ID").setRequired(true)
    )
    .addStringOption((o) =>
      o
        .setName("sender")
        .setDescription('Shown as "Gifted by" (default: your Discord tag)')
        .setRequired(false)
    )
    .addStringOption((o) =>
      o.setName("message").setDescription("Gift message").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const member = interaction.member as GuildMember;
    const hasAllowedRole = ALLOWED_ROLE_IDS.some(roleId => member?.roles?.cache?.has(roleId));
    
    if (!hasAllowedRole) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor("Red").setTitle("❌ Permission Denied")],
      });
    }

    const targetDiscordId = interaction.options.getString("user", true).trim();
    const sender = interaction.options.getString("sender") || interaction.user.username;
    const message = interaction.options.getString("message") || "Enjoy your gift!";

    const target = await User.findOne({ discordId: targetDiscordId }).lean();
    if (!target) {
      return interaction.editReply({ content: "❌ User not found in DB." });
    }

    try {
      // Use the new gift system to add cosmetics to profile
      const giftId = await addCosmeticsAsGift(
        targetDiscordId,
        COSMETICS,
        sender,
        message,
        {
          client: interaction.client,
          executorId: interaction.user.id,
          logChannelId: LOG_CHANNEL_ID
        }
      );

      // ✅ CRITICAL: CREATE GIFT RECORD IN DATABASE FOR /claimgift TO FIND
      const giftRecord = new Gift({
        recipientId: targetDiscordId, // Discord ID
        items: COSMETICS, // Array of cosmetic IDs
        sender: sender,
        message: message,
        claimed: false
      });
      await giftRecord.save();
      console.log(`[basicdonator] Gift record created for ${targetDiscordId}, Gift ID: ${giftRecord._id}`);

      // Send DM to the user
      try {
        const targetUser = await interaction.client.users.fetch(targetDiscordId);
        if (targetUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🎁 **You Received a Basic Donator Pack!**")
            .setDescription(`You've received **${COSMETICS.length} items** from **${sender}**!`)
            .setColor(0x7b2cff)
            .addFields(
              { name: "💌 Message", value: message, inline: false },
              { name: "📦 Contents", value: `${COSMETICS.length} Cosmetics`, inline: true },
              { name: "🎁 From", value: sender, inline: true },
              { name: "🎨 Styles Included", value: "All styles are unlocked!", inline: true },
              { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
            )
            .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
          console.log(`[basicdonator] DM sent to ${targetUser.tag}`);
        }
      } catch (dmError) {
        console.error(`[basicdonator] Failed to send DM to user ${targetDiscordId}:`, dmError);
        // Continue anyway - the items were added successfully
      }

      // Response to the command user
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3fb950)
            .setTitle("✅ Basic Donator Gift Sent")
            .setDescription(
              `Sent **${COSMETICS.length}** items to <@${targetDiscordId}> as a gift. They have been notified via DM.`
            )
            .addFields(
              { name: "Sender", value: sender, inline: true },
              { name: "Message", value: message, inline: true },
              { name: "Gift ID", value: giftRecord._id.toString(), inline: false },
              { name: "Next Steps", value: "The user must use `/claimgift` to receive the items.", inline: false }
            ),
        ],
      });

    } catch (error) {
      console.error("[basicdonator] Error:", error);
      return interaction.editReply({ 
        content: "❌ Failed to send gift bundle. Please check the console for errors." 
      });
    }
  },
};