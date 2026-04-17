// src/app/routes/leaderboard.ts
import { Hono } from "hono";
import mongoose from "mongoose";
import User from "../../db/models/User";
import Tournaments from "../../db/models/Tournaments";

export default function (app: Hono) {
  app.get("/api/arena-leaderboard", async (c) => {
    try {
      // Check if MongoDB is connected
      if (mongoose.connection.readyState !== 1) {
        return c.json({
          success: false,
          error: "Database not connected",
          message: "Please check MongoDB connection"
        }, 503);
      }

      console.log("📊 Fetching arena leaderboard...");

      // Fetch top 50 tournaments sorted by hype (descending)
      const tournaments = await Tournaments.find({})
        .sort({ hype: -1 })
        .limit(50)
        .lean()
        .exec();

      const totalPlayers = await Tournaments.countDocuments();

      console.log(`📈 Found ${tournaments.length} tournament entries`);

      // Get all accountIds for batch user lookup
      const accountIds = tournaments.map(t => t.accountId).filter(id => id);
      
      // Batch fetch users for better performance
      const users = await User.find({ 
        accountId: { $in: accountIds } 
      })
      .select("username accountId")
      .lean()
      .exec();

      console.log(`👥 Found ${users.length} user records`);

      // Create a map for quick user lookup
      const userMap = new Map();
      users.forEach(user => {
        if (user.accountId) {
          userMap.set(user.accountId, user.username);
        }
      });

      const leaderboard = tournaments.map((tournament, index) => ({
        name: userMap.get(tournament.accountId) || `Player_${tournament.accountId?.slice(0, 8)}` || "Unknown Player",
        hype: tournament.hype || 0,
        rank: index + 1,
        accountId: tournament.accountId
      }));

      // Set CORS headers for your C# launcher
      c.header("Access-Control-Allow-Origin", "*");
      c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
      c.header("Access-Control-Allow-Headers", "Content-Type");

      console.log("✅ Leaderboard data prepared successfully");

      return c.json({
        success: true,
        totalPlayers,
        leaderboard,
        updatedAt: new Date().toISOString(),
        season: "Current Season",
        message: "Arena leaderboard data"
      });

    } catch (error) {
      console.error("❌ Leaderboard API error:", error);
      
      return c.json({
        success: false,
        error: "Failed to fetch leaderboard",
        message: error instanceof Error ? error.message : "Unknown error occurred",
        leaderboard: []
      }, 500);
    }
  });

  // Add OPTIONS handler for CORS preflight requests
  app.options("/api/arena-leaderboard", (c) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");
    return c.json({ success: true });
  });
}