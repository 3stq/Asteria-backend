import { Hono } from "hono";
import User from "../../db/models/User";
import Lobby from "../../db/models/Lobby";

export default function (app: Hono) {
  // Get user's current lobby
  app.get("/api/lobby/my-lobby", async (c) => {
    const accountId = c.req.query("accountId");
    
    if (!accountId) {
      return c.json({ error: "accountId required" }, 400);
    }

    const user = await User.findOne({ accountId });
    if (!user || !user.currentLobby) {
      return c.json({ inLobby: false });
    }

    const lobby = await Lobby.findOne({ lobbyId: user.currentLobby });
    return c.json({ inLobby: true, lobby });
  });

  // Join lobby
  app.post("/api/lobby/join", async (c) => {
    const { accountId, lobbyId } = await c.req.json();
    
    if (!accountId || !lobbyId) {
      return c.json({ error: "accountId and lobbyId required" }, 400);
    }

    const [user, lobby] = await Promise.all([
      User.findOne({ accountId }),
      Lobby.findOne({ lobbyId })
    ]);

    if (!user || !lobby) {
      return c.json({ error: "User or lobby not found" }, 404);
    }

    if (lobby.members.length >= lobby.maxPlayers) {
      return c.json({ error: "Lobby is full" }, 400);
    }

    // Add user to lobby
    if (!lobby.members.includes(accountId)) {
      lobby.members.push(accountId);
    }

    user.currentLobby = lobbyId;
    
    await Promise.all([lobby.save(), user.save()]);

    return c.json({ success: true, lobby });
  });

  // Leave lobby
  app.post("/api/lobby/leave", async (c) => {
    const { accountId } = await c.req.json();
    
    if (!accountId) {
      return c.json({ error: "accountId required" }, 400);
    }

    const user = await User.findOne({ accountId });
    if (!user || !user.currentLobby) {
      return c.json({ error: "User not in a lobby" }, 400);
    }

    const lobby = await Lobby.findOne({ lobbyId: user.currentLobby });
    if (lobby) {
      // Remove user from lobby members
      lobby.members = lobby.members.filter(member => member !== accountId);
      
      // If lobby is empty, delete it
      if (lobby.members.length === 0) {
        await Lobby.deleteOne({ lobbyId: user.currentLobby });
      } else {
        // If creator left, assign new creator
        if (lobby.creator === accountId) {
          lobby.creator = lobby.members[0] ?? "";
        }
        await lobby.save();
      }
    }

    user.currentLobby = undefined;
    await user.save();

    return c.json({ success: true });
  });
}