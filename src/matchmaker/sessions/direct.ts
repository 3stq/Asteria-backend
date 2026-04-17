import { v4 as uuid } from "uuid";
import { sessions, gameservers, getServerForRegion, registerGameServer } from "./sessions";

// ============================
// Types
// ============================
export interface GameSession {
    sessionId: string;
    matchId: string;
    region: string;
    playlist: string;
    server: { ip: string; port: number };
    players: string[];
    createdAt: Date;
    started: boolean;
    startedAt?: Date;
}

// ============================
// Session Creation
// ============================
export function createDirectSession(
    playlist: string,
    region: string,
    players: string[]
): GameSession {
    const sessionId = uuid().replace(/-/g, "");
    const matchId = uuid().replace(/-/g, "");
    const server = getServerForRegion(region);

    // Ensure game server is registered
    registerGameServer(region, server.ip, server.port, playlist);

    const session: GameSession = {
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
    console.log(`🎮 Direct session ${sessionId} created for ${players.length} players in ${region}`);

    return session;
}

// ============================
// Player Assignment
// ============================
export function assignPlayerToSession(sessionId: string, accountId: string): boolean {
    const session = sessions.find((s: GameSession) => s.sessionId === sessionId);

    if (!session) {
        console.log(`⚠️ Session ${sessionId} not found`);
        return false;
    }

    if (!session.players.includes(accountId)) {
        session.players.push(accountId);
        console.log(`✅ Player ${accountId} assigned to session ${sessionId}`);
    }

    return true;
}

export function removePlayerFromSession(sessionId: string, accountId: string): boolean {
    const session = sessions.find((s: GameSession) => s.sessionId === sessionId);

    if (!session) {
        return false;
    }

    const index = session.players.indexOf(accountId);
    if (index !== -1) {
        session.players.splice(index, 1);
        console.log(`🔌 Player ${accountId} removed from session ${sessionId}`);

        // If no players left, clean up session
        if (session.players.length === 0) {
            const sessionIndex = sessions.findIndex((s: GameSession) => s.sessionId === sessionId);
            if (sessionIndex !== -1) {
                sessions.splice(sessionIndex, 1);
                console.log(`🗑️ Empty session ${sessionId} removed`);
            }
        }

        return true;
    }

    return false;
}

// ============================
// Session Queries
// ============================
export function getSessionInfo(sessionId: string): GameSession | null {
    return sessions.find((s: GameSession) => s.sessionId === sessionId) || null;
}

export function getSessionByMatchId(matchId: string): GameSession | null {
    return sessions.find((s: GameSession) => s.matchId === matchId) || null;
}

export function getPlayerSession(accountId: string): GameSession | null {
    return sessions.find((s: GameSession) => s.players.includes(accountId)) || null;
}

export function markSessionStarted(sessionId: string): boolean {
    const session = sessions.find((s: GameSession) => s.sessionId === sessionId);

    if (!session) {
        return false;
    }

    session.started = true;
    session.startedAt = new Date();
    console.log(`🚀 Session ${sessionId} started`);

    return true;
}

// ============================
// Session Statistics
// ============================
export function getActiveSessionCount(): number {
    return sessions.filter((s: GameSession) => !s.started).length;
}

export function getSessionsByRegion(region: string): GameSession[] {
    return sessions.filter((s: GameSession) => s.region === region.toUpperCase());
}

export function getTotalPlayersInSessions(): number {
    return sessions.reduce((total: number, s: GameSession) => total + s.players.length, 0);
}
