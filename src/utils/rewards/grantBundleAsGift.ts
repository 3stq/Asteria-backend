// src/utils/rewards/grantBundleAsGift.ts
import { randomUUID } from "crypto";
import Profiles from "../../db/models/Profiles";
import allCosmetics from "../../resources/utilities/allcosmetics.json";

/**
 * Ensure the item exists in athena.items with sane default attributes.
 * (Also injects variants from allCosmetics when available so styles are usable.)
 */
function upsertItemWithDefaults(athena: any, templateId: string) {
  athena.items ??= {};
  if (!athena.items[templateId]) {
    const variants =
      (allCosmetics as any)[templateId]?.attributes?.variants ??
      (allCosmetics as any)[templateId]?.variants ??
      [];

    athena.items[templateId] = {
      templateId,
      attributes: {
        max_level_bonus: 0,
        level: 1,
        item_seen: false,
        xp: 0,
        favorite: false,
        variants,
      },
      quantity: 1,
    };
  }
}

/**
 * Grant a bundle as a *GiftBox* so the user gets the carousel with your custom message.
 *
 * @param accountId   Target accountId
 * @param templateIds Array of full templateIds (e.g. "AthenaCharacter:CID_029_Athena_Commando_F_Halloween")
 * @param opts        Optional sender name / message / specific gift template
 */
export async function grantBundleAsGift(
  accountId: string,
  templateIds: string[],
  opts?: {
    senderName?: string;         // shown as "from"
    message?: string;            // text in the blue center banner
    giftTemplateId?: string;     // e.g. "GiftBox:gb_default" / "GiftBox:gb_shop"
  }
) {
  const doc = await Profiles.findOne({ accountId });
  if (!doc) throw new Error("Profile not found");
  const athena = doc.profiles?.["athena"];
  if (!athena) throw new Error("Athena profile missing");

  // Make sure each item exists so the UI can mark it NEW and show style options
  for (const tid of templateIds) upsertItemWithDefaults(athena, tid);

  // Choose a common gift template that supports userMessage
  const giftTemplateId = opts?.giftTemplateId ?? "GiftBox:gb_default";
  const giftGuid = `GiftBox:${randomUUID()}`;

  // Keep message short & plain; some builds truncate/strip unicode
  const msg = (opts?.message ?? "").toString().slice(0, 140);

  // Build loot list that the carousel will display
  const lootList = templateIds.map((tid) => ({
    itemType: tid,
    itemGuid: tid,
    itemProfile: "athena",
    quantity: 1,
  }));

  // Write fields that different FN builds read:
  // - params.userMessage & params.subTitle (newer)
  // - userMessage (legacy alias)
  // - level on the gift (some UIs expect it)
  athena.items[giftGuid] = {
    templateId: giftTemplateId,
    attributes: {
      fromAccountId: opts?.senderName ?? "Epic Games",
      level: 1,
      lootList,
      params: {
        userMessage: msg,
        subTitle: msg,
      },
      userMessage: msg,
    },
    quantity: 1,
  };

  await Profiles.updateOne(
    { accountId },
    {
      $set: {
        "profiles.athena.items": athena.items,
      },
    }
  );
}

export default grantBundleAsGift;