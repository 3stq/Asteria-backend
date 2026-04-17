import path from "path";
import fs from "fs";

export default async function createProfiles(accountId: any) {
  const profilesDir = path.join(__dirname, "../../resources/profiles");
  const files = fs.readdirSync(profilesDir);

  const profiles: Record<string, any> = {};

  for (const file of files) {
    const filePath = path.join(profilesDir, file);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(fileContent);

    parsed._id = accountId;
    parsed.createdAt = new Date().toISOString();
    parsed.updatedAt = new Date().toISOString();

    if (parsed.stats.attributes.season_num) {
      parsed.stats.attributes.season_num = Number(process.env.VERSION);
    }

    const ext = path.basename(file, path.extname(file));
    profiles[ext] = parsed;
  }

  return profiles;
}
