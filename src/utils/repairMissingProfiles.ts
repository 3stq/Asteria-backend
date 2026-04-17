import User from "../db/models/User";
import Profiles from "../db/models/Profiles";
import createProfiles from "./creationTools/createProfiles";
import Tournaments from "../db/models/Tournaments";

export async function repairAllMissingProfiles() {
  try {
    // Find all users
    const allUsers = await User.find({});
    let repairedCount = 0;

    for (const user of allUsers) {
      if (!user.discordId) continue;

      // Check if profile exists
      const existingProfile = await Profiles.findOne({ 
        $or: [
          { discordId: user.discordId },
          { accountId: user.accountId }
        ]
      });

      if (!existingProfile) {
        console.log(`Repairing profile for user: ${user.username} (${user.discordId})`);
        
        // Create missing profile
        const userProfile = await createProfiles(user.accountId);
        
        await Profiles.create({
          accountId: user.accountId,
          discordId: user.discordId,
          profiles: userProfile,
          created: new Date().toISOString(),
          access_token: "",
          refresh_token: "",
        });

        repairedCount++;
      }
    }

    console.log(`Repaired ${repairedCount} missing profiles`);
    return repairedCount;
  } catch (error) {
    console.error("Error in bulk repair:", error);
    throw error;
  }
}

// Run this function once to fix all existing users
// repairAllMissingProfiles().then(count => {
//   console.log(`Fixed ${count} profiles`);
//   process.exit(0);
// });