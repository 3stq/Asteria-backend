// Simple, working presence service
export class PresenceService {
    static playerConnected(accountId: any, server: any) {
      throw new Error("Method not implemented.");
    }
    private static playerCount: number = 3; // Start with 3 test players

    // Get current online players count
    static getOnlinePlayerCount(): number {
        return this.playerCount;
    }

    // Add a player (increase count)
    static addPlayer(): void {
        this.playerCount++;
        console.log(`📊 Player added. Total: ${this.playerCount}`);
    }

    // Remove a player (decrease count)
    static removePlayer(): void {
        if (this.playerCount > 0) {
            this.playerCount--;
        }
        console.log(`📊 Player removed. Total: ${this.playerCount}`);
    }

    // Set specific count (for testing)
    static setPlayerCount(count: number): void {
        this.playerCount = count;
        console.log(`📊 Player count set to: ${this.playerCount}`);
    }
}