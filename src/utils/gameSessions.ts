// src/utils/gameSessions.ts

class GameSessionManager {
  private static instance: GameSessionManager;
  private sessions: Map<string, GameSession> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Session timeout in milliseconds (5 minutes)
  private readonly SESSION_TIMEOUT = 5 * 60 * 1000;
  
  private constructor() {
    // Start the heartbeat to clean up stale sessions
    this.heartbeatInterval = setInterval(() => this.cleanupSessions(), 60 * 1000);
  }
  
  public static getInstance(): GameSessionManager {
    if (!GameSessionManager.instance) {
      GameSessionManager.instance = new GameSessionManager();
    }
    return GameSessionManager.instance;
  }
  
  public createSession(accountId: string, data: any = {}): GameSession {
    // Create a new session or refresh existing one
    const existingSession = this.sessions.get(accountId);
    if (existingSession) {
      existingSession.lastActivity = Date.now();
      return existingSession;
    }
    
    // Create new session
    const session = new GameSession(accountId, data);
    this.sessions.set(accountId, session);
    console.log(`[GameSessions] Player connected: ${accountId}. Total players: ${this.sessions.size}`);
    
    // Update client manager
    this.notifyClientManager(accountId, data.discordId, data.username, true);
    
    return session;
  }
  
  public getSession(accountId: string): GameSession | undefined {
    const session = this.sessions.get(accountId);
    if (session) {
      // Update last activity time
      session.lastActivity = Date.now();
    }
    return session;
  }
  
  public removeSession(accountId: string): boolean {
    const removed = this.sessions.delete(accountId);
    if (removed) {
      console.log(`[GameSessions] Player disconnected: ${accountId}. Total players: ${this.sessions.size}`);
      
      // Update client manager
      this.notifyClientManager(accountId, null, null, false);
    }
    return removed;
  }
  
  public getAllSessions(): Map<string, GameSession> {
    return this.sessions;
  }
  
  public getActiveSessions(): GameSession[] {
    return Array.from(this.sessions.values());
  }
  
  // Get player count - combines local sessions with global OnlineAccountIds
  public getPlayerCount(): number {
    try {
      // Try to get count from global OnlineAccountIds first (persistent across restarts)
      if (global.OnlineAccountIds && global.OnlineAccountIds.size > 0) {
        console.log(`[GameSessions] Using global OnlineAccountIds: ${global.OnlineAccountIds.size} players`);
        return global.OnlineAccountIds.size;
      }
      
      // Fallback to local sessions
      const localCount = this.sessions.size;
      console.log(`[GameSessions] Using local sessions: ${localCount} players`);
      return localCount;
      
    } catch (error) {
      console.error('Error getting player count:', error);
      return this.sessions.size;
    }
  }
  
  // Get the actual online players for display
  public getOnlinePlayers(): string[] {
    try {
      // Try to get from global OnlineAccountIds first
      if (global.OnlineAccountIds) {
        return Array.from(global.OnlineAccountIds);
      }
      
      // Fallback to local sessions
      return Array.from(this.sessions.keys());
      
    } catch (error) {
      return Array.from(this.sessions.keys());
    }
  }
  
  public getFormattedPlayerCount(): string {
    const count = this.getPlayerCount();
    return count > 0 ? `${count} players online` : "Lyric Server";
  }
  
  private notifyClientManager(accountId: string, discordId: string | null, username: string | null, isConnected: boolean) {
    try {
      if (isConnected) {
        // Call global onClientConnect if available
        if (typeof global.onClientConnect === 'function') {
          global.onClientConnect(accountId, discordId, username);
          console.log(`[GameSessions] Notified ClientManager: ${accountId} connected`);
        }
      } else {
        // Call global onClientDisconnect if available
        if (typeof global.onClientDisconnect === 'function') {
          global.onClientDisconnect(accountId);
          console.log(`[GameSessions] Notified ClientManager: ${accountId} disconnected`);
        }
      }
    } catch (error) {
      console.log('ClientManager notification failed:', error);
    }
  }
  
  // Refresh from global state (call this periodically)
  public refreshFromGlobal() {
    try {
      if (typeof global.refreshOnlineStatus === 'function') {
        global.refreshOnlineStatus();
        console.log(`[GameSessions] Refreshed from global state: ${global.OnlineAccountIds?.size || 0} players`);
      }
    } catch (error) {
      console.log('Refresh from global failed:', error);
    }
  }
  
  private cleanupSessions(): void {
    const now = Date.now();
    let removedCount = 0;
    
    for (const [accountId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > this.SESSION_TIMEOUT) {
        this.sessions.delete(accountId);
        removedCount++;
        
        // Also notify client manager about the timeout
        this.notifyClientManager(accountId, null, null, false);
      }
    }
    
    if (removedCount > 0) {
      console.log(`[GameSessions] Cleaned up ${removedCount} inactive sessions. Total players: ${this.sessions.size}`);
    }
  }
  
  // Clean up the heartbeat on application shutdown
  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }
}

// GameSession class represents an individual player session
class GameSession {
  public accountId: string;
  public data: any;
  public createdAt: number;
  public lastActivity: number;
  
  constructor(accountId: string, data: any = {}) {
    this.accountId = accountId;
    this.data = data;
    this.createdAt = Date.now();
    this.lastActivity = Date.now();
  }
  
  public updateActivity(): void {
    this.lastActivity = Date.now();
  }
}

// Export the singleton instance getter
export default GameSessionManager;