import app from "../../..";
import GameSessionManager from "../../../utils/gameSessions";

export default function () {
  // Endpoint to get session count
  app.get("/v1/sessions/count", (c) => {
    const sessionManager = GameSessionManager.getInstance();
    return c.json({
      count: sessionManager.getPlayerCount(),
      watching: sessionManager.getFormattedPlayerCount()
    });
  });
  
  // Endpoint to manually register a session (for testing)
  app.post("/v1/sessions/register", async (c) => {
    const accountId = c.req.body?.accountId || c.req.headers['x-fortnite-id'] || c.req.ip;
    
    if (!accountId) {
      return c.json({ error: "No account ID provided" }, 400);
    }
    
    const sessionManager = GameSessionManager.getInstance();
    sessionManager.createSession(accountId);
    
    return c.json({
      success: true,
      playerCount: sessionManager.getPlayerCount(),
      watching: sessionManager.getFormattedPlayerCount()
    });
  });
  
  // Endpoint to manually remove a session (for testing)
  app.post("/v1/sessions/unregister", async (c) => {
    const accountId = c.req.body?.accountId || c.req.headers['x-fortnite-id'] || c.req.ip;
    
    if (!accountId) {
      return c.json({ error: "No account ID provided" }, 400);
    }
    
    const sessionManager = GameSessionManager.getInstance();
    const removed = sessionManager.removeSession(accountId);
    
    return c.json({
      success: removed,
      playerCount: sessionManager.getPlayerCount(),
      watching: sessionManager.getFormattedPlayerCount()
    });
  });
  
  // Status endpoint for frontends to check
  app.get("/v1/sessions/status", async (c) => {
    const sessionManager = GameSessionManager.getInstance();
    
    return c.json({
      status: "up",
      playerCount: sessionManager.getPlayerCount(),
      watching: sessionManager.getFormattedPlayerCount()
    });
  });
}