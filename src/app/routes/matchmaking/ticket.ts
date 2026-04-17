import app from "../../..";
import { getVersion } from "../../../utils/handling/getVersion";
import jwt from "jsonwebtoken";
import Matchmaking from "../../../db/models/Matchmaking";

export let bucket: any;
export let playerData: { region: string; playlist: string } = { region: "EU", playlist: "playlist_defaultsolo" };

export default function () {
  app.get(
    "/fortnite/api/game/v2/matchmakingservice/ticket/player/:accountId",
    async (c) => {
      const ver = await getVersion(c);
      if (!ver) return c.json({ error: "Incorrect HTTP Method" });

      const query = await c.req.query();
      const bucketId = query.bucketId;
      const split = bucketId?.split(":");
      const region = split?.[2] || "EU";
      const playlist = split?.[3] || "playlist_defaultsolo";

      bucket = bucketId;
      playerData = { region, playlist };

      const secret = "23tsxgdfxu563wawrasgd";
      // vortex here, just so u know, the rest of this code is yours

      // Token erzeugen
      let matchmakingData = jwt.sign(
        {
          accountId: c.req.param("accountId"),
          region: region,
          playlist: playlist,
          bucket: bucketId,
          version: ver.cl,
        },
        secret
      );

      const data = matchmakingData.split(".");

      // --- HIER Matchmaking-Eintrag anlegen/aktualisieren ---
      const accountId = c.req.param("accountId");
      let matchmaking = await Matchmaking.findOne({ accountId });

      if (matchmaking) {
        matchmaking.region = region ?? "";     // fallback auf leeren String
        matchmaking.playlist = playlist ?? "";
        matchmaking.bucket = bucketId ?? "";
        matchmaking.version = String(ver.cl);  // Zahl zu String konvertieren
        await matchmaking.save();
      } else {
        matchmaking = new Matchmaking({
          accountId,
          region,
          playlist,
          bucket: bucketId,
          version: ver.cl
        });
        await matchmaking.save();
      }
      // ------------------------------------------------------

      // Matchmaker WebSocket connection info
      const mmip = process.env.MMIP || "127.0.0.1";
      const mmport = process.env.MMPORT || "8888";

      return c.json({
        serviceUrl: `ws://${mmip}:${mmport}`,
        ticketType: "mms-player",
        payload: data[0] + "." + data[1],
        signature: data[2],
      });
    }
  );
}
