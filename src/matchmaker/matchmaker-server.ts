import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuid } from "uuid";

const MATCHMAKER_PORT = parseInt(process.env.MMPORT || "8888");

export const regionServers: Record<string, { ip: string; port: number }> = {
    "NAE": { ip: "184.105.7.162", port: 7777 },
    "EU": { ip: "45.92.217.104", port: 7777 },
    "NAW": { ip: "184.105.7.162", port: 7777 },
    "OCE": { ip: "184.105.7.162", port: 7777 },
    "ASIA": { ip: "184.105.7.162", port: 7777 },
    "SA": { ip: "184.105.7.162", port: 7777 },
    "ME": { ip: "184.105.7.162", port: 7777 },
    "default": { ip: "184.105.7.162", port: 7777 }
};

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function makeId(): string {
    return uuid().replace(/-/g, "");
}

const wss = new WebSocketServer({
    port: MATCHMAKER_PORT,
    host: "0.0.0.0"
});

wss.on("listening", () => {
    console.log(`Matchmaker WebSocket running on 0.0.0.0:${MATCHMAKER_PORT}`);
});

wss.on("connection", async (ws: WebSocket) => {
    const protocol = (ws as any).protocol?.toLowerCase() || "";
    if (protocol.includes("xmpp")) {
        return ws.close();
    }

    console.log("New matchmaking connection");

    const ticketId = makeId();
    const matchId = makeId();
    const sessionId = makeId();

    function Connecting() {
        ws.send(JSON.stringify({
            payload: {
                state: "Connecting"
            },
            name: "StatusUpdate"
        }));
    }

    function Waiting() {
        ws.send(JSON.stringify({
            payload: {
                totalPlayers: 1,
                connectedPlayers: 1,
                state: "Waiting"
            },
            name: "StatusUpdate"
        }));
    }

    function Queued() {
        ws.send(JSON.stringify({
            payload: {
                ticketId: ticketId,
                queuedPlayers: 0,
                estimatedWaitSec: 0,
                status: {},
                state: "Queued"
            },
            name: "StatusUpdate"
        }));
    }

    function SessionAssignment() {
        ws.send(JSON.stringify({
            payload: {
                matchId: matchId,
                state: "SessionAssignment"
            },
            name: "StatusUpdate"
        }));
    }

    function Join() {
        ws.send(JSON.stringify({
            payload: {
                matchId: matchId,
                sessionId: sessionId,
                joinDelaySec: 1
            },
            name: "Play"
        }));
    }

    Connecting();
    await sleep(800);
    Waiting();
    await sleep(1000);
    Queued();
    await sleep(4000);
    SessionAssignment();
    await sleep(2000);
    Join();

    ws.on("close", () => {
        console.log("Matchmaking connection closed");
    });

    ws.on("error", (error) => {
        console.error("Matchmaking WebSocket error:", error);
    });
});

export { wss };
export default wss;
