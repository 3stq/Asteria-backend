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
  "AthenaDance:EID_Clamor","AthenaDance:EID_Goodbye","AthenaDance:EID_Alliteration","AthenaDance:EID_Spooky","AthenaDance:EID_Punctual","AthenaDance:EID_Coping","AthenaDance:EID_Jiggle","AthenaDance:EID_Prance","AthenaDance:EID_RememberMe","AthenaDance:EID_Sashimi","AthenaDance:EID_LittleEgg_69OX0","AthenaDance:EID_Tally","AthenaDance:EID_Triumphant","AthenaDance:EID_Aloha_C82XX","AthenaDance:EID_BeHere_8070H","AthenaDance:EID_Sleek_S20CU","AthenaDance:EID_JumpingJoy_WKPG4","AthenaDance:EID_Tonal_51QI9","AthenaDance:EID_DuckTeacher_9IPLU","AthenaDance:EID_MyEffort_BT5Z0","AthenaDance:EID_Comrade_6O5AK","AthenaDance:EID_Downward_8GZUA","AthenaDance:EID_Suspenders","AthenaDance:EID_Vivid_I434X","AthenaDance:EID_Boomer_N2RQT","AthenaDance:EID_Blaster","AthenaDance:EID_Deflated_6POAZ","AthenaDance:EID_ByTheFire","AthenaDance:EID_CelebrationDance","AthenaDance:EID_Macaroon_45LHE","AthenaDance:EID_BluePhoto_JSG4D","AthenaDance:EID_Socks_XA9HM","AthenaDance:EID_TwistWasp_T2I4J","AthenaDance:EID_TwistFire_I2VTA","AthenaDance:EID_BuffCatComic_EV4HK","AthenaDance:EID_OverUnder_K3T0G","AthenaDance:EID_Griddles","AthenaDance:EID_Martian_SK4J6","AthenaDance:EID_Quantity_39X5D","AthenaDance:EID_Noodles_X6R9E","AthenaDance:EID_ModerateAmount_9LUN1","AthenaDance:EID_GasStation_104FQ","AthenaDance:EID_Psychic_7SO2Z","AthenaDance:EID_LetsBegin","AthenaDance:EID_Feral","AthenaDance:EID_DontSneeze","AthenaDance:EID_JanuaryBop","AthenaDance:EID_SandwichBop","AthenaDance:EID_KeeperDreamHook","AthenaDance:EID_KeeperDreamChorus","AthenaDance:EID_HotPink","AthenaDance:EID_TwistDaytona","AthenaDance:EID_TwistEternity","AthenaDance:EID_CycloneHeadBang",
];

export default {
  data: new SlashCommandBuilder()
    .setName("iconemotes")
    .setDescription("Grants the Icon Emotes bundle as a gift with DM notification.")
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
            .setTitle("💃 **You Received Icon Emotes!**")
            .setDescription(`You've received **${COSMETIC_IDS.length} emotes** from **${sender}**!`)
            .setColor(0x7b2cff)
            .addFields(
              { name: "💌 Message", value: note, inline: false },
              { name: "📦 Contents", value: `${COSMETIC_IDS.length} Emotes`, inline: true },
              { name: "🎁 From", value: sender, inline: true },
              { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
            )
            .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
            .setTimestamp();

          await targetUser.send({ embeds: [dmEmbed] });
          console.log(`[iconemotes] DM sent to ${targetUser.tag}`);
        }
      } catch (dmError) {
        console.error(`[iconemotes] Failed to send DM to user ${targetDiscordId}:`, dmError);
      }

      const reply = new EmbedBuilder()
        .setTitle("✅ Icon Emotes Gift Sent")
        .setDescription(`Sent **${COSMETIC_IDS.length}** emotes to <@${targetDiscordId}> as a gift. They have been notified via DM.`)
        .setColor("Green")
        .addFields(
          { name: "From", value: sender, inline: true },
          { name: "Message", value: note, inline: true }
        );

      return interaction.editReply({ embeds: [reply] });

    } catch (error) {
      console.error("[iconemotes] Error:", error);
      return interaction.editReply({ content: "❌ Failed to send gift bundle." });
    }
  },
};