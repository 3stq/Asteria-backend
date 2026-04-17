import app from "../../../index.ts";

export default function () {
  app.delete("/account/api/oauth/sessions/kill", async (c) => {
    c.status(204);
    return c.json({});
  });
}
