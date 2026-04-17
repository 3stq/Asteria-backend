import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import Tournaments from "../../db/models/Tournaments";
import { sendHypeUpdate } from "../../utils/handling/sendHypeUpdate";

const ADMIN_ROLE = "1460336894926782494";

export default {
  data: new SlashCommandBuilder()
    .setName("addhype")
    .setDescription("Add Arena Hype to a user and force a lobby refresh.")
    .addStringOption((opt) =>
      opt.setName("user").setDescription("Target user's Discord ID").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Hype to add (e.g., 100)").setRequired(true)
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Refresh trigger (used only to nudge the client)")
        .addChoices(
          { name: "Kill (default)", value: "Kill" },
          { name: "Top5", value: "Top5" },
          { name: "Top10", value: "Top10" },
        )
        .setRequired(false)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    // Permission check
    if (
      !interaction.member ||
      !("roles" in interaction.member) ||
      !interaction.member.roles.cache.has(ADMIN_ROLE)
    ) {
      await interaction.reply({
        content: "❌ You don't have permission to use this command.",
        flags: 64, // Only user can see
      });
      return;
    }

    const discordId = interaction.options.getString("user", true);
    const amountToAdd = interaction.options.getInteger("amount", true);
    const reason = (interaction.options.getString("reason") as "Kill" | "Top5" | "Top10") || "Kill";

    try {
      // 1) Find the user
      const user = await User.findOne({ discordId });
      if (!user) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("User not found")
              .setDescription(`No user with Discord ID \`${discordId}\`.`)
              .setColor("Red"),
          ],
          flags: 64, // Only user can see
        });
        return;
      }

      // 2) Get current hype values
      const currentDoc = await Profiles.findOne({ accountId: user.accountId });

      if (!currentDoc) {
        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setTitle("Profile not found")
              .setDescription(`No profile for account \`${user.accountId}\`.`)
              .setColor("Red"),
          ],
          flags: 64, // Only user can see
        });
        return;
      }

      const oldProfileHype =
        currentDoc?.profiles?.athena?.stats?.attributes?.current_hype ??
        currentDoc?.profiles?.athena?.stats?.attributes?.arena_hype ??
        0;
      
      const oldTournamentHype = (await Tournaments.findOne({ accountId: user.accountId }))?.hype ?? oldProfileHype;
      const oldRvn = currentDoc?.profiles?.athena?.rvn ?? 0;

      // 3) Calculate new hype values (ADD instead of SET)
      const newProfileHype = oldProfileHype + amountToAdd;
      const newTournamentHype = oldTournamentHype + amountToAdd;

      // 4) Update Tournaments collection (LEADERBOARD HYPE)
      let tournament = await Tournaments.findOne({ accountId: user.accountId });
      
      if (!tournament) {
        tournament = await Tournaments.create({
          accountId: user.accountId,
          hype: newTournamentHype,
          divisions: ["NormalArenaDiv1"]
        });
      } else {
        tournament.hype = newTournamentHype;
        await tournament.save();
      }

      // 5) Update Profiles collection (GAME HYPE)
      const setPaths: Record<string, any> = {
        "profiles.athena.stats.attributes.current_hype": newProfileHype,
        "profiles.athena.stats.attributes.arena_hype": newProfileHype,
        "profiles.athena.stats.attributes.current_hype_v2": newProfileHype,
        "profiles.athena._lastHypeUpdateAt": new Date(),
      };

      await Profiles.updateOne(
        { accountId: user.accountId },
        { $set: setPaths, $inc: { "profiles.athena.rvn": 1 } }
      );

      // 6) Trigger lobby refresh
      const username =
        (user as any).username ||
        (user as any).displayName ||
        (user as any).epicName ||
        user.accountId;

      sendHypeUpdate(String(username), reason).catch((e) =>
        console.warn("[addhype] sendHypeUpdate failed:", e?.message || e)
      );

      // 7) Re-fetch to confirm saved values
      const savedProfile = await Profiles.findOne({ accountId: user.accountId });
      const savedTournament = await Tournaments.findOne({ accountId: user.accountId });

      const confirmedProfileHype =
        savedProfile?.profiles?.athena?.stats?.attributes?.current_hype ??
        savedProfile?.profiles?.athena?.stats?.attributes?.arena_hype ??
        newProfileHype;
      
      const confirmedTournamentHype = savedTournament?.hype ?? newTournamentHype;
      const newRvn = savedProfile?.profiles?.athena?.rvn ?? oldRvn + 1;

      // 8) Success embed (EPHEMERAL - only user can see)
      const embed = new EmbedBuilder()
        .setTitle("✅ Arena Hype Added")
        .setColor("Green")
        .addFields(
          { name: "User", value: `<@${discordId}> (\`${discordId}\`)`, inline: true },
          { name: "Account ID", value: `\`${user.accountId}\``, inline: true },
          { name: "Refresh Trigger", value: `\`${reason}\``, inline: true },
          { name: "Hype Added", value: `**+${amountToAdd}**`, inline: true },
          { name: "Old Hype", value: `**${oldProfileHype}**`, inline: true },
          { name: "New Profile Hype", value: `**${confirmedProfileHype}**`, inline: true },
          { name: "New Leaderboard Hype", value: `**${confirmedTournamentHype}**`, inline: true },
          { name: "Athena RVN", value: `\`${oldRvn} → ${newRvn}\``, inline: true },
        )
        .setFooter({ text: "Hype added to both Profile and Leaderboard databases" });

      await interaction.reply({ 
        embeds: [embed],
        flags: 64 // ← THIS MAKES IT ONLY VISIBLE TO THE USER
      });

    } catch (err) {
      console.error("[/addhype] error:", err);
      await interaction.reply({ 
        content: "❌ Error while adding hype.", 
        flags: 64 // Only user can see
      });
    }
  },
};