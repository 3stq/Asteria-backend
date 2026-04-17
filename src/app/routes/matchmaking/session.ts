import { v4 } from "uuid";
import app from "../../..";
import { bucket, playerData } from "./ticket";

export default function () {
  app.get("/fortnite/api/matchmaking/session/findPlayer/*", (c) => {
    return c.body(null, 200);
  });

  app.get(
    "/fortnite/api/game/v2/matchmaking/account/:accountId/session/:sessionId",
    (c) => {
      const { accountId, sessionId } = c.req.param();
      return c.json({
        accountId,
        sessionId,
        key: "none",
      });
    }
  );

  app.get("/fortnite/api/matchmaking/session/:session_id", (c) => {
    const sessionId = c.req.param("session_id");

    const gameServerIP = process.env.GameserverIP || "45.92.217.104";
    const gameServerPort = parseInt(process.env.GameserverPort || "7777");

    const region = playerData?.region || "EU";
    const playlist = playerData?.playlist || "playlist_defaultsolo";
    const buildId = bucket ? bucket.split(":")[0] : "0";

    return c.json({
      id: sessionId,
      ownerId: v4().replace(/-/gi, "").toUpperCase(),
      ownerName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
      serverName: "[DS]fortnite-liveeugcec1c2e30ubrcore0a-z8hj-1968",
      serverAddress: gameServerIP,
      serverPort: gameServerPort,
      maxPublicPlayers: 220,
      openPublicPlayers: 175,
      maxPrivatePlayers: 0,
      openPrivatePlayers: 0,
      attributes: {
        REGION_s: region,
        GAMEMODE_s: "FORTATHENA",
        ALLOWBROADCASTING_b: true,
        SUBREGION_s: "GB",
        DCID_s: "FORTNITE-LIVEEUGCEC1C2E30UBRCORE0A-14840880",
        tenant_s: "Fortnite",
        MATCHMAKINGPOOL_s: "Any",
        STORMSHIELDDEFENSETYPE_i: 0,
        HOTFIXVERSION_i: 0,
        PLAYLISTNAME_s: playlist,
        SESSIONKEY_s: v4().replace(/-/gi, "").toUpperCase(),
        TENANT_s: "Fortnite",
        BEACONPORT_i: 7778,
      },
      publicPlayers: [],
      privatePlayers: [],
      totalPlayers: 45,
      allowJoinInProgress: false,
      shouldAdvertise: false,
      isDedicated: false,
      usesStats: false,
      allowInvites: false,
      usesPresence: false,
      allowJoinViaPresence: true,
      allowJoinViaPresenceFriendsOnly: false,
      buildUniqueId: buildId,
      lastUpdated: new Date().toISOString(),
      started: false,
    });
  });

  app.post("/fortnite/api/matchmaking/session/:sessionId/join", (c) => {
    return c.body(null, 204);
  });

  app.post("/fortnite/api/matchmaking/session/matchMakingRequest", (c) => {
    return c.json([]);
  });
}
