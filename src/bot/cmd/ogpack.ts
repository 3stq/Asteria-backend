import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import { enqueueGiftOnce } from "../../utils/gifting";

const FULL_ACCESS_ROLE = "1460336894926782494";
const LOG_CHANNEL_ID = "1454539167286558783";

/** Base OG items (skins + emotes + pickaxes + gliders/backpacks) */
const RAW_IDS = [
  // already prefixed
  "AthenaBackpack:BID_003_RedKnight",
  "AthenaBackpack:BID_004_BlackKnight",
  "AthenaBackpack:BID_001_BlueSquire",
  "AthenaCharacter:CID_035_Athena_Commando_M_Medieval",
  "AthenaCharacter:CID_034_Athena_Commando_F_Medieval",
  "AthenaCharacter:CID_033_Athena_Commando_F_Medieval",
  "AthenaCharacter:CID_032_Athena_Commando_M_Medieval",
  "AthenaDance:EID_TakeTheL",

  // raw → map to athena categories
  "CID_022_Athena_Commando_F",
  "CID_017_Athena_Commando_M",
  "CID_028_Athena_Commando_F",
  "CID_030_Athena_Commando_M_Halloween", // Skull Trooper
  "CID_029_Athena_Commando_F_Halloween", // Ghoul Trooper
  "CID_024_Athena_Commando_F",
  "CID_027_Athena_Commando_F",

  "EID_Fresh",
  "EID_Dab",
  "EID_ElectroShuffle",
  "EID_Floss",
  "EID_RideThePony_Athena",
  "EID_Worm",

  "HalloweenScythe",
  "Pickaxe_Lockjaw",
  "SickleBatPickaxe",
  "Pickaxe_ID_013_Teslacoil",
  "Pickaxe_ID_015_HolidayCandyCane",
  "HappyPickaxe",

  "Glider_Warthog",
  "Umbrella_Snowflake",
] as const;

function toAthenaId(raw: string): string {
  if (/^(AthenaCharacter|AthenaDance|AthenaGlider|AthenaPickaxe|AthenaBackpack):/.test(raw)) return raw;
  if (raw.startsWith("CID_")) return `AthenaCharacter:${raw}`;
  if (raw.startsWith("EID_")) return `AthenaDance:${raw}`;
  if (raw.startsWith("Glider_") || raw.startsWith("Umbrella_")) return `AthenaGlider:${raw}`;
  if (
    raw.startsWith("Pickaxe_") ||
    raw.startsWith("Sickle") ||
    raw.startsWith("HappyPickaxe") ||
    raw.startsWith("HalloweenScythe")
  )
    return `AthenaPickaxe:${raw}`;
  return raw;
}

const VARIANT_OVERRIDES: Record<string, { channel: string; owned: string[]; active: string }[]> = {
  // Ghoul Trooper -> PINK
  "AthenaCharacter:CID_029_Athena_Commando_F_Halloween": [
    { channel: "Material", owned: ["Mat1", "Mat2", "Mat3"], active: "Mat3" },
  ],
  // Skull Trooper -> PURPLE (+ parts)
  "AthenaCharacter:CID_030_Athena_Commando_M_Halloween": [
    { channel: "ClothingColor", owned: ["Mat0", "Mat1", "Mat2", "Mat3", "Mat4"], active: "Mat2" },
    { channel: "Parts", owned: ["Stage1", "Stage2"], active: "Stage1" },
  ],
};

export default {
  data: new SlashCommandBuilder()
    .setName("ogpack")
    .setDescription("Grants the OG Pack as a GIFT (Ghoul Pink & Skull Purple unlocked).")
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
    if (!member?.roles?.cache?.has(FULL_ACCESS_ROLE)) {
      return interaction.editReply({
        embeds: [new EmbedBuilder().setColor("Red").setTitle("❌ Permission Denied")],
      });
    }

    const targetDiscordId = interaction.options.getString("user", true).trim();
    const sender =
      interaction.options.getString("sender") ??
      `${interaction.user.username}#${interaction.user.discriminator}`;
    const message = interaction.options.getString("message") ?? "Enjoy your gift!";

    const target = await User.findOne({ discordId: targetDiscordId });
    if (!target) {
      return interaction.editReply({ content: "❌ User not found in DB." });
    }

    // fetch profile to apply variants too
    const profileDoc = await Profiles.findOne({ accountId: target.accountId });
    if (!profileDoc) {
      return interaction.editReply({ content: "❌ Profile not found." });
    }

    const FINAL_IDS = Array.from(new Set(RAW_IDS.map(toAthenaId)));
    // stage items + variants
    const athena: any = profileDoc.profiles.athena ?? {};
    athena.items ??= {};
    athena.stats ??= {};
    athena.stats.attributes ??= {};

    for (const id of FINAL_IDS) {
      if (!athena.items[id]) {
        athena.items[id] = {
          templateId: id,
          attributes: {
            max_level_bonus: 0,
            level: 1,
            item_seen: true,
            xp: 0,
            variants: [],
            favorite: false,
          },
          quantity: 1,
        };
      }
    }
    // apply overrides (Ghoul pink / Skull purple)
    for (const key of Object.keys(VARIANT_OVERRIDES)) {
      const entry = athena.items[key];
      if (!entry) continue;
      const attrs = entry.attributes ?? {};
      const current = Array.isArray(attrs.variants) ? attrs.variants : [];
      for (const v of VARIANT_OVERRIDES[key]) {
        const i = current.findIndex((x: any) => x.channel === v.channel);
        if (i >= 0) current[i] = v;
        else current.push(v);
      }
      attrs.variants = current;
      entry.attributes = attrs;
    }

    // write athena once
    await profileDoc.updateOne({
      $set: {
        "profiles.athena.items": athena.items,
        "profiles.athena.stats": athena.stats,
      },
    });

    // enqueue gift popup
    await enqueueGiftOnce(target.accountId, sender, message, FINAL_IDS);

    // Send DM manually to ensure it works
    try {
      const targetUser = await interaction.client.users.fetch(targetDiscordId);
      if (targetUser) {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🏆 **You Received an OG Pack!**")
          .setDescription(`You've received **${FINAL_IDS.length} OG items** from **${sender}**!`)
          .setColor(0x7b2cff)
          .addFields(
            { name: "💌 Message", value: message, inline: false },
            { name: "📦 Contents", value: `${FINAL_IDS.length} OG Cosmetics`, inline: true },
            { name: "🎁 From", value: sender, inline: true },
            { name: "✨ Special Variants", value: "Ghoul Trooper (Pink) & Skull Trooper (Purple) unlocked!", inline: false },
            { name: "🚀 How to Claim", value: "Use `/claimgift` to receive your items!", inline: false }
          )
          .setFooter({ text: "Lyric Gift System • Use /claimgift to receive your items!" })
          .setTimestamp();

        await targetUser.send({ embeds: [dmEmbed] });
        console.log(`[ogpack] DM sent to ${targetUser.tag}`);
      }
    } catch (dmError) {
      console.error(`[ogpack] Failed to send DM to user ${targetDiscordId}:`, dmError);
    }

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x3fb950)
          .setTitle("✅ OG Pack Granted as Gift")
          .setDescription(
            `Queued gift for <@${targetDiscordId}> with **${FINAL_IDS.length}** items (Ghoul **Pink**, Skull **Purple**). They have been notified via DM.`
          )
          .addFields(
            { name: "Sender", value: sender, inline: true },
            ...(message ? [{ name: "Message", value: message, inline: false }] : [])
          ),
      ],
    });

    // log
    try {
      const ch = await interaction.client.channels.fetch(LOG_CHANNEL_ID);
      if (ch && ch.isTextBased()) {
        await (ch as TextChannel).send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x7b2cff)
              .setTitle("🎁 Gift Enqueued: /ogpack")
              .addFields(
                { name: "Executor", value: `<@${interaction.user.id}>`, inline: true },
                {
                  name: "Recipient",
                  value: `<@${targetDiscordId}> (acc: \`${target.accountId}\`)`,
                  inline: true,
                },
                { name: "Sender", value: sender, inline: false },
                { name: "Items", value: `Count: ${FINAL_IDS.length}`, inline: false }
              )
              .setTimestamp(),
          ],
        });
      }
    } catch (e) {
      console.warn("[ogpack] log failed:", e);
    }
  },
};