import { sign } from "hono/jwt";
import app from "../../..";
import User from "../../../db/models/User";
import { accountIds } from "./public";
import { v4 } from "uuid";

export default function () {
  app.post("/auth/v1/oauth/token", async (c) => {
    const body = await c.req.parseBody();
    return c.json({
      access_token: "eg1~Flair",
      token_type: "bearer",
      expires_at: new Date(Date.now() + 3599 * 1000).toISOString(),
      nonce: body.nonce,
      features: [
        "AntiCheat",
        "Connect",
        "ContentService",
        "Ecom",
        "Inventories",
        "LockerService",
        "Matchmaking Service",
      ],
      organization_id: "Flair",
      product_id: "prod-fn",
      sandbox_id: "fn",
      deployment_id: "62a9473a2dca46b29ccf17577fcf42d7",
      organization_user_id: "Flair",
      product_user_id: "Flair",
      product_user_id_created: false,
      id_token: "eg1~Flair",
      expires_in: 3599,
    });
  });

  app.get("/epic/id/v2/sdk/accounts", async (c) => {
    const user = await User.findOne({ accountId: accountIds });
    if (!user) {
      return c.json({ error: "User not found or banned" }, 404);
    }

    return c.json([
      {
        accountId: accountIds,
        displayName: user.username,
        preferredLanguage: "en",
        linkedAccounts: [],
        cabinedMode: false,
        empty: false,
      },
    ]);
  });

  app.post("/epic/oauth/v2/token", async (c) => {
    const body = await c.req.parseBody();
    const { grant_type } = body;
    if (grant_type == "refresh_token") {
      const newToken = await sign(
        {
          account_id: accountIds,
        },
        "Secret"
      );

      return c.json({
        scope: body.scope,
        token_type: "bearer",
        access_token: newToken,
        refresh_token: newToken,
        id_token: newToken,
        expires_in: 115200,
        expires_at: new Date(Date.now() + 115200 * 1000).toISOString(),
        refresh_expires_in: 115200,
        refresh_expires_at: new Date(Date.now() + 115200 * 1000).toISOString(),
        account_id: accountIds,
        client_id: "ec684b8c687f479fadea3cb2ad83f5c6",
        application_id: "fghi4567FNFBKFz3E4TROb0bmPS8h1GW",
        selected_account_id: accountIds,
        merged_accounts: [],
      });
    }
  });
}
