import { v4 as uuid } from "uuid";

import app from "../../..";
import Profiles from "../../../db/models/Profiles";
import { getVersion } from "../../../utils/handling/getVersion";
import fs from "fs";
import path from "path";

export default function () {
  app.post(
    "/fortnite/api/game/v2/profile/:accountId/client/ClientQuestLogin",
    async (c) => {
      const profileId = c.req.query("profileId") ?? "athena";

      var profiles: any = await Profiles.findOne({
        accountId: c.req.param("accountId"),
      });
      let profile = profiles?.profiles[profileId || "athena"];
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

      const ver = await getVersion(c);
      if (!ver) {
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

      let MultiUpdate: any = [];
      let BaseRevision = profile.rvn;
      let ApplyProfileChanges: any = [];

      profile.rvn += 1;
      profile.commandRevision += 1;
      profile.updated = new Date().toISOString();

      await profiles.updateOne({
        $set: {
          [`profiles.athena`]: profile,
        },
      });

      return c.json({
        profileRevision: profile.rvn,
        profileId,
        profileChangesBaseRevision: BaseRevision,
        profileChanges: ApplyProfileChanges,

        profileCommandRevision: profile.commandRevision,
        serverTime: new Date().toISOString(),
        multiUpdate: MultiUpdate,
        responseVersion: 1,
      });
    }
  );
}