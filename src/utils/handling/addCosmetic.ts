import { Client, EmbedBuilder, TextChannel } from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

export type CosmeticKind =
  | "athena"
  | "pickaxe"
  | "emote"
  | "glider"
  | "backpack"
  | "wrap"
  | "music"
  | string;

export interface CosmeticVariant {
  channel: string;
  owned: string[];
  active: string;
}

export const PREDEFINED_VARIANTS: Record<string, CosmeticVariant[]> = {
  "AthenaCharacter:CID_029_Athena_Commando_F_Halloween": [
    { channel: "Material", owned: ["Mat1", "Mat2", "Mat3"], active: "Mat3" },
  ],
  "AthenaCharacter:CID_030_Athena_Commando_M_Halloween": [
    { channel: "ClothingColor", owned: ["Mat0", "Mat1", "Mat2", "Mat3", "Mat4"], active: "Mat2" },
    { channel: "Parts", owned: ["Stage1", "Stage2"], active: "Stage1" },
  ],
  "AthenaCharacter:CID_556_Athena_Commando_F_RebirthDefault": [
    { channel: "Progressive", owned: ["Stage1", "Stage2", "Stage3", "Stage4", "Stage5"], active: "Stage5" },
  ],
  "AthenaCharacter:CID_805_Athena_Commando_F_PunkDevilSummer": [
    { channel: "Progressive", owned: ["Stage1", "Stage2", "Stage3"], active: "Stage3" },
  ],
  "AthenaCharacter:CID_685_Athena_Commando_M_Drift": [
    { channel: "Progressive", owned: ["Stage1", "Stage2", "Stage3", "Stage4", "Stage5"], active: "Stage5" },
  ],
  "AthenaCharacter:CID_693_Athena_Commando_M_Ragnarok": [
    { channel: "Progressive", owned: ["Stage1", "Stage2", "Stage3", "Stage4", "Stage5", "Stage6"], active: "Stage6" },
  ],
};

export interface AddCosmeticOptions {
  client?: Client;
  executorId?: string;
  logChannelId?: string;
  giftFrom?: string;
  giftMessage?: string;
  skipGift?: boolean;
  giftId?: string;
  isGift?: boolean;
  variants?: CosmeticVariant[];
}

/**
 * Automatically generates variants for cosmetics
 */
export function generateAutoVariants(templateId: string): CosmeticVariant[] {
  const variants: CosmeticVariant[] = [];
  const id = templateId.toLowerCase();

  // Character skins - more comprehensive variant setup
  if (templateId.startsWith('AthenaCharacter:')) {
    // Material variants (colors)
    variants.push({
      channel: "Material",
      owned: ["Mat1", "Mat2", "Mat3", "Mat4", "Mat5", "Mat6"],
      active: "Mat1"
    });
    
    // Clothing color variants
    variants.push({
      channel: "ClothingColor",
      owned: ["Mat1", "Mat2", "Mat3", "Mat4", "Mat5"],
      active: "Mat1"
    });
    
    // Particle effects
    variants.push({
      channel: "Particle",
      owned: ["Default", "Energy", "Fire", "Ice", "Gold"],
      active: "Default"
    });

    // Special variants for specific skin types
    if (id.includes('halloween') || id.includes('ghoul') || id.includes('skull')) {
      variants.push({
        channel: "Special",
        owned: ["Default", "Glow", "Spooky", "Ghost"],
        active: "Default"
      });
    }
    
    if (id.includes('progressive') || id.includes('stage') || id.includes('max')) {
      variants.push({
        channel: "Progressive",
        owned: ["Stage1", "Stage2", "Stage3", "Stage4", "Stage5", "Stage6"],
        active: "Stage6"
      });
    }
  }

  // Pickaxes with enhanced variants
  if (templateId.startsWith('AthenaPickaxe:')) {
    variants.push({
      channel: "Color",
      owned: ["Default", "Red", "Blue", "Green", "Gold", "Dark", "Rainbow"],
      active: "Default"
    });
    
    variants.push({
      channel: "Effect",
      owned: ["Default", "Sparkle", "Fire", "Ice", "Lightning"],
      active: "Default"
    });
  }

  // Gliders with enhanced variants
  if (templateId.startsWith('AthenaGlider:')) {
    variants.push({
      channel: "Style",
      owned: ["Default", "Alt1", "Alt2", "Alt3", "Special"],
      active: "Default"
    });
    
    variants.push({
      channel: "Trail",
      owned: ["Default", "Rainbow", "Fire", "Energy", "Smoke"],
      active: "Default"
    });
  }

  // Backblings with enhanced variants
  if (templateId.startsWith('AthenaBackpack:')) {
    variants.push({
      channel: "Effect",
      owned: ["Default", "FX1", "FX2", "FX3", "FX4", "FX5"],
      active: "Default"
    });
    
    variants.push({
      channel: "Color",
      owned: ["Default", "Red", "Blue", "Green", "Gold", "Purple"],
      active: "Default"
    });
  }

  // Wraps with enhanced variants
  if (templateId.startsWith('AthenaItemWrap:')) {
    variants.push({
      channel: "Color",
      owned: ["Default", "Red", "Blue", "Green", "Gold", "Purple", "Rainbow"],
      active: "Default"
    });
    
    variants.push({
      channel: "Effect",
      owned: ["Default", "Glow", "Animated", "Metallic", "Holographic"],
      active: "Default"
    });
  }

  return variants;
}

export async function addCosmetic(
  targetDiscordId: string,
  kind: CosmeticKind,
  templateId: string,
  opts: AddCosmeticOptions = {}
): Promise<void> {
  const {
    client,
    executorId,
    logChannelId,
    giftFrom = "Admin",
    giftMessage = "Enjoy!",
    skipGift = false,
    giftId,
    isGift = false,
    variants,
  } = opts;

  const user = await User.findOne({ discordId: targetDiscordId });
  if (!user) throw new Error(`User with discordId ${targetDiscordId} not found`);

  const profileDoc = await Profiles.findOne({ accountId: user.accountId });
  if (!profileDoc) throw new Error(`Profiles for account ${user.accountId} not found`);

  // Create a safe copy to avoid schema conflicts
  const profiles = JSON.parse(JSON.stringify(profileDoc.profiles));
  const athena = profiles.athena ??= {};
  athena.items ??= {};
  athena.stats ??= {};
  athena.stats.attributes ??= {};

  const customVariants = variants || PREDEFINED_VARIANTS[templateId] || [];
  const cosmeticVariants = customVariants.length > 0 ? customVariants : generateAutoVariants(templateId);

  // Generate a unique item ID for the cosmetic
  const itemId = ` ${templateId.replace(/:/g, '_')}_${Date.now()}`;

  if (!athena.items[itemId]) {
    athena.items[itemId] = {
      templateId,
      attributes: {
        max_level_bonus: 0,
        level: 1,
        item_seen: true,
        rnd_sel_cnt: 0,
        xp: 0,
        variants: cosmeticVariants,
        favorite: false,
        ...(isGift && {
          gift_data: {
            gift_id: giftId || `gift_${Date.now()}`,
            gifted_at: new Date().toISOString(),
            from: giftFrom,
            message: giftMessage,
            received_via: "discord_command"
          }
        })
      },
      quantity: 1,
    };
  } else {
    athena.items[itemId].attributes ??= {};
    athena.items[itemId].attributes.item_seen = true;
    
    if (cosmeticVariants.length > 0) {
      const existingVariants = athena.items[itemId].attributes.variants || [];
      
      cosmeticVariants.forEach(newVariant => {
        const existingIndex = existingVariants.findIndex((v: any) => v.channel === newVariant.channel);
        if (existingIndex >= 0) {
          existingVariants[existingIndex] = newVariant;
        } else {
          existingVariants.push(newVariant);
        }
      });
      
      athena.items[itemId].attributes.variants = existingVariants;
    }
    
    if (isGift && !athena.items[itemId].attributes.gift_data) {
      athena.items[itemId].attributes.gift_data = {
        gift_id: giftId || `gift_${Date.now()}`,
        gifted_at: new Date().toISOString(),
        from: giftFrom,
        message: giftMessage,
        received_via: "discord_command"
      };
    }
  }

  // Update favorites
  const fav = athena.stats.attributes;
  const prefix = templateId.split(":")[0];
  if (prefix === "AthenaCharacter") fav.favorite_character = templateId;
  else if (prefix === "AthenaPickaxe") fav.favorite_pickaxe = templateId;
  else if (prefix === "AthenaDance") {
    fav.favorite_dance = Array.isArray(fav.favorite_dance) ? fav.favorite_dance : [];
    if (!fav.favorite_dance.includes(templateId)) fav.favorite_dance.push(templateId);
  }

  // CRITICAL FIX: Update the rvn properly and save the entire profiles object
  athena.rvn = athena.rvn ? athena.rvn + 1 : Date.now();
  athena.updated = new Date().toISOString();
  athena.commandRevision = athena.commandRevision ? athena.commandRevision + 1 : 1;

  // Update the profile document
  await Profiles.updateOne(
    { accountId: user.accountId },
    { 
      $set: { 
        "profiles": profiles,
        "updated": new Date().toISOString()
      } 
    }
  );

  console.log(`✅ Added cosmetic ${templateId} to user ${targetDiscordId}. RVN: ${athena.rvn}`);

  if (client && logChannelId) {
    try {
      const ch = await client.channels.fetch(logChannelId);
      if (ch && ch.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle(isGift ? "🎁 Gifted Cosmetic" : "⚡ Cosmetic Granted")
          .setColor(isGift ? 0x7b2cff : 0x00ff00)
          .addFields(
            { name: "Executor", value: executorId ? `<@${executorId}>` : "—", inline: true },
            { name: "Recipient", value: `<@${targetDiscordId}>`, inline: true },
            { name: "Cosmetic", value: `\`${templateId}\``, inline: false },
            { name: "Type", value: isGift ? "Gift" : "Direct Grant", inline: true },
            { name: "Variants", value: cosmeticVariants.length > 0 ? `${cosmeticVariants.length} styles` : "No styles", inline: true },
            { name: "RVN", value: athena.rvn.toString(), inline: true },
            ...(isGift ? [
              { name: "Gift From", value: giftFrom, inline: true },
              { name: "Message", value: giftMessage, inline: true }
            ] : [])
          )
          .setTimestamp();
        (ch as TextChannel).send({ embeds: [embed] });
      }
    } catch (e) {
      console.warn("[addCosmetic] failed to send log:", e);
    }
  }
}

export async function addCosmeticsAsGift(
  targetDiscordId: string,
  items: string[],
  giftFrom: string,
  giftMessage: string,
  opts: Omit<AddCosmeticOptions, 'skipGift' | 'giftFrom' | 'giftMessage'> = {}
): Promise<string> {
  const { client, executorId, logChannelId } = opts;
  
  const user = await User.findOne({ discordId: targetDiscordId });
  if (!user) throw new Error(`User with discordId ${targetDiscordId} not found`);

  const giftId = `gift_bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const itemsWithVariants: string[] = [];

  for (const itemId of items) {
    const variants = PREDEFINED_VARIANTS[itemId] || generateAutoVariants(itemId);
    if (variants.length > 0) {
      itemsWithVariants.push(itemId);
    }

    await addCosmetic(targetDiscordId, "athena", itemId, {
      client,
      executorId,
      logChannelId,
      giftFrom,
      giftMessage,
      skipGift: true,
      giftId,
      isGift: true,
      variants: variants
    });
  }

  // Log the bundle gift
  if (client && logChannelId) {
    try {
      const ch = await client.channels.fetch(logChannelId);
      if (ch && ch.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle("🎁✨ Cosmetic Bundle Gifted")
          .setColor(0x7b2cff)
          .addFields(
            { name: "Executor", value: executorId ? `<@${executorId}>` : "—", inline: true },
            { name: "Recipient", value: `<@${targetDiscordId}>`, inline: true },
            { name: "Items", value: `${items.length} cosmetics`, inline: true },
            { name: "Items with Styles", value: `${itemsWithVariants.length} items`, inline: true },
            { name: "Gift From", value: giftFrom, inline: true },
            { name: "Message", value: giftMessage, inline: true },
            { name: "Gift ID", value: giftId, inline: false }
          )
          .setTimestamp();
        (ch as TextChannel).send({ embeds: [embed] });
      }
    } catch (e) {
      console.warn("[addCosmeticsAsGift] failed to send log:", e);
    }
  }

  return giftId;
}

// Alias function for backward compatibility
export async function addCosmeticByDiscordId(
  targetDiscordId: string,
  kind: CosmeticKind,
  templateId: string,
  opts: AddCosmeticOptions = {}
): Promise<void> {
  return addCosmetic(targetDiscordId, kind, templateId, opts);
}

export default { addCosmetic, addCosmeticsAsGift, generateAutoVariants, addCosmeticByDiscordId };