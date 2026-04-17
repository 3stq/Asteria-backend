import app from "../../..";
import Profiles from "../../../db/models/Profiles";
import { applyProfileChanges } from "../../../utils/handling/applyProfileChanges";

export default function () {
    app.post(
        "/fortnite/api/game/v2/profile/:accountId/client/EquipBattleRoyaleCustomization",
        async (c) => {
            try {
                const profileId = c.req.query("profileId") ?? "athena";

                const body: {
                    itemToSlot: string;
                    slotName: keyof typeof mainSlots | "Dance" | "ItemWrap";
                    indexWithinSlot?: number;
                    applyToAll?: boolean | string;
                    variantUpdates?: Array<{
                        channel: string;
                        active: any;
                        owned?: any[];
                    }>;
                } = await c.req.json();

                const profiles: any = await Profiles.findOne({
                    accountId: c.req.param("accountId"),
                });

                if (!profiles || !profiles.profiles[profileId] || !body) {
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

                const profile = profiles.profiles[profileId];
                const { itemToSlot, slotName, variantUpdates, indexWithinSlot } = body;
                const applyToAll = String(body.applyToAll).toLowerCase() === "true";
                let ApplyProfileChanges: any[] = [];

                const mainSlots: { [key: string]: string } = {
                    Character: "favorite_character",
                    Backpack: "favorite_backpack",
                    Pickaxe: "favorite_pickaxe",
                    Glider: "favorite_glider",
                    SkyDiveContrail: "favorite_skydivecontrail",
                    LoadingScreen: "favorite_loadingscreen",
                    MusicPack: "favorite_musicpack",
                };

                const slotKey = mainSlots[slotName as keyof typeof mainSlots];
                if (slotKey) {
                    profile.stats.attributes[slotKey] = itemToSlot;
                    ApplyProfileChanges.push({
                        changeType: "statModified",
                        name: slotKey,
                        value: itemToSlot,
                    });
                }

                const isDance = slotName === "Dance";
                const isWrap = slotName === "ItemWrap";
                const cosmeticSlot = isDance ? "favorite_dance" : isWrap ? "favorite_itemwraps" : null;

                if (cosmeticSlot) {
                    let items: string[] = profile.stats.attributes[cosmeticSlot] || [];
                    const totalSlots = isDance ? 6 : 7;

                    if (!Array.isArray(items) || items.length !== totalSlots) {
                        items = Array(totalSlots).fill("");
                    }

                    if (applyToAll) {
                        items = Array(totalSlots).fill(itemToSlot);
                    } else if (
                        typeof indexWithinSlot === "number" &&
                        indexWithinSlot >= 0 &&
                        indexWithinSlot < totalSlots
                    ) {
                        items[indexWithinSlot] = itemToSlot;
                    }

                    profile.stats.attributes[cosmeticSlot] = items;
                    ApplyProfileChanges.push({
                        changeType: "statModified",
                        name: cosmeticSlot,
                        value: items,
                    });
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

                const response = await applyProfileChanges(profile, profileId, profiles);
                return c.json(response);
            } catch (error) {
                console.error(error);
            }
        }
    );
}