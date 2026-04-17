import { v4 as uuid } from "uuid";

export let gameservers: any[] = [];
export let sessions: any[] = [];

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

export function getServerForRegion(region: string): { ip: string; port: number } {
    const server = regionServers[region.toUpperCase()];
    if (server) return server;
    return { ip: "184.105.7.162", port: 7777 };
}

export function createSession(playlist: string, region: string, players: string[]) {
    const sessionId = uuid().replace(/-/g, "");
    const matchId = uuid().replace(/-/g, "");
    const server = getServerForRegion(region);

    const session = {
        sessionId,
        matchId,
        region: region.toUpperCase(),
        playlist,
        server,
        players,
        createdAt: new Date(),
        started: false
    };

    sessions.push(session);
    console.log(`Session ${sessionId} created for ${region}`);

    return session;
}

export function getSession(sessionId: string) {
    return sessions.find(s => s.sessionId === sessionId);
}

export function removeSession(sessionId: string) {
    const index = sessions.findIndex(s => s.sessionId === sessionId);
    if (index !== -1) {
        sessions.splice(index, 1);
        return true;
    }
    return false;
}

export function registerGameServer(region: string, ip: string, port: number, playlist: string) {
    const existing = gameservers.find(
        gs => gs.region === region && gs.ip === ip && gs.port === port
    );

    if (existing) {
        return existing;
    }

    const server = {
        id: uuid().replace(/-/g, ""),
        region: region.toUpperCase(),
        ip,
        port,
        playlist,
        key: false,
        registeredAt: new Date()
    };

    gameservers.push(server);
    console.log(`Game server registered: ${region} - ${ip}:${port}`);

    return server;
}

export function getAvailableServer(region: string, playlist: string) {
    return gameservers.find(
        gs => gs.region === region.toUpperCase() &&
            gs.playlist === playlist &&
            !gs.key
    );
}
