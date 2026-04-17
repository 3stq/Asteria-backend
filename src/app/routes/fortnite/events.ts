import app from "../../..";
import Tournaments from "../../../db/models/Tournaments";
import User from "../../../db/models/User";
import { getVersion } from "../../../utils/handling/getVersion";

export default function () {
    app.get("/api/v1/events/Fortnite/download/:accountId", async (c) => {
        const ver = await getVersion(c);
        if (!ver) return c.json({ error: "Incorrect HTTP Method" });
        const user = await User.findOne({ accountId: c.req.param("accountId") });
        if (!user) return c.json([], 404);

        const tournament = await Tournaments.findOne({ accountId: user.accountId });
        if (!tournament) return c.json([], 404);

        const hypeName = "NormalHype";
        const event: any = await Bun.file("src/resources/events/event.json").json();

        event.player.accountId = tournament.accountId;
        event.player.persistentScores = { [hypeName]: tournament.hype };
        event.player.tokens = tournament.divisions;

        console.log(event);
        return c.json(event);
    });
}