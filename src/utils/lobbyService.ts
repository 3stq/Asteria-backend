import { ServerWebSocket } from "bun";
import User from "../db/models/User";
import Lobby from "../db/models/Lobby";

interface LobbyClient {
    accountId: string;
    username: string;
    ws: ServerWebSocket<unknown>;
    lobbyId: string;
}

export class LobbyService {
    private static clients = new Map<string, LobbyClient>();
    private static lobbies = new Map<string, Set<string>>(); // lobbyId -> Set of accountIds

    // Add client to lobby system
    static addClient(accountId: string, username: string, ws: ServerWebSocket<unknown>, lobbyId: string) {
        this.clients.set(accountId, { accountId, username, ws, lobbyId });
        
        // Add to lobby
        if (!this.lobbies.has(lobbyId)) {
            this.lobbies.set(lobbyId, new Set());
        }
        this.lobbies.get(lobbyId)!.add(accountId);
        
        console.log(`🎮 ${username} joined lobby ${lobbyId}`);
        this.broadcastToLobby(lobbyId, {
            type: "player_joined",
            player: { accountId, username },
            lobbySize: this.lobbies.get(lobbyId)!.size
        });
    }

    // Remove client from lobby
    static removeClient(accountId: string) {
        const client = this.clients.get(accountId);
        if (client) {
            const { lobbyId, username } = client;
            
            this.clients.delete(accountId);
            this.lobbies.get(lobbyId)?.delete(accountId);
            
            console.log(`🎮 ${username} left lobby ${lobbyId}`);
            this.broadcastToLobby(lobbyId, {
                type: "player_left",
                player: { accountId, username },
                lobbySize: this.lobbies.get(lobbyId)?.size || 0
            });

            // Clean up empty lobbies
            if (this.lobbies.get(lobbyId)?.size === 0) {
                this.lobbies.delete(lobbyId);
            }
        }
    }

    // Broadcast message to all players in a lobby
    static broadcastToLobby(lobbyId: string, message: any) {
        const lobbyClients = this.lobbies.get(lobbyId);
        if (!lobbyClients) return;

        const messageStr = JSON.stringify(message);
        
        lobbyClients.forEach(accountId => {
            const client = this.clients.get(accountId);
            if (client && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(messageStr);
            }
        });
    }

    // Send message to specific player
    static sendToPlayer(accountId: string, message: any) {
        const client = this.clients.get(accountId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
            client.ws.send(JSON.stringify(message));
        }
    }

    // Get lobby info
    static getLobbyPlayers(lobbyId: string): Array<{accountId: string, username: string}> {
        const lobbyClients = this.lobbies.get(lobbyId);
        if (!lobbyClients) return [];

        return Array.from(lobbyClients).map(accountId => {
            const client = this.clients.get(accountId)!;
            return { accountId: client.accountId, username: client.username };
        });
    }

    // Get player count in lobby
    static getLobbySize(lobbyId: string): number {
        return this.lobbies.get(lobbyId)?.size || 0;
    }
}