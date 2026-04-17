// src/http/leaderboard.ts
import { Hono } from "hono";
import type { Context } from "hono";

import Tournaments from "../models/Tournaments"; // ← adjust if your models path differs
import User from "../models/User";               // ← adjust if your models path differs

// If your models are at repo-root /models, use:
// import Tournaments from "../../models/Tournaments";
// import User from "../../models/User";

const app = new Hono();

/**
 * GET /api/v2/Lyric/leaderboard_hype
 * Response: { leaderboard: [{ username, hype, accountId, avatar? }] }
 */
app.get("/api/v2/Lyric/leaderboard_hype", async (c: Context) => {
  try {
    const docs = await Tournaments.aggregate([
      { $sort: { hype: -1 } },
      { $limit: 100 },
      {
        $lookup: {
          from: "users", // Mongo collection name for your User model
          localField: "accountId",
          foreignField: "accountId",
          as: "user",
        },
      },
      { $addFields: { user: { $first: "$user" } } },
      {
        $project: {
          _id: 0,
          accountId: 1,
          hype: 1,
          username: {
            $ifNull: ["$user.username", { $concat: ["Unknown (", { $toString: "$accountId" }, ")"] }],
          },
          avatar: "$user.avatar",
        },
      },
    ]);

    return c.json({ leaderboard: docs }, 200);
  } catch (e) {
    console.error("Lyric leaderboard api error:", e);
    return c.json({ error: "Failed to build leaderboard" }, 500);
  }
});

export default app;
