import { Hono } from "hono";
import User from "../../db/models/User";

export default function (app: Hono) {
    // Check if player is kicked
    app.get('/api/kick/check/:accountId', async (c) => {
        try {
            const accountId = c.req.param('accountId');
            const user = await User.findOne({ accountId });
            
            if (!user) {
                return c.json({ isKicked: false, error: "User not found" });
            }

            const activeKick = (user as any).kicks.find((kick: any) => kick.active);
            
            return c.json({
                isKicked: !!activeKick,
                kickInfo: activeKick || null,
                username: user.username
            });
        } catch (error) {
            console.error('Kick check error:', error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Kick a player via API
    app.post('/api/kick', async (c) => {
        try {
            const { accountId, reason, kickedBy = "API" } = await c.req.json();
            
            if (!accountId) {
                return c.json({ error: "accountId is required" }, 400);
            }

            const user = await User.findOne({ accountId });
            if (!user) {
                return c.json({ error: "User not found" }, 404);
            }

            await User.findOneAndUpdate(
                { accountId },
                {
                    $push: {
                        kicks: {
                            reason: reason || "No reason provided",
                            kickedBy,
                            kickedAt: new Date(),
                            active: true
                        }
                    },
                    isKicked: true
                }
            );

            return c.json({
                success: true,
                message: `Player ${user.username} has been kicked`,
                accountId,
                username: user.username,
                reason
            });
        } catch (error) {
            console.error('Kick API error:', error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Remove kick (unban)
    app.delete('/api/kick/:accountId', async (c) => {
        try {
            const accountId = c.req.param('accountId');
            
            await User.findOneAndUpdate(
                { accountId },
                {
                    $set: {
                        "kicks.$[].active": false,
                        isKicked: false
                    }
                }
            );

            return c.json({
                success: true,
                message: `Player ${accountId} has been unbanned`
            });
        } catch (error) {
            console.error('Unkick error:', error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });

    // Get all kicked players
    app.get('/api/kick/list', async (c) => {
        try {
            const kickedPlayers = await User.find({ 
                isKicked: true,
                "kicks.active": true 
            }).select('username accountId kicks').lean();

            return c.json({
                kickedPlayers: kickedPlayers.map(user => {
                    const userWithKicks = user as typeof user & { kicks: any[] };
                    return {
                        username: userWithKicks.username,
                        accountId: userWithKicks.accountId,
                        activeKicks: userWithKicks.kicks.filter((kick: any) => kick.active)
                    };
                })
            });
        } catch (error) {
            console.error('Kick list error:', error);
            return c.json({ error: "Internal server error" }, 500);
        }
    });
}