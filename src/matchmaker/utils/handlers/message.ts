import { WebSocket } from "ws";
import { addToMatchmaking, removeFromMatchmaking, playerConnections, notifyPlayer } from "../matchmaking";

export function handleStates(ws: WebSocket, req: any, connections: Map<string, WebSocket>) {
  ws.on("message", async (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      console.log("📨 WebSocket message:", data.type);

      // Authentication
      if (data.type === "authenticate") {
        const { accountId } = data;
        if (accountId) {
          connections.set(accountId, ws);
          console.log(`✅ WebSocket authenticated for ${accountId}`);
          
          ws.send(JSON.stringify({
            type: "authenticated",
            success: true,
            message: "Connected to matchmaking service"
          }));
        }
      }

      // Ready up via WebSocket
      if (data.type === "ready_up") {
        const { accountId, username, playlist, region } = data;
        
        const result = await addToMatchmaking(accountId, username, playlist, region);
        
        ws.send(JSON.stringify({
          type: "ready_response",
          ...result
        }));

        // If matched immediately, send match info
        if (result.matched) {
          notifyPlayer(accountId, {
            type: "match_found",
            ...result
          });
        }
      }

      // Cancel matchmaking
      if (data.type === "cancel_matchmaking") {
        const { accountId } = data;
        const result = await removeFromMatchmaking(accountId);
        
        ws.send(JSON.stringify({
          type: "cancel_response",
          ...result
        }));
      }

      // Check status
      if (data.type === "check_status") {
        const { accountId } = data;
        const player = connections.get(accountId);
        
        if (player) {
          ws.send(JSON.stringify({
            type: "status_response",
            connected: true
          }));
        }
      }

    } catch (error) {
      console.error("WebSocket message error:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message format"
      }));
    }
  });

  ws.on("close", () => {
    // Remove from connections
    for (const [accountId, connection] of connections.entries()) {
      if (connection === ws) {
        connections.delete(accountId);
        console.log(`🔌 WebSocket disconnected: ${accountId}`);
        break;
      }
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: "welcome",
    message: "Connected to Lyric Matchmaking",
    endpoints: {
      ready_up: "Send {type: 'ready_up', accountId: '...', username: '...'}",
      cancel: "Send {type: 'cancel_matchmaking', accountId: '...'}",
      check_status: "Send {type: 'check_status', accountId: '...'}"
    }
  }));
}