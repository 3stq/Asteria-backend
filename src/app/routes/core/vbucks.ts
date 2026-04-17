import { Hono } from "hono";
import User from "../../../db/models/User";
import Profiles from "../../../db/models/Profiles";

export default function (app: Hono) {
    app.get("/sessions/api/v1/vbucks/:identifier/:event", async (c) => {
        const identifier = decodeURIComponent(c.req.param("identifier")); // Decode URL-encoded usernames
        const event = c.req.param("event");

        const rewardMap: Record<string, number> = {
            Kill: 50,
            Win: 250,
        };

        const vbucksAmount = rewardMap[event];
        if (!vbucksAmount) return c.text("Invalid event type", 400);

        // Try find by accountId first, then fallback to username
        let user = await User.findOne({ accountId: identifier });
        if (!user) {
            user = await User.findOne({ username: identifier });
        }
        if (!user) return c.text("User not found!", 404);

        const profiles = await Profiles.findOne({ accountId: user.accountId });
        if (!profiles) return c.text("Profile not found!", 404);

        const profile = profiles.profiles["common_core"];
        if (!profile) return c.text("common_core profile missing!", 500);

        const currency = profile.items["Currency:MtxPurchased"];
        if (!currency) return c.text("Currency item missing!", 500);

        currency.quantity += vbucksAmount;

        await Profiles.updateOne(
            { accountId: user.accountId },
            { $set: { "profiles.common_core": profile } }
        );

        return c.text(`Granted ${vbucksAmount} V-Bucks for ${event}`);
    });
}