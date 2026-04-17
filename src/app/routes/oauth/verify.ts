import app from "../../../index.ts";
import { v4 as uuidv4, v4 } from "uuid";

export default function () {
  app.get("/account/api/oauth/verify", async (c) => {
    const createId = uuidv4();
    let token = c.req.header("authorization")?.replace("bearer ", "");

    return c.json({
      token: token,
      account_id: c.req.param("accountId"),
      client_id: createId,
      internal_client: true,
      client_service: "fortnite",
      expires_in: 28800,
      expires_at: "9999-12-02T01:12:01.100Z",
      app: "fortnite",
      auth_method: "password",
      device_id: createId,
      displayName: c.req.param("username"),
      in_app_id: c.req.param("accountId"),
    });
  });
}
