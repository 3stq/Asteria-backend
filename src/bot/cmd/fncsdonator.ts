import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import User from "../../db/models/User";
import Gift from "../../db/models/Gift";
import { addCosmeticsAsGift } from "../../utils/handling/addCosmetic";

const ROLE_FULL_ACCESS = "1460336894926782494";
const LOG_CHANNEL_ID = "1454539167286558783";

const FNCS_COSMETICS = [
  "AthenaPickaxe:Pickaxe_ID_376_FNCS",
  "AthenaCharacter:Character_JonesyOrangeFNCS",
  "AthenaCharacter:Character_Dummy_FNCS",
  "AthenaCharacter:Character_ReconExpert_FNCS",
  "AthenaCharacter:CID_A_410_Athena_Commando_M_MaskedDancer_FNCS",
  "AthenaCharacter:CID_A_365_Athena_Commando_F_FNCS_Blue",
  "AthenaCharacter:CID_A_271_Athena_Commando_M_FNCS_Purple",
  "AthenaCharacter:CID_A_196_Athena_Commando_F_FNCSGreen",
  "AthenaCharacter:CID_A_106_Athena_Commando_F_FuturePinkGoal",
];

export default {
  data: new SlashCommandBuilder()
    .setName("fncsdonator")
    .setDescription("Gives FNCS bundle as a gift with DM notification.")
    .addStringOption((o) =>
      o
        .setName("user")
        .setDescription("Target user's Discord ID (omit to target yourself)")
        .setRequired(false)
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
    if (!member?.roles?.cache?.has(ROLE_FULL_ACCESS)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor("Red").setTitle("❌ Permission Denied")],
      });
    }

    const providedId = interaction.options.getString("user") ?? undefined;
    const targetDiscordId = providedId ?? interaction.user.id;
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
        FNCS_COSMETICS,
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
        items: FNCS_COSMETICS, // Array of cosmetic IDs
        sender: sender,
        message: message,
        claimed: false
      });
      await giftRecord.save();
      console.log(`[fncsdonator] Gift record created for ${targetDiscordId}, Gift ID: ${giftRecord._id}`);

      // Send DM to the user
      try {
        const targetUser = await interaction.client.users.fetch(targetDiscordId);
        if (targetUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🏆 **You Received a FNCS Pack!**")
            .setDescription(`You've received **${FNCS_COSMETICS.length} FNCS items** from **${sender}**!`)
            .setColor(0x7b2cff)
            .addFields(
              { name: "💌 Message", value: message, inline: false },
              { name: "📦 Contents", value: `${FNCS_COSMETICS.length} FNCS Cosmetics`, inline: true },
              { name: "🎁 From", value: sender, inline: true },
              { name: "🎨 Styles Included", value: "All styles are unlocked!", inline: true },
              { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
            )
            .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
          console.log(`[fncsdonator] DM sent to ${targetUser.tag}`);
        }
      } catch (dmError) {
        console.error(`[fncsdonator] Failed to send DM to user ${targetDiscordId}:`, dmError);
        // Continue anyway - the items were added successfully
      }

      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x3fb950)
            .setTitle("✅ FNCS Bundle Gift Sent")
            .setDescription(
              `Sent **${FNCS_COSMETICS.length}** items to <@${targetDiscordId}> as a gift. They have been notified via DM.`
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
      console.error("[fncsdonator] Error:", error);
      return interaction.editReply({ 
        content: "❌ Failed to send gift bundle. Please check the console for errors." 
      });
    }
  },
};