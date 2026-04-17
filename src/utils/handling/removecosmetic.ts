import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import allCosmeticsRaw from "../../resources/utilities/allCosmetics.json";

// Reverse lookup: find cosmetic key by templateId or suffix match
function resolveCosmeticKey(inputId: string): string | null {
    for (const [key, data] of Object.entries(allCosmeticsRaw)) {
        if (
            data.templateId === inputId ||
            data.templateId.endsWith(inputId) ||
            key === inputId ||
            key.endsWith(inputId)
        ) {
            return key;
        }
    }
    return null;
}

export async function removeCosmetic(discordId: string, cosmeticId: string) {
    const resolvedKey = resolveCosmeticKey(cosmeticId);
    if (!resolvedKey) {
        return { success: false, message: `Invalid cosmetic ID: ${cosmeticId}` };
    }

    const user = await User.findOne({ discordId });
    if (!user) {
        return { success: false, message: "User not found." };
    }

    const profileDoc = await Profiles.findOne({ accountId: user.accountId });
    if (!profileDoc) {
        return { success: false, message: "Profile not found." };
    }

    const athena = profileDoc.profiles?.athena;
    if (!athena || typeof athena.items !== "object") {
        return { success: false, message: "Athena profile missing or malformed." };
    }

    // Find the actual item key by matching templateId
    const itemKey = Object.keys(athena.items).find(
        key => athena.items[key].templateId === resolvedKey
    );

    if (!itemKey) {
        return { success: false, message: "User does not own this cosmetic." };
    }

    // Remove from items
    delete athena.items[itemKey];

    // Remove from locker slots
    const lockerSlots = athena.stats.attributes.locker_slots || {};
    for (const [slotName, slotDataRaw] of Object.entries(lockerSlots)) {
        const slotData = slotDataRaw as { items?: string[] };
        if (Array.isArray(slotData.items)) {
            slotData.items = slotData.items.filter((id: string) => id !== itemKey);
        }
    }

    await profileDoc.updateOne({
        $unset: {
            [`profiles.athena.items.${itemKey}`]: "",
        },
        $set: {
            "profiles.athena.stats.attributes.locker_slots": lockerSlots,
        },
    });

    return { success: true };
}