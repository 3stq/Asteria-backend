import { Hono } from "hono";
import User from "../../db/models/User";
import Lobby from "../../db/models/Lobby";
import { LobbyService } from "../../utils/lobbyService";
import { v4 as uuidv4 } from "uuid";

export default function (app: Hono) {
    console.log("✅ Social routes loaded");

    // Create lobby with real-time support
    app.post("/api/social/lobby/create", async (c) => {
        try {
            const { accountId, privacy = "friends-only", maxPlayers = 4, gameMode = "battle_royale" } = await c.req.json();
            
            if (!accountId) {
                return c.json({ error: "accountId required" }, 400);
            }

            const user = await User.findOne({ accountId });
            if (!user) {
                return c.json({ error: "User not found" }, 404);
            }

            if (user.currentLobby) {
                return c.json({ error: "User already in a lobby" }, 400);
            }

            const lobbyId = uuidv4().replace(/-/g, "").substring(0, 12);
            const lobby = new Lobby({
                lobbyId,
                creator: accountId,
                members: [accountId],
                maxPlayers,
                privacy,
                gameMode,
                region: "NAE"
            });

            user.currentLobby = lobbyId;
            await Promise.all([lobby.save(), user.save()]);

            return c.json({
                success: true,
                lobby: {
                    lobbyId,
                    creator: accountId,
                    members: [accountId],
                    maxPlayers,
                    privacy,
                    gameMode,
                    websocketUrl: `/ws/lobby?accountId=${accountId}&lobbyId=${lobbyId}`
                }
            });
        } catch (error) {
            console.error("Lobby creation error:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Join lobby with real-time support
    app.post("/api/social/lobby/join", async (c) => {
        try {
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

            if (user.currentLobby) {
                return c.json({ error: "User already in a lobby" }, 400);
            }

            if (lobby.members.length >= lobby.maxPlayers) {
                return c.json({ error: "Lobby is full" }, 400);
            }

            // Check privacy settings
            if (lobby.privacy === "friends-only") {
                const creator = await User.findOne({ accountId: lobby.creator });
                if (!creator || !creator.friends.includes(accountId)) {
                    return c.json({ error: "This lobby is friends-only" }, 403);
                }
            }

            lobby.members.push(accountId);
            user.currentLobby = lobbyId;

            await Promise.all([lobby.save(), user.save()]);

            return c.json({
                success: true,
                lobby: {
                    lobbyId: lobby.lobbyId,
                    creator: lobby.creator,
                    members: lobby.members,
                    maxPlayers: lobby.maxPlayers,
                    privacy: lobby.privacy,
                    gameMode: lobby.gameMode,
                    websocketUrl: `/ws/lobby?accountId=${accountId}&lobbyId=${lobbyId}`
                }
            });
        } catch (error) {
            console.error("Join lobby error:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Get real-time lobby status
    app.get("/api/social/lobby/:lobbyId/status", async (c) => {
        try {
            const lobbyId = c.req.param("lobbyId");
            const lobby = await Lobby.findOne({ lobbyId });

            if (!lobby) {
                return c.json({ error: "Lobby not found" }, 404);
            }

            // Get real-time player data from LobbyService
            const onlinePlayers = LobbyService.getLobbyPlayers(lobbyId);
            const memberDetails = await User.find({ 
                accountId: { $in: lobby.members } 
            }).select("username status avatarUrl");

            return c.json({
                lobbyId: lobby.lobbyId,
                creator: lobby.creator,
                onlinePlayers: onlinePlayers.length,
                members: memberDetails.map(m => ({
                    accountId: m.accountId,
                    username: m.username,
                    status: m.status,
                    avatarUrl: m.avatarUrl,
                    isOnline: onlinePlayers.some(p => p.accountId === m.accountId)
                })),
                maxPlayers: lobby.maxPlayers,
                privacy: lobby.privacy,
                gameMode: lobby.gameMode
            });
        } catch (error) {
            console.error("Get lobby status error:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Send message to lobby (REST fallback)
    app.post("/api/social/lobby/:lobbyId/chat", async (c) => {
        try {
            const lobbyId = c.req.param("lobbyId");
            const { accountId, message } = await c.req.json();
            
            if (!accountId || !message) {
                return c.json({ error: "accountId and message required" }, 400);
            }

            const user = await User.findOne({ accountId });
            if (!user) {
                return c.json({ error: "User not found" }, 404);
            }

            // Broadcast via WebSocket
            LobbyService.broadcastToLobby(lobbyId, {
                type: "chat_message",
                from: user.username,
                message: message,
                timestamp: new Date().toISOString()
            });

            return c.json({ success: true, message: "Message sent" });
        } catch (error) {
            console.error("Lobby chat error:", error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // ... include the friend system endpoints from previous message
}