import app from "../../..";

export default function () {
  app.get("/fortnite/api/game/v2/world/info", async (c) => {
    // const worldinfo = await Bun.file("src/resources/stw/worldinfo.json").json();
    return c.json([]);
  });
}
