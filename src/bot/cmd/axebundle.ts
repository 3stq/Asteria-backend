import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { addCosmeticsAsGift } from "../../utils/handling/addCosmetic";
import User from "../../db/models/User";

const FULL_ACCESS_ROLE = "1460336894926782494";
const LOG_CHANNEL_ID = "1454539167286558783";

const COSMETIC_IDS = [
  "AthenaPickaxe:Pickaxe_KeyTracker",
  "AthenaPickaxe:Pickaxe_BoneWand",
  "AthenaPickaxe:Pickaxe_ID_599_CavernFemale",
  "AthenaPickaxe:Pickaxe_ID_508_HistorianMale_6BQSW",
  "AthenaPickaxe:Pickaxe_ID_294_CandyCane",
  "AthenaPickaxe:Pickaxe_ID_328_GalileoRocket_SNC0L",
  "AthenaPickaxe:Pickaxe_ID_363_LollipopTricksterFemale",
  "AthenaPickaxe:Pickaxe_ID_197_HoppityHger",
  "AthenaPickaxe:Pickaxe_ID_175_Tropical",
  "AthenaPickaxe:Pickaxe_ID_140_StreetGoth",
  "AthenaPickaxe:Pickaxe_ID_169_Farmer",
  "AthenaPickaxe:Pickaxe_ID_143_FlintlockWinter",
  "AthenaPickaxe:Pickaxe_ID_102_RedRiding",
  "AthenaPickaxe:Pickaxe_ID_116_Celestial",
  "AthenaPickaxe:Pickaxe_ID_074_SharpDresser",
  "AthenaPickaxe:Pickaxe_ID_092_Bling",
  "AthenaPickaxe:Pickaxe_ID_029_Assassin",
  "AthenaPickaxe:SickleBatPickaxe",
  "AthenaPickaxe:Pickaxe_ID_015_HolidayCandyCane",
];

export default {
  data: new SlashCommandBuilder()
    .setName("axebundle")
    .setDescription("Gives the Axe Bundle as a gift with DM notification.")
    .addStringOption(o => o.setName("user").setDescription("Discord ID").setRequired(true))
    .addStringOption(o => o.setName("from").setDescription("Gift From").setRequired(false))
    .addStringOption(o => o.setName("message").setDescription("Gift Message").setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const targetDiscordId = interaction.options.getString("user", true);
    const sender = interaction.options.getString("from") || interaction.user.username;
    const note = interaction.options.getString("message") || "Enjoy your gift!";

    const roles: any = (interaction.member as any)?.roles;
    const ok =
      roles &&
      (("cache" in roles && roles.cache.has(FULL_ACCESS_ROLE)) ||
        (Array.isArray(roles) && roles.includes(FULL_ACCESS_ROLE)));
    if (!ok) return interaction.editReply({ content: "❌ You do not have permission." });

    const user = await User.findOne({ discordId: targetDiscordId });
    if (!user) return interaction.editReply({ content: "❌ User not found in DB." });

    try {
      // Use the new gift system
      const giftId = await addCosmeticsAsGift(
        targetDiscordId,
        COSMETIC_IDS,
        sender,
        note,
        {
          client: interaction.client,
          executorId: interaction.user.id,
          logChannelId: LOG_CHANNEL_ID
        }
      );

      // Send DM manually to ensure it works
      try {
        const targetUser = await interaction.client.users.fetch(targetDiscordId);
        if (targetUser) {
          const dmEmbed = new EmbedBuilder()
            .setTitle("🪓 **You Received an Axe Bundle!**")
            .setDescription(`You've received **${COSMETIC_IDS.length} pickaxes** from **${sender}**!`)
            .setColor(0x7b2cff)
            .addFields(
              { name: "💌 Message", value: note, inline: false },
              { name: "📦 Contents", value: `${COSMETIC_IDS.length} Pickaxes`, inline: true },
              { name: "🎁 From", value: sender, inline: true },
              { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
            )
            .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
          console.log(`[axebundle] DM sent to ${targetUser.tag}`);
        }
      } catch (dmError) {
        console.error(`[axebundle] Failed to send DM to user ${targetDiscordId}:`, dmError);
      }

      const reply = new EmbedBuilder()
        .setTitle("✅ Axe Bundle Gift Sent")
        .setDescription(`Sent **${COSMETIC_IDS.length}** pickaxes to <@${targetDiscordId}> as a gift. They have been notified via DM.`)
        .setColor("Green")
        .addFields(
          { name: "From", value: sender, inline: true },
          { name: "Message", value: note, inline: true }
        );

      return interaction.editReply({ embeds: [reply] });

    } catch (error) {
      console.error("[axebundle] Error:", error);
      return interaction.editReply({ content: "❌ Failed to send gift bundle." });
    }
  },
};