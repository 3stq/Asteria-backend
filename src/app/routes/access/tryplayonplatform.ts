import app from "../../..";

export default function () {
  app.post(
    "/fortnite/api/game/v2/tryPlayOnPlatform/account/:accountId",
    async (c) => {
      c.header("Content-Type", "text/plain");
      return c.text("true");
    }
  );
}
