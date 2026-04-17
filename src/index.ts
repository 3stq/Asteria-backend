import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { HandleNotFound } from "./utils/handling/errorHandler";
import { Log } from "./utils/handling/logging";
import { Connect } from "./db/connect";
import LoadRoutes from "./utils/routing/loadRoutes";
import path from "path";
import { createCatalog } from "./utils/creationTools/createShop";
import { writeFile } from "fs/promises";
import Matchmaking from "./db/models/Matchmaking";
import { v4 as uuid } from "uuid";

const app = new Hono({ strict: false });

(global as any).accessTokens ??= [];
(global as any).refreshTokens ??= [];

// In-memory storage
(global as any).gameservers ??= [];
(global as any).sessions ??= [];
(global as any).playerConnections ??= new Map();

// Region servers
const regionServers = {
  "NAE": { ip: "184.105.7.162", port: 7777 },
  "EU": { ip: "45.92.217.104", port: 7777 }
};

// ============================
// Middleware
// ============================
app.use(cors());
app.use(logger());

// ============================
// WebSocket Test Endpoint
// ============================
app.get("/ws/test", (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.text("WebSocket endpoint - use WebSocket client to connect");
  }

  const upgraded = Bun.serve({
    fetch(req, server) {
      if (server.upgrade(req)) return;
      return new Response("Upgrade failed", { status: 500 });
    },
    websocket: {
      open(ws) {
        Log("🔌 WebSocket connected");
        ws.send(
          JSON.stringify({
            type: "welcome",
            message: "Connected to Lyric Lobby",
          })
        );
      },
      message(ws, message) {
        Log("📨 WS message: " + message.toString());
        ws.send(JSON.stringify({ type: "echo", message: message.toString() }));
      },
      close() {
        Log("🔌 WebSocket disconnected");
      },
    },
  });

  return upgraded.fetch(c.req.raw);
});

// ============================
// Health Check
// ============================
app.get("/health", (c) =>
  c.json({
    status: "online",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    service: "Lyric Backend",
    features: {
      websockets: true,
      realtime_lobbies: true,
      friend_system: true,
      vbucks_system: true,
    },
  })
);

// ============================
// Arena Leaderboard
// ============================
app.get("/arenaleaderboard", (c) => {
  const leaderboard = [
    {
      rank: 1,
      playerName: "ProPlayer1",
      score: 2500,
      kd: 3.2,
      wins: 45,
      matches: 60,
      avatar: "https://example.com/avatars/1.png",
    },
  ];

  return c.json({
    success: true,
    leaderboard,
    lastUpdated: new Date().toISOString(),
    totalPlayers: leaderboard.length,
    season: "Season 1",
    version: "1.0",
  });
});

// ============================
// Player Data
// ============================
app.get("/api/player-data", (c) => {
  const userId = c.req.query("userId") || "unknown";

  return c.json({
    userId,
    playerData: {
      level: Math.floor(Math.random() * 100) + 1,
      score: Math.floor(Math.random() * 10000),
      inventory: ["sword", "shield", "potion"],
      connected: true,
    },
    status: "success",
    timestamp: new Date().toISOString(),
  });
});

// ============================
// Authentication
// ============================
app.post("/api/auth", async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ success: false, error: "Missing credentials" }, 400);
    }

    return c.json({
      success: true,
      token: "23tsxgdfxu563wawrasgd",
      user: {
        username,
        accountId: "acc_" + Math.random().toString(36).slice(2, 11),
      },
      message: "Authentication successful",
    });
  } catch (error) {
    return c.json({ success: false, error: "Invalid request" }, 400);
  }
});

// ============================
// Test Endpoint
// ============================
app.get("/api/test", (c) =>
  c.json({
    message: "Test endpoint working!",
    server: "Lyric Backend",
    status: "operational",
    timestamp: new Date().toISOString(),
    features: {
      realtime_lobbies: "WebSocket ready",
      friend_system: "REST API available",
      matchmaking: "Available",
    },
  })
);

// ============================
// HAVOC ENDPOINTS
// ============================

app.get("/Havoc/v1/session/:sessionId", async (c) => {
  const sessionId = c.req.param("sessionId");

  return c.json({
    ip: "184.105.7.162",
    port: 7777,
    region: "NAE",
    playlist: "playlist_default"
  });
});

app.post("/Havoc/v1/gs/create", async (c) => {
  try {
    const body = await c.req.json();

    (global as any).gameservers.push({
      region: body.region || "NAE",
      ip: body.ip || "184.105.7.162",
      port: body.port || 7777,
      playlist: body.playlist || "playlist_default",
      id: uuid().replace(/-/g, ""),
    });

    Log(`✅ Game server registered: ${body.ip}:${body.port}`);

    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

// ============================
// MATCHMAKING ENDPOINTS
// ============================

app.post("/api/matchmaking/ready", async (c) => {
  try {
    const { accountId, username, playlist = "playlist_default", region = "NAE" } = await c.req.json();

    if (!accountId || !username) {
      return c.json({ success: false, error: "Missing accountId or username" }, 400);
    }

    return c.json({
      success: true,
      message: `Ready for matchmaking in ${region}`,
      region: region,
      serverHint: "184.105.7.162:7777",
      matched: false,
      queuePosition: 1,
      estimatedWait: "10-30 seconds"
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get("/api/matchmaking/status/:accountId", async (c) => {
  try {
    const accountId = c.req.param("accountId");

    return c.json({
      success: true,
      status: "searching",
      playlist: "playlist_default",
      region: "NAE",
      queuePosition: 1,
      timeInQueue: 5,
      timeRemaining: 5
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ============================
// Not Found Handler
// ============================
app.notFound((c) => HandleNotFound(c));

// ============================
// Server Startup
// ============================
export default app;

async function startServer() {
  const PORT = process.env.PORT || 8080;

  try {
    await Connect(process.env.MONGO || "mongodb+srv://trexterfrosty_db_user:Deinas1985!@projectLyric.y3wkjuk.mongodb.net/");
    console.log("✅ Connected to MongoDB");
  } catch (error: any) {
    console.error("❌ MongoDB failed:", error.message);
    // Continue without MongoDB
  }

  try {
    await LoadRoutes.loadRoutes(path.join(__dirname, "app"), app);
    console.log("✅ Routes loaded");
  } catch (error: any) {
    console.error("❌ Routes failed:", error.message);
    // Continue without routes
  }

  // Shop catalog creation - SKIP if fails
  try {
    const catalog = createCatalog();
    await writeFile(
      "src/resources/storefront/catalog.json",
      JSON.stringify(catalog, null, 2)
    );
    console.log("✅ Catalog created");
  } catch (error: any) {
    console.warn("⚠️ Catalog skipped:", error.message);
  }

  // Start Discord bot - SKIP if fails
  try {
    console.log("🤖 Starting Discord bot...");
    await import("./bot/index");
    console.log("✅ Discord bot started");
  } catch (error: any) {
    console.warn("⚠️ Discord bot skipped:", error.message);
  }

  // Start XMPP service - SKIP if fails
  try {
    console.log("🔗 Starting XMPP...");
    await import("../Xmpp/xmpp");
    console.log("✅ XMPP started");
  } catch (error: any) {
    console.warn("⚠️ XMPP skipped:", error.message);
  }

  // Start matchmaker - SKIP if fails
  try {
    console.log("🎮 Starting matchmaker...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    await import("./matchmaker/index");
    console.log("✅ Matchmaker started");
  } catch (error: any) {
    console.warn("⚠️ Matchmaker skipped:", error.message);
  }

  console.log(`🎯 Lyric Backend running at http://localhost:${PORT}`);
  console.log(`🌍 Regions: NAE (184.105.7.162:7777), EU (45.145.226.11:7777)`);
}

if (import.meta.main) {
  startServer().catch((err) => {
    console.error("❌ Startup error:", err.message);
    console.log("⚠️ Starting server anyway...");

    // Start server even with errors
    const PORT = process.env.PORT || 8080;
    Bun.serve({
      port: PORT,
      fetch: app.fetch,
      error(error) {
        console.log("Request error:", error.message);
        return new Response("Error", { status: 500 });
      }
    });

    console.log(`✅ Server running at http://localhost:${PORT} (recovery mode)`);
  });
}