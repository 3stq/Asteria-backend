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

export async function giveCosmetic(discordId: string, cosmeticId: string) {
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

    if (athena.items[resolvedKey]) {
        return { success: false, message: "User already owns this cosmetic." };
    }

    // Inject the item
    athena.items[resolvedKey] = {
        templateId: resolvedKey,
        attributes: {
            max_level_bonus: 0,
            level: 1,
            item_seen: true,
            xp: 0,
            variants: [],
            favorite: false
        },
        quantity: 1
    };

    // Inject into locker slot (basic slot2 example)
    athena.stats.attributes.locker_slots = athena.stats.attributes.locker_slots || {};
    athena.stats.attributes.locker_slots.slot2 = {
        items: [resolvedKey],
        activeVariants: [],
        slotIndex: 2
    };

    await profileDoc.updateOne({
        $set: {
            [`profiles.athena.items.${resolvedKey}`]: athena.items[resolvedKey],
            "profiles.athena.stats.attributes.locker_slots.slot2": athena.stats.attributes.locker_slots.slot2
        }
    });

    return { success: true };
}