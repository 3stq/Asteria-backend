import app from "../../..";
import Profiles from "../../../db/models/Profiles";

export default function () {
    app.post(
        "/fortnite/api/game/v2/profile/:accountId/client/SetCosmeticLockerSlot",
        async (c) => {
            try {
                const profileId = c.req.query("profileId") ?? "athena";

                const profiles: any = await Profiles.findOne({
                    accountId: c.req.param("accountId"),
                });
                const profile = profiles?.profiles[profileId];
                if (!profile || !profiles) {
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
                const MultiUpdate: any = [];
                let ApplyProfileChanges: any = [];

                const body = await c.req.json();
                let { lockerItem, category, itemToSlot, slotIndex, applyToAll, variantUpdates } = body;

                lockerItem = profile.items[lockerItem];
                const slots = lockerItem.attributes.locker_slots_data.slots;

                switch (category) {
                    case "Character":
                    case "Pickaxe":
                    case "Glider":
                    case "Backpack":
                    case "LoadingScreen":
                    case "MusicPack":
                    case "SkyDiveContrail":
                        slots[category].items = [itemToSlot];
                        break;

                    case "Dance":
                        if (
                            Array.isArray(slots.Dance.items) &&
                            typeof slotIndex === "number" &&
                            slotIndex >= 0 &&
                            slotIndex < slots.Dance.items.length
                        ) {
                            slots.Dance.items[slotIndex] = itemToSlot;
                        }
                        break;

                    case "ItemWrap":
                        if (!Array.isArray(slots.ItemWrap.items)) {
                            slots.ItemWrap.items = Array(7).fill("");
                        }

                        const applyAllWraps = String(applyToAll).toLowerCase() === "true";

                        if (applyAllWraps) {
                            slots.ItemWrap.items = Array(7).fill(itemToSlot);
                        } else if (
                            typeof slotIndex === "number" &&
                            slotIndex >= 0 &&
                            slotIndex < 7
                        ) {
                            slots.ItemWrap.items[slotIndex] = itemToSlot;
                        }
                        break;
                }

                if (itemToSlot.length === 0) {
                    slots[category].items = [""];
                }

                if (Array.isArray(variantUpdates)) {
                    profile.items[itemToSlot] = profile.items[itemToSlot] || {
                        attributes: { variants: [] },
                    };

                    variantUpdates.forEach((variant: { channel: string; active: any; owned?: any[] }) => {
                        if (variant.channel && variant.active) {
                            const variants = profile.items[itemToSlot].attributes.variants;
                            const index = variants.findIndex((x: { channel: string }) => x.channel === variant.channel);
                            if (index === -1) {
                                variants.push(variant);
                            } else {
                                variants[index].active = variant.active;
                            }
                        }
                    });

                    ApplyProfileChanges.push({
                        changeType: "itemAttrChanged",
                        itemId: itemToSlot,
                        attributeName: "variants",
                        attributeValue: profile.items[itemToSlot].attributes.variants,
                    });
                }

                profile.rvn += 1;
                profile.commandRevision += 1;
                profile.updated = new Date().toISOString();

                ApplyProfileChanges = [
                    {
                        changeType: "fullProfileUpdate",
                        profile,
                    },
                ];

                await profiles.updateOne({
                    $set: { [`profiles.${profileId}`]: profile },
                });

                return c.json({
                    profileRevision: profile.rvn,
                    profileId,
                    profileChangesBaseRevision: BaseRevision,
                    profileChanges: ApplyProfileChanges,
                    profileCommandRevision: profile.rvn,
                    serverTime: new Date().toISOString(),
                    multiUpdate: MultiUpdate,
                    responseVersion: 1,
                });
            } catch (error) {
                console.error(error);
            }
        }
    );
}