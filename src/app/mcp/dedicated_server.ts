import app from "../..";
import Profiles from "../../db/models/Profiles";
import { applyProfileChanges } from "../../utils/handling/applyProfileChanges";
import GameSessionManager from "../../utils/gameSessions";

export default function () {
  app.post(
    "/fortnite/api/game/v2/profile/:accountId/dedicated_server/QueryProfile",
    async (c) => {
      const accountId = c.req.param("accountId");
      // Register this as an active session
      if (accountId) {
        GameSessionManager.getInstance().createSession(accountId);
      }
      
      let profileId = c.req.query("profileId") ?? "athena";
      var profiles: any = await Profiles.findOne({
        accountId: accountId,
      });

      let profile = profiles?.profiles[profileId];
      if (!profile || !profiles) {
        return c.json({
          profileRevision: 0,
          profileId: profileId,
          profileChangesBaseRevision: 0,
          profileChanges: [],
          profileCommandRevision: 0,
          serverTime: new Date().toISOString(),
          multiUpdate: [],
          responseVersion: 1,
        });
      }

      if (!profile && profileId !== "athena" && profileId !== "common_core") {
        return c.json({
          profileRevision: profile.rvn || 0,
          profileId: profileId,
        });
      }

      const response = await applyProfileChanges(profile, profileId, profiles);

      return c.json(response);
    }
  );

  app.post(
    "/fortnite/api/game/v2/profile/:accountId/client/QueryProfile",
    async (c) => {
      const accountId = c.req.param("accountId");
      // Register this as an active session
      if (accountId) {
        GameSessionManager.getInstance().createSession(accountId);
      }
      
      let profileId = c.req.query("profileId") ?? "athena";
      var profiles: any = await Profiles.findOne({
        accountId: accountId,
      });
      let profile = profiles?.profiles[profileId];
      if (!profile || !profiles) {
        return c.json({
          profileRevision: 0,
          profileId: profileId,
          profileChangesBaseRevision: 0,
          profileChanges: [],
          profileCommandRevision: 0,
          serverTime: new Date().toISOString(),
          multiUpdate: [],
          responseVersion: 1,
        });
      }

      if (!profile && profileId !== "athena" && profileId !== "common_core") {
        return c.json({
          profileRevision: profile.rvn || 0,
          profileId: profileId,
        });
      }

      const response = await applyProfileChanges(profile, profileId, profiles);

      return c.json(response);
    }
  );
}