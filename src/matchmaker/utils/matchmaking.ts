import Matchmaking from "../db/models/Matchmaking";
import { gameservers, sessions, regionServers } from "./index";
import { v4 as uuid } from "uuid";

// Store active WebSocket connections
export const playerConnections = new Map<string, any>();

// Get server for region
export function getServerForRegion(region: string) {
  const normalizedRegion = region.toUpperCase();
  
  // Check if we have a specific server for this region
  if (regionServers[normalizedRegion]) {
    return regionServers[normalizedRegion];
  }
  
  // Fallback to default
  console.warn(`⚠️ No server configured for region: ${region}, using default`);
  return regionServers["default"] || { ip: "184.105.7.162", port: 7777 };
}

// Ensure a server exists for the region
export function ensureRegionServer(region: string, playlist: string = "playlist_default") {
  const server = getServerForRegion(region);
  const normalizedRegion = region.toUpperCase();
  
  // Check if server already exists in gameservers
  const existingIndex = gameservers.findIndex(
    (gs: any) => gs.region === normalizedRegion && 
               gs.ip === server.ip && 
               gs.port === server.port &&
               gs.playlist === playlist
  );
  
  if (existingIndex === -1) {
    // Add the server
    const newServer = {
      region: normalizedRegion,
      ip: server.ip,
      port: server.port,
      playlist: playlist,
      id: uuid().replace(/-/g, ""),
      key: false,
    };
    
    gameservers.push(newServer);
    console.log(`✅ Created ${normalizedRegion} server: ${server.ip}:${server.port} for ${playlist}`);
    return newServer;
  }
  
  return gameservers[existingIndex];
}

// Add player to matchmaking queue with region
export async function addToMatchmaking(
  accountId: string,
  username: string,
  playlist: string = "playlist_default",
  region: string = "NAE"
) {
  try {
    // Normalize region
    const normalizedRegion = region.toUpperCase();
    
    // Check if region is valid
    if (!Object.keys(regionServers).includes(normalizedRegion) && normalizedRegion !== "DEFAULT") {
      return {
        success: false,
        error: `Invalid region: ${region}. Available: ${Object.keys(regionServers).filter(r => r !== "default").join(", ")}`
      };
    }

    // Check if already in queue
    const existing = await Matchmaking.findOne({ accountId });
    if (existing && existing.status !== "cancelled") {
      return {
        success: false,
        error: "Already in matchmaking queue",
        status: existing.status
      };
    }

    // Remove any old entries
    await Matchmaking.deleteOne({ accountId });

    // Create new matchmaking entry
    const matchmakingEntry = new Matchmaking({
      accountId,
      username,
      playlist,
      region: normalizedRegion,
      status: "searching",
      joinedAt: new Date()
    });

    await matchmakingEntry.save();
    console.log(`✅ ${username} (${accountId}) joined ${normalizedRegion} queue for ${playlist}`);

    // Ensure server exists for this region
    ensureRegionServer(normalizedRegion, playlist);

    // Try to find match immediately
    const matchResult = await tryFindMatch(matchmakingEntry);

    return {
      success: true,
      message: `Ready for matchmaking in ${normalizedRegion}`,
      region: normalizedRegion,
      ...matchResult
    };

  } catch (error: any) {
    console.error("Matchmaking error:", error);
    return { success: false, error: error.message };
  }
}

// Find match for player with region matching
export async function tryFindMatch(player: any) {
  const { playlist, region, accountId } = player;

  // Find other players searching for same playlist AND region
  const potentialMatches = await Matchmaking.find({
    status: "searching",
    playlist,
    region, // Match by region too!
    accountId: { $ne: accountId }
  }).sort({ joinedAt: 1 }).limit(99);

  console.log(`🔍 Searching ${region} ${playlist}: ${potentialMatches.length} potential matches`);

  if (potentialMatches.length >= 0) { // Start with 1 player for testing
    // Create match with region-specific server
    return await createMatch([player, ...potentialMatches.slice(0, 99)]);
  }

  const queueCount = await Matchmaking.countDocuments({ 
    status: "searching", 
    playlist,
    region 
  });

  return {
    matched: false,
    queuePosition: queueCount,
    estimatedWait: "10-30 seconds",
    region: region
  };
}

// Create a match with region-specific server
export async function createMatch(players: any[]) {
  if (players.length === 0) return { matched: false, error: "No players" };

  const matchId = uuid().replace(/-/g, "");
  const sessionId = uuid().replace(/-/g, "");
  const playlist = players[0].playlist;
  const region = players[0].region;

  console.log(`🎯 Creating match in ${region} for ${playlist} with ${players.length} players`);

  // Get available server for this region
  const availableServer = gameservers.find(
    (gs: any) => gs.playlist === playlist && 
               gs.region === region && 
               !gs.key
  );

  if (!availableServer) {
    console.log(`❌ No available ${region} servers for ${playlist}`);
    
    // Try to create one
    const newServer = ensureRegionServer(region, playlist);
    if (newServer.key) {
      return { matched: false, error: `All ${region} servers are full` };
    }
    
    // Use the newly created server
    availableServer = newServer;
  }

  // Mark server as in use
  availableServer.key = true;

  console.log(`✅ Using ${region} server: ${availableServer.ip}:${availableServer.port}`);

  // Update all players
  for (const player of players) {
    await Matchmaking.findOneAndUpdate(
      { accountId: player.accountId },
      {
        status: "matched",
        matchId,
        sessionId,
        ip: availableServer.ip,
        port: availableServer.port,
        region: region // Ensure region is set
      }
    );

    // Notify player via WebSocket
    notifyPlayer(player.accountId, {
      type: "match_found",
      matchId,
      sessionId,
      region: region,
      server: {
        ip: availableServer.ip,
        port: availableServer.port,
        playlist: availableServer.playlist,
        region: availableServer.region
      },
      players: players.map((p: any) => ({
        accountId: p.accountId,
        username: p.username,
        region: p.region
      }))
    });
  }

  // Create session
  sessions.push({
    sessionId,
    matchId: availableServer.id,
    players: players.map((p: any) => p.accountId),
    server: {
      ip: availableServer.ip,
      port: availableServer.port,
      region: availableServer.region
    },
    region: region,
    playlist: playlist,
    createdAt: new Date()
  });

  console.log(`🎉 Match ${matchId} created in ${region} with ${players.length} players`);

  return {
    matched: true,
    matchId,
    sessionId,
    region: region,
    server: {
      ip: availableServer.ip,
      port: availableServer.port,
      region: availableServer.region
    },
    players: players.length
  };
}

// Notify player via WebSocket
export function notifyPlayer(accountId: string, data: any) {
  const ws = playerConnections.get(accountId);
  if (ws && ws.readyState === 1) { // WebSocket.OPEN
    ws.send(JSON.stringify(data));
    console.log(`📨 Sent ${data.type} to ${accountId} for ${data.region} match`);
  } else {
    console.log(`⚠️ No WebSocket connection for ${accountId}`);
  }
}

// Get available regions
export function getAvailableRegions() {
  return Object.keys(regionServers).filter(region => region !== "default");
}