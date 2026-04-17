import app from "../../..";

export default function () {
  app.get("/launcher/api/public/distributionpoints", async (c) => {
    return c.json({
      distributions: [
        "https://download.epicgames.com/",
        "https://download2.epicgames.com/",
        "https://download3.epicgames.com/",
        "https://download4.epicgames.com/",
        "https://epicgames-download1.akamaized.net/",
      ],
    });
  });
}
