import { Hono } from "hono";
import { PresenceService } from "../../utils/presenceService";

export default function (app: Hono) {
  app.post("/api/presence/connect", async (c) => {
    try {
      const { accountId, server } = await c.req.json();
      
      if (!accountId) {
        return c.json({ error: "accountId required" }, 400);
      }

      await PresenceService.playerConnected(accountId, server);
      return c.json({ 
        success: true, 
        onlinePlayers: PresenceService.getOnlinePlayerCount() 
      });
    } catch (error) {
      console.error("Connect error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  app.get("/api/presence/online-count", async (c) => {
    try {
      const count = PresenceService.getOnlinePlayerCount();
      return c.json({ count, timestamp: new Date() });
    } catch (error) {
      console.error("Online count error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}