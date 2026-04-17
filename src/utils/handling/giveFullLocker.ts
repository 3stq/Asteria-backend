import Profiles from "../../db/models/Profiles";
import allCosmetics from "../../resources/utilities/allcosmetics.json";

// FNCS 2.0 cosmetics to exclude
const EXCLUDED_COSMETICS = [
  "AthenaPickaxe:Pickaxe_ID_804_FNCSS20Male"
];

export async function giveFullLocker(accountId: string, excludedItems: string[] = EXCLUDED_COSMETICS) {
  const profiles = await Profiles.findOne({ accountId });
  if (!profiles) throw new Error(`Profile not found for accountId: ${accountId}`);

  const profile = profiles.profiles["athena"];
  profile.items ??= {};

  let itemsAdded = 0;
  let itemsExcluded = 0;

  // Add all cosmetics except excluded ones
  for (const [cosmeticId, cosmeticData] of Object.entries(allCosmetics)) {
    // Skip if this is an excluded cosmetic
    if (excludedItems.includes(cosmeticId)) {
      itemsExcluded++;
      continue;
    }

    // Only add if user doesn't already have it
    if (!profile.items[cosmeticId]) {
      // Deep copy to avoid references
      profile.items[cosmeticId] = JSON.parse(JSON.stringify(cosmeticData));
      // Mark as seen to true
      profile.items[cosmeticId].attributes.item_seen = true;
      itemsAdded++;
    }
  }

  console.log(`🎁 Full locker granted to ${accountId}: ${itemsAdded} items added, ${itemsExcluded} items excluded`);

  await profiles.updateOne({
    $set: { "profiles.athena.items": profile.items },
  });

  return { itemsAdded, itemsExcluded };
}