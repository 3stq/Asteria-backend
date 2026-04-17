export async function applyProfileChanges(
    profile: any,
    profileId: string,
    profiles: any
) {
    let ApplyProfileChanges = [
        {
            changeType: "fullProfileUpdate",
            profile: profile,
        },
    ];

    profile.rvn += 1;
    profile.commandRevision += 1;
    profile.updated = new Date().toISOString();

    await profiles.updateOne(
        { accountId: profiles.accountId },
        { $set: { [`profiles.${profileId}`]: profile } }
    );

    return {
        profileRevision: profile.rvn || 0,
        profileId: profileId,
        profileChangesBaseRevision: profile.rvn,
        profileChanges: ApplyProfileChanges,
        profileCommandRevision: profile.commandRevision || 0,
        serverTime: new Date().toISOString(),
        multiUpdate: [],
        responseVersion: 1,
    };
}
