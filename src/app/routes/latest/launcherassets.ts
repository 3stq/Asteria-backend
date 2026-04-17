import axios from "axios";
import app from "../../..";

export default function () {
  app.get(
    "/launcher/api/public/assets/Windows/:catalogItemId/:appName",
    async function (c) {
      const tokenResponse = await axios.get(
        "https://api.nitestats.com/v1/epic/bearer"
      );
      const auth_token = tokenResponse.data.accessToken;

      const response = await axios.get(
        `https://launcher-public-service-prod06.ol.epicgames.com${c.json(
          "originalUrl"
        )}`,
        {
          headers: {
            Authorization: `bearer ${auth_token}`,
          },
        }
      );
      return c.json(response.data);
    }
  );

  app.get(
    "/launcher/api/public/assets/:platform/:catalogItemId/:appName",
    async (c) => {
      const appName = c.req.param("appName");
      const catalogItemId = c.req.param("catalogItemId");
      const platform = c.req.param("platform");
      const label = c.req.query("label");

      return c.json({
        appName: appName,
        labelName: `${label}-${platform}`,
        buildVersion: `24.2`, // for example, maybe add proper later!,
        catalogItemId: catalogItemId,
        expires: "9999-09-23T23:59:59.999Z",
        items: {
          MANIFEST: {
            signature: "havoc",
            distribution: `http://localhost:${process.env.PORT}/`,
            path: `Builds/Fortnite/Content/CloudDir/Havoc.manifest`,
            additionalDistributions: [],
          },
        },
        assetId: appName,
      });
    }
  );
}
