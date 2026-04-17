import type { CatalogEntry } from "../types/catalog";
import { Log } from "../handling/logging";

const shop = Bun.file("config/shop_config.json");
const config = await shop.json();

let allBundlesConfig: Record<string, any> = {};
try {
  const allBundlesFile = Bun.file("config/allBundles.json");
  if (await allBundlesFile.exists()) {
    allBundlesConfig = await allBundlesFile.json();
  }
} catch {
  console.warn("Could not load allBundles.json, continuing without it");
}

// Import all cosmetics to get proper variants
import allCosmetics from "../../resources/utilities/allcosmetics.json";

const baseCatalogFile = await Bun.file("src/resources/storefront/catalog.json").json();
const baseCatalog = Array.isArray(baseCatalogFile.storefronts)
  ? baseCatalogFile.storefronts
  : [];

const PASSTHROUGH_BASE = false;

type ItemType =
  | "AthenaCharacter"
  | "AthenaPickaxe"
  | "AthenaGlider"
  | "AthenaItemWrap"
  | "AthenaBackpack";

const itemPrefixThingy: Record<string, ItemType> = {
  SKIN: "AthenaCharacter",
  PICKAXE: "AthenaPickaxe",
  GLIDER: "AthenaGlider",
  ITEMWRAP: "AthenaItemWrap",
  BACKBLING: "AthenaBackpack",
};

type VariantGrant = { channel: string; owned: string[]; active?: string };

type ParsedItem = {
  prefix: string;
  number: string;
  id: string;
  type: ItemType;
  price: number;
  section: string;
  variants: VariantGrant[];
};

function normalizeSection(raw?: string): string {
  const section = (raw ?? "Featured").trim() || "Featured";
  return section === "Daily" ? "Daily" : "Featured";
}

function sectionToStorefrontName(section: string): string {
  if (section === "Featured") return "BRWeeklyStorefront";
  if (section === "Daily") return "BRDailyStorefront";
  return `BR${section.replace(/[^A-Za-z0-9]+/g, "")}Storefront`;
}

// ✅ CRITICAL FIX: Ensure all styles are available from allcosmetics.json
function ensureAllStyles(itemId: string, type: ItemType, baseVariants: VariantGrant[]): VariantGrant[] {
  const fullTemplateId = `${type}:${itemId}`;
  const cosmeticData = (allCosmetics as any)[fullTemplateId];
  
  if (!cosmeticData) return baseVariants;
  
  // Get all possible variants from the cosmetic data (same source as giveFullLocker)
  const allPossibleVariants = cosmeticData.attributes?.variants || [];
  
  // If we have comprehensive variant data from allcosmetics.json, use it
  if (allPossibleVariants.length > 0) {
    return allPossibleVariants.map((variant: any) => ({
      channel: variant.channel,
      owned: variant.owned || variant.options || ['Default'],
      active: variant.active || variant.owned?.[0] || 'Default'
    }));
  }
  
  return baseVariants;
}

function createEntry(
  id: string,
  type: ItemType,
  price: number,
  sectionId: string,
  variants?: VariantGrant[]
): CatalogEntry {
  // ✅ FIXED: Define fullTemplateId before using it
  const fullTemplateId = `${type}:${id}`;
  
  const layout =
    sectionId === "Featured"
      ? "Lyric"
      : sectionId === "Daily"
      ? "Daily"
      : "Lyric";
  const analyticId =
    sectionId === "Featured"
      ? "Lyric"
      : sectionId === "Daily"
      ? "DailyCore"
      : "Lyric";

  const fixedVariants =
    variants?.map((v) => ({
      channel: v.channel,
      owned: [...new Set(v.owned)],
      active: v.active ?? v.owned[0] ?? "Default",
    })) ?? [];

  // ✅ CRITICAL FIX: Use ensureAllStyles to get ALL available styles from allcosmetics.json
  const finalVariants = ensureAllStyles(id, type, fixedVariants);

  return {
    devName: fullTemplateId,
    offerId: fullTemplateId,
    fulfillmentIds: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    categories: [],
    prices: [
      {
        currencyType: "MtxCurrency",
        currencySubType: "",
        regularPrice: price,
        finalPrice: price,
        saleExpiration: "9999-12-02T01:12:00Z",
        basePrice: price,
      },
    ],
    meta: {
      NewDisplayAssetPath: "",
      SectionId: sectionId,
      LayoutId: layout,
      TileSize: "Normal",
      AnalyticOfferGroupId: analyticId,
      FirstSeen: "2/2/2020",
    },
    matchFilter: "",
    filterWeight: 0,
    appStoreId: [],
    requirements: [
      {
        requirementType: "DenyOnItemOwnership",
        requiredId: fullTemplateId,
        minQuantity: 1,
      },
    ],
    offerType: "StaticPrice",
    giftInfo: {
      bIsEnabled: true,
      forcedGiftBoxTemplateId: "",
      purchaseRequirements: [],
      giftRecordIds: [],
    },
    refundable: true,
    metaInfo: [
      { key: "NewDisplayAssetPath", value: "=" },
      { key: "SectionId", value: sectionId },
      { key: "LayoutId", value: layout },
      { key: "TileSize", value: "Normal" },
      { key: "AnalyticOfferGroupId", value: analyticId },
      { key: "FirstSeen", value: "2/2/2020" },
      { key: "ShopName", value: "Lyric Shop" }, // ✅ Added Lyric Shop branding
    ],
    displayAssetPath: `/Game/Catalog/DisplayAssets/DA_Featured_${id}.DA_Featured_${id}`,
    itemGrants: [
      {
        templateId: fullTemplateId,
        quantity: 1,
        ...(finalVariants.length > 0
          ? { 
              attributes: { 
                variants: finalVariants,
                item_seen: true 
              } 
            }
          : {}),
      },
    ],
    sortPriority: 0,
    catalogGroupPriority: 0,
  };
}

function createBundleEntry(
  bundleName: string,
  sectionId: string,
  price: number,
  grants: { type: ItemType; id: string; variants?: VariantGrant[] }[],
  displayName: string,
  description: string,
  displayAssetPath: string
): CatalogEntry {
  const fixedGrants = grants.map((g) => {
    const fullTemplateId = `${g.type}:${g.id}`;
    // ✅ CRITICAL FIX: Use ensureAllStyles for bundle items too
    const finalVariants = ensureAllStyles(g.id, g.type, g.variants || []);

    return {
      templateId: fullTemplateId,
      quantity: 1,
      ...(finalVariants.length > 0
        ? {
            attributes: {
              variants: finalVariants.map((v: any) => ({
                channel: v.channel,
                owned: [...new Set(v.owned)],
                active: v.active ?? v.owned[0] ?? "Default",
              })),
              item_seen: true
            },
          }
        : {}),
    };
  });

  return {
    devName: `Bundle:${bundleName}`,
    offerId: `Bundle:${bundleName}`,
    fulfillmentIds: [],
    dailyLimit: -1,
    weeklyLimit: -1,
    monthlyLimit: -1,
    categories: [],
    prices: [
      {
        currencyType: "MtxCurrency",
        currencySubType: "",
        regularPrice: price,
        finalPrice: price,
        saleExpiration: "9999-12-02T01:12:00Z",
        basePrice: price,
      },
    ],
    meta: {
      NewDisplayAssetPath: displayAssetPath,
      SectionId: sectionId,
      LayoutId: "Normal",
      TileSize: "Normal",
      AnalyticOfferGroupId: "StaticMtx",
      FirstSeen: "2/2/2020",
    },
    matchFilter: "",
    filterWeight: 0,
    appStoreId: [],
    requirements: grants.map((g) => ({
      requirementType: "DenyOnItemOwnership",
      requiredId: `${g.type}:${g.id}`,
      minQuantity: 1,
    })),
    offerType: "StaticPrice",
    giftInfo: {
      bIsEnabled: true,
      forcedGiftBoxTemplateId: "",
      purchaseRequirements: [],
      giftRecordIds: [],
    },
    refundable: true,
    metaInfo: [
      { key: "NewDisplayAssetPath", value: displayAssetPath },
      { key: "SectionId", value: sectionId },
      { key: "LayoutId", value: "Normal" },
      { key: "TileSize", value: "Normal" },
      { key: "AnalyticOfferGroupId", value: "StaticMtx" },
      { key: "FirstSeen", value: "2/2/2020" },
      { key: "DisplayName", value: displayName },
      { key: "ShortDescription", value: description },
      { key: "BannerOverride", value: displayAssetPath },
      { key: "bIsBundle", value: "true" },
      { key: "BundleName", value: bundleName },
      { key: "ShopName", value: "Lyric Shop" }, // ✅ Added Lyric Shop branding
    ],
    displayAssetPath,
    itemGrants: fixedGrants,
    sortPriority: -1,
    catalogGroupPriority: 1,
  };
}

const UPPER_KEY = /^([A-Z]+)(\d*)$/;
const STYLE_KEY = /^([A-Z]+)(\d*)_STYLE_(.+)$/;

function parseSingles(): ParsedItem[] {
  const itemsByKey = new Map<string, ParsedItem>();
  for (const rawKey in config) {
    if (rawKey.startsWith("BUNDLE_")) continue;

    const sm = rawKey.match(STYLE_KEY);
    if (sm) {
      const [, prefix, number, channelRaw = "Default"] = sm;
      const baseKey = `${prefix}${number}`;
      const id = String(config[baseKey] ?? "");
      const type = prefix ? itemPrefixThingy[prefix] : undefined;
      if (!id || !type) continue;

      const optionsRaw = String(config[rawKey] ?? "");
      const owned = optionsRaw
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (owned.length === 0) continue;

      const channel = channelRaw.trim();
      const priceKey = `${baseKey}_PRICE`;
      const sectionKey = `${baseKey}_SECTION`;
      const price =
        typeof config?.[priceKey] === "number" ? (config[priceKey] as number) : 0;
      const section = normalizeSection(
        typeof config?.[sectionKey] === "string"
          ? (config[sectionKey] as string)
          : undefined
      );

      const prev = itemsByKey.get(baseKey);
      const variants: VariantGrant[] = prev?.variants ?? [];
      const existing = variants.find((v) => v.channel === channel);

      if (existing) {
        const merged = Array.from(new Set([...existing.owned, ...owned]));
        existing.owned = merged;
        if (!existing.active && merged.length) existing.active = merged[0];
      } else {
        variants.push({ channel, owned, active: owned[0] ?? "Default" });
      }

      itemsByKey.set(baseKey, {
        prefix : prefix ?? "",
        number: number ?? "",
        id,
        type,
        price: prev?.price ?? price,
        section: prev?.section ?? section,
        variants,
      });
      continue;
    }

    const m = rawKey.match(UPPER_KEY);
    if (!m) continue;

    const prefix = m[1] ?? "";
    const number = m[2] ?? "";
    const type = itemPrefixThingy[prefix];
    if (!type) continue;

    if (rawKey.endsWith("_PRICE") || rawKey.endsWith("_SECTION")) continue;

    const baseKey = `${prefix}${number}`;
    const id = String(config[baseKey] ?? "");
    if (!id) continue;

    const priceKey = `${baseKey}_PRICE`;
    const sectionKey = `${baseKey}_SECTION`;
    const price =
      typeof config?.[priceKey] === "number" ? (config[priceKey] as number) : 0;
    const section = normalizeSection(
      typeof config?.[sectionKey] === "string"
        ? (config[sectionKey] as string)
        : undefined
    );
    const prev = itemsByKey.get(baseKey);

    itemsByKey.set(baseKey, {
      prefix,
      number,
      id,
      type,
      price: prev?.price ?? price,
      section: prev?.section ?? section,
      variants: prev?.variants ?? [],
    });
  }
  return Array.from(itemsByKey.values());
}

function parseBundles(singles: ParsedItem[]) {
  const singleIndex = new Map<string, ParsedItem>();
  singles.forEach((it) => singleIndex.set(`${it.prefix}${it.number}`, it));

  const bundles: {
    name: string;
    section: string;
    price: number;
    grants: { type: ItemType; id: string; variants?: VariantGrant[] }[];
    displayName: string;
    description: string;
    displayAssetPath: string;
  }[] = [];

  for (const [bundleName, bundleData] of Object.entries(allBundlesConfig)) {
    if (typeof bundleData !== "object" || bundleData === null) continue;
    const bundle = bundleData as any;
    const items = bundle.items || [];
    const section = normalizeSection(bundle.section || "Featured");
    const price = bundle.price || 0;
    const displayName = bundle.displayName || `Bundle: ${bundleName}`;
    const description = bundle.description || `The ${bundleName} Bundle`;
    const displayAssetPath =
      bundle.displayAsset ||
      `/Game/Catalog/DisplayAssets/DA_Featured_${bundleName}.DA_Featured_${bundleName}`;

    const grants: { type: ItemType; id: string; variants?: VariantGrant[] }[] =
      [];

    for (const itemId of items) {
      let foundItem: ParsedItem | undefined;
      for (const single of singles) {
        if (single.id === itemId) {
          foundItem = single;
          break;
        }
      }
      if (foundItem) {
        grants.push({
          type: foundItem.type,
          id: foundItem.id,
          variants: foundItem.variants.length > 0 ? foundItem.variants : undefined,
        });
      } else {
        console.warn(`Could not find item ${itemId} for bundle ${bundleName}`);
      }
    }

    if (grants.length > 0) {
      bundles.push({
        name: bundleName,
        section,
        price,
        grants,
        displayName,
        description,
        displayAssetPath,
      });
    }
  }
  return bundles;
}

export function createCatalog() {
  console.log("🛒 Creating Lyric Shop catalog...");
  
  const singlesParsed = parseSingles();
  const bundles = parseBundles(singlesParsed);

  console.log(`📊 Found ${singlesParsed.length} single items and ${bundles.length} bundles`);

  const buckets = new Map<string, { singles: CatalogEntry[]; bundles: CatalogEntry[] }>();
  const ensureBucket = (section: string) => {
    const s = normalizeSection(section);
    if (!buckets.has(s)) buckets.set(s, { singles: [], bundles: [] });
    return buckets.get(s)!;
  };

  for (const s of singlesParsed) {
    const section = normalizeSection(s.section);
    const entry = createEntry(
      s.id,
      s.type,
      s.price,
      section,
      s.variants.length > 0 ? s.variants : undefined
    );
    ensureBucket(section).singles.push(entry);
  }

  for (const b of bundles) {
    const section = normalizeSection(b.section);
    const entry = createBundleEntry(
      b.name,
      section,
      b.price,
      b.grants,
      b.displayName,
      b.description,
      b.displayAssetPath
    );
    ensureBucket(section).bundles.push(entry);
  }

  // Force order: Featured first, then Daily
  const finalSectionOrder = ["Featured", "Daily"];

  const storefrontsBuilt = finalSectionOrder
    .map((section) => {
      const bucket = buckets.get(section) ?? { singles: [], bundles: [] };
      const combined = [...bucket.singles, ...bucket.bundles];

      combined.sort((a, b) => {
        const aIsBundle = a.offerId?.startsWith("Bundle:");
        const bIsBundle = b.offerId?.startsWith("Bundle:");
        if (aIsBundle && !bIsBundle) return -1;
        if (!aIsBundle && bIsBundle) return 1;
        return a.devName.localeCompare(b.devName);
      });

      const seen = new Set<string>();
      const deduped = combined.filter((e) => {
        const key = e.offerId ?? e.devName;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      return {
        name: sectionToStorefrontName(section),
        catalogEntries: deduped,
      };
    })
    .filter((s) => s.catalogEntries.length > 0);

  let finalStorefronts = storefrontsBuilt;
  if (PASSTHROUGH_BASE) {
    const reserved = new Set(storefrontsBuilt.map((s) => s.name));
    const passthrough = baseCatalog.filter((s: any) => !reserved.has(s.name));
    finalStorefronts = [...storefrontsBuilt, ...passthrough];
  }

  const catalog = {
    refreshIntervalHrs: 24,
    dailyPurchaseHrs: 24,
    expiration: "9999-12-31T00:00:00.000Z",
    storefronts: finalStorefronts,
  };

  console.log(`✅ Lyric Shop catalog created with ${finalStorefronts.length} storefronts`);
  console.log(`📦 Total items: ${finalStorefronts.reduce((acc, s) => acc + s.catalogEntries.length, 0)}`);
  
  return catalog;
}

export async function createSection() {
  // Only Featured and Daily sections with proper configuration
  const mainSections = [
    {
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 100, // Highest priority - appears first
      bHidden: false,
      sectionId: "Featured",
      bShowTimer: true,
      sectionDisplayName: "Lyric Featured", // ✅ Lyric branding
      bShowIneligibleOffers: true,
    },
    {
      bSortOffersByOwnership: false,
      bShowIneligibleOffersIfGiftable: false,
      bEnableToastNotification: true,
      background: {
        stage: "default",
        _type: "DynamicBackground",
        key: "vault",
      },
      _type: "ShopSection",
      landingPriority: 50, // Lower priority - appears second
      bHidden: false,
      sectionId: "Daily",
      bShowTimer: false,
      sectionDisplayName: "Lyric Daily", // ✅ Lyric branding
      bShowIneligibleOffers: true,
    },
  ];

  const now = new Date().toISOString();
  return {
    shopSections: {
      _title: "shop-sections",
      sectionList: {
        _type: "ShopSectionList",
        sections: mainSections,
      },
      _noIndex: false,
      _activeDate: now,
      lastModified: now,
      _locale: "en-US",
      _templateName: "FortniteGameShopSections",
    },
  };
}