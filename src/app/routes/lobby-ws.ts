import { Hono } from "hono";
import { LobbyService } from "../../utils/lobbyService";
import User from "../../db/models/User";

export default function (app: Hono) {
    // WebSocket endpoint for real-time lobby communication
    app.get('/ws/lobby', async (c) => {
        const accountId = c.req.query('accountId');
        const lobbyId = c.req.query('lobbyId');

        if (!accountId || !lobbyId) {
            return c.text('Missing accountId or lobbyId', 400);
        }

        // Verify user exists
        const user = await User.findOne({ accountId });
        if (!user) {
            return c.text('User not found', 404);
        }

        // Upgrade to WebSocket
        if (c.req.header('Upgrade') === 'websocket') {
            const upgraded = Bun.serve({
                fetch(req, server) {
                    if (server.upgrade(req, { data: { accountId, lobbyId, username: user.username } })) {
                        return;
                    }
                    return new Response('Upgrade failed', { status: 500 });
                },
                websocket: {
                    open(ws) {
                        const { accountId, lobbyId, username } = ws.data as { accountId: string, lobbyId: string, username: string };
                        LobbyService.addClient(accountId, username, ws, lobbyId);
                        
                        // Send current lobby state to the new player
                        const lobbyPlayers = LobbyService.getLobbyPlayers(lobbyId);
                        ws.send(JSON.stringify({
                            type: "lobby_joined",
                            players: lobbyPlayers,
                            yourId: accountId
                        }));
                    },
                    message(ws, message) {
                        try {
                            const data = JSON.parse(message.toString());
                            const { accountId, lobbyId, username } = ws.data as { accountId: string, lobbyId: string, username: string };
                            
                            // Handle different message types
                            switch (data.type) {
                                case "chat_message":
                                    LobbyService.broadcastToLobby(lobbyId, {
                                        type: "chat_message",
                                        from: username,
                                        message: data.message,
                                        timestamp: new Date().toISOString()
                                    });
                                    break;
                                
                                case "ready_status":
                                    LobbyService.broadcastToLobby(lobbyId, {
                                        type: "player_ready",
                                        playerId: accountId,
                                        username: username,
                                        isReady: data.isReady
                                    });
                                    break;
                                
                                case "start_game":
                                    LobbyService.broadcastToLobby(lobbyId, {
                                        type: "game_starting",
                                        initiatedBy: username,
                                        countdown: 10
                                    });
                                    break;
                            }
                        } catch (error) {
                            console.error('WebSocket message error:', error);
                        }
                    },
                    close(ws) {
                        const { accountId } = ws.data as { accountId: string };
                        LobbyService.removeClient(accountId);
                    },
                },
            });

            return upgraded.fetch(c.req.raw);
        }

        return c.text('Expected WebSocket upgrade', 426);
    });
}