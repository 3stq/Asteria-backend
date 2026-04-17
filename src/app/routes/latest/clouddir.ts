import axios from "axios";
import app from "../../..";
import fs from "fs";
import path from "path";

export default function () {
  app.get("/Builds/Fortnite/Content/CloudDir/*", async (c: any) => {
    c.header("Content-Type", "application/octet-stream");

    const manifest: any = await fs.promises.readFile(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "static",
        "assets",
        "Havoc.manifest"
      )
    );
    return c.body(manifest);
  });

  app.get("/Builds/Fortnite/Content/CloudDir/*.ini", async (c: any) => {
    const ini: any = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "..",
        "..",
        "..",
        "static",
        "assets",
        "stuff.ini"
      )
    );
    return c.body(ini);
  });

  app.get(
    "/Builds/Fortnite/Content/CloudDir/ChunksV4/:chunknum/*",
    async (c) => {
      const res = await axios.get(
        `https://epicgames-download1.akamaized.net${c.req.path}`,
        {
          responseType: "stream",
        }
      );
      c.header("Content-Type", "application/octet-stream");

      return c.body(res.data);
    }
  );
}
