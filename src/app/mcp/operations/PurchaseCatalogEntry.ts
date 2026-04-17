import app from "../../..";
import Profiles from "../../../db/models/Profiles";
import { v4 as uuiv4 } from "uuid";
import path from "path";

// Import the allcosmetics.json to get proper variants
import allCosmetics from "../../../resources/utilities/allcosmetics.json";

export default function () {
    app.post(
        "/fortnite/api/game/v2/profile/:accountId/client/PurchaseCatalogEntry",
        async (c) => {
            const { profileId, rvn } = c.req.query();
            const profiles = await Profiles.findOne({
                accountId: c.req.param("accountId"),
            });

            const profile = profiles?.profiles["athena"];
            const common_core = profiles?.profiles["common_core"];

            if (!profile || !profiles || !common_core) {
                return c.json({
                    profileRevision: 0,
                    profileId,
                    profileChangesBaseRevision: 0,
                    profileChanges: [],
                    profileCommandRevision: 0,
                    serverTime: new Date().toISOString(),
                    multiUpdate: [],
                    responseVersion: 1,
                });
            }

            const BaseRevision = profile.rvn;
            const MultiUpdate: object[] = [];
            const notification: any[] = [];

            let shouldUpdateProfile = false;

            const body = await c.req.json();
            const { offerId, currency, purchaseQuantity } = body;

            if (!process.env.ENABLE_SHOP) {
                return c.json({
                    profileRevision: 0,
                    profileId,
                    profileChangesBaseRevision: 0,
                    profileChanges: [],
                    profileCommandRevision: 0,
                    serverTime: new Date().toISOString(),
                    multiUpdate: [],
                    responseVersion: 1,
                });
            }

            if (!offerId || !currency || !purchaseQuantity || purchaseQuantity < 1) {
                return c.json({
                    error: "Invalid offerId, currency, or purchaseQuantity",
                });
            }

            const catalog = await Bun.file(
                path.join(__dirname, "..", "..", "..", "resources", "storefront", "catalog.json")
            ).json();

            let owned = false;
            const grantedItems: {
                itemType: string;
                itemGuid: string;
                itemProfile: string;
                quantity: number;
            }[] = [];

            if (offerId.includes("Athena")) {
                let activeEntry = null;
                for (const section of catalog.storefronts) {
                    const match = section.catalogEntries.find(
                        (entry: any) => entry.offerId === offerId
                    );
                    if (match) {
                        activeEntry = match;
                        break;
                    }
                }

                if (!activeEntry) {
                    return c.json({ error: "Invalid offerId" });
                }

                const finalPrice = activeEntry.prices[0]?.finalPrice ?? 0;

                if (!common_core.items["Currency:MtxPurchased"]) {
                    common_core.items["Currency:MtxPurchased"] = {
                        templateId: "Currency:MtxPurchased",
                        attributes: {},
                        quantity: 0,
                    };
                }

                const currentBalance = common_core.items["Currency:MtxPurchased"].quantity;

                if (!owned && finalPrice > currentBalance) {
                    return c.json({
                        error: "You do not have enough currency to purchase this item.",
                    });
                }

                const alreadyOwned = activeEntry.itemGrants.some((item: any) =>
                    Object.values(profile.items).some(
                        (existing: any) =>
                            existing?.templateId &&
                            existing.templateId.toLowerCase() === item.templateId.toLowerCase()
                    )
                );

                if (alreadyOwned) {
                    return c.json({ error: "You already own this item." });
                }

                for (const grant of activeEntry.itemGrants) {
                    const itemGuid = uuiv4();
                    const itemType = grant.templateId;
                    const quantity = grant.quantity;

                    // ✅ CRITICAL FIX: Get variants from BOTH catalog entry AND allcosmetics.json
                    const catalogVariants = grant.attributes?.variants || [];
                    const cosmeticFromAllCosmetics = (allCosmetics as any)[itemType];
                    const allCosmeticsVariants = cosmeticFromAllCosmetics?.attributes?.variants || [];
                    
                    // ✅ Merge variants from both sources to ensure all styles are included
                    const mergedVariants = [...catalogVariants];
                    allCosmeticsVariants.forEach((cosmeticVariant: any) => {
                        const existingIndex = mergedVariants.findIndex(v => v.channel === cosmeticVariant.channel);
                        if (existingIndex >= 0) {
                            // Merge owned styles from both sources
                            const mergedOwned = [...new Set([
                                ...mergedVariants[existingIndex].owned,
                                ...(cosmeticVariant.owned || [])
                            ])];
                            mergedVariants[existingIndex].owned = mergedOwned;
                        } else {
                            mergedVariants.push(cosmeticVariant);
                        }
                    });

                    // ✅ Get other attributes from allcosmetics.json if available
                    const cosmeticAttributes = cosmeticFromAllCosmetics?.attributes || {};

                    const item = {
                        templateId: itemType,
                        attributes: {
                            level: 1,
                            item_seen: true, // ✅ Set to true so items appear as "seen"
                            xp: 0,
                            variants: mergedVariants.length > 0 ? mergedVariants : undefined, // ✅ Now includes ALL styles!
                            favorite: false,
                            ...cosmeticAttributes, // ✅ Include other attributes if available
                        },
                        quantity,
                    };

                    profile.items[itemGuid] = item;

                    MultiUpdate.push({
                        changeType: "itemAdded",
                        itemId: itemGuid,
                        item,
                    });

                    grantedItems.push({
                        itemType,
                        itemGuid,
                        itemProfile: "athena",
                        quantity,
                    });

                    console.log(`🎁 Purchased ${itemType} with styles:`, 
                        mergedVariants.map(v => `${v.channel}: [${v.owned.join(', ')}]`).join(' | '));
                }

                common_core.items["Currency:MtxPurchased"].quantity -= finalPrice;

                // ✅ Initialize purchase history if missing
                if (!common_core.stats.attributes.mtx_purchase_history) {
                    common_core.stats.attributes.mtx_purchase_history = {
                        purchases: [],
                    };
                }

                const purchase = {
                    purchaseId: uuiv4(),
                    offerId: `v2:/${offerId}`,
                    purchaseDate: new Date().toISOString(),
                    undoTimeout: "9999-12-12T00:00:00.000Z",
                    freeRefundEligible: false,
                    fulfillments: [],
                    lootResult: grantedItems,
                    totalMtxPaid: finalPrice,
                    metadata: {},
                    gameContext: "",
                };

                common_core.stats.attributes.mtx_purchase_history.purchases.push(purchase);

                notification.push({
                    type: "CatalogPurchase",
                    primary: true,
                    lootResult: {
                        items: grantedItems,
                    },
                });

                owned = true;
                shouldUpdateProfile = true;
            }

            if (shouldUpdateProfile) {
                profile.rvn += 1;
                profile.commandRevision += 1;
                profile.updated = new Date().toISOString();

                common_core.rvn += 1;
                common_core.commandRevision += 1;
                common_core.updated = new Date().toISOString();

                await profiles.updateOne({
                    $set: {
                        [`profiles.athena`]: profile,
                        [`profiles.common_core`]: common_core,
                    },
                });
            }

            const ApplyProfileChanges = [
                {
                    changeType: "itemQuantityChanged",
                    itemId: "Currency:MtxPurchased",
                    quantity: common_core.items["Currency:MtxPurchased"].quantity,
                },
            ];

            return c.json({
                profileRevision: common_core.rvn,
                profileId,
                profileChangesBaseRevision: BaseRevision,
                profileChanges: ApplyProfileChanges,
                notifications: notification,
                profileCommandRevision: common_core.commandRevision,
                serverTime: new Date().toISOString(),
                multiUpdate: [
                    {
                        profileRevision: profile.rvn,
                        profileId: "athena",
                        profileChangesBaseRevision: profile.rvn - 1,
                        profileChanges: [
                            ...MultiUpdate,
                            {
                                changeType: "itemQuantityChanged",
                                itemId: "Currency:MtxPurchased",
                                quantity: common_core.items["Currency:MtxPurchased"].quantity,
                            },
                        ],
                        profileCommandRevision: profile.commandRevision,
                    },
                    {
                        profileRevision: common_core.rvn,
                        profileId: "common_core",
                        profileChangesBaseRevision: common_core.rvn - 1,
                        profileChanges: ApplyProfileChanges,
                        profileCommandRevision: common_core.commandRevision,
                    },
                ],
                responseVersion: 1,
            });
        }
    );
}