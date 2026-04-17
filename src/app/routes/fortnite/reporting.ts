import app from "../../..";
import { Client, GatewayIntentBits, TextChannel } from "discord.js";
import User from "../../../db/models/User";
import Profiles from "../../../db/models/Profiles";

const bEnableReports = process.env.bEnableReports;
const bReportChannelId = process.env.bReportChannelId;
const discordBotToken = process.env.DISCORD_TOKEN;

export default function () {
  app.post("/fortnite/api/game/v2/toxicity/account/:unsafeReporter/report/:reportedPlayer", async (c) => {
    if (!bEnableReports) {
      return c.json({ error: "Reports disabled" }, 403);
    }

    try {
      const reporter = c.req.param("unsafeReporter");
      const reportedPlayer = c.req.param("reportedPlayer");

      const reporterData = await User.findOne({ accountId: reporter }).lean();
      const reportedPlayerData = await User.findOne({ accountId: reportedPlayer }).lean();
      const reportedPlayerDataProfile = await Profiles.findOne({ accountId: reportedPlayer }).lean();

      if (!reportedPlayerData) {
        return c.json({ error: "Player not found" }, 404);
      }

      const body = await c.req.json();
      const reason = body.reason || "No reason provided";
      const details = body.details || "No details provided";
      const playerAlreadyReported = reportedPlayerDataProfile?.profiles?.totalReports ? "Yes" : "No";

      await Profiles.findOneAndUpdate(
        { accountId: reportedPlayer },
        { $inc: { "profiles.totalReports": 1 } },
        { new: true, upsert: true }
      );

      const client = new Client({
        intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
      });

      await new Promise<void>((resolve, reject) => {
        client.once("ready", async () => {
          try {
            const payload = {
              embeds: [
                {
                  title: "New User Report",
                  description: "A new report has arrived!",
                  color: 0xffa500,
                  fields: [
                    { name: "Reporting Player", value: reporterData?.username || reporter, inline: true },
                    { name: "Reported Player", value: reportedPlayerData.username, inline: true },
                    { name: "Player already reported", value: playerAlreadyReported, inline: false },
                    { name: "Reason", value: reason, inline: true },
                    { name: "Additional Details", value: details, inline: true },
                  ],
                },
              ],
            };

            if (!bReportChannelId) {
              throw new Error("bReportChannelId is not defined in environment variables.");
            }
            const channel = await client.channels.fetch(bReportChannelId as string);
            if (channel instanceof TextChannel && payload.embeds && payload.embeds[0]) {
              await channel.send({ embeds: [payload.embeds[0]] });
            }
            
            resolve();
          } catch (err) {
            reject(err);
          }
        });

        client.login(discordBotToken).catch((err) => reject(err));
      });

      return c.json({ success: true });
    } catch (err) {
      return c.json({ error: "Internal server error" }, 500);
    }
  });
}
