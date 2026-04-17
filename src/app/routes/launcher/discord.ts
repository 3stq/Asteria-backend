import app from "../../../index";
import User from "../../../db/models/User";
import { v4 as uuidv4 } from "uuid";
import { sign } from "hono/jwt";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:8080/api/launcher/discord/callback";

interface DiscordUser {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
    email?: string;
    global_name?: string;
}

interface DiscordTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token: string;
    scope: string;
}

async function exchangeCodeForToken(code: string): Promise<DiscordTokenResponse | null> {
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI
    });

    const response = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString()
    });

    if (!response.ok) return null;
    return response.json();
}

async function getDiscordUser(accessToken: string): Promise<DiscordUser | null> {
    const response = await fetch("https://discord.com/api/users/@me", {
        headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!response.ok) return null;
    return response.json();
}

export default function () {
    app.get("/api/launcher/discord/url", (c) => {
        const state = uuidv4();
        const scope = "identify email";

        const url = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;

        return c.json({ url, state });
    });

    app.get("/api/launcher/discord/callback", async (c) => {
        const code = c.req.query("code");

        if (!code) {
            return c.json({ success: false, error: "Missing authorization code" }, 400);
        }

        const tokenData = await exchangeCodeForToken(code);
        if (!tokenData) {
            return c.json({ success: false, error: "Failed to exchange code for token" }, 400);
        }

        const discordUser = await getDiscordUser(tokenData.access_token);
        if (!discordUser) {
            return c.json({ success: false, error: "Failed to get Discord user" }, 400);
        }

        let user = await User.findOne({ discordId: discordUser.id });

        if (!user) {
            return c.json({
                success: false,
                error: "No account linked to this Discord",
                discordId: discordUser.id,
                discordUsername: discordUser.global_name || discordUser.username,
                needsLink: true
            }, 404);
        }

        const accessToken = await sign({
            accountId: user.accountId,
            discordId: discordUser.id,
            type: "launcher"
        }, "Secret");

        return c.json({
            success: true,
            accessToken,
            accountId: user.accountId,
            username: user.username,
            discordId: discordUser.id,
            discordUsername: discordUser.global_name || discordUser.username
        });
    });

    app.post("/api/launcher/discord/link", async (c) => {
        const { email, password, discordId } = await c.req.json();

        if (!email || !password || !discordId) {
            return c.json({ success: false, error: "Missing required fields" }, 400);
        }

        const user = await User.findOne({ email });
        if (!user) {
            return c.json({ success: false, error: "User not found" }, 404);
        }

        const validPassword = await Bun.password.verify(password, user.password);
        if (!validPassword) {
            return c.json({ success: false, error: "Invalid password" }, 401);
        }

        const existingLink = await User.findOne({ discordId });
        if (existingLink && existingLink.accountId !== user.accountId) {
            return c.json({ success: false, error: "Discord already linked to another account" }, 400);
        }

        user.discordId = discordId;
        await user.save();

        const accessToken = await sign({
            accountId: user.accountId,
            discordId: discordId,
            type: "launcher"
        }, "Secret");

        return c.json({
            success: true,
            accessToken,
            accountId: user.accountId,
            username: user.username
        });
    });

    app.post("/api/launcher/discord/unlink", async (c) => {
        const { accountId, password } = await c.req.json();

        const user = await User.findOne({ accountId });
        if (!user) {
            return c.json({ success: false, error: "User not found" }, 404);
        }

        const validPassword = await Bun.password.verify(password, user.password);
        if (!validPassword) {
            return c.json({ success: false, error: "Invalid password" }, 401);
        }

        user.discordId = undefined;
        await user.save();

        return c.json({ success: true, message: "Discord unlinked" });
    });

    app.get("/api/launcher/discord/status/:accountId", async (c) => {
        const accountId = c.req.param("accountId");
        const user = await User.findOne({ accountId });

        if (!user) {
            return c.json({ success: false, error: "User not found" }, 404);
        }

        return c.json({
            success: true,
            linked: !!user.discordId,
            discordId: user.discordId || null
        });
    });

    console.log("Discord OAuth2 routes initialized");
}
