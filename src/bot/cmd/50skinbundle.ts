import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import { addCosmetic } from "../../utils/handling/addCosmetic";
import User from "../../db/models/User";
import Gift from "../../db/models/Gift";

const FULL_ACCESS_ROLES = [
  "1460336894926782494", // original admin role
  "1386316323545415690"  // additional admin role
];
const SELF_ONLY_ROLE = "1460345720539447399"; // New role that can only use on themselves
const LOG_CHANNEL_ID = "1454539167286558783";

const COSMETICS = [
  "AthenaCharacter:Character_SharpFang",
  "AthenaCharacter:Character_RedOasisPomegranate",
  "AthenaCharacter:Character_DefectGlitch",
  "AthenaCharacter:Character_Mouse",
  "AthenaCharacter:Character_Hitman_Dark",
  "AthenaCharacter:Character_RoseDust",
  "AthenaCharacter:Character_SunBurst",
  "AthenaCharacter:Character_Virtuous",
  "AthenaCharacter:Character_PinkTrooperDark",
  "AthenaCharacter:CID_A_477_Athena_Commando_F_Handlebar",
  "AthenaCharacter:CID_A_472_Athena_Commando_M_FutureSamuraiSummer",
  "AthenaCharacter:CID_A_453_Athena_Commando_F_FuzzyBearSummer",
  "AthenaCharacter:CID_A_455_Athena_Commando_F_SummerStride",
  "AthenaCharacter:CID_A_400_Athena_Commando_F_ShinyCreature",
  "AthenaCharacter:CID_A_382_Athena_Commando_M_CactusDancer",
  "AthenaCharacter:CID_A_335_Athena_Commando_M_SleekGlasses_8SYX2",
  "AthenaCharacter:CID_A_334_Athena_Commando_M_Sleek_U06KF",
  "AthenaCharacter:CID_A_307_Athena_Commando_F_Slither_E_CSPZ8",
  "AthenaCharacter:CID_A_322_Athena_Commando_F_RenegadeRaiderIce",
  "AthenaCharacter:CID_A_266_Athena_Commando_F_Grandeur_9CO1M",
  "AthenaCharacter:CID_A_232_Athena_Commando_F_CritterStreak_YILHR",
  "AthenaCharacter:CID_A_253_Athena_Commando_F_ZombieElastic_E",
  "AthenaCharacter:CID_A_229_Athena_Commando_F_DisguiseBlack",
  "AthenaCharacter:CID_A_183_Athena_Commando_M_AntiquePal_S7A9W",
  "AthenaCharacter:CID_A_047_Athena_Commando_F_Windwalker",
  "AthenaCharacter:CID_A_182_Athena_Commando_M_Vivid_LZGQ3",
  "AthenaCharacter:CID_A_172_Athena_Commando_F_Stands_E",
  "AthenaCharacter:CID_A_138_Athena_Commando_F_Foray_YQPB0",
  "AthenaCharacter:CID_A_114_Athena_Commando_F_Believer",
  "AthenaCharacter:CID_A_049_Athena_Commando_F_SailorSquadRebel",
  "AthenaCharacter:CID_732_Athena_Commando_F_Stars",
  "AthenaCharacter:CID_660_Athena_Commando_F_BandageNinjaBlue",
  "AthenaCharacter:CID_976_Athena_Commando_F_Wombat_0GRTQ",
  "AthenaCharacter:CID_757_Athena_Commando_F_WildCat",
  "AthenaCharacter:CID_828_Athena_Commando_F_Valet",
  "AthenaCharacter:CID_864_Athena_Commando_F_Elastic_E",
  "AthenaCharacter:CID_822_Athena_Commando_F_Angler",
  "AthenaCharacter:CID_796_Athena_Commando_F_Tank",
  "AthenaCharacter:CID_819_Athena_Commando_F_NeonTightSuit_B",
  "AthenaCharacter:CID_801_Athena_Commando_F_GolfSummer",
  "AthenaCharacter:CID_A_805_Athena_Commando_F_PunkDevilSummer",
  "AthenaCharacter:CID_808_Athena_Commando_F_ConstellationSun",
  "AthenaCharacter:CID_748_Athena_Commando_F_Hitman",
  "AthenaCharacter:CID_703_Athena_Commando_M_Cyclone",
  "AthenaCharacter:CID_740_Athena_Commando_F_CardboardCrew",
  "AthenaCharacter:CID_715_Athena_Commando_F_TwinDark",
  "AthenaCharacter:CID_699_Athena_Commando_F_BrokenHeart",
  "AthenaCharacter:CID_650_Athena_Commando_F_HolidayPJ_B",
  "AthenaCharacter:CID_653_Athena_Commando_F_UglySweaterFrozen",
  "AthenaCharacter:CID_606_Athena_Commando_F_JetSki",
];

export default {
  data: new SlashCommandBuilder()
    .setName("50skinbundle")
    .setDescription("🎁 Send a 50-skin cosmetic bundle as a gift to a user")
    .addUserOption(o =>
      o.setName("user").setDescription("The recipient user").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("from").setDescription("Sender name shown in the gift").setRequired(false)
    )
    .addStringOption(o =>
      o.setName("message").setDescription("Personal message for the gift").setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    const targetUser = interaction.options.getUser("user", true);
    const sender = interaction.options.getString("from") || interaction.user.username;
    const note = interaction.options.getString("message") || "🎉 Enjoy your special gift! 🎉";

    // Permission check
    const roles: any = (interaction.member as any)?.roles;
    const hasFullPermission = roles &&
      (("cache" in roles && FULL_ACCESS_ROLES.some(roleId => roles.cache.has(roleId))) ||
        (Array.isArray(roles) && FULL_ACCESS_ROLES.some(roleId => roles.includes(roleId))));
    
    const hasSelfOnlyPermission = roles &&
      (("cache" in roles && roles.cache.has(SELF_ONLY_ROLE)) ||
        (Array.isArray(roles) && roles.includes(SELF_ONLY_ROLE)));

    // Check permissions
    if (!hasFullPermission && !hasSelfOnlyPermission) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("🚫 Access Denied")
        .setDescription("You do not have permission to send gifts.")
        .setColor(0xff4757);
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // If user has self-only role, they can only send to themselves
    if (hasSelfOnlyPermission && !hasFullPermission && targetUser.id !== interaction.user.id) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("🚫 Permission Restricted")
        .setDescription("You can only use this command on yourself.")
        .setColor(0xff4757);
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    // Find the target user in database
    const target = await User.findOne({ discordId: targetUser.id });
    if (!target) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ User Not Found")
        .setDescription("This user is not registered in our system.")
        .setColor(0xff4757);
      return interaction.editReply({ embeds: [errorEmbed] });
    }

    console.log("[50skinbundle] Target user found:", {
      discordId: target.discordId,
      accountId: target.accountId,
      username: target.username || 'N/A'
    });

    let giftSuccess = false;
    let giftError: any = null;
    let addedCount = 0;

    try {
      // Add all cosmetics to the user's account
      for (const itemId of COSMETICS) {
        try {
          await addCosmetic(targetUser.id, "athena", itemId, {
            skipGift: true,
            isGift: true,
            giftFrom: sender,
            giftMessage: note,
            executorId: interaction.user.id,
            logChannelId: LOG_CHANNEL_ID
          });
          addedCount++;
          console.log(`[50skinbundle] Added ${itemId} to ${targetUser.tag}`);
        } catch (itemError) {
          console.warn(`[50skinbundle] Failed to add item ${itemId}:`, itemError);
        }
      }

      giftSuccess = addedCount > 0;
      console.log(`[50skinbundle] Added ${addedCount}/${COSMETICS.length} skins to ${targetUser.tag}`);

      // ✅ CRITICAL: CREATE GIFT RECORD IN DATABASE FOR /claimgift TO FIND
      if (giftSuccess) {
        try {
          const giftRecord = new Gift({
            recipientId: targetUser.id, // Discord ID
            items: COSMETICS, // Array of cosmetic IDs
            sender: sender,
            message: note,
            claimed: false
          });
          await giftRecord.save();
          console.log(`[50skinbundle] Gift record created for ${targetUser.tag}, Gift ID: ${giftRecord._id}`);
        } catch (giftRecordError) {
          console.error("[50skinbundle] Failed to create gift record:", giftRecordError);
          // Continue anyway - the items were added to profile
        }
      }

      // Send DM to the user with instructions to claim
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🎁 **You Received a Gift!**")
          .setDescription(`You've received an exclusive ${addedCount}-skin bundle from **${sender}**!`)
          .setColor(0x7b2cff)
          .addFields(
            { name: "💌 Message", value: note, inline: false },
            { name: "📦 Contents", value: `${addedCount} Exclusive Skins`, inline: true },
            { name: "🎁 From", value: sender, inline: true },
            { name: "🎨 Styles Included", value: "All styles are unlocked!", inline: true },
            { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
          )
          .setThumbnail("https://i.imgur.com/8KjQzZ2.png")
          .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
        console.log(`[50skinbundle] DM sent to ${targetUser.tag}`);

      } catch (dmError) {
        console.error(`[50skinbundle] Failed to send DM to ${targetUser.tag}:`, dmError);
        // Continue anyway - the items were added successfully
      }

    } catch (error) {
      giftError = error;
      console.error("[50skinbundle] Failed to process gift bundle:", error);
    }

    // Log to channel
    try {
      const logChannel = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (logChannel && logChannel.isTextBased()) {
        const logEmbed = new EmbedBuilder()
          .setTitle(giftSuccess ? "🎁✨ 50-Skin Bundle Delivered" : "⚠️ Bundle Delivery Failed")
          .setColor(giftSuccess ? 0x00ff00 : 0xff0000)
          .addFields(
            { name: "🎅 Gift Giver", value: `<@${interaction.user.id}>`, inline: true },
            { name: "🎁 Recipient", value: `<@${targetUser.id}>`, inline: true },
            { name: "💌 From", value: sender, inline: true },
            { name: "📝 Message", value: note, inline: false },
            { name: "📦 Items Added", value: `${addedCount}/${COSMETICS.length} skins`, inline: true },
            { name: "✅ Status", value: giftSuccess ? "Success" : "Failed", inline: true },
            { name: "🎯 Claimable", value: giftSuccess ? "Yes - Use `/claimgift`" : "No", inline: true }
          )
          .setFooter({ text: "Lyric Gift System" })
          .setTimestamp();

        if (!giftSuccess && giftError) {
          logEmbed.addFields({
            name: "🚨 Error", 
            value: `\`\`\`${giftError.message || giftError}\`\`\``, 
            inline: false
          });
        }
        
        await (logChannel as TextChannel).send({ embeds: [logEmbed] });
      }
    } catch (logError) {
      console.warn("[50skinbundle] Failed to log to channel:", logError);
    }

    // Response to the command user
    const responseEmbed = new EmbedBuilder()
      .setTitle(giftSuccess ? "🎁 Gift Delivered Successfully!" : "❌ Gift Delivery Failed")
      .setColor(giftSuccess ? 0x00d2d3 : 0xff4757)
      .setDescription(
        giftSuccess 
          ? `**${addedCount} exclusive skins** have been added to ${targetUser.tag}'s account!\n\n` +
            `💝 **From:** ${sender}\n` +
            `💌 **Message:** "${note}"\n\n` +
            `📨 A gift notification has been sent to the user with instructions to claim!\n` +
            `🎯 **The user must use \`/claimgift\` to receive the items!**`
          : `Failed to deliver gift: ${giftError?.message || "Unknown error"}\n\n` +
            `Please check the logs for more details.`
      )
      .setTimestamp();

    return interaction.editReply({ embeds: [responseEmbed] });
  },
};