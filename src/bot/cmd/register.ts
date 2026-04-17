import mongoose from "mongoose"; // ADD THIS LINE
import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import User from "../../db/models/User";
import Profiles from "../../db/models/Profiles";
import createProfiles from "../../utils/creationTools/createProfiles";
import Tournaments from "../../db/models/Tournaments";

function generateRandomPassword(length: number = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

function sanitizeEmail(username: string): string {
  // Remove any characters that aren't allowed in email local part
  return username.replace(/[^a-zA-Z0-9._+-]/g, '').toLowerCase();
}

export default {
  data: new SlashCommandBuilder()
    .setName("register")
    .setDescription("Create an Lyric account!")
    .addStringOption((opt) =>
      opt.setName("username")
        .setDescription("Username (no spaces, only letters, numbers, underscores)")
        .setRequired(true)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    const username = interaction.options.getString("username", true);

    // Check if username contains spaces
    if (username.includes(' ')) {
      return interaction.reply({
        content: "❌ Username cannot contain spaces. Please choose a username without spaces.",
        flags: 64,
      });
    }

    // Allow only letters, numbers, and underscores
    const validChars = /^[a-zA-Z0-9_]+$/;
    if (!validChars.test(username)) {
      return interaction.reply({
        content: "❌ Username can only contain letters, numbers, and underscores (_).",
        flags: 64,
      });
    }

    // Check username length
    if (username.length < 3) {
      return interaction.reply({
        content: "❌ Username must be at least 3 characters long.",
        flags: 64,
      });
    }

    if (username.length > 20) {
      return interaction.reply({
        content: "❌ Username cannot be longer than 20 characters.",
        flags: 64,
      });
    }

    // Check for restricted name "nigger" (case insensitive)
    const restrictedNameRegex = /nigger/i;
    if (restrictedNameRegex.test(username)) {
      return interaction.reply({
        content: "❌ This username is not allowed. Please choose a different username.",
        flags: 64,
      });
    }

    // Generate automatic credentials using Discord username
    const discordUsername = interaction.user.username;
    const sanitizedDiscordName = sanitizeEmail(discordUsername);
    const email = `${sanitizedDiscordName}@Lyric.dev`;
    const rawPassword = generateRandomPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const accountId = uuidv4().replace(/-/g, "");
    const userProfile = await createProfiles(accountId);

    const exist = await User.findOne({ discordId: interaction.user.id });
    if (exist) {
      return interaction.reply({
        content: "❌ You already have an account. Please delete it via /delete!",
        flags: 64,
      });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return interaction.reply({
        content: "❌ Username is already being used.",
        flags: 64,
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      // If email exists, add a random number to make it unique
      const uniqueEmail = `${sanitizedDiscordName}${Math.floor(Math.random() * 1000)}@Lyric.dev`;
      return await this.completeRegistration(interaction, username, uniqueEmail, rawPassword, hashedPassword, accountId, userProfile);
    }

    await this.completeRegistration(interaction, username, email, rawPassword, hashedPassword, accountId, userProfile);
  },

  async completeRegistration(interaction: ChatInputCommandInteraction, username: string, email: string, rawPassword: string, hashedPassword: string, accountId: string, userProfile: any) {
    try {
      await User.create({
        accountId,
        username,
        email,
        password: hashedPassword,
        plainPassword: rawPassword, // Store plain password for game login
        created: new Date(),
        banned: false,
        discordId: interaction.user.id,
      });

      await Profiles.create({
        accountId,
        discordId: interaction.user.id,
        profiles: userProfile,
        created: new Date().toISOString(),
        access_token: "",
        refresh_token: "",
      });

      await Tournaments.create({
        accountId,
        hype: 0,
        divisions: ["NormalArenaDiv1"],
      });

      // Create the public embed (ephemeral)
      const publicEmbed = new EmbedBuilder()
        .setTitle("🎉 Welcome to Lyric!")
        .setDescription(
          `Welcome **${username}**! Your account has been successfully created.\n\n📬 **Check your DMs for login credentials!**`
        )
        .addFields(
          { name: "👤 Username", value: username, inline: true },
          { name: "🆔 Account ID", value: `\`${accountId}\``, inline: true }
        )
        .setColor("#00FF99")
        .setTimestamp()
        .setFooter({
          text: "Use /details to view your account information",
        });

      await interaction.reply({
        embeds: [publicEmbed],
        flags: 64, // Ephemeral
      });

      // Send DM with sensitive credentials
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🔐 Your Lyric Login Credentials")
          .setDescription("Here are your account details. **Keep these safe and secure!**")
          .addFields(
            { name: "👤 In-Game Username", value: `\`${username}\``, inline: true },
            { name: "📧 Email", value: `\`${email}\``, inline: true },
            { name: "🔑 Password", value: `\`${rawPassword}\``, inline: true },
            { name: "🆔 Account ID", value: `\`${accountId}\``, inline: false },
            { name: "🌐 Login Info", value: `**Email:** \`${email}\`\n**Password:** \`${rawPassword}\``, inline: false }
          )
          .setColor("#FF9900")
          .setTimestamp()
          .setFooter({
            text: "Do not share these credentials with anyone!",
          });

        await interaction.user.send({ embeds: [dmEmbed] });
      } catch (dmError) {
        // If DM fails, send a follow-up message in the channel (still ephemeral)
        const followUpEmbed = new EmbedBuilder()
          .setTitle("⚠️ Enable DMs for Credentials")
          .setDescription(`I couldn't send you a DM with your login credentials. Please enable DMs from server members and use the command again, or contact support.\n\n**Your temporary credentials:**\n**Email:** \`${email}\`\n**Password:** \`${rawPassword}\``)
          .setColor("#FF3333")
          .setTimestamp();

        await interaction.followUp({
          embeds: [followUpEmbed],
          flags: 64,
        });
      }

    } catch (err) {
      console.error("Registration error:", err);
      return await interaction.reply({
        content: "❌ Could not create your account. Please contact support!",
        flags: 64,
      });
    }
  }
};