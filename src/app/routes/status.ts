import { Hono } from "hono";
import { PresenceService } from "../../utils/presenceService";
import User from "../../db/models/User";

export default function (app: Hono) {
  // Get real online player count
  app.get("/api/status/player-count", async (c) => {
    try {
      const onlineCount = PresenceService.getOnlinePlayerCount();
      
      // You can also show total registered users if you want
      const totalUsers = await User.countDocuments();
      
      return c.json({
        online: onlineCount,
        total: totalUsers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Player count error:", error);
      return c.json({ online: 0, total: 0, error: "Server error" });
    }
  });
}