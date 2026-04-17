import app from "../../..";

export default function () {
  app.get("/fortnite/api/storefront/v2/keychain", async (c) => {
    const keychainFile = Bun.file("src/resources/storefront/keychain.json");
    const keychain = await keychainFile.json();
    return c.json(keychain);
  });
}
