import { v4 as uuid } from "uuid";
import { gameservers, regionServers } from "./sessions";

export interface GameServer {
    id: string;
    region: string;
    ip: string;
    port: number;
    playlist: string;
    key: boolean; // true = in use
    currentPlayers: number;
    maxPlayers: number;
    registeredAt: Date;
    lastHeartbeat?: Date;
}

export function registerServer(
    region: string,
    ip: string,
    port: number,
    playlist: string,
    maxPlayers: number = 100
): GameServer {
    const existing = gameservers.find(
        (gs: GameServer) => gs.ip === ip && gs.port === port
    );

    if (existing) {
        existing.lastHeartbeat = new Date();
        return existing;
    }

    const server: GameServer = {
        id: uuid().replace(/-/g, ""),
        region: region.toUpperCase(),
        ip,
        port,
        playlist,
        key: false,
        currentPlayers: 0,
        maxPlayers,
        registeredAt: new Date(),
        lastHeartbeat: new Date()
    };

    gameservers.push(server);
    console.log(`Game server registered: ${region} - ${ip}:${port} (max ${maxPlayers} players)`);

    return server;
}

export function unregisterServer(serverId: string): boolean {
    const index = gameservers.findIndex((gs: GameServer) => gs.id === serverId);

    if (index !== -1) {
        const server = gameservers[index];
        gameservers.splice(index, 1);
        console.log(`Game server unregistered: ${server.region} - ${server.ip}:${server.port}`);
        return true;
    }

    return false;
}

export function getAvailableServers(region?: string, playlist?: string): GameServer[] {
    return gameservers.filter((gs: GameServer) => {
        if (gs.key) return false;
        if (gs.currentPlayers >= gs.maxPlayers) return false;
        if (region && gs.region !== region.toUpperCase()) return false;
        if (playlist && gs.playlist !== playlist) return false;
        return true;
    });
}

export function getBestServerForMatch(region: string, playlist: string): GameServer | null {
    const available = getAvailableServers(region, playlist);

    if (available.length === 0) {
        const defaultServer = regionServers[region.toUpperCase()];
        const fallbackServer = defaultServer || { ip: "184.105.7.162", port: 7777 };

        return registerServer(region, fallbackServer.ip, fallbackServer.port, playlist);
    }

    const sorted = available.sort((a, b) =>
        (b.maxPlayers - b.currentPlayers) - (a.maxPlayers - a.currentPlayers)
    );
    return sorted[0] || null;
}

export function getServerById(serverId: string): GameServer | null {
    return gameservers.find((gs: GameServer) => gs.id === serverId) || null;
}

export function getServerByAddress(ip: string, port: number): GameServer | null {
    return gameservers.find((gs: GameServer) => gs.ip === ip && gs.port === port) || null;
}

export function markServerInUse(serverId: string): boolean {
    const server = gameservers.find((gs: GameServer) => gs.id === serverId);

    if (server) {
        server.key = true;
        return true;
    }

    return false;
}

export function markServerAvailable(serverId: string): boolean {
    const server = gameservers.find((gs: GameServer) => gs.id === serverId);

    if (server) {
        server.key = false;
        server.currentPlayers = 0;
        return true;
    }

    return false;
}

export function updateServerPlayers(serverId: string, playerCount: number): boolean {
    const server = gameservers.find((gs: GameServer) => gs.id === serverId);

    if (server) {
        server.currentPlayers = playerCount;
        server.lastHeartbeat = new Date();
        return true;
    }

    return false;
}

export function heartbeatServer(serverId: string): boolean {
    const server = gameservers.find((gs: GameServer) => gs.id === serverId);

    if (server) {
        server.lastHeartbeat = new Date();
        return true;
    }

    return false;
}

export function getServerCount(): number {
    return gameservers.length;
}

export function getAvailableServerCount(): number {
    return gameservers.filter((gs: GameServer) => !gs.key).length;
}

export function getTotalCapacity(): number {
    return gameservers.reduce((total: number, gs: GameServer) => total + gs.maxPlayers, 0);
}

export function getTotalPlayers(): number {
    return gameservers.reduce((total: number, gs: GameServer) => total + gs.currentPlayers, 0);
}

export function getServersByRegion(region: string): GameServer[] {
    return gameservers.filter((gs: GameServer) => gs.region === region.toUpperCase());
}

const HEARTBEAT_TIMEOUT = 60000;

export function cleanupStaleServers(): number {
    const now = Date.now();
    let removed = 0;

    for (let i = gameservers.length - 1; i >= 0; i--) {
        const server = gameservers[i];

        if (server.lastHeartbeat) {
            const timeSinceHeartbeat = now - new Date(server.lastHeartbeat).getTime();

            if (timeSinceHeartbeat > HEARTBEAT_TIMEOUT) {
                console.log(`Removing stale server: ${server.region} - ${server.ip}:${server.port}`);
                gameservers.splice(i, 1);
                removed++;
            }
        }
    }

    return removed;
}

setInterval(cleanupStaleServers, 60000);
