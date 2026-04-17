import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";

export type VbucksAction = "add" | "remove" | "set";

interface MutationResult {
    success: boolean;
    message?: string;
    newTotal?: number;
}

export const mutateVbucks = async (
    discordId: string,
    amount: number,
    action: VbucksAction
): Promise<MutationResult> => {
    const user = await User.findOne({ discordId });
    if (!user) return { success: false, message: "User not found." };

    const profileDoc = await Profiles.findOne({ accountId: user.accountId });
    if (!profileDoc) return { success: false, message: "Profile not found." };

    const commonCore = profileDoc.profiles?.common_core;
    if (!commonCore || typeof commonCore.items !== "object") {
        return { success: false, message: "common_core profile missing or malformed." };
    }

    const itemId = Object.keys(commonCore.items).find(
        id => commonCore.items[id].templateId === "Currency:MtxPurchased"
    );
    if (!itemId) return { success: false, message: "V-Bucks item not found." };

    const current = commonCore.items[itemId].quantity || 0;

    let newTotal = current;

    if (action === "add") {
        newTotal += amount;
    } else if (action === "remove") {
        if (amount > current) {
            return {
                success: false,
                message: `User only has ${current} V-Bucks. Cannot remove ${amount}.`,
            };
        }
        newTotal -= amount;
    } else if (action === "set") {
        newTotal = amount;
    }

    await Profiles.updateOne(
        { accountId: user.accountId },
        { $set: { [`profiles.common_core.items.${itemId}.quantity`]: newTotal } }
    );

    return { success: true, newTotal };
};