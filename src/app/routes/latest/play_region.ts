import app from "../../..";

export default function () {
  app.put("/profile/play_region", async (c) => {
    return c.json({
      namespace: "Fortnite",
      play_region: "NA_EAST",
    });
  });
}
