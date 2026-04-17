import { Hono } from "hono";
import Matchmaking from "../db/models/Matchmaking";
import { gameservers, sessions, regionServers } from "./index";
import { v4 as uuid } from "uuid";
import { getAvailableRegions } from "./matchmaking";

// vortex here again, didn't touch a bunch of stuff here, only removed some placeholders and changed them to use a real system.

export function initializeMatchmakingRoutes(app: Hono) {
  console.log("🎮 Initializing matchmaking routes...");

  // ==================== MATCHMAKING ENDPOINTS ====================

  // Player readies up with region
  app.post("/api/matchmaking/ready", async (c) => {
    try {
      const { accountId, username, playlist = "playlist_default", region = "NAE" } = await c.req.json();

      if (!accountId) {
        return c.json({ success: false, error: "Missing accountId" }, 400);
      }

      // Normalize region
      const normalizedRegion = region.toUpperCase();

      // Check if region is valid
      const availableRegions = getAvailableRegions();
      if (!availableRegions.includes(normalizedRegion)) {
        return c.json({
          success: false,
          error: `Invalid region: ${region}. Available: ${availableRegions.join(", ")}`
        }, 400);
      }

      // Check if already in queue
      const existing = await Matchmaking.findOne({ accountId });
      if (existing && existing.status !== "cancelled") {
        return c.json({
          success: false,
          error: "Already in matchmaking queue",
          status: existing.status
        }, 400);
      }

      // Remove any old entries
      await Matchmaking.deleteOne({ accountId });

      // Create new matchmaking entry
      const matchmakingEntry = new Matchmaking({
        accountId,
        username,
        playlist,
        region: normalizedRegion,
        status: "searching",
        joinedAt: new Date()
      });

      await matchmakingEntry.save();
      console.log(`✅ ${username} queued for ${normalizedRegion}`);

      // Get server info for this region
      const server = regionServers[normalizedRegion] || regionServers["default"] || { ip: "184.105.7.162", port: 7777 };

      const queueCount = await Matchmaking.countDocuments({
        status: "searching",
        playlist,
        region: normalizedRegion
      });

      return c.json({
        success: true,
        message: `Ready for matchmaking in ${normalizedRegion}`,
        region: normalizedRegion,
        serverHint: `${server.ip}:${server.port}`,
        queuePosition: queueCount,
        estimatedWait: "10-30 seconds"
      });

    } catch (error: any) {
      console.error("Ready error:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Player cancels matchmaking
  app.post("/api/matchmaking/cancel", async (c) => {
    try {
      const { accountId } = await c.req.json();

      if (!accountId) {
        return c.json({ success: false, error: "Missing accountId" }, 400);
      }

      const result = await Matchmaking.findOneAndDelete({ accountId });

      if (!result) {
        return c.json({ success: false, error: "Not in matchmaking queue" }, 404);
      }

      return c.json({
        success: true,
        message: "Cancelled matchmaking"
      });

    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get matchmaking status
  app.get("/api/matchmaking/status/:accountId", async (c) => {
    try {
      const accountId = c.req.param("accountId");
      const player = await Matchmaking.findOne({ accountId });

      if (!player) {
        return c.json({ success: false, error: "Not in matchmaking" }, 404);
      }

      const queueCount = await Matchmaking.countDocuments({
        status: "searching",
        playlist: player.playlist,
        region: player.region
      });

      const waitTime = Math.floor((new Date().getTime() - player.joinedAt.getTime()) / 1000);

      return c.json({
        success: true,
        status: player.status,
        playlist: player.playlist,
        region: player.region,
        queuePosition: queueCount,
        waitTime: `${waitTime}s`,
        matchId: player.matchId,
        sessionId: player.sessionId,
        server: player.ip ? {
          ip: player.ip,
          port: player.port,
          region: player.region
        } : null
      });

    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // Get available regions
  app.get("/api/matchmaking/regions", async (c) => {
    const regions = getAvailableRegions();

    // Get real player counts per region
    const regionStats = await Promise.all(
      regions.map(async (region) => {
        const playersInQueue = await Matchmaking.countDocuments({
          region,
          status: "searching"
        });

        const playersInMatch = await Matchmaking.countDocuments({
          region,
          status: "matched"
        });

        return {
          code: region,
          name: getRegionName(region),
          server: regionServers[region] || regionServers["default"],
          playersInQueue,
          playersInMatch,
          playersOnline: playersInQueue + playersInMatch
        };
      })
    );

    return c.json({
      success: true,
      regions: regionStats,
      defaultRegion: "NAE",
      totalPlayers: regionStats.reduce((sum, r) => sum + r.playersOnline, 0)
    });
  });

  // Get all players in queue (admin)
  app.get("/api/matchmaking/queue", async (c) => {
    try {
      const players = await Matchmaking.find({});

      // Group by region
      const byRegion: Record<string, any[]> = {};
      players.forEach(player => {
        const region = player.region || "unknown";
        if (!byRegion[region]) byRegion[region] = [];
        byRegion[region].push(player);
      });

      return c.json({
        success: true,
        total: players.length,
        byRegion: Object.entries(byRegion).map(([region, players]) => ({
          region,
          count: players.length,
          players: players.map(p => ({
            accountId: p.accountId,
            username: p.username,
            status: p.status,
            playlist: p.playlist,
            waitTime: Math.floor((new Date().getTime() - p.joinedAt.getTime()) / 1000)
          }))
        }))
      });
    } catch (error: any) {
      return c.json({ success: false, error: error.message }, 500);
    }
  });

  // ==================== HAVOC ENDPOINTS ====================

  app.get("/Havoc/v1/session/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");
    const sessionIndex = sessions.findIndex((s: any) => s.sessionId === sessionId);

    if (sessionIndex === -1) {
      return c.json({ error: "Session not found" }, 404);
    }

    const session = sessions[sessionIndex];
    const gsi = gameservers.findIndex((g: any) => g.id === session.matchId);

    if (gsi === -1) {
      return c.json({ error: "Game server not found" }, 404);
    }

    // Remove session after use
    sessions.splice(sessionIndex, 1);

    return c.json({
      ip: gameservers[gsi].ip,
      port: gameservers[gsi].port,
      region: gameservers[gsi].region,
      playlist: gameservers[gsi].playlist
    });
  });

  // Game server registration
  app.post("/Havoc/v1/gs/create", async (c) => {
    const body: any = await c.req.json();
    if (!body.region || !body.ip || !body.port || !body.playlist) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Normalize region
    body.region = body.region.toUpperCase();

    const gsIndex = gameservers.findIndex(
      (gs: any) => gs.region === body.region &&
        gs.ip === body.ip &&
        gs.port === body.port &&
        gs.playlist === body.playlist
    );

    if (gsIndex === -1) {
      gameservers.push({
        region: body.region,
        ip: body.ip,
        port: body.port,
        playlist: body.playlist,
        id: uuid().replace(/-/g, ""),
        key: false,
      });
      console.log(`✅ Game server registered: ${body.region} - ${body.ip}:${body.port}`);
    }

    return c.json({ success: true }, 201);
  });

  console.log("✅ Matchmaking routes initialized");
}

// Helper function for region names
function getRegionName(regionCode: string): string {
  const names: Record<string, string> = {
    "NAE": "North America East",
    "EU": "Europe",
    "NAW": "North America West",
    "OCE": "Oceania",
    "ASIA": "Asia",
    "SA": "South America",
    "ME": "Middle East"
  };
  return names[regionCode] || regionCode;
}