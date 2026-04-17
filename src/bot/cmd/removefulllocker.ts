import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  GuildMember,
  userMention,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

const ALLOWED_ROLE_ID = "1460336894926782494";

// Cosmetic templateId prefixes commonly used in athena profile
const COSMETIC_PREFIXES = [
  "AthenaCharacter",      // Skins
  "AthenaBackpack",       // Back blings
  "AthenaPickaxe",        // Pickaxes
  "AthenaDance",          // Emotes
  "AthenaGlider",         // Gliders
  "AthenaItemWrap",       // Wraps
  "AthenaMusicPack",      // Music packs
  "AthenaLoadingScreen",  // Loading screens
  "AthenaSkyDiveContrail",// Contrails
  "AthenaPetCarrier",     // Pets
  "AthenaToy",            // Toys
  "AthenaSpray",          // Sprays
  "AthenaEmoji"           // Emojis
];

function isCosmetic(templateId?: string): boolean {
  if (!templateId || typeof templateId !== "string") return false;
  return COSMETIC_PREFIXES.some(prefix => templateId.startsWith(prefix));
}

export default {
  data: new SlashCommandBuilder()
    .setName("removefulllocker")
    .setDescription("Safely remove (almost) all cosmetics from a user's locker.")
    .addUserOption(opt =>
      opt
        .setName("user")
        .setDescription("The user to strip cosmetics from")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Permission & context checks
    if (!interaction.guild || !interaction.member) {
      return interaction.reply({
        content: "❌ This command can only be used in a server.",
        flags: 64,
      });
    }

    const member = interaction.member as GuildMember;
    if (!member.roles.cache.has(ALLOWED_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: 64,
      });
    }

    const target = interaction.options.getUser("user", true);

    try {
      await interaction.deferReply({ flags: 64 });

      const user = await User.findOne({ discordId: target.id });
      if (!user) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription(`User ${userMention(target.id)} not found in database.`)
              .setColor("Red"),
          ],
        });
      }

      const profileDoc = await Profiles.findOne({ accountId: user.accountId });
      if (!profileDoc) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription("No profile found for this user.")
              .setColor("Red"),
          ],
        });
      }

      const athena = profileDoc.profiles?.athena;
      if (!athena || typeof athena.items !== "object") {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription("Athena profile missing or malformed.")
              .setColor("Red"),
          ],
        });
      }

      // Read favorites (if present) so we can prefer keeping them
      const stats = athena.stats?.attributes ?? {};
      const favoriteCharacter = stats.favorite_character as string | undefined;
      const favoritePickaxe   = stats.favorite_pickaxe as string | undefined;

      // Find the item GUIDs by templateId for favorites
      const findItemIdByTemplate = (templateId?: string): string | undefined => {
        if (!templateId) return undefined;
        for (const [iid, item] of Object.entries<any>(athena.items)) {
          if (item?.templateId === templateId) return iid;
        }
        return undefined;
      };

      // Figure out which single skin + pickaxe to keep
      const preferredCharacterId = findItemIdByTemplate(favoriteCharacter);
      const preferredPickaxeId   = findItemIdByTemplate(favoritePickaxe);

      let keptCharacterId: string | undefined = preferredCharacterId;
      let keptPickaxeId: string | undefined   = preferredPickaxeId;

      // If favorites not found, pick the first available of each category
      if (!keptCharacterId) {
        for (const [iid, item] of Object.entries<any>(athena.items)) {
          if (item?.templateId?.startsWith("AthenaCharacter")) {
            keptCharacterId = iid;
            break;
          }
        }
      }
      if (!keptPickaxeId) {
        for (const [iid, item] of Object.entries<any>(athena.items)) {
          if (item?.templateId?.startsWith("AthenaPickaxe")) {
            keptPickaxeId = iid;
            break;
          }
        }
      }

      // Safety: if we cannot find at least one character and one pickaxe, ABORT
      if (!keptCharacterId || !keptPickaxeId) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Error")
              .setDescription(
                "Could not locate at least one skin and one pickaxe to keep. " +
                "Aborting to avoid corrupting the profile."
              )
              .setColor("Red"),
          ],
        });
      }

      // Build a deletion plan: delete all cosmetics EXCEPT the kept skin & pickaxe
      const beforeCount = Object.keys(athena.items).length;
      const toDeleteIds: string[] = [];

      for (const [iid, item] of Object.entries<any>(athena.items)) {
        const tpl = item?.templateId as string | undefined;
        if (!isCosmetic(tpl)) continue; // non-cosmetics untouched
        // Always keep the one character & pickaxe we elected
        if (iid === keptCharacterId || iid === keptPickaxeId) continue;
        toDeleteIds.push(iid);
      }

      // Apply deletes
      for (const iid of toDeleteIds) {
        delete athena.items[iid];
      }

      // Normalize favorites to point to the kept ones (by templateId)
      const keptCharacterTpl = athena.items[keptCharacterId]?.templateId;
      const keptPickaxeTpl   = athena.items[keptPickaxeId]?.templateId;

      if (!athena.stats) athena.stats = {};
      if (!athena.stats.attributes) athena.stats.attributes = {};

      if (keptCharacterTpl) athena.stats.attributes.favorite_character = keptCharacterTpl;
      if (keptPickaxeTpl)   athena.stats.attributes.favorite_pickaxe   = keptPickaxeTpl;

      // Optional: clear other favorites that might now be invalid
      const invalidFavKeys = [
        "favorite_backpack",
        "favorite_glider",
        "favorite_skydivecontrail",
        "favorite_musicpack",
        "favorite_loadingscreen",
      ];
      for (const key of invalidFavKeys) {
        const tpl = athena.stats.attributes[key];
        if (tpl && typeof tpl === "string") {
          // If favorite no longer exists in items, clear it
          const stillExists = Object.values<any>(athena.items).some(it => it?.templateId === tpl);
          if (!stillExists) delete athena.stats.attributes[key];
        }
      }

      // Mark modified paths and save
      profileDoc.markModified("profiles.athena.items");
      profileDoc.markModified("profiles.athena.stats.attributes");
      await profileDoc.save();

      const afterCount = Object.keys(athena.items).length;
      const removed = toDeleteIds.length;

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Success")
            .setDescription(
              `Removed **${removed}** cosmetic item(s) from ${userMention(target.id)}'s locker.\n` +
              `Items before: **${beforeCount}**, after: **${afterCount}**.\n` +
              `Kept skin & pickaxe to maintain a valid profile.`
            )
            .setColor("Green"),
        ],
      });
    } catch (err) {
      console.error("Error removing locker:", err);
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle("Error")
            .setDescription("An error occurred while removing the locker. No destructive replacement was performed.")
            .setColor("Red"),
        ],
      });
    }
  },
};
