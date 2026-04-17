import app from "../../..";
import User from "../../../db/models/User";
import Tournaments from "../../../db/models/Tournaments";

const HYPE_AMOUNTS = [
  400, 800, 1500, 2000, 3500, 4500, 7500, 9000, 12000, 20000,
] as const;

function computeDivision(hype: number) {
  let division = 0;
  for (let i = 0; i < HYPE_AMOUNTS.length; i++) {
    if (hype >= HYPE_AMOUNTS[i]) {
      division = i + 1;
    }
  }
  return division;
}

export default function () {
  app.get("/sessions/api/v1/hype/:identifier/:reason", async (c) => {
    const identifier = decodeURIComponent(c.req.param("identifier")); // Decode URL-encoded usernames
    const reason = c.req.param("reason");

    // Try find by accountId first, then fallback to username
    let user = await User.findOne({ accountId: identifier });
    if (!user) {
      user = await User.findOne({ username: identifier });
    }
    if (!user) {
      return c.json({ ok: false, error: "User not found" }, 404);
    }

    const tournaments = await Tournaments.findOne({ accountId: user.accountId });
    if (!tournaments) {
      return c.json({ ok: false, error: "Tournament profile not found" }, 404);
    }

    // Award points
    let delta = 0;
    switch (reason) {
      case "Kill":
        delta = 20;
        break;
      case "Top5":
        delta = 10;
        break;
      case "Top10":
        delta = 5;
        break;
    }
    tournaments.hype = (tournaments.hype || 0) + delta;

    // Division update
    const division = computeDivision(tournaments.hype);
    tournaments.divisions = tournaments.divisions || [];
    for (let i = 1; i <= division; i++) {
      const divType = `NormalArenaDiv${i}`;
      if (!tournaments.divisions.includes(divType)) {
        tournaments.divisions.push(divType);
      }
    }

    await tournaments.save();

    return c.json({
      ok: true,
      delta,
      hype: tournaments.hype,
      division,
      divisions: tournaments.divisions,
    });
  });
}