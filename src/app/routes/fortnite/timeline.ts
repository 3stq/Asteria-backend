import app from "../../..";
import { getVersion } from "../../../utils/handling/getVersion";

export default function () {
  app.get("/fortnite/api/calendar/v1/timeline", async (c) => {
    const today = new Date();
    today.setHours(17, 0, 0, 0);
    const date = today.toISOString();

    const ver = await getVersion(c);
    if (!ver) return c.json({ error: "Incorrect HTTP Method" });

    return c.json({
      channels: {
        "client-matchmaking": {
          states: [],
          cacheExpire: "9999-01-01T22:28:47.830Z",
        },
        "client-events": {
          states: [
            {
              validFrom: "2020-01-01T00:00:00.000Z",
              activeEvents: [
                {
                  eventType: `EventFlag.Season${ver.build}`,
                  activeUntil: "9999-01-01T00:00:00.000Z",
                  activeSince: "2020-01-01T00:00:00.000Z",
                },
                {
                  eventType: `EventFlag.LobbySeason${ver.build}`,
                  activeUntil: "9999-01-01T00:00:00.000Z",
                  activeSince: "2020-01-01T00:00:00.000Z",
                },
              ],
              state: {
                activeStorefronts: [],
                eventNamedWeights: {},
                seasonNumber: ver.build,
                seasonTemplateId: `AthenaSeason:athenaseason${ver.build}`,
                matchXpBonusPoints: 0,
                seasonBegin: "2020-01-01T13:00:00Z",
                seasonEnd: "9999-01-01T14:00:00Z",
                seasonDisplayedEnd: "9999-01-01T07:30:00Z",
                weeklyStoreEnd: date,
                stwEventStoreEnd: "9999-01-01T00:00:00.000Z",
                stwWeeklyStoreEnd: "9999-01-01T00:00:00.000Z",
                sectionStoreEnds: {
                  Featured: date,
                },
                dailyStoreEnd: date,
              },
            },
          ],
          cacheExpire: "9999-01-01T22:28:47.830Z",
        },
      },
      eventsTimeOffsetHrs: 0,
      cacheIntervalMins: 10,
      currentTime: new Date().toISOString(),
    });
  });
}
