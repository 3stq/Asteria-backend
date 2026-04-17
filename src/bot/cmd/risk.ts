import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
} from "discord.js";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import { giveFullLocker } from "../../utils/handling/giveFullLocker";

const RISK_COOLDOWN = new Map<string, number>(); // User ID -> timestamp
const COOLDOWN_TIME = 5000; // 5 seconds between games
const MOD_LOG_CHANNEL_ID = "1396150414348390540";
const JACKPOT_THRESHOLD = 50000; // 50,000 V-Bucks for jackpot chance
const JACKPOT_ODDS = 0.001; // 0.1% chance for jackpot

export const data = new SlashCommandBuilder()
  .setName("risk")
  .setDescription("Risk your V-Bucks in a color guessing game!")
  .addIntegerOption(option =>
    option
      .setName("amount")
      .setDescription("Amount of V-Bucks to risk (minimum 10,000)")
      .setRequired(true)
      .setMinValue(10000)
  )
  .addStringOption(option =>
    option
      .setName("color")
      .setDescription("Choose your color")
      .setRequired(true)
      .addChoices(
        { name: "🔴 Red", value: "red" },
        { name: "⚫ Black", value: "black" }
      )
  );

export async function execute(interaction: ChatInputCommandInteraction) {
  try {
    const amount = interaction.options.getInteger("amount", true);
    const chosenColor = interaction.options.getString("color", true) as "red" | "black";

    // Check cooldown
    const cooldown = RISK_COOLDOWN.get(interaction.user.id);
    if (cooldown && Date.now() - cooldown < COOLDOWN_TIME) {
      const remaining = Math.ceil((COOLDOWN_TIME - (Date.now() - cooldown)) / 1000);
      return interaction.reply({
        content: `⏰ Please wait ${remaining} seconds before playing again.`,
        flags: 64,
      });
    }

    // Find user in database
    const user = await User.findOne({ discordId: interaction.user.id });
    if (!user) {
      return interaction.reply({
        content: "❌ You need to have an Lyric account to play. Use `/register` first.",
        flags: 64,
      });
    }

    // Get user's current V-Bucks
    const profile = await Profiles.findOne({ accountId: user.accountId });
    if (!profile) {
      return interaction.reply({
        content: "❌ Could not find your profile data.",
        flags: 64,
      });
    }

    const currentVbucks = 
      profile.profiles?.common_core?.items?.["Currency:MtxPurchased"]?.quantity ?? 0;

    if (currentVbucks < amount) {
      return interaction.reply({
        content: `❌ You don't have enough V-Bucks! You need ${amount.toLocaleString()} but only have ${currentVbucks.toLocaleString()}.`,
        flags: 64,
      });
    }

    // Set cooldown
    RISK_COOLDOWN.set(interaction.user.id, Date.now());

    // Create confirmation embed
    const confirmEmbed = new EmbedBuilder()
      .setTitle("🎰 Risk Game")
      .setDescription(`You're about to risk **${amount.toLocaleString()} V-Bucks** on **${chosenColor === "red" ? "🔴 Red" : "⚫ Black"}**`)
      .addFields(
        { name: "Current Balance", value: `${currentVbucks.toLocaleString()} V-Bucks`, inline: true },
        { name: "Potential Win", value: `${(amount * 2).toLocaleString()} V-Bucks`, inline: true },
        { name: "Potential Loss", value: `${amount.toLocaleString()} V-Bucks`, inline: true }
      )
      .setColor(chosenColor === "red" ? 0xff0000 : 0x000000)
      .setFooter({ text: "Spin the wheel and test your luck!" });

    const confirmRow = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId("confirm_spin")
          .setLabel("🎰 Spin the Wheel!")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("cancel_spin")
          .setLabel("❌ Cancel")
          .setStyle(ButtonStyle.Danger)
      );

    const response = await interaction.reply({
      embeds: [confirmEmbed],
      components: [confirmRow],
      flags: 64,
    });

    // Create collector for button interactions
    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 30000, // 30 seconds to respond
    });

    collector.on("collect", async (buttonInteraction) => {
      if (buttonInteraction.user.id !== interaction.user.id) {
        await buttonInteraction.reply({
          content: "❌ This is not your game!",
          flags: 64,
        });
        return;
      }

      if (buttonInteraction.customId === "cancel_spin") {
        await buttonInteraction.update({
          content: "❌ Game cancelled.",
          embeds: [],
          components: [],
        });
        collector.stop();
        return;
      }

      if (buttonInteraction.customId === "confirm_spin") {
        // Disable buttons immediately
        await buttonInteraction.update({
          components: [],
        });

        // Simulate wheel spinning with delay for suspense
        const spinningEmbed = new EmbedBuilder()
          .setTitle("🎰 Spinning the Wheel...")
          .setDescription("The wheel is spinning...")
          .setColor(0xffff00)
          .setFooter({ text: "Good luck!" });

        await buttonInteraction.editReply({
          embeds: [spinningEmbed],
        });

        // Add suspense delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Check for jackpot (only if betting 50k+)
        let jackpotWon = false;
        if (amount >= JACKPOT_THRESHOLD) {
          const jackpotRoll = Math.random();
          if (jackpotRoll <= JACKPOT_ODDS) {
            jackpotWon = true;
          }
        }

        // Calculate result with hidden 65-35% odds (unless jackpot won)
        let userWins, winningColor;
        if (jackpotWon) {
          userWins = true;
          winningColor = chosenColor; // Force win for jackpot
        } else {
          const random = Math.random();
          userWins = chosenColor === "red" ? random <= 0.35 : random <= 0.35;
          winningColor = userWins ? chosenColor : (chosenColor === "red" ? "black" : "red");
        }

        // Update V-Bucks balance
        let newVbucks;
        if (userWins) {
          if (jackpotWon) {
            newVbucks = currentVbucks + amount; // Keep their bet + win amount
          } else {
            newVbucks = currentVbucks + amount; // Double their money
          }
        } else {
          newVbucks = currentVbucks - amount;
        }

        // Update database
        await Profiles.updateOne(
          { accountId: user.accountId },
          { 
            $set: { 
              "profiles.common_core.items.Currency:MtxPurchased.quantity": newVbucks 
            } 
          }
        );

        // Grant full locker if jackpot won
        if (jackpotWon) {
          try {
            await giveFullLocker(user.accountId);
          } catch (lockerError) {
            console.error("[risk] Failed to grant full locker:", lockerError);
          }
        }

        // Update risk stats in database for leaderboard
        try {
          const { updateRiskStats } = await import("./riskleaderboard");
          await updateRiskStats(
            interaction.user.id,
            interaction.user.username,
            amount,
            userWins,
            jackpotWon
          );
        } catch (statsError) {
          console.error('[/risk] Failed to update risk stats:', statsError);
        }

        // Create result embed
        let resultEmbed;
        if (jackpotWon) {
          resultEmbed = new EmbedBuilder()
            .setTitle("🎊 JACKPOT! 🎊")
            .setDescription(`**UNBELIEVABLE!** You hit the **JACKPOT**!`)
            .addFields(
              { name: "🎰 Game Result", value: `The wheel landed on **${winningColor === "red" ? "🔴 Red" : "⚫ Black"}**!`, inline: true },
              { name: "💰 V-Bucks Won", value: `**${amount.toLocaleString()} V-Bucks**`, inline: true },
              { name: "🎁 Jackpot Prize", value: "**FULL LOCKER UNLOCKED!**", inline: true },
              { name: "🎉 Total Winnings", value: `**${amount.toLocaleString()} V-Bucks + Full Locker**`, inline: false },
              { name: "🏆 New Balance", value: `${newVbucks.toLocaleString()} V-Bucks`, inline: true }
            )
            .setColor(0xffd700) // Gold color for jackpot
            .setFooter({ text: "LEGENDARY WIN! You are one of the lucky few!" });
        } else {
          resultEmbed = new EmbedBuilder()
            .setTitle(userWins ? "🎉 You Won!" : "💀 You Lost!")
            .setDescription(
              userWins 
                ? `The wheel landed on **${winningColor === "red" ? "🔴 Red" : "⚫ Black"}**! You won **${amount.toLocaleString()} V-Bucks**!`
                : `The wheel landed on **${winningColor === "red" ? "🔴 Red" : "⚫ Black"}**! You lost **${amount.toLocaleString()} V-Bucks**.`
            )
            .addFields(
              { name: "Your Choice", value: chosenColor === "red" ? "🔴 Red" : "⚫ Black", inline: true },
              { name: "Winning Color", value: winningColor === "red" ? "🔴 Red" : "⚫ Black", inline: true },
              { name: "Amount Risked", value: `${amount.toLocaleString()} V-Bucks`, inline: true },
              { name: "Result", value: userWins ? `+${amount.toLocaleString()} V-Bucks` : `-${amount.toLocaleString()} V-Bucks`, inline: true },
              { name: "New Balance", value: `${newVbucks.toLocaleString()} V-Bucks`, inline: true }
            )
            .setColor(userWins ? 0x00ff00 : 0xff0000)
            .setFooter({ 
              text: userWins 
                ? "Congratulations! Want to play again?" 
                : "Better luck next time! The house always wins..." 
            });
        }

        const playAgainRow = new ActionRowBuilder<ButtonBuilder>()
          .addComponents(
            new ButtonBuilder()
              .setCustomId("play_again")
              .setLabel("🎰 Play Again")
              .setStyle(ButtonStyle.Primary)
          );

        await buttonInteraction.editReply({
          embeds: [resultEmbed],
          components: [playAgainRow],
        });

        // Log to mod channel
        await this.logGamble(interaction, {
          userId: interaction.user.id,
          username: interaction.user.tag,
          amount: amount,
          chosenColor: chosenColor,
          winningColor: winningColor,
          userWins: userWins,
          jackpotWon: jackpotWon,
          oldBalance: currentVbucks,
          newBalance: newVbucks
        });

        // Handle play again button
        const playAgainCollector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 30000,
        });

        playAgainCollector.on("collect", async (playAgainInteraction) => {
          if (playAgainInteraction.user.id !== interaction.user.id) {
            await playAgainInteraction.reply({
              content: "❌ This is not your game!",
              flags: 64,
            });
            return;
          }

          if (playAgainInteraction.customId === "play_again") {
            await playAgainInteraction.update({
              content: "Use `/risk` command again to play!",
              embeds: [],
              components: [],
            });
          }
        });

        playAgainCollector.on("end", () => {
          // Remove buttons when collector ends
          buttonInteraction.editReply({
            components: [],
          }).catch(() => {});
        });

        collector.stop();
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        interaction.editReply({
          content: "⏰ Game timed out. Use `/risk` to play again.",
          components: [],
        }).catch(() => {});
      }
    });

  } catch (error) {
    console.error("[/risk] error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({
        content: "❌ An error occurred while processing the game.",
      });
    } else {
      await interaction.reply({
        content: "❌ An error occurred while processing the game.",
        flags: 64,
      });
    }
  }
}

async function logGamble(
  interaction: ChatInputCommandInteraction,
  data: {
    userId: string;
    username: string;
    amount: number;
    chosenColor: string;
    winningColor: string;
    userWins: boolean;
    jackpotWon: boolean;
    oldBalance: number;
    newBalance: number;
  }
) {
  try {
    const logChannel = await interaction.client.channels.fetch(MOD_LOG_CHANNEL_ID) as TextChannel;
    if (logChannel) {
      const logEmbed = new EmbedBuilder()
        .setTitle(data.jackpotWon ? "🎊 JACKPOT HIT!" : data.userWins ? "🟢 Gamble Win" : "🔴 Gamble Loss")
        .setColor(data.jackpotWon ? 0xffd700 : data.userWins ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: "Player", value: `${data.username} (${data.userId})`, inline: true },
          { name: "Amount", value: `${data.amount.toLocaleString()} V-Bucks`, inline: true },
          { name: "Chosen Color", value: data.chosenColor === "red" ? "🔴 Red" : "⚫ Black", inline: true },
          { name: "Winning Color", value: data.winningColor === "red" ? "🔴 Red" : "⚫ Black", inline: true },
          { name: "Result", value: data.jackpotWon ? "🎊 JACKPOT" : data.userWins ? "WIN" : "LOSS", inline: true },
          { name: "Balance Change", value: `${data.oldBalance.toLocaleString()} → ${data.newBalance.toLocaleString()}`, inline: true },
          { name: "Net Change", value: data.userWins ? `+${data.amount.toLocaleString()}` : `-${data.amount.toLocaleString()}`, inline: true }
        )
        .setTimestamp();

      if (data.jackpotWon) {
        logEmbed.addFields({
          name: "🎁 Jackpot Prize",
          value: "Full Locker Granted",
          inline: false
        });
      }

      await logChannel.send({ embeds: [logEmbed] });
    }
  } catch (logError) {
    console.warn("[/risk] Failed to send log:", logError);
  }
}

export default { data, execute };