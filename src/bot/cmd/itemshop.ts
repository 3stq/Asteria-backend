// src/bot/cmd/itemshop.ts
import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import fs from "fs";
import path from "path";

// Your master cosmetics map (used by addcosmetic etc.)
import allCosmetics from "../../resources/utilities/allcosmetics.json";

// ---- helpers ---------------------------------------------------------------

/** Try to resolve a human-readable name for a cosmetic ID. */
function getCosmeticName(id: string): string {
  if (!id) return "";

  // Exact key
  // Some repos store entries as { [templateId]: {..., name } }
  const direct = (allCosmetics as any)[id];
  const directName =
    direct?.name ??
    direct?.attributes?.name ??
    direct?.attributes?.itemName ??
    direct?.displayName;
  if (directName) return String(directName);

  // Try common Fortnite templateId prefixes
  const candidates = [
    `AthenaCharacter:${id}`,
    `AthenaPickaxe:${id}`,
    `AthenaDance:${id}`,
    `AthenaGlider:${id}`,
    `AthenaBackpack:${id}`,
    `AthenaItemWrap:${id}`,
    `AthenaPetCarrier:${id}`,
    `AthenaMusicPack:${id}`,
    `AthenaLoadingScreen:${id}`,
  ];

  for (const key of candidates) {
    const hit = (allCosmetics as any)[key];
    const name =
      hit?.name ??
      hit?.attributes?.name ??
      hit?.attributes?.itemName ??
      hit?.displayName;
    if (name) return String(name);
  }

  // Last-resort prettifier (CID_Thing_Foo -> CID Thing Foo)
  return id.replace(/[_:]+/g, " ").trim();
}

type ShopConfig = Record<string, string | number>;

/** Collect entries like SKIN / SKIN2 / ... + *_PRICE */
function collectCategory(
  cfg: ShopConfig,
  baseKey: string
): { id: string; price: number }[] {
  const out: { id: string; price: number }[] = [];

  // We’ll scan keys that start with the baseKey (SKIN, PICKAXE, etc.)
  // and pair with "<key>_PRICE"
  const keys = Object.keys(cfg).filter((k) =>
    new RegExp(`^${baseKey}\\d*$`, "i").test(k)
  );

  for (const k of keys) {
    const id = String(cfg[k] || "");
    const priceKey = `${k}_PRICE`;
    const rawPrice = Number(cfg[priceKey] ?? 0);

    if (!id || !rawPrice) continue; // skip empty or free/zero entries

    out.push({ id, price: rawPrice });
  }

  return out;
}

/** Bundles live under SECTION_* with matching *_PRICE */
function collectBundles(cfg: ShopConfig) {
  const out: { name: string; price: number }[] = [];

  for (const [k, v] of Object.entries(cfg)) {
    if (!k.startsWith("SECTION_")) continue;
    const name = String(v || "");
    const price = Number(cfg[`${k}_PRICE`] ?? 0);
    if (!name || !price) continue;
    out.push({ name, price });
  }

  return out;
}

// ---- command ---------------------------------------------------------------

export default {
  data: new SlashCommandBuilder()
    .setName("itemshop")
    .setDescription("Show the current item shop from the backend config."),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({ flags: 64 });

    // Read config/shop_config.json
    const shopPath = path.join(process.cwd(), "config", "shop_config.json");
    let cfg: ShopConfig;

    try {
      const raw = fs.readFileSync(shopPath, "utf8");
      cfg = JSON.parse(raw);
    } catch (e) {
      console.error("Failed to read shop_config.json:", e);
      await interaction.editReply("❌ Couldn't read `shop_config.json`.");
      return;
    }

    // Build categories
    const skins = collectCategory(cfg, "SKIN");
    const pickaxes = collectCategory(cfg, "PICKAXE");
    const emotes = collectCategory(cfg, "DANCE");
    const gliders = collectCategory(cfg, "GLIDER");
    const backblings = collectCategory(cfg, "BACKBLING");
    const bundles = collectBundles(cfg);

    const hasAny =
      skins.length ||
      pickaxes.length ||
      emotes.length ||
      gliders.length ||
      backblings.length ||
      bundles.length;

    if (!hasAny) {
      await interaction.editReply("⚠️ The shop appears to be empty.");
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🛒 Current Item Shop")
      .setDescription("From `shop_config.json`")
      .setColor(0x5865f2)
      .setTimestamp();

    const fmt = (id: string, price: number) =>
      `• **${getCosmeticName(id)}** — **${price.toLocaleString()}**`;

    if (skins.length)
      embed.addFields({
        name: "Skins",
        value: skins.map((x) => fmt(x.id, x.price)).join("\n"),
      });

    if (pickaxes.length)
      embed.addFields({
        name: "Pickaxes",
        value: pickaxes.map((x) => fmt(x.id, x.price)).join("\n"),
      });

    if (emotes.length)
      embed.addFields({
        name: "Emotes",
        value: emotes.map((x) => fmt(x.id, x.price)).join("\n"),
      });

    if (gliders.length)
      embed.addFields({
        name: "Gliders",
        value: gliders.map((x) => fmt(x.id, x.price)).join("\n"),
      });

    if (backblings.length)
      embed.addFields({
        name: "Back Blings",
        value: backblings.map((x) => fmt(x.id, x.price)).join("\n"),
      });

    if (bundles.length)
      embed.addFields({
        name: "Bundles",
        value: bundles
          .map(
            (b) => `• **${b.name.replace(/_/g, " ")}** — **${b.price}**`
          )
          .join("\n"),
      });

    await interaction.editReply({ embeds: [embed] });
  },
};
